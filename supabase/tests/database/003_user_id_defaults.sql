begin;

select plan(27);

select is(
  (
    select pg_get_expr(adbin, adrelid)
    from pg_attrdef
    where adrelid = 'public.habits'::regclass
      and adnum = (
        select attnum
        from pg_attribute
        where attrelid = 'public.habits'::regclass
          and attname = 'user_id'
          and not attisdropped
      )
  ),
  'auth.uid()',
  'habits.user_id 默认使用 auth.uid()'
);
select is(
  (
    select pg_get_expr(adbin, adrelid)
    from pg_attrdef
    where adrelid = 'public.completions'::regclass
      and adnum = (
        select attnum
        from pg_attribute
        where attrelid = 'public.completions'::regclass
          and attname = 'user_id'
          and not attisdropped
      )
  ),
  'auth.uid()',
  'completions.user_id 默认使用 auth.uid()'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'defaults-a@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'defaults-b@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select lives_ok(
  $$insert into public.habits (id, name, target_per_day, created_on) values ('shared-habit', 'A 的习惯', 1, '2026-08-01')$$,
  '账号 A 不传 user_id 可以新增 Habit'
);
select is((select user_id from public.habits where id = 'shared-habit'), '11111111-1111-1111-1111-111111111111'::uuid, '账号 A 的 Habit 自动归属 A');
select lives_ok(
  $$insert into public.completions (habit_id, date, count) values ('shared-habit', '2026-08-01', 1)$$,
  '账号 A 不传 user_id 可以新增 Completion'
);
select is((select user_id from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), '11111111-1111-1111-1111-111111111111'::uuid, '账号 A 的 Completion 自动归属 A');
select lives_ok(
  $$insert into public.habits (id, name, target_per_day, created_on)
    values ('shared-habit', 'A 更新后的习惯', 2, '2026-08-01')
    on conflict (user_id, id) do update
    set name = excluded.name, target_per_day = excluded.target_per_day$$,
  '账号 A 不传 user_id 可以按 Habit 复合冲突键 upsert'
);
select is((select count(*) from public.habits where id = 'shared-habit'), 1::bigint, 'Habit upsert 更新原行而非新增重复行');
select is((select name from public.habits where id = 'shared-habit'), 'A 更新后的习惯', 'Habit upsert 已更新原行');
select lives_ok(
  $$insert into public.completions (habit_id, date, count)
    values ('shared-habit', '2026-08-01', 2)
    on conflict (user_id, habit_id, date) do update
    set count = excluded.count$$,
  '账号 A 不传 user_id 可以按 Completion 复合冲突键 upsert'
);
select is((select count(*) from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), 1::bigint, 'Completion upsert 更新原行而非新增重复行');
select is((select count from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), 2, 'Completion upsert 已更新原行');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select lives_ok(
  $$insert into public.habits (id, name, target_per_day, created_on) values ('shared-habit', 'B 的习惯', 3, '2026-08-01')$$,
  '账号 B 可以使用与 A 相同的 Habit 逻辑键'
);
select is((select user_id from public.habits where id = 'shared-habit'), '22222222-2222-2222-2222-222222222222'::uuid, '账号 B 只看到归属 B 的同键 Habit');
select lives_ok(
  $$insert into public.completions (habit_id, date, count) values ('shared-habit', '2026-08-01', 3)$$,
  '账号 B 可以使用与 A 相同的 Completion 逻辑键'
);
select is((select user_id from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), '22222222-2222-2222-2222-222222222222'::uuid, '账号 B 只看到归属 B 的同键 Completion');

reset role;
select is((select count(*) from public.habits where id = 'shared-habit'), 2::bigint, 'A/B 的同键 Habit 各自保留一行');
select is((select count(*) from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), 2::bigint, 'A/B 的同键 Completion 各自保留一行');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select is((select name from public.habits where id = 'shared-habit'), 'A 更新后的习惯', '账号 B 的同键写入未修改账号 A 的 Habit');
select is((select count from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), 2, '账号 B 的同键写入未修改账号 A 的 Completion');
select throws_ok(
  $$insert into public.habits (user_id, id, name, target_per_day, created_on)
    values ('22222222-2222-2222-2222-222222222222', 'forged-habit', '伪造归属', 1, '2026-08-01')$$,
  '42501',
  null,
  '账号 A 显式伪造账号 B 的 Habit user_id 被 RLS 拒绝'
);
select throws_ok(
  $$insert into public.completions (user_id, habit_id, date, count)
    values ('22222222-2222-2222-2222-222222222222', 'shared-habit', '2026-08-02', 1)$$,
  '42501',
  null,
  '账号 A 显式伪造账号 B 的 Completion user_id 被 RLS 拒绝'
);
select lives_ok(
  $$delete from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'$$,
  '账号 A 仅按 habit_id 与 date 删除 Completion'
);
select is((select count(*) from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), 0::bigint, '账号 A 的同键 Completion 已删除');

reset role;
select is((select count(*) from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), 1::bigint, '仅按逻辑键删除后账号 B 的 Completion 仍保留');
select is((select user_id from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), '22222222-2222-2222-2222-222222222222'::uuid, 'RLS 将仅按逻辑键的删除隔离到当前账号');

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is((select count from public.completions where habit_id = 'shared-habit' and date = '2026-08-01'), 3, '账号 B 仍可读取自己的同键 Completion');

reset role;
select * from finish();

rollback;
