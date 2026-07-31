create or replace function public.replace_user_store(candidate jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  account_id uuid := auth.uid();
  habit jsonb;
  completion jsonb;
begin
  if account_id is null then
    raise exception using errcode = '42501', message = 'authenticated account required';
  end if;

  if candidate is null
    or pg_catalog.jsonb_typeof(candidate) <> 'object'
    or (select pg_catalog.array_agg(key order by key) from pg_catalog.jsonb_object_keys(candidate) as key)
      is distinct from array['completions', 'habits', 'version']
    or pg_catalog.jsonb_typeof(candidate -> 'version') <> 'number'
    or (candidate ->> 'version')::numeric <> 1
    or pg_catalog.jsonb_typeof(candidate -> 'habits') <> 'array'
    or pg_catalog.jsonb_typeof(candidate -> 'completions') <> 'array' then
    raise exception using errcode = '22023', message = 'invalid Store v1 structure';
  end if;

  for habit in select value from pg_catalog.jsonb_array_elements(candidate -> 'habits') as value loop
    if pg_catalog.jsonb_typeof(habit) <> 'object'
      or (select pg_catalog.array_agg(key order by key) from pg_catalog.jsonb_object_keys(habit) as key)
        is distinct from array['archivedOn', 'createdOn', 'id', 'name', 'targetPerDay']
      or pg_catalog.jsonb_typeof(habit -> 'id') <> 'string'
      or pg_catalog.jsonb_typeof(habit -> 'name') <> 'string'
      or pg_catalog.jsonb_typeof(habit -> 'targetPerDay') <> 'number'
      or pg_catalog.jsonb_typeof(habit -> 'createdOn') <> 'string'
      or pg_catalog.jsonb_typeof(habit -> 'archivedOn') not in ('string', 'null') then
      raise exception using errcode = '22023', message = 'invalid Store v1 structure';
    end if;
  end loop;

  for completion in select value from pg_catalog.jsonb_array_elements(candidate -> 'completions') as value loop
    if pg_catalog.jsonb_typeof(completion) <> 'object'
      or (select pg_catalog.array_agg(key order by key) from pg_catalog.jsonb_object_keys(completion) as key)
        is distinct from array['count', 'date', 'habitId']
      or pg_catalog.jsonb_typeof(completion -> 'habitId') <> 'string'
      or pg_catalog.jsonb_typeof(completion -> 'date') <> 'string'
      or pg_catalog.jsonb_typeof(completion -> 'count') <> 'number' then
      raise exception using errcode = '22023', message = 'invalid Store v1 structure';
    end if;
  end loop;

  delete from public.completions where user_id = account_id;
  delete from public.habits where user_id = account_id;

  insert into public.habits (user_id, id, name, target_per_day, created_on, archived_on)
  select
    account_id,
    habit_row.id,
    habit_row.name,
    habit_row."targetPerDay",
    habit_row."createdOn",
    habit_row."archivedOn"
  from pg_catalog.jsonb_to_recordset(candidate -> 'habits') as habit_row(
    id text,
    name text,
    "targetPerDay" integer,
    "createdOn" date,
    "archivedOn" date
  );

  insert into public.completions (user_id, habit_id, date, count)
  select
    account_id,
    completion_row."habitId",
    completion_row.date,
    completion_row.count
  from pg_catalog.jsonb_to_recordset(candidate -> 'completions') as completion_row(
    "habitId" text,
    date date,
    count integer
  );

  insert into public.user_data_state (user_id)
  values (account_id)
  on conflict (user_id) do nothing;
end;
$function$;

revoke all on function public.replace_user_store(jsonb) from public;
revoke all on function public.replace_user_store(jsonb) from anon;
grant execute on function public.replace_user_store(jsonb) to authenticated;

-- Manual rollback (reverse order):
-- drop function public.replace_user_store(jsonb);
