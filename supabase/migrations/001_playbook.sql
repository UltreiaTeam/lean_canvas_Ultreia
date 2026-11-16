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
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

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

-- tiempo real
alter publication supabase_realtime add table public.docs;
