# qawwam shop: website files

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | Desktop view: Home, Order, Templates, InstaWedding, FAQ, Sign in (with the customer dashboard) and Admin |
| `m.html` | Mobile view with the same tabs in a bottom bar. Phones are sent here automatically, and each view links to the other. |
| `app.js` | Shared logic. **Shop settings, packages and the card list are at the top of this file.** |
| `app.css` | Shared styles |
| `tema/` | Card templates: 19 Basic, 10 Premium, the classic Flip card (`flip.html`, 4 colours) and a Flip version of every Basic and Premium design (`kf-*.html`), plus `lagu-contoh.mp3`, the short demo tune the previews play. Each file also works as a demo card, e.g. `tema/nocturne-garden.html`. |
| `supabase/qawwam-rsvp.sql` | Database setup for every card's RSVP, owner panel and Premium guestbook (see section 3). |
| `supabase/functions/qawwam-bayar/index.ts` | The Stripe payment function you paste into Supabase (section 6). |
| `supabase/qawwam-akaun.sql` | Database setup for accounts, card prices, Stripe links, orders and customer files (see section 3). Visitors never load the `supabase/` files; they're here so they travel with the site. |
| `insta/demo.html` | The InstaWedding guest-page example shown on the InstaWedding tab |
| `logo/` | Logo files: Q icon (SVG), full logo (PNG, dark and white), app icon (SVG, 512 and 1024 PNG) |
| `favicon.svg`, `apple-touch-icon.png` | Browser tab and home-screen icons |
| `k/` | Published customer cards go here, e.g. `k/sarah-aiman-1212/index.html`. The admin page's ZIP already has this folder structure. |
| `video/` | Optional. Put `qawwam-app-showcase.mp4` (the 30 s showcase video) here and a "Kad kahwin anda, hidup." section appears on Home. Without the file, the section stays hidden. Shrink it first: `ffmpeg -i qawwam-app-showcase.mp4 -vf scale=720:-2 -crf 28 -an -movflags +faststart video/qawwam-app-showcase.mp4`. |

Tabs have their own links: `#home`, `#tempah`, `#template`, `#instawedding`, `#soalan`, `#masuk`, `#admin`.

**Language:** the site opens in **English**. Visitors can switch to Bahasa Melayu with the BM/EN toggle, and their choice is remembered on that device. The cards themselves stay in Bahasa Melayu. **The Admin page is always English:** while it's open the page switches to English, and the visitor's own choice comes back when they leave it. The ready-made message you send a customer can be English or Bahasa Melayu (a "Message language" box on each order).

## How an order works now

**No account is needed to order or pay.** Designing needs nothing; paying needs the customer's name, email and WhatsApp number; checking the order later and seeing RSVPs need a password.

1. The customer picks a package and a card on **Order**, fills in the form (ending with their name, WhatsApp number and email) and presses **Submit order**. Photos, the song and the money-gift DuitNow QR are uploaded in the form itself.
2. If they aren't signed in, the site quietly starts a **guest checkout** (a Supabase anonymous session in that browser: no password, no sign-up screen). Customers who already have an account can sign in first ("Have an account? Sign in first") so the order lands in it.
3. The order is saved as a **draft** and their dashboard opens on it: every detail plus the real card, with their own photos. They can change it or delete it.
4. To place the order they check **Your details** (name, email, WhatsApp), choose how to pay and confirm:
   - **Pay with Stripe** (card, Apple Pay, Google Pay, GrabPay): the order is placed and they go straight to Stripe's payment page for the order's amount (section 6). After paying they come back and the order is marked paid automatically.
   - **I bought it on Shopee:** they type their Shopee order number instead of paying. Each Shopee number works for one order only (checked by the database). You check it on Shopee and mark it paid.
   - **QR code / bank transfer** (shown once you add a QR code or bank details, section 6): they scan your QR or transfer to your account, type the transaction reference, **attach the receipt** (photo or PDF) and press **I've paid**. You check your account and the receipt, then mark it paid.
