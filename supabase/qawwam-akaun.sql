-- =====================================================================
-- qawwam · accounts, guest checkout, orders and customer files (Supabase)
-- Run in Supabase → SQL Editor. Safe to run again (it updates an existing setup in place).
--
-- What it builds:
--   public.profil        one row per account (username, name, email, phone, role)
--   public.harga_kad     the price of every card (the Admin page edits it; everyone can read it)
--   public.pautan_bayar  Stripe Payment Links per price (only used when Stripe Checkout is off)
--   public.tetapan       shop settings everyone can read: payment QR code and bank-transfer details
--   public.tempahan      card orders: draf → dihantar → diproses → siap (or batal)
--   public.tuntutan      one-time codes that move a guest's order into an existing account
--   storage 'tempahan'   customer files (song, gallery photos, DuitNow QR, payment receipt), private
--
-- Who can do what (enforced here, not by the website):
--   - Designing needs nothing. Submitting an order needs a session: a password account, a Google
--     account, or a GUEST session (Supabase anonymous sign-in, turned on in Authentication → Sign In /
--     Providers → "Allow anonymous sign-ins"). No password is needed to order and pay.
--   - Confirming an order (paying) needs the customer's name, email and WhatsApp number.
--   - A guest session can only see its order while checking out: drafts, and orders confirmed in
--     the last 24 hours. Checking an order's status later, and RSVPs, need a password account.
--   - Customers see and change only their own orders, and only while they're drafts.
--   - The amount to pay comes from harga_kad, never from the browser.
--   - The card link, kadId, admin note and "paid" status are written only by the admin (or the
--     qawwam-bayar payment function). A Shopee order number or payment reference works for one order only.
--   - Paying by QR code / bank transfer needs a payment reference AND a receipt (image or PDF) uploaded
--     into that order's private folder; the admin checks both before marking the order paid.
--   - Admin = profil.peranan = 'admin', which can only be changed here in the SQL Editor.
--   - Files are stored at <user id>/<order id>/...; only the order's owner and the admin can read them.
--
-- After running this file, see README.md section "Admin account".
-- =====================================================================

-- ---------- 1. Profiles ----------
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

-- true for a guest checkout session (Supabase anonymous sign-in: no email, no password)
create or replace function public.ialah_tetamu() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'is_anonymous')::boolean, false);
$$;

-- A new auth user gets a profile. Username/password accounts sign in as <name>@<SHOP.akaunDomain>,
-- so the username is the part of the email before "@". Google accounts get one from their Gmail.
-- Guest (anonymous) sessions get "tetamu_" plus part of their id.
create or replace function public.profil_baharu() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  google boolean := coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google';
  tetamu boolean := coalesce((to_jsonb(new) ->> 'is_anonymous')::boolean, false);
  asas   text;
  calon  text;
  n      int := 0;
begin
  if tetamu then
    asas := 'tetamu_' || left(replace(new.id::text, '-', ''), 12);
  else
    asas := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_.]', '', 'g'), 18);
    if char_length(asas) < 3 then asas := 'pengguna'; end if;
  end if;
  calon := asas;
  while exists (select 1 from public.profil where nama_pengguna = calon) loop
    n := n + 1;
    if n > 30 then raise exception 'Could not create a username'; end if;
    calon := left(asas, 18) || floor(random() * 9000 + 1000)::int::text;
  end loop;
  insert into public.profil (id, nama_pengguna, nama, emel)
  values (
    new.id, calon,
    nullif(left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 80), ''),
    -- optional real email typed at sign-up; Google accounts use their Gmail
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

