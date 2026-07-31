begin;

select plan(14);

select has_function('public', 'replace_user_store', array['jsonb'], 'replace_user_store 名称和 jsonb 参数保持不变');
select is(
  (select prorettype from pg_proc where oid = 'public.replace_user_store(jsonb)'::regprocedure),
  'jsonb'::regtype::oid,
  'replace_user_store 返回 jsonb'
);
select is(
  (select pronargs from pg_proc where oid = 'public.replace_user_store(jsonb)'::regprocedure),
  1::smallint,
  'replace_user_store 仍只有一个参数'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.replace_user_store(jsonb)'::regprocedure),
  'replace_user_store 保持 SECURITY INVOKER'
);
select ok(
  (select exists (
    select 1
    from unnest(proconfig) as setting
    where setting like 'search_path=%'
      and substring(setting from length('search_path=') + 1) in ('', '""')
  ) from pg_proc where oid = 'public.replace_user_store(jsonb)'::regprocedure),
  'replace_user_store 的 search_path 保持为空'
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

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'result-a@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'result-b@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
insert into public.user_data_state (user_id, initialized_at)
values ('55555555-5555-5555-5555-555555555555', '2026-07-01 00:00:00+00');
insert into public.habits (user_id, id, name, target_per_day, created_on)
values ('55555555-5555-5555-5555-555555555555', 'other-habit', '其他账号习惯', 4, '2026-07-01');
insert into public.completions (user_id, habit_id, date, count)
values ('55555555-5555-5555-5555-555555555555', 'other-habit', '2026-07-01', 3);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select is(
  public.replace_user_store(
    '{"version":1,"habits":[{"id":"z-habit","name":"后写习惯","targetPerDay":3,"createdOn":"2026-07-03","archivedOn":"2026-07-31"},{"id":"a-habit","name":"先排习惯","targetPerDay":2,"createdOn":"2026-07-02","archivedOn":null}],"completions":[{"habitId":"z-habit","date":"2026-07-04","count":2},{"habitId":"a-habit","date":"2026-07-03","count":1}]}'::jsonb
  ),
  '{"version":1,"habits":[{"id":"a-habit","name":"先排习惯","targetPerDay":2,"createdOn":"2026-07-02","archivedOn":null},{"id":"z-habit","name":"后写习惯","targetPerDay":3,"createdOn":"2026-07-03","archivedOn":"2026-07-31"}],"completions":[{"habitId":"a-habit","date":"2026-07-03","count":1},{"habitId":"z-habit","date":"2026-07-04","count":2}]}'::jsonb,
  'RPC 返回由本事务落库行重建且稳定排序的完整 Store v1'
);
select is(
  (
    select jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'targetPerDay', target_per_day,
        'createdOn', created_on,
        'archivedOn', archived_on
      ) order by id
    )
    from public.habits
  ),
  '[{"id":"a-habit","name":"先排习惯","targetPerDay":2,"createdOn":"2026-07-02","archivedOn":null},{"id":"z-habit","name":"后写习惯","targetPerDay":3,"createdOn":"2026-07-03","archivedOn":"2026-07-31"}]'::jsonb,
  'RPC 返回的 Habit 与账号 A 的实际落库值一致'
);
select is(
  (
    select jsonb_agg(
      jsonb_build_object('habitId', habit_id, 'date', date, 'count', count)
      order by habit_id, date
    )
    from public.completions
  ),
  '[{"habitId":"a-habit","date":"2026-07-03","count":1},{"habitId":"z-habit","date":"2026-07-04","count":2}]'::jsonb,
  'RPC 返回的 Completion 与账号 A 的实际落库值一致'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
select is((select name from public.habits where id = 'other-habit'), '其他账号习惯', '账号 B 的 Habit 未受替换影响');
select is((select count from public.completions where habit_id = 'other-habit'), 3, '账号 B 的 Completion 未受替换影响');
select is((select initialized_at from public.user_data_state), '2026-07-01 00:00:00+00'::timestamptz, '账号 B 的初始化状态未受替换影响');

reset role;
select * from finish();

rollback;
