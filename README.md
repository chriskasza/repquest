# RepQuest

Progressive web app for planning, scheduling, and tracking strength workouts.

## Supabase

We run two hosted Supabase projects:

| Project         | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `repquest-dev`  | Shared remote dev project for testing against hosted infra.    |
| `repquest-prod` | Production. Deployed automatically — see [Deploys](#deploys).  |

Day-to-day development happens against a **local** Supabase stack (Postgres,
Auth, Storage, Studio, etc.) running in Docker, so you rarely need to touch the
hosted projects directly.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) running (required by the local stack).
- Node `24.14.0` (see [.node-version](.node-version)).
- Dependencies installed: `npm install`. The Supabase CLI is a dev dependency,
  so all commands below go through the `npm run db:*` scripts in
  [package.json](package.json) — there's no need to install the CLI globally.

### Local development

Start the local stack:

```bash
npm run db:start
```

The first run pulls the Docker images and may take a few minutes. When it
finishes, the CLI prints the local URLs and keys (API, Studio, the Postgres
connection string, and the `anon` / `service_role` keys) — copy these into your
app's `.env.local`. You can reprint them any time with:

```bash
npm run db:status
```

Studio is at http://localhost:54323 by default.

Stop the stack when you're done:

```bash
npm run db:stop
```

### Working with migrations

Schema changes are tracked as SQL migrations in
[supabase/migrations/](supabase/migrations/). Seed data for local dev lives in
[supabase/seed.sql](supabase/seed.sql).

Create a new migration:

```bash
node_modules/.bin/supabase migration new <description>
```

Edit the generated file under `supabase/migrations/`, then apply it locally by
resetting the database (this drops the local DB, replays every migration from
scratch, and re-runs the seed):

```bash
npm run db:reset
```

List migration status (local vs. applied):

```bash
npm run db:migration:list
```

Commit the migration file along with your code change. **Never** edit a
migration that has already been merged to `main` — add a new one instead.

### Testing against the remote dev project (optional)

To run migrations against `repquest-dev` instead of the local stack — e.g. to
share state with others or test hosted-only behavior — link to it and push:

```bash
node_modules/.bin/supabase link --project-ref <repquest-dev-ref>
node_modules/.bin/supabase db push
```

This is a manual step; there is no workflow that deploys to `repquest-dev`.

## Deploys

Production database changes are deployed by GitHub Actions — you don't run
`db push` against prod by hand.

- **On a pull request to `main`** (touching `supabase/**` or the workflow files),
  [Supabase CI](.github/workflows/supabase-ci.yml) spins up a throwaway local
  stack and validates that the migrations apply cleanly.
- **On merge/push to `main`**,
  [Supabase Deploy](.github/workflows/supabase-deploy.yml) links to the
  production project and runs `supabase db push`, applying any new migrations to
  `repquest-prod`.

The deploy workflow uses the `production` GitHub environment and reads these
secrets:

| Secret                   | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `SUPABASE_ACCESS_TOKEN`  | Personal access token used to authenticate the CLI.         |
| `SUPABASE_PROJECT_REF`   | Project ref of `repquest-prod` (the link/push target).      |
| `SUPABASE_DB_PASSWORD`   | Database password for `repquest-prod`.                      |

So the normal flow is: develop locally → open a PR (CI validates migrations) →
merge to `main` (deploy pushes them to prod).
