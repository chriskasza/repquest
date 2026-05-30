# Backend Design Plan

## Product scope
This application is a progressive web app for managing exercise routines, scheduling workouts, and tracking workout completion over time.

The first version will use:
- React for the frontend
- Supabase for authentication, database, and authorization
- FitGIF as the initial provider for exercise demonstration media and exercise metadata

The backend should prioritize:
- low-friction workout planning
- low-friction workout logging
- secure multi-tenant access
- room to expand into richer programming and analytics later

## Implementation status
_Last updated 2026-05-30._

**Phase 1 (foundation) — complete.** Tracked in
`supabase/migrations/`:
- `profiles`, `workspaces`, `workspace_members` tables with the fields and
  enums described below (`workspace_kind`, `workspace_role`).
- RLS enabled on all three tables with membership-based policies, plus the
  policy-performance indexes.
- Auth provisioning: a `handle_new_user` trigger on `auth.users` creates the
  `profiles` row and a personal workspace on signup, and a
  `handle_new_workspace` trigger auto-creates the owner `workspace_members`
  row for every workspace.
- Membership checks run through `SECURITY DEFINER` helper functions
  (`is_workspace_member`, `is_workspace_owner`) so workspace-scoped policies
  do not self-reference `workspace_members` and trigger Postgres RLS
  recursion. **Phases 3–4 should reuse these helpers** rather than inlining
  `exists (...)` subqueries.

Supabase tooling is also in place: local stack via the CLI dev dependency,
PR migration validation, and auto-deploy to prod on merge (see `README.md`).

**Phases 2–4 — not started.** Exercise catalog, planning/scheduling, and
workout logging remain as described below.

## Architecture overview
The backend will be organized around five core areas:

1. Identity and user profiles
2. Workspace-based tenancy
3. Global exercise catalog
4. Routine planning and scheduling
5. Workout session logging

### Identity and profiles
Authentication will use Supabase Auth.

A `profiles` table will extend the auth user record with app-specific fields such as:
- `id`
- `display_name`
- `created_at`
- `updated_at`

The profile primary key should match the authenticated Supabase user ID so that the application has a stable user identity across all domain tables.

### Workspace-based tenancy
The application will use workspace-based multi-tenancy.

Each user will have at least one personal workspace.
The system should also support shared workspaces for collaborative use cases.

Core tables:
- `workspaces`
- `workspace_members`

Each workspace should include:
- `id`
- `name`
- `owner_user_id`
- `kind` (`personal` or `shared`)
- `created_at`
- `updated_at`

Membership rows should include:
- `workspace_id`
- `user_id`
- `role`
- `created_at`
- `updated_at`

The initial role model can remain simple:
- `owner`
- `member`

All user-generated workout data should belong to a workspace.
This creates a clear tenant boundary for authorization and future collaboration features.

## Exercise catalog
The application should maintain a global exercise catalog shared across all workspaces.

This catalog should not be duplicated per workspace.
A shared catalog keeps exercise IDs stable, simplifies ingestion, and avoids repeated external-source data.

### Exercise data model
The `exercises` table should store both app-managed metadata and imported source metadata.

Recommended fields:
- `id`
- `slug`
- `name`
- `metric_type`
- `source`
- `source_external_id`
- `demo_media_kind`
- `demo_media_url`
- `body_part`
- `target_muscle`
- `secondary_muscles`
- `equipment`
- `difficulty`
- `instructions_json`
- `is_active`
- `created_at`
- `updated_at`

### Exercise modeling notes
- `slug` should be unique and stable for routing and lookups.
- `metric_type` should define the primary way an exercise is tracked in the UI.
- `source` and `source_external_id` should support imports, resyncs, and future multiple providers.
- `demo_media_kind` should support `gif`, `video`, and `image`.
- `instructions_json` should store structured instruction steps rather than a single large text blob.
- `secondary_muscles` should be stored as `jsonb` to preserve structured metadata.

### Exercise metric types
The first version should support these metric types:
- `reps`
- `duration_seconds`
- `distance_meters`
- `weight_reps`

This gives enough flexibility for bodyweight work, timed holds, cardio, and weighted strength movements.

### FitGIF ingestion strategy
FitGIF will be used as the initial data and media provider.

Imported fields should be mapped into the exercise catalog where available:
- provider ID -> `source_external_id`
- name -> `name`
- media URL -> `demo_media_url`
- media kind -> `demo_media_kind`
- body part -> `body_part`
- target muscle -> `target_muscle`
- secondary muscles -> `secondary_muscles`
- equipment -> `equipment`
- difficulty -> `difficulty`
- steps -> `instructions_json`