-- ---------- 2. Card prices ----------
-- One row per card. The Admin page edits these; the order trigger below reads them, so the amount a
-- customer pays always comes from here. A new card must have a row before it can be ordered
-- (pressing "Save prices" on the Admin page adds any missing cards).
create table if not exists public.harga_kad (
  tema        text primary key check (tema ~ '^[a-z0-9-]{2,40}$'),
  jenis       text not null check (jenis in ('flip', 'basic', 'premium')),
  harga       numeric(8,2) not null check (harga > 0 and harga < 10000),
  dikemaskini timestamptz not null default now()
);
alter table public.harga_kad enable row level security;
insert into public.harga_kad (tema, jenis, harga) values
  ('flip-gading', 'flip', 4.90),
  ('flip-zamrud', 'flip', 4.90),
  ('flip-mawar', 'flip', 4.90),
  ('flip-nila', 'flip', 4.90),
  -- Flip versions of every Basic and Premium design (Oct 2026): RM4.90 from Basic, RM9.90 from Premium
  ('kf-zamrud', 'flip', 4.90),
  ('kf-batik', 'flip', 4.90),
  ('kf-royal-vow', 'flip', 4.90),
  ('kf-adat-perpatih', 'flip', 4.90),
  ('kf-sakinah', 'flip', 4.90),
  ('kf-qamar', 'flip', 4.90),
  ('kf-raudhah', 'flip', 4.90),
  ('kf-farhah', 'flip', 4.90),
  ('kf-minimalist-islamic', 'flip', 4.90),
  ('kf-elegance', 'flip', 4.90),
  ('kf-nirmala-biru', 'flip', 4.90),
  ('kf-vintage', 'flip', 4.90),
  ('kf-modern-minimalist', 'flip', 4.90),
  ('kf-avant-grande', 'flip', 4.90),
  ('kf-rustic-boho', 'flip', 4.90),
  ('kf-my-forever-person', 'flip', 4.90),
  ('kf-cottage-garden', 'flip', 4.90),
  ('kf-siluet-flora', 'flip', 4.90),
  ('kf-horizon', 'flip', 4.90),
  ('kf-gilded-grove', 'flip', 9.90),
  ('kf-sunset-reverie', 'flip', 9.90),
  ('kf-velvet-emerald', 'flip', 9.90),
  ('kf-lavender-whisper', 'flip', 9.90),
  ('kf-ember-noir', 'flip', 9.90),
  ('kf-sage-harbor', 'flip', 9.90),
  ('kf-midnight-amethyst', 'flip', 9.90),
  ('kf-ember-roman', 'flip', 9.90),
  ('kf-nocturne-garden', 'flip', 9.90),
  ('kf-midnight-tide', 'flip', 9.90),
  ('zamrud', 'basic', 8.90),
  ('batik', 'basic', 8.90),
  ('royal-vow', 'basic', 8.90),
  ('adat-perpatih', 'basic', 8.90),
  ('sakinah', 'basic', 8.90),
  ('qamar', 'basic', 8.90),
  ('raudhah', 'basic', 8.90),
  ('farhah', 'basic', 8.90),
  ('minimalist-islamic', 'basic', 8.90),
  ('elegance', 'basic', 8.90),
  ('nirmala-biru', 'basic', 8.90),
  ('vintage', 'basic', 8.90),
  ('modern-minimalist', 'basic', 8.90),
  ('avant-grande', 'basic', 8.90),
  ('rustic-boho', 'basic', 8.90),
  ('my-forever-person', 'basic', 8.90),
  ('cottage-garden', 'basic', 8.90),
  ('siluet-flora', 'basic', 8.90),
  ('horizon', 'basic', 8.90),
  ('gilded-grove', 'premium', 29.90),
  ('sunset-reverie', 'premium', 29.90),
  ('velvet-emerald', 'premium', 29.90),
  ('lavender-whisper', 'premium', 29.90),
  ('ember-noir', 'premium', 29.90),
  ('sage-harbor', 'premium', 29.90),
  ('midnight-amethyst', 'premium', 29.90),
  ('ember-roman', 'premium', 29.90),
  ('nocturne-garden', 'premium', 29.90),
  ('midnight-tide', 'premium', 29.90)
