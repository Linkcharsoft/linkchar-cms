-- Local QA users only (password QaLocal12345). GoTrue fails to sign in when its token columns are null.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('QaLocal12345', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('name', name), now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'qa-super@local.test', 'QA Super'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'qa-editor@local.test', 'QA Editor')
) as qa (id, email, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
from auth.users where email like 'qa-%@local.test';

update public.profiles set role = 'superadmin' where id = 'a0000000-0000-0000-0000-000000000001';