5. Their dashboard then says the order will be processed within 1–2 days and that they'll receive the card by WhatsApp and email, plus the payment status.
6. **Guests:** the dashboard offers **Set a password** (they then sign in with their email) or, if that email already has an account, **sign in to keep this order in it** (the order moves into that account). A guest session can only see its order while checking out (drafts, and orders confirmed in the last 24 hours); after that, checking the status needs the password.
7. You see the order on the **Admin** page as **New** with a payment chip (Not paid / Shopee · to check / QR/Bank · to check / Paid), publish it (section 5) and mark it **Completed**. Their dashboard then shows the card link.

**Guest RSVPs** on the dashboard: once a card is published, a signed-in couple (password account) sees every reply to their card, with totals. Guest sessions are refused by the database. Couples can still open the list inside their card with the owner ID.

## Packages on the site

| Package | Price shown | Cards | Status |
|---|---|---|---|
| Basic | RM8.90 – RM15.90 until you set card prices; after that the real range of your Basic prices | 19 Basic | On sale |
| Premium | RM29.90 | 10 Premium | On sale |
| Edit Sendiri | hidden | 10 Premium | "Akan datang". Remove `akan: true` from its line in `PAKEJ` when ready. |
| Custom | hidden | Premium as the base | "Akan datang". Same as above. |
| Flip Card | RM4.90 – RM9.90 | `flip.html` (4 colours) and a Flip version of every Basic (RM4.90) and Premium (RM9.90) design | On sale |

**Card prices:** every card has its own price, set on **Admin → Prices & payments**. It's shown next to the card everywhere on the site, and it's what the customer pays: the database works out each order's amount from this list, so nobody can change it in their browser. A card without a price uses its tier's default (Flip RM4.90, Basic RM8.90, Premium RM29.90). You can still change one order's amount by hand (e.g. a discount).

Order form steps: card + music, couple, date & time (start and end are optional), venue, programme (can be switched off), RSVP + contacts, Premium extras (gallery of up to 7 photos with captions, can be switched off; money gifts with optional DuitNow QR; guestbook on/off), review + your name + WhatsApp number + email + submit.

Card styles for the filters are the `label` of each card in `TEMA`: Basic `islamik`, `melayu`, `klasik`, `moden`, `taman`; Premium `malam`, `senja`, `taman`, `klasik`.

## 1. Before going live, edit `SHOP` in `app.js`

```js
const SHOP = {
  nama: "qawwam",
  whatsapp: "",        // your business WhatsApp, e.g. "60123456789". Used for "WhatsApp us" buttons, not for orders.
  siapDalam: { ms: "1–2 hari", en: "1–2 days" },   // "processed within …" after confirming, and in the FAQ
  aktifSelama: { ms: "3 bulan selepas majlis", en: "3 months after the majlis" },
  stripeCheckout: true, // pay straight to Stripe through the qawwam-bayar function (section 6)
  bayarUrl: "",        // old option: your own payment page when stripeCheckout is false
  url: "https://qawwam-org.github.io",  // site address: card badges and card links (k/<name>/) use it
  supabaseUrl: "",     // ONE Supabase project for accounts, orders, files AND every card's RSVP: "https://<ref>.supabase.co" (no /rest/v1/)
  supabaseAnonKey: "",
  akaunDomain: "qawwam-org.github.io"   // see section 3; don't change it after customers sign up
};
```

**While `supabaseUrl` is empty the site runs in demo mode:** accounts and orders are stored only in the visitor's own browser, so you can try the whole flow safely. In demo mode an account named `danial` is treated as the admin, so you can try the Admin page. Nothing in demo mode reaches you, and orders made on one phone never appear on another.

**The claude.ai preview links always run in demo mode**, even after you fill in Supabase, because the preview can't reach other websites. Test real orders on your hosted site.

**Packages** are the `PAKEJ` list below `SHOP`; **cards** are the `TEMA` list. Each card has a one-line mood (`kata`) and a short story (`ms` / `en`). Keep that voice when adding a card: say who it is for and how it feels.

## 2. Put it online

Plain files, so any static host works. Cloudflare Pages (free, commercial use allowed) is the safer long-term home, ideally with your own domain. GitHub Pages also works, but its rules say it isn't meant for running an online business. If the address changes later, published cards keep pointing to the old one, so decide before your first real order.

## 3. Supabase: accounts, orders, files and RSVP

One Supabase project does everything. Free plan is fine to start; it pauses after 7 days without requests, so budget for Pro (USD 25/month) or a keep-alive ping once customers are live.

