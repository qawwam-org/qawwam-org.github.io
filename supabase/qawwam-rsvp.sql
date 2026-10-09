-- =====================================================================
-- qawwam · RSVP dan buku tetamu untuk semua kad (Supabase)
-- Jalankan sekali di Supabase → SQL Editor, SEBELUM qawwam-akaun.sql. Selamat dijalankan semula.
-- (Fail ini menggantikan supabase-setup.sql dan premium-setup.sql yang lama.)
--
-- Apa yang dibina:
--   public.kad             satu baris bagi setiap kad yang diterbitkan (kadId, nama pasangan,
--                          ID pemilik dalam bentuk hash, pakej basic/premium)
--   public.rsvp            jawapan tetamu: satu jawapan bagi setiap telefon, boleh dikemas kini
--   public.ucapan          buku tetamu (kad Premium sahaja); pemilik boleh sembunyi ucapan
--   public.cubaan_pemilik  cubaan ID pemilik yang salah (kunci 15 minit selepas 10 cubaan)
--
-- Fungsi yang kad panggil (kunci anon awam):
--   hantar_rsvp, lihat_rsvp, hantar_ucapan, lihat_ucapan, urus_ucapan
-- Fungsi admin (SQL Editor sahaja, disekat untuk anon dan pengguna log masuk):
--   daftar_kad_baharu('kad-id', 'A & B')  → pulangkan ID pemilik QW-XXXX-XXXX (sekali sahaja)
--   set_semula_kod('kad-id')              → ID pemilik baharu (ID lama tidak berfungsi lagi)
--
-- Keselamatan:
--   - Semua jadual dikunci (RLS hidup, tiada polisi, tiada hak jadual untuk anon/authenticated).
--     Tetamu hanya boleh memanggil lima fungsi di atas.
--   - ID pemilik disimpan sebagai hash bcrypt; ia tidak pernah muncul dalam kod kad.
--   - 10 ID salah dalam 15 minit mengunci semakan pemilik kad itu selama 15 minit.
--   - Had jawapan RSVP: Basic 300, Premium 3,000 bagi setiap kad (perlindungan spam).
--     Had ucapan buku tetamu: 3,000 bagi setiap kad.
--   - Nama 2–80 aksara, ucapan ≤ 300 aksara, bilangan tetamu 1–20 (0 jika tidak hadir).
--
-- Setiap tempahan (halaman Admin memaparkan SQL ini siap diisi):
--   select public.daftar_kad_baharu('sarah-aiman-1212', 'Sarah & Aiman');
--   update public.kad set pakej = 'premium' where kad_id = 'sarah-aiman-1212';  -- Premium sahaja
-- ID hilang:      select public.set_semula_kod('sarah-aiman-1212');
-- Padam kad:      delete from public.kad where kad_id = 'sarah-aiman-1212';  (jawapan & ucapan ikut terpadam)
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- An older copy of the RSVP setup used different column names; stop with a clear message
-- instead of half-installing on top of it.
do $$
begin
  if to_regclass('public.kad') is not null and not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'kad' and column_name = 'kod_hash') then
    raise exception 'Jadual public.kad daripada versi lama wujud. Hubungi kami sebelum menjalankan fail ini (data lama perlu dipindahkan).';
  end if;
end $$;

