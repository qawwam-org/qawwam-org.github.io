-- =====================================================================
-- qawwam · akaun, tempahan dan fail pelanggan (Supabase)
-- Jalankan sekali di Supabase → SQL Editor. Selamat dijalankan semula.
--
-- Apa yang dibina:
--   public.profil     satu baris untuk setiap akaun (nama pengguna, e-mel pilihan, peranan)
--   public.tempahan   pesanan kad: draf → dihantar → diproses → siap (atau batal)
--   storage 'tempahan' fail pelanggan (lagu, gambar galeri, QR DuitNow), peribadi
--
-- Keselamatan (RLS):
--   - Pelanggan hanya nampak dan ubah tempahan mereka sendiri, dan hanya semasa status 'draf'.
--     Selepas mereka sahkan ('dihantar'), hanya admin boleh mengubahnya.
--   - Harga akhir, pautan kad, kadId dan nota admin hanya boleh ditulis oleh admin.
--   - Admin = profil.peranan = 'admin'. Peranan hanya boleh ditukar di SQL Editor, bukan dari laman.
--   - Fail disimpan di folder <id pengguna>/<id tempahan>/..., hanya pemilik dan admin boleh baca.
--     Admin juga boleh muat naik ke folder pelanggan (cth lagu yang pelanggan minta).
--
-- Selepas menjalankan fail ini, lihat README.md bahagian "Akaun admin".
-- =====================================================================

-- ---------- 1. Profil ----------
create table if not exists public.profil (
  id            uuid primary key references auth.users (id) on delete cascade,
  nama_pengguna text not null unique check (nama_pengguna ~ '^[a-z0-9_.]{3,24}$'),
  nama          text check (char_length(nama) <= 80),
  emel          text check (char_length(emel) <= 120),
  telefon       text check (char_length(telefon) <= 20),
  peranan       text not null default 'pelanggan' check (peranan in ('pelanggan', 'admin')),
  dicipta       timestamptz not null default now()
);
alter table public.profil enable row level security;

-- admin check used by every policy below (security definer, so it can read profil under RLS)
create or replace function public.ialah_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profil where id = auth.uid() and peranan = 'admin');
$$;

-- A new auth user gets a profile. Username/password accounts sign in as <nama>@<SHOP.akaunDomain>,
-- so the username is the part of the e-mail before "@". Google accounts get one from their Gmail.
create or replace function public.profil_baharu() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  google boolean := coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google';
  asas  text;
  calon text;
  n     int := 0;
begin
  asas := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_.]', '', 'g'), 18);
  if char_length(asas) < 3 then asas := 'pengguna'; end if;
  calon := asas;
  while exists (select 1 from public.profil where nama_pengguna = calon) loop
    n := n + 1;
    if n > 30 then raise exception 'Tidak dapat mencipta nama pengguna'; end if;
    calon := left(asas, 18) || floor(random() * 9000 + 1000)::int::text;
  end loop;
  insert into public.profil (id, nama_pengguna, nama, emel)
  values (
    new.id, calon,
    nullif(left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 80), ''),
    -- optional real e-mail typed at sign-up; Google accounts use their Gmail
    nullif(left(case when google then coalesce(new.email, '') else coalesce(meta ->> 'emel', '') end, 120), '')
  );
  return new;
end $$;

drop trigger if exists profil_baharu on auth.users;
create trigger profil_baharu after insert on auth.users
  for each row execute function public.profil_baharu();

-- the sign-up form checks a username before creating the account
create or replace function public.nama_pengguna_bebas(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profil where nama_pengguna = lower(trim(p)));
$$;

drop policy if exists "profil: baca sendiri" on public.profil;
drop policy if exists "profil: ubah sendiri" on public.profil;
drop policy if exists "profil: admin" on public.profil;
create policy "profil: baca sendiri" on public.profil for select to authenticated
  using (id = (select auth.uid()) or (select public.ialah_admin()));
create policy "profil: ubah sendiri" on public.profil for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profil: admin" on public.profil for all to authenticated
  using ((select public.ialah_admin())) with check ((select public.ialah_admin()));

-- customers may only change their own contact details, never their username or role
revoke all on public.profil from anon, authenticated;
grant select on public.profil to authenticated;
grant update (nama, emel, telefon) on public.profil to authenticated;

-- ---------- 2. Tempahan ----------
create table if not exists public.tempahan (
  id          uuid primary key default gen_random_uuid(),
  kod         text not null unique,
  pemilik     uuid not null default auth.uid() references public.profil (id) on delete cascade,
  status      text not null default 'draf' check (status in ('draf', 'dihantar', 'diproses', 'siap', 'batal')),
  pakej       text not null check (char_length(pakej) <= 20),
  tema        text not null check (char_length(tema) <= 40),
  borang      jsonb not null default '{}'::jsonb check (pg_column_size(borang) < 60000),  -- the form as typed
  config      jsonb check (pg_column_size(config) < 60000),                             -- the card's CONFIG
  fail        jsonb not null default '{}'::jsonb check (pg_column_size(fail) < 8000),     -- storage paths
  telefon     text check (char_length(telefon) <= 20),
  harga       text check (char_length(harga) <= 20),         -- final price, set by admin
  pautan      text check (char_length(pautan) <= 300),       -- published card link, set by admin
  kad_id      text check (char_length(kad_id) <= 60),        -- RSVP kadId, set by admin
  nota_admin  text check (char_length(nota_admin) <= 2000),
  dicipta     timestamptz not null default now(),
  dihantar    timestamptz,
  dikemaskini timestamptz not null default now()
);
create index if not exists tempahan_pemilik on public.tempahan (pemilik, dicipta desc);
create index if not exists tempahan_status on public.tempahan (status, dikemaskini desc);
alter table public.tempahan enable row level security;

