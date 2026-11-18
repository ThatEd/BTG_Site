-- ============================================================================
-- BTG radio "send to game" — backend install
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste this whole
-- file -> Run. It is safe to run more than once.
--
-- WHAT IT ADDS (nothing existing is changed, and the Edge Function is not
-- touched):
--   * extension  http                  (lets the database call the BTG API)
--   * table      radio_messages        (durable race radio archive)
--   * table      radio_series_state    (the on/off switch per series)
--   * functions  radio_send, radio_poll, radio_status, radio_set_enabled
--                (callable with the public anon key at /rest/v1/rpc/<name>)
--
-- HOW LOGINS ARE CHECKED: radio_send and radio_set_enabled pass the caller's
-- session token to the existing Edge Function ("session" action) and trust its
-- answer (username, role, series). No password or secret is stored here.
--
-- Both tables have row level security on with no policies, so the anon key
-- cannot read or write them directly; only the four functions can.
--
-- TO REMOVE EVERYTHING: see the block at the bottom of this file.
-- ============================================================================

create extension if not exists http with schema extensions;

-- ---------------------------------------------------------------- tables ----

create table if not exists public.radio_messages (
  id              bigint generated always as identity primary key,
  series          text        not null,
  created_at      timestamptz not null default now(),
  sender_username text        not null,
  sender_role     text        not null default '',
  payload         jsonb       not null
);
create index if not exists radio_messages_series_id_idx
  on public.radio_messages (series, id);
create index if not exists radio_messages_sender_idx
  on public.radio_messages (sender_username, created_at desc);

-- Durable race archive: created_at is the database timestamp, never client time.
alter table public.radio_messages add column if not exists driver_id bigint;
alter table public.radio_messages add column if not exists team_id bigint;
alter table public.radio_messages add column if not exists race_id bigint references public.races(race_id);
alter table public.radio_messages add column if not exists session_type text;
alter table public.radio_messages add column if not exists lap integer check (lap between 0 and 1000);
alter table public.radio_messages add column if not exists lap_source text not null default 'sender';
alter table public.radio_messages add column if not exists sender_name text not null default '';
alter table public.radio_messages alter column session_type drop not null;
alter table public.radio_messages alter column session_type drop default;
create index if not exists radio_messages_race_lap_idx on public.radio_messages(race_id, session_type, lap, created_at);

create table if not exists public.radio_series_state (
  series     text primary key,
  enabled    boolean     not null default false,
  updated_by text        not null default '',
  updated_at timestamptz not null default now()
);

alter table public.radio_messages     enable row level security;
alter table public.radio_series_state enable row level security;
revoke all on public.radio_messages     from anon, authenticated;
revoke all on public.radio_series_state from anon, authenticated;

-- ------------------------------------------------------ internal helpers ----

-- One spelling per series: trimmed, upper case, and the site's "GT1" is the
-- database's "XGT".
create or replace function public.radio_norm_series(p_series text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case upper(btrim(coalesce(p_series, '')))
           when 'GT1' then 'XGT'
           else upper(btrim(coalesce(p_series, '')))
         end;
$$;

-- Removes control characters and trims.
create or replace function public.radio_clean_text(p_text text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select btrim(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]]+', ' ', 'g'));
$$;

-- Asks the BTG Edge Function whether a session token is valid.
-- Returns {"ok":true,"username":...,"role":...,"series":...} or {"ok":false,...}.
create or replace function public.radio_check_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_status  integer;
  v_content text;
  v_data    jsonb;
begin
  if p_token is null or length(p_token) < 8 or length(p_token) > 512 then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  begin
    perform http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');
    select r.status, r.content
      into v_status, v_content
      from http_post(
             'https://jocmjietuviegelluiev.supabase.co/functions/v1/api',
             jsonb_build_object('action', 'session', 'token', p_token)::text,
             'application/json'
           ) as r;
    v_data := v_content::jsonb;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'auth_unavailable');
  end;

  if v_data is null
     or v_data ->> 'ok' is distinct from 'true'
     or coalesce(v_data ->> 'username', '') = '' then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  return jsonb_build_object(
    'ok',       true,
    'username', v_data ->> 'username',
    'role',     lower(coalesce(v_data ->> 'role', '')),
    'series',   coalesce(v_data ->> 'series', '')
  );
end;
$$;

