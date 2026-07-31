begin;

select plan(90);

select has_table('public', 'user_data_state', 'user_data_state 表存在');
select has_table('public', 'habits', 'habits 表存在');
select has_table('public', 'completions', 'completions 表存在');

select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.user_data_state'::regclass and attname = 'user_id' and not attisdropped), 'uuid', 'user_data_state.user_id 是 uuid');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.user_data_state'::regclass and attname = 'initialized_at' and not attisdropped), 'timestamp with time zone', 'user_data_state.initialized_at 是 timestamptz');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.habits'::regclass and attname = 'user_id' and not attisdropped), 'uuid', 'habits.user_id 是 uuid');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.habits'::regclass and attname = 'id' and not attisdropped), 'text', 'habits.id 是 text');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.habits'::regclass and attname = 'name' and not attisdropped), 'text', 'habits.name 是 text');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.habits'::regclass and attname = 'target_per_day' and not attisdropped), 'integer', 'habits.target_per_day 是 integer');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.habits'::regclass and attname = 'created_on' and not attisdropped), 'date', 'habits.created_on 是 date');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.habits'::regclass and attname = 'archived_on' and not attisdropped), 'date', 'habits.archived_on 是 date');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.completions'::regclass and attname = 'user_id' and not attisdropped), 'uuid', 'completions.user_id 是 uuid');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.completions'::regclass and attname = 'habit_id' and not attisdropped), 'text', 'completions.habit_id 是 text');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.completions'::regclass and attname = 'date' and not attisdropped), 'date', 'completions.date 是 date');
select is((select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.completions'::regclass and attname = 'count' and not attisdropped), 'integer', 'completions.count 是 integer');

select ok(exists (select 1 from pg_constraint where conrelid = 'public.user_data_state'::regclass and contype = 'p' and pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id)'), 'user_data_state 主键为 user_id');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.habits'::regclass and contype = 'p' and pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id, id)'), 'habits 主键包含 user_id 与 id');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.completions'::regclass and contype = 'p' and pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id, habit_id, date)'), 'completions 主键保证同账号同习惯同日期唯一');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.user_data_state'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c'), 'user_data_state 关联账号并随账号删除');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.habits'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c'), 'habits 关联账号并随账号删除');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.completions'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c'), 'completions 关联账号并随账号删除');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.completions'::regclass and contype = 'f' and confrelid = 'public.habits'::regclass and confdeltype = 'c' and pg_get_constraintdef(oid) like 'FOREIGN KEY (user_id, habit_id) REFERENCES habits(user_id, id) ON DELETE CASCADE'), 'completions 关联所属 habit 并随 habit 删除');