The import pipeline should support idempotent upserts using `(source, source_external_id)`.

## Routine planning
The planning model should separate reusable routine definitions from specific scheduled workout instances.

### Routine templates
Routine templates represent reusable workout plans.

Recommended table: `routine_templates`

Recommended fields:
- `id`
- `workspace_id`
- `name`
- `description`
- `is_archived`
- `created_by`
- `created_at`
- `updated_at`

### Routine template exercises
Each routine template should contain an ordered list of exercises.

Recommended table: `routine_template_exercises`

Recommended fields:
- `id`
- `workspace_id`
- `routine_template_id`
- `exercise_id`
- `position`
- `planned_metric_type`
- `planned_reps`
- `planned_seconds`
- `planned_distance_m`
- `planned_weight_kg`
- `notes`
- `created_at`
- `updated_at`

### Planning model notes
- `position` must be unique within each routine template: `UNIQUE (routine_template_id, position)`.
- `planned_metric_type` may mirror the exercise default, but should be stored explicitly on the routine line item.
- Divergence from `exercises.metric_type` is intentional (e.g. bodyweight vs. weighted variant of the same exercise). The DB only enforces that values are valid enum members; the app layer is responsible for pre-populating `planned_metric_type` from the exercise default and warning — but not blocking — when a routine line overrides it.
- The planning model should allow users to create simple routines without requiring advanced programming constructs.
- The first version should favor clarity over overly flexible programming abstractions.

## Workout scheduling
Scheduled workouts should represent intended future workout events.

Recommended table: `scheduled_workouts`

Recommended fields:
- `id`
- `workspace_id`
- `routine_template_id`
- `scheduled_date`
- `scheduled_time`
- `title`
- `notes`
- `status`
- `created_by`
- `created_at`
- `updated_at`

### Scheduling model notes
The first version should treat scheduling as planning rather than calendar-grade event management.

Recommended approach:
- store `scheduled_date` as `date`
- store `scheduled_time` as `time` when a time is needed

This model is easier for users who are planning workouts in their local context.
A full `timestamptz` event model can be added later if the app evolves toward shared cross-time-zone scheduling.

Recommended status values:
- `planned`
- `completed`
- `skipped`
- `canceled`

### Schedule status ownership

`completed` is set automatically by a DB trigger (`sync_scheduled_workout_completion`) that fires
on INSERT or UPDATE OF `completed_at` on `workout_sessions`. When `completed_at` is non-null and
`scheduled_workout_id` is non-null, the trigger updates the linked `scheduled_workouts` row to
`status = 'completed'` — but only if the current status is `planned`, so a manually set
`skipped` or `canceled` is never overwritten.

`skipped` and `canceled` have no session counterpart (they represent workouts that did not happen),
so those transitions are the client's responsibility via direct UPDATE on `scheduled_workouts`.

The trigger must be created in the same migration that creates `workout_sessions` (Phase 4):

```sql
create or replace function public.sync_scheduled_workout_completion()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if NEW.completed_at is not null and NEW.scheduled_workout_id is not null then
    update public.scheduled_workouts
    set status = 'completed'
    where id = NEW.scheduled_workout_id
      and status = 'planned';
  end if;
  return NEW;
end;
$$;

create trigger on_session_completed
  after insert or update of completed_at on public.workout_sessions
  for each row execute procedure public.sync_scheduled_workout_completion();
```

## Workout sessions
Workout sessions represent actual workout execution.

Recommended table: `workout_sessions`

Recommended fields:
- `id`
- `workspace_id`
- `scheduled_workout_id`
- `started_at`
- `completed_at`
- `session_notes`
- `created_by`
- `created_at`
- `updated_at`

### Session model notes
- A session may or may not originate from a scheduled workout.
- `completed_at` must not be earlier than `started_at`.
- A workout can be started ad hoc without first being placed on the schedule.

## Session exercises and sets
The logging model should support multiple sets per exercise from the beginning.

### Workout session exercises
This table represents the ordered exercise blocks within a session.

Recommended table: `workout_session_exercises`

Recommended fields:
- `id`
- `workspace_id`
- `workout_session_id`
- `exercise_id`
- `position`
- `planned_metric_type`
- `planned_reps`
- `planned_seconds`
- `planned_distance_m`
- `planned_weight_kg`
- `notes`
- `created_at`
- `updated_at`