-- ---------- 1. Jadual ----------
create table if not exists public.kad (
  kad_id    text primary key check (kad_id ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
  pasangan  text not null check (char_length(pasangan) between 1 and 120),
  kod_hash  text not null,
  pakej     text not null default 'basic' check (pakej in ('basic', 'premium')),
  dicipta   timestamptz not null default now()
);

create table if not exists public.rsvp (
  id       bigint generated always as identity primary key,
  kad_id   text not null references public.kad (kad_id) on delete cascade,
  peranti  text not null check (char_length(peranti) between 8 and 80),
  nama     text not null check (char_length(nama) between 2 and 80),
  hadir    boolean not null,
  pax      smallint not null check (pax between 0 and 20),
  ucapan   text not null default '' check (char_length(ucapan) <= 300),
  masa     timestamptz not null default now(),
  unique (kad_id, peranti)
);
create index if not exists rsvp_kad_masa on public.rsvp (kad_id, masa desc);

create table if not exists public.ucapan (
  id           bigint generated always as identity primary key,
  kad_id       text not null references public.kad (kad_id) on delete cascade,
  peranti      text not null check (char_length(peranti) between 8 and 80),
  nama         text not null check (char_length(nama) between 2 and 80),
  mesej        text not null check (char_length(mesej) between 1 and 300),
  sembunyi     boolean not null default false,
  masa         timestamptz not null default now(),
  dikemaskini  timestamptz,
  unique (kad_id, peranti)
);
create index if not exists ucapan_kad_masa on public.ucapan (kad_id, masa desc);

create table if not exists public.cubaan_pemilik (
  id      bigint generated always as identity primary key,
  kad_id  text not null references public.kad (kad_id) on delete cascade,
  masa    timestamptz not null default now()
);
create index if not exists cubaan_kad_masa on public.cubaan_pemilik (kad_id, masa);

alter table public.kad            enable row level security;
alter table public.rsvp           enable row level security;
alter table public.ucapan         enable row level security;
alter table public.cubaan_pemilik enable row level security;
revoke all on public.kad, public.rsvp, public.ucapan, public.cubaan_pemilik from anon, authenticated;

-- ---------- 2. Fungsi dalaman ----------
-- Remove any earlier versions first, so the website never sees two functions with one name.
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('hantar_rsvp', 'lihat_rsvp', 'hantar_ucapan', 'lihat_ucapan',
             'urus_ucapan', 'daftar_kad_baharu', 'set_semula_kod', 'kod_pemilik_baharu', 'semak_pemilik', 'normal_kod')
  loop
    execute 'drop function ' || f;
  end loop;
end $$;

-- 'qw-7k2p 9xrt' → 'QW-7K2P-9XRT'; anything else → null
create function public.normal_kod(p_kod text) returns text
language sql immutable set search_path = '' as $$
  select case when m is null then null else 'QW-' || m[1] || '-' || m[2] end
  from (select regexp_match(upper(regexp_replace(coalesce(p_kod, ''), '\s', '', 'g')),
                            '^QW-?([A-Z0-9]{4})-?([A-Z0-9]{4})$') as m) x;
$$;

-- 8 random characters from 32 easy-to-read ones (no 0/O, 1/I): about 1 trillion IDs
create function public.kod_pemilik_baharu() returns text
language plpgsql volatile set search_path = '' as $$
declare
  abjad constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := extensions.gen_random_bytes(8);
  s text := '';
begin
  for i in 0..7 loop
    s := s || substr(abjad, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return 'QW-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
end $$;

-- owner check shared by the RSVP panel and the guestbook: 'ok' | 'kod' | 'sekat'
create function public.semak_pemilik(p_kad text, p_kod text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  h text;
  k text := public.normal_kod(p_kod);
begin
  select kod_hash into h from public.kad where kad_id = p_kad;
  if h is null then return 'kod'; end if;   -- unknown card: same answer as a wrong ID
  if (select count(*) from public.cubaan_pemilik
      where kad_id = p_kad and masa > now() - interval '15 minutes') >= 10 then
    return 'sekat';
  end if;
  if k is not null and extensions.crypt(k, h) = h then
    return 'ok';
  end if;
  insert into public.cubaan_pemilik (kad_id) values (p_kad);
  delete from public.cubaan_pemilik where masa < now() - interval '1 day';
  return 'kod';
end $$;

-- ---------- 3. Fungsi admin (SQL Editor sahaja) ----------
create function public.daftar_kad_baharu(p_kad text, p_pasangan text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  k text := public.kod_pemilik_baharu();
  slug text := lower(trim(p_kad));
begin
  if slug is null or slug !~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$' then
    raise exception 'kadId "%" tidak sah: guna huruf kecil, nombor dan sengkang sahaja (3–60 aksara), cth sarah-aiman-1212.', p_kad;
  end if;
  if exists (select 1 from public.kad where kad_id = slug) then
    raise exception 'Kad % sudah didaftarkan. Untuk ID pemilik baharu: select public.set_semula_kod(''%'');', slug, slug;
  end if;
  insert into public.kad (kad_id, pasangan, kod_hash)
  values (slug, trim(p_pasangan), extensions.crypt(k, extensions.gen_salt('bf', 8)));
  return k;
end $$;

create function public.set_semula_kod(p_kad text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  k text := public.kod_pemilik_baharu();
begin
  update public.kad set kod_hash = extensions.crypt(k, extensions.gen_salt('bf', 8)) where kad_id = lower(trim(p_kad));
  if not found then raise exception 'Kad % tidak dijumpai.', p_kad; end if;
  delete from public.cubaan_pemilik where kad_id = lower(trim(p_kad));
  return k;
end $$;

-- ---------- 4. Fungsi yang kad panggil ----------
-- Guest RSVP. One reply per phone (p_peranti); sending again updates it.
-- Returns {ok:true} or {ok:false, sebab: 'kad' | 'penuh' | 'data'}
create function public.hantar_rsvp(p_kad text, p_peranti text, p_nama text, p_hadir boolean, p_pax integer, p_ucapan text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  nm  text := regexp_replace(trim(coalesce(p_nama, '')), '\s+', ' ', 'g');
  uc  text := trim(coalesce(p_ucapan, ''));
  pk  text;
  had integer;
begin
  if p_hadir is null or char_length(nm) not between 2 and 80 or char_length(uc) > 300
     or char_length(coalesce(p_peranti, '')) not between 8 and 80
     or (p_hadir and coalesce(p_pax, 0) not between 1 and 20) then
    return json_build_object('ok', false, 'sebab', 'data');
  end if;
  select pakej into pk from public.kad where kad_id = p_kad;
  if pk is null then return json_build_object('ok', false, 'sebab', 'kad'); end if;
  had := case pk when 'premium' then 3000 else 300 end;
  if not exists (select 1 from public.rsvp where kad_id = p_kad and peranti = p_peranti)
     and (select count(*) from public.rsvp where kad_id = p_kad) >= had then
    return json_build_object('ok', false, 'sebab', 'penuh');
  end if;
  insert into public.rsvp (kad_id, peranti, nama, hadir, pax, ucapan)
  values (p_kad, p_peranti, nm, p_hadir, case when p_hadir then p_pax else 0 end, uc)
  on conflict (kad_id, peranti) do update
    set nama = excluded.nama, hadir = excluded.hadir, pax = excluded.pax, ucapan = excluded.ucapan, masa = now();
  return json_build_object('ok', true);
end $$;

-- Owner RSVP list. Returns {ok:true, pasangan, senarai:[{nama,hadir,pax,ucapan,masa}]}
-- or {ok:false, sebab: 'kod' | 'sekat'}
create function public.lihat_rsvp(p_kad text, p_kod text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  s text := public.semak_pemilik(p_kad, p_kod);
begin
  if s <> 'ok' then return json_build_object('ok', false, 'sebab', s); end if;
  return json_build_object(
    'ok', true,
    'pasangan', (select pasangan from public.kad where kad_id = p_kad),
    'senarai', coalesce((select json_agg(json_build_object('nama', nama, 'hadir', hadir, 'pax', pax, 'ucapan', ucapan, 'masa', masa)
                                         order by masa desc)
                         from public.rsvp where kad_id = p_kad), '[]'::json));
end $$;

-- Guestbook wish (Premium cards). One per phone; sending again edits it and keeps a hidden wish hidden.
-- Returns {ok:true, baru} or {ok:false, sebab: 'kad' | 'penuh' | 'data'}
create function public.hantar_ucapan(p_kad text, p_peranti text, p_nama text, p_mesej text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  nm text := regexp_replace(trim(coalesce(p_nama, '')), '\s+', ' ', 'g');
  ms text := trim(coalesce(p_mesej, ''));
  baru boolean;
begin
  if not exists (select 1 from public.kad where kad_id = p_kad and pakej = 'premium') then
    return json_build_object('ok', false, 'sebab', 'kad');
  end if;
  if char_length(nm) not between 2 and 80 or char_length(ms) not between 1 and 300
     or char_length(coalesce(p_peranti, '')) not between 8 and 80 then
    return json_build_object('ok', false, 'sebab', 'data');
  end if;
  if not exists (select 1 from public.ucapan where kad_id = p_kad and peranti = p_peranti)
     and (select count(*) from public.ucapan where kad_id = p_kad) >= 3000 then
    return json_build_object('ok', false, 'sebab', 'penuh');
  end if;
  insert into public.ucapan (kad_id, peranti, nama, mesej)
  values (p_kad, p_peranti, nm, ms)
  on conflict (kad_id, peranti) do update
    set nama = excluded.nama, mesej = excluded.mesej, dikemaskini = now()
  returning (xmax = 0) into baru;
  return json_build_object('ok', true, 'baru', baru);
end $$;

-- Guestbook wall. Guests (p_kod null) see visible wishes; the owner (correct p_kod) sees all, with sembunyi.
-- Returns {ok:true, pemilik, jumlah, senarai:[{id,nama,mesej,masa,sembunyi}]} or {ok:false, sebab: 'kad'|'kod'|'sekat'}
create function public.lihat_ucapan(p_kad text, p_had integer, p_kod text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  pemilik boolean := false;
  s text;
  n integer := least(greatest(coalesce(p_had, 120), 1), 500);
begin
  if not exists (select 1 from public.kad where kad_id = p_kad and pakej = 'premium') then
    return json_build_object('ok', false, 'sebab', 'kad');
  end if;
  if nullif(trim(coalesce(p_kod, '')), '') is not null then
    s := public.semak_pemilik(p_kad, p_kod);
    if s <> 'ok' then return json_build_object('ok', false, 'sebab', s); end if;
    pemilik := true;
  end if;
  return json_build_object(
    'ok', true,
    'pemilik', pemilik,
    'jumlah', (select count(*) from public.ucapan where kad_id = p_kad and (pemilik or not sembunyi)),
    'senarai', coalesce((select json_agg(json_build_object('id', id, 'nama', nama, 'mesej', mesej, 'masa', masa, 'sembunyi', sembunyi)
                                         order by masa desc)
                         from (select * from public.ucapan where kad_id = p_kad and (pemilik or not sembunyi)
                               order by masa desc limit n) u), '[]'::json));
end $$;

-- Owner hides or shows one wish. Returns {ok:true} or {ok:false, sebab: 'kod' | 'sekat' | 'tiada'}
create function public.urus_ucapan(p_kad text, p_kod text, p_id bigint, p_sembunyi boolean)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  s text := public.semak_pemilik(p_kad, p_kod);
begin
  if s <> 'ok' then return json_build_object('ok', false, 'sebab', s); end if;
  update public.ucapan set sembunyi = coalesce(p_sembunyi, false) where id = p_id and kad_id = p_kad;
  if not found then return json_build_object('ok', false, 'sebab', 'tiada'); end if;
  return json_build_object('ok', true);
end $$;

-- ---------- 5. Siapa boleh panggil apa ----------
revoke all on function public.normal_kod(text), public.kod_pemilik_baharu(), public.semak_pemilik(text, text),
  public.daftar_kad_baharu(text, text), public.set_semula_kod(text),
  public.hantar_rsvp(text, text, text, boolean, integer, text), public.lihat_rsvp(text, text),
  public.hantar_ucapan(text, text, text, text), public.lihat_ucapan(text, integer, text),
  public.urus_ucapan(text, text, bigint, boolean)
  from public, anon, authenticated;
grant execute on function
  public.hantar_rsvp(text, text, text, boolean, integer, text), public.lihat_rsvp(text, text),
  public.hantar_ucapan(text, text, text, text), public.lihat_ucapan(text, integer, text),
  public.urus_ucapan(text, text, bigint, boolean)
  to anon, authenticated;
