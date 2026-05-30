# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

RepQuest is a progressive web app for planning, scheduling, and tracking strength
workouts. **Currently this repo contains only the Supabase backend** (Postgres
schema, RLS, auth provisioning) — there is no frontend or application code yet.
The planned stack is React + Supabase (auth/db/authz) with FitGIF as the initial
exercise media/metadata provider.

The full data model and phased build-out are specified in
[repquest-backend-design-plan.md](repquest-backend-design-plan.md). Read it before
adding tables — it defines the exercise catalog, routine/scheduling, and
session-logging schemas that Phases 2–4 will implement. **Phase 1 (identity +
workspace tenancy) is complete; Phases 2–4 are not started.**

## Commands

All Supabase CLI access goes through `npm run db:*` scripts (the CLI is a dev
dependency — do not install it globally). Local development runs against a local
Supabase stack in Docker, so Docker must be running.

```bash
npm install            # installs deps incl. the supabase CLI dev dependency
npm run db:start       # start local stack (first run pulls images, slow)
npm run db:stop        # stop local stack
npm run db:status      # reprint local URLs + anon/service_role keys
npm run db:reset       # drop local DB, replay ALL migrations, re-run seed.sql
npm run db:migration:list             # local vs. applied migration status
npm run db:migration:new -- <name>    # create a new migration (arg after --)
```

After creating a migration, edit the generated file in
[supabase/migrations/](supabase/migrations/), then apply it locally with
`npm run db:reset`. Studio runs at http://localhost:54323.

## Migration conventions (important)

- **Never edit a migration already merged to `main`** — add a new one instead.
  CI and prod replay migrations from scratch, so editing history breaks them.
- Migrations must be idempotent / safe to replay: existing ones use
  `create table if not exists`, `create or replace function`,
  `drop policy if exists` before `create policy`, and guarded `do $$ ... $$`
  blocks for enum types.
- Commit the migration file together with the code change that needs it.

## Architecture: RLS and multi-tenancy

Authorization is enforced entirely in the database via Row Level Security — there
is no application authorization layer. Two conventions are load-bearing:

1. **Workspace tenancy.** Every user-generated row belongs to a `workspace`.
   `workspaces` + `workspace_members` define the tenant boundary; a personal
   workspace is auto-created per user. All workspace-scoped policies key off
   membership.

2. **Membership checks go through `SECURITY DEFINER` helper functions**, not
   inline `exists (...)` subqueries. Use `public.is_workspace_member(workspace_id)`
   and `public.is_workspace_owner(workspace_id)` (in
   [20260530164118_auth_provisioning_and_membership_helpers.sql](supabase/migrations/20260530164118_auth_provisioning_and_membership_helpers.sql)).
   This is mandatory: a policy on `workspace_members` that queries
   `workspace_members` directly triggers Postgres "infinite recursion detected in
   policy". The helpers bypass RLS (`security definer`, `set search_path = ''`) to
   break that cycle. **Phases 3–4 must reuse these helpers** for all
   workspace-scoped tables.

### Auth provisioning via triggers

Provisioning happens through `auth.users` / `workspaces` triggers, not client
code (see the same migration):

- `handle_new_user` (on `auth.users` insert) creates the `profiles` row and a
  personal `workspace` on signup.
- `handle_new_workspace` (on `workspaces` insert) auto-creates the owner
  `workspace_members` row. This avoids a chicken-and-egg with the owner-only
  membership INSERT policy — every workspace always has an owner membership.

The role model is intentionally minimal: `workspace_role` enum is `owner` /
`member`, `workspace_kind` is `personal` / `shared`.

### Client vs. service-role access

Client apps use the **anon key** (RLS-enforced). Privileged operations like
FitGIF exercise ingestion (Phase 2) must use the **service_role** key server-side,
which bypasses RLS — treat that code as trusted infrastructure.

## Deploys

You never run `db push` against prod by hand.

- **PR to `main`** touching `supabase/**`:
  [supabase-ci.yml](.github/workflows/supabase-ci.yml) spins up a throwaway stack
  and validates migrations apply cleanly.
- **Merge to `main`**: [supabase-deploy.yml](.github/workflows/supabase-deploy.yml)
  links to `repquest-prod` and runs `supabase db push`.

There are two hosted projects: `repquest-dev` (shared remote dev, manual push only)
and `repquest-prod` (auto-deployed). Day-to-day work targets the local stack.