Recommended constraints:
- `position` must be unique within each workout session: `UNIQUE (workout_session_id, position)`
- `planned_metric_type` should use the same allowed values as the exercise catalog

### Workout session sets
This table represents actual performed sets for each session exercise.

Recommended table: `workout_session_sets`

Recommended fields:
- `id`
- `workspace_id`
- `workout_session_exercise_id`
- `set_number`
- `metric_type`
- `target_reps`
- `target_seconds`
- `target_distance_m`
- `target_weight_kg`
- `actual_reps`
- `actual_seconds`
- `actual_distance_m`
- `actual_weight_kg`
- `is_warmup`
- `created_at`
- `updated_at`

Recommended constraints:
- `set_number` must be unique within each session exercise: `UNIQUE (workout_session_exercise_id, set_number)`
- `metric_type` should use the same allowed values as the exercise catalog

### Logging model notes
- `workout_session_sets.metric_type` must match its parent `workout_session_exercises.planned_metric_type`. Mixing metric types across sets within one session exercise block produces uninterpretable history. This is enforced in the app layer (not a DB constraint — enforcing it in the DB would require a trigger joining to the parent row). The app must reject set inserts whose `metric_type` differs from the session exercise.
- The DB only enforces that `metric_type` values are valid enum members; semantic coherence within a session exercise is the app's responsibility.

This structure supports:
- multiple working sets
- warmup sets
- per-set weight tracking
- timed efforts
- future progression analysis

This is a better long-term foundation than storing all actual results directly on a single session exercise row.

## Authorization and security
Authorization should be enforced with Supabase Row Level Security.

RLS should be enabled on every user-facing table.
All data access should be constrained by workspace membership where applicable.

### Policy strategy
Recommended policy direction:
- users can read and update only their own profile row
- users can access a workspace only if they belong to it
- users can access workspace memberships only for workspaces they belong to
- users can access routines, schedules, sessions, and logs only for workspaces they belong to

### Operational guidance
- client applications should use the anon key
- privileged operations such as exercise ingestion should use a server-side service role
- service-role code must be treated as trusted infrastructure because it bypasses RLS

## Indexing plan
Indexes should support both application performance and RLS policy checks.

Recommended indexes:
- `workspace_members (user_id, workspace_id)`
- `routine_templates (workspace_id)`
- `routine_template_exercises (routine_template_id, position)`
- `scheduled_workouts (workspace_id, scheduled_date)`
- `workout_sessions (workspace_id, created_at desc)`
- `workout_session_exercises (workout_session_id, position)`
- `workout_session_sets (workout_session_exercise_id, set_number)`
- unique `(source, source_external_id)` on exercises where external ID is not null
- unique `(slug)` on exercises

Optional later:
- full-text search support for exercise discovery
- specialized indexes for analytics and reporting

## Future extension points
The backend should leave room for additional capability without complicating the MVP.

Potential future additions:
- workspace-specific exercise aliases or hidden exercises
- routine-level set templates
- exercise personal records
- workout analytics and trends
- recurrence rules for scheduling
- Supabase storage for richer custom media
- coaching or shared workspace commenting features

These should be added as separate concerns later rather than overloading the MVP data model.

## Recommended implementation sequence

### Phase 1: foundation — ✅ complete
1. ✅ Set up Supabase project and authentication.
2. ✅ Create profiles and workspace tenancy tables.
3. ✅ Enable RLS and add membership-based policies.
4. ✅ Add indexes required for policy performance.

### Phase 2: exercise catalog — ⬜ not started
1. Create the global exercise catalog schema.
2. Build the FitGIF ingestion process.
3. Add upsert and deduplication rules.
4. Verify search and media rendering paths.

### Phase 3: planning and scheduling — ⬜ not started
1. Create routine template tables.
2. Create scheduled workout tables (including `status` enum and RLS).
3. Implement routine ordering and schedule status flows.

### Phase 4: workout logging — ⬜ not started
1. Create workout session tables (including `sync_scheduled_workout_completion` trigger — see schedule status ownership note above).
2. Create session exercise and set logging tables.
3. Implement start, progress, and complete flows.
4. Validate reporting and history queries.

## Recommended MVP position
The MVP backend should include:
- Supabase Auth with profile records
- workspace-based tenancy
- global exercise catalog
- FitGIF-backed exercise media and metadata ingestion
- routine templates
- scheduled workouts
- workout sessions
- per-session exercise logging
- per-set workout logging
- RLS from the start

This gives the frontend a clean foundation for exercise browsing, routine creation, scheduling, active workout execution, and history tracking.
