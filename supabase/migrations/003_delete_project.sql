-- Eliminar un proyecto (solo el dueño) y salir de un proyecto ajeno (editores).

create or replace function private.delete_project(pid text) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  if not private.is_owner(pid) then raise exception 'not_owner'; end if;
  delete from docs where project_id = pid;
  delete from project_invites where project_id = pid;
  delete from project_members where project_id = pid;
end $$;

create or replace function private.leave_project(pid text) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  if private.is_owner(pid) then raise exception 'owner_cannot_leave'; end if;
  delete from project_members where project_id = pid and user_id = auth.uid();
end $$;

revoke all on function private.delete_project(text), private.leave_project(text) from public, anon;
grant execute on function private.delete_project(text), private.leave_project(text) to authenticated;

create or replace function public.delete_project(pid text) returns void
language sql security invoker set search_path = public, private as $$ select private.delete_project(pid) $$;
create or replace function public.leave_project(pid text) returns void
language sql security invoker set search_path = public, private as $$ select private.leave_project(pid) $$;
revoke all on function public.delete_project(text), public.leave_project(text) from public, anon;
grant execute on function public.delete_project(text), public.leave_project(text) to authenticated;
