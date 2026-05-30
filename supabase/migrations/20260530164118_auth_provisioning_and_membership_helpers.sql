-- Phase 1 completion: auth provisioning + membership-policy helpers.
--
-- The initial foundation migration created the profiles / workspaces /
-- workspace_members tables, but left two gaps:
--   1. The workspace + workspace_members SELECT policies query
--      workspace_members from inside a workspace_members policy, which
--      Postgres rejects with "infinite recursion detected in policy".
--   2. Nothing provisions a profile or a personal workspace when a user
--      signs up, so a fresh auth user has no usable tenant.
-- This migration fixes both.

-- ---------------------------------------------------------------------------
-- 1. Membership helpers (SECURITY DEFINER so they bypass RLS and break the
--    self-referential recursion in workspace-scoped policies).
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Replace the recursive policies with helper-backed equivalents.
-- ---------------------------------------------------------------------------

drop policy if exists "Members can select workspaces they belong to" on public.workspaces;
create policy "Members can select workspaces they belong to"
  on public.workspaces
  for select
  using (public.is_workspace_member(id));

drop policy if exists "Members can view memberships for their workspaces" on public.workspace_members;
create policy "Members can view memberships for their workspaces"
  on public.workspace_members
  for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Owners can add workspace members" on public.workspace_members;
create policy "Owners can add workspace members"
  on public.workspace_members
  for insert
  with check (public.is_workspace_owner(workspace_id));

drop policy if exists "Owners can update workspace members" on public.workspace_members;
create policy "Owners can update workspace members"
  on public.workspace_members
  for update
  using (public.is_workspace_owner(workspace_id));

drop policy if exists "Owners can delete workspace members" on public.workspace_members;
create policy "Owners can delete workspace members"
  on public.workspace_members
  for delete
  using (public.is_workspace_owner(workspace_id));

-- ---------------------------------------------------------------------------
-- 3. Auto-provision the owner membership whenever a workspace is created.
--    Running this in a trigger (rather than expecting the client to insert a
--    membership row) avoids a chicken-and-egg with the owner-only INSERT
--    policy above, and keeps every workspace consistent: it always has an
--    owner membership.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner');
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row
  execute function public.handle_new_workspace();

-- ---------------------------------------------------------------------------
-- 4. Provision a profile + personal workspace on signup.
--    The owner membership for the personal workspace is created by the
--    on_workspace_created trigger above.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(new.email, '@', 1), ''),
    'New user'
  );

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name);

  insert into public.workspaces (name, owner_user_id, kind)
  values (v_display_name || '''s workspace', new.id, 'personal');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
