-- Budget planner: saved plans, share tracking, version history.
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run twice.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------
create table if not exists plans (
  id             text primary key,                 -- e.g. acme-trading-k7x2m9qa
  company        text not null,
  lang           text not null default 'en',       -- language the plan was created in
  data           jsonb not null,                   -- the whole plan
  link           text generated always as ('https://hashirfaraz.com/plan/' || id) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_opened_at timestamptz,
  open_count     int not null default 0,
  share_count    int not null default 0,
  share_lang     text,                             -- language of the last Share click
  last_shared_at timestamptz
);

create table if not exists plan_versions (
  id       bigserial primary key,
  plan_id  text not null references plans(id) on delete cascade,
  data     jsonb not null,
  saved_at timestamptz not null default now()
);
create index if not exists plan_versions_plan_idx on plan_versions (plan_id, saved_at desc);

-- Lock both tables: the public website cannot read or write them directly.
-- Only you (logged in to Supabase) can see the rows.
alter table plans enable row level security;
alter table plan_versions enable row level security;

-- ---------------------------------------------------------------
-- Functions the website is allowed to call
-- ---------------------------------------------------------------

-- Create a plan, return its link id: company name plus a short code, e.g. incon-media-k7x2mq.
create or replace function create_plan(p_company text, p_lang text, p_data jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare
  slug text;
  new_id text;
  code text;
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';  -- no look-alike characters
  raw bytea;
  i int;
begin
  if p_company is null or length(trim(p_company)) = 0 or length(p_company) > 120 then
    raise exception 'company name required';
  end if;
  if pg_column_size(p_data) > 600000 then
    raise exception 'plan too large';
  end if;

  slug := lower(regexp_replace(trim(p_company), '[^a-zA-Z0-9]+', '-', 'g'));
  slug := trim(both '-' from slug);
  slug := left(slug, 30);
  slug := trim(both '-' from slug);
  if slug = '' then slug := 'plan'; end if;   -- e.g. Arabic-only names

  loop
    raw := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    code := '';
    for i in 0..5 loop
      code := code || substr(alphabet, 1 + (get_byte(raw, i) % 31), 1);
    end loop;
    new_id := slug || '-' || code;
    exit when not exists (select 1 from plans where id = new_id);
  end loop;

  insert into plans (id, company, lang, data)
  values (new_id, trim(p_company), case when p_lang = 'ar' then 'ar' else 'en' end, p_data);
  return new_id;
end $$;

-- Open a plan by its exact id.
create or replace function get_plan(p_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r plans%rowtype;
begin
  update plans set open_count = open_count + 1, last_opened_at = now()
  where id = p_id returning * into r;
  if not found then return null; end if;
  return jsonb_build_object('id', r.id, 'company', r.company, 'lang', r.lang, 'data', r.data);
end $$;

-- Save changes. Keeps a snapshot at most every 5 minutes, last 20 per plan.
create or replace function save_plan(p_id text, p_company text, p_data jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if pg_column_size(p_data) > 600000 then
    raise exception 'plan too large';
  end if;

  update plans
     set data = p_data,
         company = case when p_company is not null and length(trim(p_company)) between 1 and 120
                        then trim(p_company) else company end,
         updated_at = now()
   where id = p_id;
  if not found then return false; end if;

  if not exists (select 1 from plan_versions
                 where plan_id = p_id and saved_at > now() - interval '5 minutes') then
    insert into plan_versions (plan_id, data) values (p_id, p_data);
    delete from plan_versions
     where plan_id = p_id
       and id not in (select id from plan_versions where plan_id = p_id
                      order by saved_at desc limit 20);
  end if;
  return true;
end $$;

-- Count a Share click and remember the language of the button used.
create or replace function track_share(p_id text, p_lang text)
returns void
language sql security definer set search_path = public as $$
  update plans
     set share_count = share_count + 1,
         share_lang = case when p_lang = 'ar' then 'ar' else 'en' end,
         last_shared_at = now()
   where id = p_id;
$$;

-- Does nothing; the weekly keep-awake ping calls this.
create or replace function ping()
returns text
language sql security definer set search_path = public as $$
  select 'ok'::text;
$$;

-- Used only by the link-preview function: company name and language, no open count.
create or replace function plan_preview(p_id text)
returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('company', company, 'lang', lang) from plans where id = p_id;
$$;
revoke all on function plan_preview(text) from public;
grant execute on function plan_preview(text) to anon;

-- Only these functions are public.
revoke all on function create_plan(text, text, jsonb) from public;
revoke all on function get_plan(text) from public;
revoke all on function save_plan(text, text, jsonb) from public;
revoke all on function track_share(text, text) from public;
revoke all on function ping() from public;
grant execute on function create_plan(text, text, jsonb) to anon;
grant execute on function get_plan(text) to anon;
grant execute on function save_plan(text, text, jsonb) to anon;
grant execute on function track_share(text, text) to anon;
grant execute on function ping() to anon;