1. Create a project at supabase.com (region: Singapore).
2. **SQL Editor → New query:** open `supabase/qawwam-rsvp.sql` from this folder in Notepad, copy everything, paste, **Run**. Then do the same with `supabase/qawwam-akaun.sql`. Both are safe to re-run, and running a newer copy keeps your data. (`qawwam-rsvp.sql` replaces the older `supabase-setup.sql` + `premium-setup.sql`; you don't need those.)
3. **Authentication → Sign In / Providers → Email:** keep Email on and turn **Confirm email OFF**. Usernames sign in as `<username>@<akaunDomain>` behind the scenes; no email is ever sent there, so confirmation emails could never arrive. (It also lets a guest who sets a password start using it at once.)
4. **Authentication → Sign In / Providers → Allow anonymous sign-ins: ON.** This is the guest checkout. While it's off, customers are asked to sign in or create an account before submitting (nothing they typed is lost). Supabase allows 30 new guest sessions per hour per IP address by default (Authentication → Rate Limits); if bots ever abuse it, turn on CAPTCHA protection there.
5. **Project Settings → API:** copy the Project URL (ends in `.supabase.co`; if you paste one ending in `/rest/v1/`, the site trims it) and the `anon` public key into `SHOP.supabaseUrl` and `SHOP.supabaseAnonKey`. Never use the `service_role` key here. The anon key is designed to be public; the database rules (RLS) decide who can see what.
6. **Google sign-in (optional):** Google Cloud Console → OAuth consent screen, then Credentials → OAuth client ID → Web application, redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Supabase → Authentication → Providers → Google: paste the Client ID and Secret. Authentication → URL Configuration: Site URL = your site; Redirect URLs = `https://<your-site>/` and `https://<your-site>/m.html`.

**Updating from an earlier version** (e.g. this guest-checkout update), in this order: (1) run `qawwam-akaun.sql` again, (2) paste the new `qawwam-bayar` function and **Deploy** (section 6), (3) turn on anonymous sign-ins (step 4 above), (4) upload the new site files. Your existing accounts, orders and prices stay.

What the database enforces (tested on Postgres 16 with Supabase's roles):
- Customers see and change only their own orders, and only while they are drafts. Once confirmed, only the admin can change them.
- Confirming (paying for) an order needs the customer's name, a valid email and a Malaysian WhatsApp number.
- A guest session sees its order only during checkout (drafts, and orders confirmed in the last 24 hours); after that a password account is needed. RSVPs (`rsvp_saya`) are refused for guests and only include the caller's own cards.
- A guest who signs in to an existing account takes their orders along with a one-time code (stored only as a hash, valid one hour, guest orders only). Nobody can move orders by hand.
- Final price, card link, kadId and admin notes can only be written by the admin.
- QR / bank transfer needs a payment reference (one order per reference) and a receipt file that is really in that order's folder. The QR code and bank details can only be changed by the admin.
- Customer files live in a private bucket, in a folder per customer and order. Only that order's owner and the admin can open them; links shown on the site expire after an hour.
- At most 10 drafts per account, size limits on every field, 10 MB per file, only JPEG/PNG/WebP, MP3 and PDF (receipts).
- RSVP: one reply per phone (sending again updates it), up to 300 replies per Basic card and 3,000 per Premium card. Owner IDs are stored only as hashes; 10 wrong IDs in 15 minutes lock that card's owner check for 15 minutes. Guests can't read the tables, only call the card's functions.

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

**A customer forgot their password.** Set a temporary password in the SQL Editor and send it to them on WhatsApp. They can change it under **Change password** on their dashboard. Username accounts sign in as `<username>@qawwam-org.github.io`; guests who set a password sign in with their own email:
```sql
update auth.users set encrypted_password = extensions.crypt('Temporary-2027', extensions.gen_salt('bf'))
where email = 'their_username@qawwam-org.github.io';   -- or their own email, e.g. 'aina@example.com'
```

## 4. The Admin page

Two views at the top: **Orders** and **Prices & payments** (card prices: one box per card, grouped Basic / Premium / Flip Card; leave a box empty for the default, then **Save prices**; plus the **QR code / bank transfer** details). Saving prices also adds any card that's new in `TEMA`, so it can be ordered. With Stripe Checkout on (`SHOP.stripeCheckout: true`, the default) no payment links are needed; the per-price **Stripe payment links** box only appears if you turn it off (section 6).

`#admin` (link in the footer). Filters: Needs action, New, In progress, Completed, Customer drafts, Cancelled, All, plus search by code, couple, customer name, email, username or phone. Each order shows the customer's name and whether it came from an account (@username or email) or a **Guest checkout**.

For each order:
- **Status buttons:** Start processing → Mark as completed; Cancel order; Restore order; Delete order (press twice). Customer drafts can be confirmed on their behalf.
- **Payment:** the chip shows Not paid, Shopee <order no.> · to check, QR/Bank <reference> · to check, Stripe · to check, or Paid. Stripe payments are marked Paid automatically; **Check Stripe** checks one now. **Mark as paid** (Shopee checked / Payment received) is for anything you confirm by hand.
- **WhatsApp button** with the customer's number and a ready greeting.
- **Order details:** everything they entered, including their name, email and WhatsApp; **Customer files:** the payment receipt (QR / bank transfer), their song, photos (with captions) and money-gift DuitNow QR. If they only typed a song title, upload the MP3 here.
- **Price, link and card:** the order's total (from the card price; change it only for this order), card, link name (also the card's RSVP ID), published link, private notes.
- **Card content:** *Edit in the order form* opens the order in the normal order form (photos and song included) and saves back to the order; or edit the card data (JSON) directly. Saving from the form rebuilds the card data from the form.
- **Preview** of the finished card with the customer's own photos.

## 5. Publish a card (about 3 minutes)

1. Check the Hijri date against the JAKIM takwim (the page shows the Umm al-Qura suggestion), the spelling of every name, the map links, and that payment has arrived.
2. **Download card (ZIP).** It contains `k/<link-name>/` with `index.html`, `lagu.mp3`, `galeri/1.jpg …` and `duitnow.png`, ready to upload. It tells you if a file is still missing (e.g. a song they only described).
3. **Register the RSVP** (Basic and Premium): copy the SQL shown and run it in Supabase → SQL Editor. It returns the owner ID (`QW-XXXX-XXXX`) once. A warning appears if another order already uses the same link name.
4. Upload the folder to `k/` on your site, then press **Mark as completed** (it fills in the link). The couple's dashboard now shows the link, and their guests' RSVPs once replies come in.
5. **Message to the customer:** paste the owner ID, pick the message language (English or Bahasa Melayu) and send the ready message by WhatsApp.

The generated card has the showroom samples switched off (`DEMO_RSVP = false`, Flip `DEMO = false`), your Supabase project filled in, and the calendar download on.

## 6. Online payment: straight to Stripe

When a customer confirms with **Pay with Stripe**, the site asks a small Supabase function (`qawwam-bayar`) to make a Stripe payment page for **that order's amount** (read from the database, so nobody can change it), and sends them there. They pay by card, Apple Pay, Google Pay or GrabPay (whatever you switch on in Stripe). When they come back, the site asks Stripe whether it was paid and marks the order **Paid** by itself. No payment links to make, no webhook. Guests (no account) can pay too.

You need: one Supabase Edge Function and one secret. About 15 minutes.

**1. Stripe**
1. Create a Stripe account for Malaysia. Stay in **Test mode** (toggle at the top) while you try it.
2. Settings → **Payment methods**: turn on **Cards**, **Apple Pay**, **Google Pay** and **GrabPay** (FPX too if you like; Stripe asks for your business registration number (SSM) before FPX works in live mode). Apple Pay shows on iPhones/Safari and Google Pay on Chrome/Android when the customer has a wallet set up.
3. Developers → **API keys** → copy the **Secret key** (`sk_test_…`). Never put this key in `app.js` or send it to anyone.

**2. Supabase: the secret**

Edge Functions → **Secrets** → add `STRIPE_SECRET_KEY` = your `sk_test_…` key → **Save**.
(Optional: `SITE_URL` if your site isn't `https://qawwam-org.github.io`. It's where Stripe sends customers back.)

**3. Supabase: the function**
1. Edge Functions → **Deploy a new function** → **Via Editor**.
2. Name it exactly `qawwam-bayar`.
3. Delete the sample code, open `supabase/functions/qawwam-bayar/index.ts` from this folder in Notepad, copy everything, paste it in.
4. **Deploy function**. Leave JWT verification on (the default): only signed-in customers and guest checkout sessions can use it. **Already have it?** Open it, replace the code with the new file and deploy again: the new version refuses QR / bank transfer orders and limits guest sessions to their checkout.

**4. Supabase: the database**

Run the newest `supabase/qawwam-akaun.sql` again in the SQL Editor (safe to re-run). It lets the function mark orders paid; customers still can't.

**5. Try it**

Place an order on your site and press **Confirm & pay**. On Stripe's page use the test card `4242 4242 4242 4242`, any future date, any CVC. You come back to your dashboard showing "Payment received", and the Admin page shows **Paid**.

**Going live:** in Stripe, switch to live mode, copy the live Secret key (`sk_live_…`) and replace `STRIPE_SECRET_KEY` in Supabase with it. Nothing changes on the website. Do one real payment and refund it to be sure.

**What you see on the Admin page**
- **Paid · Stripe** with a "View on Stripe" link (for receipts and refunds).
- **Not paid**: the customer hasn't paid yet. If they opened Stripe's page, a **Check Stripe** button asks Stripe now. Orders are also checked automatically when you or the customer open them, so a customer who paid but closed the tab still gets marked paid.
- **Stripe · to check**: they paid, but a different amount from the order (for example you changed the order's amount after they opened Stripe). Check in Stripe, then **Mark as paid** or refund.

**If something isn't set up yet** (no function, no secret key), the order is still placed and the customer sees "The payment page couldn't open right now; try Pay now again, or contact us on WhatsApp". Their browser's console says which part is missing.

**Fees and money:** Stripe charges a fee per payment (check Stripe's Malaysia pricing page) and pays out to your bank account on its own schedule. A RM4.90 card loses a large share to the fee. Stripe's minimum charge is RM2.00.

### QR code / bank transfer (checked by hand)

Stripe can't take Touch 'n Go in Malaysia. (Stripe's "custom payment method" ID, `cpmt_…`, only shows a button and doesn't move money, so the site doesn't use it.) Instead, customers can scan your DuitNow QR (works with TNG eWallet and every Malaysian banking app) or transfer to your bank account.

1. Admin → **Prices & payments** → *QR code / bank transfer*:
   - **Choose QR code image** (a screenshot of your business DuitNow QR) and the name to show under it, and/or
   - **Bank**, **Account holder** and **Account number**.
   Press **Save**. The chip turns **Active**. Only the admin can change these, so nobody can swap your account number.
2. Customers now see **QR code / bank transfer** with your QR and/or bank details (with a **Copy** button for the account number), the amount, the order code to put in the payment reference, a box for the **transaction reference** and **Attach receipt** (a photo or PDF of the transfer, up to 5 MB, stored privately with the order). They press **I've paid · Confirm order**. Each reference works for one order only.
3. The order arrives as **QR/Bank <reference> · to check**, and the receipt is under **Customer files**. Check your account for that amount and reference, then press **Payment received: mark as paid**. If the money isn't there, contact the customer before processing.

**Remove QR code** hides the QR (the option stays while bank details are filled in; clear them to hide it completely). No fees from us or Stripe; your bank's DuitNow terms apply. Older orders made with the earlier "TNG / DuitNow" option show the same way.

**Other options still in the code:** set `stripeCheckout: false` in `SHOP` to go back to one Stripe Payment Link per price (pasted on Admin → Prices & payments) or your own page in `SHOP.bayarUrl`.

## Not built yet

- **Edit Sendiri and Custom** packages (shown as "Akan datang").
- **InstaWedding:** still ordered on WhatsApp; uploads and the live feed aren't built. Plan storage limits first, because video is the main cost.
- **Shopee orders and QR / bank transfers** are still checked by hand, then marked with **Mark as paid**.
- **Emails:** the site doesn't send receipts or status emails yet; the email is stored with the order for you to use.

## Testing on your computer

The pages load templates with `fetch`, so use a local web server rather than double-clicking the file:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 (desktop view) or http://localhost:8000/m.html (mobile view).
