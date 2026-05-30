-- Phase 1 foundation: identity + workspace tenancy

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'workspace_kind'
  ) then
    create type public.workspace_kind as enum ('personal', 'shared');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'workspace_role'
  ) then
    create type public.workspace_role as enum ('owner', 'member');
  end if;
end$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  kind public.workspace_kind not null default 'personal',
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create index if not exists idx_workspace_members_user_workspace
  on public.workspace_members (user_id, workspace_id);

create index if not exists idx_workspaces_owner_user
  on public.workspaces (owner_user_id);

create policy "Users can view own profile"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles
  for update
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (id = auth.uid());

create policy "Members can select workspaces they belong to"
  on public.workspaces
  for select
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create workspaces"
  on public.workspaces
  for insert
  with check (owner_user_id = auth.uid());

create policy "Owners can update their workspaces"
  on public.workspaces
  for update
  using (owner_user_id = auth.uid());

create policy "Owners can delete their workspaces"
  on public.workspaces
  for delete
  using (owner_user_id = auth.uid());

create policy "Members can view memberships for their workspaces"
  on public.workspace_members
  for select
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "Owners can add workspace members"
  on public.workspace_members
  for insert
  with check (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

create policy "Owners can update workspace members"
  on public.workspace_members
  for update
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

create policy "Owners can delete workspace members"
  on public.workspace_members
  for delete
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );
