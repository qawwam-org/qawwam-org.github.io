# qawwam shop: website files

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | Desktop view: Home, Tempah, Templat, InstaWedding, Soalan (FAQ), Log masuk (with the customer dashboard) and Admin |
| `m.html` | Mobile view with the same tabs in a bottom bar. Phones are sent here automatically, and each view links to the other. |
| `app.js` | Shared logic. **Shop settings, packages and the card list are at the top of this file.** |
| `app.css` | Shared styles |
| `tema/` | 30 card templates (4 Flip colours share `flip.html`, 19 Basic, 10 Premium) plus `lagu-contoh.mp3`, the short demo tune the previews play. Each file also works as a demo card, e.g. `tema/nocturne-garden.html`. |
| `supabase/qawwam-akaun.sql` | Database setup for accounts, orders and customer files (see section 3). Not needed by visitors; it's here so it travels with the site. |
| `insta/demo.html` | The InstaWedding guest-page example shown on the InstaWedding tab |
| `logo/` | Logo files: Q icon (SVG), full logo (PNG, dark and white), app icon (SVG, 512 and 1024 PNG) |
| `favicon.svg`, `apple-touch-icon.png` | Browser tab and home-screen icons |
| `k/` | Published customer cards go here, e.g. `k/sarah-aiman-1212/index.html`. The admin page's ZIP already has this folder structure. |
| `video/` | Optional. Put `qawwam-app-showcase.mp4` (the 30 s showcase video) here and a "Kad kahwin anda, hidup." section appears on Home. Without the file, the section stays hidden. Shrink it first: `ffmpeg -i qawwam-app-showcase.mp4 -vf scale=720:-2 -crf 28 -an -movflags +faststart video/qawwam-app-showcase.mp4`. |

Tabs have their own links: `#home`, `#tempah`, `#template`, `#instawedding`, `#soalan`, `#masuk`, `#admin`.

## How an order works now

1. The customer picks a package and a card on **Tempah** (price and style filters help them choose), fills in the form and presses **Hantar tempahan**. Photos, the song and the DuitNow QR are uploaded in the form itself.
2. If they aren't signed in, they're taken to **Log masuk** to sign in or create an account (username + password, email optional, or Google). The order then continues by itself; nothing they typed is lost.
3. The order is saved as a **draft** and their dashboard opens on it: every detail plus the real card, with their own photos. They can change it, delete it, or press **Sahkan tempahan**.
4. You see it on the **Admin** page as **Baharu**, contact them on WhatsApp (their number is on the order) with the final price and payment link, then publish (section 5).
5. When you mark it **Siap**, the customer's dashboard shows the final price and the card link.

The dashboard's **RSVP tetamu** panel shows "Akan datang / dalam penyelenggaraan" for now. Guests' RSVPs are already stored in Supabase; couples open them inside their card with the owner ID.

## Packages on the site

| Package | Price shown | Cards | Status |
|---|---|---|---|
| Basic | RM8.90 – RM15.90 (you set the final price per order on the Admin page) | 19 Basic | On sale |
| Premium | RM29.90 | 10 Premium | On sale |
| Edit Sendiri | hidden | 10 Premium | "Akan datang". Remove `akan: true` from its line in `PAKEJ` when ready. |
| Custom | hidden | Premium as the base | "Akan datang". Same as above. |
| Kad Flip | RM4.90 | 4 colours of `flip.html` | On sale |

Order form steps: card + music, couple, date & time (start and end are optional), venue, programme (can be switched off), RSVP + contacts, Premium extras (gallery of up to 7 photos with captions, can be switched off; money gifts with optional DuitNow QR; guestbook on/off), review + WhatsApp number + submit.

Card styles for the filters are the `label` of each card in `TEMA`: Basic `islamik`, `melayu`, `klasik`, `moden`, `taman`; Premium `malam`, `senja`, `taman`, `klasik`.

## 1. Before going live, edit `SHOP` in `app.js`

```js
const SHOP = {
  nama: "qawwam",
  whatsapp: "",        // your business WhatsApp, e.g. "60123456789". Used for "WhatsApp us" buttons, not for orders.
  harga: "RM4.90",     // lowest price, shown as "from RM4.90"
  siapDalam: { ms: "24 jam", en: "24 hours" },
  aktifSelama: { ms: "3 bulan selepas majlis", en: "3 months after the majlis" },
  bayarUrl: "",        // optional ToyyibPay / DuitNow link, shown on the dashboard once you set a price
  url: "https://qawwam-org.github.io",  // site address: card badges and card links (k/<name>/) use it
  supabaseUrl: "",     // ONE Supabase project for accounts, orders, files AND every card's RSVP
  supabaseAnonKey: "",
  akaunDomain: "qawwam-org.github.io"   // see section 3; don't change it after customers sign up
};
```

**While `supabaseUrl` is empty the site runs in demo mode:** accounts and orders are stored only in the visitor's own browser, so you can try the whole flow safely (also inside the claude.ai preview). In demo mode an account named `danial` is treated as the admin, so you can try the Admin page. Nothing in demo mode reaches you.

**Packages** are the `PAKEJ` list below `SHOP`; **cards** are the `TEMA` list. Each card has a one-line mood (`kata`) and a short story (`ms` / `en`). Keep that voice when adding a card: say who it is for and how it feels.

## 2. Put it online

Plain files, so any static host works. Cloudflare Pages (free, commercial use allowed) is the safer long-term home, ideally with your own domain. GitHub Pages also works, but its rules say it isn't meant for running an online business. If the address changes later, published cards keep pointing to the old one, so decide before your first real order.

## 3. Supabase: accounts, orders, files and RSVP

