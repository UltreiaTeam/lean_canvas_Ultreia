-- Lean Canvas Playbook: almacenamiento por documentos con acceso por proyecto.

create table if not exists public.docs (
  path        text primary key,
  project_id  text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
create index if not exists docs_project_idx on public.docs (project_id);

create table if not exists public.project_members (
  project_id  text not null,
  email       text not null,
  role        text not null default 'editor' check (role in ('owner', 'editor')),
  added_by    uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  primary key (project_id, email)
);

create table if not exists public.coach_usage (
  user_id uuid not null,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);

alter table public.docs enable row level security;
alter table public.project_members enable row level security;
alter table public.coach_usage enable row level security;

create or replace function public.current_email() returns text
language sql stable set search_path = public as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_member(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and lower(email) = current_email())
$$;

create or replace function public.is_owner(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and lower(email) = current_email() and role = 'owner')
$$;

create or replace function public.project_is_new(pid text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from project_members where project_id = pid)
    and not exists (select 1 from docs where project_id = pid)
$$;

-- docs: solo miembros del proyecto
create policy docs_select on public.docs for select to authenticated using (is_member(project_id));
create policy docs_insert on public.docs for insert to authenticated with check (is_member(project_id));
create policy docs_update on public.docs for update to authenticated using (is_member(project_id)) with check (is_member(project_id));
create policy docs_delete on public.docs for delete to authenticated using (is_member(project_id));

-- miembros: los ven los miembros; el dueño agrega y quita; quien crea un proyecto nuevo se agrega como dueño
create policy members_select on public.project_members for select to authenticated using (is_member(project_id));
create policy members_insert on public.project_members for insert to authenticated with check (
  (is_owner(project_id) and role = 'editor')
  or (role = 'owner' and lower(email) = current_email() and project_is_new(project_id))
);
create policy members_delete on public.project_members for delete to authenticated using (is_owner(project_id) and role <> 'owner');

-- uso del coach: solo lo toca la función del servidor
create or replace function public.bump_coach_usage(uid uuid) returns int
language sql security definer set search_path = public as $$
  insert into coach_usage (user_id, day, count) values (uid, current_date, 1)
  on conflict (user_id, day) do update set count = coach_usage.count + 1
  returning count
$$;
revoke all on function public.bump_coach_usage(uuid) from public, anon, authenticated;
revoke all on function public.is_member(text) from anon;
revoke all on function public.is_owner(text) from anon;
revoke all on function public.project_is_new(text) from anon;

-- tiempo real
alter publication supabase_realtime add table public.docs;

-- Las funciones auxiliares viven en un esquema privado (no expuesto por la API)
create schema if not exists private;
grant usage on schema private to authenticated, service_role;
alter function public.current_email() set schema private;
alter function public.is_member(text) set schema private;
alter function public.is_owner(text) set schema private;
alter function public.project_is_new(text) set schema private;
alter function private.is_member(text) set search_path = public, private;
alter function private.is_owner(text) set search_path = public, private;
alter function private.project_is_new(text) set search_path = public, private;
revoke all on function private.current_email(), private.is_member(text), private.is_owner(text), private.project_is_new(text) from public, anon;
grant execute on function private.current_email(), private.is_member(text), private.is_owner(text), private.project_is_new(text) to authenticated;
alter function public.bump_coach_usage(uuid) set schema private;
revoke all on function private.bump_coach_usage(uuid) from public, anon, authenticated;
grant execute on function private.bump_coach_usage(uuid) to service_role;
create policy coach_usage_none on public.coach_usage for select to authenticated using (false);

-- Punto de entrada para la función del coach (solo service_role)
create or replace function public.coach_bump(uid uuid) returns int
language sql security invoker set search_path = public, private as $$ select private.bump_coach_usage(uid) $$;
revoke all on function public.coach_bump(uuid) from public, anon, authenticated;
grant execute on function public.coach_bump(uuid) to service_role;
