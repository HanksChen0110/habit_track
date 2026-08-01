begin;

drop function if exists public.replace_user_store(jsonb);
drop table if exists public.completions;
drop table if exists public.habits;
drop table if exists public.user_data_state;

commit;