create or replace function public.tempahan_jaga() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  admin boolean := public.ialah_admin();
  abjad constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  k text;
  i int;
begin
  if tg_op = 'INSERT' then
    if not admin then
      if auth.uid() is null then raise exception 'Log masuk dahulu'; end if;
      new.pemilik := auth.uid();
      new.status := 'draf';
      new.harga := null; new.pautan := null; new.kad_id := null; new.nota_admin := null; new.dihantar := null;
      if (select count(*) from public.tempahan where pemilik = auth.uid() and status = 'draf') >= 10 then
        raise exception 'Terlalu banyak draf. Padam draf lama dahulu.';
      end if;
    end if;
    loop
      k := 'QW-';
      for i in 1..6 loop k := k || substr(abjad, 1 + floor(random() * length(abjad))::int, 1); end loop;
      exit when not exists (select 1 from public.tempahan where kod = k);
    end loop;
    new.kod := k;
    new.dicipta := now();
  else
    new.id := old.id; new.kod := old.kod; new.dicipta := old.dicipta;
    if not admin then
      new.pemilik := old.pemilik;
      new.harga := old.harga; new.pautan := old.pautan; new.kad_id := old.kad_id; new.nota_admin := old.nota_admin;
    end if;
  end if;
  if new.status = 'dihantar' and (tg_op = 'INSERT' or old.status = 'draf') then new.dihantar := now(); end if;
  if new.status = 'draf' then new.dihantar := null; end if;
  new.dikemaskini := now();
  return new;
end $$;

drop trigger if exists tempahan_jaga on public.tempahan;
create trigger tempahan_jaga before insert or update on public.tempahan
  for each row execute function public.tempahan_jaga();

drop policy if exists "tempahan: baca" on public.tempahan;
drop policy if exists "tempahan: cipta draf" on public.tempahan;
drop policy if exists "tempahan: ubah draf" on public.tempahan;
drop policy if exists "tempahan: padam draf" on public.tempahan;
drop policy if exists "tempahan: admin" on public.tempahan;
create policy "tempahan: baca" on public.tempahan for select to authenticated
  using (pemilik = (select auth.uid()) or (select public.ialah_admin()));
create policy "tempahan: cipta draf" on public.tempahan for insert to authenticated
  with check (pemilik = (select auth.uid()) and status = 'draf');
-- a customer edits a draft, and confirms it by moving it to 'dihantar'; after that it is locked for them
create policy "tempahan: ubah draf" on public.tempahan for update to authenticated
  using (pemilik = (select auth.uid()) and status = 'draf')
  with check (pemilik = (select auth.uid()) and status in ('draf', 'dihantar'));
create policy "tempahan: padam draf" on public.tempahan for delete to authenticated
  using (pemilik = (select auth.uid()) and status = 'draf');
create policy "tempahan: admin" on public.tempahan for all to authenticated
  using ((select public.ialah_admin())) with check ((select public.ialah_admin()));

revoke all on public.tempahan from anon, authenticated;
grant select, insert, update, delete on public.tempahan to authenticated;

revoke execute on function public.ialah_admin() from public, anon;
revoke execute on function public.profil_baharu() from public, anon, authenticated;
revoke execute on function public.tempahan_jaga() from public, anon, authenticated;
grant execute on function public.ialah_admin() to authenticated;
grant execute on function public.nama_pengguna_bebas(text) to anon, authenticated;

-- ---------- 3. Fail pelanggan (Storage) ----------
-- private bucket, 10 MB per file: JPEG/PNG/WebP photos and MP3 songs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tempahan', 'tempahan', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp3'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tempahan fail: muat naik" on storage.objects;
drop policy if exists "tempahan fail: baca" on storage.objects;
drop policy if exists "tempahan fail: ganti" on storage.objects;
drop policy if exists "tempahan fail: padam" on storage.objects;
create policy "tempahan fail: muat naik" on storage.objects for insert to authenticated
  with check (bucket_id = 'tempahan' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.ialah_admin())));
create policy "tempahan fail: baca" on storage.objects for select to authenticated
  using (bucket_id = 'tempahan' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.ialah_admin())));
create policy "tempahan fail: ganti" on storage.objects for update to authenticated
  using (bucket_id = 'tempahan' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.ialah_admin())))
  with check (bucket_id = 'tempahan' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.ialah_admin())));
create policy "tempahan fail: padam" on storage.objects for delete to authenticated
  using (bucket_id = 'tempahan' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.ialah_admin())));

-- ---------- 4. Jadikan akaun anda admin (jalankan SEKALI selepas mencipta akaun admin) ----------
-- Tukar e-mel log masuk di bawah (nama pengguna + "@" + SHOP.akaunDomain), kemudian jalankan baris ini sahaja:
-- update public.profil set peranan = 'admin' where id = (select id from auth.users where email = 'danial@qawwam-org.github.io');
