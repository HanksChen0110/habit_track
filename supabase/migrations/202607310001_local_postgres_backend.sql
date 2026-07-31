create table public.user_data_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  initialized_at timestamptz not null default now()
);

create table public.habits (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  target_per_day integer not null,
  created_on date not null,
  archived_on date,
  primary key (user_id, id),
  constraint habits_id_not_blank check (btrim(id) <> ''),
  constraint habits_name_not_blank check (btrim(name) <> ''),
  constraint habits_target_per_day_positive check (target_per_day > 0),
  constraint habits_archived_on_valid check (archived_on is null or archived_on >= created_on)
);

create table public.completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null,
  date date not null,
  count integer not null,
  primary key (user_id, habit_id, date),
  constraint completions_habit_fk
    foreign key (user_id, habit_id)
    references public.habits(user_id, id)
    on delete cascade,
  constraint completions_count_positive check (count > 0)
);

alter table public.user_data_state enable row level security;
alter table public.user_data_state force row level security;
alter table public.habits enable row level security;
alter table public.habits force row level security;
alter table public.completions enable row level security;
alter table public.completions force row level security;

revoke all on table public.user_data_state, public.habits, public.completions from anon;
grant select, insert, update, delete on table public.user_data_state, public.habits, public.completions to authenticated;

create policy "account reads own user data state"
  on public.user_data_state for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "account inserts own user data state"
  on public.user_data_state for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "account updates own user data state"
  on public.user_data_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "account deletes own user data state"
  on public.user_data_state for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "account reads own habits"
  on public.habits for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "account inserts own habits"
  on public.habits for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "account updates own habits"
  on public.habits for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "account deletes own habits"
  on public.habits for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "account reads own completions"
  on public.completions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "account inserts own completions"
  on public.completions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "account updates own completions"
  on public.completions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "account deletes own completions"
  on public.completions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Manual rollback (reverse order):
-- drop table public.completions;
-- drop table public.habits;
-- drop table public.user_data_state;
