begin;

select plan(43);

select has_function('public', 'replace_user_store', array['jsonb'], 'replace_user_store 存在且接收 jsonb');
select is(
  (select pronargs from pg_proc where oid = 'public.replace_user_store(jsonb)'::regprocedure),
  1::smallint,
  'replace_user_store 只有一个参数'
);
select is(
  (select oidvectortypes(proargtypes) from pg_proc where oid = 'public.replace_user_store(jsonb)'::regprocedure),
  'jsonb',
  'replace_user_store 的唯一参数是 jsonb'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.replace_user_store(jsonb)'::regprocedure),
  'replace_user_store 不是 SECURITY DEFINER'
);
select ok(
  (select exists (
    select 1
    from unnest(proconfig) as setting
    where setting like 'search_path=%'
      and substring(setting from length('search_path=') + 1) in ('', '""')
  ) from pg_proc where oid = 'public.replace_user_store(jsonb)'::regprocedure),
  'replace_user_store 的 search_path 为空'
);
select ok(
  not (select exists (
    select 1
    from pg_proc, aclexplode(proacl) as privilege
    where oid = 'public.replace_user_store(jsonb)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  )),
  'PUBLIC 没有 RPC EXECUTE 权限'
);
select ok(not has_function_privilege('anon', 'public.replace_user_store(jsonb)', 'EXECUTE'), 'anon 没有 RPC EXECUTE 权限');
select ok(has_function_privilege('authenticated', 'public.replace_user_store(jsonb)', 'EXECUTE'), 'authenticated 有 RPC EXECUTE 权限');

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[],"completions":[]}'::jsonb)$$,
  '42501',
  null,
  '无登录 authenticated session 不能替换 Store'
);
reset role;
set local role anon;
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[],"completions":[]}'::jsonb)$$,
  '42501',
  null,
  'anon 不能执行替换 RPC'
);
reset role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'replace-a@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'replace-b@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'replace-c@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into public.user_data_state (user_id, initialized_at) values ('11111111-1111-1111-1111-111111111111', '2026-07-01 00:00:00+00');
insert into public.habits (user_id, id, name, target_per_day, created_on) values ('11111111-1111-1111-1111-111111111111', 'old-habit', '旧习惯', 1, '2026-07-01');
insert into public.completions (user_id, habit_id, date, count) values ('11111111-1111-1111-1111-111111111111', 'old-habit', '2026-07-01', 1);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
insert into public.user_data_state (user_id, initialized_at) values ('22222222-2222-2222-2222-222222222222', '2026-07-02 00:00:00+00');
insert into public.habits (user_id, id, name, target_per_day, created_on) values ('22222222-2222-2222-2222-222222222222', 'b-habit', 'B 的习惯', 2, '2026-07-02');
insert into public.completions (user_id, habit_id, date, count) values ('22222222-2222-2222-2222-222222222222', 'b-habit', '2026-07-02', 2);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select lives_ok(
  $$select public.replace_user_store('{"version":1,"habits":[],"completions":[]}'::jsonb)$$,
  '没有初始化状态的账号 C 可以替换空 Store'
);
select is((select count(*) from public.user_data_state), 1::bigint, '账号 C 的初始化状态恰插入一行');
select ok((select initialized_at is not null from public.user_data_state), '账号 C 的初始化时间已写入');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select lives_ok(
  $$select public.replace_user_store('{"version":1,"habits":[{"id":"new-habit","name":"新习惯","targetPerDay":2,"createdOn":"2026-07-03","archivedOn":null}],"completions":[{"habitId":"new-habit","date":"2026-07-03","count":1}]}'::jsonb)$$,
  '账号 A 可以完整替换自己的 Store'
);
select is((select count(*) from public.habits), 1::bigint, '账号 A 的旧 Habit 已被替换');
select is((select name from public.habits where id = 'new-habit'), '新习惯', '账号 A 的候选 Habit 已写入');
select is((select count(*) from public.completions), 1::bigint, '账号 A 的候选 Completion 已写入');
select is((select initialized_at from public.user_data_state), '2026-07-01 00:00:00+00'::timestamptz, '账号 A 保留首次初始化时间');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is((select name from public.habits where id = 'b-habit'), 'B 的习惯', '账号 B 的 Habit 未受账号 A 替换影响');
select is((select count from public.completions where habit_id = 'b-habit'), 2, '账号 B 的 Completion 未受账号 A 替换影响');
select is((select initialized_at from public.user_data_state), '2026-07-02 00:00:00+00'::timestamptz, '账号 B 的初始化状态未受影响');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select lives_ok(
  $$select public.replace_user_store('{"version":1,"habits":[],"completions":[]}'::jsonb)$$,
  '空 Store 可以成功替换'
);
select is((select count(*) from public.habits), 0::bigint, '空 Store 删除账号 A 的所有 Habit');
select is((select count(*) from public.completions), 0::bigint, '空 Store 删除账号 A 的所有 Completion');
select is((select initialized_at from public.user_data_state), '2026-07-01 00:00:00+00'::timestamptz, '空 Store 保留账号 A 的首次初始化时间');