-- Checks a message from the site and returns a clean copy.
-- Raises an exception with a short reason when something is wrong.
create or replace function public.radio_clean_payload(p_payload jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_name    text := upper(public.radio_clean_text(p_payload ->> 'name'));
  v_number  text := public.radio_clean_text(p_payload ->> 'number');
  v_team    text := upper(public.radio_clean_text(p_payload ->> 'team'));
  v_colour  text := lower(coalesce(p_payload ->> 'colour', ''));
  v_text_c  text := lower(coalesce(p_payload ->> 'textColour', ''));
  v_logo    text := btrim(coalesce(p_payload ->> 'logo', ''));
  v_lines   jsonb := '[]'::jsonb;
  v_line    jsonb;
  v_from    text;
  v_label   text;
  v_text    text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload';
  end if;
  if length(v_name) < 1 or length(v_name) > 24 then raise exception 'name'; end if;
  if length(v_number) > 3 then raise exception 'number'; end if;
  if length(v_team) > 40 then raise exception 'team'; end if;
  if v_colour !~ '^#[0-9a-f]{6}$' then raise exception 'colour'; end if;
  if v_text_c = '' then v_text_c := '#ffffff'; end if;
  if v_text_c !~ '^#[0-9a-f]{6}$' then raise exception 'textColour'; end if;

  -- Logo: empty, or a file inside the site's own logos/ folder.
  if v_logo <> '' then
    if length(v_logo) > 200
       or v_logo !~ '^logos/[A-Za-z0-9 _()./-]+\.(png|webp|svg|jpg|jpeg)$'
       or v_logo like '%..%'
       or v_logo like '%//%' then
      raise exception 'logo';
    end if;
  end if;

  if jsonb_typeof(p_payload -> 'lines') is distinct from 'array'
     or jsonb_array_length(p_payload -> 'lines') < 1
     or jsonb_array_length(p_payload -> 'lines') > 4 then
    raise exception 'lines';
  end if;

  for v_line in select value from jsonb_array_elements(p_payload -> 'lines') loop
    v_from  := lower(coalesce(v_line ->> 'from', ''));
    v_label := upper(public.radio_clean_text(v_line ->> 'label'));
    v_text  := public.radio_clean_text(v_line ->> 'text');
    if v_from not in ('driver', 'engineer') then raise exception 'line_from'; end if;
    if length(v_label) > 24 then raise exception 'line_label'; end if;
    if length(v_text) < 1 or length(v_text) > 140 then raise exception 'line_text'; end if;
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('from', v_from, 'label', v_label, 'text', v_text));
  end loop;

  return jsonb_build_object(
    'name', v_name, 'number', v_number, 'team', v_team,
    'colour', v_colour, 'textColour', v_text_c, 'logo', v_logo,
    'lines', v_lines);
end;
$$;

-- ------------------------------------------------------- public functions ---

-- Is live radio switched on for this series?   (no login)
create or replace function public.radio_status(p_series text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'ok', true,
    'series', public.radio_norm_series(p_series),
    'enabled', coalesce(
      (select s.enabled from public.radio_series_state s
        where s.series = public.radio_norm_series(p_series)), false));
$$;

