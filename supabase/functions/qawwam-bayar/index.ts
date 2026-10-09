// =====================================================================
// qawwam · Stripe Checkout (Supabase Edge Function "qawwam-bayar")
//
// The website calls this with the signed-in customer's login. It:
//   tindakan "bayar": makes a Stripe Checkout page for the order's amount (read from the
//                     database, never from the browser) and returns its address. Payment methods
//                     (card, Apple Pay, Google Pay, GrabPay, ...) are the ones switched on in your
//                     Stripe Dashboard → Settings → Payment methods.
//   tindakan "semak": asks Stripe whether that Checkout page was paid; if so, marks the
//                     order "dibayar" (paid). The site calls this when the customer comes
//                     back from Stripe, when they open the order later, and from the Admin page.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY  sk_test_... (testing) or sk_live_... (real payments)   required
//   SITE_URL           https://qawwam-org.github.io                           optional
// Keep "Verify JWT" ON for this function (the default): only signed-in users and guest checkout
// sessions can call it. A guest session can only pay for / check an order it is checking out
// (a draft, or confirmed in the last 24 hours), the same rule as the database.
// No Stripe library and no webhook needed. Written as plain JavaScript (valid TypeScript).
// =====================================================================

const STRIPE = "https://api.stripe.com/v1";
const SITE = (Deno.env.get("SITE_URL") || "https://qawwam-org.github.io").trim().replace(/\/+$/, "");
const SB = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
const pertama = (json) => { try { const o = JSON.parse(json || "{}"); return o.default || Object.values(o)[0] || ""; } catch (e) { return ""; } };
const KUNCI_AWAM = Deno.env.get("SUPABASE_ANON_KEY") || pertama(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
const KUNCI_SERVER = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || pertama(Deno.env.get("SUPABASE_SECRET_KEYS"));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const jawab = (status, badan) => new Response(JSON.stringify(badan), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const ralat = (status, kod, mesej) => jawab(status, { ralat: kod, mesej });

// the database with full rights (the order trigger lets this mark payments)
const kepalaServer = () => (KUNCI_SERVER.startsWith("sb_")
  ? { apikey: KUNCI_SERVER, "Content-Type": "application/json" }
  : { apikey: KUNCI_SERVER, Authorization: "Bearer " + KUNCI_SERVER, "Content-Type": "application/json" });
async function db(laluan, o) {
  const r = await fetch(SB + "/rest/v1/" + laluan, { ...(o || {}), headers: { ...kepalaServer(), ...((o && o.headers) || {}) } });
  const teks = await r.text();
  if (!r.ok) throw new Error("Database: " + r.status + " " + teks.slice(0, 200));
  return teks ? JSON.parse(teks) : null;
}

async function stripe(laluan, borang) {
  const kunci = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!/^(sk|rk)_(test|live)_/.test(kunci)) throw Object.assign(new Error("STRIPE_SECRET_KEY is not set in Supabase → Edge Functions → Secrets."), { kod: "tiada_kunci" });
  const r = await fetch(STRIPE + laluan, {
    method: borang ? "POST" : "GET",
    headers: { Authorization: "Bearer " + kunci, "Content-Type": "application/x-www-form-urlencoded" },
    body: borang ? new URLSearchParams(borang).toString() : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error("Stripe: " + ((j.error && j.error.message) || r.status)), { kod: "stripe" });
  return j;
}

const sen = (jumlah) => Math.round(Number(jumlah) * 100);

// paid on Stripe → mark the order paid (or "semak" if the amount doesn't match the order any more)
async function rekodBayaran(tp, s) {
  const padan = s.currency === "myr" && Number(s.amount_total) === sen(tp.jumlah);
  const bayaran = Object.assign({}, tp.bayaran || {}, {
    cara: "online", status: padan ? "dibayar" : "semak", sesi: s.id,
    stripe: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent && s.payment_intent.id) || "",
    dibayar_rm: (Number(s.amount_total) || 0) / 100, dibayar_pada: new Date().toISOString()
  });
  await db("tempahan?id=eq." + encodeURIComponent(tp.id), { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ bayaran }) });
  return bayaran.status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return ralat(405, "kaedah", "POST only.");
  try {
    if (!SB || !KUNCI_AWAM || !KUNCI_SERVER) return ralat(500, "konfigurasi", "Supabase variables are missing in the function.");

    // who is calling (their login token, checked by Supabase Auth)
    const auth = req.headers.get("Authorization") || "";
    if (!/^Bearer\s+\S+/.test(auth)) return ralat(401, "log_masuk", "Sign in first.");
    const ru = await fetch(SB + "/auth/v1/user", { headers: { apikey: KUNCI_AWAM, Authorization: auth } });
    const pengguna = ru.ok ? await ru.json() : null;
    if (!pengguna || !pengguna.id) return ralat(401, "log_masuk", "Sign in first.");

    const badan = await req.json().catch(() => ({}));
    const tindakan = badan.tindakan === "semak" ? "semak" : "bayar";
    const id = String(badan.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return ralat(400, "data", "Invalid order ID.");

    const [tp] = await db("tempahan?select=id,kod,pemilik,status,tema,jumlah,emel,bayaran,dihantar&id=eq." + encodeURIComponent(id)) || [];
    if (!tp) return ralat(404, "tiada", "Order not found.");
    let admin = false;
    if (tp.pemilik !== pengguna.id) {
      const [p] = await db("profil?select=peranan&id=eq." + encodeURIComponent(pengguna.id)) || [];
      admin = !!(p && p.peranan === "admin");
      if (!admin) return ralat(403, "bukan_milik", "This isn't your order.");
    } else if (pengguna.is_anonymous) {
      // guest checkout session: only while checking out; later the customer signs in with a password
      const semasa = tp.status === "draf" || (tp.status === "dihantar" && tp.dihantar && Date.now() - new Date(tp.dihantar).getTime() < 24 * 3600e3);
      if (!semasa) return ralat(403, "kata_laluan", "Sign in with your password to see this order.");
    }
    const b = tp.bayaran || {};

    if (tindakan === "semak") {
      if (b.status === "dibayar" || b.status === "semak" || !b.sesi) return jawab(200, { status: b.status || "belum" });
      const s = await stripe("/checkout/sessions/" + encodeURIComponent(b.sesi));
      if (s.payment_status === "paid") return jawab(200, { status: await rekodBayaran(tp, s) });
      return jawab(200, { status: "belum", stripe: s.status });
    }

    // tindakan "bayar": only the owner, only a confirmed online order that isn't paid yet
    if (admin) return ralat(403, "bukan_milik", "Only the customer can pay for this order.");
    if (tp.status === "draf") return ralat(409, "draf", "Confirm the order first.");
    if (tp.status === "batal") return ralat(409, "batal", "This order was cancelled.");
    if (b.cara === "shopee" || b.cara === "qr" || b.cara === "tng") return ralat(409, b.cara, b.cara === "shopee" ? "This order is paid through Shopee." : "This order is paid by QR code / bank transfer.");
    if (b.status === "dibayar" || b.status === "semak") return jawab(200, { status: b.status });
    const amaun = sen(tp.jumlah);
    if (!(amaun >= 200)) return ralat(409, "amaun", "The order amount is not set or is too small.");

    // reuse the Checkout page made earlier if it's still open and for the same amount
    if (b.sesi) {
      try {
        const s = await stripe("/checkout/sessions/" + encodeURIComponent(b.sesi));
        if (s.payment_status === "paid") return jawab(200, { status: await rekodBayaran(tp, s) });
        if (s.status === "open" && Number(s.amount_total) === amaun && s.url) return jawab(200, { url: s.url });
        if (s.status === "open") await stripe("/checkout/sessions/" + encodeURIComponent(s.id) + "/expire", {}).catch(() => {});
      } catch (e) { /* make a new one */ }
    }

    const bahasa = badan.bahasa === "ms" ? "ms" : "en";
    const borang = {
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "myr",
      "line_items[0][price_data][unit_amount]": String(amaun),
      "line_items[0][price_data][product_data][name]": `Kad kahwin digital qawwam · ${tp.kod}`,
      client_reference_id: tp.kod,
      "metadata[tempahan]": tp.id,
      "metadata[kod]": tp.kod,
      "payment_intent_data[description]": `qawwam ${tp.kod}`,
      "payment_intent_data[metadata][kod]": tp.kod,
      locale: bahasa,
      success_url: `${SITE}/?bayar=selesai#masuk`,
      cancel_url: `${SITE}/#masuk`
    };
    if (tp.emel && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(tp.emel)) borang.customer_email = tp.emel;
    const s = await stripe("/checkout/sessions", borang);
    await db("tempahan?id=eq." + encodeURIComponent(tp.id), {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ bayaran: Object.assign({}, b, { cara: "online", status: b.status || "belum", sesi: s.id }) })
    });
    return jawab(200, { url: s.url });
  } catch (e) {
    return ralat(e && e.kod === "tiada_kunci" ? 503 : 502, (e && e.kod) || "pelayan", String((e && e.message) || e).slice(0, 300));
  }
});
