-- Homepage contact form: "Tell me what you're looking for".
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to run twice.
-- Rows appear in Supabase > Table Editor > leads. Only you (logged in) can read them.

create table if not exists leads (
  id         bigserial primary key,
  contact    text not null,                    -- phone, WhatsApp number or email, as typed
  need       text,                             -- what they are looking for (optional)
  lang       text not null default 'en',       -- page language: en or ar
  source     text,                             -- which form on the site
  created_at timestamptz not null default now()
);

-- Locked: the public website cannot read or write the table directly.
alter table leads enable row level security;

-- The only thing the website may do: add one row, through this function.
create or replace function submit_lead(p_contact text, p_need text, p_lang text, p_source text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_contact is null or length(trim(p_contact)) < 5 or length(p_contact) > 200 then
    raise exception 'contact required';
  end if;
  if p_need is not null and length(p_need) > 3000 then
    raise exception 'message too long';
  end if;
  insert into leads (contact, need, lang, source)
  values (
    trim(p_contact),
    nullif(trim(coalesce(p_need, '')), ''),
    case when p_lang = 'ar' then 'ar' else 'en' end,
    left(coalesce(p_source, 'site'), 60)
  );
end;
$$;

revoke all on function submit_lead(text, text, text, text) from public;
grant execute on function submit_lead(text, text, text, text) to anon;