-- The game asks for new messages.   (no login; this content goes on stream)
--   p_after = the "cursor" from the previous answer; leave it out on the first
--   call to start from "now" without replaying anything old.
create or replace function public.radio_poll(p_series text, p_after bigint default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_series  text := public.radio_norm_series(p_series);
  v_enabled boolean;
  v_max     bigint;
  v_msgs    jsonb;
  v_cursor  bigint;
begin
  select s.enabled into v_enabled
    from public.radio_series_state s where s.series = v_series;
  v_enabled := coalesce(v_enabled, false);

  select coalesce(max(m.id), 0) into v_max
    from public.radio_messages m where m.series = v_series;

  -- First call, or switched off: nothing to show, jump to the newest id.
  if p_after is null or not v_enabled then
    return jsonb_build_object('ok', true, 'enabled', v_enabled,
                              'cursor', v_max, 'messages', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(x.msg order by x.id), '[]'::jsonb), max(x.id)
    into v_msgs, v_cursor
    from (
      select m.id,
             jsonb_build_object(
               'id', m.id,
               'age_ms', floor(extract(epoch from (now() - m.created_at)) * 1000)::bigint,
               'payload', m.payload) as msg
        from public.radio_messages m
       where m.series = v_series
         and m.id > p_after
         and m.created_at > now() - interval '2 minutes'
       order by m.id
       limit 10
    ) x;

  -- If fewer than 10 came back there is nothing newer left, so skip to the end.
  if jsonb_array_length(v_msgs) < 10 then
    v_cursor := greatest(coalesce(v_cursor, 0), v_max);
  end if;

  return jsonb_build_object('ok', true, 'enabled', true,
                            'cursor', greatest(coalesce(v_cursor, p_after), p_after),
                            'messages', v_msgs);
end;
$$;

-- A logged-in league member sends a message.
-- Re-authorise and rebuild identity on the server. Public RPC callers cannot
-- impersonate another driver/TP by changing a name, colour or sender field.
create or replace function public.radio_send(p_token text, p_series text, p_payload jsonb)
returns jsonb language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
 v_status integer; v_content text; v_authorised jsonb; v_clean jsonb;
 v_series text := public.radio_norm_series(p_series); v_id bigint; v_created timestamptz;
begin
 if p_token is null or length(p_token)<8 or length(p_token)>512 then return jsonb_build_object('ok',false,'error','unauthorized'); end if;
 begin
  perform http_set_curlopt('CURLOPT_TIMEOUT_MS','8000');
  select r.status,r.content into v_status,v_content from http_post(
   'https://jocmjietuviegelluiev.supabase.co/functions/v1/api',
   jsonb_build_object('action','radioPrepare','token',p_token,'request',p_payload)::text,'application/json') r;
  v_authorised:=v_content::jsonb;
 exception when others then return jsonb_build_object('ok',false,'error','auth_unavailable'); end;
 if v_status<>200 or v_authorised->>'ok' is distinct from 'true' then return coalesce(v_authorised,jsonb_build_object('ok',false,'error','unauthorized')); end if;
 if v_authorised->>'series' is distinct from v_series then return jsonb_build_object('ok',false,'error','invalid_race'); end if;
 if not coalesce((select enabled from radio_series_state where series=v_series),false) then return jsonb_build_object('ok',false,'error','radio_off'); end if;
 begin v_clean:=public.radio_clean_payload(v_authorised->'payload');
 exception when others then return jsonb_build_object('ok',false,'error','bad_payload'); end;
 -- Serialize a user's send limit so parallel requests cannot bypass it.
 perform pg_advisory_xact_lock(hashtext('radio:'||(v_authorised->>'username')));
 if exists(select 1 from radio_messages where sender_username=v_authorised->>'username' and created_at>now()-interval '10 seconds') then return jsonb_build_object('ok',false,'error','too_fast'); end if;
 insert into radio_messages(series,sender_username,sender_role,sender_name,driver_id,team_id,race_id,session_type,lap,lap_source,payload)
 values(v_series,v_authorised->>'username',v_authorised->>'role',v_authorised->>'senderName',
 (v_authorised->>'driverId')::bigint,(v_authorised->>'teamId')::bigint,(v_authorised->>'raceId')::bigint,
 v_authorised->>'session',(v_authorised->>'lap')::integer,case when v_authorised->>'lap' is null then 'unknown' else 'sender' end,v_clean)
 returning id,created_at into v_id,v_created;
 -- Do not delete race radio after 24 hours: these rows are the race archive.
 return jsonb_build_object('ok',true,'id',v_id,'createdAt',v_created,'raceId',v_authorised->'raceId','lap',v_authorised->'lap');
end;
$$;

create or replace function public.radio_set_enabled(p_token text, p_series text, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_series text := public.radio_norm_series(p_series);
  v_user   jsonb;
begin
  if v_series = '' or length(v_series) > 16 or p_enabled is null then
    return jsonb_build_object('ok', false, 'error', 'bad_series');
  end if;

  v_user := public.radio_check_session(p_token);
  if not (v_user ->> 'ok')::boolean then
    return v_user;
  end if;

  if not (
       v_user ->> 'role' = 'admin'
    or (v_user ->> 'role' = 'seriesrunner'
        and public.radio_norm_series(v_user ->> 'series') = v_series)
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.radio_series_state (series, enabled, updated_by, updated_at)
  values (v_series, p_enabled, v_user ->> 'username', now())
  on conflict (series) do update
    set enabled = excluded.enabled,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true, 'series', v_series, 'enabled', p_enabled);
end;
$$;

-- ------------------------------------------------------------ permissions ---

revoke all on function public.radio_norm_series(text)                from public, anon, authenticated;
revoke all on function public.radio_clean_text(text)                 from public, anon, authenticated;
revoke all on function public.radio_check_session(text)              from public, anon, authenticated;
revoke all on function public.radio_clean_payload(jsonb)             from public, anon, authenticated;
revoke all on function public.radio_status(text)                     from public;
revoke all on function public.radio_poll(text, bigint)               from public;
revoke all on function public.radio_send(text, text, jsonb)          from public;
revoke all on function public.radio_set_enabled(text, text, boolean) from public;

grant execute on function public.radio_status(text)                     to anon, authenticated;
grant execute on function public.radio_poll(text, bigint)               to anon, authenticated;
grant execute on function public.radio_send(text, text, jsonb)          to anon, authenticated;
grant execute on function public.radio_set_enabled(text, text, boolean) to anon, authenticated;

-- Make the API notice the new functions straight away.
notify pgrst, 'reload schema';

-- Quick check: should print one row, {"ok": true, "series": "F1", "enabled": false}
select public.radio_status('F1') as radio_install_check;

-- ============================================================================
-- TO REMOVE EVERYTHING, run the lines below (without the leading "-- "):
--
-- drop function if exists public.radio_set_enabled(text, text, boolean);
-- drop function if exists public.radio_send(text, text, jsonb);
-- drop function if exists public.radio_poll(text, bigint);
-- drop function if exists public.radio_status(text);
-- drop function if exists public.radio_clean_payload(jsonb);
-- drop function if exists public.radio_check_session(text);
-- drop function if exists public.radio_clean_text(text);
-- drop function if exists public.radio_norm_series(text);
-- drop table if exists public.radio_messages;
-- drop table if exists public.radio_series_state;
-- notify pgrst, 'reload schema';
-- (the "http" extension is left installed; remove it with
--  "drop extension http;" only if nothing else uses it)
-- ============================================================================
