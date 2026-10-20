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

-- Published content for the site in both languages: home, the studio page and two posts.
insert into public.documents (id, type, key, slug, slugs, data, visible) values
  ('c0000000-0000-0000-0000-000000000001', 'home', 'home', null, '{}', '{
    "hero": {
      "eyebrow": {"es": "Estudio de arquitectura", "en": "Architecture studio"},
      "title": {"es": "Arquitectura que se habita", "en": "Architecture to live in"},
      "intro": {"es": "Casas y espacios de trabajo pensados desde la luz y el uso.", "en": "Homes and workplaces designed around light and use."},
      "cta": {"label": {"es": "Conocé el estudio", "en": "Meet the studio"}, "link": {"type": "entry", "href": "", "newTab": false, "entry": "about", "anchor": "historia"}, "variant": "primary"}
    },
    "services": {
      "title": {"es": "Qué hacemos", "en": "What we do"},
      "items": [
        {"_key": "s1", "name": {"es": "Arquitectura", "en": "Architecture"}, "description": {"es": "", "en": ""}, "icon": "pi-home"},
        {"_key": "s2", "name": {"es": "Interiores", "en": "Interiors"}, "description": {"es": "", "en": ""}, "icon": "pi-pencil"}
      ]
    },
    "projects": {"title": {"es": "Proyectos", "en": "Projects"}, "featured": [], "_hidden": false}
  }', true),
  ('c0000000-0000-0000-0000-000000000002', 'about', 'about', null, '{}', '{
    "story": {
      "title": {"es": "Un estudio en el norte", "en": "A studio in the north"},
      "body": {
        "es": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Trabajamos desde 2012 en casas, oficinas y reformas."}]}]},
        "en": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "We have worked on homes, offices and renovations since 2012."}]}]}
      },
      "founded": 2012
    },
    "team": {"title": {"es": "Equipo", "en": "Team"}, "intro": {"es": "", "en": ""}, "_hidden": false}
  }', true),
  ('c0000000-0000-0000-0000-000000000003', 'posts', null, 'como-elegir-materiales', '{"es": "como-elegir-materiales", "en": "how-to-choose-materials"}', '{
    "title": {"es": "Cómo elegir materiales", "en": "How to choose materials"},
    "slug": {"es": "como-elegir-materiales", "en": "how-to-choose-materials"},
    "excerpt": {"es": "Lo que conviene mirar antes de decidir.", "en": "What to look at before deciding."},
    "body": {
      "es": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Durabilidad, mantenimiento y costo a lo largo del tiempo."}]}]},
      "en": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Durability, upkeep and cost over time."}]}]}
    }
  }', true),
  ('c0000000-0000-0000-0000-000000000004', 'posts', null, 'luz-natural', '{"es": "luz-natural", "en": "natural-light"}', '{
    "title": {"es": "Luz natural en casas chicas", "en": "Natural light in small houses"},
    "slug": {"es": "luz-natural", "en": "natural-light"},
    "excerpt": {"es": "Ideas para ganar luz sin agrandar.", "en": "Ideas to gain light without building more."},
    "body": {
      "es": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Patios, claraboyas y colores claros."}]}]},
      "en": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Courtyards, skylights and light colors."}]}]}
    }
  }', true);

insert into public.published_documents (id, type, key, slug, slugs, paths, data, published_at)
select d.id, d.type, d.key, d.slug, d.slugs, p.paths::jsonb, d.data, now() - p.age::interval
from public.documents d
join (values
  ('c0000000-0000-0000-0000-000000000001'::uuid, '{"es": "/", "en": "/en"}', '4 days'),
  ('c0000000-0000-0000-0000-000000000002'::uuid, '{"es": "/estudio", "en": "/en/studio"}', '4 days'),
  ('c0000000-0000-0000-0000-000000000003'::uuid, '{"es": "/blog/como-elegir-materiales", "en": "/en/blog/how-to-choose-materials"}', '3 days'),
  ('c0000000-0000-0000-0000-000000000004'::uuid, '{"es": "/blog/luz-natural", "en": "/en/blog/natural-light"}', '2 days')
) as p (id, paths, age) on p.id = d.id;
