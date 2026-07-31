alter table public.habits
  alter column user_id set default auth.uid();

alter table public.completions
  alter column user_id set default auth.uid();

-- Manual rollback:
-- alter table public.completions alter column user_id drop default;
-- alter table public.habits alter column user_id drop default;