One Supabase project does everything. Free plan is fine to start; it pauses after 7 days without requests, so budget for Pro (USD 25/month) or a keep-alive ping once customers are live.

1. Create a project at supabase.com (region: Singapore).
2. **SQL Editor:** run `supabase-setup.sql`, then `premium-setup.sql` (RSVP, delivered with the card templates), then `supabase/qawwam-akaun.sql` from this folder (accounts, orders, files). All are safe to re-run.
3. **Authentication → Sign In / Providers → Email:** keep Email on and turn **Confirm email OFF**. Usernames sign in as `<username>@<akaunDomain>` behind the scenes; no email is ever sent there, so confirmation emails could never arrive.
4. **Project Settings → API:** copy the Project URL and the `anon` public key into `SHOP.supabaseUrl` and `SHOP.supabaseAnonKey`. The anon key is designed to be public; the database rules (RLS) decide who can see what.
5. **Google sign-in (optional):** Google Cloud Console → OAuth consent screen, then Credentials → OAuth client ID → Web application, redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Supabase → Authentication → Providers → Google: paste the Client ID and Secret. Authentication → URL Configuration: Site URL = your site; Redirect URLs = `https://<your-site>/` and `https://<your-site>/m.html`.

What the database enforces (tested on Postgres 16 with Supabase's roles):
- Customers see and change only their own orders, and only while they are drafts. Once confirmed, only the admin can change them.
- Final price, card link, kadId and admin notes can only be written by the admin.
- Customer files live in a private bucket, in a folder per customer and order. Only that customer and the admin can open them; links shown on the site expire after an hour.
- At most 10 drafts per account, size limits on every field, 10 MB per file, only JPEG/PNG/WebP and MP3.

### Admin account

Your admin login is a normal account with the admin role, so **no password is stored in the website's code** (anyone can read a static site's code).

1. Supabase → Authentication → Users → **Add user → Create new user**. Email: `danial@qawwam-org.github.io` (your username + `@` + `akaunDomain`). Password: your admin password. Tick **Auto Confirm User**.
2. SQL Editor, run once:
   ```sql
   update public.profil set peranan = 'admin'
   where id = (select id from auth.users where email = 'danial@qawwam-org.github.io');
   ```
3. Open `https://<your-site>/#admin` and sign in with username `Danial` and that password. Usernames are not case-sensitive.

Do this before you share the site, so nobody else registers the username first. The admin role can only be given in the SQL Editor, never from the website.

**A customer forgot their password.** Recovery emails can't reach a username account, so set a temporary password in the SQL Editor and send it to them on WhatsApp. They can change it under **Tukar kata laluan** on their dashboard:
```sql
update auth.users set encrypted_password = extensions.crypt('Sementara-2027', extensions.gen_salt('bf'))
where email = 'their_username@qawwam-org.github.io';
```

## 4. The Admin page

`#admin` (link in the footer). Filters: Perlu tindakan, Baharu, Diproses, Siap, Draf pelanggan, Batal, Semua, plus search by code, name, username or phone.

For each order:
- **Status buttons:** Proses tempahan → Tandakan siap; Batalkan; Pulihkan; Padam (press twice). Customer drafts can be confirmed on their behalf.
- **WhatsApp button** with the customer's number and a ready greeting.
- **Butiran tempahan:** everything they entered; **Fail pelanggan:** their song, photos (with captions) and DuitNow QR. If they only typed a song title, upload the MP3 here.
- **Harga, pautan dan kad:** final price (shown on their dashboard), card, link name (also the RSVP kadId), published link, private notes.
- **Kandungan kad:** *Ubah dalam borang* opens the order in the normal order form (photos and song included) and saves back to the order; or edit the CONFIG directly. Saving from the form rebuilds the CONFIG from the form.
- **Preview** of the finished card with the customer's own photos.

## 5. Publish a card (about 3 minutes)

1. Check the Hijri date against the JAKIM takwim (the page shows the Umm al-Qura suggestion), the spelling of every name, the map links, and that payment has arrived.
2. **Muat turun kad (ZIP).** It contains `k/<link-name>/` with `index.html`, `lagu.mp3`, `galeri/1.jpg …` and `duitnow.png`, ready to upload. It tells you if a file is still missing (e.g. a song they only described).
3. **Daftar RSVP** (Basic and Premium): copy the SQL shown and run it in Supabase → SQL Editor. It returns the owner ID (`QW-XXXX-XXXX`) once. A warning appears if another order already uses the same link name.
4. Upload the folder to `k/` on your site, then press **Tandakan siap** (it fills in the link).
5. **Mesej kepada pelanggan:** paste the owner ID and send the ready message by WhatsApp.

The generated card has the showroom samples switched off (`DEMO_RSVP = false`, Flip `DEMO = false`), your Supabase project filled in, and the calendar download on.

## Not built yet

- **RSVP panel on the dashboard** (shown as "Akan datang"). The data is ready in Supabase; the panel needs a database function that lets a signed-in customer read their own card's RSVPs.
- **Edit Sendiri and Custom** packages (shown as "Akan datang").
- **Basic 300-reply cap:** the database accepts up to 3,000 replies for every card until `hantar_rsvp` in `supabase-setup.sql` is changed to `case pakej when 'premium' then 3000 else 300 end`.
- **InstaWedding:** still ordered on WhatsApp; uploads and the live feed aren't built. Plan storage limits first, because video is the main cost.
- **Payments** are still a link you send; there's no automatic payment confirmation.

## Testing on your computer

The pages load templates with `fetch`, so use a local web server rather than double-clicking the file:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 (desktop view) or http://localhost:8000/m.html (mobile view).