select ok(exists (select 1 from pg_constraint where conrelid = 'public.habits'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%btrim(id)%'), 'habits.id 拒绝空白值');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.habits'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%btrim(name)%'), 'habits.name 拒绝空白值');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.habits'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%target_per_day > 0%'), 'habits.target_per_day 必须为正数');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.habits'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%archived_on >= created_on%'), 'habits.archived_on 不早于 created_on');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.completions'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%count > 0%'), 'completions.count 必须为正数');

select is((select relrowsecurity from pg_class where oid = 'public.user_data_state'::regclass), true, 'user_data_state 启用 RLS');
select is((select relforcerowsecurity from pg_class where oid = 'public.user_data_state'::regclass), true, 'user_data_state 强制 RLS');
select is((select relrowsecurity from pg_class where oid = 'public.habits'::regclass), true, 'habits 启用 RLS');
select is((select relforcerowsecurity from pg_class where oid = 'public.habits'::regclass), true, 'habits 强制 RLS');
select is((select relrowsecurity from pg_class where oid = 'public.completions'::regclass), true, 'completions 启用 RLS');
select is((select relforcerowsecurity from pg_class where oid = 'public.completions'::regclass), true, 'completions 强制 RLS');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'habit-a@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'habit-b@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select lives_ok($$insert into public.user_data_state (user_id) values ('11111111-1111-1111-1111-111111111111')$$, '账号 A 可以写入自己的初始化状态');
select lives_ok($$insert into public.habits (user_id, id, name, target_per_day, created_on) values ('11111111-1111-1111-1111-111111111111', 'reading', '阅读', 1, '2026-07-31')$$, '账号 A 可以写入自己的 habit');
select lives_ok($$insert into public.completions (user_id, habit_id, date, count) values ('11111111-1111-1111-1111-111111111111', 'reading', '2026-07-31', 1)$$, '账号 A 可以写入自己的 completion');
select throws_ok($$insert into public.completions (user_id, habit_id, date, count) values ('11111111-1111-1111-1111-111111111111', 'reading', '2026-07-31', 1)$$, '23505', null, '同账号同习惯同日期 completion 不可重复');
select throws_ok($$insert into public.habits (user_id, id, name, target_per_day, created_on) values ('11111111-1111-1111-1111-111111111111', ' ', '有效名称', 1, '2026-07-31')$$, '23514', null, 'habit id 不接受空白值');
select throws_ok($$insert into public.habits (user_id, id, name, target_per_day, created_on) values ('11111111-1111-1111-1111-111111111111', 'blank-name', ' ', 1, '2026-07-31')$$, '23514', null, 'habit 名称不接受空白值');
select throws_ok($$insert into public.habits (user_id, id, name, target_per_day, created_on) values ('11111111-1111-1111-1111-111111111111', 'zero-target', '有效名称', 0, '2026-07-31')$$, '23514', null, 'habit 目标必须为正数');
select throws_ok($$insert into public.habits (user_id, id, name, target_per_day, created_on, archived_on) values ('11111111-1111-1111-1111-111111111111', 'early-archive', '有效名称', 1, '2026-07-31', '2026-07-30')$$, '23514', null, 'habit 归档日不得早于创建日');
select throws_ok($$insert into public.completions (user_id, habit_id, date, count) values ('11111111-1111-1111-1111-111111111111', 'reading', '2026-07-30', 0)$$, '23514', null, 'completion count 必须为正数');
select lives_ok($$update public.user_data_state set initialized_at = '2026-07-30 00:00:00+00' where user_id = '11111111-1111-1111-1111-111111111111'$$, '账号 A 可以更新自己的初始化状态');
select lives_ok($$update public.habits set name = '深度阅读' where user_id = '11111111-1111-1111-1111-111111111111' and id = 'reading'$$, '账号 A 可以更新自己的 habit');
select lives_ok($$update public.completions set count = 2 where user_id = '11111111-1111-1111-1111-111111111111' and habit_id = 'reading' and date = '2026-07-31'$$, '账号 A 可以更新自己的 completion');
select ok((select initialized_at = '2026-07-30 00:00:00+00'::timestamptz from public.user_data_state where user_id = '11111111-1111-1111-1111-111111111111'), '账号 A 的初始化状态更新已保存');
select is((select name from public.habits where id = 'reading'), '深度阅读', '账号 A 的 habit 更新已保存');
select is((select count from public.completions where habit_id = 'reading' and date = '2026-07-31'), 2, '账号 A 的 completion 更新已保存');
select throws_ok($$update public.user_data_state set user_id = '22222222-2222-2222-2222-222222222222' where user_id = '11111111-1111-1111-1111-111111111111'$$, '42501', null, '账号 A 不能转移 user_data_state 所有权');
select throws_ok($$update public.habits set user_id = '22222222-2222-2222-2222-222222222222' where user_id = '11111111-1111-1111-1111-111111111111' and id = 'reading'$$, '42501', null, '账号 A 不能转移 habit 所有权');
select throws_ok($$update public.completions set user_id = '22222222-2222-2222-2222-222222222222' where user_id = '11111111-1111-1111-1111-111111111111' and habit_id = 'reading' and date = '2026-07-31'$$, '42501', null, '账号 A 不能转移 completion 所有权');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is((select count(*) from public.user_data_state where user_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, '账号 B 不能读取账号 A 的初始化状态');
select is((select count(*) from public.habits where user_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, '账号 B 不能读取账号 A 的 habits');
select is((select count(*) from public.completions where user_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, '账号 B 不能读取账号 A 的 completions');
select lives_ok($$insert into public.user_data_state (user_id) values ('22222222-2222-2222-2222-222222222222')$$, '账号 B 可以写入自己的初始化状态');
select lives_ok($$insert into public.habits (user_id, id, name, target_per_day, created_on) values ('22222222-2222-2222-2222-222222222222', 'walking', '散步', 1, '2026-07-31')$$, '账号 B 可以写入自己的 habit');
select lives_ok($$insert into public.completions (user_id, habit_id, date, count) values ('22222222-2222-2222-2222-222222222222', 'walking', '2026-07-31', 1)$$, '账号 B 可以写入自己的 completion');
select throws_ok($$insert into public.user_data_state (user_id) values ('11111111-1111-1111-1111-111111111111')$$, '42501', null, '账号 B 不能以账号 A 身份新增初始化状态');
select throws_ok($$insert into public.habits (user_id, id, name, target_per_day, created_on) values ('11111111-1111-1111-1111-111111111111', 'stolen', '越权写入', 1, '2026-07-31')$$, '42501', null, '账号 B 不能以账号 A 身份新增 habit');
select throws_ok($$insert into public.completions (user_id, habit_id, date, count) values ('11111111-1111-1111-1111-111111111111', 'reading', '2026-08-01', 1)$$, '42501', null, '账号 B 不能以账号 A 身份新增 completion');
select lives_ok($$update public.user_data_state set initialized_at = '2026-08-01 00:00:00+00' where user_id = '11111111-1111-1111-1111-111111111111'$$, '账号 B 对账号 A 的初始化状态 UPDATE 不产生副作用');
select lives_ok($$update public.habits set name = '篡改' where user_id = '11111111-1111-1111-1111-111111111111' and id = 'reading'$$, '账号 B 对账号 A 的 habit UPDATE 不产生副作用');
select lives_ok($$update public.completions set count = 99 where user_id = '11111111-1111-1111-1111-111111111111' and habit_id = 'reading' and date = '2026-07-31'$$, '账号 B 对账号 A 的 completion UPDATE 不产生副作用');
select lives_ok($$delete from public.user_data_state where user_id = '11111111-1111-1111-1111-111111111111'$$, '账号 B 对账号 A 的初始化状态 DELETE 不产生副作用');
select lives_ok($$delete from public.habits where user_id = '11111111-1111-1111-1111-111111111111' and id = 'reading'$$, '账号 B 对账号 A 的 habit DELETE 不产生副作用');
select lives_ok($$delete from public.completions where user_id = '11111111-1111-1111-1111-111111111111' and habit_id = 'reading' and date = '2026-07-31'$$, '账号 B 对账号 A 的 completion DELETE 不产生副作用');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select ok((select initialized_at = '2026-07-30 00:00:00+00'::timestamptz from public.user_data_state where user_id = '11111111-1111-1111-1111-111111111111'), '账号 B 未修改账号 A 的初始化状态且未删除该行');
select is((select name from public.habits where id = 'reading'), '深度阅读', '账号 B 未修改账号 A 的 habit 且未删除该行');
select is((select count from public.completions where habit_id = 'reading' and date = '2026-07-31'), 2, '账号 B 未修改账号 A 的 completion 且未删除该行');
select lives_ok($$delete from public.user_data_state where user_id = '11111111-1111-1111-1111-111111111111'$$, '账号 A 可以删除自己的初始化状态');
select lives_ok($$delete from public.completions where user_id = '11111111-1111-1111-1111-111111111111' and habit_id = 'reading' and date = '2026-07-31'$$, '账号 A 可以删除自己的 completion');
select lives_ok($$delete from public.habits where user_id = '11111111-1111-1111-1111-111111111111' and id = 'reading'$$, '账号 A 可以删除自己的 habit');
select is((select count(*) from public.user_data_state where user_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, '账号 A 的初始化状态删除已保存');
select is((select count(*) from public.completions where user_id = '11111111-1111-1111-1111-111111111111' and habit_id = 'reading'), 0::bigint, '账号 A 的 completion 删除已保存');
select is((select count(*) from public.habits where user_id = '11111111-1111-1111-1111-111111111111' and id = 'reading'), 0::bigint, '账号 A 的 habit 删除已保存');

reset role;
select ok(not has_table_privilege('anon', 'public.user_data_state', 'select'), 'anon 没有 user_data_state SELECT 权限');
select ok(not has_table_privilege('anon', 'public.user_data_state', 'insert'), 'anon 没有 user_data_state INSERT 权限');
select ok(not has_table_privilege('anon', 'public.user_data_state', 'update'), 'anon 没有 user_data_state UPDATE 权限');
select ok(not has_table_privilege('anon', 'public.user_data_state', 'delete'), 'anon 没有 user_data_state DELETE 权限');
select ok(not has_table_privilege('anon', 'public.habits', 'select'), 'anon 没有 habits SELECT 权限');
select ok(not has_table_privilege('anon', 'public.habits', 'insert'), 'anon 没有 habits INSERT 权限');
select ok(not has_table_privilege('anon', 'public.habits', 'update'), 'anon 没有 habits UPDATE 权限');
select ok(not has_table_privilege('anon', 'public.habits', 'delete'), 'anon 没有 habits DELETE 权限');
select ok(not has_table_privilege('anon', 'public.completions', 'select'), 'anon 没有 completions SELECT 权限');
select ok(not has_table_privilege('anon', 'public.completions', 'insert'), 'anon 没有 completions INSERT 权限');
select ok(not has_table_privilege('anon', 'public.completions', 'update'), 'anon 没有 completions UPDATE 权限');
select ok(not has_table_privilege('anon', 'public.completions', 'delete'), 'anon 没有 completions DELETE 权限');
set local role anon;
select throws_ok($$select * from public.user_data_state$$, '42501', null, '匿名角色没有 user_data_state 权限');
select throws_ok($$select * from public.habits$$, '42501', null, '匿名角色没有 habits 权限');
select throws_ok($$select * from public.completions$$, '42501', null, '匿名角色没有 completions 权限');

reset role;
select * from finish();

rollback;