on conflict (tema) do nothing;

drop policy if exists "harga: baca" on public.harga_kad;
drop policy if exists "harga: admin" on public.harga_kad;
create policy "harga: baca" on public.harga_kad for select to anon, authenticated using (true);
create policy "harga: admin" on public.harga_kad for all to authenticated
  using ((select public.ialah_admin())) with check ((select public.ialah_admin()));
revoke all on public.harga_kad from anon, authenticated;
grant select on public.harga_kad to anon, authenticated;
grant insert, update, delete on public.harga_kad to authenticated;

-- Stripe Payment Links: one link per price (e.g. 12.90 -> https://buy.stripe.com/...). Only used when
-- SHOP.stripeCheckout is off. Public read, admin write.
create table if not exists public.pautan_bayar (
  harga       numeric(8,2) primary key check (harga > 0 and harga < 10000),
  url         text not null check (url ~ '^https://[^[:space:]]+$' and char_length(url) <= 300),
  dikemaskini timestamptz not null default now()
);
alter table public.pautan_bayar enable row level security;
drop policy if exists "pautan: baca" on public.pautan_bayar;
drop policy if exists "pautan: admin" on public.pautan_bayar;
create policy "pautan: baca" on public.pautan_bayar for select to anon, authenticated using (true);
create policy "pautan: admin" on public.pautan_bayar for all to authenticated
  using ((select public.ialah_admin())) with check ((select public.ialah_admin()));
revoke all on public.pautan_bayar from anon, authenticated;
grant select on public.pautan_bayar to anon, authenticated;
grant insert, update, delete on public.pautan_bayar to authenticated;

-- ---------- 2b. Shop settings: QR code / bank transfer ----------
-- The admin sets these on Admin → Prices & payments; customers see them when they choose
-- "QR code / bank transfer". Only the admin can write them, so nobody can swap the account number.
--   qr_tng         DuitNow / TNG QR image (data URL)       qr_tng_nama    name shown under the QR
--   bank_nama      bank, e.g. Maybank                       bank_pemegang  account holder
--   bank_akaun     account number
create table if not exists public.tetapan (
  kunci       text primary key,
  nilai       text not null,
  dikemaskini timestamptz not null default now()
);
-- (re)apply the checks, so a database made with an earlier version of this file accepts the bank keys
do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.tetapan'::regclass and contype = 'c' loop
    execute format('alter table public.tetapan drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.tetapan add constraint tetapan_kunci_sah
  check (kunci in ('qr_tng', 'qr_tng_nama', 'bank_nama', 'bank_pemegang', 'bank_akaun'));
alter table public.tetapan add constraint tetapan_nilai_sah check (
  char_length(nilai) <= 400000
  and (kunci <> 'qr_tng' or nilai ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')
  and (kunci not in ('qr_tng_nama', 'bank_pemegang') or char_length(nilai) between 1 and 80)
  and (kunci <> 'bank_nama' or char_length(nilai) between 2 and 60)
  and (kunci <> 'bank_akaun' or nilai ~ '^[0-9][0-9 -]{4,28}[0-9]$'));
alter table public.tetapan enable row level security;
drop policy if exists "tetapan: baca" on public.tetapan;
drop policy if exists "tetapan: admin" on public.tetapan;
create policy "tetapan: baca" on public.tetapan for select to anon, authenticated using (true);
create policy "tetapan: admin" on public.tetapan for all to authenticated
  using ((select public.ialah_admin())) with check ((select public.ialah_admin()));
revoke all on public.tetapan from anon, authenticated;
grant select on public.tetapan to anon, authenticated;
grant insert, update, delete on public.tetapan to authenticated;

-- ---------- 3. Orders ----------
create table if not exists public.tempahan (
  id          uuid primary key default gen_random_uuid(),
  kod         text not null unique,
  pemilik     uuid not null default auth.uid() references public.profil (id) on delete cascade,
  status      text not null default 'draf' check (status in ('draf', 'dihantar', 'diproses', 'siap', 'batal')),
  pakej       text not null check (char_length(pakej) <= 20),
  tema        text not null check (char_length(tema) <= 40),
  borang      jsonb not null default '{}'::jsonb check (pg_column_size(borang) < 60000),  -- the form as typed
  config      jsonb check (pg_column_size(config) < 60000),                             -- the card's CONFIG
  fail        jsonb not null default '{}'::jsonb check (pg_column_size(fail) < 8000),     -- storage paths (lagu, duitnow, galeri[], resit)
  telefon     text check (char_length(telefon) <= 20),
  harga       text check (char_length(harga) <= 20),         -- price as shown, e.g. RM12.90 (from jumlah)
  pautan      text check (char_length(pautan) <= 300),       -- published card link, set by admin
  kad_id      text check (char_length(kad_id) <= 60),        -- RSVP kadId, set by admin
  nota_admin  text check (char_length(nota_admin) <= 2000),
  dicipta     timestamptz not null default now(),
  dihantar    timestamptz,
  dikemaskini timestamptz not null default now()
);
-- columns added by later updates (safe on a database made with an earlier version of this file)
alter table public.tempahan add column if not exists jumlah numeric(8,2) check (jumlah >= 0 and jumlah < 10000);  -- amount to pay
alter table public.tempahan add column if not exists emel text check (char_length(emel) <= 120);              -- customer email
alter table public.tempahan add column if not exists bayaran jsonb not null default '{}'::jsonb check (pg_column_size(bayaran) < 2000);
alter table public.tempahan add column if not exists nama_pelanggan text check (char_length(nama_pelanggan) <= 80);  -- customer name
-- bayaran = { cara: 'online' (Stripe) | 'shopee' | 'qr' (QR code / bank transfer; older orders: 'tng'),
--             shopee: '<Shopee order no.>', rujukan: '<payment reference>', status: 'belum' | 'semak' | 'dibayar',
--             sesi: Stripe Checkout id, stripe: payment id, dibayar_rm, dibayar_pada (set by the qawwam-bayar function) }
create index if not exists tempahan_pemilik on public.tempahan (pemilik, dicipta desc);
create index if not exists tempahan_status on public.tempahan (status, dikemaskini desc);
create index if not exists tempahan_shopee on public.tempahan ((upper(bayaran ->> 'shopee'))) where bayaran ->> 'shopee' is not null;
create index if not exists tempahan_rujukan on public.tempahan ((upper(bayaran ->> 'rujukan'))) where bayaran ->> 'rujukan' is not null;
alter table public.tempahan enable row level security;

create or replace function public.tempahan_jaga() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  -- full rights: the admin, the server (service_role key, e.g. the qawwam-bayar payment function
  -- marking an order paid) and you in the SQL Editor
  admin boolean := public.ialah_admin()
    or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
                nullif(current_setting('request.jwt.claim.role', true), ''),
                current_setting('role', true)) = 'service_role'
    or (session_user in ('postgres', 'supabase_admin') and coalesce(current_setting('role', true), 'none') = 'none');
  -- set only inside tuntut_tempahan(): a guest's order moving into their account (only the owner changes)
  pindah boolean := coalesce(current_setting('qawwam.pindah', true), '') = '1';
  abjad constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  k text;
  i int;
  h numeric;
  j text;
  cara text;
  kodsp text;
  tel text;
begin
  if tg_op = 'UPDATE' and pindah then
    old.pemilik := new.pemilik;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if not admin then
      if auth.uid() is null then raise exception 'Sign in first.'; end if;
      new.pemilik := auth.uid();
      new.status := 'draf';
      new.pautan := null; new.kad_id := null; new.nota_admin := null; new.dihantar := null; new.bayaran := '{}'::jsonb;
      if (select count(*) from public.tempahan where pemilik = auth.uid() and status = 'draf') >= 10 then
        raise exception 'Too many drafts. Delete an old draft first.';
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
      new.pautan := old.pautan; new.kad_id := old.kad_id; new.nota_admin := old.nota_admin;
    end if;
  end if;

  -- the amount comes from the card's price, never from the browser (the admin may set it by hand)
  select hk.harga, hk.jenis into h, j from public.harga_kad hk where hk.tema = new.tema;
  if not found then raise exception 'Card "%" has no price yet. Admin: press Save prices on the Admin page.', new.tema; end if;
  if not admin then
    new.jumlah := h;
    new.pakej := j;
  elsif new.jumlah is null or (tg_op = 'UPDATE' and new.tema is distinct from old.tema and new.jumlah is not distinct from old.jumlah) then
    new.jumlah := h;
  end if;
  new.harga := 'RM' || to_char(new.jumlah, 'FM99990.00');

  -- confirming (paying for) an order needs the customer's name, email and WhatsApp number
  if not admin and new.status = 'dihantar' and (tg_op = 'INSERT' or old.status = 'draf') then
    new.nama_pelanggan := nullif(regexp_replace(trim(coalesce(new.nama_pelanggan, '')), '\s+', ' ', 'g'), '');
    new.emel := nullif(lower(trim(coalesce(new.emel, ''))), '');
    tel := regexp_replace(coalesce(new.telefon, ''), '[^0-9]', '', 'g');
    if tel like '0%' then tel := '6' || tel; elsif tel like '1%' then tel := '60' || tel; end if;
    new.telefon := tel;
    if char_length(coalesce(new.nama_pelanggan, '')) < 2 then raise exception 'Enter your name.'; end if;
    if new.emel is null or new.emel !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then raise exception 'Enter a valid email address.'; end if;
    if tel !~ '^60[0-9]{8,10}$' then raise exception 'Enter a valid WhatsApp number.'; end if;
  end if;

  -- payment: the customer chooses Stripe (online), Shopee, or QR code / bank transfer when confirming;
  -- only the admin (or the payment function) marks it paid
  if not admin then
    cara := case when new.bayaran ->> 'cara' = 'shopee' then 'shopee'
                 when new.bayaran ->> 'cara' in ('qr', 'tng') then 'qr' else 'online' end;
    kodsp := upper(regexp_replace(coalesce(new.bayaran ->> (case when cara = 'qr' then 'rujukan' else 'shopee' end), ''), '[^A-Za-z0-9]', '', 'g'));
    if cara = 'qr' then
      if char_length(kodsp) < 6 or char_length(kodsp) > 40 then raise exception 'Check the payment reference number.'; end if;
      if exists (select 1 from public.tempahan t where upper(t.bayaran ->> 'rujukan') = kodsp and t.id <> new.id and t.status <> 'batal') then
        raise exception 'This payment reference has already been used for another order.';
      end if;
      -- the transfer receipt, uploaded into this order's folder: <owner>/<order>/resit.jpg|png|webp|pdf
      if coalesce(new.fail ->> 'resit', '') !~ ('^' || new.pemilik::text || '/' || new.id::text || '/resit\.(jpg|png|webp|pdf)$')
         or not exists (select 1 from storage.objects o where o.bucket_id = 'tempahan' and o.name = new.fail ->> 'resit') then
        raise exception 'Attach your payment receipt.';
      end if;
      new.bayaran := jsonb_build_object('cara', 'qr', 'rujukan', kodsp, 'status', 'semak');
    elsif cara = 'shopee' then
      if char_length(kodsp) < 6 or char_length(kodsp) > 30 then raise exception 'Check the Shopee order number.'; end if;
      if exists (select 1 from public.tempahan t where upper(t.bayaran ->> 'shopee') = kodsp and t.id <> new.id and t.status <> 'batal') then
        raise exception 'This Shopee order number has already been used for another order.';
      end if;
      new.bayaran := jsonb_build_object('cara', 'shopee', 'shopee', kodsp, 'status', 'semak');
    else
      new.bayaran := case when new.status = 'draf' and coalesce(new.bayaran, '{}'::jsonb) = '{}'::jsonb then '{}'::jsonb
                          else jsonb_build_object('cara', 'online', 'status', 'belum') end;
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
-- own orders; a guest session only while checking out (drafts, and orders confirmed in the last 24 hours)
create policy "tempahan: baca" on public.tempahan for select to authenticated
  using ((pemilik = (select auth.uid())
          and (not (select public.ialah_tetamu())
               or status = 'draf'
               or (status = 'dihantar' and dihantar > now() - interval '24 hours')))
         or (select public.ialah_admin()));
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
-- (columns jumlah/harga/bayaran are guarded by the trigger above)

-- ---------- 3b. Guest order → account ----------
-- A guest who already has an account signs in to keep the order there. Before signing in, the guest
-- session asks for a one-time code (token_tuntut); after signing in, the account hands it back
-- (tuntut_tempahan) and the guest's orders move to the account. Only the hash is stored; 1 hour, one use.
create table if not exists public.tuntutan (
  token_hash text primary key,
  tetamu     uuid not null,
  tamat      timestamptz not null default now() + interval '1 hour'
);
alter table public.tuntutan enable row level security;
revoke all on public.tuntutan from anon, authenticated;

create or replace function public.token_tuntut() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  tok text;
begin
  if auth.uid() is null or not public.ialah_tetamu() then
    raise exception 'Only a guest checkout can be moved into an account.';
  end if;
  delete from public.tuntutan where tamat < now() or tetamu = auth.uid();
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.tuntutan (token_hash, tetamu) values (encode(sha256(convert_to(tok, 'UTF8')), 'hex'), auth.uid());
  return tok;
end $$;

-- returns how many orders moved (0 = code unknown, used or expired)
create or replace function public.tuntut_tempahan(p_token text) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  g uuid;
  n integer := 0;
begin
  if auth.uid() is null or public.ialah_tetamu() then raise exception 'Sign in to your account first.'; end if;
  delete from public.tuntutan
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex') and tamat > now()
   returning tetamu into g;
  if g is null or g = auth.uid() then return 0; end if;
  -- only orders that still belong to a guest session move
  if not exists (select 1 from auth.users u where u.id = g and coalesce((to_jsonb(u) ->> 'is_anonymous')::boolean, false)) then
    return 0;
  end if;
  perform set_config('qawwam.pindah', '1', true);
  update public.tempahan set pemilik = auth.uid() where pemilik = g;
  get diagnostics n = row_count;
  perform set_config('qawwam.pindah', '', true);
  return n;
end $$;

-- ---------- 3c. RSVPs for the signed-in couple (password accounts only) ----------
-- Replies to the cards of the caller's orders (tempahan.kad_id = kad.kad_id, see qawwam-rsvp.sql).
-- Returns {ok:true, kad:[{kod, kad_id, pasangan, pakej, senarai:[{nama,hadir,pax,ucapan,masa}]}]}
-- or {ok:false, sebab:'kata'} for a guest session (set a password first).
create or replace function public.rsvp_saya() returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  u uuid := auth.uid();
begin
  if u is null or public.ialah_tetamu() then return json_build_object('ok', false, 'sebab', 'kata'); end if;
  if to_regclass('public.kad') is null or to_regclass('public.rsvp') is null then
    return json_build_object('ok', true, 'kad', '[]'::json);
  end if;
  return json_build_object('ok', true, 'kad', coalesce((
    select json_agg(json_build_object(
             'kod', t.kod, 'kad_id', k.kad_id, 'pasangan', k.pasangan, 'pakej', k.pakej,
             'senarai', coalesce((select json_agg(json_build_object('nama', r.nama, 'hadir', r.hadir, 'pax', r.pax,
                                                                    'ucapan', r.ucapan, 'masa', r.masa) order by r.masa desc)
                                  from public.rsvp r where r.kad_id = k.kad_id), '[]'::json))
           order by t.dicipta desc)
      from public.tempahan t join public.kad k on k.kad_id = t.kad_id
     where t.pemilik = u and t.status <> 'batal'), '[]'::json));
end $$;

revoke execute on function public.ialah_admin() from public, anon;
revoke execute on function public.profil_baharu() from public, anon, authenticated;
revoke execute on function public.tempahan_jaga() from public, anon, authenticated;
revoke execute on function public.token_tuntut(), public.tuntut_tempahan(text), public.rsvp_saya() from public, anon;
grant execute on function public.ialah_admin(), public.ialah_tetamu() to authenticated;
grant execute on function public.ialah_tetamu() to anon;
grant execute on function public.nama_pengguna_bebas(text) to anon, authenticated;
grant execute on function public.token_tuntut(), public.tuntut_tempahan(text), public.rsvp_saya() to authenticated;

-- ---------- 4. Customer files (Storage) ----------
-- private bucket, 10 MB per file: JPEG/PNG/WebP photos, MP3 songs and PDF payment receipts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tempahan', 'tempahan', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp3', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Upload into <your id>/<your order>/...; read, replace and delete the files of orders you can see
-- (a guest session sees its order only while checking out; an account keeps a guest order it took over).
drop policy if exists "tempahan fail: muat naik" on storage.objects;
drop policy if exists "tempahan fail: baca" on storage.objects;
drop policy if exists "tempahan fail: ganti" on storage.objects;
drop policy if exists "tempahan fail: padam" on storage.objects;
create policy "tempahan fail: muat naik" on storage.objects for insert to authenticated
  with check (bucket_id = 'tempahan' and (
    ((storage.foldername(name))[1] = (select auth.uid())::text
      and exists (select 1 from public.tempahan t where t.id::text = (storage.foldername(name))[2] and t.pemilik = (select auth.uid())))
    or (select public.ialah_admin())));
create policy "tempahan fail: baca" on storage.objects for select to authenticated
  using (bucket_id = 'tempahan' and (
    exists (select 1 from public.tempahan t where t.id::text = (storage.foldername(name))[2] and t.pemilik = (select auth.uid()))
    or ((storage.foldername(name))[1] = (select auth.uid())::text and not (select public.ialah_tetamu()))
    or (select public.ialah_admin())));
create policy "tempahan fail: ganti" on storage.objects for update to authenticated
  using (bucket_id = 'tempahan' and (
    exists (select 1 from public.tempahan t where t.id::text = (storage.foldername(name))[2] and t.pemilik = (select auth.uid()))
    or ((storage.foldername(name))[1] = (select auth.uid())::text and not (select public.ialah_tetamu()))
    or (select public.ialah_admin())))
  with check (bucket_id = 'tempahan' and (
    ((storage.foldername(name))[1] = (select auth.uid())::text
      and exists (select 1 from public.tempahan t where t.id::text = (storage.foldername(name))[2] and t.pemilik = (select auth.uid())))
    or (select public.ialah_admin())));
create policy "tempahan fail: padam" on storage.objects for delete to authenticated
  using (bucket_id = 'tempahan' and (
    exists (select 1 from public.tempahan t where t.id::text = (storage.foldername(name))[2] and t.pemilik = (select auth.uid()))
    or ((storage.foldername(name))[1] = (select auth.uid())::text and not (select public.ialah_tetamu()))
    or (select public.ialah_admin())));

-- ---------- 5. Make your account the admin (run ONCE after creating the admin account) ----------
-- Change the login email below (username + "@" + SHOP.akaunDomain), then run just this line:
-- update public.profil set peranan = 'admin' where id = (select id from auth.users where email = 'danial@qawwam-org.github.io');
