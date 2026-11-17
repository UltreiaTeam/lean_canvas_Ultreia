-- Acceso con mail y contraseña (sin mails de verificación).
-- Como el mail ya no se verifica, la membresía pasa a estar atada al usuario (auth.uid())
-- y no al mail: se entra a un proyecto ajeno solo con un link de invitación del dueño.

-- 1. Miembros por usuario
delete from public.project_members where true;  -- no había miembros reales
alter table public.project_members drop constraint if exists project_members_pkey;
alter table public.project_members add column if not exists user_id uuid not null default auth.uid();
alter table public.project_members add primary key (project_id, user_id);

create or replace function private.is_member(pid text) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid())
$$;

create or replace function private.is_owner(pid text) returns boolean
language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid() and role = 'owner')
$$;

drop policy if exists members_insert on public.project_members;
create policy members_insert on public.project_members for insert to authenticated with check (
  role = 'owner' and user_id = auth.uid() and private.project_is_new(project_id)
);
drop policy if exists members_delete on public.project_members;
create policy members_delete on public.project_members for delete to authenticated using (
  private.is_owner(project_id) and role <> 'owner'
);

-- 2. Invitaciones
create table if not exists public.project_invites (
  token       text primary key default encode(extensions.gen_random_bytes(18), 'hex'),
  project_id  text not null,
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists project_invites_project_idx on public.project_invites (project_id);
alter table public.project_invites enable row level security;
create policy invites_select on public.project_invites for select to authenticated using (private.is_owner(project_id));
create policy invites_insert on public.project_invites for insert to authenticated with check (private.is_owner(project_id) and created_by = auth.uid());
create policy invites_delete on public.project_invites for delete to authenticated using (private.is_owner(project_id));

create or replace function private.accept_invite(tok text) returns text
language plpgsql security definer set search_path = public, private as $$
declare pid text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select project_id into pid from project_invites where token = tok;
  if pid is null then raise exception 'invalid_invite'; end if;
  insert into project_members (project_id, user_id, email, role, added_by)
  values (pid, auth.uid(), private.current_email(), 'editor', auth.uid())
  on conflict (project_id, user_id) do nothing;
  return pid;
end $$;
revoke all on function private.accept_invite(text) from public, anon;
grant execute on function private.accept_invite(text) to authenticated;

create or replace function public.accept_invite(tok text) returns text
language sql security invoker set search_path = public, private as $$ select private.accept_invite(tok) $$;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