select lives_ok(
  $$select public.replace_user_store('{"version":1,"habits":[{"id":"rollback-habit","name":"回滚基线","targetPerDay":1,"createdOn":"2026-07-04","archivedOn":null}],"completions":[{"habitId":"rollback-habit","date":"2026-07-04","count":1}]}'::jsonb)$$,
  '建立账号 A 的回滚基线'
);
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[{"id":"duplicate-habit","name":"重复一","targetPerDay":1,"createdOn":"2026-07-05","archivedOn":null},{"id":"duplicate-habit","name":"重复二","targetPerDay":1,"createdOn":"2026-07-05","archivedOn":null}],"completions":[]}'::jsonb)$$,
  '23505',
  null,
  '重复 Habit 由主键拒绝'
);
select is((select name from public.habits where id = 'rollback-habit'), '回滚基线', '重复 Habit 失败后账号 A 的原 Habit 完整保留');
select is((select count from public.completions where habit_id = 'rollback-habit'), 1, '重复 Habit 失败后账号 A 的原 Completion 完整保留');
select is((select initialized_at from public.user_data_state), '2026-07-01 00:00:00+00'::timestamptz, '重复 Habit 失败后账号 A 的初始化时间完整保留');
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[{"id":"duplicate-completion-habit","name":"重复记录","targetPerDay":1,"createdOn":"2026-07-05","archivedOn":null}],"completions":[{"habitId":"duplicate-completion-habit","date":"2026-07-05","count":1},{"habitId":"duplicate-completion-habit","date":"2026-07-05","count":1}]}'::jsonb)$$,
  '23505',
  null,
  '重复 Completion 由主键拒绝'
);
select is((select name from public.habits where id = 'rollback-habit'), '回滚基线', '重复 Completion 失败后账号 A 的原 Habit 完整保留');
select is((select count from public.completions where habit_id = 'rollback-habit'), 1, '重复 Completion 失败后账号 A 的原 Completion 完整保留');
select is((select initialized_at from public.user_data_state), '2026-07-01 00:00:00+00'::timestamptz, '重复 Completion 失败后账号 A 的初始化时间完整保留');
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[{"id":"unreferenced","name":"未引用","targetPerDay":1,"createdOn":"2026-07-05","archivedOn":null}],"completions":[{"habitId":"missing-habit","date":"2026-07-05","count":1}]}'::jsonb)$$,
  '23503',
  null,
  '断裂 Completion 引用由外键拒绝'
);
select is((select name from public.habits where id = 'rollback-habit'), '回滚基线', '断裂引用失败后账号 A 的原 Habit 完整保留');
select is((select count from public.completions where habit_id = 'rollback-habit'), 1, '断裂引用失败后账号 A 的原 Completion 完整保留');
select is((select initialized_at from public.user_data_state), '2026-07-01 00:00:00+00'::timestamptz, '断裂引用失败后账号 A 的初始化时间完整保留');
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[{"id":7,"name":"类型错误","targetPerDay":1,"createdOn":"2026-07-05","archivedOn":null}],"completions":[]}'::jsonb)$$,
  '22023',
  null,
  '无效 Habit 结构以 22023 拒绝'
);
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[{"id":"type-safe","name":"类型错误","targetPerDay":1,"createdOn":"2026-07-05","archivedOn":null}],"completions":[{"habitId":"type-safe","date":"2026-07-05","count":"1"}]}'::jsonb)$$,
  '22023',
  null,
  '无效 Completion 结构以 22023 拒绝'
);
select throws_ok(
  $$select public.replace_user_store('{"version":2,"habits":[],"completions":[]}'::jsonb)$$,
  '22023',
  null,
  '错误 Store version 以 22023 拒绝'
);
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[]}'::jsonb)$$,
  '22023',
  null,
  '缺失 Store 字段以 22023 拒绝'
);
select throws_ok(
  $$select public.replace_user_store('{"version":1,"habits":[],"completions":[],"extra":true}'::jsonb)$$,
  '22023',
  null,
  '未知 Store 字段以 22023 拒绝'
);

reset role;
select * from finish();

rollback;
