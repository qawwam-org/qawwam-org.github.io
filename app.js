/* =====================================================================
   qawwam · shared shop logic (desktop view + mobile view)
   Tabs: Home · Tempah · Templat · InstaWedding · Soalan · Log masuk (papan pemuka) · (Admin)
   Edit SHOP below before taking real orders.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1. SHOP SETTINGS ---------- */
  const SHOP = {
    nama: "qawwam",
    whatsapp: "601121786640",     // nombor WhatsApp kedai, kod negara + digit, cth "60123456789"
    siapDalam: { ms: "1–2 hari", en: "1–2 days" },
    aktifSelama: { ms: "3 bulan selepas majlis", en: "3 months after the majlis" },
    // Bayaran dalam talian: true = terus ke Stripe Checkout untuk jumlah tempahan, melalui Supabase Edge Function
    // "qawwam-bayar" (README bahagian 6). Bayaran disahkan secara automatik. false = guna Stripe Payment Links
    // (Admin → Harga kad) atau bayarUrl.
    stripeCheckout: true,
    // bayarUrl (pilihan, lama): halaman bayaran sendiri jika stripeCheckout false dan harga itu tiada pautan Stripe.
    bayarUrl: "",
    url: "https://qawwam-org.github.io",  // alamat laman. Lencana setiap kad dan pautan kad (k/<nama>/) guna alamat ini.
    // Supabase: SATU projek untuk akaun, tempahan, fail pelanggan DAN RSVP semua kad (Project Settings → API).
    // Selagi kosong, laman berjalan dalam "mod demo": akaun dan tempahan disimpan dalam pelayar sahaja.
    supabaseUrl: "https://sxtraevpdgkwkfajxare.supabase.co",   // Project URL sahaja (tanpa /rest/v1/)
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dHJhZXZwZGdrd2tmYWp4YXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzODYxNzYsImV4cCI6MjEwNTk2MjE3Nn0.EHdW77fZwYXOm6EkFpjm4M3ByyySE5AyOdTCxgXvnSA",          // anon public key (memang boleh didedahkan)
    // Akaun nama pengguna log masuk ke Supabase sebagai <nama>@<akaunDomain>. Tiada e-mel dihantar ke alamat ini.
    // JANGAN tukar selepas pelanggan pertama mendaftar, kerana akaun lama tidak akan dapat log masuk.
    akaunDomain: "qawwam-org.github.io"
  };
  // "https://x.supabase.co/rest/v1/" (as copied from some Supabase pages) → "https://x.supabase.co"
  SHOP.supabaseUrl = String(SHOP.supabaseUrl || "").trim().replace(/\/(rest|auth|storage)\/v1\/?$/i, "").replace(/\/+$/, "");
  const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js";

  /* ---------- 2. PACKAGES ----------
     jenis = which templates the package uses: "flip" | "basic" | "premium" (see TEMA[].pakej)
     harga = what the site shows (a range is fine); hargaDari = the lowest price, used on card badges
     akan: true = shown as "Akan datang" and can't be chosen yet. Remove it when the package is ready. */
  const PAKEJ = [
    { id: "basic", jenis: "basic", harga: "RM8.90 – RM15.90", hargaDari: "RM8.90",
      nama: { ms: "Basic", en: "Basic" },
      ringkas: { ms: "Kad lengkap: tetamu boleh RSVP, cari dewan dan dengar lagu anda.", en: "The complete card: guests can RSVP, find the hall and hear your song." },
      ciri: {
        ms: ["19 kad Basic untuk dipilih", "Sampul animasi, kiraan detik dan tatal automatik", "Aturcara, Google Maps, Waze dan kalendar", "RSVP dalam talian, hingga 300 jawapan", "Papan RSVP: jumlah tetamu, tapis, muat turun Excel", "Muzik latar", "Doa pengantin dan senarai hubungi", "Pautan aktif 3 bulan selepas majlis"],
        en: ["19 Basic cards to choose from", "Animated cover, countdown and auto-scroll", "Programme, Google Maps, Waze and calendar", "Online RSVP, up to 300 replies", "RSVP panel: guest totals, filters, Excel download", "Background music", "Doa for the couple and contact list", "Link live for 3 months after the majlis"] } },
    { id: "premium", jenis: "premium", harga: "RM29.90",
      nama: { ms: "Premium", en: "Premium" },
      chip: { ms: "Baharu", en: "New" },
      ringkas: { ms: "Kad yang dibuka halaman demi halaman, dengan galeri, buku tetamu dan salam kaut.", en: "A card that opens page by page, with a gallery, guestbook and money gifts." },
      ciri: {
        ms: ["Semua dalam Basic", "10 kad Premium, setiap satu dibuka dengan cara sendiri", "RSVP hingga 3,000 jawapan", "Senarai RSVP dalam PDF dan Excel", "Galeri 7 gambar dengan tayangan slaid", "Buku tetamu: ucapan awam yang anda kawal", "Salam kaut: QR DuitNow dan no. akaun", "Reka bentuk kad fizikal percuma (PDF cetak 5×7 inci)", "Pautan dan kod QR kad di papan pemilik", "2 kali pembetulan", "Pautan aktif 6 bulan selepas majlis"],
        en: ["Everything in Basic", "10 Premium cards, each opening in its own way", "RSVP up to 3,000 replies", "RSVP list as PDF and Excel", "7-photo gallery with a slideshow", "Guestbook: public wishes you moderate", "Money gifts: DuitNow QR and account number", "Free printed-card design (5×7 in print PDF)", "Card link and QR code in the owner panel", "2 rounds of corrections", "Link live for 6 months after the majlis"] } },
    { id: "edit", jenis: "premium", harga: "RM39.90", akan: true,
      nama: { ms: "Edit Sendiri", en: "Edit It Yourself" },
      ringkas: { ms: "Untuk yang suka ubah saat akhir: kad Premium yang anda edit sendiri.", en: "For last-minute changers: a Premium card you edit yourself." },
      ciri: {
        ms: ["Semua dalam Premium", "Ubah butiran sendiri dari papan pemuka", "Ubah tanpa had sehingga hari majlis", "Tukar kad Premium bila-bila masa", "Perubahan terus pada pautan yang sama"],
        en: ["Everything in Premium", "Change details yourself from your dashboard", "Unlimited changes until the majlis", "Switch Premium cards any time", "Changes appear on the same link"] } },
    { id: "custom", jenis: "premium", harga: "RM79.90", akan: true,
      nama: { ms: "Custom", en: "Custom" },
      ringkas: { ms: "Direka bersama anda, bukan sekadar untuk anda.", en: "Designed with you, not just for you." },
      ciri: {
        ms: ["Semua dalam Premium", "Reka bentuk ikut warna, motif dan fon pilihan anda", "Sesi perbincangan bersama kami", "Lebih banyak pembetulan"],
        en: ["Everything in Premium", "Design in your chosen colours, motifs and fonts", "Design sessions with us", "More rounds of corrections"] } },
    { id: "flip", jenis: "flip", harga: "RM4.90 – RM9.90",
      nama: { ms: "Kad Flip", en: "Flip Card" },
      ringkas: { ms: "Sekeping kad, dua muka. Ringkas, macam kad yang dipegang di tangan.", en: "One card, two faces. Simple, like a card you hold in your hand." },
      ciri: {
        ms: ["Versi Flip setiap kad Basic dan Premium, 4 warna setiap satu", "Depan: nama dan tarikh. Belakang: butiran majlis", "Tarikh Masihi dan Hijri", "Butang Google Maps", "Tajuk dan Bismillah ikut pilihan anda", "Pautan aktif 3 bulan selepas majlis"],
        en: ["A Flip version of every Basic and Premium card, 4 colours each", "Front: names and date. Back: majlis details", "Gregorian and Hijri dates", "Google Maps button", "Your choice of heading and Bismillah", "Link live for 3 months after the majlis"] },
      tiada: { ms: "Tiada RSVP, aturcara, kiraan detik atau muzik.", en: "No RSVP, programme, countdown or music." } }
  ];
  const HARGA_INSTA = "RM29.90";

  /* Card prices. The Admin page sets a price for each card (stored in Supabase, table harga_kad);
     a card without one uses its tier's default. The database uses the same list to charge for an order. */
  const HARGA_LALAI = { flip: 4.90, basic: 8.90, premium: 29.90 };
  const HARGA = {};   // card id -> price (number), filled from the store at start-up
  const PAUTAN = {};  // "12.90" -> Stripe Payment Link for that price (Admin → Harga kad)
  const TETAPAN = {}; // shop settings everyone can read: qr_tng (payment QR image), qr_tng_nama (receiver name), bank_nama, bank_pemegang, bank_akaun
  const rm = (n) => "RM" + Number(n).toFixed(2);

  /* ---------- 3. TEMPLATES ----------
     pakej: "flip" | "basic" | "premium". fail = file in tema/ (defaults to id). hero: shown as a swatch on Home.
     label = style filter: Basic islamik/melayu/klasik/moden/taman, Premium malam/senja/taman/klasik (see GAYA).
     kata = the card's one-line mood (shown in italics under its name); ms/en = the longer story.
     Adding a template: put the file in tema/ (same CONFIG markers), then add a line here. */
  const TEMA = [
    { id: "flip-gading", nama: "Flip Klasik Gading", fail: "flip", gaya: "gading", pakej: "flip", warna: ["#FBF7EE", "#BE9A48"], label: "asal",
      kata: { ms: "Lembut, macam kad yang disimpan dalam laci.", en: "Soft, like a card you'd keep in a drawer." },
      ms: "Kertas gading dengan kerawang emas yang halus. Kalau majlis anda kecil dan mesra, akad nikah di rumah atau kenduri keluarga, kad ini cukup untuk menjemput dengan sopan tanpa banyak hiasan.",
      en: "Ivory paper with fine gold filigree. If your day is small and close, a nikah at home or a family kenduri, this card invites people politely, without any fuss." },
    { id: "flip-zamrud", nama: "Flip Klasik Zamrud", fail: "flip", gaya: "zamrud", pakej: "flip", warna: ["#13402F", "#D4AF5C"], label: "asal",
      kata: { ms: "Hijau tua yang tak pernah lapuk.", en: "A deep green that never dates." },
      ms: "Hijau zamrud dan tulisan emas, warna yang kita kenal dari baju Melayu dan songket raya. Sekeping kad sahaja, tapi tetamu tetap rasa majlis ini dirancang dengan teliti.",
      en: "Emerald with gold lettering, the colour we know from baju Melayu and festive songket. Only one card, yet guests can still tell the day was planned with care." },
    { id: "flip-mawar", nama: "Flip Klasik Mawar", fail: "flip", gaya: "mawar", pakej: "flip", warna: ["#FAEFEB", "#BF7F6B"], label: "asal",
      kata: { ms: "Manis, untuk majlis tengah hari.", en: "Sweet, for a midday majlis." },
      ms: "Merah jambu mawar dengan emas mawar. Masa mereka kad ini, kami terbayang khemah putih di laman rumah, bau nasi minyak, dan sepupu-sepupu beratur untuk bergambar.",
      en: "Rose pink with rose gold. While designing it we kept picturing a white canopy in the front yard, the smell of nasi minyak, and cousins queuing for photos." },
    { id: "flip-nila", nama: "Flip Klasik Nila", fail: "flip", gaya: "nila", pakej: "flip", warna: ["#1C2B4A", "#D5B062"], label: "asal",
      kata: { ms: "Tenang, untuk majlis waktu malam.", en: "Calm, for an evening do." },
      ms: "Biru nila yang dalam dengan sentuhan emas. Sesuai untuk resepsi malam atau majlis di hotel, bila anda mahu kad yang nampak matang walaupun ringkas.",
      en: "Deep indigo with touches of gold. Right for an evening reception or a hotel dinner, when you want something grown-up even though it's simple." },
    /*QW-KF*/
    {"id": "kf-zamrud", "nama": "Flip Zamrud", "fail": "kf-zamrud", "pakej": "flip", "warna": ["#0E3B32", "#C8A350"], "label": "melayu", "sumber": "zamrud", "hargaLalai": 4.9, "warnaFlip": [{"key": "zamrud", "nama": "Zamrud", "sw": ["#0E3B32", "#C8A350"]}, {"key": "pucuk-pisang", "nama": "Pucuk Pisang", "sw": ["#EEF1E4", "#2F5D4A"]}, {"key": "nila-diraja", "nama": "Nila Diraja", "sw": ["#13284A", "#C9A55B"]}, {"key": "manggis", "nama": "Manggis", "sw": ["#4B1D3F", "#D4A877"]}], "kata": {"ms": "Pintu gerbang pucuk rebung, dalam sekeping kad.", "en": "The pucuk rebung arch, in a single card."}, "ms": "Gerbang hijau zamrud dan emas di muka depan, butiran majlis tersusun kemas di belakang. Sesuai untuk kenduri di kampung yang mahu nampak tertib tanpa perlu kad panjang.", "en": "The emerald and gold arch on the front, the majlis details set neatly on the back. Good for a kampung kenduri that wants to look orderly without a long card."},
    {"id": "kf-batik", "nama": "Flip Batik", "fail": "kf-batik", "pakej": "flip", "warna": ["#1C2759", "#E8A33D"], "label": "melayu", "sumber": "batik", "hargaLalai": 4.9, "warnaFlip": [{"key": "nila", "nama": "Nila Kunyit", "sw": ["#1C2759", "#E8A33D"]}, {"key": "sogan", "nama": "Sogan", "sw": ["#4A2E1F", "#D7A04A"]}, {"key": "pesisir", "nama": "Pesisir Pagi", "sw": ["#FBF6EC", "#1C2759"]}, {"key": "serindit", "nama": "Serindit", "sw": ["#0F4B4A", "#F08A5D"]}], "kata": {"ms": "Corak canting di depan, alamat di belakang.", "en": "Canting patterns in front, the address behind."}, "ms": "Bunga raya dan daun yang dilukis macam batik tulis memenuhi muka depan. Terbalikkan kad, tetamu terus jumpa tarikh, masa dan butang peta.", "en": "Hibiscus and leaves drawn like hand-waxed batik fill the front. Turn it over and guests find the date, the time and the map button straight away."},
    {"id": "kf-royal-vow", "nama": "Flip The Royal Vow", "fail": "kf-royal-vow", "pakej": "flip", "warna": ["#5C1322", "#F2C230"], "label": "melayu", "sumber": "royal-vow", "hargaLalai": 4.9, "warnaFlip": [{"key": "merah-hati", "nama": "Merah Hati", "sw": ["#5C1322", "#F2C230"]}, {"key": "hitam-diraja", "nama": "Hitam Diraja", "sw": ["#17100B", "#F2C230"]}, {"key": "ungu-permaisuri", "nama": "Ungu Permaisuri", "sw": ["#3D1A4F", "#F2C230"]}, {"key": "biru-nobat", "nama": "Biru Nobat", "sw": ["#14285A", "#F2C230"]}], "kata": {"ms": "Mahkota kecil untuk majlis yang beradat.", "en": "A small crown for a majlis with ceremony."}, "ms": "Mohor lilin, jata dan bingkai berukir, seperti surat dari istana yang dihantar ke rumah. Empat warna diraja untuk dipilih, semuanya dalam sekeping kad.", "en": "A wax seal, a crest and a carved frame, like a letter from the palace delivered to the door. Four royal colours to choose from, all on one card."},
    {"id": "kf-adat-perpatih", "nama": "Flip Adat Perpatih", "fail": "kf-adat-perpatih", "pakej": "flip", "warna": ["#8B1E2D", "#C9A24A"], "label": "melayu", "sumber": "adat-perpatih", "hargaLalai": 4.9, "warnaFlip": [{"key": "merah-pelamin", "nama": "Merah Pelamin", "sw": ["#8B1E2D", "#C9A24A"]}, {"key": "hitam-songket", "nama": "Hitam Songket", "sw": ["#2A211C", "#D6B05A"]}, {"key": "hijau-sirih", "nama": "Hijau Sirih", "sw": ["#1E4D33", "#E3C77A"]}, {"key": "ungu-lembayung", "nama": "Ungu Lembayung", "sw": ["#4B2357", "#D6B263"]}], "kata": {"ms": "Pelamin dan tepak sirih, dilipat jadi sekeping.", "en": "The pelamin and the tepak sirih, folded into one card."}, "ms": "Muka depannya pelamin bertingkat dengan tepak sirih di hadapan, seperti majlis di Negeri Sembilan. Di belakang, nama keluarga dan tempat majlis ditulis dengan hormat.", "en": "The front is a tiered pelamin with the tepak sirih before it, like a wedding in Negeri Sembilan. On the back, the family names and the venue are written with due respect."},
    {"id": "kf-sakinah", "nama": "Flip Sakinah", "fail": "kf-sakinah", "pakej": "flip", "warna": ["#FDFDFB", "#8BA58A"], "label": "islamik", "sumber": "sakinah", "hargaLalai": 4.9, "warnaFlip": [{"key": "sage", "nama": "Sage", "sw": ["#FDFDFB", "#8BA58A"]}, {"key": "kabus", "nama": "Kabus Biru", "sw": ["#FBFCFD", "#8BA3B6"]}, {"key": "pasir", "nama": "Pasir", "sw": ["#FBF7F0", "#B89B76"]}, {"key": "malam-sage", "nama": "Malam Sage", "sw": ["#2E4733", "#D2B67A"]}], "kata": {"ms": "Tenang, macam selepas solat Maghrib.", "en": "Calm, like the quiet after Maghrib."}, "ms": "Gerbang mihrab yang lembut dan ayat yang ringkas di depan. Kad untuk pasangan yang mahu jemputan yang sopan dan menenangkan.", "en": "A soft mihrab arch and a short verse on the front. A card for couples who want an invitation that feels polite and settled."},
    {"id": "kf-qamar", "nama": "Flip Qamar", "fail": "kf-qamar", "pakej": "flip", "warna": ["#0F1A33", "#D9B56A"], "label": "islamik", "sumber": "qamar", "hargaLalai": 4.9, "warnaFlip": [{"key": "malam", "nama": "Malam", "sw": ["#0F1A33", "#D9B56A"]}, {"key": "subuh", "nama": "Subuh", "sw": ["#2A1B47", "#E6BE7C"]}, {"key": "zamrud-malam", "nama": "Zamrud Malam", "sw": ["#0B3533", "#D8B66B"]}, {"key": "gading-siang", "nama": "Gading Siang", "sw": ["#FBF6EA", "#1E2B4F"]}], "kata": {"ms": "Bulan sabit dan bintang, untuk majlis malam.", "en": "A crescent and stars, for an evening majlis."}, "ms": "Bulan sabit menggantung di atas nama anda, dengan bintang kecil bertaburan. Sesuai untuk resepsi selepas Isyak atau majlis di bawah khemah berlampu.", "en": "A crescent hangs above your names with small stars scattered around. Right for a reception after Isyak or a majlis under a lit canopy."},
    {"id": "kf-raudhah", "nama": "Flip Raudhah", "fail": "kf-raudhah", "pakej": "flip", "warna": ["#FBF8F1", "#5E7F55"], "label": "islamik", "sumber": "raudhah", "hargaLalai": 4.9, "warnaFlip": [{"key": "gading-hijau", "nama": "Gading Hijau", "sw": ["#FBF8F1", "#5E7F55"]}, {"key": "blush", "nama": "Mawar Blush", "sw": ["#FDF6F4", "#C9828E"]}, {"key": "biru-kabus", "nama": "Biru Kabus", "sw": ["#F6F8FA", "#7E98B3"]}, {"key": "hijau-malam", "nama": "Hijau Malam", "sw": ["#22362B", "#D2B67A"]}], "kata": {"ms": "Taman kecil yang berpagar doa.", "en": "A small garden fenced with prayer."}, "ms": "Kalungan bunga mengelilingi tarikh, dan gerbang taman menyambut tetamu di depan. Lembut, bersih dan mudah dibaca oleh mak cik dan pak cik.", "en": "A wreath of flowers circles the date, and a garden arch welcomes guests on the front. Soft, clean and easy for the aunties and uncles to read."},
    {"id": "kf-farhah", "nama": "Flip Farhah", "fail": "kf-farhah", "pakej": "flip", "warna": ["#1E9A9A", "#F0735A"], "label": "islamik", "sumber": "farhah", "hargaLalai": 4.9, "warnaFlip": [{"key": "firus", "nama": "Firus Karang", "sw": ["#1E9A9A", "#F0735A"]}, {"key": "delima", "nama": "Delima", "sw": ["#1F7A55", "#C8323C"]}, {"key": "lavender-limau", "nama": "Lavender Limau", "sw": ["#8C7BC4", "#F08FA8"]}, {"key": "malam-raya", "nama": "Malam Raya", "sw": ["#172446", "#F5BE45"]}], "kata": {"ms": "Gembira, macam riuh dapur rewang.", "en": "Cheerful, like the bustle of a rewang kitchen."}, "ms": "Pelita dan kain rentang berwarna-warni di muka depan, penuh rasa meriah. Untuk keluarga besar yang mahu kad ceria tetapi masih tertib.", "en": "Lanterns and colourful bunting on the front, full of festive noise. For big families who want a cheerful card that still keeps its manners."},
    {"id": "kf-minimalist-islamic", "nama": "Flip Minimalist Islamic", "fail": "kf-minimalist-islamic", "pakej": "flip", "warna": ["#FDFBF7", "#B08D57"], "label": "islamik", "sumber": "minimalist-islamic", "hargaLalai": 4.9, "warnaFlip": [{"key": "putih-dakwat", "nama": "Putih Dakwat", "sw": ["#FDFBF7", "#B08D57"]}, {"key": "hitam-emas", "nama": "Hitam Emas", "sw": ["#161514", "#C9A66B"]}, {"key": "zaitun", "nama": "Zaitun", "sw": ["#F5F4EC", "#5E6B3E"]}, {"key": "biru-tinta", "nama": "Biru Tinta", "sw": ["#F6F7F9", "#1F3557"]}], "kata": {"ms": "Satu baris khat, cukup untuk berkata semuanya.", "en": "One line of calligraphy says it all."}, "ms": "Barakallahu lakuma ditulis seperti dakwat yang baru kering, dengan nama anda di bawahnya. Kosong di tempat yang patut, jelas di tempat yang perlu.", "en": "Barakallahu lakuma is written like ink that has only just dried, with your names beneath it. Empty where it should be, clear where it matters."},
    {"id": "kf-elegance", "nama": "Flip Elegance", "fail": "kf-elegance", "pakej": "flip", "warna": ["#FFFDF9", "#6E1F2B"], "label": "klasik", "sumber": "elegance", "hargaLalai": 4.9, "warnaFlip": [{"key": "gading", "nama": "Gading Champagne", "sw": ["#FFFDF9", "#6E1F2B"]}, {"key": "merpati", "nama": "Kelabu Merpati", "sw": ["#F3F3F1", "#2B3B5F"]}, {"key": "hutan", "nama": "Hutan", "sw": ["#1F3A2E", "#D2B57E"]}, {"key": "bordeaux", "nama": "Bordeaux", "sw": ["#5A1A26", "#D9B77A"]}], "kata": {"ms": "Kemas dan bersahaja, macam baju kurung yang diseterika.", "en": "Neat and unfussy, like a freshly ironed baju kurung."}, "ms": "Bingkai halus, huruf serif yang tenang dan ruang yang lapang. Kad ini tidak bercakap kuat, tetapi tetamu tahu majlis ini diatur dengan baik.", "en": "A fine frame, calm serif lettering and plenty of room. This card doesn't raise its voice, but guests can tell the day was well arranged."},
    {"id": "kf-nirmala-biru", "nama": "Flip Nirmala Biru", "fail": "kf-nirmala-biru", "pakej": "flip", "warna": ["#FBFCFE", "#1F3F8F"], "label": "klasik", "sumber": "nirmala-biru", "hargaLalai": 4.9, "warnaFlip": [{"key": "kobalt", "nama": "Kobalt", "sw": ["#FBFCFE", "#1F3F8F"]}, {"key": "seladon", "nama": "Hijau Seladon", "sw": ["#F7FAF6", "#2F6B5A"]}, {"key": "merah-delima", "nama": "Merah Delima", "sw": ["#FFFBF8", "#8E2230"]}, {"key": "lakuer", "nama": "Lakuer", "sw": ["#18171B", "#C9A35A"]}], "kata": {"ms": "Pinggan biru putih dari almari nenek.", "en": "The blue and white plate from Nenek's cabinet."}, "ms": "Nama anda ditulis di tengah pinggan porselin, dengan bunga peoni di sudut kad. Empat warna sepuh untuk dipilih, dari kobalt hingga lakuer hitam.", "en": "Your names sit in the middle of a porcelain plate, with peonies in the corners. Four glazes to choose from, cobalt through to black lacquer."},
    {"id": "kf-vintage", "nama": "Flip Vintage", "fail": "kf-vintage", "pakej": "flip", "warna": ["#C4A075", "#9A3A2C"], "label": "klasik", "sumber": "vintage", "hargaLalai": 4.9, "warnaFlip": [{"key": "kraft", "nama": "Kraft Krim", "sw": ["#C4A075", "#9A3A2C"]}, {"key": "biru-pos", "nama": "Biru Pos", "sw": ["#F3F1EA", "#2F4E8C"]}, {"key": "lumut", "nama": "Hijau Lumut", "sw": ["#F1EEDF", "#5C6B2E"]}, {"key": "mawar-kering", "nama": "Mawar Kering", "sw": ["#F7EAE6", "#8A2E3B"]}], "kata": {"ms": "Sampul surat lama dengan cop pos.", "en": "An old envelope with a postmark."}, "ms": "Doily, setem dan cop pos menghiasi kad seperti surat yang disimpan dalam kotak biskut. Kad untuk pasangan yang suka barang lama.", "en": "A doily, a stamp and a postmark dress the card like a letter kept in a biscuit tin. For couples who like old things."},
    {"id": "kf-modern-minimalist", "nama": "Flip Modern Minimalist", "fail": "kf-modern-minimalist", "pakej": "flip", "warna": ["#F3EEE7", "#8C5E43"], "label": "moden", "sumber": "modern-minimalist", "hargaLalai": 4.9, "warnaFlip": [{"key": "pasir", "nama": "Pasir", "sw": ["#F3EEE7", "#8C5E43"]}, {"key": "batu", "nama": "Batu", "sw": ["#EEEFEC", "#5F6E66"]}, {"key": "terakota", "nama": "Terakota", "sw": ["#B86B4B", "#FBF3EA"]}, {"key": "arang", "nama": "Arang", "sw": ["#2E2B28", "#C99A7A"]}], "kata": {"ms": "Bersih, macam rumah yang baru dikemas.", "en": "Clean, like a house just tidied for guests."}, "ms": "Huruf besar, garisan nipis dan satu warna aksen. Kad ini untuk pasangan yang mahu semuanya jelas dalam sekali pandang.", "en": "Big letters, thin rules and one accent colour. This card is for couples who want everything clear at a glance."},
    {"id": "kf-avant-grande", "nama": "Flip Avant-Grande", "fail": "kf-avant-grande", "pakej": "flip", "warna": ["#F6F4EF", "#8E4E5C"], "label": "moden", "sumber": "avant-grande", "hargaLalai": 4.9, "warnaFlip": [{"key": "kertas-wine", "nama": "Kertas Wine", "sw": ["#F6F4EF", "#8E4E5C"]}, {"key": "noir", "nama": "Noir", "sw": ["#151515", "#C9A27E"]}, {"key": "zaitun", "nama": "Zaitun", "sw": ["#F3F2EA", "#6B7246"]}, {"key": "kobalt", "nama": "Kobalt", "sw": ["#F7F7F5", "#2F4FA8"]}], "kata": {"ms": "Macam muka depan majalah fesyen.", "en": "Like the cover of a fashion magazine."}, "ms": "Nama anda disusun seperti tajuk majalah, lengkap dengan kod bar dan nombor edisi. Berani, bergaya, dan tetap senang dibaca di telefon.", "en": "Your names are set like a magazine masthead, complete with a barcode and an issue number. Bold, stylish, and still easy to read on a phone."},
    {"id": "kf-rustic-boho", "nama": "Flip Rustic Boho", "fail": "kf-rustic-boho", "pakej": "flip", "warna": ["#F5EDE3", "#A5503A"], "label": "moden", "sumber": "rustic-boho", "hargaLalai": 4.9, "warnaFlip": [{"key": "terakota", "nama": "Terakota", "sw": ["#F5EDE3", "#A5503A"]}, {"key": "sage-boho", "nama": "Sage Boho", "sw": ["#F1F0E6", "#6E7D5A"]}, {"key": "mustard", "nama": "Mustard", "sw": ["#F7EEDC", "#B9822A"]}, {"key": "senja-gurun", "nama": "Senja Gurun", "sw": ["#3E2C27", "#E3A27E"]}], "kata": {"ms": "Pampas, terakota dan cahaya petang.", "en": "Pampas, terracotta and afternoon light."}, "ms": "Pasu tanah liat dengan rumput pampas berdiri di bawah gerbang boho. Sesuai untuk majlis di laman, di kafe atau di rumah kebun keluarga.", "en": "A clay vase of pampas stands under a boho arch. Right for a garden majlis, a café or the family's orchard house."},
    {"id": "kf-my-forever-person", "nama": "Flip My Forever Person", "fail": "kf-my-forever-person", "pakej": "flip", "warna": ["#EDB5D8", "#B83A62"], "label": "moden", "sumber": "my-forever-person", "hargaLalai": 4.9, "warnaFlip": [{"key": "senja", "nama": "Senja", "sw": ["#EDB5D8", "#B83A62"]}, {"key": "biru-fajar", "nama": "Biru Fajar", "sw": ["#A9B9F0", "#4D5BB0"]}, {"key": "keemasan", "nama": "Keemasan", "sw": ["#F7A86B", "#C2461E"]}, {"key": "malam-bintang", "nama": "Malam Bintang", "sw": ["#2A2560", "#F49AB8"]}], "kata": {"ms": "Manis dan bersahaja, macam nota dalam bekal.", "en": "Sweet and easy, like a note in a lunchbox."}, "ms": "Hati kecil, tulisan tangan dan warna lembut. Kad untuk pasangan yang mahu jemputan terasa mesra, bukan rasmi.", "en": "Little hearts, handwriting and soft colours. A card for couples who want the invitation to feel friendly rather than formal."},
    {"id": "kf-cottage-garden", "nama": "Flip Cottage Garden", "fail": "kf-cottage-garden", "pakej": "flip", "warna": ["#FBF7EE", "#A8525E"], "label": "taman", "sumber": "cottage-garden", "hargaLalai": 4.9, "warnaFlip": [{"key": "mawar", "nama": "Mawar Taman", "sw": ["#FBF7EE", "#A8525E"]}, {"key": "lavender", "nama": "Lavender", "sw": ["#F6F2F8", "#7A5A96"]}, {"key": "mentega", "nama": "Kuning Mentega", "sw": ["#FCF8EA", "#B07A1E"]}, {"key": "pic", "nama": "Pic", "sw": ["#FDF5EF", "#C0634A"]}], "kata": {"ms": "Taman bunga di belakang rumah, dalam sekeping kad.", "en": "A backyard flower garden, on one card."}, "ms": "Gerbang mawar, jalan kecil dan bunga cat air yang tumbuh di setiap sudut. Untuk majlis tengah hari yang ceria dan penuh warna.", "en": "A rose arch, a little path and watercolour flowers growing in every corner. For a bright, colourful midday majlis."},
    {"id": "kf-siluet-flora", "nama": "Flip Siluet Flora", "fail": "kf-siluet-flora", "pakej": "flip", "warna": ["#FCE9DA", "#3E2440"], "label": "taman", "sumber": "siluet-flora", "hargaLalai": 4.9, "warnaFlip": [{"key": "plum-senja", "nama": "Plum Senja", "sw": ["#FCE9DA", "#3E2440"]}, {"key": "biru-malam", "nama": "Biru Malam", "sw": ["#E6ECF4", "#22324F"]}, {"key": "hijau-hutan", "nama": "Hijau Hutan", "sw": ["#F1F0D6", "#2A4430"]}, {"key": "terakota", "nama": "Terakota", "sw": ["#FBE5CF", "#4E2618"]}], "kata": {"ms": "Padang bunga dari kertas yang ditebuk.", "en": "A meadow cut from paper."}, "ms": "Bunga, paku pakis dan wisteria berlapis-lapis macam kertas yang disinari dari belakang. Setiap warna terasa seperti lampu yang berbeza di waktu senja.", "en": "Flowers, ferns and wisteria layered like paper lit from behind. Each colour feels like a different lamp at dusk."},
    {"id": "kf-horizon", "nama": "Flip The Horizon", "fail": "kf-horizon", "pakej": "flip", "warna": ["#6F7FA3", "#F3D2AE"], "label": "taman", "sumber": "horizon", "hargaLalai": 4.9, "warnaFlip": [{"key": "fajar", "nama": "Fajar", "sw": ["#6F7FA3", "#F3D2AE"]}, {"key": "senja", "nama": "Senja", "sw": ["#6E3B5C", "#F09A62"]}, {"key": "hutan", "nama": "Hutan", "sw": ["#4E6E61", "#E8E3C4"]}, {"key": "salji", "nama": "Salji", "sw": ["#3E5578", "#E4ECF5"]}], "kata": {"ms": "Bersama menuju ufuk yang sama.", "en": "Heading for the same horizon."}, "ms": "Banjaran gunung berlapis kabus dan matahari yang baru naik di muka depan. Di belakang, tarikh anda terbit seperti separuh mentari di garisan ufuk.", "en": "Misty ranges and a rising sun on the front. On the back, your date rises like half a sun on the horizon line."},
    {"id": "kf-gilded-grove", "nama": "Flip Gilded Grove", "fail": "kf-gilded-grove", "pakej": "flip", "warna": ["#1F3126", "#D8BF8B"], "label": "taman", "sumber": "gilded-grove", "hargaLalai": 9.9, "warnaFlip": [{"key": "emas-senja", "nama": "Emas Senja", "sw": ["#1F3126", "#D8BF8B"]}, {"key": "fajar-mawar", "nama": "Fajar Mawar", "sw": ["#2B2130", "#E3B8A8"]}, {"key": "bulan-perak", "nama": "Bulan Perak", "sw": ["#18242A", "#C9D4DE"]}, {"key": "senja-ungu", "nama": "Senja Ungu", "sw": ["#24182E", "#DCC4A0"]}], "kata": {"ms": "Tingkap emas ke taman di waktu senja.", "en": "A gilded window onto a garden at dusk."}, "ms": "Di sebalik gerbang berbingkai emas ada tasik, pohon cemara dan jalan taman yang disinari matahari terbenam. Versi sekeping kad dari Gilded Grove, dengan empat suasana cahaya.", "en": "Behind a gilt-framed arch lie a lake, cypresses and a garden walk lit by the setting sun. The one-card version of Gilded Grove, in four kinds of light."},
    {"id": "kf-sunset-reverie", "nama": "Flip Sunset Reverie", "fail": "kf-sunset-reverie", "pakej": "flip", "warna": ["#F7C3CF", "#B85A74"], "label": "senja", "sumber": "sunset-reverie", "hargaLalai": 9.9, "warnaFlip": [{"key": "senja-pastel", "nama": "Senja Pastel", "sw": ["#F7C3CF", "#B85A74"]}, {"key": "fajar-biru", "nama": "Fajar Biru", "sw": ["#BFD8EE", "#3E6C96"]}, {"key": "senja-jingga", "nama": "Senja Jingga", "sw": ["#FFC9A6", "#C0582E"]}, {"key": "lembayung", "nama": "Lembayung", "sw": ["#D6C3EE", "#6E4C9A"]}], "kata": {"ms": "Belon udara di atas sawah ketika senja.", "en": "Balloons over the paddy fields at sunset."}, "ms": "Belon udara panas melayang di atas sawah, pokok kelapa dan rumah kampung. Kad yang terasa macam petang hujung minggu di Sekinchan.", "en": "Hot-air balloons drift over paddy, coconut palms and a kampung house. A card that feels like a weekend evening in Sekinchan."},
    {"id": "kf-velvet-emerald", "nama": "Flip Velvet Emerald", "fail": "kf-velvet-emerald", "pakej": "flip", "warna": ["#0F4A38", "#C9B183"], "label": "klasik", "sumber": "velvet-emerald", "hargaLalai": 9.9, "warnaFlip": [{"key": "zamrud", "nama": "Zamrud", "sw": ["#0F4A38", "#C9B183"]}, {"key": "merah-baldu", "nama": "Merah Baldu", "sw": ["#5E0F1E", "#D2B483"]}, {"key": "nilam-diraja", "nama": "Nilam Diraja", "sw": ["#14285E", "#CDB687"]}, {"key": "hitam-baldu", "nama": "Hitam Baldu", "sw": ["#1C1B1A", "#D4BC8A"]}], "kata": {"ms": "Tirai baldu dibuka, nama anda di pentas.", "en": "The velvet curtains part, your names on stage."}, "ms": "Pentas gelap dengan tirai baldu dan cahaya hijau zamrud, nama anda tegak di tengah. Untuk majlis malam di dewan atau hotel yang mahu rasa mewah tetapi tenang.", "en": "A dark stage, velvet curtains and an emerald glow, with your names standing in the middle. For an evening reception at a hall or hotel that wants to feel grand but quiet."},
    {"id": "kf-lavender-whisper", "nama": "Flip Lavender Whisper", "fail": "kf-lavender-whisper", "pakej": "flip", "warna": ["#E2D9F0", "#7662A4"], "label": "klasik", "sumber": "lavender-whisper", "hargaLalai": 9.9, "warnaFlip": [{"key": "lavender", "nama": "Lavender", "sw": ["#E2D9F0", "#7662A4"]}, {"key": "ros", "nama": "Ros", "sw": ["#F6E2E6", "#A8506E"]}, {"key": "biru-cornflower", "nama": "Biru Cornflower", "sw": ["#DDE6F4", "#3E5A9E"]}, {"key": "kuning-sawi", "nama": "Kuning Sawi", "sw": ["#F6EDCC", "#8A7A2A"]}], "kata": {"ms": "Ladang bunga dan mohor lilin.", "en": "A field in bloom and a wax seal."}, "ms": "Barisan bunga hingga ke kaki langit, rumah ladang kecil dan mohor lilin dengan huruf awal anda. Pilih ladang lavender, mawar, cornflower atau sawi kuning.", "en": "Rows of flowers to the horizon, a small farmhouse and a wax seal pressed with your initials. Choose lavender, roses, cornflowers or mustard flowers."},
    {"id": "kf-ember-noir", "nama": "Flip Ember Noir", "fail": "kf-ember-noir", "pakej": "flip", "warna": ["#1C1917", "#B45A2E"], "label": "senja", "sumber": "ember-noir", "hargaLalai": 9.9, "warnaFlip": [{"key": "bara", "nama": "Bara", "sw": ["#1C1917", "#B45A2E"]}, {"key": "lumut", "nama": "Lumut", "sw": ["#181D17", "#A8905A"]}, {"key": "anggur", "nama": "Anggur", "sw": ["#1E1215", "#C08A7A"]}, {"key": "dakwat-biru", "nama": "Dakwat Biru", "sw": ["#141925", "#A7B0BE"]}], "kata": {"ms": "Lilin dinyalakan di dalam relung gelap.", "en": "A candle lit in a dark niche."}, "ms": "Nama anda di dalam relung berbingkai tembaga, dengan sebatang lilin yang menyala sendiri bila kad dibuka. Untuk majlis malam yang mahukan suasana hangat.", "en": "Your names sit in a copper-lined niche, with a candle that lights itself when the card opens. For an evening majlis that wants a warm mood."},
    {"id": "kf-sage-harbor", "nama": "Flip Sage Harbor", "fail": "kf-sage-harbor", "pakej": "flip", "warna": ["#FCFAF5", "#66775F"], "label": "taman", "sumber": "sage-harbor", "hargaLalai": 9.9, "warnaFlip": [{"key": "sage", "nama": "Sage", "sw": ["#FCFAF5", "#66775F"]}, {"key": "biru-pelabuhan", "nama": "Biru Pelabuhan", "sw": ["#FAFBFC", "#4E6A82"]}, {"key": "terakota-senja", "nama": "Terakota Senja", "sw": ["#FDF8F3", "#A55E44"]}, {"key": "lavender-kabut", "nama": "Lavender Kabut", "sw": ["#FBFAFC", "#76668E"]}], "kata": {"ms": "Pelabuhan berkabus di waktu subuh.", "en": "A misty harbour at first light."}, "ms": "Gerbang berbingkai emas membuka pemandangan pelabuhan yang tenang, dengan dahan kayu putih dan zaitun di ambangnya. Lembut, lapang dan mudah dibaca.", "en": "A gilt-framed arch opens onto a quiet harbour, with eucalyptus and olive at its sill. Soft, airy and easy to read."},
    {"id": "kf-midnight-amethyst", "nama": "Flip Midnight Amethyst", "fail": "kf-midnight-amethyst", "pakej": "flip", "warna": ["#1A0E28", "#CDB98F"], "label": "malam", "sumber": "midnight-amethyst", "hargaLalai": 9.9, "warnaFlip": [{"key": "ametis", "nama": "Ametis", "sw": ["#1A0E28", "#CDB98F"]}, {"key": "nilam", "nama": "Nilam", "sw": ["#0E1A30", "#C9D2DE"]}, {"key": "zamrud-malam", "nama": "Zamrud Malam", "sw": ["#0E2620", "#CDB98F"]}, {"key": "delima", "nama": "Delima", "sw": ["#2A0E16", "#DDB0A0"]}], "kata": {"ms": "Taman istana di bawah bulan purnama.", "en": "A palace garden under a full moon."}, "ms": "Kolam memantulkan cahaya bulan di antara pokok cemara, dan istana berkubah menunggu di hujungnya. Pilih ametis, nilam, zamrud atau delima untuk malam anda.", "en": "A pool carries the moonlight between cypresses, with a domed palace waiting at the end. Choose amethyst, sapphire, emerald or garnet for your night."},
    {"id": "kf-ember-roman", "nama": "Flip Ember Roman", "fail": "kf-ember-roman", "pakej": "flip", "warna": ["#F3CFBB", "#A5472E"], "label": "senja", "sumber": "ember-roman", "hargaLalai": 9.9, "warnaFlip": [{"key": "senja-roma", "nama": "Senja Roma", "sw": ["#F3CFBB", "#A5472E"]}, {"key": "fajar-aegean", "nama": "Fajar Aegean", "sw": ["#D2DFEA", "#3E5E8C"]}, {"key": "zaitun", "nama": "Zaitun", "sw": ["#ECEACF", "#5C6A3C"]}, {"key": "malam-obor", "nama": "Malam Obor", "sw": ["#2C2D52", "#E8865A"]}], "kata": {"ms": "Kuil marmar di waktu senja.", "en": "A marble temple at ember hour."}, "ms": "Tiang, kalungan daun dan unggun api di kiri kanan kuil, dengan pagar berbunga di kaki kad. Versi sekeping kad yang disusun seperti kad cetak Ember Roman.", "en": "Columns, laurel garlands and braziers either side of the temple, with a flowering balustrade at the foot. The one-card version, laid out like Ember Roman's printed card."},
    {"id": "kf-nocturne-garden", "nama": "Flip Nocturne Garden", "fail": "kf-nocturne-garden", "pakej": "flip", "warna": ["#2F2A6A", "#F4C6D8"], "label": "malam", "sumber": "nocturne-garden", "hargaLalai": 9.9, "warnaFlip": [{"key": "wisteria-malam", "nama": "Wisteria Malam", "sw": ["#2F2A6A", "#F4C6D8"]}, {"key": "biru-senja", "nama": "Biru Senja", "sw": ["#22355E", "#F6D3BE"]}, {"key": "mawar-senja", "nama": "Mawar Senja", "sw": ["#5A2A50", "#F6D1D9"]}, {"key": "perak-embun", "nama": "Perak Embun", "sw": ["#2E3646", "#DDE3EC"]}], "kata": {"ms": "Wisteria tergantung, bulan mengintai.", "en": "Wisteria hanging, the moon peeking through."}, "ms": "Bunga wisteria berjuntai dari atas, bulan putih di tengah dan taman bunga bulan di bawah. Kad malam yang lembut, sesuai untuk majlis di laman.", "en": "Wisteria trails from the top, a pale moon in the middle and a bed of moonflowers below. A soft night card, right for a garden majlis."},
    {"id": "kf-midnight-tide", "nama": "Flip Midnight Tide", "fail": "kf-midnight-tide", "pakej": "flip", "warna": ["#2F3B6A", "#F4CFC6"], "label": "malam", "sumber": "midnight-tide", "hargaLalai": 9.9, "warnaFlip": [{"key": "malam-biru", "nama": "Malam Biru", "sw": ["#2F3B6A", "#F4CFC6"]}, {"key": "senja-ungu", "nama": "Senja Ungu", "sw": ["#4A2F6A", "#F6D6BE"]}, {"key": "laut-teal", "nama": "Laut Teal", "sw": ["#1E4A55", "#F8D2B4"]}, {"key": "bulan-emas", "nama": "Bulan Emas", "sw": ["#1C2546", "#E6C68A"]}], "kata": {"ms": "Pesanan dalam botol di pantai berbulan.", "en": "A message in a bottle on a moonlit shore."}, "ms": "Laut malam dengan rumah api, cahaya bulan di atas ombak dan kulit kerang di pasir. Untuk majlis di tepi pantai atau pasangan yang suka laut.", "en": "A night sea with a lighthouse, moonlight on the waves and shells on the sand. For a beach majlis, or a couple who loves the sea."},

    { id: "zamrud", nama: "Zamrud", pakej: "basic", warna: ["#0E3B32", "#C8A350"], label: "melayu", hero: true,
      kata: { ms: "Seperti pintu rumah pusaka dibuka untuk tetamu.", en: "Like the family home opening its doors to guests." },
      ms: "Gerbang pucuk rebung di sampulnya terbuka perlahan, seperti pintu rumah pusaka pada hari kenduri. Hijau zamrud dan emas di atas gading. Kalau anda mahu majlis yang terasa Melayu, kemas dan beradab, mulakan di sini.",
      en: "The pucuk rebung arch on the cover opens slowly, like the doors of an old family house on kenduri day. Emerald and gold on ivory. If you want a day that feels Malay, neat and well-mannered, start here." },
    { id: "batik", nama: "Batik", pakej: "basic", warna: ["#1C2759", "#E8A33D"], label: "melayu",
      kata: { ms: "Dilukis garis demi garis, macam canting.", en: "Drawn line by line, like a canting." },
      ms: "Bunga raya di sampulnya melukis dirinya sendiri, garis demi garis, seperti tangan pembatik dengan canting. Nila dan kunyit yang hangat. Kami reka untuk sesiapa yang membesar dengan kain batik mak di ampaian.",
      en: "The hibiscus on the cover draws itself line by line, the way a batik maker works with a canting. Warm indigo and turmeric. We made it for anyone who grew up with their mother's batik sarongs on the clothesline." },
    { id: "royal-vow", nama: "The Royal Vow", pakej: "basic", warna: ["#5C1322", "#F2C230"], label: "melayu", hero: true,
      kata: { ms: "Raja sehari, betul-betul.", en: "Raja sehari, properly." },
      ms: "Mahkota emas, merah hati, dan warkah diraja yang diikat reben, menunggu dibuka. Kad ini memang tak segan untuk meraikan. Sesuai untuk majlis yang ada kompang, bunga manggar dan pelamin yang megah.",
      en: "A gold crown, deep maroon, and a royal scroll tied in ribbon, waiting to be opened. This card isn't shy about celebrating. Made for a majlis with kompang, bunga manggar and a grand pelamin." },
    { id: "adat-perpatih", nama: "Adat Perpatih", pakej: "basic", warna: ["#8B1E2D", "#C9A24A"], label: "melayu",
      kata: { ms: "Dari Negeri Sembilan, dengan adatnya.", en: "From Negeri Sembilan, customs and all." },
      ms: "Tepak sirih dengan sirih junjung, pelamin bertirai emas dan bunga manggar, dengan perbilangan adat di sampulnya. Untuk keluarga yang mahu adat itu nampak di mata tetamu, bukan sekadar disebut dalam ucapan.",
      en: "A tepak sirih with sirih junjung, a gold-curtained pelamin and bunga manggar, with the old adat saying on its cover. For families who want their customs seen by every guest, not just mentioned in a speech." },
    { id: "sakinah", nama: "Sakinah", pakej: "basic", warna: ["#EEF3EC", "#8BA58A"], label: "islamik", hero: true,
      kata: { ms: "Tenang, seperti doa selepas solat.", en: "Quiet, like a prayer after solat." },
      ms: "Putih dan hijau sage, dengan gerbang mihrab yang melukis dirinya perlahan-lahan. Di dalamnya ada Surah Ar-Rum ayat 21, tentang ketenangan, kasih dan rahmat. Lembut, tidak meriah, dan penuh doa.",
      en: "White and sage, with a mihrab arch that slowly draws itself. Inside is Surah Ar-Rum, verse 21, on tranquillity, love and mercy. Gentle rather than festive, and full of prayer." },
    { id: "qamar", nama: "Qamar", pakej: "basic", warna: ["#0F1A33", "#D9B56A"], label: "islamik",
      kata: { ms: "Bulan sabit dan tanglung yang menyala.", en: "A crescent moon and glowing lanterns." },
      ms: "Langit malam, bulan sabit dan tanglung fanous yang bergantung di atas siluet masjid. Rasanya macam malam raya yang tenang. Pilihan yang cantik kalau majlis anda selepas Maghrib, atau anda memang suka suasana malam yang damai.",
      en: "A night sky, a crescent and fanous lanterns hanging above a mosque silhouette. It feels like a peaceful night before Raya. A lovely pick if your majlis is after Maghrib, or you simply love calm nights." },
    { id: "raudhah", nama: "Raudhah", pakej: "basic", warna: ["#FBF8F1", "#5E7F55"], label: "islamik",
      kata: { ms: "Taman kecil yang wangi melur.", en: "A small garden that smells of jasmine." },
      ms: "Gerbang mawar dan melur putih, dengan kelopak yang gugur bila jemputan dibuka. Ada Surah Yasin ayat 36, tentang segala yang dicipta berpasangan. Kami bayangkan majlis di laman, di bawah pokok rendang, pada petang yang redup.",
      en: "An arch of roses and white jasmine, with petals falling as the invitation opens. It carries Surah Yasin, verse 36, about all things created in pairs. We pictured a garden majlis under a shady tree on a cool afternoon." },
    { id: "farhah", nama: "Farhah", pakej: "basic", warna: ["#1E9A9A", "#F0735A"], label: "islamik",
      kata: { ms: "Ceria, macam pagi raya.", en: "Cheerful, like the morning of Raya." },
      ms: "Panji-panji, konfeti bintang, dan mozek firus, karang serta kunyit. Kad yang tersenyum dari mula. Di dalamnya ada Surah Al-Furqan ayat 74, doa untuk pasangan yang menjadi penyejuk mata. Untuk majlis yang riuh dengan gelak tawa.",
      en: "Bunting, star confetti and a mosaic of turquoise, coral and saffron. A card that smiles from the start. Inside is Surah Al-Furqan, verse 74, the prayer for a spouse who is the coolness of one's eyes. Made for a majlis full of laughter." },
    { id: "minimalist-islamic", nama: "Minimalist Islamic", pakej: "basic", warna: ["#FDFBF7", "#B08D57"], label: "islamik",
      kata: { ms: "Sedikit hiasan, banyak makna.", en: "Little decoration, lots of meaning." },
      ms: "Hanya kertas putih, dakwat hitam dan kaligrafi Barakallahu lakuma, ‘semoga Allah memberkati kalian berdua’. Tiada bunga, tiada bingkai berat. Kadang-kadang, doa itu sendiri sudah cukup indah.",
      en: "Just white paper, black ink and the calligraphy Barakallahu lakuma, ‘may Allah bless you both’. No flowers, no heavy frames. Sometimes the prayer is beautiful enough on its own." },
    { id: "elegance", nama: "Elegance", pakej: "basic", warna: ["#F6F1E8", "#6E1F2B"], label: "klasik", hero: true,
      kata: { ms: "Meterai lilin, dan sedikit debar.", en: "A wax seal, and a little flutter." },
      ms: "Sampul gading dengan meterai lilin berhuruf awal nama anda berdua. Tetamu tekan meterai itu, dan kad keluar perlahan-lahan. Klasik dalam erti kata sebenar: kad yang tebal, tulisan berangkai, dan rasa tak sabar nak membaca.",
      en: "An ivory envelope sealed with wax and both your initials. Guests press the seal and the card slides out. Classic in the truest sense: heavy card, flowing script, and that small impatience to read." },
    { id: "nirmala-biru", nama: "Nirmala Biru", pakej: "basic", warna: ["#1F3F8F", "#EEF3FB"], label: "klasik",
      kata: { ms: "Macam pinggan porselin kesayangan nenek.", en: "Like Grandma's favourite porcelain." },
      ms: "Biru kobalt di atas putih, dengan bunga peoni dan jalur teratai, seperti pinggan porselin yang hanya dikeluarkan bila ada tetamu istimewa. Bersih, tenang dan sedikit nostalgik.",
      en: "Cobalt blue on white, with peonies and a lotus band, like the porcelain plates that only come out for special guests. Clean, calm and a little nostalgic." },
    { id: "vintage", nama: "Vintage", pakej: "basic", warna: ["#C4A075", "#9A3A2C"], label: "klasik",
      kata: { ms: "Surat lama yang diikat tali rami.", en: "An old letter tied with twine." },
      ms: "Kertas kraf, renda, tali rami dan tulisan mesin taip. Setemnya ada huruf awal nama anda, cop posnya pula tarikh majlis. Anda jenis yang suka kedai barang lama, piring hitam dan surat tulisan tangan? Kad ini untuk anda.",
      en: "Kraft paper, lace, twine and typewriter type. The stamp carries your initials and the postmark is your wedding date. Love thrift shops, vinyl and handwritten letters? This one's yours." },
    { id: "modern-minimalist", nama: "Modern Minimalist", pakej: "basic", warna: ["#F3EEE7", "#8C5E43"], label: "moden",
      kata: { ms: "Tenang, tanpa cuba terlalu keras.", en: "Calm, without trying too hard." },
      ms: "Warna tanah yang hangat, satu ranting zaitun bergaris halus, dan banyak ruang untuk bernafas. Nama dewan pun diletak di sampul. Rasanya macam rumah yang kemas dan kafe yang sunyi pada pagi Ahad.",
      en: "Warm earth tones, one fine olive branch and plenty of room to breathe. Even the venue name sits on the cover. It feels like a tidy home and a quiet café on a Sunday morning." },
    { id: "avant-grande", nama: "Avant-Grande", pakej: "basic", warna: ["#111111", "#8E4E5C"], label: "moden",
      kata: { ms: "Anda berdua di muka depan majalah.", en: "The two of you, on the cover." },
      ms: "‘YOU’RE INVITED’ di atas, nama anda di tengah, dan nombor edisi serta kod bar yang diambil daripada tarikh majlis. Gaya majalah fesyen yang berani dan sedikit nakal, untuk pasangan yang tak kisah jadi tajuk utama.",
      en: "‘YOU’RE INVITED’ across the top, your names in the middle, and an issue number and barcode taken from your wedding date. A bold, slightly cheeky fashion-magazine look, for couples who don't mind being the headline." },
    { id: "rustic-boho", nama: "Rustic Boho", pakej: "basic", warna: ["#F5EDE3", "#A5503A"], label: "moden", hero: true,
      kata: { ms: "Santai, macam majlis di laman belakang.", en: "Relaxed, like a backyard majlis." },
      ms: "Rumput pampas dalam pasu tanah liat, daun palma dan lengkung pelangi terakota, dengan nama dewan di sampul. Bayangkan majlis di ladang, di kafe, atau di laman rumah dengan lampu kelip-kelip bila hari mula gelap.",
      en: "Pampas grass in a clay vase, palm fans and terracotta rainbow arches, with your venue on the cover. Think farm, café or backyard, with fairy lights coming on as the evening falls." },
    { id: "my-forever-person", nama: "My Forever Person", pakej: "basic", warna: ["#4A2748", "#FFBFC4"], label: "moden",
      kata: { ms: "Hingga ke Jannah, insya-Allah.", en: "Till Jannah, insya-Allah." },
      ms: "Langit senja yang bertukar malam perlahan-lahan semasa tetamu menatal, dengan hati dan kelopak yang terapung. Kad ini memang sentimental, dan tak cuba menyembunyikannya. Kalau anda berdua selalu panggil satu sama lain ‘my person’, anda faham.",
      en: "A sunset sky that slowly turns to dusk as guests scroll, with hearts and petals drifting by. It's openly sentimental and doesn't pretend otherwise. If you two call each other ‘my person’, you already get it." },
    { id: "cottage-garden", nama: "Cottage Garden", pakej: "basic", warna: ["#FBF7EE", "#A8525E"], label: "taman",
      kata: { ms: "Pintu pagar taman yang sedang berbunga.", en: "A garden gate in full bloom." },
      ms: "Pintu pagar kayu putih dengan bunga cat air yang menjalar di gerbangnya. Setiap kelopak dilukis, bukan gambar. Rasanya macam petang di rumah kampung yang penuh bunga, lembut dan sedikit romantik.",
      en: "A white wooden gate with watercolour flowers climbing over its arch. Every petal is painted, not photographed. It feels like a late afternoon at a kampung house full of flowers, soft and a little romantic." },
    { id: "siluet-flora", nama: "Siluet Flora", pakej: "basic", warna: ["#3E2440", "#D9A9B9"], label: "taman",
      kata: { ms: "Bunga-bunga yang bercerita dalam bayang.", en: "Flowers that tell their story in shadow." },
      ms: "Siluet bunga potongan kertas berwarna plum, dengan cahaya hangat di belakangnya seperti padang bunga waktu matahari terbenam. Lembut, tapi ada dramanya. Romantik tanpa terlalu manis.",
      en: "Plum papercut flowers against a warm glow, like a meadow at sundown. Soft, with a little drama. Romantic without being too sweet." },
    { id: "horizon", nama: "The Horizon", pakej: "basic", warna: ["#2F3F5C", "#F2C7A5"], label: "taman",
      kata: { ms: "Bersama menuju ufuk yang sama.", en: "Together, towards the same horizon." },
      ms: "Banjaran gunung berkabus dan matahari yang naik perlahan di sebalik kabus pagi. Untuk anda berdua yang suka mendaki, suka perjalanan jauh, atau baru sahaja memulakan perjalanan paling panjang dalam hidup.",
      en: "Misty mountain ranges and a sun rising slowly through the morning haze. For two people who love hiking, long drives, or who are just setting off on the longest journey of their lives." },

    { id: "gilded-grove", nama: "Gilded Grove", pakej: "premium", warna: ["#15201A", "#B8975A"], label: "taman", hero: true,
      kata: { ms: "Masuk ke taman rahsia, waktu petang keemasan.", en: "Into a hidden garden at golden hour." },
      ms: "Gerbang batu berlumut membuka pemandangan tasik pada waktu petang. Dari situ, tetamu berjalan dari satu sudut taman ke sudut lain: pintu pagar, jam matahari, batu loncatan. Seperti dijemput ke sebuah estet lama yang anggun, khas untuk hari anda.",
      en: "A mossy stone arch opens onto a lake at golden hour. From there, guests walk from one corner of the garden to the next: a gate, a sundial, stepping stones. Like being invited to a graceful old estate, just for your day." },
    { id: "sunset-reverie", nama: "Sunset Reverie", pakej: "premium", warna: ["#FFD3B6", "#B85A74"], label: "senja", hero: true,
      kata: { ms: "Senja di sawah padi, dari petang ke malam.", en: "Sunset over the paddy, afternoon to dusk." },
      ms: "Belon udara panas terbang dari sawah padi, dan sepanjang tetamu menyelak, matahari benar-benar terbenam: petang keemasan di halaman pertama, kelip-kelip di halaman terakhir. Pohon kelapa, rumah kampung di kaki langit. Manis, dan sangat Malaysia.",
      en: "A hot-air balloon lifts off over the paddy, and as guests turn the pages the sun really sets: golden afternoon on the first page, fireflies by the last. Coconut palms and a kampung house on the horizon. Sweet, and very Malaysian." },
    { id: "velvet-emerald", nama: "Velvet Emerald", pakej: "premium", warna: ["#0F4A38", "#C9B183"], label: "klasik",
      kata: { ms: "Tirai baldu dibuka, lampu sorot menyala.", en: "The curtains part, the spotlight comes on." },
      ms: "Dua tirai baldu hijau zamrud tersingkap, dan tetamu melangkah masuk ke sebuah salun peribadi. Tipografi gaya majalah fesyen, kotak cincin baldu untuk salam kaut, kad tempat duduk yang berdiri selepas RSVP. Mewah, tapi senyap.",
      en: "Two emerald velvet curtains draw back and guests step into a private salon. Fashion-magazine type, a velvet ring box for money gifts, a place card that stands up after RSVP. Luxurious, but quiet." },
    { id: "lavender-whisper", nama: "Lavender Whisper", pakej: "premium", warna: ["#7662A4", "#ECE6F4"], label: "klasik",
      kata: { ms: "Surat cinta, diikat dengan lavender.", en: "Love letters, tied with lavender." },
      ms: "Reben satin terlerai, meterai lilin retak, dan sepucuk surat keluar dari sampul. Setiap halaman ialah surat yang berbeza, dengan nota tulisan tangan yang berbisik. Masih simpan nota-nota kecil dari awal perkenalan? Kad ini faham perasaan itu.",
      en: "The satin ribbon slips, the wax seal cracks, and a letter rises from the envelope. Every page is a different letter, with little handwritten whispers. Still keep the notes from when you first met? This card understands." },
    { id: "ember-noir", nama: "Ember Noir", pakej: "premium", warna: ["#1C1917", "#B45A2E"], label: "senja",
      kata: { ms: "Nyalakan lilin, dan majlis bermula.", en: "Light the candle, and it begins." },
      ms: "Sampulnya gelap, hanya ada sebatang lilin yang belum menyala. Tetamu menyentuhnya, api hidup, dan nama anda perlahan-lahan bercahaya. Setiap babak dibuka oleh sapuan cahaya yang hangat. Intim, seperti makan malam berlampu malap.",
      en: "The cover is dark, with one unlit candle. Guests touch it, the flame catches, and your names slowly start to glow. Each scene is uncovered by a sweep of warm light. Intimate, like a candlelit dinner." },
    { id: "sage-harbor", nama: "Sage Harbor", pakej: "premium", warna: ["#C5D2D7", "#66775F"], label: "taman",
      kata: { ms: "Pelabuhan sunyi, waktu subuh.", en: "A quiet harbour at first light." },
      ms: "Sentuh meterai emas, matahari naik di jendela, dan sampul terbuka seperti kulit buku. Setiap halaman diselak seperti kertas tebal yang mahal, dengan garisan halus yang melukis dirinya. Tenang, kemas, dan dibuat dengan penuh sabar.",
      en: "Touch the gold seal, the sun rises in the window, and the cover opens like a book. Each page turns like heavy, beautiful paper, with fine lines that draw themselves. Calm, considered, made with patience." },
    { id: "midnight-amethyst", nama: "Midnight Amethyst", pakej: "premium", warna: ["#4B1C48", "#8D6FB8"], label: "malam", hero: true,
      kata: { ms: "Taman istana, di bawah bulan tengah malam.", en: "A palace garden under the midnight moon." },
      ms: "Di sebalik gerbang batu: istana berkubah, kolam yang memantulkan bulan, dan barisan pokok cemara. Bulan di kaki kad pula membesar dari sabit ke purnama sepanjang tetamu membaca. Misteri, romantik dan sedikit diraja, tapi tetap moden.",
      en: "Beyond a stone arch: a domed palace, a pool holding the moon, rows of cypress trees. A moon at the foot of the card grows from crescent to full as guests read. Mysterious, romantic and a little regal, yet still modern." },
    { id: "ember-roman", nama: "Ember Roman", pakej: "premium", warna: ["#D9785A", "#FBF4EC"], label: "senja",
      kata: { ms: "Vila lama, waktu senja yang hangat.", en: "An old villa on a warm evening." },
      ms: "Pintu kuil terbuka, dan bara kecil naik perlahan ke langit senja. Setiap halaman ialah papan marmar bernombor Rom, tersusun seperti tiang kolonad. Hangat dan klasik, untuk hati yang ada sedikit rindu pada Eropah lama.",
      en: "Temple doors swing open and small embers drift up into the sunset. Each page is a marble tablet with a Roman numeral, lined up like a colonnade. Warm and classical, for hearts with a soft spot for old Europe." },
    { id: "nocturne-garden", nama: "Nocturne Garden", pakej: "premium", warna: ["#1D1E4B", "#C9B8EF"], label: "malam",
      kata: { ms: "Taman bulan, wisteria dan kelip-kelip.", en: "A moonlit garden of wisteria and fireflies." },
      ms: "Bulan purnama, wisteria yang berbuai dan kelip-kelip di taman malam. Tetamu menyelak halaman seperti mengagih kad, dan bulan bergerak merentas langit sepanjang mereka membaca. Lembut dan penuh harapan, macam malam sebelum hari bahagia.",
      en: "A full moon, swaying wisteria and fireflies in a night garden. Guests deal through the pages like cards, and the moon crosses the sky as they read. Soft and hopeful, like the night before the big day." },
    { id: "midnight-tide", nama: "Midnight Tide", pakej: "premium", warna: ["#2B3560", "#A8E0D4"], label: "malam",
      kata: { ms: "Pesanan dalam botol, di laut berbulan.", en: "A message in a bottle, on a moonlit sea." },
      ms: "Sebuah botol di pantai malam, gabusnya tercabut, dan gulungan surat terapung keluar. Halaman naik dari bawah seperti air pasang, sementara rumah api berputar di kejauhan. Untuk yang bertemu di tepi laut, atau yang rasa tenang setiap kali dengar ombak.",
      en: "A bottle on a moonlit beach, the cork pops, and a rolled letter floats out. Pages rise from below like the tide while a lighthouse turns in the distance. For those who met by the sea, or feel calmer whenever they hear waves." }
  ];
  const SLOT_PREMIUM = 0; // "Akan datang" placeholders shown until there are this many premium templates
  // style filters ("label" in TEMA) for each tier, in the order the chips appear
  const GAYA = { basic: ["islamik", "melayu", "klasik", "moden", "taman"], premium: ["malam", "senja", "taman", "klasik"], flip: ["asal", "islamik", "melayu", "klasik", "moden", "taman", "malam", "senja"] };

  /* sample details: shown in the preview wherever a field is still empty */
  const SAMPLE = {
    anak: { panggilan: "Sarah", penuh: "Nur Sarah binti Kamal" },
    pasangan: { panggilan: "Aiman", penuh: "Muhammad Aiman bin Rosli" },
    tuanRumah: ["Kamal bin Hashim", "Rohana binti Ismail"],
    tarikh: "2026-12-12", mula: "11:00", tamat: "16:00", hijri: "2 Rejab 1448H",
    lokasi: { nama: "Dewan Seri Melati", alamat: "Lot 12, Jalan Melati 7/3, Seksyen 7, 40000 Shah Alam, Selangor", nota: "Tempat letak kereta percuma di belakang dewan." },
    aturcara: [["11:00", "Ketibaan tetamu & jamuan makan"], ["12:30", "Ketibaan pengantin"], ["13:00", "Acara merenjis & sesi bergambar"], ["16:00", "Majlis bersurai"]],
    hubungi: [
      { nama: "Kamal bin Hashim", peranan: "Bapa pengantin perempuan", nombor: "60123456789" },
      { nama: "Rosli bin Ahmad", peranan: "Bapa pengantin lelaki", nombor: "60198765432" }
    ],
    tajuk: "Walimatul Urus",
    galeri: ["Pertama kali bertemu", "Hari merisik", "Sebentuk cincin", "Majlis pertunangan", "Bersama keluarga", "Petang yang tenang", "Menuju hari bahagia"],
    hadiah: { bank: "Maybank", nama: "NUR SARAH BINTI KAMAL", akaun: "1620 1234 5678" }
  };
  const MAKS_GALERI = 7;

  const HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
  const BULAN = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
  const BULAN_H = ["Muharam", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir", "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijah"];

  /* ---------- 4. TEXT (BM lives in the HTML; EN here; JS-only strings in both) ---------- */
  const I18N = {
    ms: {
      "label.islamik": "Islamik", "label.melayu": "Warisan Melayu", "label.klasik": "Klasik", "label.moden": "Moden", "label.taman": "Taman & alam",
      "label.flip": "Kad Flip", "label.asal": "Asal", "label.premium": "Premium", "tapis.semua": "Semua",
      "tema.dipilih": "Dipilih", "tema.cubaAria": "Cuba kad {tema}",
      "tl.slot": "Kad Premium {n}",
      "modal.pilih": "Pilih kad ini", "modal.kembali": "Kembali ke borang",
      "gagal": "Pratonton tidak dapat dimuatkan. Buka halaman ini dari alamat laman web, bukan dari fail yang disimpan.",
      "err.tajuk": "Sila betulkan perkara ini sebelum menghantar:",
      "err.wajib": "Isi {medan}.",
      "err.tarikhLepas": "Tarikh majlis sudah berlalu.",
      "err.tamat": "Masa tamat mesti selepas masa mula.",
      "err.akhir": "Tarikh akhir RSVP mesti pada atau sebelum tarikh majlis.",
      "err.url": "{medan} mesti pautan yang bermula dengan https://",
      "err.aturcara": "Tambah sekurang-kurangnya satu acara dengan masa dan nama acara.",
      "err.aturcaraSeparuh": "Setiap acara perlukan masa dan nama acara.",
      "err.hubungi": "Tambah sekurang-kurangnya seorang untuk dihubungi, dengan nama dan nombor telefon.",
      "err.hubungiNo": "Semak nombor telefon {nama}.",
      "err.akaun": "No. akaun mesti nombor sahaja, 6 hingga 20 digit.",
      "lepas.tajuk": "Langkah seterusnya",
      "lepas.kedai": "Nombor WhatsApp kedai belum ditetapkan, jadi WhatsApp tidak dibuka. Salin kod pesanan di bawah dan hantar kepada kami.",
      "lepas.1": "Tekan Hantar di WhatsApp untuk menghantar pesanan anda.",
      "salin": "Salin", "disalin": "Disalin",
      "r.kosong": "Belum diisi",
      "bina.langkah": "Langkah {n} daripada {jumlah}",
      "pakej.label": "Pakej {nama} · {harga}",
      "pakej.pilih": "Pilih pakej", "pakej.dipilih": "Dipilih",
      "nota.flip": "Kad Flip ada 4 pilihan warna. Warna boleh ditukar sebelum kad diterbitkan.",
      "nota.basic": "Pakej Basic menggunakan 19 kad Basic.",
      "nota.premium": "Pakej ini menggunakan 10 kad Premium berhalaman.",
      "notis.flip": "Kad Flip tiada RSVP. Tetamu ketuk kad untuk melihat butiran dan membuka Google Maps.",
      "notis.basic": "Bersama pautan kad, kami hantar ID pemilik untuk membuka senarai RSVP di dalam kad anda.",
      "notis.premium": "Gambar galeri dan kod QR DuitNow dimuat naik terus dalam borang ini.",
      "notis.edit": "Selepas bayaran, anda boleh ubah kad sendiri melalui akaun Google anda.",
      "notis.custom": "Kita mulakan dengan kad Premium pilihan anda sebagai asas. Kami hubungi anda untuk sesi pertama selepas pesanan.",
      "pr.kad": "Kad", "pr.sampul": "Sampul", "pr.belakang": "Belakang", "pr.depan": "Depan",
      "masuk.belum": "Log masuk Google boleh digunakan selepas Supabase disambungkan. Dalam mod demo, guna nama pengguna dan kata laluan.",
      "masuk.gagal": "Log masuk tidak berjaya. Cuba lagi sebentar lagi.",
      "masuk.nav": "Log masuk", "akaun.nav": "Akaun",
      "akaun.salam": "Salam, {nama}",
      "ig.err.nama": "Isi nama pengantin.", "ig.err.tarikh": "Isi tarikh majlis yang belum berlalu.",
      "ig.lepas.2": "Kami balas dengan pautan bayaran {harga}.",
      "ig.lepas.3": "Album dan kod QR anda siap dalam {siap} selepas bayaran.",
      "label.malam": "Malam & bulan",
      "label.senja": "Senja & cahaya lilin",
      "tapis.harga": "Harga",
      "tapis.gaya": "Gaya",
      "tapis.semuaHarga": "Semua harga",
      "pilih.kosong": "Tiada kad dengan gaya ini dalam harga ini. Cuba gaya lain.",
      "pakej.akan": "Akan datang",
      "fail.tiada": "Belum ada fail",
      "fail.buang": "Buang",
      "fail.pilihMp3": "Muat naik MP3",
      "fail.pilihQr": "Muat naik kod QR",
      "fail.tukar": "Tukar fail",
      "fail.memproses": "Memproses…",
      "err.lagu": "Muat naik fail MP3, atau taip tajuk lagu yang anda mahu.",
      "err.laguFail": "Fail lagu mesti MP3 dan tidak melebihi 10 MB.",
      "err.gambar": "Gambar ini tidak dapat dibaca. Cuba gambar JPEG atau PNG.",
      "err.galeri": "Tambah sekurang-kurangnya satu gambar, atau matikan galeri.",
      "err.telefon": "Isi nombor WhatsApp yang sah, cth 012-345 6789.",
      "aria.gambar": "Gambar {n}",
      "aria.buangGambar": "Buang gambar {n}",
      "ph.kapsyen": "Kapsyen",
      "hantar.simpan": "Simpan perubahan",
      "hantar.admin": "Simpan ke tempahan",
      "hantar.sedang": "Menyimpan tempahan…",
      "hantar.muatNaik": "Memuat naik fail {n} daripada {j}…",
      "hantar.gagal": "Tempahan belum tersimpan. {sebab}",
      "hantar.terkunci": "Tempahan {kod} sudah disahkan, jadi ia tidak boleh diubah lagi. Butiran ini akan dihantar sebagai tempahan baharu.",
      "ubah.teks": "Anda sedang mengubah tempahan {kod}. Tekan Simpan perubahan di langkah terakhir.",
      "ubah.admin": "Mod admin: mengubah tempahan {kod} milik @{nama}.",
      "ubah.baharu": "Mula tempahan baharu",
      "ubah.kembali": "Kembali ke admin",
      "masuk.sorok": "Sorok kata laluan",
      "au.isi": "Isi nama pengguna (atau e-mel) dan kata laluan.",
      "au.nama": "Nama pengguna mesti 3 hingga 24 aksara: huruf kecil, nombor, titik atau garis bawah.",
      "au.kata": "Kata laluan mesti sekurang-kurangnya 8 aksara.",
      "au.emel": "Semak alamat e-mel anda, atau biarkan kosong.",
      "au.diambil": "Nama pengguna ini sudah digunakan. Cuba yang lain.",
      "au.salah": "Nama pengguna/e-mel atau kata laluan salah.",
      "au.gagal": "Tidak dapat log masuk sekarang. Cuba lagi sebentar lagi.",
      "au.sahkan": "Akaun dicipta, tetapi Supabase masih meminta pengesahan e-mel. Admin: matikan Confirm email dalam Supabase.",
      "au.sibuk": "Sebentar…",
      "au.terlalu": "Terlalu banyak cubaan. Tunggu seminit, kemudian cuba lagi.",
      "papan.kosong": "Belum ada tempahan. Bila anda hantar tempahan, ia muncul di sini untuk anda semak dan sahkan.",
      "papan.memuat": "Memuatkan…",
      "papan.ralat": "Tempahan tidak dapat dimuatkan. {sebab}",
      "papan.dikemaskini": "Dikemas kini {masa}",
      "st.draf": "Menunggu semakan anda",
      "st.dihantar": "Diterima",
      "st.diproses": "Sedang disiapkan",
      "st.siap": "Siap",
      "st.batal": "Dibatalkan",
      "gm.1": "Draf",
      "gm.2": "Disahkan",
      "gm.3": "Disiapkan",
      "gm.4": "Diterbitkan",
      "pb.sahkan": "Sahkan tempahan",
      "pb.ubah": "Ubah butiran",
      "pb.padam": "Padam draf",
      "pb.padamPasti": "Tekan sekali lagi untuk padam",
      "pb.draf": "Semak butiran dan kad anda. Bila semuanya betul, pilih cara bayaran dan sahkan tempahan.",
      "pb.siap": "Kad anda sudah siap. Kongsikan pautan ini dengan keluarga dan sahabat.",
      "pb.batal": "Tempahan ini dibatalkan. Hubungi kami jika ada sebarang soalan.",
      "pb.bayar": "Bayar sekarang · {harga}",
      "pb.buka": "Buka kad",
      "pb.salin": "Salin pautan",
      "pb.wa": "WhatsApp kami",
      "pb.sedang": "Sebentar…",
      "pb.gagal": "Tidak berjaya. {sebab}",
      "pb.disahkan": "Tempahan disahkan. Terima kasih!",
      "pb.waTeks": "Salam qawwam, saya baru mengesahkan tempahan {kod}.",
      "dl.kod": "Kod tempahan",
      "dl.pakej": "Pakej",
      "dl.kad": "Kad",
      "dl.harga": "Harga",
      "dl.pengantin": "Pengantin",
      "dl.tuanRumah": "Tuan rumah",
      "dl.tarikh": "Tarikh & masa",
      "dl.lokasi": "Lokasi",
      "dl.aturcara": "Aturcara",
      "dl.tiada": "Tiada",
      "dl.rsvp": "RSVP",
      "dl.rsvpT": "Tarikh akhir {akhir} · hingga {pax} orang setiap jawapan",
      "dl.hubungi": "Hubungi",
      "dl.lagu": "Lagu",
      "dl.laguFail": "Fail MP3 dimuat naik",
      "dl.laguMinta": "Diminta: {tajuk}",
      "dl.galeri": "Galeri",
      "dl.galeriN": "{n} gambar",
      "dl.hadiah": "Salam kaut",
      "dl.qr": "dengan kod QR",
      "dl.buku": "Buku tetamu",
      "dl.ya": "Ya",
      "dl.tidak": "Tidak",
      "dl.telefon": "WhatsApp anda",
      "dl.nota": "Nota",
      "dl.tajuk": "Tajuk kad",
      "dl.bismillah": "Bismillah",
      "dl.masaTiada": "Masa tidak dinyatakan",
      "dl.hinggaSelesai": "{mula} hingga selesai",
      "dl.dicipta": "Dihantar {masa}",
      "tab.soalan": "Soalan",
      "nav.soalan": "Soalan",
      "papan.kataOk": "Kata laluan ditukar.",
      "pb.caraBayar": "Cara bayaran",
      "pb.online": "Bayar dengan Stripe",
      "pb.onlineP": "Kad kredit/debit, Apple Pay, Google Pay atau GrabPay",
      "pb.shopee": "Saya sudah beli di Shopee",
      "pb.shopeeP": "Masukkan nombor pesanan Shopee anda",
      "pb.shopeeKod": "Nombor pesanan Shopee",
      "pb.shopeeSalah": "Semak nombor pesanan Shopee anda: huruf dan nombor, sekurang-kurangnya 6 aksara.",
      "pb.shopeeGuna": "Nombor pesanan Shopee ini sudah digunakan untuk tempahan lain.",
      "pb.sahkanBayar": "Sahkan & bayar {harga}",
      "pb.proses": "Tempahan anda akan diproses dalam {siap}. Anda akan menerima kad melalui {saluran}.",
      "saluran.wa": "WhatsApp",
      "saluran.waEmel": "WhatsApp dan e-mel",
      "pb.bayaranBelum": "Bayaran {harga} belum diterima.",
      "pb.bayaranAkan": "Halaman bayaran kami sedang disiapkan; kami akan hubungi anda di WhatsApp untuk bayaran.",
      "pb.bayaranShopee": "Pesanan Shopee {kod} sedang kami semak.",
      "pb.bayaranOk": "Bayaran diterima. Terima kasih!",
      "dl.bayaran": "Bayaran",
      "dl.bayarOnline": "Dalam talian",
      "dl.bayarShopee": "Shopee · {kod}",
      "dl.st.belum": "belum dibayar",
      "dl.st.semak": "sedang disemak",
      "dl.st.dibayar": "dibayar",
      "dl.emel": "E-mel",
      "err.emel": "Isi alamat e-mel yang sah, cth nama@contoh.com.",
      "err.nama": "Isi nama anda.",
      "pb.bayaranDisemak": "Terima kasih kerana membayar! Kami akan sahkan bayaran anda tidak lama lagi.",
      "pb.keStripe": "Membawa anda ke halaman bayaran Stripe…",
      "pb.bayarGagal": "Halaman bayaran tidak dapat dibuka sekarang ({sebab}). Tempahan anda sudah diterima; cuba Bayar sekarang sekali lagi, atau hubungi kami di WhatsApp.",
      "pb.bayaranSemakStripe": "Kami sedang menyemak bayaran anda dan akan menghubungi anda jika perlu.",
      "pb.menyemak": "Menyemak bayaran anda…",
      "pb.belumSedia": "bayaran dalam talian sedang disediakan",
      "pb.tng": "Kod QR / pindahan bank",
      "pb.tngP": "DuitNow QR, TNG eWallet atau pindahan bank",
      "pb.tngPQr": "Imbas QR kami dengan TNG eWallet atau aplikasi bank",
      "pb.tngPBank": "Pindahan bank ke akaun kami",
      "pb.tngLangkah": "Bayar {harga} dengan mengimbas QR atau pindahan ke akaun di bawah. Tulis {kod} pada rujukan bayaran. Kemudian isi nombor rujukan transaksi, lampirkan resit dan tekan Saya sudah bayar.",
      "pb.tngLangkahQr": "Imbas QR ini dan bayar {harga}. Tulis {kod} pada nota bayaran. Kemudian isi nombor rujukan transaksi, lampirkan resit dan tekan Saya sudah bayar.",
      "pb.tngLangkahBank": "Pindahkan {harga} ke akaun di bawah. Tulis {kod} pada rujukan bayaran. Kemudian isi nombor rujukan transaksi, lampirkan resit dan tekan Saya sudah bayar.",
      "pb.resit": "Resit bayaran",
      "pb.resitPilih": "Lampirkan resit",
      "pb.resitTukar": "Tukar resit",
      "pb.resitP": "Tangkap layar atau PDF resit pindahan anda (JPG, PNG atau PDF, hingga 5 MB). Kami menyemaknya sebelum memproses tempahan.",
      "pb.resitPerlu": "Lampirkan resit bayaran anda sebagai bukti.",
      "pb.resitSalah": "Resit mesti gambar (JPG, PNG, WebP) atau PDF, tidak melebihi 5 MB.",
      "pb.resitMuat": "Memuat naik resit…",
      "dl.resit": "Resit bayaran",
      "dl.resitAda": "Dilampirkan",
      "pb.bankNama": "Bank",
      "pb.bankPemegang": "Nama akaun",
      "pb.bankAkaun": "No. akaun",
      "pb.salinAkaun": "Salin",
      "pb.sudahBayar": "Saya sudah bayar {harga} · Sahkan tempahan",
      "pb.butiran": "Butiran anda",
      "pb.butiranP": "Diperlukan untuk bayaran. Resit dihantar ke e-mel, kad dihantar ke WhatsApp.",
      "pb.nama": "Nama",
      "pb.emel": "E-mel",
      "pb.telefon": "No. WhatsApp",
      "pb.tngPenerima": "Penerima: {nama}",
      "pb.tngSimpan": "Simpan QR",
      "pb.tngTelefon": "Bayar dengan telefon ini? Simpan QR, kemudian dalam aplikasi TNG pilih Imbas → gambar dari galeri.",
      "pb.tngRujukan": "Nombor rujukan transaksi (dari resit anda)",
      "pb.tngSalah": "Semak nombor rujukan transaksi: huruf dan nombor, sekurang-kurangnya 6 aksara.",
      "pb.tngGuna": "Nombor rujukan ini sudah digunakan untuk tempahan lain.",
      "pb.bayaranTng": "Resit anda sudah kami terima. Kami sedang menyemak bayaran QR / pindahan bank anda (rujukan {kod}) dan akan menghubungi anda jika ada masalah.",
      "dl.bayarTng": "QR / pindahan bank · {kod}",
      "dl.nama": "Nama",
      "dl.telefonA": "WhatsApp pelanggan",
      "dl.emelA": "E-mel pelanggan",
      "hantar.tetamu": "Memulakan pembayaran tanpa akaun…",
      "hantar.tetamuTutup": "Pembayaran tanpa akaun belum dibuka. Log masuk atau cipta akaun untuk meneruskan; butiran anda masih ada.",
      "tetamu.nav": "Tempahan saya",
      "tetamu.salam": "Tempahan anda",
      "tetamu.sub": "Tanpa akaun",
      "tetamu.ok": "Kata laluan ditetapkan. Mulai sekarang, log masuk dengan {emel} untuk menyemak tempahan dan RSVP anda.",
      "tetamu.emelAda": "E-mel ini sudah ada akaun qawwam. Log masuk dengan kata laluannya untuk menyimpan tempahan ini di sana.",
      "tetamu.emelSahkan": "Kami menghantar pautan pengesahan ke {emel}. Buka pautan itu, kemudian kembali ke sini untuk menetapkan kata laluan.",
      "tetamu.domain": "Guna alamat e-mel anda sendiri.",
      "tetamu.keluar": "Tamatkan sesi tetamu",
      "tetamu.keluarPasti": "Tekan sekali lagi. Tanpa kata laluan, tempahan ini tidak boleh dibuka lagi.",
      "tetamu.kosong": "Tiada tempahan untuk disemak di sini. Tempahan yang disahkan lebih 24 jam lalu hanya boleh dilihat selepas log masuk dengan kata laluan.",
      "tetamu.pindah": "Tempahan tetamu anda kini disimpan dalam akaun ini.",
      "tetamu.masukNotis": "Log masuk ke akaun anda. Tempahan tetamu anda akan dipindahkan ke akaun itu.",
      "rsvp.memuat": "Memuatkan RSVP…",
      "rsvp.kosong": "Bila kad anda diterbitkan, jawapan RSVP tetamu muncul di sini.",
      "rsvp.ralat": "RSVP tidak dapat dimuatkan. {sebab}",
      "rsvp.kata": "Tetapkan kata laluan untuk melihat RSVP tetamu anda.",
      "rsvp.jawapan": "{n} jawapan",
      "rsvp.tiadaJawapan": "Belum ada jawapan.",
      "rsvp.pax": "{n} orang",
      "rsvp.tidakHadir": "Tidak hadir",
      "rsvp.lagi": "Tunjuk semua ({n})"
    },
    en: {
      "nav.masuk": "Sign in", "nav.soalan": "FAQ", "tab.home": "Home", "tab.tempah": "Order", "tab.templat": "Templates",
      "paparan.mobile": "Mobile view", "paparan.desktop": "Desktop view",
      "hero.eyebrow": "Digital wedding cards · from {harga}",
      "hero.h1": "See <em>your names</em> on the card before you pay.",
      "hero.sub": "Pick a card that makes you smile, type both your names, and watch it become yours right there. When it feels like “yes, this is us”, send your order, check it once more in your dashboard, and confirm. We'll get your link ready to share with everyone you love.",
      "hero.cuba": "Try it first: type both your names",
      "hero.ph1": "Your name", "hero.ph2": "Your partner's name",
      "hero.cta1": "Order now", "hero.cta2": "See the cards",
      "hero.f1": "RSVP right inside the card", "hero.f2": "Google Maps & Waze", "hero.f3": "A countdown to the big day", "hero.f4": "Nothing for guests to download",
      "hero.tema": "Card",
      "vid.eyebrow": "See it in action", "vid.h2": "Your wedding card, <em>alive.</em>",
      "vid.p": "RSVP, Google Maps, countdown and guest wishes, all in one link.",
      "ciri.eyebrow": "Features", "ciri.h2": "What's inside each card",
      "ciri.1t": "Animated cover", "ciri.1p": "Guests open the invitation themselves: an arch, a sealed envelope, a rolled scroll, even a hot-air balloon.",
      "ciri.2t": "Countdown", "ciri.2p": "Days, hours and minutes to the majlis. Plenty of couples check it too.",
      "ciri.3t": "Gregorian & Hijri dates", "ciri.3p": "We check the Hijri date against the JAKIM takwim rather than guess it.",
      "ciri.4t": "Majlis programme", "ciri.4p": "When guests should arrive, when the couple walks in, when the makan beradab starts.",
      "ciri.5t": "Google Maps & Waze", "ciri.5p": "One tap to the hall. No more “which hall was it again?”",
      "ciri.6t": "Save to calendar", "ciri.6p": "Straight into Google Calendar, Apple or Outlook, so nobody forgets.",
      "ciri.7t": "Online RSVP", "ciri.7p": "Guests reply inside the card with no sign-up. If plans change, they can update it.",
      "ciri.8t": "RSVP owner panel", "ciri.8p": "Type your owner ID to see who's coming and how many, then download the list for Excel. Easy enough for Mak to check too.",
      "ciri.9t": "Music & auto-scroll", "ciri.9p": "Your song starts as the invitation opens, and the card scrolls itself so guests can just sit back.",
      "ciri.10t": "Doa & Quranic verses", "ciri.10p": "With meanings from Tafsir Pimpinan Ar-Rahman, copied directly, never retyped.",
      "ciri.11t": "Interactive pages", "ciri.11p": "Guests turn page by page, each with its own mood.",
      "ciri.12t": "7-photo gallery", "ciri.12p": "Your pre-wedding photos, played as a slideshow. Pick the seven you love most.",
      "ciri.13t": "Guestbook", "ciri.13p": "A wall of wishes from everyone who didn't get to shake your hand. You can hide any of them.",
      "ciri.14t": "DuitNow money gifts", "ciri.14p": "For relatives far away who can't come but still want to give.",
      "ciri.15t": "RSVP list as PDF", "ciri.15p": "A printable tick-box list for the welcome table.",
      "ciri.16t": "Printed-card design", "ciri.16p": "A 5×7 in print PDF that matches your digital card, for grandparents who prefer paper.",
      "soalan.eyebrow": "FAQ", "soalan.h2": "Questions couples often ask",
      "q1": "Do guests need to download an app?", "j1": "No. The card opens straight in the phone's browser from the link you share on WhatsApp, Telegram or Instagram. If they can open WhatsApp, they can open this.",
      "q2": "How does RSVP work?", "j2": "Guests enter their name, whether they're coming, how many, and a short wish, then tap Send. Replies are saved online, not scattered across your WhatsApp. To see them, open your card and type the owner ID we give you into the Name box of the RSVP form: you get the totals, filters and an Excel download. You can also see them all under My orders on this site after signing in with your password. Basic takes up to 300 replies and Premium up to 3,000. The Flip Card has no RSVP.",
      "q9": "What's the difference between the packages?", "j9": "The Flip Card is one card with two faces and no RSVP, good for an akad nikah or a small majlis. Basic is a complete card that reads top to bottom, with RSVP and music. Premium is a paged card that opens in its own way, with a gallery, guestbook, money gifts, an RSVP PDF and a printed-card design. Edit It Yourself and Custom are coming soon.",
      "q3": "How soon is my card ready?", "j3": "Your order is processed within {siap} of confirming. You'll receive the card link by WhatsApp, and by email too if you gave one. Before publishing, we check the spelling of every name and the Hijri date against the JAKIM takwim.",
      "q4": "Can I change details after submitting?", "j4": "While the order is still a draft, you can change anything from your dashboard. After you confirm, contact us for any changes. Premium includes 2 rounds of corrections after the card is published. For Flip and Basic, check the preview carefully, because what you see is what we publish.",
      "q5": "How long does the card link stay live?", "j5": "Flip and Basic: {aktif}. Premium: 6 months after the majlis.",
      "q10": "Do I need an account?", "j10": "No. You can design, order and pay with just your name, email and WhatsApp number. To check your order's status or your guests' RSVPs later, set a password after paying (or create an account, or use Google) and sign in.",
      "q6": "Can I add a song?", "j6": "Yes, from Basic upwards. Upload an MP3 right in the form, or type the song title or a link and we'll find it. Make sure you have the right to use it, such as royalty-free music or a track you've licensed. The Flip Card has no music.",
      "q11": "What is the printed-card design in Premium?", "j11": "From your owner panel you can download a 5×7 in printed card (print-ready PDF, 300 dpi) that matches your digital card, with a QR code to your card link. Nice for grandparents and relatives who like holding a card. Printing isn't included; just take the file to any print shop.",
      "q12": "Is my RSVP list private?", "j12": "Yes. Guests can only send a reply, never read the list. Your owner ID is stored encrypted and checked inside the database, not in the card's code, and repeated wrong tries get locked out. Just one request: don't share that ID with guests.",
      "q7": "How do I pay?", "j7": "Three ways. Stripe: a credit/debit card, Apple Pay, Google Pay or GrabPay on our secure Stripe payment page. QR code / bank transfer: scan our DuitNow QR (TNG eWallet or your banking app) or transfer to our bank account, then enter the transaction reference, attach your receipt and press I've paid. Shopee: if you bought the card on Shopee, enter your Shopee order number; we'll check it and start on your card.",
      "q8": "What language is the card in?", "j8": "Bahasa Melayu, with Quranic verses and doa in Arabic script alongside their meaning.",
      "tp.eyebrow": "Order", "tp.h1": "Choose your package", "tp.sub": "Pick a package, fill in the details and submit. Check your card once more in your dashboard, then confirm and pay. Bought on Shopee? Enter your Shopee order number when you confirm.",
      "tempah.h2": "Fill in your card details",
      "tempah.sub": "The card beside the form is the real thing. Empty fields show a sample for now, so you can see where everything will sit.",
      "b.tema": "Choose a card", "b.pengantin": "Couple", "b.tarikh": "Date & time", "b.lokasi": "Venue", "b.aturcara": "Programme", "b.rsvp": "RSVP & contacts", "b.premium": "Premium extras", "b.hantar": "Review & send",
      "l.tajuk": "Card heading", "l.bismillah": "Show Bismillah at the top of the back", "l.warnaFlip": "Card colour", "l.warnaFlipP": "Every Flip card comes in four colours. The preview beside it changes straight away.",
      "l.muzik": "Background music", "l.muzikSendiri": "My own song", "l.muzikTiada": "No music",
      "h.muzik": "Do one of these: upload an MP3, or tell us which song you'd like. Only royalty-free music or a song you have the right to use. The preview plays your song, or a short sample tune.",
      "l.hubungan": "Which family is hosting?", "l.puteri": "Bride's family (puteri)", "l.putera": "Groom's family (putera)",
      "l.anak": "Host family's child", "l.pasangan": "Their partner",
      "l.anakP": "Short name", "l.anakN": "Full name", "l.pasP": "Partner's short name", "l.pasN": "Partner's full name",
      "l.tr1": "Host (parent) 1", "l.tr2": "Host (parent) 2", "l.pilihan": "(optional)",
      "l.tarikh": "Majlis date", "l.mula": "Starts", "l.tamat": "Ends", "l.hijri": "Hijri date",
      "h.hijri": "Suggested from the Umm al-Qura calendar. We check it against the JAKIM takwim before publishing.",
      "l.lokNama": "Venue name", "l.lokAlamat": "Full address", "l.lokNota": "Venue note", "l.gmaps": "Google Maps link", "l.waze": "Waze link",
      "h.peta": "Paste the Share link from Google Maps or Waze, so guests end up at the right hall and not the one next door.",
      "ph.lokNota": "e.g. Free parking behind the hall",
      "l.masa": "Time", "l.acara": "Event", "b.tambahAcara": "+ Add event", "b.contohAcara": "Use sample programme",
      "h.rsvp": "Guests reply on the card itself and every reply is stored safely online. You can view the list under My orders on this site (sign in with your password), or from your own card with the owner ID we send you.",
      "l.rsvpAkhir": "RSVP deadline", "h.rsvpAkhir": "Leave empty for 14 days before the majlis.", "l.maksPax": "Max guests per RSVP",
      "l.hubungi": "Contacts shown on the card", "l.hbNama": "Name", "l.hbPeranan": "Role", "l.hbNombor": "Phone", "b.tambahHubungi": "+ Add contact",
      "aria.buang": "Remove",
      "h.galeri": "Up to 7 photos, each with an optional caption. Large photos are resized automatically.",
      "l.hadiahAda": "Show a money-gift (salam kaut) page", "l.bank": "Bank", "l.akaunNama": "Account holder's name", "l.akaun": "Account number",
      "h.hadiah": "Screenshot the QR code in your bank app and upload it here. Optional: without it, guests still see your account number.",
      "l.bukuTetamu": "Show the guestbook (public wishes)", "h.bukuTetamu": "Guests' wishes appear on a wall in the card. You can hide any wish from the owner panel.",
      "l.idea": "Design ideas", "ph.idea": "e.g. Sage and gold, jasmine motif, reference: a Pinterest link",
      "h.idea": "Colours, motifs, fonts or reference links. We'll go through it in the first session.",
      "l.nota": "Notes for us", "h.nota": "Names we should double-check, or anything else you'd like us to know.",
      "r.pakej": "Package", "r.tema": "Card", "r.pengantin": "Couple", "r.tarikh": "Date", "r.harga": "Price",
      "pm.insta": "Your InstaWedding album belongs to your Google account, so only you can manage it.",
      "hantar": "Submit order", "hantar.nota": "No account needed. Next you check your card once more, choose how to pay and confirm.",
      "pr.kad": "Card", "pr.sampul": "Cover", "pr.belakang": "Back", "pr.depan": "Front", "pr.lihat": "Preview my card", "pr.nota": "This is the real card. Go on, tap it.",
      "langkah.seterusnya": "Next", "langkah.kembali": "Back",
      "tl.eyebrow": "Collection", "tl.h1": "Our cards, and the stories behind them",
      "tl.sub": "We designed every card with a particular wedding in mind. Tap any of them and open it the way your guests will. If you typed your names on Home, those are the names you'll see.",
      "tl.flip": "Flip Card", "tl.flipP": "For when you just want one beautiful card, no fuss. Names on the front, details on the back. Every Basic and Premium card now has a Flip version, in four colours each.",
      "tl.basic": "Basic cards", "tl.basicP": "Nineteen cards that read top to bottom, with RSVP, music and auto-scroll. Some are rooted in adat and faith, others are calm and modern.",
      "tl.premium": "Premium cards", "tl.premiumP": "Each Premium card is its own little world, and each one opens differently: lighting a candle, sending off a balloon, drawing back velvet curtains. Guests turn page by page instead of scrolling.",
      "tl.demo": "Try being the couple for a minute: open any card, go to RSVP and type <b>QW-DEMO-2026</b> in the name box.",
      "tl.akan": "Coming soon", "tl.kosongP": "We're designing a new Premium card.", "tl.beritahu": "Tell me when it's ready",
      "tema.cuba": "Try it", "tema.pilih": "Choose this card",
      "ig.eyebrow": "InstaWedding", "ig.h1": "Every guest photo, in one album.",
      "ig.sub": "On the day, every guest has a camera in their pocket. Put a QR code on the tables and their photos, videos and wishes go straight into one album. You watch it live, and keep it all afterwards.",
      "ig.per": "one payment for one majlis", "ig.cta1": "Order InstaWedding", "ig.cta2": "See an example",
      "ig.f1": "No app", "ig.f2": "No sign-up for guests", "ig.f3": "Your private album",
      "igc.eyebrow": "InstaWedding features", "igc.h2": "Every camera in the hall, in one place",
      "igc.1t": "Scan the QR, you're in", "igc.1p": "No app, no sign-up. From the youngest cousin to Tok Wan, everyone can.",
      "igc.2t": "Photos and videos", "igc.2p": "Straight from the phone camera. Videos up to 30 seconds each.",
      "igc.3t": "Wishes and reactions", "igc.3p": "Guests write wishes, like posts and leave comments.",
      "igc.4t": "Public or couple only", "igc.4p": "Guests choose whether everyone can see a post, or just the two of you.",
      "igc.5t": "Live feed", "igc.5p": "Photos appear during the majlis, and can be shown on the big screen in the hall.",
      "igc.6t": "The couple is in control", "igc.6p": "Hide or delete any post from your account.",
      "igc.7t": "Download everything", "igc.7p": "Save every photo and video in one file.",
      "igc.8t": "QR table cards", "igc.8p": "We provide a table card design, ready to print.",
      "igd.eyebrow": "InstaWedding example", "igd.h2": "What your guests see",
      "igd.sub": "This is a working example. Like a post, switch tabs, or tap + to see how guests upload.",
      "igd.c1t": "Guest page", "igd.c1p": "Feed, gallery and wishes.", "igd.c2t": "QR table card", "igd.c2p": "Printed and placed on every table.",
      "igk.eyebrow": "How it works", "igk.h2": "From majlis to album",
      "igk.1t": "Order and pay", "igk.1p": "Your album and QR code are ready within {siap}.",
      "igk.2t": "Put the QR cards on the tables", "igk.2p": "Guests scan and start sharing on the day.",
      "igk.3t": "Keep the memories", "igk.3p": "Uploads stay open for 3 months from the majlis. The album can be viewed and downloaded for 12 months.",
      "igt.eyebrow": "Order InstaWedding", "igt.h2": "RM29.90 for one majlis",
      "igt.1": "A private album with its own link and QR code", "igt.2": "Photos, 30-second videos, wishes and reactions",
      "igt.3": "QR table card design, ready to print", "igt.4": "3 months of uploads, 12 months of album access",
      "igt.lNama": "Couple's names", "igt.lTarikh": "Majlis date", "igt.lTetamu": "Expected guests", "igt.hantar": "Order on WhatsApp",
      "masuk.petik": "From invitation to album of memories.",
      "masuk.h1": "Sign in to qawwam", "masuk.sub": "Check your order status and your guests' RSVPs. You don't need an account to order.",
      "masuk.btn": "Continue with Google",
      "masuk.tanpa": "Continue without signing in",
      "akaun.keluar": "Sign out",
      "kaki.tag": "Digital wedding cards, designed in Malaysia.",
      "modal.seb": "Previous template", "modal.brk": "Next template", "modal.tutup": "Close",
      "label.islamik": "Islamic", "label.melayu": "Malay heritage", "label.klasik": "Classic", "label.moden": "Modern", "label.taman": "Garden & nature",
      "label.flip": "Flip Card", "label.asal": "Original", "label.premium": "Premium", "tapis.semua": "All",
      "tema.dipilih": "Selected", "tema.cubaAria": "Try the {tema} card",
      "tl.slot": "Premium card {n}",
      "modal.pilih": "Choose this card", "modal.kembali": "Back to the form",
      "gagal": "The preview could not load. Open this page from its web address, not from a saved file.",
      "err.tajuk": "Please fix these before sending:",
      "err.wajib": "Fill in {medan}.",
      "err.tarikhLepas": "The majlis date has already passed.",
      "err.tamat": "The end time must be after the start time.",
      "err.akhir": "The RSVP deadline must be on or before the majlis date.",
      "err.url": "{medan} must be a link starting with https://",
      "err.aturcara": "Add at least one programme item with a time and an event.",
      "err.aturcaraSeparuh": "Each programme item needs both a time and an event.",
      "err.hubungi": "Add at least one contact with a name and phone number.",
      "err.hubungiNo": "Check the phone number for {nama}.",
      "err.akaun": "The account number must be digits only, 6 to 20 of them.",
      "lepas.tajuk": "Next steps",
      "lepas.kedai": "The shop's WhatsApp number isn't set yet, so WhatsApp didn't open. Copy the order code below and send it to us.",
      "lepas.1": "Tap Send in WhatsApp to send your order.",
      "salin": "Copy", "disalin": "Copied",
      "r.kosong": "Not filled in yet",
      "bina.langkah": "Step {n} of {jumlah}",
      "pakej.label": "{nama} package · {harga}",
      "pakej.pilih": "Choose package", "pakej.dipilih": "Selected",
      "nota.flip": "The Flip Card comes in 4 colours. You can still change the colour before it's published.",
      "nota.basic": "The Basic package uses the 19 Basic cards.",
      "nota.premium": "This package uses the 10 paged Premium cards.",
      "notis.flip": "The Flip Card has no RSVP. Guests tap the card to see the details and open Google Maps.",
      "notis.basic": "With your card link we send an owner ID that opens your RSVP list inside the card.",
      "notis.premium": "Gallery photos and your DuitNow QR are uploaded right here in the form.",
      "notis.edit": "After payment, you can change the card yourself through your Google account.",
      "notis.custom": "We start from the Premium card you choose. We'll contact you for the first session after you order.",
      "masuk.belum": "Google sign-in works once Supabase is connected. In demo mode, use a username and password.",
      "masuk.gagal": "Sign-in didn't work. Please try again shortly.",
      "masuk.nav": "Sign in", "akaun.nav": "Account",
      "akaun.salam": "Salam, {nama}",
      "ig.err.nama": "Fill in the couple's names.", "ig.err.tarikh": "Fill in a majlis date that hasn't passed.",
      "ig.lepas.2": "We reply with a {harga} payment link.",
      "ig.lepas.3": "Your album and QR code are ready within {siap} of payment.",
      "label.malam": "Moonlit night",
      "label.senja": "Dusk & candlelight",
      "tapis.harga": "Price",
      "tapis.gaya": "Style",
      "tapis.semuaHarga": "All prices",
      "pilih.kosong": "No cards in this style at this price. Try another style.",
      "pakej.akan": "Coming soon",
      "fail.tiada": "No file yet",
      "fail.buang": "Remove",
      "fail.pilihMp3": "Upload an MP3",
      "fail.pilihQr": "Upload QR code",
      "fail.tukar": "Change file",
      "fail.memproses": "Processing…",
      "err.lagu": "Upload an MP3, or type the song you want.",
      "err.laguFail": "The song must be an MP3 of 10 MB or less.",
      "err.gambar": "This photo couldn't be read. Try a JPEG or PNG.",
      "err.galeri": "Add at least one photo, or turn the gallery off.",
      "err.telefon": "Enter a valid WhatsApp number, e.g. 012-345 6789.",
      "aria.gambar": "Photo {n}",
      "aria.buangGambar": "Remove photo {n}",
      "ph.kapsyen": "Caption",
      "hantar.simpan": "Save changes",
      "hantar.admin": "Save to order",
      "hantar.sedang": "Saving your order…",
      "hantar.muatNaik": "Uploading file {n} of {j}…",
      "hantar.gagal": "Your order wasn't saved. {sebab}",
      "hantar.terkunci": "Order {kod} is already confirmed and can't be changed. These details will be sent as a new order.",
      "ubah.teks": "You're editing order {kod}. Press Save changes at the last step.",
      "ubah.admin": "Admin mode: editing order {kod} for {nama}.",
      "ubah.baharu": "Start a new order",
      "ubah.kembali": "Back to admin",
      "masuk.sorok": "Hide password",
      "au.isi": "Enter your username (or email) and password.",
      "au.nama": "Usernames are 3 to 24 characters: lowercase letters, numbers, dots or underscores.",
      "au.kata": "Passwords need at least 8 characters.",
      "au.emel": "Check your email address, or leave it empty.",
      "au.diambil": "That username is taken. Try another one.",
      "au.salah": "Wrong username/email or password.",
      "au.gagal": "Couldn't sign in right now. Please try again shortly.",
      "au.sahkan": "The account was created, but Supabase still asks for email confirmation. Admin: turn off Confirm email in Supabase.",
      "au.sibuk": "One moment…",
      "au.terlalu": "Too many attempts. Wait a minute, then try again.",
      "papan.kosong": "No orders yet. When you submit one, it appears here for you to review and confirm.",
      "papan.memuat": "Loading…",
      "papan.ralat": "Orders couldn't be loaded. {sebab}",
      "papan.dikemaskini": "Updated {masa}",
      "st.draf": "Awaiting your review",
      "st.dihantar": "Received",
      "st.diproses": "In progress",
      "st.siap": "Ready",
      "st.batal": "Cancelled",
      "gm.1": "Draft",
      "gm.2": "Confirmed",
      "gm.3": "In progress",
      "gm.4": "Published",
      "pb.sahkan": "Confirm order",
      "pb.ubah": "Edit details",
      "pb.padam": "Delete draft",
      "pb.padamPasti": "Tap again to delete",
      "pb.draf": "Check your details and card. When everything looks right, choose how to pay and confirm your order.",
      "pb.siap": "Your card is ready. Share this link with family and friends.",
      "pb.batal": "This order was cancelled. Get in touch if you have any questions.",
      "pb.bayar": "Pay now · {harga}",
      "pb.buka": "Open card",
      "pb.salin": "Copy link",
      "pb.wa": "WhatsApp us",
      "pb.sedang": "One moment…",
      "pb.gagal": "That didn't work. {sebab}",
      "pb.disahkan": "Order confirmed. Thank you!",
      "pb.waTeks": "Hi qawwam, I've just confirmed order {kod}.",
      "dl.kod": "Order code",
      "dl.pakej": "Package",
      "dl.kad": "Card",
      "dl.harga": "Price",
      "dl.pengantin": "Couple",
      "dl.tuanRumah": "Hosts",
      "dl.tarikh": "Date & time",
      "dl.lokasi": "Venue",
      "dl.aturcara": "Programme",
      "dl.tiada": "None",
      "dl.rsvp": "RSVP",
      "dl.rsvpT": "Deadline {akhir} · up to {pax} guests per reply",
      "dl.hubungi": "Contacts",
      "dl.lagu": "Song",
      "dl.laguFail": "MP3 uploaded",
      "dl.laguMinta": "Requested: {tajuk}",
      "dl.galeri": "Gallery",
      "dl.galeriN": "{n} photos",
      "dl.hadiah": "Money gifts",
      "dl.qr": "with QR code",
      "dl.buku": "Guestbook",
      "dl.ya": "Yes",
      "dl.tidak": "No",
      "dl.telefon": "Your WhatsApp",
      "dl.nota": "Notes",
      "dl.tajuk": "Card heading",
      "dl.bismillah": "Bismillah",
      "dl.masaTiada": "No time given",
      "dl.hinggaSelesai": "{mula} until done",
      "dl.dicipta": "Submitted {masa}",
      "tab.soalan": "FAQ",
      "soalan.sub": "Short answers to what couples usually ask before ordering. Can't find yours? Just ask us.",
      "soalan.wa": "Ask on WhatsApp",
      "q13": "How do I order?",
      "j13": "Pick a package and a card on the Order tab, fill in the details, then press Submit order. You don't need to sign in to design your card. Check the card once more, enter your name, email and WhatsApp number, choose how to pay (Stripe, Shopee or QR code / bank transfer), and press Confirm order. Then set a password so you can check your order status and your guests' RSVPs any time. Bought the card on Shopee? Choose “I bought it on Shopee” and enter your Shopee order number instead of paying again.",
      "q14": "Why do Basic cards have different prices?",
      "j14": "Each card has its own price, shown next to it when you choose. The price you see on the card is the price you pay at checkout. No hidden charges.",
      "q15": "What about gallery photos?",
      "j15": "For Premium, upload up to 7 photos in the form, each with a caption if you like. Large photos are resized automatically so the card opens quickly. Don't want a gallery? Turn it off and the gallery page won't appear.",
      "q16": "Are my details and photos safe?",
      "j16": "Yes. Your order, photos and song are stored privately. Only you and the qawwam team can see them until the card is published.",
      "l.muzikTajuk": "Or tell us the song",
      "ph.muzikTajuk": "e.g. Selamat Pengantin Baru – Saloma, or a YouTube link",
      "h.masa": "Optional. With only a start time, the card says “until done”.",
      "l.aturcaraAda": "Include a programme in the card",
      "h.aturcaraMati": "Your card won't have a programme page.",
      "l.galeriAda": "Include a photo gallery",
      "h.galeriMati": "Your card won't have a gallery page.",
      "l.duitnow": "DuitNow QR code",
      "l.telefon": "Your WhatsApp number",
      "h.telefon": "We send your card to this number on WhatsApp.",
      "masuk.tunggu": "Sign in or create an account to submit your order. Everything you filled in is still here.",
      "masuk.tabMasuk": "Sign in",
      "masuk.tabDaftar": "Create account",
      "masuk.nama": "Username",
      "masuk.namaEmel": "Username or email",
      "masuk.namaPh": "e.g. aisyah_hakim",
      "masuk.namaH": "3 to 24 characters: lowercase letters, numbers, dots or underscores.",
      "masuk.kata": "Password",
      "masuk.lihat": "Show password",
      "masuk.kataH": "At least 8 characters.",
      "masuk.emel": "Email",
      "masuk.emelH": "Optional. Helps us identify your account if you forget your password.",
      "masuk.btnMasuk": "Sign in",
      "masuk.btnDaftar": "Create account",
      "masuk.atau": "or",
      "masuk.lupa": "Forgot your password? Contact us and we'll help you reset it.",
      "masuk.demo": "Demo mode: accounts and orders are kept in this browser only until Supabase is connected.",
      "papan.eyebrow": "Dashboard",
      "papan.baharu": "Order a new card",
      "papan.tempahan": "My orders",
      "papan.muat": "Refresh",
      "papan.rsvp": "Guest RSVPs",
      "papan.hadir": "Attending",
      "papan.tetamu": "Guests",
      "papan.tidak": "Not attending",
      "papan.rsvpNota": "You can also see replies inside your card: RSVP section → type your owner ID in the Name box.",
      "tetamu.eyebrow": "Guest checkout",
      "tetamu.h": "Check your order later",
      "tetamu.p": "Set a password to check your order status and your guests' RSVPs any time. You'll sign in with this email.",
      "tetamu.emel": "Email",
      "tetamu.kata": "New password",
      "tetamu.simpan": "Set password",
      "tetamu.akaunAda": "Already have a qawwam account?",
      "tetamu.keMasuk": "Sign in to keep this order in it",
      "tetamu.balik": "Back to my guest order",
      "hantar.akaunAda": "Have an account? <a href=\"#masuk\" id=\"hantar-ke-masuk\">Sign in first</a> to keep this order in it.",
      "papan.semua": "All orders",
      "papan.nota": "This is the card we'll publish. Tap to open it.",
      "papan.kataOk": "Password changed.",
      "papan.tetapan": "Change password",
      "papan.kataBaru": "New password",
      "papan.simpanKata": "Save password",
      "pb.caraBayar": "How would you like to pay?",
      "pb.online": "Pay with Stripe",
      "pb.onlineP": "Credit/debit card, Apple Pay, Google Pay or GrabPay",
      "pb.shopee": "I bought it on Shopee",
      "pb.shopeeP": "Enter your Shopee order number",
      "pb.shopeeKod": "Shopee order number",
      "pb.shopeeSalah": "Check your Shopee order number: letters and numbers, at least 6 characters.",
      "pb.shopeeGuna": "This Shopee order number has already been used for another order.",
      "pb.sahkanBayar": "Confirm & pay {harga}",
      "pb.proses": "Your order will be processed within {siap}. You'll receive your card by {saluran}.",
      "saluran.wa": "WhatsApp",
      "saluran.waEmel": "WhatsApp and email",
      "pb.bayaranBelum": "Payment of {harga} hasn't been received yet.",
      "pb.bayaranAkan": "Our payment page is on its way; we'll contact you on WhatsApp about payment.",
      "pb.bayaranShopee": "We're checking Shopee order {kod}.",
      "pb.bayaranOk": "Payment received. Thank you!",
      "dl.bayaran": "Payment",
      "dl.bayarOnline": "Online",
      "dl.bayarShopee": "Shopee · {kod}",
      "dl.st.belum": "not paid yet",
      "dl.st.semak": "being checked",
      "dl.st.dibayar": "paid",
      "dl.emel": "Email",
      "err.emel": "Enter a valid email address, e.g. name@example.com.",
      "err.nama": "Enter your name.",
      "l.emel": "Email",
      "h.emel": "Your receipt and card link go here. It's also how you sign in later to check your order.",
      "l.namaPelanggan": "Your name",
      "h.namaPelanggan": "For your receipt, so we know who placed the order.",
      "q17": "I bought a card on Shopee. What now?",
      "j17": "Fill in your card details and submit, no account needed. When you confirm the order, choose “I bought it on Shopee” and type your Shopee order number. Each Shopee order number can be used for one card.",
      "pb.bayaranDisemak": "Thank you for paying! We'll confirm your payment shortly.",
      "pb.keStripe": "Taking you to Stripe's payment page…",
      "pb.bayarGagal": "The payment page couldn't open right now ({sebab}). Your order is placed; try Pay now again, or contact us on WhatsApp.",
      "pb.bayaranSemakStripe": "We're checking your payment and will contact you if anything's needed.",
      "pb.menyemak": "Checking your payment…",
      "pb.belumSedia": "online payment is still being set up",
      "pb.tng": "QR code / bank transfer",
      "pb.tngP": "DuitNow QR, TNG eWallet or bank transfer",
      "pb.tngPQr": "Scan our QR with TNG eWallet or your banking app",
      "pb.tngPBank": "Bank transfer to our account",
      "pb.tngLangkah": "Pay {harga} by scanning the QR or transferring to the account below. Put {kod} in the payment reference. Then enter the transaction reference, attach the receipt and press I've paid.",
      "pb.tngLangkahQr": "Scan this QR and pay {harga}. Put {kod} in the payment note. Then enter the transaction reference, attach the receipt and press I've paid.",
      "pb.tngLangkahBank": "Transfer {harga} to the account below. Put {kod} in the payment reference. Then enter the transaction reference, attach the receipt and press I've paid.",
      "pb.resit": "Payment receipt",
      "pb.resitPilih": "Attach receipt",
      "pb.resitTukar": "Change receipt",
      "pb.resitP": "A screenshot or PDF of your transfer receipt (JPG, PNG or PDF, up to 5 MB). We check it before processing your order.",
      "pb.resitPerlu": "Attach your payment receipt as proof of payment.",
      "pb.resitSalah": "The receipt must be an image (JPG, PNG, WebP) or a PDF of 5 MB or less.",
      "pb.resitMuat": "Uploading your receipt…",
      "dl.resit": "Payment receipt",
      "dl.resitAda": "Attached",
      "pb.bankNama": "Bank",
      "pb.bankPemegang": "Account name",
      "pb.bankAkaun": "Account number",
      "pb.salinAkaun": "Copy",
      "pb.sudahBayar": "I've paid {harga} · Confirm order",
      "pb.butiran": "Your details",
      "pb.butiranP": "Needed to pay. Your receipt goes to your email and your card to your WhatsApp.",
      "pb.nama": "Name",
      "pb.emel": "Email",
      "pb.telefon": "WhatsApp number",
      "pb.tngPenerima": "Paying to: {nama}",
      "pb.tngSimpan": "Save QR",
      "pb.tngTelefon": "Paying on this phone? Save the QR, then in the TNG app choose Scan → photo from gallery.",
      "pb.tngRujukan": "Transaction reference (from your receipt)",
      "pb.tngSalah": "Check the transaction reference: letters and numbers, at least 6 characters.",
      "pb.tngGuna": "This transaction reference has already been used for another order.",
      "pb.bayaranTng": "We've received your receipt and are checking your QR / bank transfer payment (reference {kod}). We'll contact you if anything's wrong.",
      "dl.bayarTng": "QR / bank transfer · {kod}",
      "dl.nama": "Name",
      "dl.telefonA": "Customer WhatsApp",
      "dl.emelA": "Customer email",
      "hantar.tetamu": "Starting checkout without an account…",
      "hantar.tetamuTutup": "Checkout without an account isn't switched on yet. Sign in or create an account to continue; your details are kept.",
      "tetamu.nav": "My order",
      "tetamu.salam": "Your order",
      "tetamu.sub": "No account",
      "tetamu.ok": "Password set. From now on, sign in with {emel} to check your order and RSVPs.",
      "tetamu.emelAda": "This email already has a qawwam account. Sign in with its password to keep this order there.",
      "tetamu.emelSahkan": "We've sent a confirmation link to {emel}. Open it, then come back here to set your password.",
      "tetamu.domain": "Use your own email address.",
      "tetamu.keluar": "End guest session",
      "tetamu.keluarPasti": "Tap again. Without a password this order can't be opened again.",
      "tetamu.kosong": "No orders to check here. Orders confirmed more than 24 hours ago can only be seen after signing in with a password.",
      "tetamu.pindah": "Your guest order is now saved in this account.",
      "tetamu.masukNotis": "Sign in to your account. Your guest order will move into it.",
      "rsvp.memuat": "Loading RSVPs…",
      "rsvp.kosong": "When your card is published, your guests' RSVP replies appear here.",
      "rsvp.ralat": "RSVPs couldn't be loaded. {sebab}",
      "rsvp.kata": "Set a password to see your guests' RSVPs.",
      "rsvp.jawapan": "{n} replies",
      "rsvp.tiadaJawapan": "No replies yet.",
      "rsvp.pax": "{n} guests",
      "rsvp.tidakHadir": "Not attending",
      "rsvp.lagi": "Show all ({n})"
    }
  };

  /* ---------- 5. SMALL HELPERS ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage is optional */ } }
  };
  const temaById = (id) => TEMA.find((x) => x.id === id) || TEMA[0];
  const pakejById = (id) => PAKEJ.find((x) => x.id === id) || PAKEJ[0];
  const pad = (n) => String(n).padStart(2, "0");
  const RE_LS = new RegExp("[\\u2028\\u2029]", "g");
  const RE_DIAKRITIK = new RegExp("[\\u0300-\\u036f]", "g");

  function jam(v, pendek) {
    if (!v) return "";
    const [h, m] = v.split(":").map(Number);
    const p = h < 12 ? "pagi" : h < 14 ? (pendek ? "tgh" : "tengah hari") : h < 19 ? (pendek ? "ptg" : "petang") : (pendek ? "mlm" : "malam");
    return `${h % 12 || 12}.${pad(m)} ${p}`;
  }
  const bahagian = (iso) => iso.split("-").map(Number);
  function tarikhMelayu(iso) { const [y, m, d] = bahagian(iso); return `${d} ${BULAN[m - 1]} ${y}`; }
  function tarikhPenuhMs(iso) { const [y, m, d] = bahagian(iso); return `${HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} ${BULAN[m - 1]} ${y}`; }
  function tarikhPenuh(iso) {
    if (!iso) return "";
    const [y, m, d] = bahagian(iso);
    if (lang === "en") return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    return tarikhPenuhMs(iso);
  }
  function tolakHari(iso, n) { const [y, m, d] = bahagian(iso); const t = new Date(Date.UTC(y, m - 1, d - n)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; }
  function hariIni() { const t = new Date(Date.now() + 8 * 3600e3); return t.toISOString().slice(0, 10); }
  // the sample majlis is always a Saturday about 3 months ahead, so preview countdowns never show a past date
  function sabtuSelepas(hari) { const t = new Date(Date.now() + 8 * 3600e3 + hari * 864e5); t.setUTCDate(t.getUTCDate() + (6 - t.getUTCDay() + 7) % 7); return t.toISOString().slice(0, 10); }
  SAMPLE.tarikh = sabtuSelepas(90);
  function hijriDari(iso) {
    if (!iso) return "";
    try {
      const [y, m, d] = bahagian(iso);
      const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" })
        .formatToParts(new Date(Date.UTC(y, m - 1, d, 12)));
      const ambil = (t) => parseInt((parts.find((p) => p.type === t) || {}).value, 10);
      const hd = ambil("day"), hm = ambil("month"), hy = ambil("year");
      return hd && hm && hy ? `${hd} ${BULAN_H[hm - 1]} ${hy}H` : "";
    } catch (e) { return ""; }
  }
  function normTel(v) {
    const d = String(v || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.startsWith("60")) return d;
    if (d.startsWith("0")) return "6" + d;
    if (d.startsWith("1")) return "60" + d;
    return d;
  }
  const telBimbit = (v) => /^601\d{8,9}$/.test(normTel(v));
  const telSah = (v) => /^60\d{8,10}$/.test(normTel(v));
  function telPapar(n) {
    const l = "0" + normTel(n).replace(/^60/, "");
    return l.length === 11 ? `${l.slice(0, 3)}-${l.slice(3, 7)} ${l.slice(7)}` : `${l.slice(0, 3)}-${l.slice(3, 6)} ${l.slice(6)}`;
  }
  const urlSah = (v) => /^https?:\/\/\S+$/i.test(v);
  const emelSah = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
  function b64url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64url(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
  }
  function slug(s) {
    return String(s).normalize("NFD").replace(RE_DIAKRITIK, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "kad";
  }
  function salin(teks, btn, cadangan) {
    const jadi = () => { if (!btn) return; const asal = btn.textContent; btn.textContent = t("disalin"); setTimeout(() => { btn.textContent = asal; }, 1600); };
    const gagal = () => { if (cadangan) { cadangan.focus(); if (cadangan.select) cadangan.select(); } };
    try { navigator.clipboard.writeText(teks).then(jadi, gagal); } catch (e) { gagal(); }
  }
  function muatSkrip(src) {
    return new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = gagal; document.head.append(s); });
  }

  /* ---------- 6. LANGUAGE ---------- */
  // English is the default; Bahasa Melayu when the visitor picks BM (remembered on this device)
  let lang = store.get("qawwam-lang") === "ms" ? "ms" : "en";
  const ASAL = new WeakMap();
  const VARS = () => ({ harga: rm(hargaTerendah()), siap: SHOP.siapDalam[lang], aktif: SHOP.aktifSelama[lang], nama: SHOP.nama });
  function isi(s, v, html) {
    const vars = Object.assign(VARS(), v || {});
    return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? m : html ? esc(vars[k]) : String(vars[k])));
  }
  function t(k, v) {
    const s = (lang === "en" && I18N.en[k] != null) ? I18N.en[k] : (I18N.ms[k] != null ? I18N.ms[k] : k);
    return isi(s, v, false);
  }
  function pilihTeks(k, asal) {
    if (lang === "en" && I18N.en[k] != null) return I18N.en[k];
    if (I18N.ms[k] != null) return I18N.ms[k];
    return asal;
  }
  function terjemah(root) {
    root = root || document;
    $$("[data-i18n]", root).forEach((el) => {
      const o = ASAL.get(el) || {};
      if (!("h" in o)) { o.h = el.innerHTML; ASAL.set(el, o); }
      el.innerHTML = isi(pilihTeks(el.dataset.i18n, o.h), null, true);
    });
    [["data-i18n-ph", "placeholder"], ["data-i18n-aria", "aria-label"]].forEach(([kunci, attr]) => {
      $$("[" + kunci + "]", root).forEach((el) => {
        const o = ASAL.get(el) || {};
        if (!(attr in o)) { o[attr] = el.getAttribute(attr) || ""; ASAL.set(el, o); }
        el.setAttribute(attr, isi(pilihTeks(el.getAttribute(kunci), o[attr]), null, false));
      });
    });
  }
  let bahasaSebelumAdmin = null;   // the visitor's language while the (English-only) admin page is open
  function setBahasa(l, pilih) {
    lang = l === "ms" ? "ms" : "en";
    if (pilih) { store.set("qawwam-lang", lang); bahasaSebelumAdmin = null; }
    document.documentElement.lang = lang === "en" ? "en" : "ms";
    terjemah();
    $$("[data-bahasa]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.bahasa === lang)));
    kemasTemaTeks();
    binaPakej();
    kemasPakejUI();
    ["#ralat", "#i-ralat"].forEach((s) => { if ($(s)) $(s).hidden = true; });
    binaPilihan();
    kemasModalTeks();
    kemasAkaunUI();
    kemasFailUI();
    kemasUbahUI();
    if (papan.senarai.length) paparSenaraiPapan();
    if (papan.buka) bukaTempahan(papan.buka.id);
    if (rsvpP.data) paparRsvp();
    kemasHargaUI();
    document.documentElement.classList.remove("tunggu-bahasa");
    emit("bahasa", lang);
  }

  /* ---------- 7. LIVE CARD SCREENS ---------- */
  const RO = "ResizeObserver" in window ? new ResizeObserver((es) => es.forEach((e) => {
    e.target.style.setProperty("--s", (e.contentRect.width / 390).toFixed(4));
    // a preview asked for while its screen was hidden (another tab, a collapsed sidebar) loads once it shows
    const sk = e.target._skrin;
    if (sk && sk.tunda && e.contentRect.width > 0) { const a = sk.tunda; sk.tunda = null; sk.papar(a[0], a[1], a[2]); }
  })) : null;

  class Skrin {
    constructor(el, h, dua) {
      this.el = el; this.h = h || 780; this.tok = 0; this.cur = 0;
      this.tab = el.dataset.tab || "0";
      el.style.setProperty("--h", this.h + "px");
      el.style.setProperty("--hh", String(this.h));
      this.f = [];
      for (let i = 0; i < (dua ? 2 : 1); i++) {
        const f = document.createElement("iframe");
        f.title = el.dataset.tajuk || "Pratonton kad";
        f.tabIndex = -1;
        f.setAttribute("aria-hidden", "true");
        el.append(f);
        this.f.push(f);
      }
      el._skrin = this; this.tunda = null;
      if (RO) RO.observe(el); else el.style.setProperty("--s", String((el.clientWidth || 300) / 390));
    }
    /* o.hal: open a paged (Premium) card on this page; o.gulung: scroll a Basic card to this section */
    papar(html, jaga, o) {
      o = o || {};
      const tok = ++this.tok;
      // A hidden screen gives the card a 0×0 window, and some cards size their drawing from it.
      // Don't load into nothing: keep the latest request and load it when the screen becomes visible.
      if (RO && !this.el.offsetWidth) { this.tunda = [html, jaga, o]; return; }
      this.tunda = null;
      const a = this.f[this.cur], b = this.f.length > 1 ? this.f[1 - this.cur] : a;
      let y = 0, hal = o.hal || "";
      if (jaga) {
        try { y = a.contentWindow.scrollY || 0; if (!hal) hal = a.contentWindow.QW_HAL_KINI || ""; } catch (e) { /* cross-origin */ }
      }
      if (/^[\w-]{1,30}$/.test(hal)) html = html.replace("<head>", () => `<head>\x3Cscript>window.QW_HAL="${hal}";\x3C/script>`);
      const gagal = $(".skrin-gagal", this.el); if (gagal) gagal.remove();
      b.onload = () => {
        if (tok !== this.tok) return;
        let fon = Promise.resolve();
        try { fon = b.contentDocument.fonts.ready; } catch (e) { /* ignore */ }
        Promise.race([fon, new Promise((r) => setTimeout(r, 900))]).then(() => {
          if (tok !== this.tok) return;
          try {
            const el = o.gulung ? b.contentDocument.getElementById(o.gulung) : null;
            if (el) b.contentWindow.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + b.contentWindow.scrollY - 8));
            else if (o.gulung) b.contentWindow.scrollTo(0, 0);
            else if (y) b.contentWindow.scrollTo(0, y);
          } catch (e) { /* ignore */ }
          b.classList.add("on"); b.tabIndex = +this.tab; b.removeAttribute("aria-hidden");
          if (a !== b) { a.classList.remove("on"); a.tabIndex = -1; a.setAttribute("aria-hidden", "true"); }
          this.cur = this.f.indexOf(b);
          this.el.classList.add("siap");
        });
      };
      b.srcdoc = html;
    }
    gagal() {
      if ($(".skrin-gagal", this.el)) return;
      const p = document.createElement("p");
      p.className = "skrin-gagal"; p.textContent = t("gagal");
      this.el.append(p);
    }
  }

  const TPL = {};
  function ambilTpl(laluan) {
    if (!TPL[laluan]) {
      TPL[laluan] = fetch(laluan).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .catch((e) => { delete TPL[laluan]; throw e; });
    }
    return TPL[laluan];
  }
  const failTema = (id) => { const tm = TEMA.find((x) => x.id === id); return `tema/${tm && tm.fail ? tm.fail : id}.html`; };
  const LAGU_CONTOH = "tema/lagu-contoh.mp3";
  const urlPenuh = (p) => { try { return new URL(p, location.href).href; } catch (e) { return p; } };

  // Script and comment markers inside strings are split so this file can live inline in a page.
  // "buka" = show the inside of the card instead of its cover, without the opening animation.
  const BUKA = {
    basic: "\x3Cscript>(function(){var s=document.getElementById('sampul');if(s)s.hidden=true;document.body.classList.remove('terkunci');var n=document.getElementById('navbawah');if(n){n.hidden=false;n.classList.add('tunjuk');}})();\x3C/script>",
    premium: "\x3Cscript>(function(){var b=document.getElementById('buka');if(b)b.click();})();\x3C/script>",
    flip: "\x3Cscript>(function(){var b=document.getElementById('btn-balik');if(b)b.click();})();\x3C/script>"
  };
  // Premium previews open fast and never turn pages by themselves (they read prefers-reduced-motion)
  const TENANG = "\x3Cscript>(function(){var m=window.matchMedia;if(!m)return;window.matchMedia=function(q){if(/reduced-motion/.test(q))return{matches:true,media:q,onchange:null,addListener:function(){},removeListener:function(){},addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){return false}};return m.call(window,q);};})();\x3C/script>";
  const GAYA_PRATONTON = "\x3Cstyle>html{scrollbar-width:none}html::-webkit-scrollbar{display:none}\x3C/style>";
  // Paged cards keep their page in location.hash, which a srcdoc frame can't change: remember it instead,
  // and let the next copy of the preview open on the same page (window.QW_HAL)
  const TANGKAP_HAL = "\x3Cscript>(function(){var r=history.replaceState;history.replaceState=function(s,t,u){if(typeof u==='string'&&u.charAt(0)==='#')window.QW_HAL_KINI=u.slice(1);try{return r.apply(history,arguments)}catch(e){}};})();\x3C/script>";
  const RE_CONFIG = /\/\*QAWWAM:CONFIG\*\/[\s\S]*?\/\*QAWWAM:\/CONFIG\*\//;
  const RE_META = /\x3C!--QAWWAM:META-->[\s\S]*?\x3C!--QAWWAM:\/META-->/;

  function susun(tpl, cfg, o) {
    o = o || {};
    const json = JSON.stringify(cfg, null, 2).replace(/</g, "\\u003c").replace(RE_LS, (c) => "\\u" + c.charCodeAt(0).toString(16));
    let h = tpl.replace(RE_CONFIG, () => `/*QAWWAM:CONFIG*/const CONFIG = ${json};/*QAWWAM:/CONFIG*/`);
    if (o.meta) h = h.replace(RE_META, () => "\x3C!--QAWWAM:META-->" + o.meta + "\x3C!--QAWWAM:/META-->");
    // the Flip Card's own colour picker is for its standalone demo; in the shop the colour comes from the template choice
    h = h.replace("const DEMO = true;", "const DEMO = false;");
    if (o.akhir) {
      // a real customer card: real RSVP database, no showroom samples
      h = h.replace("const DEMO_RSVP = true;", "const DEMO_RSVP = false;");
      if (SHOP.supabaseUrl && SHOP.supabaseAnonKey) {
        h = h.replace('url: "https://YOUR-PROJECT.supabase.co"', () => `url: ${JSON.stringify(SHOP.supabaseUrl)}`)
             .replace('anonKey: "YOUR-ANON-PUBLIC-KEY"', () => `anonKey: ${JSON.stringify(SHOP.supabaseAnonKey)}`);
      }
    }
    if (o.pratonton) {
      h = h.replace("</head>", () => GAYA_PRATONTON + "</head>").replace("<head>", () => "<head>" + TANGKAP_HAL)
           .replace("const hash = location.hash.slice(1)", "const hash = (window.QW_HAL || location.hash.slice(1))");
    }
    if (o.tenang) h = h.replace("<head>", () => "<head>" + TENANG);
    if (o.buka && BUKA[o.buka]) { const i = h.lastIndexOf("</body>"); if (i > -1) h = h.slice(0, i) + BUKA[o.buka] + h.slice(i); }
    return h;
  }
  /* o: buka (open past the cover), jaga (keep scroll/page), hal (page/section to show), bunyi (play the sample tune), cfg, fail, latar */
  async function paparKad(skrin, id, o) {
    o = o || {};
    const tm = id ? temaById(id) : null;
    skrin.el.style.setProperty("--skrin-bg", o.latar || (tm ? tm.warna[0] : "#FBF8F4"));
    try {
      const tpl = await ambilTpl(o.fail || failTema(id));
      const cfg = o.cfg || buatConfig(kumpul(), true, { tema: id, bunyi: !!o.bunyi });
      const jenis = tm ? tm.pakej : "";
      const hal = o.hal && o.buka ? o.hal : "";
      skrin.papar(susun(tpl, cfg, { buka: o.buka ? jenis : "", tenang: o.buka && jenis === "premium", pratonton: true }), !!o.jaga,
        { hal: jenis === "premium" ? hal : "", gulung: jenis === "basic" ? hal : "" });
    } catch (e) { skrin.gagal(); }
  }

  /* ---------- 8. ORDER FORM ---------- */
  // edit = the saved order being changed ({ id, kod } for the customer, plus admin: true for the admin)
  const state = { tema: "zamrud", gayaFlip: "", pakej: "basic", temaIkut: {}, tapisHarga: "basic", tapisGaya: "semua", edit: null };
  const nilai = (id) => { const el = $("#f-" + id); return el ? el.value.trim() : ""; };
  const cek = (id) => { const el = $("#f-" + id); return el ? el.checked : true; };
  const jenisKini = () => pakejById(state.pakej).jenis;

  function barisAcara() { return $$("#aturcara-senarai .baris").map((r) => [$(".ac-masa", r).value, $(".ac-acara", r).value.trim()]); }
  function barisHubungi() { return $$("#hubungi-senarai .baris").map((r) => ({ nama: $(".hb-nama", r).value.trim(), peranan: $(".hb-peranan", r).value.trim(), nombor: $(".hb-nombor", r).value.trim() })); }

  function kumpul() {
    const hb = $('input[name="hubungan"]:checked'), mz = $('input[name="muzik"]:checked');
    return {
      tema: state.tema, gayaFlip: state.gayaFlip || "", pakej: state.pakej, hubungan: hb ? hb.value : "puteri",
      anakP: nilai("anakP"), anakN: nilai("anakN"), pasP: nilai("pasP"), pasN: nilai("pasN"), tr1: nilai("tr1"), tr2: nilai("tr2"),
      tarikh: nilai("tarikh"), mula: nilai("mula"), tamat: nilai("tamat"), hijri: nilai("hijri"),
      hijriAuto: $("#f-hijri") ? $("#f-hijri").dataset.auto !== "0" : true,
      lokNama: nilai("lokNama"), lokAlamat: nilai("lokAlamat"), lokNota: nilai("lokNota"), gmaps: nilai("gmaps"), waze: nilai("waze"),
      aturcara: barisAcara(), rsvpAkhir: nilai("rsvpAkhir"), maksPax: nilai("maksPax"), hubungi: barisHubungi(),
      tajuk: nilai("tajuk"), bismillah: cek("bismillah"), muzik: mz ? mz.value : "sendiri", muzikTajuk: nilai("muzikTajuk"),
      aturcaraAda: cek("aturcaraAda"), galeriAda: cek("galeriAda"), galeriKap: kapsyenSlot(),
      hadiahAda: cek("hadiahAda"), bank: nilai("bank"), akaunNama: nilai("akaunNama"), akaun: nilai("akaun"), bukuTetamu: cek("bukuTetamu"),
      namaPelanggan: nilai("namaPelanggan"), telefon: nilai("telefon"), emel: nilai("emel"), nota: nilai("nota"), idea: nilai("idea")
    };
  }

  function tambahAcara(v) {
    const senarai = $("#aturcara-senarai"), tpl = $("#tpl-acara");
    if (!senarai || !tpl) return null;
    const r = tpl.content.firstElementChild.cloneNode(true);
    const i = $$(".baris", senarai).length, s = SAMPLE.aturcara[i];
    $(".ac-masa", r).value = (v && v[0]) || "";
    $(".ac-acara", r).value = (v && v[1]) || "";
    $(".ac-acara", r).placeholder = s ? s[1] : "";
    senarai.append(r);
    terjemah(r);
    return r;
  }
  function tambahHubungi(v) {
    const senarai = $("#hubungi-senarai"), tpl = $("#tpl-hubungi");
    if (!senarai || !tpl) return null;
    const r = tpl.content.firstElementChild.cloneNode(true);
    const i = $$(".baris", senarai).length, s = SAMPLE.hubungi[i];
    ["nama", "peranan", "nombor"].forEach((k) => {
      const el = $(".hb-" + k, r);
      el.value = (v && v[k]) || "";
      if (s) el.placeholder = k === "nombor" ? telPapar(s.nombor) : s[k];
    });
    senarai.append(r);
    terjemah(r);
    return r;
  }

  function terapDraf(d) {
    d = d || {};
    state.gayaFlip = typeof d.gayaFlip === "string" ? d.gayaFlip : "";
    const set = (id, v) => { const el = $("#f-" + id); if (el && v != null) el.value = v; };
    ["anakP", "anakN", "pasP", "pasN", "tr1", "tr2", "tarikh", "mula", "tamat", "hijri", "lokNama", "lokAlamat", "lokNota", "gmaps", "waze",
      "rsvpAkhir", "maksPax", "tajuk", "muzikTajuk", "bank", "akaunNama", "akaun", "namaPelanggan", "telefon", "emel", "nota", "idea"].forEach((k) => set(k, d[k] == null ? "" : d[k]));
    ["bismillah", "hadiahAda", "bukuTetamu", "aturcaraAda", "galeriAda"].forEach((k) => { const el = $("#f-" + k); if (el) el.checked = typeof d[k] === "boolean" ? d[k] : true; });
    // captions: one per photo slot (older drafts kept them as lines of text)
    const kap = Array.isArray(d.galeriKap) ? d.galeriKap : kapsyenGaleri(d.galeri);
    $$("#slot-galeri .slot-kap").forEach((x, i) => { x.value = kap[i] || ""; });
    if ($("#f-hijri")) $("#f-hijri").dataset.auto = d.hijriAuto === false ? "0" : "1";
    const hb = $(`input[name="hubungan"][value="${d.hubungan === "putera" ? "putera" : "puteri"}"]`);
    if (hb) hb.checked = true;
    const mz = $(`input[name="muzik"][value="${d.muzik === "tiada" ? "tiada" : "sendiri"}"]`);
    if (mz) mz.checked = true;
    if ($("#aturcara-senarai")) {
      $("#aturcara-senarai").textContent = "";
      const ac = (d.aturcara || []).filter((r) => r[0] || r[1]);
      (ac.length ? ac : [null, null, null, null]).forEach((r) => tambahAcara(r));
    }
    if ($("#hubungi-senarai")) {
      $("#hubungi-senarai").textContent = "";
      const hbs = (d.hubungi || []).filter((r) => r.nama || r.peranan || r.nombor);
      (hbs.length ? hbs : [null, null]).forEach((r) => tambahHubungi(r));
    }
    ["anakP", "pasP"].forEach((k) => { const h = $("#h-" + k); if (h) h.value = nilai(k); });
    if (d.pakej && PAKEJ.some((x) => x.id === d.pakej)) state.pakej = pakejById(d.pakej).akan ? pakejUntuk(pakejById(d.pakej).jenis) : d.pakej;
    if (d.tema && TEMA.some((x) => x.id === d.tema)) state.tema = d.tema;
    if (temaById(state.tema).pakej !== jenisKini()) state.tema = temaPertama(jenisKini());
  }

  /* default card ID and link name, e.g. sarah-aiman-1212 (kadId in Supabase = folder k/<name>/) */
  function namaKad(c) {
    const dd = (c.mula || "").slice(8, 10), mm = (c.mula || "").slice(5, 7);
    return slug(`${c.anak.panggilan}-${c.pasangan.panggilan}${dd && mm ? `-${dd}${mm}` : ""}`);
  }
  const jenama = (jenis) => ({ nama: SHOP.nama, url: SHOP.url || "/", harga: rm(hargaTerendah(jenis === "flip" ? "flip" : "basic")) });
  const hargaTema = (id) => { const tm = temaById(id), h = HARGA[tm.id]; return typeof h === "number" && h > 0 ? h : (tm.hargaLalai || HARGA_LALAI[tm.pakej]); };
  const hargaTerendah = (jenis) => Math.min(...TEMA.filter((tm) => !jenis || tm.pakej === jenis).map((tm) => hargaTema(tm.id)));
  // what a tier costs, e.g. "RM8.90 – RM15.90". Until the admin sets prices for a tier, its PAKEJ text is shown.
  function hargaJenis(jenis) {
    const p = PAKEJ.find((x) => x.jenis === jenis && !x.akan);
    if (p && !TEMA.some((tm) => tm.pakej === jenis && typeof HARGA[tm.id] === "number")) return p.harga;
    const s = TEMA.filter((tm) => tm.pakej === jenis).map((tm) => hargaTema(tm.id)), a = Math.min(...s), b = Math.max(...s);
    return a === b ? rm(a) : `${rm(a)} – ${rm(b)}`;
  }
  const hargaPakej = (p) => (p.akan ? p.harga : hargaJenis(p.jenis));
  // prices on the Templat tab headers: <span data-harga-jenis="basic" data-bil="19">
  function kemasHargaUI() {
    $$("[data-harga-jenis]").forEach((el) => { const h = hargaJenis(el.dataset.hargaJenis); el.textContent = el.dataset.bil ? `${el.dataset.bil} · ${h}` : h; });
  }
  // the cheapest package that is on sale for a template type
  const pakejUntuk = (jenis) => (PAKEJ.find((p) => p.jenis === jenis && !p.akan) || PAKEJ[0]).id;
  const bersihAkaun = (v) => String(v || "").replace(/[\s-]/g, "");
  function kapsyenGaleri(teks) { return String(teks || "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, MAKS_GALERI); }

  /* The card needs real start/end moments for its countdown and calendar button even when the couple
     leaves the times empty: only a start = "until done" (end assumed 4 hours later), nothing = the whole day. */
  function masaMajlis(tarikh, mula, tamat) {
    if (!tarikh) return { mula: "", tamat: "", teks: "" };
    const iso = (v) => `${tarikh}T${v}:00+08:00`;
    const geser = (v, jamN) => { const [h, m] = v.split(":").map(Number), x = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + jamN * 60)); return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
    if (mula && tamat) return { mula: iso(mula), tamat: iso(tamat), teks: `${jam(mula)} – ${jam(tamat)}` };
    if (mula) return { mula: iso(mula), tamat: iso(geser(mula, 4)), teks: `${jam(mula)} hingga selesai` };
    if (tamat) return { mula: iso(geser(tamat, -4)), tamat: iso(tamat), teks: `Hingga ${jam(tamat)}` };
    return { mula: iso("00:00"), tamat: iso("23:59"), teks: "" };
  }

  /* CONFIG for the card. preview=true fills gaps with the sample so the card never looks broken.
     o.tema: build for another template (gallery thumbnails); o.bunyi: preview plays the sample tune */
  function buatConfig(d, preview, o) {
    o = o || {};
    const tm = temaById(o.tema || d.tema), jenis = tm.pakej;
    const S = SAMPLE, atau = (v, s) => v || (preview ? s : "");
    const tarikh = atau(d.tarikh, S.tarikh);
    // start and end are optional; the sample times only show until a date is chosen
    const contohMasa = preview && !d.tarikh, mula = d.mula || (contohMasa ? S.mula : ""), tamat = d.tamat || (contohMasa ? S.tamat : "");
    const masa = masaMajlis(tarikh, mula, tamat);
    const tr = [atau(d.tr1, S.tuanRumah[0]), d.tr2 || (preview && !d.tr1 ? S.tuanRumah[1] : "")].filter(Boolean);
    const c = {
      anak: { panggilan: atau(d.anakP, S.anak.panggilan), penuh: atau(d.anakN, S.anak.penuh) },
      pasangan: { panggilan: atau(d.pasP, S.pasangan.panggilan), penuh: atau(d.pasN, S.pasangan.penuh) },
      hubungan: d.hubungan === "putera" ? "putera" : "puteri",
      tuanRumah: tr,
      mula: masa.mula,
      tamat: masa.tamat,
      hijri: d.hijri || (preview ? (hijriDari(tarikh) || S.hijri) : ""),
      masa: masa.teks,
      lokasi: {
        nama: atau(d.lokNama, S.lokasi.nama), alamat: atau(d.lokAlamat, S.lokasi.alamat),
        nota: d.lokNota || (preview && !d.lokNama ? S.lokasi.nota : ""),
        gmapsUrl: urlSah(d.gmaps) ? d.gmaps : "", wazeUrl: urlSah(d.waze) ? d.waze : ""
      }
    };
    if (jenis === "flip") {
      delete c.tamat; delete c.lokasi.nota; delete c.lokasi.wazeUrl;
      c.gaya = tm.warnaFlip ? (tm.warnaFlip.find((w) => w.key === (o.gaya || d.gayaFlip)) || tm.warnaFlip[0]).key : (tm.gaya || "gading");
      c.tajuk = d.tajuk || S.tajuk;
      c.bismillah = d.bismillah !== false;
      c.jenama = jenama(jenis);
      return c;
    }
    const ac = d.aturcaraAda === false ? [] : d.aturcara.filter((r) => r[1]).map(([m, a]) => [jam(m, true), a]);
    const hb = d.hubungi.filter((h) => h.nama && telSah(h.nombor)).map((h) => ({ nama: h.nama, peranan: h.peranan, nombor: normTel(h.nombor) }));
    const akhir = d.rsvpAkhir || (tarikh ? tolakHari(tarikh, 14) : "");
    Object.assign(c, {
      aturcara: ac.length || d.aturcaraAda === false ? ac : (preview ? S.aturcara.map(([m, a]) => [jam(m, true), a]) : []),
      kadId: preview ? "pratonton-qawwam" : namaKad(c),
      rsvp: { tarikhAkhir: akhir ? tarikhMelayu(akhir) : "", maksPax: Math.min(20, Math.max(1, parseInt(d.maksPax, 10) || 6)) },
      hubungi: hb.length ? hb : (preview ? S.hubungi : []),
      muzik: preview ? (o.bunyi && d.muzik !== "tiada" ? (FAIL.lagu ? FAIL.lagu.url : urlPenuh(LAGU_CONTOH)) : "") : (d.muzik === "tiada" ? "" : "lagu.mp3"),
      autoSkrol: true, ics: false,
      jenama: jenama(jenis)
    });
    if (jenis === "premium") {
      const kap = Array.isArray(d.galeriKap) ? d.galeriKap : kapsyenGaleri(d.galeri);
      // only the slots that have a photo; before any photo is added the preview shows the sample gallery
      const ada = FAIL.galeri.map((f, i) => (f ? i : -1)).filter((i) => i > -1);
      let galeri = [];
      if (d.galeriAda !== false) {
        if (ada.length) galeri = ada.map((i, j) => ({ src: preview ? FAIL.galeri[i].url : `galeri/${j + 1}.jpg`, kapsyen: (kap[i] || "").trim() }));
        else if (preview) galeri = Array.from({ length: MAKS_GALERI }, (_, i) => ({ src: `galeri/${i + 1}.jpg`, kapsyen: (kap[i] || "").trim() || S.galeri[i] }));
      }
      Object.assign(c, {
        pakej: "premium",
        pautan: `${SHOP.url}/k/${preview ? "contoh" : c.kadId}/`,
        galeri,
        hadiah: d.hadiahAda === false ? null : { qr: FAIL.duitnow ? (preview ? FAIL.duitnow.url : "duitnow.png") : (preview ? "duitnow.png" : ""), bank: atau(d.bank, S.hadiah.bank), nama: atau(d.akaunNama, S.hadiah.nama).toUpperCase(), akaun: atau(d.akaun, S.hadiah.akaun) },
        bukuTetamu: d.bukuTetamu !== false
      });
    }
    return c;
  }

  /* ---------- 9. VALIDATION ---------- */
  function labelUntuk(el) {
    const l = el && el.id ? $(`label[for="${el.id}"]`) : null;
    return l ? l.textContent.replace(/\s*\(.*?\)\s*/g, " ").trim() : "";
  }
  function semak(d) {
    const e = [], f = (id) => $("#f-" + id), jenis = pakejById(d.pakej).jenis;
    const tambah = (el, msg) => e.push({ el, msg });
    const wajib = (k) => { if (!d[k] && f(k)) tambah(f(k), t("err.wajib", { medan: labelUntuk(f(k)) })); };
    ["anakP", "anakN", "pasP", "pasN", "tr1", "tarikh", "lokNama", "lokAlamat"].forEach(wajib);
    if (d.tarikh && d.tarikh < hariIni()) tambah(f("tarikh"), t("err.tarikhLepas"));
    if (d.mula && d.tamat && d.tamat <= d.mula) tambah(f("tamat"), t("err.tamat"));
    ["gmaps"].concat(jenis === "flip" ? [] : ["waze"]).forEach((k) => { if (d[k] && !urlSah(d[k])) tambah(f(k), t("err.url", { medan: labelUntuk(f(k)) })); });
    if (jenis !== "flip") {
      if (d.muzik !== "tiada" && !FAIL.lagu && !d.muzikTajuk) tambah(f("muzikTajuk"), t("err.lagu"));
      const rAc = $$("#aturcara-senarai .baris");
      const penuhAc = d.aturcara.filter((r) => r[0] && r[1]).length;
      const separuh = d.aturcara.findIndex((r) => (r[0] || r[1]) && !(r[0] && r[1]));
      if (d.aturcaraAda !== false) {
        if (!penuhAc) tambah(rAc[0] ? $("input", rAc[0]) : null, t("err.aturcara"));
        else if (separuh > -1) tambah($("input", rAc[separuh]), t("err.aturcaraSeparuh"));
      }
      if (d.rsvpAkhir && d.tarikh && d.rsvpAkhir > d.tarikh) tambah(f("rsvpAkhir"), t("err.akhir"));
      const rHb = $$("#hubungi-senarai .baris");
      const sah = d.hubungi.filter((h) => h.nama && telSah(h.nombor)).length;
      d.hubungi.forEach((h, i) => { if (h.nama && h.nombor && !telSah(h.nombor)) tambah($(".hb-nombor", rHb[i]), t("err.hubungiNo", { nama: h.nama })); });
      if (!sah) tambah(rHb[0] ? $("input", rHb[0]) : null, t("err.hubungi"));
    }
    if (jenis === "premium" && d.galeriAda !== false && !FAIL.galeri.some(Boolean)) tambah($("#slot-galeri .slot-fail"), t("err.galeri"));
    if (jenis === "premium" && d.hadiahAda) {
      ["bank", "akaunNama", "akaun"].forEach(wajib);
      if (d.akaun && !/^\d{6,20}$/.test(bersihAkaun(d.akaun))) tambah(f("akaun"), t("err.akaun"));
    }
    // the customer's contact details: needed to pay (the database checks them again when the order is confirmed)
    if (f("namaPelanggan") && d.namaPelanggan.length < 2) tambah(f("namaPelanggan"), t("err.nama"));
    if (!telSah(d.telefon)) tambah(f("telefon"), t("err.telefon"));
    if (!emelSah(d.emel)) tambah(f("emel"), t("err.emel"));
    return e;
  }
  function tunjukRalat(senarai, kotak) {
    const box = kotak || $("#ralat");
    $$('[aria-invalid="true"]').forEach((el) => el.removeAttribute("aria-invalid"));
    if (!box) return;
    if (!senarai.length) { box.hidden = true; return; }
    senarai.forEach((x) => { if (x.el) x.el.setAttribute("aria-invalid", "true"); });
    box.innerHTML = `<p>${esc(t("err.tajuk"))}</p><ul>${senarai.map((x, i) => `<li><button type="button" data-i="${i}">${esc(x.msg)}</button></li>`).join("")}</ul>`;
    $$("button", box).forEach((b) => b.addEventListener("click", () => { const x = senarai[+b.dataset.i]; if (x.el) api.fokus(x.el); }));
    box.hidden = false;
    box.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /* ---------- 10. SUBMIT ORDER: see section D (hantarTempahan) ---------- */
  function waPautan(teks) { return `https://wa.me/${normTel(SHOP.whatsapp)}?text=${encodeURIComponent(teks)}`; }

  function ringkasan() {
    if (!$("#r-tema")) return;
    const d = kumpul(), kosong = t("r.kosong"), p = pakejById(state.pakej);
    $("#r-pakej").textContent = p.nama[lang];
    const tmR = temaById(state.tema), wR = warnaFlipDipilih(tmR, state.gayaFlip);
    $("#r-tema").textContent = tmR.nama + (wR ? " · " + wR.nama : "");
    $("#r-pengantin").textContent = d.anakP && d.pasP ? `${d.anakP} & ${d.pasP}` : kosong;
    $("#r-tarikh").textContent = d.tarikh ? tarikhPenuh(d.tarikh) : kosong;
    $("#r-harga").textContent = rm(hargaTema(state.tema));
  }

  /* ---------- 11. PACKAGES ---------- */
  const CEK = '<svg class="ikon" aria-hidden="true"><use href="#i-cek"/></svg>';
  function binaPakej() {
    const g = $("#pakej-grid");
    if (!g) return;
    g.innerHTML = PAKEJ.map((p) => {
      if (p.akan) {
        // not on sale yet: shown so couples know it's coming, but can't be picked
        return `<div class="pakej akan" data-pakej="${p.id}" aria-disabled="true">
          <span class="pakej-atas"><span class="pakej-nama">${esc(p.nama[lang])}</span><span class="chip akan">${esc(t("pakej.akan"))}</span></span>
          <span class="pakej-ringkas">${esc(p.ringkas[lang])}</span>
          <ul class="pakej-ciri">${p.ciri[lang].map((c) => `<li>${CEK}<span>${esc(c)}</span></li>`).join("")}</ul>
          <span class="pakej-pilih">${esc(t("pakej.akan"))}</span>
        </div>`;
      }
      return `<label class="pakej" data-pakej="${p.id}">
        <input type="radio" name="pakej" value="${p.id}"${p.id === state.pakej ? " checked" : ""}>
        <span class="pakej-atas"><span class="pakej-nama">${esc(p.nama[lang])}</span>${p.chip ? `<span class="chip">${esc(p.chip[lang])}</span>` : ""}</span>
        <span class="pakej-harga${hargaPakej(p).includes("–") ? " julat" : ""}">${esc(hargaPakej(p))}</span>
        <span class="pakej-ringkas">${esc(p.ringkas[lang])}</span>
        <ul class="pakej-ciri">${p.ciri[lang].map((c) => `<li>${CEK}<span>${esc(c)}</span></li>`).join("")}${p.tiada ? `<li class="tiada"><span aria-hidden="true">–</span><span>${esc(p.tiada[lang])}</span></li>` : ""}</ul>
        <span class="pakej-pilih" aria-hidden="true">${esc(t(p.id === state.pakej ? "pakej.dipilih" : "pakej.pilih"))}</span>
      </label>`;
    }).join("");
  }
  const temaPertama = (jenis) => (TEMA.find((x) => x.pakej === jenis) || TEMA[0]).id;
  function pilihPakej(id, skrol) {
    const p = pakejById(id);
    if (p.akan) return;
    const lama = jenisKini();
    state.temaIkut[lama] = state.tema;
    state.pakej = p.id;
    const jenis = jenisKini();
    if (temaById(state.tema).pakej !== jenis) state.tema = state.temaIkut[jenis] || temaPertama(jenis);
    state.tapisHarga = jenis; state.tapisGaya = "semua";
    binaPilihan();
    kemasPakejUI();
    pilihTema(state.tema, lama === jenis);
    simpanDraf();
    if (skrol) setTimeout(() => { const s = $("#bina-seksyen"); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" }); }, 120);
  }
  /* which form blocks apply to a package type */
  function blokAktif(el, jenis) {
    jenis = jenis || jenisKini();
    if (el.classList.contains("bukan-flip") && jenis === "flip") return false;
    if (el.classList.contains("flip-sahaja") && jenis !== "flip") return false;
    if (el.classList.contains("prem-sahaja") && jenis !== "premium") return false;
    return true;
  }
  function kemasPakejUI() {
    const p = pakejById(state.pakej), jenis = p.jenis;
    document.body.dataset.jenis = jenis;
    $$('input[name="pakej"]').forEach((r) => { r.checked = r.value === p.id; });
    $$(".pakej:not(.akan)").forEach((el) => { const pil = $(".pakej-pilih", el); if (pil) pil.textContent = t(el.dataset.pakej === p.id ? "pakej.dipilih" : "pakej.pilih"); });
    const ey = $("#bina-eyebrow"); if (ey) ey.textContent = t("pakej.label", { nama: p.nama[lang], harga: hargaPakej(p) });
    const idea = $("#medan-idea"); if (idea) idea.hidden = p.id !== "custom";
    const nt = $("#nota-tema"); if (nt) nt.textContent = t("nota." + jenis);
    // step numbers follow the blocks this package uses
    let n = 0;
    $$("#borang .blok[data-langkah]").forEach((b) => { if (blokAktif(b, jenis)) { n++; const no = $(".no", b); if (no) no.textContent = String(n); } });
    const notis = $("#notis-pakej");
    if (notis) {
      const k = I18N.ms["notis." + p.id] ? "notis." + p.id : "notis." + jenis;
      notis.textContent = t(k); notis.hidden = false;
    }
    ringkasan();
    emit("pakej", p.id);
  }

  /* ---------- 12. TEMPLATES ON THE PAGE ---------- */
  const kadGaleri = [];
  const IO = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
    const k = e.target._kad;
    k.nampak = e.isIntersecting;
    if (k.nampak && !k.dimuat) { k.dimuat = true; paparKad(k.skrin, k.id); }
  }), { rootMargin: "300px" }) : null;

  function binaGaleri(sel, senarai, slotKosong) {
    const g = $(sel), tpl = $("#tpl-tema-kad");
    if (!g || !tpl) return;
    senarai.forEach((tm) => {
      const el = tpl.content.firstElementChild.cloneNode(true);
      el.dataset.id = tm.id;
      el.dataset.label = tm.label;
      $$('[data-slot="nama"]', el).forEach((x) => { x.textContent = tm.nama; });
      $$('[data-slot="warna"]', el).forEach((x) => { x.style.setProperty("--c1", tm.warna[0]); x.style.setProperty("--c2", tm.warna[1]); });
      $$("[data-cuba]", el).forEach((b) => b.addEventListener("click", () => bukaModal(tm.id, "galeri")));
      $$("[data-pilih]", el).forEach((b) => b.addEventListener("click", () => { if (tm.id !== state.tema) state.gayaFlip = ""; pilihTema(tm.id); api.keBorang(); }));
      g.append(el);
      terjemah(el);
      const sk = $(".skrin", el);
      if (sk) {
        const k = { id: tm.id, el, skrin: new Skrin(sk, +sk.dataset.h || 720, false), dimuat: false, nampak: false };
        sk._kad = k; kadGaleri.push(k);
        if (IO) IO.observe(sk); else { k.dimuat = true; paparKad(k.skrin, k.id); }
      }
    });
    const kosong = $("#tpl-tema-kosong");
    for (let i = 0; kosong && i < slotKosong; i++) {
      const el = kosong.content.firstElementChild.cloneNode(true);
      $$('[data-slot="nama"]', el).forEach((x) => { x.dataset.slotN = String(senarai.length + i + 1); });
      g.append(el);
      terjemah(el);
    }
  }
  /* style chips above the Basic and Premium galleries on the Templat tab */
  function binaTapis(sel, galeri, jenis) {
    const box = $(sel), g = $(galeri);
    if (!box || !g) return;
    box.dataset.jenis = jenis;
    box.innerHTML = ["semua"].concat(GAYA[jenis]).map((l) => `<button type="button" class="tapis" data-tapis="${l}" aria-pressed="${l === "semua"}"></button>`).join("");
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tapis]");
      if (!b) return;
      $$("[data-tapis]", box).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$(".tema-kad", g).forEach((k) => { k.hidden = b.dataset.tapis !== "semua" && k.dataset.label !== b.dataset.tapis; });
      g.scrollLeft = 0;
    });
  }
  function kemasTapisTeks() {
    $$("[data-tapis]").forEach((b) => {
      const l = b.dataset.tapis, jenis = b.parentElement.dataset.jenis;
      const bil = TEMA.filter((x) => x.pakej === jenis && (l === "semua" || x.label === l)).length;
      b.innerHTML = `${esc(t(l === "semua" ? "tapis.semua" : "label." + l))} <span>${bil}</span>`;
    });
  }
  function muatSemulaGaleri() {
    kadGaleri.forEach((k) => { if (k.nampak) paparKad(k.skrin, k.id); else k.dimuat = false; });
  }
  function kemasTemaTeks() {
    kadGaleri.forEach((k) => {
      const tm = temaById(k.id);
      $$('[data-slot="desc"]', k.el).forEach((x) => { x.textContent = tm[lang]; });
      $$('[data-slot="kata"]', k.el).forEach((x) => { x.textContent = tm.kata ? tm.kata[lang] : ""; });
      $$('[data-slot="label"]', k.el).forEach((x) => { x.textContent = t("label." + tm.label); });
      $$('[data-slot="harga"]', k.el).forEach((x) => { x.textContent = rm(hargaTema(tm.id)); });
      $$("[data-cuba]", k.el).forEach((b) => b.setAttribute("aria-label", t("tema.cubaAria", { tema: tm.nama })));
      $$('[data-slot="dipilih"]', k.el).forEach((x) => { x.textContent = t("tema.dipilih"); });
    });
    $$("[data-slot-n]").forEach((x) => { x.textContent = t("tl.slot", { n: x.dataset.slotN }); });
    kemasTapisTeks();
    const nm = $("#hero-tema-nama"); if (nm) nm.textContent = temaById(state.tema).nama;
    const fl = jenisKini() === "flip";
    [["#mod-kad", fl ? "pr.belakang" : "pr.kad"], ["#mod-sampul", fl ? "pr.depan" : "pr.sampul"]].forEach(([s, k]) => {
      const l = $(`label[for="${s.slice(1)}"]`); if (l) l.textContent = t(k);
    });
  }
  /* card picker in step 1: price chips (one per tier) and style chips, then the matching cards */
  const temaTapisan = () => TEMA.filter((tm) => (state.tapisHarga === "semua" || tm.pakej === state.tapisHarga) && (state.tapisGaya === "semua" || tm.label === state.tapisGaya));
  function binaTapisKad() {
    const h = $("#tapis-harga"), g = $("#tapis-gaya");
    if (!h || !g) return;
    const tier = ["flip", "basic", "premium"];
    h.innerHTML = ["semua"].concat(tier).map((j) => {
      const p = j === "semua" ? null : pakejById(pakejUntuk(j));
      const teks = p ? `${esc(p.nama[lang])} <span>${esc(hargaJenis(j))}</span>` : esc(t("tapis.semuaHarga"));
      return `<button type="button" class="tapis" data-tapis-harga="${j}" aria-pressed="${state.tapisHarga === j}">${teks}</button>`;
    }).join("");
    const gaya = state.tapisHarga === "semua" ? GAYA.basic.concat(GAYA.premium.filter((x) => !GAYA.basic.includes(x))) : GAYA[state.tapisHarga] || [];
    const kumpulan = $("#tapis-gaya-kumpulan");
    if (kumpulan) kumpulan.hidden = !gaya.length;
    if (!gaya.includes(state.tapisGaya)) state.tapisGaya = "semua";
    const dalamHarga = (l) => TEMA.filter((tm) => (state.tapisHarga === "semua" || tm.pakej === state.tapisHarga) && (l === "semua" || tm.label === l)).length;
    g.innerHTML = ["semua"].concat(gaya).map((l) => `<button type="button" class="tapis" data-tapis-gaya="${l}" aria-pressed="${state.tapisGaya === l}">${esc(t(l === "semua" ? "tapis.semua" : "label." + l))} <span>${dalamHarga(l)}</span></button>`).join("");
  }
  function binaPilihan() {
    const box = $("#pilih-tema");
    if (box) {
      const senarai = temaTapisan(), semua = state.tapisHarga === "semua";
      box.dataset.jenis = state.tapisHarga;
      box.innerHTML = senarai.map((tm) => `<label class="tema-pil"><input type="radio" name="tema" value="${tm.id}"${tm.id === state.tema ? " checked" : ""}><span class="warna" style="--c1:${tm.warna[0]};--c2:${tm.warna[1]}"></span><span class="tp-teks"><span class="tp-nama">${esc(!semua && tm.pakej === "flip" ? tm.nama.replace(/^Flip /, "") : tm.nama)}</span><span class="tp-harga">${esc(rm(hargaTema(tm.id)))}</span></span></label>`).join("");
      const kosong = $("#pilih-kosong"); if (kosong) kosong.hidden = senarai.length > 0;
    }
    binaTapisKad();
    const sw = $("#hero-warna");
    if (sw && !sw.children.length) {
      sw.innerHTML = TEMA.filter((tm) => tm.hero).map((tm) => `<button type="button" class="warna" data-tema="${tm.id}" aria-label="${esc(tm.nama)}" aria-pressed="false" style="--c1:${tm.warna[0]};--c2:${tm.warna[1]}"></button>`).join("");
    }
  }
  function pilihTema(id, senyap) {
    const tm = temaById(id);
    if (tm.pakej !== jenisKini()) {
      // a template from another tier moves the order to the cheapest package that uses it
      state.temaIkut[jenisKini()] = state.tema;
      state.pakej = pakejUntuk(tm.pakej);
      state.tema = tm.id;
      if (state.tapisHarga !== "semua") { state.tapisHarga = tm.pakej; state.tapisGaya = "semua"; }
      binaPilihan(); kemasPakejUI();
    }
    state.tema = tm.id;
    state.temaIkut[tm.pakej] = tm.id;
    $$('input[name="tema"]').forEach((r) => { r.checked = r.value === state.tema; });
    $$("#hero-warna [data-tema]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tema === state.tema)));
    kadGaleri.forEach((k) => k.el.classList.toggle("dipilih", k.id === state.tema));
    kemasTemaTeks();
    binaWarnaFlip();
    ringkasan();
    if (senyap) return;
    simpanDraf();
    paparHero();
    paparBina(false);
    emit("tema", state.tema);
  }

  let skrinHero = null, skrinBina = null, skrinModal = null, skrinInsta = null, binaSiap = false;
  function paparHero() { if (skrinHero) paparKad(skrinHero, state.tema); }
  function modBina() { const m = $('input[name="mod"]:checked'); return m ? m.value : "kad"; }
  function paparBina(jaga, hal) {
    if (!skrinBina || tabKini !== "tempah") { binaSiap = false; return; }
    binaSiap = true;
    paparKad(skrinBina, state.tema, { buka: modBina() === "kad", jaga, hal });
  }

  /* ---------- 13. PREVIEW DIALOG ---------- */
  let modalIdx = 0, modalDari = "galeri";
  function bukaModal(id, dari) {
    const dlg = $("#modal");
    if (!dlg) return;
    modalIdx = TEMA.findIndex((x) => x.id === id); if (modalIdx < 0) modalIdx = 0;
    modalDari = dari || "galeri";
    modalGaya = "";
    paparModal();
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
  }

  /* QW-KF: Flip colours (Template -> Colour). warnaFlip on a TEMA entry = its 4 colours. */
  const warnaFlipDipilih = (tm, k) => tm && tm.warnaFlip ? (tm.warnaFlip.find((w) => w.key === k) || tm.warnaFlip[0]) : null;
  const butangWarna = (tm, kini) => tm.warnaFlip.map((w) => `<button type="button" role="radio" data-warna-flip="${w.key}" aria-checked="${w.key === kini}" title="${esc(w.nama)}"><span class="warna" style="--c1:${w.sw[0]};--c2:${w.sw[1]}"></span><span class="nm">${esc(w.nama)}</span></button>`).join("");
  function binaWarnaFlip() {
    const m = $("#flip-warna-medan"), box = $("#flip-warna");
    if (!m || !box) return;
    const tm = temaById(state.tema), w = warnaFlipDipilih(tm, state.gayaFlip);
    m.hidden = !w;
    box.innerHTML = w ? butangWarna(tm, w.key) : "";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("#flip-warna [data-warna-flip]");
    if (!b) return;
    state.gayaFlip = b.dataset.warnaFlip;
    binaWarnaFlip(); simpanDraf(); paparHero(); paparBina(true); ringkasan();
  });
  let modalGaya = "";
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("#modal-warna [data-warna-flip]");
    if (!b) return;
    modalGaya = b.dataset.warnaFlip; paparModal();
  });
  function paparModal() {
    kemasModalTeks();
    const tm = TEMA[modalIdx], w = warnaFlipDipilih(tm, modalGaya || (tm.id === state.tema ? state.gayaFlip : ""));
    const mw = $("#modal-warna"); if (mw) { mw.hidden = !w; mw.innerHTML = w ? butangWarna(tm, w.key) : ""; }
    if (skrinModal) paparKad(skrinModal, tm.id, w ? { bunyi: true, cfg: buatConfig(kumpul(), true, { tema: tm.id, gaya: w.key }) } : { bunyi: true });
  }
  function kemasModalTeks() {
    if (!$("#modal")) return;
    const tm = TEMA[modalIdx];
    $("#modal-tajuk").textContent = tm.nama;
    const sama = modalDari === "borang" && tm.id === state.tema;
    $("#modal-pilih").textContent = t(sama ? "modal.kembali" : "modal.pilih");
    const h = $("#modal-harga"); if (h) h.textContent = rm(hargaTema(tm.id));
    const kt = $("#modal-kata"); if (kt) kt.textContent = tm.kata ? tm.kata[lang] : "";
  }
  function pasangModal() {
    const dlg = $("#modal");
    if (!dlg) return;
    skrinModal = new Skrin($("#skrin-modal"), 780, true);
    const tutup = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); };
    // stop the card (and its music) when the dialog closes
    dlg.addEventListener("close", () => { skrinModal.tok++; skrinModal.f.forEach((f) => { f.srcdoc = ""; f.classList.remove("on"); }); skrinModal.el.classList.remove("siap"); });
    $("#modal-tutup").addEventListener("click", tutup);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) tutup(); });
    $("#modal-seb").addEventListener("click", () => { modalIdx = (modalIdx + TEMA.length - 1) % TEMA.length; modalGaya = ""; paparModal(); });
    $("#modal-brk").addEventListener("click", () => { modalIdx = (modalIdx + 1) % TEMA.length; modalGaya = ""; paparModal(); });
    $("#modal-pilih").addEventListener("click", () => {
      const id = TEMA[modalIdx].id, sama = modalDari === "borang" && id === state.tema;
      tutup();
      if (modalGaya && TEMA[modalIdx].warnaFlip) state.gayaFlip = modalGaya;
      if (!sama) { pilihTema(id); api.keBorang(); } else if (modalGaya) { binaWarnaFlip(); simpanDraf(); paparHero(); paparBina(true); }
    });
  }

  /* ---------- 14. INSTAWEDDING ---------- */
  const orang = (x, y, baju, tudung, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><path d="M-9 30 -6 8Q0 3 6 8L9 30Z" fill="${baju}"/><path d="M-6.5 3.5Q-7 -8 0 -8.5Q7 -8 6.5 3.5Q3 7 0 7Q-3 7 -6.5 3.5Z" fill="${tudung}"/><ellipse cx="0" cy="-.5" rx="3.6" ry="4.3" fill="#E7BFA0"/></g>`;
  const lelaki = (x, y, baju, s) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><path d="M-9 30 -7 8Q0 4 7 8L9 30Z" fill="${baju}"/><path d="M-9 30-7 22 7 22 9 30Z" fill="#E3C27A" opacity=".85"/><ellipse cx="0" cy="0" rx="4.4" ry="5" fill="#D9AE8C"/><rect x="-4.6" y="-8.5" width="9.2" height="5" rx="1" fill="#1C1C22"/></g>`;
  const ADEGAN = {
    pelamin: (h) => `<defs><linearGradient id="g${h}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DCCB"/><stop offset="1" stop-color="#E7B4A6"/></linearGradient></defs><rect width="100" height="100" fill="url(#g${h})"/><path d="M18 100V46Q18 16 50 12Q82 16 82 46V100" fill="#FBEFE6" stroke="#C8A350" stroke-width="2"/>${[20, 32, 44, 56, 68, 80].map((x, i) => `<circle cx="${x}" cy="${20 + Math.abs(50 - x) * .55}" r="${4 + (i % 2)}" fill="${i % 2 ? "#F2A7B8" : "#FFFFFF"}"/>`).join("")}<rect x="28" y="62" width="44" height="6" rx="3" fill="#C8A350"/>${orang(42, 56, "#FFF8EE", "#F4EDE2", 1.05)}${lelaki(58, 55, "#FFF8EE", 1.05)}<rect y="88" width="100" height="12" fill="#9A5B6A" opacity=".35"/>`,
    hidangan: () => `<rect width="100" height="100" fill="#EFDDB9"/><circle cx="46" cy="52" r="30" fill="#fff"/><circle cx="46" cy="52" r="25" fill="#F7F1E7"/><path d="M28 54Q30 36 46 34Q62 36 64 54Z" fill="#F0C75E"/><circle cx="54" cy="60" r="7" fill="#B8412F"/><circle cx="38" cy="62" r="5" fill="#6F9C4B"/><circle cx="84" cy="22" r="11" fill="#fff"/><circle cx="84" cy="22" r="8" fill="#C0492F"/><circle cx="16" cy="84" r="10" fill="#fff"/><circle cx="16" cy="84" r="7" fill="#E0B24A"/>`,
    manggar: () => `<rect width="100" height="100" fill="#1F5A5E"/>${Array.from({ length: 9 }, (_, i) => { const a = (-150 + i * 15) * Math.PI / 180, x = 50 + Math.cos(a) * 46, y = 96 + Math.sin(a) * 80; return `<path d="M50 96Q${(50 + x) / 2 + 6} ${(96 + y) / 2} ${x.toFixed(1)} ${y.toFixed(1)}" stroke="#E7D7A6" stroke-width="1.2" fill="none"/>${[0.45, 0.7, 1].map((tt, j) => `<circle cx="${(50 + (x - 50) * tt).toFixed(1)}" cy="${(96 + (y - 96) * tt).toFixed(1)}" r="${2.6 + j}" fill="${["#F2B233", "#F07A8C", "#FFFFFF", "#C8A350"][(i + j) % 4]}"/>`).join("")}`; }).join("")}`,
    cincin: (h) => `<defs><radialGradient id="r${h}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#FCEFF3"/><stop offset="1" stop-color="#E6C3CF"/></radialGradient></defs><rect width="100" height="100" fill="url(#r${h})"/><circle cx="42" cy="58" r="17" fill="none" stroke="#D9B45E" stroke-width="5"/><circle cx="60" cy="56" r="15" fill="none" stroke="#EBD7A0" stroke-width="4"/><path d="M42 33l4 6-4 5-4-5z" fill="#FFFFFF" stroke="#C9C3D8"/><path d="M76 22l1.6 4.4L82 28l-4.4 1.6L76 34l-1.6-4.4L70 28l4.4-1.6z" fill="#fff"/>`,
    tetamu: (h) => `<defs><linearGradient id="t${h}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE3EE"/><stop offset="1" stop-color="#F4E7DA"/></linearGradient></defs><rect width="100" height="100" fill="url(#t${h})"/><path d="M0 14Q50 30 100 14" stroke="#9B8A7A" fill="none"/>${[8, 22, 36, 50, 64, 78, 92].map((x, i) => `<path d="M${x - 5} ${14 + Math.sin(x / 100 * Math.PI) * 11}h10l-5 9z" fill="${["#F0735A", "#1E9A9A", "#F2B233"][i % 3]}"/>`).join("")}${orang(20, 60, "#7FB7A4", "#F2E3C9")}${lelaki(36, 58, "#3D5A8A")}${orang(52, 60, "#E48FA6", "#5A2150")}${lelaki(68, 58, "#E0A94E")}${orang(84, 60, "#9C7BC0", "#EDE4F4")}<rect y="90" width="100" height="10" fill="#E8D6C0"/>`,
    kek: () => `<rect width="100" height="100" fill="#E9DDF0"/><circle cx="80" cy="18" r="30" fill="#F4ECF7"/><rect x="30" y="66" width="40" height="18" rx="3" fill="#FFFFFF"/><rect x="35" y="50" width="30" height="16" rx="3" fill="#FBF6FB"/><rect x="40" y="36" width="20" height="14" rx="3" fill="#FFFFFF"/><path d="M30 72h40M35 56h30M40 41h20" stroke="#E8C7D6" stroke-width="2"/><circle cx="44" cy="35" r="3" fill="#E893AE"/><circle cx="50" cy="33" r="3.4" fill="#F4B6C8"/><circle cx="56" cy="35" r="3" fill="#E893AE"/><rect x="22" y="84" width="56" height="4" rx="2" fill="#C8A350"/>`
  };
  const FOTO = [["pelamin", "Farah", 48, -3], ["hidangan", "Hafiz", 27, 2.5], ["tetamu", "Aina", 31, -1.5], ["cincin", "Mak Long", 12, 3], ["manggar", "Zul", 19, -2.5], ["kek", "Mei Ling", 22, 1.5]];
  function binaKolaj() {
    $$("[data-kolaj]").forEach((k, n) => {
      const bil = +k.dataset.kolaj;
      k.innerHTML = FOTO.slice(0, bil).map(([s, nama, suka, r], i) => `<figure class="foto" style="--r:${r}deg"><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">${ADEGAN[s]("k" + n + i)}</svg>
        <figcaption class="foto-bawah"><span>${esc(nama)}</span><span class="h">♥ ${suka}</span></figcaption></figure>`).join("");
    });
  }
  function qrContoh(seedStr) {
    const N = 25;
    let seed = Array.from(seedStr).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const m = Array.from({ length: N }, () => Array(N).fill(0));
    const finder = (r0, c0) => { for (let i = -1; i < 8; i++) for (let j = -1; j < 8; j++) { const r = r0 + i, c = c0 + j; if (r < 0 || c < 0 || r >= N || c >= N) continue; const tepi = i === 0 || i === 6 || j === 0 || j === 6, teras = i >= 2 && i <= 4 && j >= 2 && j <= 4; m[r][c] = (i >= 0 && i <= 6 && j >= 0 && j <= 6 && (tepi || teras)) ? 1 : 2; } };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
    for (let i = 8; i < N - 8; i++) { m[6][i] = i % 2 ? 2 : 1; m[i][6] = i % 2 ? 2 : 1; }
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) m[18 + i][18 + j] = Math.max(Math.abs(i), Math.abs(j)) === 1 ? 2 : 1;
    let d = "";
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = m[r][c] || (rnd() < .48 ? 1 : 2); if (v === 1) d += `M${c} ${r}h1v1h-1z`; }
    return `<svg viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges" aria-hidden="true"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><path d="${d}" fill="#2A1026"/></svg>`;
  }
  let kunciInsta = "";
  function paparInsta(paksa) {
    const d = kumpul(), c = buatConfig(d, true);
    const kunci = [c.anak.panggilan, c.pasangan.panggilan, c.mula].join("|");
    if (!paksa && kunci === kunciInsta) return;
    kunciInsta = kunci;
    if (skrinInsta) paparKad(skrinInsta, null, { fail: "insta/demo.html", cfg: { anak: { panggilan: c.anak.panggilan }, pasangan: { panggilan: c.pasangan.panggilan }, mula: c.mula }, latar: "#FBF8F4" });
    const km = $("#kad-meja");
    if (km) {
      const [y, m, dd] = c.mula.slice(0, 10).split("-");
      km.innerHTML = `<div class="km-atas"><svg aria-hidden="true"><use href="#q-logo"/></svg><span>InstaWedding</span></div>
        <div class="km-tengah"><p class="km-kecil">Walimatul Urus</p><p class="km-nama">${esc(c.anak.panggilan)} &amp; ${esc(c.pasangan.panggilan)}</p><p class="km-kecil">${dd} · ${m} · ${y}</p></div>
        <div class="km-qr">${qrContoh(kunci)}</div>
        <div class="km-bawah"><p class="km-teks">Imbas untuk kongsi gambar &amp; ucapan</p><p class="km-kecil">Tiada aplikasi diperlukan</p></div>`;
    }
    const iNama = $("#i-nama");
    if (iNama && !iNama.value) iNama.placeholder = `${c.pasangan.panggilan} & ${c.anak.panggilan}`;
  }
  let terakhirInsta = null;
  function paparSelepasInsta(teks) {
    terakhirInsta = teks;
    const box = $("#i-selepas");
    if (!box) return;
    const adaNo = !!SHOP.whatsapp;
    box.innerHTML = `<h3>${esc(t("lepas.tajuk"))}</h3>
      ${adaNo ? "" : `<p class="notis">${esc(t("lepas.kedai"))}</p>`}
      <ol>${adaNo ? `<li>${esc(t("lepas.1"))}</li>` : ""}<li>${esc(t("ig.lepas.2", { harga: HARGA_INSTA }))}</li><li>${esc(t("ig.lepas.3"))}</li></ol>
      ${adaNo ? "" : `<div class="kod-baris"><textarea id="i-kod" readonly rows="4" aria-label="Pesanan">${esc(teks)}</textarea><button class="btn garis kecil" type="button" id="i-salin">${esc(t("salin"))}</button></div>`}`;
    const s = $("#i-salin"); if (s) s.addEventListener("click", (e) => salin(teks, e.currentTarget, $("#i-kod")));
    box.hidden = false;
  }
  function kemasInstaUI() {
    const perlu = false;   // sign-in is optional: the request goes to WhatsApp
    if ($("#i-perlu-masuk")) $("#i-perlu-masuk").hidden = !perlu;
    if ($("#i-hantar")) $("#i-hantar").hidden = perlu;
  }
  function pasangInsta() {
    const btn = $("#i-hantar");
    if (!btn) return;
    $("#borang-insta").addEventListener("submit", (e) => e.preventDefault());
    $("#borang-insta").addEventListener("input", (e) => { e.target.removeAttribute("aria-invalid"); });
    btn.addEventListener("click", (e) => {
      const nama = $("#i-nama").value.trim(), tarikh = $("#i-tarikh").value, tetamu = $("#i-tetamu").value;
      const err = [];
      if (nama.length < 3) err.push({ el: $("#i-nama"), msg: t("ig.err.nama") });
      if (!tarikh || tarikh < hariIni()) err.push({ el: $("#i-tarikh"), msg: t("ig.err.tarikh") });
      tunjukRalat(err, $("#i-ralat"));
      if (err.length) { e.preventDefault(); $("#i-selepas").hidden = true; return; }
      const L = [`*Tempahan InstaWedding ${SHOP.nama}*`, `Pengantin: ${nama}`, `Tarikh: ${tarikhPenuhMs(tarikh)}`, `Anggaran tetamu: ${tetamu}`, `Harga: ${HARGA_INSTA}`];
      if (AKAUN.user && !AKAUN.user.tetamu) L.push(`Akaun: @${AKAUN.user.nama_pengguna}${AKAUN.user.emel ? " · " + AKAUN.user.emel : ""}`);
      const teks = L.join("\n");
      if (SHOP.whatsapp) btn.href = waPautan(teks); else e.preventDefault();
      paparSelepasInsta(teks);
    });
  }

  /* ---------- 15. ACCOUNTS: see sections B and C (Supabase when configured, demo store otherwise) ---------- */
  const authSedia = () => !!(SHOP.supabaseUrl && SHOP.supabaseAnonKey);

  /* ---------- 16. TABS ---------- */
  const TAB = ["home", "tempah", "template", "instawedding", "soalan", "masuk", "admin"];
  let tabKini = null;
  function laluan() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h === "bayar-selesai") return tukarTab("masuk", null);
    if (TAB.includes(h)) return tukarTab(h, null);
    const el = h && /^[\w-]+$/.test(h) ? document.getElementById(h) : null;
    const sec = el ? el.closest("[data-tab-isi]") : null;
    if (sec) return tukarTab(sec.dataset.tabIsi, el);
    if (!tabKini) tukarTab("home", null);
  }
  function tukarTab(id, sasaran) {
    const berubah = id !== tabKini;
    tabKini = id;
    if (id === "admin" && lang !== "en") { bahasaSebelumAdmin = lang; setBahasa("en", false); }
    else if (id !== "admin" && bahasaSebelumAdmin) { const l = bahasaSebelumAdmin; bahasaSebelumAdmin = null; setBahasa(l, false); }
    $$("[data-tab-isi]").forEach((s) => { s.hidden = s.dataset.tabIsi !== id; });
    $$("[data-ke-tab]").forEach((a) => { if (a.dataset.keTab === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.body.dataset.tab = id;
    if (sasaran) requestAnimationFrame(() => sasaran.scrollIntoView({ behavior: berubah ? "auto" : "smooth", block: "start" }));
    else if (berubah) window.scrollTo(0, 0);
    if (!berubah) return;
    if (id === "tempah" && !binaSiap) paparBina(false);
    if (id === "instawedding") paparInsta(false);
    if (id === "masuk") { kemasAkaunUI(); if (AKAUN.user) muatPapan(); }
    if (id === "admin") kemasAdmin();
    emit("tab", id);
  }

  /* ---------- 17. DRAFT + FORM EVENTS ---------- */
  // the admin editing a customer's order must not overwrite their own draft
  const simpanDraf = debounce(() => { if (!(state.edit && state.edit.admin)) store.set("qawwam-draf", kumpul()); }, 400);
  let kunciSampul = "";
  const kemasPratonton = debounce(() => {
    paparBina(true);
    const d = kumpul(), k = [d.anakP, d.pasP, d.tarikh].join("|");
    if (k !== kunciSampul) { kunciSampul = k; paparHero(); muatSemulaGaleri(); if (tabKini === "instawedding") paparInsta(false); else kunciInsta = ""; }
  }, 450);

  function pasangBorang() {
    const borang = $("#borang");
    if (borang) {
      borang.addEventListener("submit", (e) => e.preventDefault());
      borang.addEventListener("input", (e) => {
        const el = e.target;
        if (el.type === "file") return;
        if (el.getAttribute("aria-invalid")) el.removeAttribute("aria-invalid");
        if (el.id === "f-hijri") el.dataset.auto = el.value ? "0" : "1";
        if (el.id === "f-tarikh") autoHijri();
        if (el.id === "f-anakP" || el.id === "f-pasP") { const h = $("#h-" + el.id.slice(2)); if (h) h.value = el.value; }
        if (el.id === "f-hadiahAda") kemasHadiah();
        if (el.id === "f-aturcaraAda" || el.id === "f-galeriAda") kemasTogol();
        if (el.name === "tema") return;
        ringkasan(); simpanDraf(); kemasPratonton();
      });
      // the preview follows the part of the form being filled in (Lokasi -> the card's Lokasi page, etc.)
      let halKini = "";
      borang.addEventListener("focusin", (e) => {
        const b = e.target.closest("[data-hal]");
        if (!b || b.dataset.hal === halKini || jenisKini() === "flip" || modBina() !== "kad") return;
        halKini = b.dataset.hal;
        paparBina(false, halKini);
      });
      borang.addEventListener("change", (e) => {
        if (e.target.name === "hubungan") { simpanDraf(); kemasPratonton(); }
        if (e.target.name === "muzik") { kemasTogol(); simpanDraf(); kemasPratonton(); }
        if (e.target.name === "tema") { state.gayaFlip = ""; pilihTema(e.target.value); }
      });
      borang.addEventListener("click", (e) => {
        const b = e.target.closest(".buang");
        if (!b) return;
        const r = b.closest(".baris"), senarai = r.parentElement;
        r.remove();
        if (!$(".baris", senarai)) { if (senarai.id === "aturcara-senarai") tambahAcara(); else tambahHubungi(); }
        simpanDraf(); kemasPratonton();
      });
    }
    const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
    on("#tambah-acara", "click", () => { if ($$("#aturcara-senarai .baris").length < 10) { const r = tambahAcara(); if (r) $("input", r).focus(); } });
    on("#contoh-acara", "click", () => { $("#aturcara-senarai").textContent = ""; SAMPLE.aturcara.forEach((r) => tambahAcara(r)); simpanDraf(); kemasPratonton(); });
    on("#tambah-hubungi", "click", () => { if ($$("#hubungi-senarai .baris").length < 5) { const r = tambahHubungi(); if (r) $("input", r).focus(); } });
    ["anakP", "pasP"].forEach((k) => on("#h-" + k, "input", (e) => { const f = $("#f-" + k); if (f) f.value = e.target.value; ringkasan(); simpanDraf(); kemasPratonton(); }));
    $$('input[name="mod"]').forEach((r) => r.addEventListener("change", () => paparBina(false)));
    on("#pakej-grid", "change", (e) => { if (e.target.name === "pakej") pilihPakej(e.target.value, true); });
    on("#tapis-harga", "click", (e) => { const b = e.target.closest("[data-tapis-harga]"); if (b) { state.tapisHarga = b.dataset.tapisHarga; state.tapisGaya = "semua"; binaPilihan(); } });
    on("#tapis-gaya", "click", (e) => { const b = e.target.closest("[data-tapis-gaya]"); if (b) { state.tapisGaya = b.dataset.tapisGaya; binaPilihan(); } });
    on("#hero-warna", "click", (e) => { const b = e.target.closest("[data-tema]"); if (b) pilihTema(b.dataset.tema); });
  }
  function kemasHadiah() { const m = $("#hadiah-medan"); if (m) m.hidden = !cek("hadiahAda"); }
  function autoHijri() {
    const h = $("#f-hijri");
    if (!h) return;
    const cadang = hijriDari(nilai("tarikh"));
    h.placeholder = cadang || "2 Rejab 1448H";
    if (h.dataset.auto !== "0") h.value = cadang;
  }

  /* ---------- 18. "I'm interested" buttons go to WhatsApp ---------- */
  function pasangMinat() {
    $$("[data-minat]").forEach((a) => {
      const teks = `Salam ${SHOP.nama}, saya berminat dengan: ${a.dataset.minat}. Tarikh majlis saya: `;
      if (SHOP.whatsapp) { a.href = waPautan(teks); a.target = "_blank"; a.rel = "noopener"; }
      else a.addEventListener("click", (e) => e.preventDefault());
    });
    const wa = $("#kaki-wa");
    if (wa && SHOP.whatsapp) wa.textContent = telPapar(SHOP.whatsapp);
    $$("[data-ada-wa]").forEach((el) => { el.hidden = !SHOP.whatsapp; });
  }

  /* ---------- 19. ADMIN: see section F ---------- */

  /* =====================================================================
     A. FILES THE CUSTOMER ATTACHES: song (MP3), gallery photos, DuitNow QR
     Held as Blobs with object URLs, so the live preview shows the couple's own photos and song.
     Also kept in IndexedDB, so a reload or the Google sign-in round trip doesn't lose them.
     ===================================================================== */
  const MAKS_LAGU = 10 * 1024 * 1024;
  const FAIL = { lagu: null, duitnow: null, galeri: Array(MAKS_GALERI).fill(null) };   // entry: { blob, nama, url, jauh }
  const KUNCI_FAIL = ["lagu", "duitnow"].concat(FAIL.galeri.map((_, i) => "galeri-" + i));

  const IDB = (() => {
    let db = null;
    const memori = { fail: new Map(), demo: new Map() };   // when IndexedDB is unavailable (private mode, old WebViews)
    const buka = () => db || (db = new Promise((ok, gagal) => {
      try {
        const r = indexedDB.open("qawwam", 1);
        r.onupgradeneeded = () => ["fail", "demo"].forEach((k) => { if (!r.result.objectStoreNames.contains(k)) r.result.createObjectStore(k); });
        r.onsuccess = () => ok(r.result);
        r.onerror = () => gagal(r.error);
      } catch (e) { gagal(e); }
    }));
    const op = (kedai, mod, fn) => buka().then((d) => new Promise((ok, gagal) => {
      const tx = d.transaction(kedai, mod), r = fn(tx.objectStore(kedai));
      tx.oncomplete = () => ok(r ? r.result : undefined);
      tx.onerror = tx.onabort = () => gagal(tx.error);
    }));
    return {
      async get(kedai, k) { try { return await op(kedai, "readonly", (s) => s.get(k)); } catch (e) { return memori[kedai].get(k); } },
      async set(kedai, k, v) {
        try { await op(kedai, "readwrite", (s) => (v == null ? s.delete(k) : s.put(v, k))); }
        catch (e) { if (v == null) memori[kedai].delete(k); else memori[kedai].set(k, v); }
      }
    };
  })();

  const failDari = (k) => (k.startsWith("galeri-") ? FAIL.galeri[+k.slice(7)] : FAIL[k]);
  // simpan=false: memory only (restoring, or the admin editing someone else's order)
  function setFail(k, rekod, simpan) {
    const lama = failDari(k);
    if (lama && lama.url) URL.revokeObjectURL(lama.url);
    const baru = rekod && rekod.blob ? { blob: rekod.blob, nama: rekod.nama || "", jauh: rekod.jauh || "", url: URL.createObjectURL(rekod.blob) } : null;
    if (k.startsWith("galeri-")) FAIL.galeri[+k.slice(7)] = baru; else FAIL[k] = baru;
    if (simpan !== false && !(state.edit && state.edit.admin)) IDB.set("fail", k, baru ? { blob: baru.blob, nama: baru.nama, jauh: baru.jauh } : null);
  }
  async function pulihFail() {
    for (const k of KUNCI_FAIL) {
      const r = await IDB.get("fail", k);
      setFail(k, r && r.blob ? r : null, false);
    }
  }
  function kosongkanFail(simpan) { KUNCI_FAIL.forEach((k) => setFail(k, null, simpan)); }

  async function kecilkanGambar(fail, o) {
    let src, tutup = () => {};
    try { src = await createImageBitmap(fail); tutup = () => src.close && src.close(); }
    catch (e) {
      src = await new Promise((ok, gagal) => {
        const img = new Image(), u = URL.createObjectURL(fail);
        img.onload = () => { URL.revokeObjectURL(u); ok(img); };
        img.onerror = () => { URL.revokeObjectURL(u); gagal(new Error("decode")); };
        img.src = u;
      });
    }
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
    if (!w0 || !h0) throw new Error("decode");
    const k = Math.min(1, o.maks / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    if (o.jenis === "image/jpeg") { x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, w, h); }
    x.drawImage(src, 0, 0, w, h);
    tutup();
    const blob = await new Promise((ok) => c.toBlob(ok, o.jenis, o.mutu || 0.86));
    if (!blob) throw new Error("encode");
    return blob;
  }

  function binaSlot() {
    const g = $("#slot-galeri"), tpl = $("#tpl-slot");
    if (!g || !tpl || g.children.length) return;
    for (let i = 0; i < MAKS_GALERI; i++) {
      const el = tpl.content.firstElementChild.cloneNode(true);
      el.dataset.i = String(i);
      $(".slot-no", el).textContent = String(i + 1);
      g.append(el);
    }
    terjemah(g);
  }
  const kapsyenSlot = () => $$("#slot-galeri .slot-kap").map((x) => x.value.trim());

  function kemasFailUI() {
    const lagu = FAIL.lagu;
    if ($("#lagu-nama")) {
      $("#lagu-nama").textContent = lagu ? lagu.nama || "lagu.mp3" : t("fail.tiada");
      $("#lagu-nama").classList.toggle("ada", !!lagu);
      $("#lagu-buang").hidden = !lagu;
    }
    if ($("#qr-nama")) {
      const qr = FAIL.duitnow;
      $("#qr-nama").textContent = qr ? qr.nama || "duitnow.png" : t("fail.tiada");
      $("#qr-nama").classList.toggle("ada", !!qr);
      $("#qr-buang").hidden = !qr;
      $("#qr-pratonton").hidden = !qr;
      if (qr) $("#qr-pratonton img").src = qr.url;
    }
    $$("#slot-galeri .slot").forEach((el) => {
      const i = +el.dataset.i, f = FAIL.galeri[i], img = $("img", el);
      el.classList.toggle("ada", !!f);
      if (f) img.src = f.url; else img.removeAttribute("src");
      $(".slot-buang", el).hidden = !f;
      $(".slot-buang", el).setAttribute("aria-label", t("aria.buangGambar", { n: i + 1 }));
      $(".slot-fail", el).setAttribute("aria-label", t("aria.gambar", { n: i + 1 }));
    });
  }
  function kemasTogol() {
    [["aturcaraAda", "aturcara"], ["galeriAda", "galeri"]].forEach(([k, n]) => {
      const on = cek(k), isi = $(`#${n}-medan`), mati = $(`#${n}-mati`);
      if (isi) isi.hidden = !on;
      if (mati) mati.hidden = on;
    });
    const lm = $("#lagu-medan"), mz = $('input[name="muzik"]:checked');
    if (lm) lm.hidden = !!mz && mz.value === "tiada";
  }

  function pasangFail() {
    binaSlot();
    const lepas = () => { kemasFailUI(); ringkasan(); kemasPratonton(); };
    // a short message right under the file picker that failed
    const ralatFail = (el, k) => {
      const blok = el.closest(".medan, .lagu-medan, .galeri-medan, .blok");
      let m = blok && $(":scope > .ralat-fail", blok);
      if (blok && !m) { m = document.createElement("p"); m.className = "ralat-fail"; m.setAttribute("role", "alert"); blok.append(m); }
      if (!m) return;
      m.textContent = t(k); m.hidden = false;
      clearTimeout(m._t); m._t = setTimeout(() => { m.hidden = true; }, 7000);
    };
    const lagu = $("#f-laguFail");
    if (lagu) lagu.addEventListener("change", () => {
      const f = lagu.files && lagu.files[0];
      lagu.value = "";
      if (!f) return;
      if (!(/^audio\/(mpeg|mp3)$/.test(f.type) || /\.mp3$/i.test(f.name)) || f.size > MAKS_LAGU) { ralatFail(lagu, "err.laguFail"); return; }
      setFail("lagu", { blob: f, nama: f.name });
      $("#f-muzikTajuk").removeAttribute("aria-invalid");
      lepas();
    });
    const qr = $("#f-qrFail");
    if (qr) qr.addEventListener("change", async () => {
      const f = qr.files && qr.files[0];
      qr.value = "";
      if (!f) return;
      $("#qr-nama").textContent = t("fail.memproses");
      try { setFail("duitnow", { blob: await kecilkanGambar(f, { maks: 1000, jenis: "image/png" }), nama: f.name }); }
      catch (e) { ralatFail(qr, "err.gambar"); }
      lepas();
    });
    const g = $("#slot-galeri");
    if (g) {
      g.addEventListener("change", async (e) => {
        const inp = e.target.closest(".slot-fail");
        if (!inp) return;
        const el = inp.closest(".slot"), i = +el.dataset.i, f = inp.files && inp.files[0];
        inp.value = "";
        if (!f) return;
        el.classList.add("sibuk");
        try { setFail("galeri-" + i, { blob: await kecilkanGambar(f, { maks: 1600, jenis: "image/jpeg", mutu: 0.85 }), nama: f.name }); }
        catch (err) { ralatFail(inp, "err.gambar"); }
        el.classList.remove("sibuk");
        lepas();
      });
      g.addEventListener("click", (e) => {
        const b = e.target.closest(".slot-buang");
        if (!b) return;
        setFail("galeri-" + b.closest(".slot").dataset.i, null);
        lepas();
      });
    }
    const on = (s, fn) => { const el = $(s); if (el) el.addEventListener("click", fn); };
    on("#lagu-buang", () => { setFail("lagu", null); lepas(); });
    on("#qr-buang", () => { setFail("duitnow", null); lepas(); });
  }

  /* =====================================================================
     B. DATA STORE: Supabase when SHOP.supabaseUrl is set, otherwise a demo store in this browser.
     Both offer the same functions, so the sign-in page, dashboard and admin page don't care which.
     Order rows: id, kod, pemilik, status (draf|dihantar|diproses|siap|batal), pakej, tema,
                 borang (form as typed), config (card CONFIG), fail (storage paths), telefon,
                 harga, pautan, kad_id, nota_admin, dicipta, dihantar, dikemaskini
     ===================================================================== */
  // user = profile: { id, nama_pengguna, nama, emel, telefon, peranan, tetamu, emel_masuk }
  //   tetamu: a guest checkout session (Supabase anonymous sign-in: no password). It can order and pay;
  //           checking the order later and RSVPs need a password (the database enforces this).
  //   emel_masuk: the email the account signs in with (username accounts: <username>@SHOP.akaunDomain)
  const AKAUN = { user: null, siap: false };
  const ralatKod = (kod) => Object.assign(new Error(kod), { kod });
  const sebab = (e) => String((e && (e.message || e.error_description || e.msg)) || e || "").slice(0, 160);
  const emelAkaun = (nama) => `${nama}@${SHOP.akaunDomain}`;
  const emelSebenar = (e) => (e && !String(e).toLowerCase().endsWith("@" + SHOP.akaunDomain) ? e : "");
  // run fn with the page language set to English (the admin page is always English)
  const dalamEn = (fn) => { const l = lang; lang = "en"; try { return fn(); } finally { lang = l; } };
  const ABJAD = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rawak = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ABJAD[b % ABJAD.length]).join("");
  const laluanFail = (f) => (f ? [f.lagu, f.duitnow, f.resit].concat(f.galeri || []).filter(Boolean) : []);

  const GudangSB = {
    sebenar: true, sb: null,
    async sedia() {
      if (!this.sb) {
        if (!window.supabase) await muatSkrip(SUPABASE_JS);
        this.sb = window.supabase.createClient(SHOP.supabaseUrl, SHOP.supabaseAnonKey);
      }
      return this.sb;
    },
    async profil(u) {
      if (!u) return null;
      const { data } = await this.sb.from("profil").select("*").eq("id", u.id).maybeSingle();
      const p = data || { id: u.id, nama_pengguna: (u.email || "").split("@")[0], nama: "", emel: "", peranan: "pelanggan" };
      return Object.assign({}, p, { tetamu: !!u.is_anonymous, emel_masuk: u.email || "" });
    },
    async mula(ubah) {
      await this.sedia();
      const { data } = await this.sb.auth.getSession();
      this.sb.auth.onAuthStateChange((_ev, sesi) => {
        const u = sesi ? sesi.user : null, a = AKAUN.user;
        if (this.sibuk) return;   // a guest is being given a password: jadiAkaun() updates the page itself
        if ((u ? u.id : null) === (a ? a.id : null) && (!u || !!u.is_anonymous === !!a.tetamu)) return;
        // supabase-js asks not to call it again from inside this callback
        setTimeout(async () => { AKAUN.user = await this.profil(u); ubah(); }, 0);
      });
      return this.profil(data && data.session ? data.session.user : null);
    },
    async daftar(nama, kata, emel) {
      const b = await this.sb.rpc("nama_pengguna_bebas", { p: nama });
      if (!b.error && b.data === false) throw ralatKod("diambil");
      const { data, error } = await this.sb.auth.signUp({ email: emelAkaun(nama), password: kata, options: { data: { emel: emel || "" } } });
      if (error) throw /already|registered|exists/i.test(error.message) ? ralatKod("diambil") : /rate|too many/i.test(error.message) ? ralatKod("terlalu") : error;
      if (!data.session) throw ralatKod("sahkan");
      return this.profil(data.user);
    },
    async masuk(nama, kata) {
      const { data, error } = await this.sb.auth.signInWithPassword({ email: nama.includes("@") ? nama : emelAkaun(nama), password: kata });
      if (error) throw /invalid|credentials/i.test(error.message) ? ralatKod("salah") : /rate|too many/i.test(error.message) ? ralatKod("terlalu") : error;
      return this.profil(data.user);
    },
    async google() {
      const { error } = await this.sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
      if (error) throw error;
    },
    // guest checkout: a Supabase anonymous session (Authentication → Sign In / Providers → Allow anonymous sign-ins)
    async tetamu() {
      await this.sedia();
      const { data, error } = await this.sb.auth.signInAnonymously();
      if (error) {
        const m = String(error.message || "");
        throw error.code === "anonymous_provider_disabled" || /anonymous.*(disabled|not enabled)|signups? not allowed/i.test(m) ? ralatKod("tetamuTutup")
          : /rate|too many/i.test(m) ? ralatKod("terlalu") : error;
      }
      return this.profil(data.user);
    },
    // guest → account: give the guest session an email and a password (Supabase's documented way to keep an
    // anonymous user). With "Confirm email" off the email is set at once; otherwise Supabase emails a link first.
    async jadiAkaun(emel, kata, b) {
      this.sibuk = true;
      try { return await this.jadiAkaun2(emel, kata, b); } finally { this.sibuk = false; }
    },
    async jadiAkaun2(emel, kata, b) {
      let r = await this.sb.auth.updateUser({ email: emel });
      if (r.error) {
        const m = String(r.error.message || "");
        throw r.error.code === "email_exists" || /already (been )?registered|already exists|email.*exists/i.test(m) ? ralatKod("emelAda")
          : /rate|too many/i.test(m) ? ralatKod("terlalu") : r.error;
      }
      const u = r.data && r.data.user;
      if (!u || String(u.email || "").toLowerCase() !== emel) throw ralatKod("emelSahkan");
      await this.sb.auth.refreshSession();
      r = await this.sb.auth.updateUser({ password: kata });
      if (r.error) throw r.error;
      await this.sb.from("profil").update({ nama: (b && b.nama) || null, emel, telefon: (b && b.telefon) || null }).eq("id", u.id);
      const g = await this.sb.auth.getUser();
      return this.profil((g.data && g.data.user) || r.data.user || u);
    },
    // a guest who already has an account: a one-time code before signing in, handed back afterwards
    async tokenTuntut() { const { data, error } = await this.sb.rpc("token_tuntut"); if (error) throw error; return data; },
    async tuntut(token) { const { data, error } = await this.sb.rpc("tuntut_tempahan", { p_token: token }); if (error) throw error; return Number(data) || 0; },
    // RSVP replies for the cards of this account's orders (password accounts only)
    async rsvpSaya() { await this.sedia(); const { data, error } = await this.sb.rpc("rsvp_saya"); if (error) throw error; return data || {}; },
    async keluar() { await this.sb.auth.signOut(); },
    async tukarKata(baru) { const { error } = await this.sb.auth.updateUser({ password: baru }); if (error) throw error; },
    async hargaSemua() {
      await this.sedia();
      const { data, error } = await this.sb.from("harga_kad").select("tema, harga");
      if (error) throw error;
      return data || [];
    },
    async simpanHarga(rows) {
      const { error } = await this.sb.from("harga_kad").upsert(rows.map((r) => Object.assign({}, r, { dikemaskini: new Date().toISOString() })), { onConflict: "tema" });
      if (error) throw error;
    },
    async pautanSemua() {
      await this.sedia();
      const { data, error } = await this.sb.from("pautan_bayar").select("harga, url");
      if (error) throw error;
      return data || [];
    },
    // rows: [{ harga, url }] to keep; buang: prices whose link was cleared
    async simpanPautan(rows, buang) {
      if (rows.length) {
        const { error } = await this.sb.from("pautan_bayar").upsert(rows.map((r) => Object.assign({}, r, { dikemaskini: new Date().toISOString() })), { onConflict: "harga" });
        if (error) throw error;
      }
      if (buang.length) {
        const { error } = await this.sb.from("pautan_bayar").delete().in("harga", buang);
        if (error) throw error;
      }
    },
    async tetapanSemua() {
      await this.sedia();
      const { data, error } = await this.sb.from("tetapan").select("kunci, nilai");
      if (error) throw error;
      return data || [];
    },
    // nilai null = remove
    async simpanTetapan(kunci, nilai) {
      const q = nilai == null ? this.sb.from("tetapan").delete().eq("kunci", kunci)
        : this.sb.from("tetapan").upsert({ kunci, nilai, dikemaskini: new Date().toISOString() }, { onConflict: "kunci" });
      const { error } = await q;
      if (error) throw error;
    },
    // Stripe Checkout through the Edge Function "qawwam-bayar": tindakan "bayar" → { url }, "semak" → { status }
    async bayarStripe(id, tindakan) {
      await this.sedia();
      const { data, error } = await this.sb.functions.invoke("qawwam-bayar", { body: { id, tindakan: tindakan || "bayar", bahasa: lang } });
      if (error) {
        let j = null;
        try { j = error.context && typeof error.context.json === "function" ? await error.context.json() : null; } catch (e) { j = null; }
        const st = error.context && error.context.status;
        throw Object.assign(new Error((j && (j.mesej || j.message)) || (st === 404 ? "fungsi qawwam-bayar belum dipasang" : error.message || "ralat")), { kodBayar: (j && j.ralat) || (st === 404 ? "tiada_fungsi" : "fungsi") });
      }
      return data || {};
    },
    async satu(id) {
      const { data, error } = await this.sb.from("tempahan").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async senaraiSaya() {
      const { data, error } = await this.sb.from("tempahan").select("*").eq("pemilik", AKAUN.user.id).order("dicipta", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async senaraiSemua() {
      const { data, error } = await this.sb.from("tempahan").select("*, profil(nama_pengguna, nama, emel, telefon)").order("dikemaskini", { ascending: false }).limit(1000);
      if (error) throw error;
      return data || [];
    },
    async simpan(id, row) {
      const jalan = (rw) => (id ? this.sb.from("tempahan").update(rw).eq("id", id) : this.sb.from("tempahan").insert(rw)).select().single();
      let { data, error } = await jalan(row);
      // a database set up before the guest-checkout update has no nama_pelanggan column yet: the name is
      // still saved in the order's form (borang), so save without it rather than fail
      if (error && "nama_pelanggan" in row && /nama_pelanggan/.test(error.message || "")) {
        const rw = Object.assign({}, row); delete rw.nama_pelanggan;
        ({ data, error } = await jalan(rw));
      }
      if (error) throw error.code === "PGRST116" ? ralatKod("terkunci") : error;
      return data;
    },
    async padam(tp) {
      const f = laluanFail(tp.fail);
      if (f.length) await this.sb.storage.from("tempahan").remove(f);
      const { error } = await this.sb.from("tempahan").delete().eq("id", tp.id);
      if (error) throw error;
    },
    async muatNaik(laluan, blob, jenis) {
      const { error } = await this.sb.storage.from("tempahan").upload(laluan, blob, { upsert: true, contentType: jenis, cacheControl: "60" });
      if (error) throw error;
      return laluan;
    },
    async url(laluan) {
      const { data, error } = await this.sb.storage.from("tempahan").createSignedUrl(laluan, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    async ambil(laluan) {
      const { data, error } = await this.sb.storage.from("tempahan").download(laluan);
      if (error) throw error;
      return data;
    },
    async buangFail(senarai) { if (senarai.length) await this.sb.storage.from("tempahan").remove(senarai); }
  };

  // Demo store: same rules as the database (see supabase/qawwam-akaun.sql), kept in this browser only.
  // In demo mode the account named "danial" is the admin, so the admin page can be tried before Supabase is set up.
  const GudangDemo = {
    sebenar: false, K_P: "qawwam-demo-pengguna", K_T: "qawwam-demo-tempahan", K_S: "qawwam-demo-sesi", urlCache: new Map(),
    p() { return store.get(this.K_P) || []; },
    tp() { return store.get(this.K_T) || []; },
    async cincang(kata) {
      try {
        const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("qawwam-demo:" + kata));
        return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
      } catch (e) { return "b" + b64url(kata); }
    },
    awam(u) { if (!u) return null; const c = Object.assign({}, u); delete c.kata; return c; },
    admin() { return !!(AKAUN.user && AKAUN.user.peranan === "admin"); },
    async mula() { const s = store.get(this.K_S); return this.awam(this.p().find((u) => s && u.id === s.id)); },
    async daftar(nama, kata, emel) {
      const s = this.p();
      if (s.some((u) => u.nama_pengguna === nama)) throw ralatKod("diambil");
      const u = { id: crypto.randomUUID ? crypto.randomUUID() : "u" + rawak(20), nama_pengguna: nama, nama: "", emel: emel || "", telefon: "",
        peranan: nama === "danial" ? "admin" : "pelanggan", dicipta: new Date().toISOString(), kata: await this.cincang(kata) };
      s.push(u); store.set(this.K_P, s); store.set(this.K_S, { id: u.id });
      return this.awam(u);
    },
    async masuk(nama, kata) {
      const h = await this.cincang(kata), emel = nama.includes("@");
      const u = this.p().find((x) => !x.tetamu && x.kata === h && (emel ? x.emel_masuk === nama : x.nama_pengguna === nama));
      if (!u) throw ralatKod("salah");
      store.set(this.K_S, { id: u.id });
      return this.awam(u);
    },
    async google() { throw ralatKod("belum"); },
    async tetamu() {
      const s = this.p(), id = crypto.randomUUID ? crypto.randomUUID() : "u" + rawak(20);
      const u = { id, nama_pengguna: "tetamu_" + id.replace(/-/g, "").slice(0, 12).toLowerCase(), nama: "", emel: "", telefon: "", peranan: "pelanggan", tetamu: true, dicipta: new Date().toISOString() };
      s.push(u); store.set(this.K_P, s); store.set(this.K_S, { id: u.id });
      return this.awam(u);
    },
    async jadiAkaun(emel, kata, b) {
      const s = this.p(), u = s.find((x) => AKAUN.user && x.id === AKAUN.user.id);
      if (!u || !u.tetamu) throw ralatKod("gagal");
      if (s.some((x) => x.id !== u.id && x.emel_masuk === emel)) throw ralatKod("emelAda");
      Object.assign(u, { tetamu: false, emel_masuk: emel, emel, nama: (b && b.nama) || u.nama, telefon: (b && b.telefon) || u.telefon, kata: await this.cincang(kata) });
      store.set(this.K_P, s);
      return this.awam(u);
    },
    async tokenTuntut() {
      if (!AKAUN.user || !AKAUN.user.tetamu) throw new Error("Only a guest checkout can be moved into an account.");
      const tok = rawak(32), h = store.get("qawwam-demo-tuntut") || {};
      Object.keys(h).forEach((k) => { if (h[k].tetamu === AKAUN.user.id || h[k].tamat < Date.now()) delete h[k]; });
      h[await this.cincang(tok)] = { tetamu: AKAUN.user.id, tamat: Date.now() + 3600e3 };
      store.set("qawwam-demo-tuntut", h);
      return tok;
    },
    async tuntut(token) {
      if (!AKAUN.user || AKAUN.user.tetamu) throw new Error("Sign in to your account first.");
      const h = store.get("qawwam-demo-tuntut") || {}, k = await this.cincang(token), x = h[k];
      delete h[k]; store.set("qawwam-demo-tuntut", h);
      if (!x || x.tamat < Date.now() || x.tetamu === AKAUN.user.id) return 0;
      const g = this.p().find((u) => u.id === x.tetamu);
      if (!g || !g.tetamu) return 0;
      const s = this.tp(); let n = 0;
      s.forEach((r) => { if (r.pemilik === x.tetamu) { r.pemilik = AKAUN.user.id; n++; } });
      store.set(this.K_T, s);
      return n;
    },
    // same rule as the database: a guest session sees its order only while checking out
    nampak(r) {
      const u = AKAUN.user;
      if (!u || r.pemilik !== u.id) return false;
      return !u.tetamu || r.status === "draf" || (r.status === "dihantar" && !!r.dihantar && Date.now() - new Date(r.dihantar).getTime() < 864e5);
    },
    async rsvpSaya() {
      if (!AKAUN.user || AKAUN.user.tetamu) return { ok: false, sebab: "kata" };
      const data = store.get("qawwam-demo-rsvp") || {};
      return { ok: true, kad: this.tp().filter((r) => r.pemilik === AKAUN.user.id && r.kad_id && r.status !== "batal")
        .sort((a, b) => (a.dicipta < b.dicipta ? 1 : -1))
        .map((r) => ({ kod: r.kod, kad_id: r.kad_id, pasangan: pasanganDari(r), pakej: r.pakej, senarai: (data[r.kad_id] || []).slice().sort((a, b) => (a.masa < b.masa ? 1 : -1)) })) };
    },
    async keluar() { store.set(this.K_S, null); },
    async tukarKata(baru) { const s = this.p(), u = s.find((x) => AKAUN.user && x.id === AKAUN.user.id); if (!u) throw ralatKod("gagal"); u.kata = await this.cincang(baru); store.set(this.K_P, s); },
    async hargaSemua() { const h = store.get("qawwam-demo-harga") || {}; return Object.keys(h).map((k) => ({ tema: k, harga: h[k] })); },
    async pautanSemua() { const h = store.get("qawwam-demo-pautan") || {}; return Object.keys(h).map((k) => ({ harga: Number(k), url: h[k] })); },
    async tetapanSemua() { const h = store.get("qawwam-demo-tetapan") || {}; return Object.keys(h).map((k) => ({ kunci: k, nilai: h[k] })); },
    async simpanTetapan(kunci, nilai) {
      if (!this.admin()) throw new Error("permission denied");
      const h = store.get("qawwam-demo-tetapan") || {};
      if (nilai == null) delete h[kunci]; else h[kunci] = nilai;
      store.set("qawwam-demo-tetapan", h);
    },
    async simpanPautan(rows, buang) {
      if (!this.admin()) throw new Error("permission denied");
      const h = store.get("qawwam-demo-pautan") || {};
      rows.forEach((r) => { h[Number(r.harga).toFixed(2)] = r.url; });
      buang.forEach((x) => { delete h[Number(x).toFixed(2)]; });
      store.set("qawwam-demo-pautan", h);
    },
    async simpanHarga(rows) {
      if (!this.admin()) throw new Error("permission denied");
      const h = store.get("qawwam-demo-harga") || {};
      rows.forEach((r) => { h[r.tema] = Number(r.harga); });
      store.set("qawwam-demo-harga", h);
    },
    // same rules as the database trigger: the amount comes from the price list, payment fields are cleaned up
    jaga(r, lama, admin) {
      const tm = TEMA.find((x) => x.id === r.tema);
      if (!tm) throw new Error(`Card "${r.tema}" has no price yet.`);
      const h = hargaTema(tm.id);
      if (!admin) { r.jumlah = h; r.pakej = tm.pakej; }
      else if (r.jumlah == null || r.jumlah === "" || (lama && r.tema !== lama.tema && Number(r.jumlah) === Number(lama.jumlah))) r.jumlah = h;
      r.jumlah = Math.round(Number(r.jumlah) * 100) / 100;
      r.harga = rm(r.jumlah);
      // confirming (paying) needs the customer's name, email and WhatsApp number
      if (!admin && r.status === "dihantar" && (!lama || lama.status === "draf")) {
        r.nama_pelanggan = String(r.nama_pelanggan || "").trim().replace(/\s+/g, " ") || null;
        r.emel = String(r.emel || "").trim().toLowerCase() || null;
        r.telefon = normTel(r.telefon);
        if (!r.nama_pelanggan || r.nama_pelanggan.length < 2) throw new Error("Enter your name.");
        if (!emelSah(r.emel)) throw new Error("Enter a valid email address.");
        if (!telSah(r.telefon)) throw new Error("Enter a valid WhatsApp number.");
      }
      if (!admin) {
        const b = r.bayaran || {};
        if (b.cara === "qr" || b.cara === "tng") {
          const kod = String(b.rujukan || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
          if (kod.length < 6 || kod.length > 40) throw new Error("Check the payment reference number.");
          if (this.tp().some((x) => x.id !== r.id && x.status !== "batal" && x.bayaran && String(x.bayaran.rujukan || "").toUpperCase() === kod)) throw new Error("This payment reference has already been used for another order.");
          if (!new RegExp("^" + r.pemilik + "/" + r.id + "/resit\\.(jpg|png|webp|pdf)$").test((r.fail || {}).resit || "")) throw new Error("Attach your payment receipt.");
          r.bayaran = { cara: "qr", rujukan: kod, status: "semak" };
        } else if (b.cara === "shopee") {
          const kod = String(b.shopee || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
          if (kod.length < 6 || kod.length > 30) throw new Error("Check the Shopee order number.");
          if (this.tp().some((x) => x.id !== r.id && x.status !== "batal" && x.bayaran && String(x.bayaran.shopee || "").toUpperCase() === kod)) throw new Error("This Shopee order number has already been used for another order.");
          r.bayaran = { cara: "shopee", shopee: kod, status: "semak" };
        } else r.bayaran = r.status === "draf" && !Object.keys(b).length ? {} : { cara: "online", status: "belum" };
      }
    },
    async satu(id) { const r = this.tp().find((x) => x.id === id); return r && (this.nampak(r) || this.admin()) ? r : null; },
    async senaraiSaya() { return this.tp().filter((x) => this.nampak(x)).sort((a, b) => (a.dicipta < b.dicipta ? 1 : -1)); },
    async senaraiSemua() {
      if (!this.admin()) return [];
      const p = this.p();
      return this.tp().map((x) => {
        const u = p.find((y) => y.id === x.pemilik) || {};
        return Object.assign({}, x, { profil: { nama_pengguna: u.nama_pengguna || "?", nama: u.nama || "", emel: u.emel || "", telefon: u.telefon || "" } });
      }).sort((a, b) => (a.dikemaskini < b.dikemaskini ? 1 : -1));
    },
    async simpan(id, row) {
      const s = this.tp(), kini = new Date().toISOString(), admin = this.admin();
      let r;
      if (!id) {
        if (!admin && s.filter((x) => x.pemilik === AKAUN.user.id && x.status === "draf").length >= 10) throw new Error("Too many drafts. Delete an old draft first.");
        let kod; do { kod = "QW-" + rawak(6); } while (s.some((x) => x.kod === kod));
        r = Object.assign({ borang: {}, config: null, fail: {}, telefon: "", emel: null, nama_pelanggan: null, harga: null, jumlah: null, bayaran: {}, pautan: null, kad_id: null, nota_admin: null, dihantar: null }, row,
          { id: crypto.randomUUID ? crypto.randomUUID() : "t" + rawak(20), kod, pemilik: AKAUN.user.id, dicipta: kini, dikemaskini: kini });
        if (!admin) Object.assign(r, { status: "draf", pautan: null, kad_id: null, nota_admin: null, bayaran: {} });
        if (!r.status) r.status = "draf";
        this.jaga(r, null, admin);
        s.push(r);
      } else {
        r = s.find((x) => x.id === id);
        if (!r || (!admin && (r.pemilik !== AKAUN.user.id || r.status !== "draf"))) throw ralatKod("terkunci");
        const ubah = Object.assign({}, row), lama = JSON.parse(JSON.stringify(r));
        ["id", "kod", "pemilik", "dicipta"].forEach((k) => delete ubah[k]);
        if (!admin) {
          ["pautan", "kad_id", "nota_admin"].forEach((k) => delete ubah[k]);
          if (ubah.status && !["draf", "dihantar"].includes(ubah.status)) throw ralatKod("terkunci");
        }
        if (ubah.status === "dihantar" && r.status === "draf") ubah.dihantar = kini;
        if (ubah.status === "draf") ubah.dihantar = null;
        const baru = Object.assign({}, r, ubah, { dikemaskini: kini });
        this.jaga(baru, lama, admin);
        Object.assign(r, baru);
      }
      store.set(this.K_T, s);
      return JSON.parse(JSON.stringify(r));
    },
    async padam(tp) {
      const s = this.tp(), r = s.find((x) => x.id === tp.id);
      if (!r || (!this.admin() && (r.pemilik !== AKAUN.user.id || r.status !== "draf"))) throw ralatKod("terkunci");
      await this.buangFail(laluanFail(r.fail));
      store.set(this.K_T, s.filter((x) => x.id !== tp.id));
    },
    async muatNaik(laluan, blob) { await IDB.set("demo", laluan, blob); this.urlCache.delete(laluan); return laluan; },
    async url(laluan) {
      if (!this.urlCache.has(laluan)) {
        const b = await IDB.get("demo", laluan);
        if (!b) throw new Error("File missing: " + laluan);
        this.urlCache.set(laluan, URL.createObjectURL(b));
      }
      return this.urlCache.get(laluan);
    },
    async ambil(laluan) { const b = await IDB.get("demo", laluan); if (!b) throw new Error("File missing: " + laluan); return b; },
    async buangFail(senarai) { for (const l of senarai) { await IDB.set("demo", l, null); this.urlCache.delete(l); } }
  };
  let G = null;

  /* =====================================================================
     C. SIGN-IN (username + password, optional email, or Google)
     ===================================================================== */
  const ialahTetamu = () => !!(AKAUN.user && AKAUN.user.tetamu);
  // guest-session usernames are "tetamu_…": show the person's name or email instead
  const namaPaparan = () => {
    const u = AKAUN.user;
    if (!u) return "";
    if (u.tetamu) return t("tetamu.nav");
    return /^tetamu_/.test(u.nama_pengguna || "") ? u.nama || emelSebenar(u.emel_masuk) || u.emel || "" : u.nama_pengguna || u.nama || "";
  };
  const emelTetamu = () => (papan.senarai.find((x) => x.emel) || {}).emel || nilai("emel");
  function kemasAkaunUI() {
    const u = AKAUN.user, masuk = !!u, tetamu = ialahTetamu(), nama = namaPaparan(), awal = (nama || "?").trim().charAt(0).toUpperCase();
    $$("[data-akaun-btn]").forEach((b) => {
      const av = $(".avatar", b), tk = $(".akaun-teks", b);
      if (av) { av.hidden = !masuk || tetamu; av.textContent = awal; }
      if (tk) tk.textContent = masuk ? nama : t("masuk.nav");
      b.setAttribute("aria-label", masuk && !tetamu ? t("akaun.nav") : masuk ? t("tetamu.nav") : t("masuk.nav"));
    });
    if ($("#masuk-keluar")) {
      // a guest sees their order; the sign-in form only when they choose to sign in to an account
      const borang = !masuk || (tetamu && papan.keMasuk);
      $("#masuk-keluar").hidden = !borang;
      $("#masuk-dalam").hidden = borang;
      $("#masuk-dalam").classList.toggle("tetamu", tetamu);
      $("#masuk-demo").hidden = !G || G.sebenar;
      $("#masuk-tunggu").hidden = !store.get("qawwam-tunggu");
      $("#masuk-tetamu").hidden = !tetamu;
      $("#masuk-balik-tetamu").hidden = !tetamu;
      $("#masuk-tanpa").hidden = tetamu;
      if (masuk) {
        $("#akaun-avatar").textContent = tetamu ? "✓" : awal;
        $("#akaun-salam").textContent = tetamu ? t("tetamu.salam") : t("akaun.salam", { nama });
        $("#akaun-emel").textContent = tetamu ? [t("tetamu.sub"), emelTetamu()].filter(Boolean).join(" · ")
          : [/^tetamu_/.test(u.nama_pengguna || "") ? "" : "@" + u.nama_pengguna, u.emel || emelSebenar(u.emel_masuk)].filter(Boolean).join(" · ");
        const k = $("#btn-keluar");
        if (k && !k.dataset.pasti) k.textContent = t(tetamu ? "tetamu.keluar" : "akaun.keluar");
        const te = $("#tt-emel");
        if (te && tetamu && !te.value) te.value = emelTetamu();
      }
    }
    const ha = $("#hantar-akaun");
    if (ha) ha.hidden = (masuk && !tetamu) || !!(state.edit && state.edit.admin);
  }
  function lepasAuth() {
    kemasAkaunUI(); kemasInstaUI(); kemasUbahUI();
    const u = AKAUN.user;
    // a signed-in customer: their contact details go into the order form (only into empty boxes)
    if (u && !u.tetamu && !(state.edit && state.edit.admin)) {
      const isi = (id, v) => { const el = $("#f-" + id); if (el && !el.value && v) el.value = v; };
      isi("emel", u.emel || emelSebenar(u.emel_masuk));
      isi("namaPelanggan", u.nama);
      isi("telefon", u.telefon ? telPapar(u.telefon) : "");
    }
    if (tabKini === "masuk" && AKAUN.user) muatPapan();
    if (tabKini === "admin") kemasAdmin();
  }
  // a guest who signs in to an existing account: their guest orders move into it (one-time code, see SQL 3b)
  async function simpanTokenTuntut() {
    if (!ialahTetamu() || !G.tokenTuntut) return;
    try { store.set("qawwam-tuntut", await G.tokenTuntut()); } catch (e) { store.set("qawwam-tuntut", null); }
  }
  async function tuntutJikaAda() {
    const tok = store.get("qawwam-tuntut");
    if (!tok || !AKAUN.user || AKAUN.user.tetamu || !G || !G.tuntut) return 0;
    store.set("qawwam-tuntut", null);
    try { const n = await G.tuntut(tok); if (n) notisPapan(t("tetamu.pindah")); return n; } catch (e) { return 0; }
  }
  function notisPapan(teks) {
    const n = $("#papan-notis");
    if (!n) return;
    n.textContent = teks || ""; n.hidden = !teks;
    clearTimeout(n._t); if (teks) n._t = setTimeout(() => { n.hidden = true; }, 15000);
  }
  function keMasukDariTetamu(emel, mesej) {
    papan.keMasuk = true;
    const m = $("#am-masuk"); if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change")); }
    if (emel && $("#au-nama")) $("#au-nama").value = emel;
    if ($("#masuk-tetamu")) $("#masuk-tetamu").textContent = mesej || t("tetamu.masukNotis");
    kemasAkaunUI();
    location.hash = "#masuk";
    window.scrollTo(0, 0);
    setTimeout(() => { const f = $(emel ? "#au-kata" : "#au-nama"); if (f) f.focus(); }, 60);
  }
  // after signing in: finish the order that was waiting, if any
  function selepasMasuk() {
    papan.keMasuk = false;
    if (store.get("qawwam-tunggu") && AKAUN.user) {
      store.set("qawwam-tunggu", null);
      location.hash = "#tempah";
      setTimeout(() => hantarTempahan(), 80);
    }
  }
  async function mulaAkaun() {
    G = authSedia() ? GudangSB : GudangDemo;
    await pulihFail();
    kemasFailUI();
    if (FAIL.galeri.some(Boolean) || FAIL.lagu || FAIL.duitnow) kemasPratonton();
    try { AKAUN.user = await G.mula(async () => { await tuntutJikaAda(); lepasAuth(); selepasMasuk(); }); }
    catch (e) { AKAUN.user = null; }
    await tuntutJikaAda();   // back from Google sign-in that started in a guest session
    AKAUN.siap = true;
    const dariBayar = balikDariBayar();
    lepasAuth();
    muatHarga();
    if (dariBayar !== null) { laluan(); if (AKAUN.user && dariBayar) setTimeout(() => muatPapan(dariBayar), 60); }
    const kembali = store.get("qawwam-kembali");
    if (AKAUN.user && kembali && !store.get("qawwam-tunggu")) { store.set("qawwam-kembali", null); location.hash = kembali; }
    else if (location.hash.includes("access_token")) { history.replaceState(null, "", location.pathname + location.search + "#masuk"); laluan(); }
    selepasMasuk();
  }

  // card prices set on the Admin page; until they arrive the tier defaults are shown
  async function muatHarga() {
    try {
      const rows = await G.hargaSemua();
      Object.keys(HARGA).forEach((k) => delete HARGA[k]);
      rows.forEach((r) => { const h = Number(r.harga); if (h > 0) HARGA[r.tema] = h; });
    } catch (e) { return; }
    try {
      const pl = await G.pautanSemua();
      Object.keys(PAUTAN).forEach((k) => delete PAUTAN[k]);
      pl.forEach((r) => { if (r.url && Number(r.harga) > 0) PAUTAN[Number(r.harga).toFixed(2)] = r.url; });
    } catch (e) { /* no links: online payment falls back to SHOP.bayarUrl or WhatsApp */ }
    try {
      const ts = await G.tetapanSemua();
      Object.keys(TETAPAN).forEach((k) => delete TETAPAN[k]);
      ts.forEach((r) => { if (r.nilai) TETAPAN[r.kunci] = r.nilai; });
    } catch (e) { /* no QR / bank details yet: that payment choice stays hidden */ }
    segarHarga();
  }
  function segarHarga() {
    binaPakej(); kemasPakejUI(); binaPilihan(); ringkasan(); kemasTemaTeks(); kemasModalTeks(); kemasHargaUI();
    terjemah($("#home"));
    if (papan.buka) paparTindakanPapan(papan.buka);
  }

  function pasangAuth() {
    const borang = $("#borang-auth");
    if (!borang) return;
    const kotak = $("#masuk-keluar"), ralat = $("#au-ralat"), btn = $("#au-hantar");
    const mod = () => ($('input[name="auth-mod"]:checked') || {}).value || "masuk";
    const kemasMod = () => {
      const d = mod() === "daftar";
      kotak.classList.toggle("mod-daftar", d);
      $("#au-kata").setAttribute("autocomplete", d ? "new-password" : "current-password");
      ralat.hidden = true;
    };
    $$('input[name="auth-mod"]').forEach((r) => r.addEventListener("change", kemasMod));
    kemasMod();
    $("#au-lihat").addEventListener("click", (e) => {
      const k = $("#au-kata"), lihat = k.type === "password";
      k.type = lihat ? "text" : "password";
      e.currentTarget.setAttribute("aria-pressed", String(lihat));
      e.currentTarget.setAttribute("aria-label", t(lihat ? "masuk.sorok" : "masuk.lihat"));
    });
    borang.addEventListener("input", () => { ralat.hidden = true; });
    borang.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nama = $("#au-nama").value.trim().toLowerCase(), kata = $("#au-kata").value, emel = $("#au-emel").value.trim(), daftar = mod() === "daftar";
      const salah = (k, tambah) => { ralat.textContent = t(k) + (tambah ? " (" + tambah + ")" : ""); ralat.hidden = false; };
      if (!nama || !kata) return salah("au.isi");
      if (daftar) {
        if (!/^[a-z0-9_.]{3,24}$/.test(nama)) return salah("au.nama");
        if (kata.length < 8) return salah("au.kata");
        if (emel && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emel)) return salah("au.emel");
      }
      if (!G) return salah("au.gagal");
      btn.disabled = true; btn.setAttribute("aria-busy", "true");
      const dariTetamu = ialahTetamu();
      try {
        if (dariTetamu) await simpanTokenTuntut();
        AKAUN.user = daftar ? await G.daftar(nama, kata, emel) : await G.masuk(nama, kata);
        $("#au-kata").value = "";
        papan.keMasuk = false;
        await tuntutJikaAda();
        lepasAuth();
        selepasMasuk();
      } catch (err) {
        if (dariTetamu) store.set("qawwam-tuntut", null);
        if (err && err.kod) salah("au." + err.kod); else salah("au.gagal", sebab(err));
      } finally { btn.disabled = false; btn.removeAttribute("aria-busy"); }
    });
  }
  async function masukGoogle() {
    const notis = $("#masuk-notis");
    const papar = (k, tambah) => { if (notis) { notis.textContent = t(k) + (tambah ? " " + tambah : ""); notis.hidden = false; } };
    if (!G || !G.sebenar) return papar("masuk.belum");
    await simpanTokenTuntut();
    try { await G.google(); } catch (e) { store.set("qawwam-tuntut", null); papar("masuk.gagal", sebab(e)); }
  }
  async function keluarAkaun() {
    try { if (G) await G.keluar(); } catch (e) { /* signed out locally anyway */ }
    AKAUN.user = null;
    store.set("qawwam-tuntut", null);
    papan.keMasuk = false; papan.senarai = [];
    rsvpP.data = null;
    tutupTempahan();
    if (state.edit && state.edit.admin) keluarModAdmin(false);
    lepasAuth();
  }

  /* =====================================================================
     D. SUBMIT ORDER: save as a draft in the customer's account, upload files, open the dashboard
     ===================================================================== */
  function configAkhir(d, slugAda) {
    const tm = temaById(d.tema), c0 = buatConfig(d, false);
    return lengkapkan(c0, tm, tm.pakej === "flip" ? "" : slugAda || namaKad(c0));
  }
  function borangUntukSimpan(d) {
    const b = Object.assign({}, d);
    delete b.idea;
    return b;
  }
  function kemasUbahUI() {
    const e = state.edit, jalur = $("#ubah-jalur");
    if (jalur) {
      jalur.hidden = !e;
      if (e) {
        $("#ubah-teks").textContent = e.admin ? dalamEn(() => t("ubah.admin", { kod: e.kod, nama: e.nama || "?" })) : t("ubah.teks", { kod: e.kod });
        $("#ubah-baharu").textContent = e.admin ? dalamEn(() => t("ubah.kembali")) : t("ubah.baharu");
        jalur.classList.toggle("admin", !!e.admin);
      }
    }
    const teks = $("#hantar-teks");
    if (teks) teks.textContent = !e ? t("hantar") : e.admin ? dalamEn(() => t("hantar.admin")) : t("hantar.simpan");
  }
  function tamatUbah() { state.edit = null; store.set("qawwam-ubah", null); kemasUbahUI(); }
  function keluarModAdmin(keAdmin) {
    // put the admin's own draft back in the form
    state.edit = null;
    terapDraf(store.get("qawwam-draf"));
    kosongkanFail(false);
    pulihFail().then(() => { kemasFailUI(); kemasPratonton(); });
    segarBorang();
    kemasUbahUI();
    if (keAdmin) location.hash = "#admin";
  }
  // refresh every part of the form after a draft was loaded into it
  function segarBorang() {
    state.tapisHarga = jenisKini(); state.tapisGaya = "semua";
    binaPilihan(); kemasPakejUI(); kemasHadiah(); kemasTogol(); autoHijri(); kemasFailUI();
    pilihTema(state.tema, true);
    ringkasan();
    paparBina(false);
    paparHero();
  }

  function statusHantar(teks, ralat) {
    const box = $("#selepas");
    if (!box) return;
    box.hidden = !teks;
    box.classList.toggle("gagal", !!ralat);
    box.textContent = teks || "";
  }
  let sedangHantar = false;
  async function hantarTempahan() {
    if (sedangHantar) return;
    const d = kumpul(), err = semak(d);
    tunjukRalat(err);
    if (err.length) return;
    const btn = $("#hantar");
    sedangHantar = true;
    if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); }
    try {
      // no account needed: a guest checkout session holds the order while they pay
      if (!AKAUN.user) {
        statusHantar(t("hantar.tetamu"));
        try { AKAUN.user = await G.tetamu(); lepasAuth(); }
        catch (e) {
          if (e && e.kod === "tetamuTutup") {
            // guest checkout not switched on in Supabase yet: sign in as before, the order waits
            statusHantar(t("hantar.tetamuTutup"), true);
            store.set("qawwam-tunggu", 1); store.set("qawwam-draf", d);
            setTimeout(() => { location.hash = "#masuk"; }, 1600);
            return;
          }
          throw e && e.kod === "terlalu" ? new Error(t("au.terlalu")) : e;
        }
      }
      statusHantar(t("hantar.sedang"));
      const e = state.edit, admin = !!(e && e.admin);
      let lama = null;
      if (e) {
        lama = await G.satu(e.id).catch(() => null);
        if (!lama || (!admin && lama.status !== "draf")) {
          if (!admin) { statusHantar(t("hantar.terkunci", { kod: e.kod })); await new Promise((r) => setTimeout(r, 1400)); }
          lama = null;
          tamatUbah();
        }
      }
      const row = { pakej: d.pakej, tema: d.tema, borang: borangUntukSimpan(d), telefon: normTel(d.telefon), emel: d.emel ? d.emel.toLowerCase() : null,
        nama_pelanggan: d.namaPelanggan || null, config: configAkhir(d, lama && lama.kad_id) };
      let rek = lama || await G.simpan(null, Object.assign({}, row, { status: "draf" }));
      // files go in <owner>/<order>/... ; unchanged files that already live there are kept as they are
      const pemilik = rek.pemilik, folder = `${pemilik}/${rek.id}/`;
      const kerja = [];
      const tugas = (k, nama, jenis) => {
        const f = failDari(k);
        if (!f) return "";
        const laluan = folder + nama;
        if (f.jauh && f.jauh.startsWith(folder)) return f.jauh;
        kerja.push({ k, f, laluan, jenis });
        return laluan;
      };
      const fail = {
        lagu: d.muzik === "tiada" || temaById(d.tema).pakej === "flip" ? "" : tugas("lagu", "lagu.mp3", "audio/mpeg"),
        duitnow: temaById(d.tema).pakej === "premium" && d.hadiahAda ? tugas("duitnow", "duitnow.png", "image/png") : "",
        galeri: FAIL.galeri.map((_, i) => (temaById(d.tema).pakej === "premium" && d.galeriAda ? tugas("galeri-" + i, `galeri-${i + 1}.jpg`, "image/jpeg") : ""))
      };
      if (lama && lama.fail && lama.fail.resit) fail.resit = lama.fail.resit;   // the payment receipt isn't part of the form
      for (let i = 0; i < kerja.length; i++) {
        statusHantar(t("hantar.muatNaik", { n: i + 1, j: kerja.length }));
        const w = kerja[i];
        await G.muatNaik(w.laluan, w.f.blob, w.jenis);
        w.f.jauh = w.laluan;
        if (!admin) IDB.set("fail", w.k, { blob: w.f.blob, nama: w.f.nama, jauh: w.laluan });
      }
      const buang = laluanFail(lama && lama.fail).filter((p) => !laluanFail(fail).includes(p));
      rek = await G.simpan(rek.id, Object.assign({}, row, { fail }));
      if (buang.length) G.buangFail(buang).catch(() => {});
      statusHantar("");
      if (admin) {
        keluarModAdmin(false);
        location.hash = "#admin";
        setTimeout(() => adminBuka(rek.id, true), 60);
      } else {
        state.edit = { id: rek.id, kod: rek.kod };
        store.set("qawwam-ubah", state.edit);
        kemasUbahUI();
        location.hash = "#masuk";
        setTimeout(() => muatPapan(rek.id), 40);
      }
    } catch (ex) {
      statusHantar(t("hantar.gagal", { sebab: sebab(ex) }), true);
    } finally {
      sedangHantar = false;
      if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); }
    }
  }
  function pasangHantar() {
    const btn = $("#hantar");
    if (btn) btn.addEventListener("click", () => hantarTempahan());
    const ub = $("#ubah-baharu");
    if (ub) ub.addEventListener("click", () => { if (state.edit && state.edit.admin) keluarModAdmin(true); else tamatUbah(); });
    // "Have an account? Sign in first": the order continues by itself after signing in
    const ha = $("#hantar-akaun");
    if (ha) ha.addEventListener("click", (e) => {
      if (!e.target.closest("a")) return;
      e.preventDefault();
      store.set("qawwam-tunggu", 1); store.set("qawwam-draf", kumpul());
      if (ialahTetamu()) keMasukDariTetamu(""); else location.hash = "#masuk";
    });
  }

  // load an order into the form (customer: their own draft; admin: any order)
  async function ubahTempahan(tp, admin) {
    if (admin) state.edit = { id: tp.id, kod: tp.kod, admin: true, nama: pelangganAdmin(tp).nama };
    const d = Object.assign({}, tp.borang || {}, { pakej: tp.pakej, tema: tp.tema });
    if (!d.telefon && tp.telefon) d.telefon = telPapar(tp.telefon);
    terapDraf(d);
    kosongkanFail(!admin);
    const f = tp.fail || {};
    const muat = async (k, laluan, nama) => { if (!laluan) return; try { setFail(k, { blob: await G.ambil(laluan), nama, jauh: laluan }, !admin); } catch (e) { /* file missing: leave the slot empty */ } };
    await muat("lagu", f.lagu, "lagu.mp3");
    await muat("duitnow", f.duitnow, "duitnow.png");
    for (let i = 0; i < MAKS_GALERI; i++) await muat("galeri-" + i, (f.galeri || [])[i], `galeri-${i + 1}.jpg`);
    if (!admin) { state.edit = { id: tp.id, kod: tp.kod }; store.set("qawwam-ubah", state.edit); store.set("qawwam-draf", kumpul()); }
    location.hash = "#tempah";
    segarBorang();
    kemasUbahUI();
    setTimeout(() => { const s = $("#bina-seksyen"); if (s) s.scrollIntoView({ block: "start" }); }, 80);
  }

  /* =====================================================================
     E. CUSTOMER DASHBOARD (inside the sign-in tab)
     ===================================================================== */
  const papan = { senarai: [], buka: null, skrin: null, tok: 0, keMasuk: false, resit: null };
  // QR / bank transfer receipt: a photo (made smaller, as JPEG) or a PDF, up to 5 MB
  const MAKS_RESIT = 5 * 1024 * 1024;
  async function sediaResit(f) {
    if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
      if (f.size > MAKS_RESIT) throw ralatKod("resitSalah");
      return { blob: f, nama: f.name || "resit.pdf", jenis: "application/pdf", ext: "pdf", url: "" };
    }
    if (f.type && !/^image\//.test(f.type)) throw ralatKod("resitSalah");
    let blob;
    try { blob = await kecilkanGambar(f, { maks: 2400, jenis: "image/jpeg", mutu: 0.85 }); } catch (e) { throw ralatKod("resitSalah"); }
    if (blob.size > MAKS_RESIT) throw ralatKod("resitSalah");
    return { blob, nama: f.name || "resit.jpg", jenis: "image/jpeg", ext: "jpg", url: URL.createObjectURL(blob) };
  }
  const LANGKAH_STATUS = { draf: 0, dihantar: 1, diproses: 2, siap: 3 };
  function masaLalu(iso) {
    if (!iso) return "";
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    const ms = lang !== "en";
    if (s < 60) return ms ? "sebentar tadi" : "just now";
    if (s < 3600) { const n = Math.floor(s / 60); return ms ? `${n} minit lalu` : `${n} min ago`; }
    if (s < 86400) { const n = Math.floor(s / 3600); return ms ? `${n} jam lalu` : `${n} h ago`; }
    if (s < 86400 * 30) { const n = Math.floor(s / 86400); return ms ? `${n} hari lalu` : `${n} days ago`; }
    return new Date(iso).toLocaleDateString(ms ? "ms-MY" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  const pasanganDari = (tp) => {
    const b = tp.borang || {}, c = tp.config || {};
    const a = b.anakP || (c.anak && c.anak.panggilan) || "", p = b.pasP || (c.pasangan && c.pasangan.panggilan) || "";
    return a && p ? `${a} & ${p}` : a || p || tp.kod;
  };
  const tarikhTempahan = (tp) => { const d = (tp.borang && tp.borang.tarikh) || (tp.config && tp.config.mula ? tp.config.mula.slice(0, 10) : ""); return d ? tarikhPenuh(d) : ""; };
  const chipStatus = (st) => `<span class="status st-${esc(st)}">${esc(t("st." + st))}</span>`;

  async function muatPapan(bukaId) {
    const box = $("#papan-senarai");
    if (!box || !AKAUN.user || !G) return;
    const tok = ++papan.tok;
    if (!papan.senarai.length) box.innerHTML = `<p class="redup">${esc(t("papan.memuat"))}</p>`;
    if (!AKAUN.user.tetamu) muatRsvp();
    try { const s = await G.senaraiSaya(); if (tok !== papan.tok) return; papan.senarai = s; }
    catch (e) { box.innerHTML = `<p class="ralat">${esc(t("papan.ralat", { sebab: sebab(e) }))}</p>`; return; }
    paparSenaraiPapan();
    if (ialahTetamu()) kemasAkaunUI();   // the guest's email comes from their order
    const id = bukaId || (papan.buka && papan.buka.id);
    if (id && papan.senarai.some((x) => x.id === id)) bukaTempahan(id); else tutupTempahan();
  }
  function paparSenaraiPapan() {
    const box = $("#papan-senarai");
    if (!box) return;
    if (!papan.senarai.length) { box.innerHTML = `<div class="papan-kosong"><p>${esc(t(ialahTetamu() ? "tetamu.kosong" : "papan.kosong"))}</p><a class="btn utama kecil" href="#tempah">${esc(t("papan.baharu"))}</a></div>`; return; }
    box.innerHTML = papan.senarai.map((tp) => {
      const tm = temaById(tp.tema), p = pakejById(tp.pakej);
      return `<button type="button" class="t-item" data-id="${esc(tp.id)}">
        <span class="warna" style="--c1:${tm.warna[0]};--c2:${tm.warna[1]}" aria-hidden="true"></span>
        <span class="t-utama"><b>${esc(pasanganDari(tp))}</b><span class="redup">${esc([tm.nama, p.nama[lang], tarikhTempahan(tp)].filter(Boolean).join(" · "))}</span></span>
        <span class="t-hujung">${chipStatus(tp.status)}<span class="t-kod">${esc(tp.kod)} · ${esc(masaLalu(tp.dikemaskini))}</span></span>
      </button>`;
    }).join("");
  }
  function tutupTempahan() {
    papan.buka = null;
    if ($("#papan-butiran")) { $("#papan-butiran").hidden = true; $("#papan-utama").hidden = false; }
    if (papan.skrin) { papan.skrin.tok++; papan.skrin.f.forEach((f) => { f.srcdoc = ""; f.classList.remove("on"); }); papan.skrin.el.classList.remove("siap"); }
  }

  // the card exactly as it will be published, with the couple's own photos (signed links) and no sound
  async function cfgPratonton(cfg, fail, tema) {
    const c = JSON.parse(JSON.stringify(cfg || {})), tm = temaById(tema);
    c.jenama = jenama(tm.pakej); c.ics = false;
    if (tm.pakej !== "flip") c.muzik = "";
    const g = ((fail && fail.galeri) || []).filter(Boolean);
    if (Array.isArray(c.galeri)) {
      for (const x of c.galeri) {
        const m = /^galeri\/(\d+)\.jpg$/.exec((x && x.src) || ""), p = m && g[+m[1] - 1];
        if (p) { try { x.src = await G.url(p); } catch (e) { /* keep the file name */ } }
      }
    }
    if (c.hadiah && fail && fail.duitnow) { try { c.hadiah.qr = await G.url(fail.duitnow); } catch (e) { /* ignore */ } }
    return c;
  }

  // QR code / bank transfer (orders from before Oct 2026 say "tng")
  const caraQr = (b) => !!b && (b.cara === "qr" || b.cara === "tng");
  function barisDl(label, nilai, html) { return nilai ? `<div><dt>${esc(label)}</dt><dd>${html ? nilai : esc(nilai)}</dd></div>` : ""; }
  // the order's details, read from the saved form (shared by the dashboard and the admin page)
  function dlTempahan(tp, admin) {
    const b = tp.borang || {}, c = tp.config || {}, tm = temaById(tp.tema), p = pakejById(tp.pakej), jenis = tm.pakej;
    const L = [];
    const harga = tp.status === "draf" && !admin ? rm(hargaTema(tp.tema)) : tp.harga || rm(hargaTema(tp.tema));
    L.push(barisDl(t("dl.pakej"), `${p.nama[lang]} · ${harga}`));
    const wD = tm.warnaFlip ? warnaFlipDipilih(tm, c.gaya || b.gayaFlip) : null;
    L.push(barisDl(t("dl.kad"), tm.nama + (wD ? " · " + wD.nama : "")));
    if (jenis === "flip") L.push(barisDl(t("dl.tajuk"), c.tajuk || b.tajuk || ""), barisDl(t("dl.bismillah"), t(c.bismillah === false ? "dl.tidak" : "dl.ya")));
    const anak = [b.anakN || (c.anak && c.anak.penuh), b.pasN || (c.pasangan && c.pasangan.penuh)].filter(Boolean);
    L.push(barisDl(t("dl.pengantin"), `<b>${esc(pasanganDari(tp))}</b>${anak.length ? "<br>" + anak.map(esc).join("<br>") : ""}`, true));
    L.push(barisDl(t("dl.tuanRumah"), (c.tuanRumah || [b.tr1, b.tr2]).filter(Boolean).join(" & ")));
    const masa = b.mula && b.tamat ? `${jam(b.mula)} – ${jam(b.tamat)}` : b.mula ? t("dl.hinggaSelesai", { mula: jam(b.mula) }) : b.tamat ? `– ${jam(b.tamat)}` : t("dl.masaTiada");
    L.push(barisDl(t("dl.tarikh"), [tarikhTempahan(tp), b.hijri || c.hijri, masa].filter(Boolean).join(" · ")));
    const lok = c.lokasi || {};
    L.push(barisDl(t("dl.lokasi"), [`<b>${esc(lok.nama || b.lokNama || "")}</b>`, esc(lok.alamat || b.lokAlamat || ""), esc(lok.nota || "")].filter((x) => x && x !== "<b></b>").join("<br>")
      + [[lok.gmapsUrl, "Google Maps"], [lok.wazeUrl, "Waze"]].filter((x) => x[0]).map(([u, n]) => ` <a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join(" ·"), true));
    if (jenis !== "flip") {
      const ac = Array.isArray(c.aturcara) ? c.aturcara : [];
      L.push(barisDl(t("dl.aturcara"), ac.length ? `<ul class="dl-senarai">${ac.map(([m, a]) => `<li><span>${esc(m)}</span> ${esc(a)}</li>`).join("")}</ul>` : esc(t("dl.tiada")), true));
      if (c.rsvp) L.push(barisDl(t("dl.rsvp"), t("dl.rsvpT", { akhir: c.rsvp.tarikhAkhir || "-", pax: c.rsvp.maksPax || 6 })));
      const hb = Array.isArray(c.hubungi) ? c.hubungi : [];
      L.push(barisDl(t("dl.hubungi"), hb.map((h) => `${esc(h.nama)}${h.peranan ? ` (${esc(h.peranan)})` : ""} · ${esc(telPapar(h.nombor))}`).join("<br>"), true));
      const lagu = b.muzik === "tiada" ? t("dl.tiada") : [tp.fail && tp.fail.lagu ? t("dl.laguFail") : "", b.muzikTajuk ? t("dl.laguMinta", { tajuk: b.muzikTajuk }) : ""].filter(Boolean).join(" · ");
      L.push(barisDl(t("dl.lagu"), lagu || "-"));
    }
    if (jenis === "premium") {
      const g = Array.isArray(c.galeri) ? c.galeri : [];
      L.push(barisDl(t("dl.galeri"), g.length ? `${t("dl.galeriN", { n: g.length })}${g.some((x) => x.kapsyen) ? ": " + g.map((x) => esc(x.kapsyen || "–")).join(" · ") : ""}` : esc(t("dl.tiada")), true));
      L.push(barisDl(t("dl.hadiah"), c.hadiah ? [c.hadiah.bank, c.hadiah.akaun, c.hadiah.nama].filter(Boolean).join(" · ") + (c.hadiah.qr ? " · " + t("dl.qr") : "") : t("dl.tiada")));
      L.push(barisDl(t("dl.buku"), t(c.bukuTetamu === false ? "dl.tidak" : "dl.ya")));
    }
    const by = tp.bayaran || {};
    if (by.cara) L.push(barisDl(t("dl.bayaran"), `${by.cara === "shopee" ? t("dl.bayarShopee", { kod: by.shopee || "" }) : caraQr(by) ? t("dl.bayarTng", { kod: by.rujukan || "" }) : t("dl.bayarOnline")} · ${t("dl.st." + (by.status || "belum"))}`));
    if (tp.fail && tp.fail.resit) L.push(barisDl(t("dl.resit"), t("dl.resitAda")));
    L.push(barisDl(t("dl.nama"), tp.nama_pelanggan || b.namaPelanggan || ""));
    L.push(barisDl(t(admin ? "dl.telefonA" : "dl.telefon"), tp.telefon ? telPapar(tp.telefon) : ""));
    L.push(barisDl(t(admin ? "dl.emelA" : "dl.emel"), tp.emel || ""));
    L.push(barisDl(t("dl.nota"), b.nota || ""));
    return L.join("");
  }

  async function bukaTempahan(id) {
    const tp = papan.senarai.find((x) => x.id === id);
    if (!tp) return;
    papan.buka = tp;
    $("#papan-utama").hidden = true;
    $("#papan-butiran").hidden = false;
    $("#pb-kod").textContent = `${tp.kod} · ${t("dl.dicipta", { masa: masaLalu(tp.dicipta) })}`;
    $("#pb-tajuk").textContent = pasanganDari(tp);
    $("#pb-status").outerHTML = `<span class="status st-${esc(tp.status)}" id="pb-status">${esc(t("st." + tp.status))}</span>`;
    const n = tp.status === "batal" ? -1 : LANGKAH_STATUS[tp.status];
    $("#pb-masa").innerHTML = [1, 2, 3, 4].map((i) => `<li class="${i - 1 < n ? "lepas" : i - 1 === n ? "kini" : ""}">${esc(t("gm." + i))}</li>`).join("");
    $("#pb-masa").classList.toggle("batal", tp.status === "batal");
    $("#pb-dl").innerHTML = dlTempahan(tp, false);
    paparTindakanPapan(tp);
    semakBayar(tp).then((st) => { if (st && st !== "belum" && papan.buka && papan.buka.id === tp.id) muatPapan(tp.id); });
    if (!papan.skrin) papan.skrin = new Skrin($("#pb-skrin"), 780, true);
    window.scrollTo(0, 0);
    const cfg = await cfgPratonton(tp.config, tp.fail, tp.tema);
    if (papan.buka !== tp) return;
    paparKad(papan.skrin, tp.tema, { cfg });
  }
  /* Paying online: the Stripe Payment Link for the order's amount (set on Admin → Harga kad), with the
     order code as Stripe's client_reference_id so every payment shows which order it is for.
     Without a link for that amount, SHOP.bayarUrl (if set) is used, otherwise there is no online payment yet. */
  const pautanUntuk = (jumlah) => PAUTAN[Number(jumlah).toFixed(2)] || "";
  const jumlahTempahan = (tp) => Number(tp.status === "draf" || tp.jumlah == null ? hargaTema(tp.tema) : tp.jumlah);
  // Stripe Checkout straight from the order (needs the real Supabase store and the qawwam-bayar function)
  const stripeAuto = () => !!(SHOP.stripeCheckout && G && G.sebenar && G.bayarStripe);
  const bolehBayar = (tp) => stripeAuto() || !!(pautanUntuk(jumlahTempahan(tp)) || SHOP.bayarUrl);
  function urlBayar(tp) {
    const jumlah = jumlahTempahan(tp), stripe = pautanUntuk(jumlah);
    if (stripe) {
      const q = new URLSearchParams({ client_reference_id: tp.kod, locale: lang === "ms" ? "ms" : "en" });
      if (tp.emel) q.set("prefilled_email", tp.emel);
      return stripe + (stripe.includes("?") ? "&" : "?") + q.toString();
    }
    if (!SHOP.bayarUrl) return "";
    const q = new URLSearchParams({ kod: tp.kod, jumlah: jumlah.toFixed(2), id: tp.id, kembali: location.origin + location.pathname + "#masuk" });
    return SHOP.bayarUrl + (SHOP.bayarUrl.includes("?") ? "&" : "?") + q.toString();
  }
  // remember which order went to Stripe, so the dashboard can say "thanks, we're confirming" when they come back
  // returns true when the customer is on their way to Stripe (or the order turned out to be paid already)
  async function keBayar(tp, papar) {
    store.set("qawwam-bayar", { id: tp.id, kod: tp.kod, masa: Date.now() });
    if (stripeAuto()) {
      try {
        if (papar) papar(t("pb.keStripe"));
        const r = await G.bayarStripe(tp.id, "bayar");
        if (r.url) { location.href = r.url; return true; }
        if (r.status) { await muatPapan(tp.id); return true; }
        throw new Error("tiada url");
      } catch (e) {
        const u = urlBayar(tp);
        if (u) { location.href = u; return true; }
        store.set("qawwam-bayar", null);
        await muatPapan(tp.id);
        const m = $(".pb-mesej", $("#pb-tindakan"));
        // setup problems (function or Stripe key missing) are for us, not the customer
        const teknikal = ["tiada_fungsi", "tiada_kunci", "konfigurasi", "fungsi", "stripe", "pelayan"].includes(e && e.kodBayar);
        if (teknikal && window.console) console.warn("qawwam-bayar:", e.kodBayar, e.message);
        if (m) { m.textContent = t("pb.bayarGagal", { sebab: teknikal ? t("pb.belumSedia") : sebab(e) }); m.hidden = false; m.classList.add("gagal"); }
        return false;
      }
    }
    const u = urlBayar(tp);
    if (u) { location.href = u; return true; }
    return false;
  }
  // ask Stripe (through the function) whether an unpaid online order has been paid; once per order per page view
  const disemak = new Set();
  async function semakBayar(tp, paksa) {
    const b = (tp && tp.bayaran) || {};
    if (!stripeAuto() || !tp || b.cara !== "online" || b.status === "dibayar" || !b.sesi || (!paksa && disemak.has(tp.id))) return null;
    disemak.add(tp.id);
    try { const r = await G.bayarStripe(tp.id, "semak"); return r.status || null; } catch (e) { return null; }
  }
  const sudahBayar = (tp) => { const b = store.get("qawwam-bayar-selesai") || {}; return !!b[tp.id]; };
  // back from Stripe: the Payment Link redirects to <site>/?bayar=selesai (README)
  function balikDariBayar() {
    const q = new URLSearchParams(location.search), hashSelesai = location.hash === "#bayar-selesai";
    if (q.get("bayar") !== "selesai" && !hashSelesai) return null;
    const terakhir = store.get("qawwam-bayar");
    if (terakhir && terakhir.id && Date.now() - terakhir.masa < 3 * 864e5) {
      const b = store.get("qawwam-bayar-selesai") || {};
      b[terakhir.id] = Date.now();
      store.set("qawwam-bayar-selesai", b);
    }
    q.delete("bayar");
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + "#masuk");
    return terakhir ? terakhir.id : "";
  }
  const saluranHantar = (tp) => t(tp.emel ? "saluran.waEmel" : "saluran.wa");
  function paparTindakanPapan(tp) {
    const box = $("#pb-tindakan"), st = tp.status, b = tp.bayaran || {};
    const harga = st === "draf" ? rm(hargaTema(tp.tema)) : tp.harga || rm(hargaTema(tp.tema));
    const wa = SHOP.whatsapp ? `<a class="btn garis" href="${esc(waPautan(t("pb.waTeks", { kod: tp.kod })))}" target="_blank" rel="noopener"><svg class="ikon" aria-hidden="true"><use href="#i-wa"/></svg>${esc(t("pb.wa"))}</a>` : "";
    const L = [];
    let butang = "";
    if (st === "draf") {
      const b0 = tp.borang || {}, u = AKAUN.user || {};
      const adaQr = !!TETAPAN.qr_tng, adaBank = !!TETAPAN.bank_akaun, jenisQr = adaQr && adaBank ? "" : adaQr ? "Qr" : "Bank";
      const rs = papan.resit && papan.resit.id === tp.id ? papan.resit : null;   // receipt already chosen for this order
      L.push(`<p>${esc(t("pb.draf"))}</p>`);
      // needed to pay (the database checks them too)
      L.push(`<fieldset class="pb-butiran-anda">
        <legend>${esc(t("pb.butiran"))}</legend>
        <div class="medan"><label for="pb-nama">${esc(t("pb.nama"))}</label><input id="pb-nama" type="text" maxlength="80" autocomplete="name" value="${esc(tp.nama_pelanggan || b0.namaPelanggan || (u.tetamu ? "" : u.nama || ""))}"></div>
        <div class="dua lipat">
          <div class="medan"><label for="pb-emel">${esc(t("pb.emel"))}</label><input id="pb-emel" type="email" inputmode="email" maxlength="120" autocomplete="email" value="${esc(tp.emel || b0.emel || (u.tetamu ? "" : u.emel || emelSebenar(u.emel_masuk)))}"></div>
          <div class="medan"><label for="pb-telefon">${esc(t("pb.telefon"))}</label><input id="pb-telefon" type="tel" inputmode="tel" maxlength="16" autocomplete="tel" value="${esc(tp.telefon ? telPapar(tp.telefon) : "")}"></div>
        </div>
        <p class="petunjuk">${esc(t("pb.butiranP"))}</p>
      </fieldset>`);
      L.push(`<fieldset class="cara-bayar">
        <legend>${esc(t("pb.caraBayar"))}</legend>
        <label class="cara"><input type="radio" name="cara-bayar" value="online" checked><span class="cara-teks"><b>${esc(t("pb.online"))}</b><span>${esc(t("pb.onlineP"))}</span></span><b class="cara-harga">${esc(harga)}</b></label>
        <label class="cara"><input type="radio" name="cara-bayar" value="shopee"><span class="cara-teks"><b>${esc(t("pb.shopee"))}</b><span>${esc(t("pb.shopeeP"))}</span></span></label>
        <div class="medan shopee-medan" hidden><label for="pb-shopee">${esc(t("pb.shopeeKod"))}</label><input id="pb-shopee" type="text" maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="241015ABCD1234"></div>
        ${adaQr || adaBank ? `<label class="cara"><input type="radio" name="cara-bayar" value="qr"><span class="cara-teks"><b>${esc(t("pb.tng"))}</b><span>${esc(t("pb.tngP" + jenisQr))}</span></span><b class="cara-harga">${esc(harga)}</b></label>
        <div class="tng-medan" hidden>
          <p>${esc(t("pb.tngLangkah" + jenisQr, { harga, kod: tp.kod }))}</p>
          <div class="qr-bank">
            ${adaQr ? `<figure class="tng-qr"><img src="${esc(TETAPAN.qr_tng)}" alt="DuitNow QR">${TETAPAN.qr_tng_nama ? `<figcaption>${esc(t("pb.tngPenerima", { nama: TETAPAN.qr_tng_nama }))}</figcaption>` : ""}</figure>` : ""}
            ${adaBank ? `<dl class="bank-butiran">
              ${TETAPAN.bank_nama ? `<div><dt>${esc(t("pb.bankNama"))}</dt><dd>${esc(TETAPAN.bank_nama)}</dd></div>` : ""}
              ${TETAPAN.bank_pemegang ? `<div><dt>${esc(t("pb.bankPemegang"))}</dt><dd>${esc(TETAPAN.bank_pemegang)}</dd></div>` : ""}
              <div><dt>${esc(t("pb.bankAkaun"))}</dt><dd><span class="bank-akaun">${esc(TETAPAN.bank_akaun)}</span><button class="btn teks kecil" type="button" data-pb="salin-akaun">${esc(t("pb.salinAkaun"))}</button></dd></div>
            </dl>` : ""}
          </div>
          ${adaQr ? `<p class="tng-telefon"><a class="btn garis kecil" href="${esc(TETAPAN.qr_tng)}" download="qawwam-duitnow-qr.png">${esc(t("pb.tngSimpan"))}</a> <span>${esc(t("pb.tngTelefon"))}</span></p>` : ""}
          <div class="medan"><label for="pb-tng">${esc(t("pb.tngRujukan"))}</label><input id="pb-tng" type="text" maxlength="60" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="2026100812345678"></div>
          <div class="medan resit-medan">
            <span class="label" id="pb-resit-label">${esc(t("pb.resit"))}</span>
            <div class="fail-pilih"><label class="btn garis kecil" for="pb-resit">${esc(t(rs ? "pb.resitTukar" : "pb.resitPilih"))}</label><input class="sr" type="file" id="pb-resit" accept="image/*,application/pdf" aria-labelledby="pb-resit-label"><span class="fail-nama${rs ? " ada" : ""}" id="pb-resit-nama">${esc(rs ? rs.nama : t("fail.tiada"))}</span></div>
            <img class="resit-pratonton" id="pb-resit-img" alt="${esc(t("pb.resit"))}"${rs && rs.url ? ` src="${esc(rs.url)}"` : " hidden"}>
            <span class="petunjuk">${esc(t("pb.resitP"))}</span>
          </div>
        </div>` : ""}
      </fieldset>`);
      butang = `<button class="btn utama" type="button" data-pb="sahkan" data-harga="${esc(harga)}" data-bayar="${bolehBayar(tp) ? 1 : ""}">${esc(bolehBayar(tp) ? t("pb.sahkanBayar", { harga }) : t("pb.sahkan"))}</button>
        <button class="btn garis" type="button" data-pb="ubah">${esc(t("pb.ubah"))}</button>
        <button class="btn teks bahaya" type="button" data-pb="padam">${esc(t("pb.padam"))}</button>`;
    } else if (st === "dihantar" || st === "diproses") {
      L.push(`<p class="pb-utama">${esc(t("pb.proses", { saluran: saluranHantar(tp) }))}</p>`);
      if (b.status === "dibayar") L.push(`<p class="pb-bayar ok">${esc(t("pb.bayaranOk"))}</p>`);
      else if (b.cara === "shopee") L.push(`<p class="pb-bayar">${esc(t("pb.bayaranShopee", { kod: b.shopee || "" }))}</p>`);
      else if (caraQr(b)) L.push(`<p class="pb-bayar">${esc(t("pb.bayaranTng", { kod: b.rujukan || "" }))}</p>`);
      else if (b.status === "semak") L.push(`<p class="pb-bayar">${esc(t("pb.bayaranSemakStripe"))}</p>`);
      else if (sudahBayar(tp)) L.push(`<p class="pb-bayar">${esc(t("pb.bayaranDisemak"))}</p>`);
      else {
        L.push(`<p class="pb-bayar">${esc(t("pb.bayaranBelum", { harga }))}${bolehBayar(tp) ? "" : " " + esc(t("pb.bayaranAkan"))}</p>`);
        if (bolehBayar(tp)) butang += `<button class="btn utama" type="button" data-pb="bayar">${esc(t("pb.bayar", { harga }))}</button>`;
      }
      butang += wa;
    } else if (st === "siap") {
      L.push(`<p>${esc(t("pb.siap"))}</p>`);
      if (tp.pautan) { L.push(`<p class="pautan-kad">${esc(tp.pautan)}</p>`); butang = `<a class="btn utama" href="${esc(tp.pautan)}" target="_blank" rel="noopener">${esc(t("pb.buka"))}</a><button class="btn garis" type="button" data-pb="salin">${esc(t("pb.salin"))}</button>`; }
    } else { L.push(`<p>${esc(t("pb.batal"))}</p>`); butang = wa; }
    box.innerHTML = L.join("") + `<div class="pb-butang">${butang}</div><p class="pb-mesej" role="status" hidden></p>`;
  }
  function pasangPapan() {
    const on = (s, fn) => { const el = $(s); if (el) el.addEventListener("click", fn); };
    on("#papan-senarai", (e) => { const b = e.target.closest(".t-item"); if (b) bukaTempahan(b.dataset.id); });
    on("#pb-kembali", () => { tutupTempahan(); window.scrollTo(0, 0); });
    on("#papan-muat", () => muatPapan());
    on("#btn-keluar", (e) => {
      const b = e.currentTarget;
      // a guest without a password can't come back to this order: ask twice
      if (ialahTetamu() && !b.dataset.pasti) {
        b.dataset.pasti = "1"; b.textContent = t("tetamu.keluarPasti");
        setTimeout(() => { if (b.isConnected && b.dataset.pasti) { delete b.dataset.pasti; kemasAkaunUI(); } }, 4000);
        return;
      }
      delete b.dataset.pasti;
      keluarAkaun();
    });
    on("#tt-ke-masuk", () => keMasukDariTetamu(""));
    on("#masuk-balik-tetamu", () => { papan.keMasuk = false; store.set("qawwam-tunggu", null); kemasAkaunUI(); muatPapan(); });
    on("#rsvp-muat", () => muatRsvp());
    on("#rsvp-isi", (e) => { const b = e.target.closest("[data-rsvp-lagi]"); if (b) { rsvpP.penuh.add(b.dataset.rsvpLagi); paparRsvp(); } });
    const bt = $("#borang-tetamu");
    if (bt) bt.addEventListener("submit", async (e) => {
      e.preventDefault();
      const m = $("#tt-mesej"), btn = $("#tt-simpan"), emel = $("#tt-emel").value.trim().toLowerCase(), kata = $("#tt-kata").value;
      const papar = (k, v, gagal) => { m.textContent = t(k, v); m.hidden = false; m.classList.toggle("gagal", !!gagal); };
      if (!emelSah(emel)) return papar("err.emel", null, true);
      if (emel.endsWith("@" + SHOP.akaunDomain)) return papar("tetamu.domain", null, true);
      if (kata.length < 8) return papar("au.kata", null, true);
      const tp = papan.senarai[0] || {};
      btn.disabled = true; m.hidden = true;
      try {
        AKAUN.user = await G.jadiAkaun(emel, kata, { nama: tp.nama_pelanggan || (tp.borang && tp.borang.namaPelanggan) || nilai("namaPelanggan"), telefon: tp.telefon || normTel(nilai("telefon")) });
        $("#tt-kata").value = "";
        lepasAuth();
        notisPapan(t("tetamu.ok", { emel }));
      } catch (ex) {
        if (ex && ex.kod === "emelAda") keMasukDariTetamu(emel, t("tetamu.emelAda"));
        else if (ex && ex.kod === "emelSahkan") papar("tetamu.emelSahkan", { emel });
        else if (ex && ex.kod === "terlalu") papar("au.terlalu", null, true);
        else papar("pb.gagal", { sebab: sebab(ex) }, true);
      } finally { btn.disabled = false; }
    });
    on("#btn-google", masukGoogle);
    on("#papan-baharu", () => { if (state.edit && !state.edit.admin) tamatUbah(); });
    const bk = $("#borang-kata");
    if (bk) bk.addEventListener("submit", async (e) => {
      e.preventDefault();
      const m = $("#kt-mesej"), baru = $("#kt-baru").value;
      const papar = (k, v, gagal) => { m.textContent = t(k, v); m.hidden = false; m.classList.toggle("gagal", !!gagal); };
      if (baru.length < 8) return papar("au.kata", null, true);
      try { await G.tukarKata(baru); $("#kt-baru").value = ""; papar("papan.kataOk"); }
      catch (ex) { papar("pb.gagal", { sebab: sebab(ex) }, true); }
    });
    const tindakan = $("#pb-tindakan");
    if (tindakan) tindakan.addEventListener("change", (e) => {
      if (e.target.id === "pb-resit") {
        const inp = e.target, f = inp.files && inp.files[0], tp = papan.buka, nm = $("#pb-resit-nama"), m = $(".pb-mesej", tindakan);
        inp.value = "";
        if (!f || !tp) return;
        nm.textContent = t("fail.memproses");
        sediaResit(f).then((rs) => {
          if (papan.resit && papan.resit.url) URL.revokeObjectURL(papan.resit.url);
          papan.resit = Object.assign(rs, { id: tp.id });
          nm.textContent = rs.nama; nm.classList.add("ada");
          const img = $("#pb-resit-img"); img.hidden = !rs.url; if (rs.url) img.src = rs.url; else img.removeAttribute("src");
          $('label[for="pb-resit"]', tindakan).textContent = t("pb.resitTukar");
          if (m) m.hidden = true;
        }).catch(() => {
          const ada = papan.resit && papan.resit.id === tp.id;
          nm.textContent = ada ? papan.resit.nama : t("fail.tiada");
          if (m) { m.textContent = t("pb.resitSalah"); m.hidden = false; m.classList.add("gagal"); }
        });
        return;
      }
      if (e.target.name !== "cara-bayar") return;
      const cara = e.target.value, btn = $('[data-pb="sahkan"]', tindakan), tng = $(".tng-medan", tindakan);
      $(".shopee-medan", tindakan).hidden = cara !== "shopee";
      if (tng) tng.hidden = cara !== "qr";
      if (cara === "shopee") $("#pb-shopee").focus();
      if (btn) btn.textContent = cara === "online" && btn.dataset.bayar ? t("pb.sahkanBayar", { harga: btn.dataset.harga })
        : cara === "qr" ? t("pb.sudahBayar", { harga: btn.dataset.harga }) : t("pb.sahkan");
    });
    on("#pb-tindakan", async (e) => {
      const b = e.target.closest("[data-pb]"), tp = papan.buka;
      if (!b || !tp) return;
      const mesej = $(".pb-mesej", $("#pb-tindakan"));
      const papar = (s, gagal) => { mesej.textContent = s; mesej.hidden = !s; mesej.classList.toggle("gagal", !!gagal); };
      const k = b.dataset.pb;
      if (k === "salin") return salin(tp.pautan, b);
      if (k === "salin-akaun") return salin(String(TETAPAN.bank_akaun || "").replace(/\D/g, ""), b);
      if (k === "bayar") {
        $$("[data-pb]", $("#pb-tindakan")).forEach((x) => { x.disabled = true; });
        if (!(await keBayar(tp, papar))) $$("[data-pb]", $("#pb-tindakan")).forEach((x) => { x.disabled = false; });
        return;
      }
      if (k === "ubah") return ubahTempahan(tp, false);
      if (k === "padam" && !b.dataset.pasti) {
        b.dataset.pasti = "1"; b.textContent = t("pb.padamPasti");
        setTimeout(() => { if (b.isConnected) { delete b.dataset.pasti; b.textContent = t("pb.padam"); } }, 4000);
        return;
      }
      $$("[data-pb]", $("#pb-tindakan")).forEach((x) => { x.disabled = true; });
      papar(t("pb.sedang"));
      try {
        if (k === "sahkan") {
          const cara = ($('input[name="cara-bayar"]:checked', tindakan) || {}).value || "online";
          $$('[aria-invalid="true"]', tindakan).forEach((x) => x.removeAttribute("aria-invalid"));
          const bersih = (s) => (s ? $(s).value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() : "");
          const shopee = cara === "shopee" ? bersih("#pb-shopee") : "", rujukan = cara === "qr" ? bersih("#pb-tng") : "";
          const nama = $("#pb-nama").value.trim(), emel = $("#pb-emel").value.trim().toLowerCase(), tel = $("#pb-telefon").value.trim();
          if (nama.length < 2) throw Object.assign(ralatKod("nama"), { el: "#pb-nama" });
          if (!emelSah(emel)) throw Object.assign(ralatKod("emel"), { el: "#pb-emel" });
          if (!telSah(tel)) throw Object.assign(ralatKod("telefon"), { el: "#pb-telefon" });
          if (cara === "shopee" && (shopee.length < 6 || shopee.length > 30)) throw ralatKod("shopeeSalah");
          if (cara === "qr" && (rujukan.length < 6 || rujukan.length > 40)) throw ralatKod("tngSalah");
          const rs = papan.resit && papan.resit.id === tp.id ? papan.resit : null;
          if (cara === "qr" && !rs) throw Object.assign(ralatKod("resitPerlu"), { el: "#pb-resit" });
          const ubah = { status: "dihantar", nama_pelanggan: nama, emel, telefon: normTel(tel),
            bayaran: cara === "shopee" ? { cara, shopee } : cara === "qr" ? { cara, rujukan } : { cara } };
          if (cara === "qr") {
            // the receipt goes into the order's private folder first; the database checks it's there
            papar(t("pb.resitMuat"));
            const asas = `${tp.pemilik}/${tp.id}/resit.`, laluan = asas + rs.ext;
            await G.muatNaik(laluan, rs.blob, rs.jenis);
            G.buangFail(["jpg", "pdf"].filter((x) => x !== rs.ext).map((x) => asas + x)).catch(() => {});
            ubah.fail = Object.assign({}, tp.fail || {}, { resit: laluan });
          }
          const rek = await G.simpan(tp.id, ubah);
          if (rs) { if (rs.url) URL.revokeObjectURL(rs.url); papan.resit = null; }
          if (state.edit && state.edit.id === tp.id) tamatUbah();
          // paying online: straight on to the payment page
          if (cara === "online" && bolehBayar(rek)) { await keBayar(rek, papar); return; }
          await muatPapan(tp.id);
          const m = $(".pb-mesej", $("#pb-tindakan")); if (m) { m.textContent = t("pb.disahkan"); m.hidden = false; }
        } else if (k === "padam") {
          await G.padam(tp);
          if (state.edit && state.edit.id === tp.id) tamatUbah();
          tutupTempahan();
          await muatPapan();
        }
      } catch (ex) {
        // the database's messages (English since Oct 2026, Malay before) → the customer's language
        const m = sebab(ex), kod = ex && ex.kod;
        papar(kod === "shopeeSalah" || /Semak nombor pesanan Shopee|Check the Shopee order number/.test(m) ? t("pb.shopeeSalah")
          : /Shopee.*(sudah digunakan|already been used)/.test(m) ? t("pb.shopeeGuna")
          : kod === "tngSalah" || /Semak nombor rujukan|Check the payment reference/.test(m) ? t("pb.tngSalah")
          : /rujukan ini sudah digunakan|reference has already been used/.test(m) ? t("pb.tngGuna")
          : kod === "nama" || /Enter your name/.test(m) ? t("err.nama")
          : kod === "emel" || /valid email/.test(m) ? t("err.emel")
          : kod === "telefon" || /valid WhatsApp/.test(m) ? t("err.telefon")
          : kod === "resitPerlu" || /payment receipt/.test(m) ? t("pb.resitPerlu") : t("pb.gagal", { sebab: m }), true);
        if (ex && ex.el && $(ex.el)) { $(ex.el).setAttribute("aria-invalid", "true"); $(ex.el).focus(); }
        $$("[data-pb]", $("#pb-tindakan")).forEach((x) => { x.disabled = false; });
      }
    });
  }

  /* =====================================================================
     G. RSVP PANEL (dashboard): replies to the cards of this account's orders. Password accounts only
        (the database function rsvp_saya refuses guest sessions).
     ===================================================================== */
  const rsvpP = { tok: 0, data: null, penuh: new Set() };
  async function muatRsvp() {
    const box = $("#rsvp-isi");
    if (!box || !AKAUN.user || AKAUN.user.tetamu || !G || !G.rsvpSaya) return;
    const tok = ++rsvpP.tok;
    if (!rsvpP.data) box.innerHTML = `<p class="redup">${esc(t("rsvp.memuat"))}</p>`;
    let r;
    try { r = await G.rsvpSaya(); }
    catch (e) { if (tok === rsvpP.tok) box.innerHTML = `<p class="ralat">${esc(t("rsvp.ralat", { sebab: sebab(e) }))}</p>`; return; }
    if (tok !== rsvpP.tok) return;
    rsvpP.data = r && r.ok ? r.kad || [] : [];
    paparRsvp();
  }
  function paparRsvp() {
    const box = $("#rsvp-isi");
    if (!box) return;
    const kad = rsvpP.data || [], semua = kad.flatMap((k) => k.senarai || []), hadir = semua.filter((x) => x.hadir);
    const n = (id, v) => { const el = $(id); if (el) el.textContent = kad.length ? String(v) : "–"; };
    n("#rsvp-n-hadir", hadir.length);
    n("#rsvp-n-tetamu", hadir.reduce((a, x) => a + (Number(x.pax) || 0), 0));
    n("#rsvp-n-tidak", semua.length - hadir.length);
    if (!rsvpP.data) { box.textContent = ""; return; }
    if (!kad.length) { box.innerHTML = `<p class="redup">${esc(t("rsvp.kosong"))}</p>`; return; }
    box.innerHTML = kad.map((k) => {
      const s = k.senarai || [], papar = rsvpP.penuh.has(k.kad_id) ? s : s.slice(0, 8);
      return `<section class="rsvp-kad">
        <h3>${esc(k.pasangan || k.kod)}<span>${esc(k.kod)} · ${esc(t("rsvp.jawapan", { n: s.length }))}</span></h3>
        ${s.length ? `<ul class="rsvp-senarai">${papar.map((x) => `<li class="${x.hadir ? "hadir" : "tidak"}"><b>${esc(x.nama)}</b><span class="rsvp-pax">${esc(x.hadir ? t("rsvp.pax", { n: x.pax }) : t("rsvp.tidakHadir"))}</span>${x.ucapan ? `<span class="rsvp-ucapan">${esc(x.ucapan)}</span>` : ""}</li>`).join("")}</ul>`
          : `<p class="redup">${esc(t("rsvp.tiadaJawapan"))}</p>`}
        ${s.length > papar.length ? `<button class="btn teks kecil" type="button" data-rsvp-lagi="${esc(k.kad_id)}">${esc(t("rsvp.lagi", { n: s.length }))}</button>` : ""}
      </section>`;
    }).join("");
  }

  /* =====================================================================
     F. ADMIN: every order, its status, its content, and the finished card to download
     Only accounts with profil.peranan = 'admin' get here (checked by the database, not just this page).
     The admin page is always in English (its text lives here and in partials/admin.html, not in I18N;
     shared helpers are run through dalamEn()).
     ===================================================================== */
  const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  const ADM = { senarai: [], tapis: "aktif", cari: "", buka: null, cfg: null, skrin: null, tok: 0, sedia: false };
  const ST_ADMIN = { draf: "Customer draft", dihantar: "New", diproses: "In progress", siap: "Completed", batal: "Cancelled" };
  const TAPIS_ADMIN = [["aktif", "Needs action", ["dihantar", "diproses"]], ["dihantar", "New", ["dihantar"]], ["diproses", "In progress", ["diproses"]],
    ["siap", "Completed", ["siap"]], ["draf", "Customer drafts", ["draf"]], ["batal", "Cancelled", ["batal"]], ["semua", "All", null]];
  const chipAdmin = (st) => `<span class="status st-${esc(st)}">${esc(ST_ADMIN[st] || st)}</span>`;
  // payment state for the admin: Stripe not paid yet / Shopee or QR-bank payment to check / paid
  function chipBayar(tp, ringkas) {
    const b = tp.bayaran || {};
    if (!b.cara) return "";
    if (b.status === "dibayar") return `<span class="bayar-chip ok">Paid${b.cara === "shopee" ? " · Shopee" : caraQr(b) ? " · QR/Bank" : " · Stripe"}</span>`;
    if (b.cara === "shopee") return `<span class="bayar-chip semak">Shopee${ringkas ? "" : " " + esc(b.shopee || "")} · to check</span>`;
    if (caraQr(b)) return `<span class="bayar-chip semak">QR/Bank${ringkas ? "" : " " + esc(b.rujukan || "")} · to check</span>`;
    if (b.status === "semak") return `<span class="bayar-chip semak">Stripe · to check</span>`;
    return `<span class="bayar-chip">Not paid</span>`;
  }
  // who placed the order: the name they gave, and whether it's a guest checkout or an account
  function pelangganAdmin(tp) {
    const pr = tp.profil || {}, tetamu = /^tetamu_/.test(pr.nama_pengguna || "");
    const akaun = tetamu ? (pr.emel ? "Account " + pr.emel : "Guest checkout") : "@" + (pr.nama_pengguna || "?");
    return { nama: tp.nama_pelanggan || (tp.borang && tp.borang.namaPelanggan) || pr.nama || (tetamu ? "Guest" : "@" + (pr.nama_pengguna || "?")), akaun, tetamu: tetamu && !pr.emel };
  }
  const sqlTeks = (v) => "'" + String(v).replace(/'/g, "''") + "'";
  function muatTurunBlob(blob, nama) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = nama; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* order CONFIG -> full CONFIG for the chosen template (switching templates keeps what still applies) */
  function lengkapkan(c0, tm, nama) {
    const c = JSON.parse(JSON.stringify(c0 || {}));
    if (c.rsvp) { delete c.rsvp.whatsapp; delete c.rsvp.nama; }
    ["jenama", "ics"].forEach((k) => delete c[k]);
    if (tm.pakej === "flip") {
      ["tamat", "aturcara", "kadId", "rsvp", "hubungi", "muzik", "autoSkrol", "pakej", "pautan", "galeri", "hadiah", "bukuTetamu"].forEach((k) => delete c[k]);
      if (c.lokasi) { delete c.lokasi.nota; delete c.lokasi.wazeUrl; }
      c.gaya = tm.warnaFlip ? (tm.warnaFlip.find((w) => w.key === c.gaya) || tm.warnaFlip[0]).key : (tm.gaya || "gading");
      if (!c.tajuk) c.tajuk = SAMPLE.tajuk;
      if (typeof c.bismillah !== "boolean") c.bismillah = true;
      return c;
    }
    ["gaya", "tajuk", "bismillah"].forEach((k) => delete c[k]);
    if (!c.aturcara) c.aturcara = [];
    if (!c.tamat && c.mula) c.tamat = c.mula;
    c.kadId = nama;
    if (!c.rsvp) c.rsvp = { tarikhAkhir: "", maksPax: 6 };
    if (!c.hubungi) c.hubungi = [];
    if (!("muzik" in c)) c.muzik = "lagu.mp3";
    c.autoSkrol = c.autoSkrol !== false;
    if (tm.pakej === "premium") {
      c.pakej = "premium";
      c.pautan = `${SHOP.url}/k/${nama}/`;
      const g = Array.isArray(c.galeri) ? c.galeri : [];
      c.galeri = g.slice(0, MAKS_GALERI).map((x, i) => (typeof x === "string" ? { src: `galeri/${i + 1}.jpg`, kapsyen: x } : x));
      if (c.hadiah === undefined) c.hadiah = null;
      else if (c.hadiah) c.hadiah = Object.assign({ qr: "" }, c.hadiah);
      if (typeof c.bukuTetamu !== "boolean") c.bukuTetamu = true;
    } else ["pakej", "pautan", "galeri", "hadiah", "bukuTetamu"].forEach((k) => delete c[k]);
    return c;
  }
  function kadAkhir(tpl, cfg, tm) {
    const c = Object.assign({}, cfg, { jenama: jenama(tm.pakej) });
    if (tm.pakej !== "flip") c.ics = true;
    const tajuk = `${tm.pakej === "flip" && c.tajuk ? c.tajuk : "Walimatul Urus"} ${c.anak.panggilan} & ${c.pasangan.panggilan}`;
    const tarikh = c.mula ? tarikhPenuhMs(c.mula.slice(0, 10)) : "";
    const meta = `<title>${esc(tajuk)}</title>\n<meta property="og:title" content="${esc(tajuk)}">\n<meta property="og:description" content="${esc(tarikh + " · " + c.lokasi.nama)}">\n<meta property="og:type" content="website">`;
    return susun(tpl, c, { meta, akhir: true });
  }

  function kemasAdmin() {
    if (!$("#ad-pintu")) return;
    const u = AKAUN.user, admin = !!(u && u.peranan === "admin");
    $("#ad-pintu").hidden = admin;
    $("#ad-dalam").hidden = !admin;
    $("#ad-bukan").hidden = !u || admin;
    $("#ad-borang").hidden = !!u;
    if (u && !admin) $("#ad-bukan-nama").textContent = u.tetamu ? "(guest checkout)" : /^tetamu_/.test(u.nama_pengguna || "") ? u.emel || u.emel_masuk || "" : "@" + u.nama_pengguna;
    $("#ad-demo-pintu").hidden = !G || G.sebenar;
    $("#ad-demo").hidden = !G || G.sebenar;
    if (!admin) return;
    $("#ad-siapa").textContent = "@" + u.nama_pengguna;
    siapkanAdmin();
    adminMuat();
  }

  async function adminMuat(bukaId) {
    const box = $("#ad-senarai"), tok = ++ADM.tok;
    if (!ADM.senarai.length) box.innerHTML = `<p class="redup">Loading…</p>`;
    try { const s = await G.senaraiSemua(); if (tok !== ADM.tok) return; ADM.senarai = s; }
    catch (e) { box.innerHTML = `<p class="ralat">Orders couldn't be loaded. ${esc(sebab(e))}</p>`; return; }
    adminSenarai();
    const id = bukaId || (ADM.buka && ADM.buka.id);
    if (id && ADM.senarai.some((x) => x.id === id)) adminBuka(id); else adminTutup();
  }

  function adminSenarai() {
    const q = ADM.cari.trim().toLowerCase();
    const cocok = (tp) => !q || [tp.kod, pasanganDari(tp), tp.telefon, tp.nama_pelanggan, tp.emel, tp.profil && tp.profil.nama_pengguna, tp.profil && tp.profil.emel, tp.kad_id]
      .some((v) => v && String(v).toLowerCase().includes(q));
    $("#ad-tapis").innerHTML = TAPIS_ADMIN.map(([k, l, st]) => {
      const n = ADM.senarai.filter((tp) => !st || st.includes(tp.status)).length;
      return `<button type="button" class="tapis" data-ad-tapis="${k}" aria-pressed="${ADM.tapis === k}">${esc(l)} <span>${n}</span></button>`;
    }).join("");
    const st = TAPIS_ADMIN.find((x) => x[0] === ADM.tapis)[2];
    const senarai = ADM.senarai.filter((tp) => (!st || st.includes(tp.status)) && cocok(tp));
    const box = $("#ad-senarai");
    if (!senarai.length) { box.innerHTML = `<p class="ad-kosong">${ADM.senarai.length ? "No matching orders." : "No orders yet."}</p>`; return; }
    box.innerHTML = dalamEn(() => senarai.map((tp) => {
      const tm = temaById(tp.tema), p = pakejById(tp.pakej), c = pelangganAdmin(tp);
      return `<button type="button" class="ad-item" data-id="${esc(tp.id)}">
        <span class="ad-i-status">${chipAdmin(tp.status)}${chipBayar(tp, true)}</span>
        <span class="ad-i-utama"><b>${esc(pasanganDari(tp))}</b><span>${esc(tp.kod)} · ${esc(p.nama.en)} · ${esc(tm.nama)}</span></span>
        <span class="ad-i-majlis">${esc(tarikhTempahan(tp) || "-")}</span>
        <span class="ad-i-pelanggan">${esc(c.nama)}<br><span class="redup">${esc(c.akaun)}</span>${tp.telefon ? "<br>" + esc(telPapar(tp.telefon)) : ""}</span>
        <span class="ad-i-masa">${esc(tp.harga || "")}${tp.harga ? "<br>" : ""}${esc(masaLalu(tp.dikemaskini))}</span>
      </button>`;
    }).join(""));
  }

  const pandanganHarga = () => !!($("#adp-harga") && $("#adp-harga").checked);
  function adminTutup() {
    ADM.buka = null; ADM.cfg = null;
    $("#ad-butiran").hidden = true;
    $("#ad-senarai-blok").hidden = pandanganHarga();
    if (ADM.skrin) { ADM.skrin.tok++; ADM.skrin.f.forEach((f) => { f.srcdoc = ""; f.classList.remove("on"); }); ADM.skrin.el.classList.remove("siap"); }
  }
  const slugAdmin = () => slug($("#ad-slug").value || "kad");
  const temaAdmin = () => temaById($("#ad-tema").value);
  const mesejAdmin = (s, gagal) => { const m = $("#ad-mesej"); m.textContent = s || ""; m.hidden = !s; m.classList.toggle("gagal", !!gagal); };

  async function adminBuka(id, segar) {
    if (segar) { await adminMuat(id); return; }
    const tp = ADM.senarai.find((x) => x.id === id);
    if (!tp) return;
    const baru = !ADM.buka || ADM.buka.id !== id;
    ADM.buka = tp;
    if (pandanganHarga()) { $("#adp-tempahan").checked = true; $("#ad-harga-blok").hidden = true; }
    $("#ad-senarai-blok").hidden = true;
    $("#ad-butiran").hidden = false;
    if (baru) { mesejAdmin(""); window.scrollTo(0, 0); }
    const pr = tp.profil || {}, p = pakejById(tp.pakej), c = pelangganAdmin(tp);
    const wa = tp.telefon ? `<a class="btn wa kecil" id="ad-wa-pelanggan" href="${esc(waPelanggan(tp))}" target="_blank" rel="noopener"><svg class="ikon" aria-hidden="true"><use href="#i-wa"/></svg>${esc(telPapar(tp.telefon))}</a>` : "";
    const emel = tp.emel || pr.emel;
    $("#ad-b-kepala").innerHTML = dalamEn(() => `<div><p class="eyebrow">${esc(tp.kod)} · ${esc(p.nama.en)} ${esc(tp.harga || rm(hargaTema(tp.tema)))}</p><h2>${esc(pasanganDari(tp))}</h2>
      <p class="redup">Customer: ${esc(c.nama)} · ${esc(c.akaun)}${emel ? ` · <a href="mailto:${esc(emel)}">${esc(emel)}</a>` : ""} · created ${esc(masaLalu(tp.dicipta))}${tp.dihantar ? " · confirmed " + esc(masaLalu(tp.dihantar)) : ""}</p></div>
      <div class="ad-b-kanan">${chipAdmin(tp.status)}${chipBayar(tp)}${wa}</div>`);
    adminTindakan(tp);
    // a payment that hasn't come back to the site yet: ask Stripe once
    semakBayar(tp).then((st) => { if (st && st !== "belum" && ADM.buka && ADM.buka.id === tp.id) adminMuat(tp.id); });
    $("#ad-dl").innerHTML = dalamEn(() => dlTempahan(tp, true));
    $("#ad-jumlah").value = tp.jumlah != null ? Number(tp.jumlah).toFixed(2) : hargaTema(tp.tema).toFixed(2);
    $("#ad-tema").value = tp.tema;
    $("#ad-slug").value = tp.kad_id || (tp.config && tp.config.kadId) || namaKad(tp.config || { anak: { panggilan: "kad" }, pasangan: { panggilan: "" } });
    $("#ad-pautan").value = tp.pautan || "";
    $("#ad-nota").value = tp.nota_admin || "";
    ADM.cfg = lengkapkan(tp.config || {}, temaById(tp.tema), slugAdmin());
    $("#ad-config").value = JSON.stringify(ADM.cfg, null, 2);
    $("#ad-ralat").hidden = true;
    const tarikh = (tp.borang && tp.borang.tarikh) || (ADM.cfg.mula || "").slice(0, 10);
    $("#ad-hijri").textContent = `customer typed: ${ADM.cfg.hijri || "(empty)"} · Umm al-Qura: ${hijriDari(tarikh) || "-"}`;
    if (baru) $("#ad-idpemilik").value = "";
    adminFail(tp);
    adminLangkah();
    adminPratonton();
  }

  function adminTindakan(tp) {
    const b = (k, l, kelas) => `<button class="btn ${kelas || "garis"} kecil" type="button" data-ad="${k}">${l}</button>`;
    const st = tp.status, L = [];
    if (st === "draf") L.push(`<span class="petunjuk">The customer hasn't confirmed this order yet.</span>`, b("dihantar", "Confirm for the customer"));
    if (st === "dihantar") L.push(b("diproses", "Start processing", "utama"), b("batal", "Cancel order"));
    if (st === "diproses") L.push(b("siap", "Mark as completed", "utama"), b("dihantar", "Move back to New"), b("batal", "Cancel order"));
    if (st === "siap") { if (tp.pautan) L.push(`<a class="btn utama kecil" href="${esc(tp.pautan)}" target="_blank" rel="noopener">Open card</a>`); L.push(b("diproses", "Move back to In progress")); }
    if (st === "batal") L.push(b("dihantar", "Restore order"));
    const by = tp.bayaran || {};
    if (st !== "draf" && st !== "batal" && by.status !== "dibayar") {
      L.push(b("dibayar", by.cara === "shopee" ? "Shopee checked: mark as paid" : caraQr(by) ? "Payment received: mark as paid" : "Mark as paid"));
      if (caraQr(by)) L.push(`<span class="petunjuk ad-semak-stripe">The customer says they paid by QR code / bank transfer${tp.fail && tp.fail.resit ? " and attached a receipt (under Customer files)" : ""}. Check your bank or e-wallet for ${esc(tp.harga || "")} with reference <b>${esc(by.rujukan || "")}</b> (the payment note should say ${esc(tp.kod)}). If it isn't there, contact the customer before processing.</span>`);
      if (by.cara === "shopee") L.push(`<span class="petunjuk ad-semak-stripe">Check Shopee order <b>${esc(by.shopee || "")}</b> in Shopee Seller Centre before processing.</span>`);
      if (by.cara === "online" && stripeAuto() && by.sesi) {
        L.push(b("semak-stripe", "Check Stripe"));
        L.push(`<span class="petunjuk ad-semak-stripe">${by.status === "semak"
          ? `The customer paid RM${esc(Number(by.dibayar_rm || 0).toFixed(2))} but the order total is ${esc(tp.harga || "")}. Check it on <a href="https://dashboard.stripe.com/payments/${esc(by.stripe || "")}" target="_blank" rel="noopener">Stripe</a>, then mark it as paid or refund the payment.`
          : "The customer has opened the Stripe payment page. The payment is confirmed automatically when they return to the site; press Check Stripe to check now."}</span>`);
      } else if (by.cara === "online" && stripeAuto()) L.push(`<span class="petunjuk ad-semak-stripe">The customer hasn't opened the Stripe payment page yet.</span>`);
      else if (by.cara === "online") L.push(`<span class="petunjuk ad-semak-stripe">Check <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener">Stripe → Payments</a> for a ${esc(tp.harga || "")} payment with client reference ID <b>${esc(tp.kod)}</b>${tp.emel ? ` (email ${esc(tp.emel)})` : ""}.</span>`);
    }
    if (by.status === "dibayar" && by.stripe) {
      L.push(`<span class="petunjuk ad-semak-stripe">Paid through Stripe${by.dibayar_rm ? " RM" + esc(Number(by.dibayar_rm).toFixed(2)) : ""}. <a href="https://dashboard.stripe.com/payments/${esc(by.stripe)}" target="_blank" rel="noopener">View on Stripe</a> (for receipts or refunds).</span>`);
    }
    L.push(b("padam", "Delete order", "teks bahaya"));
    $("#ad-tindakan").innerHTML = L.join("");
  }

  async function adminFail(tp) {
    const box = $("#ad-fail"), f = tp.fail || {}, b = tp.borang || {}, tok = ADM.tok, buka = tp;
    const L = [];
    const url = async (p) => { try { return await G.url(p); } catch (e) { return ""; } };
    if (f.resit) {
      const u = await url(f.resit), pdf = /\.pdf$/i.test(f.resit);
      L.push(`<p><b>Payment receipt:</b> ${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${pdf ? "Open receipt (PDF)" : "Open full size"}</a>` : "file missing"}</p>`);
      if (u && !pdf) L.push(`<div class="ad-gambar ad-resit"><figure><a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Payment receipt" loading="lazy"></a></figure></div>`);
    }
    if (temaById(tp.tema).pakej !== "flip") {
      if (b.muzik === "tiada") L.push(`<p><b>Song:</b> none</p>`);
      else {
        const u = f.lagu ? await url(f.lagu) : "";
        L.push(`<p><b>Song:</b> ${u ? `<a href="${esc(u)}" target="_blank" rel="noopener" download="lagu.mp3">lagu.mp3</a>` : "no file yet"}${b.muzikTajuk ? ` · requested: <i>${esc(b.muzikTajuk)}</i>` : ""}</p>`);
        if (u) L.push(`<audio controls preload="none" src="${esc(u)}"></audio>`);
      }
    }
    const g = (f.galeri || []).filter(Boolean), kap = (tp.config && tp.config.galeri) || [];
    if (g.length) {
      const us = await Promise.all(g.map(url));
      L.push(`<div class="ad-gambar">${us.map((u, i) => `<figure><a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Photo ${i + 1}" loading="lazy"></a><figcaption>${i + 1}. ${esc((kap[i] && kap[i].kapsyen) || "")}</figcaption></figure>`).join("")}</div>`);
    }
    if (f.duitnow) { const u = await url(f.duitnow); L.push(`<p><b>Money-gift DuitNow QR:</b></p><div class="ad-gambar"><figure><a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="DuitNow QR"></a></figure></div>`); }
    if (ADM.buka !== buka || tok !== ADM.tok) return;
    box.innerHTML = L.join("") || `<p class="redup">No files.</p>`;
  }

  function adminLangkah() {
    const tp = ADM.buka;
    if (!tp) return;
    const tm = temaAdmin(), nama = slugAdmin(), c = ADM.cfg || {};
    const pautan = $("#ad-pautan").value.trim() || `${SHOP.url || "https://<your-site-address>"}/k/${nama}/`;
    $("#ad-folder").textContent = `k/${nama}/`;
    const f = tp.fail || {}, fail = [`k/${nama}/index.html`];
    const rsvp = tm.pakej !== "flip";
    if (rsvp && c.muzik === "lagu.mp3") fail.push(f.lagu ? `k/${nama}/lagu.mp3` : `k/${nama}/lagu.mp3: MISSING. Upload the song above, or add it yourself (without it the music button is hidden)`);
    if (tm.pakej === "premium") {
      const g = Array.isArray(c.galeri) ? c.galeri.length : 0;
      if (g) fail.push(`k/${nama}/galeri/1.jpg to ${g}.jpg`);
      if (c.hadiah && c.hadiah.qr) fail.push(`k/${nama}/${c.hadiah.qr}`);
    }
    $("#ad-fail-senarai").innerHTML = fail.map((x) => `<li><code>${esc(x)}</code></li>`).join("");
    // two orders on one link would overwrite each other's card and share one RSVP list
    const sama = rsvp || tm.pakej === "flip" ? ADM.senarai.filter((x) => x.id !== tp.id && x.status !== "batal" && (x.kad_id || (x.config && x.config.kadId)) === nama) : [];
    $("#ad-slug-sama").hidden = !sama.length;
    if (sama.length) $("#ad-slug-sama").textContent = `The link name "${nama}" is also used by ${sama.map((x) => x.kod).join(", ")}. Change the link name (e.g. add -2) so the cards and their RSVPs don't mix.`;
    $("#ad-db").hidden = !rsvp;
    if (rsvp) {
      const pas = c.anak && c.pasangan ? `${c.anak.panggilan} & ${c.pasangan.panggilan}` : nama;
      const L = ["-- 1. Register the card. Copy the owner ID (QW-XXXX-XXXX) it returns: it is shown only once.",
        `select public.daftar_kad_baharu(${sqlTeks(nama)}, ${sqlTeks(pas)});`];
      if (tm.pakej === "premium") L.push("-- 2. Premium: allow 3,000 RSVPs and the guestbook", `update public.kad set pakej = 'premium' where kad_id = ${sqlTeks(nama)};`);
      $("#ad-sql").textContent = L.join("\n");
      $("#ad-supabase").hidden = !!(SHOP.supabaseUrl && SHOP.supabaseAnonKey);
    }
    const id = ($("#ad-idpemilik").value.trim() || "QW-XXXX-XXXX").toUpperCase();
    const M = mesejPemilik(c, pautan, id, rsvp, tm.pakej === "premium", tp);
    $("#ad-mesej-pemilik").value = M.join("\n");
    const wp = $("#ad-wa-pelanggan"); if (wp) wp.href = waPelanggan(tp);
    $("#ad-idpemilik-medan").hidden = !rsvp;
    const wa = $("#ad-wa-pemilik");
    wa.hidden = !tp.telefon;
    if (tp.telefon) wa.href = `https://wa.me/${normTel(tp.telefon)}?text=${encodeURIComponent(M.join("\n"))}`;
  }

  /* The message the admin sends the couple (WhatsApp or copy). The admin page is English; the message
     itself can go in English or Bahasa Melayu (Admin → order → Message to the customer → Language). */
  const bahasaMesej = () => (store.get("qawwam-ad-mesej-bahasa") === "ms" ? "ms" : "en");
  function waPelanggan(tp) {
    const teks = bahasaMesej() === "ms" ? `Assalamualaikum, ini qawwam tentang tempahan ${tp.kod} (${pasanganDari(tp)}).`
      : `Assalamualaikum, this is qawwam about your order ${tp.kod} (${pasanganDari(tp)}).`;
    return `https://wa.me/${normTel(tp.telefon)}?text=${encodeURIComponent(teks)}`;
  }
  function mesejPemilik(c, pautan, id, rsvp, premium, tp) {
    const pas = c.anak ? c.anak.panggilan + " & " + c.pasangan.panggilan : "";
    if (bahasaMesej() === "ms") {
      const M = [`Assalamualaikum ${pas}, kad anda sudah siap:`, pautan];
      if (rsvp) {
        M.push("", "Untuk lihat RSVP tetamu: log masuk di laman kami (Log masuk → papan pemuka → RSVP tetamu).");
        M.push("", `Atau buka kad anda → bahagian RSVP → taip ID pemilik ini di ruang Nama: ${id} → tekan Lihat rekod RSVP. Jangan kongsi ID ini dengan tetamu.`);
        if (premium) M.push("", "Dalam papan yang sama anda boleh muat turun senarai PDF, reka bentuk kad fizikal, serta pautan dan kod QR kad anda.");
      }
      if (tp && tp.profil && /^tetamu_/.test(tp.profil.nama_pengguna || "") && !tp.profil.emel) M.push("", "Tip: tetapkan kata laluan di laman kami supaya anda boleh menyemak tempahan dan RSVP bila-bila masa.");
      return M;
    }
    const M = [`Assalamualaikum ${pas}, your card is ready:`, pautan];
    if (rsvp) {
      M.push("", "To see your guests' RSVPs: sign in on our site (Sign in → dashboard → Guest RSVPs).");
      M.push("", `Or open your card → RSVP section → type this owner ID in the Name box: ${id} → press View RSVP records. Please don't share this ID with guests.`);
      if (premium) M.push("", "In the same panel you can download the PDF list, the printed-card design, and your card's link and QR code.");
    }
    if (tp && tp.profil && /^tetamu_/.test(tp.profil.nama_pengguna || "") && !tp.profil.emel) M.push("", "Tip: set a password on our site so you can check your order and RSVPs any time.");
    return M;
  }

  async function adminPratonton() {
    const tp = ADM.buka;
    if (!tp || !ADM.cfg) return;
    if (!ADM.skrin) ADM.skrin = new Skrin($("#ad-skrin"), 780, true);
    const tm = temaAdmin(), cfg = await cfgPratonton(ADM.cfg, tp.fail, tm.id);
    if (ADM.buka !== tp) return;
    paparKad(ADM.skrin, tm.id, { cfg });
  }

  function bacaConfig() {
    try { ADM.cfg = JSON.parse($("#ad-config").value); $("#ad-ralat").hidden = true; return true; }
    catch (e) { $("#ad-ralat").textContent = "The card data isn't valid JSON: " + e.message; $("#ad-ralat").hidden = false; return false; }
  }
  async function htmlKad() {
    const tm = temaAdmin();
    return kadAkhir(await ambilTpl(failTema(tm.id)), ADM.cfg, tm);
  }
  async function adminKemas(patch, mesej) {
    const tp = ADM.buka;
    mesejAdmin("Saving…");
    try {
      await G.simpan(tp.id, patch);
      await adminMuat(tp.id);
      mesejAdmin(mesej || "Saved.");
    } catch (e) { mesejAdmin("Couldn't save: " + sebab(e), true); }
  }

  /* ---- card prices ---- */
  function adminHarga() {
    const kumpulan = [["basic", "Basic"], ["premium", "Premium"], ["flip", "Flip Card"]];
    $("#ad-harga-senarai").innerHTML = kumpulan.map(([j, l]) => `<div class="ad-harga-kumpulan">
      <h3>${esc(l)} <span class="redup">· default ${esc([...new Set(TEMA.filter((tm) => tm.pakej === j).map((tm) => tm.hargaLalai || HARGA_LALAI[j]))].sort((a, b) => a - b).map(rm).join(" / "))} · on the site: ${esc(dalamEn(() => hargaJenis(j)))}</span></h3>
      <div class="ad-harga-grid">${TEMA.filter((tm) => tm.pakej === j).map((tm) => `<label class="ad-harga-baris">
        <span class="warna" style="--c1:${tm.warna[0]};--c2:${tm.warna[1]}" aria-hidden="true"></span>
        <span class="ad-harga-nama">${esc(tm.nama)}</span>
        <span class="ad-harga-input"><span aria-hidden="true">RM</span><input type="number" min="0.50" max="9999" step="0.10" inputmode="decimal" data-harga-tema="${tm.id}" data-jenis="${j}"
          value="${typeof HARGA[tm.id] === "number" ? HARGA[tm.id].toFixed(2) : ""}" placeholder="${(tm.hargaLalai || HARGA_LALAI[j]).toFixed(2)}" data-lalai="${tm.hargaLalai || HARGA_LALAI[j]}" aria-label="Price of ${esc(tm.nama)}"></span>
      </label>`).join("")}</div></div>`).join("");
    adminPautan();
    adminTng();
    // with Stripe Checkout on, the site makes the payment page itself: no links to keep
    $("#ad-pautan-kotak").hidden = !!SHOP.stripeCheckout;
    $("#ad-stripe-auto").hidden = !SHOP.stripeCheckout;
  }
  /* one Stripe Payment Link per price in use (prices of every card, plus any price that already has a link) */
  function adminPautan() {
    const guna = {};
    TEMA.forEach((tm) => { const h = hargaTema(tm.id).toFixed(2); (guna[h] = guna[h] || []).push(tm.nama); });
    Object.keys(PAUTAN).forEach((h) => { if (!guna[h]) guna[h] = []; });
    const harga = Object.keys(guna).sort((a, b) => Number(a) - Number(b));
    $("#ad-pautan-senarai").innerHTML = `<div class="ad-pautan-grid">${harga.map((h) => {
      const kad = guna[h], ada = !!PAUTAN[h];
      return `<label class="ad-pautan-baris">
        <span class="ad-pautan-harga">${esc(rm(h))}</span>
        <span class="ad-pautan-kad">${kad.length ? esc(kad.length > 4 ? `${kad.slice(0, 4).join(", ")} +${kad.length - 4}` : kad.join(", ")) : "no card at this price right now"}</span>
        <input type="url" inputmode="url" spellcheck="false" data-pautan-harga="${h}" value="${esc(PAUTAN[h] || "")}" placeholder="https://buy.stripe.com/…" aria-label="Stripe link for ${esc(rm(h))}">
        <span class="bayar-chip${ada ? " ok" : ""}">${ada ? "Link set" : "No link"}</span>
      </label>`;
    }).join("")}</div>`;
  }
  /* ---- QR code / bank transfer: the shop's payment QR and bank account, shown to customers who choose it ---- */
  let tngBaru;   // undefined = unchanged, "" = remove, data URL = new image
  const BANK = [["bank_nama", "#ad-bank-nama"], ["bank_pemegang", "#ad-bank-pemegang"], ["bank_akaun", "#ad-bank-akaun"]];
  function adminTng() {
    tngBaru = undefined;
    const img = $("#ad-tng-img"), ada = !!TETAPAN.qr_tng, bank = !!TETAPAN.bank_akaun;
    img.hidden = !ada; if (ada) img.src = TETAPAN.qr_tng; else img.removeAttribute("src");
    $("#ad-tng-kosong").hidden = ada;
    $("#ad-tng-nama").value = TETAPAN.qr_tng_nama || "";
    BANK.forEach(([k, el]) => { $(el).value = TETAPAN[k] || ""; });
    $("#ad-tng-buang").hidden = !ada;
    $("#ad-tng-status").textContent = ada || bank
      ? `Active: customers see "QR code / bank transfer" with ${ada && bank ? "your QR code and bank details" : ada ? "your QR code" : "your bank details"}.`
      : "Off: add a QR code or bank details to offer this payment option.";
    $("#ad-tng-status").className = "bayar-chip" + (ada || bank ? " ok" : "");
  }
  const keDataUrl = (blob) => new Promise((ok, gagal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => gagal(r.error); r.readAsDataURL(blob); });
  async function pilihQrTng(e) {
    const f = e.target.files && e.target.files[0], m = $("#ad-tng-mesej");
    e.target.value = "";
    if (!f) return;
    m.textContent = "Processing the image…";
    try {
      let url = await keDataUrl(await kecilkanGambar(f, { maks: 900, jenis: "image/png" }));
      if (url.length > 380000) url = await keDataUrl(await kecilkanGambar(f, { maks: 800, jenis: "image/jpeg", mutu: 0.9 }));
      if (url.length > 390000) throw new Error("the image is too large");
      tngBaru = url;
      $("#ad-tng-img").src = url; $("#ad-tng-img").hidden = false; $("#ad-tng-kosong").hidden = true;
      m.textContent = "Press Save to show it to customers.";
    } catch (ex) { m.textContent = "The image couldn't be read: " + sebab(ex); }
  }
  async function simpanTng(buang) {
    const m = $("#ad-tng-mesej"), nama = $("#ad-tng-nama").value.trim().slice(0, 80);
    const bank = BANK.map(([k, el]) => [k, $(el).value.trim().replace(/\s+/g, " ")]);
    const akaun = bank[2][1];
    if (!buang) {
      if (akaun && !/^[0-9][0-9 -]{4,28}[0-9]$/.test(akaun)) { m.textContent = "Check the account number: digits only (spaces or dashes are fine)."; $("#ad-bank-akaun").focus(); return; }
      if (akaun && (bank[0][1].length < 2 || !bank[1][1])) { m.textContent = "Add the bank name and the account holder's name too."; return; }
      if (!akaun && (bank[0][1] || bank[1][1])) { m.textContent = "Add the account number, or clear the bank fields."; $("#ad-bank-akaun").focus(); return; }
      if (!tngBaru && !TETAPAN.qr_tng && !akaun) { m.textContent = "Upload a QR code image or enter bank details first."; return; }
    }
    m.textContent = "Saving…";
    try {
      if (buang) { await G.simpanTetapan("qr_tng", null); await G.simpanTetapan("qr_tng_nama", null); }
      else {
        if (tngBaru) await G.simpanTetapan("qr_tng", tngBaru);
        await G.simpanTetapan("qr_tng_nama", nama || null);
        for (const [k, v] of bank) await G.simpanTetapan(k, v || null);
      }
      await muatHarga();
      adminTng();
      m.textContent = buang ? "QR code removed." + (TETAPAN.bank_akaun ? " Customers still see your bank details." : " The QR code / bank transfer option is now hidden.")
        : "Saved. Customers now see the QR code / bank transfer option.";
    } catch (ex) { m.textContent = "Couldn't save: " + sebab(ex); }
  }
  async function simpanPautanAdmin() {
    const ralat = $("#ad-pautan-ralat"), mesej = $("#ad-pautan-mesej"), rows = [], buang = [];
    ralat.hidden = true;
    for (const el of $$("[data-pautan-harga]")) {
      const url = el.value.trim(), h = Number(el.dataset.pautanHarga);
      if (!url) { if (PAUTAN[el.dataset.pautanHarga]) buang.push(h); continue; }
      if (!/^https:\/\/\S+$/.test(url) || url.length > 300) { ralat.textContent = `The link for ${rm(h)} must start with https://`; ralat.hidden = false; el.focus(); return; }
      rows.push({ harga: h, url });
    }
    const bukanStripe = rows.filter((r) => !/^https:\/\/(buy|checkout)\.stripe\.com\//.test(r.url));
    mesej.textContent = "Saving…";
    try {
      await G.simpanPautan(rows, buang);
      await muatHarga();
      adminPautan();
      mesej.textContent = "Links saved." + (bukanStripe.length ? ` Note: the link for ${bukanStripe.map((r) => rm(r.harga)).join(", ")} isn't a buy.stripe.com link; make sure it's right.` : "");
    } catch (e) { mesej.textContent = ""; ralat.textContent = "Couldn't save: " + sebab(e); ralat.hidden = false; }
  }
  async function simpanHargaAdmin() {
    const ralat = $("#ad-harga-ralat"), mesej = $("#ad-harga-mesej"), rows = [];
    ralat.hidden = true;
    for (const el of $$("[data-harga-tema]")) {
      const v = el.value.trim(), h = v ? Math.round(parseFloat(v) * 100) / 100 : (Number(el.dataset.lalai) || HARGA_LALAI[el.dataset.jenis]);
      if (!(h > 0 && h < 10000)) { ralat.textContent = "Check the price of " + temaById(el.dataset.hargaTema).nama + "."; ralat.hidden = false; el.focus(); return; }
      // every card gets a row, so new cards can be ordered too
      rows.push({ tema: el.dataset.hargaTema, jenis: el.dataset.jenis, harga: h });
    }
    mesej.textContent = "Saving…";
    try {
      await G.simpanHarga(rows);
      await muatHarga();
      adminHarga();
      mesej.textContent = "Prices saved. The site now shows the new prices.";
    } catch (e) { mesej.textContent = ""; ralat.textContent = "Couldn't save: " + sebab(e); ralat.hidden = false; }
  }

  function siapkanAdmin() {
    if (ADM.sedia) return;
    ADM.sedia = true;
    $$('input[name="ad-pandangan"]').forEach((r) => r.addEventListener("change", () => {
      const harga = r.value === "harga" && r.checked;
      $("#ad-harga-blok").hidden = !harga;
      $("#ad-senarai-blok").hidden = harga || !!ADM.buka;
      $("#ad-butiran").hidden = harga || !ADM.buka;
      if (harga) adminHarga();
    }));
    const kumpulan = [["flip", "Flip Card"], ["basic", "Basic"], ["premium", "Premium"]];
    $("#ad-tema").innerHTML = kumpulan.map(([j, l]) => `<optgroup label="${esc(l)}">${TEMA.filter((tm) => tm.pakej === j).map((tm) => `<option value="${tm.id}">${esc(tm.nama)}</option>`).join("")}</optgroup>`).join("");
    const on = (s, ev, fn) => { const el = $(s); if (el) el.addEventListener(ev, fn); };
    on("#ad-tapis", "click", (e) => { const b = e.target.closest("[data-ad-tapis]"); if (b) { ADM.tapis = b.dataset.adTapis; adminSenarai(); } });
    on("#ad-cari", "input", (e) => { ADM.cari = e.target.value; adminSenarai(); });
    on("#ad-senarai", "click", (e) => { const b = e.target.closest(".ad-item"); if (b) adminBuka(b.dataset.id); });
    on("#ad-kembali", "click", () => { adminTutup(); adminSenarai(); });
    on("#ad-muat", "click", () => adminMuat());
    on("#ad-keluar", "click", keluarAkaun);
    on("#ad-tindakan", "click", async (e) => {
      const b = e.target.closest("[data-ad]"), tp = ADM.buka;
      if (!b || !tp) return;
      const k = b.dataset.ad;
      if (k === "padam") {
        if (!b.dataset.pasti) { b.dataset.pasti = "1"; b.textContent = "Press again to delete this order"; setTimeout(() => { if (b.isConnected) { delete b.dataset.pasti; b.textContent = "Delete order"; } }, 4000); return; }
        mesejAdmin("Deleting…");
        try { await G.padam(tp); adminTutup(); await adminMuat(); mesejAdmin(""); } catch (ex) { mesejAdmin("Couldn't delete: " + sebab(ex), true); }
        return;
      }
      if (k === "semak-stripe") {
        mesejAdmin("Checking Stripe…");
        const st = await semakBayar(tp, true);
        await adminMuat(tp.id);
        mesejAdmin(st === "dibayar" ? "Payment received. Marked as paid." : st === "semak" ? "The customer paid, but a different amount. Check it on Stripe." : st ? "Not paid on Stripe yet." : "Couldn't check Stripe right now.", !st);
        return;
      }
      if (k === "dibayar") {
        await adminKemas({ bayaran: Object.assign({ cara: "online" }, tp.bayaran || {}, { status: "dibayar" }) }, "Marked as paid.");
        return;
      }
      const patch = { status: k };
      if (k === "siap") {
        const pautan = $("#ad-pautan").value.trim() || `${SHOP.url}/k/${slugAdmin()}/`;
        Object.assign(patch, { pautan, kad_id: temaAdmin().pakej === "flip" ? null : slugAdmin() });
      }
      await adminKemas(patch, { diproses: "The order is now in progress.", siap: "Marked as completed. The customer sees the card link in their dashboard.", batal: "Order cancelled.", dihantar: "Status: New." }[k]);
    });
    on("#ad-simpan", "click", () => {
      const tm = temaAdmin(), nama = slugAdmin();
      if (!bacaConfig()) return;
      const cfg = lengkapkan(ADM.cfg, tm, nama);
      const j = parseFloat($("#ad-jumlah").value);
      adminKemas({ jumlah: j >= 0 ? Math.round(j * 100) / 100 : null, pautan: $("#ad-pautan").value.trim() || null, nota_admin: $("#ad-nota").value.trim() || null,
        kad_id: tm.pakej === "flip" ? null : nama, tema: tm.id, pakej: pakejById(ADM.buka.pakej).jenis === tm.pakej ? ADM.buka.pakej : pakejUntuk(tm.pakej), config: cfg });
    });
    on("#ad-tema", "change", () => {
      $("#ad-jumlah").value = hargaTema(temaAdmin().id).toFixed(2);
      if (!bacaConfig()) return;
      ADM.cfg = lengkapkan(ADM.cfg, temaAdmin(), slugAdmin());
      $("#ad-config").value = JSON.stringify(ADM.cfg, null, 2);
      adminLangkah(); adminPratonton();
    });
    on("#ad-slug", "input", () => {
      // the link name is also the RSVP kadId and part of the Premium pautan
      if (bacaConfig()) { ADM.cfg = lengkapkan(ADM.cfg, temaAdmin(), slugAdmin()); $("#ad-config").value = JSON.stringify(ADM.cfg, null, 2); }
      adminLangkah();
    });
    on("#ad-pautan", "input", adminLangkah);
    on("#ad-idpemilik", "input", adminLangkah);
    on("#ad-pratonton", "click", () => { if (bacaConfig()) { adminLangkah(); adminPratonton(); } });
    on("#ad-simpan-config", "click", () => { if (bacaConfig()) adminKemas({ config: ADM.cfg }, "Card data saved."); });
    on("#ad-ubah-borang", "click", () => { if (ADM.buka) ubahTempahan(ADM.buka, true); });
    on("#ad-lagu-fail", "change", async (e) => {
      const f = e.target.files && e.target.files[0], tp = ADM.buka;
      e.target.value = "";
      if (!f || !tp) return;
      if (!(/^audio\/(mpeg|mp3)$/.test(f.type) || /\.mp3$/i.test(f.name)) || f.size > MAKS_LAGU) { mesejAdmin("The song must be an MP3 file of 10 MB or less.", true); return; }
      mesejAdmin("Uploading the song…");
      try {
        const laluan = await G.muatNaik(`${tp.pemilik}/${tp.id}/lagu.mp3`, f, "audio/mpeg");
        const cfg = Object.assign({}, ADM.cfg, { muzik: "lagu.mp3" });
        await adminKemas({ fail: Object.assign({}, tp.fail || {}, { lagu: laluan }), config: cfg }, "Song uploaded.");
      } catch (ex) { mesejAdmin("Couldn't upload: " + sebab(ex), true); }
    });
    on("#ad-zip", "click", async (e) => {
      const tp = ADM.buka, b = e.currentTarget;
      if (!tp || !bacaConfig()) return;
      b.disabled = true; mesejAdmin("Preparing the ZIP…");
      try {
        if (!window.JSZip) await muatSkrip(JSZIP);
        const nama = slugAdmin(), zip = new window.JSZip(), dir = zip.folder(`k/${nama}`), c = ADM.cfg, f = tp.fail || {};
        dir.file("index.html", await htmlKad());
        const kurang = [];
        if (temaAdmin().pakej !== "flip" && c.muzik === "lagu.mp3") { if (f.lagu) dir.file("lagu.mp3", await G.ambil(f.lagu)); else kurang.push("lagu.mp3"); }
        if (temaAdmin().pakej === "premium") {
          const g = (f.galeri || []).filter(Boolean);
          for (const x of (Array.isArray(c.galeri) ? c.galeri : [])) {
            const m = /^galeri\/(\d+)\.jpg$/.exec(x.src || ""), p = m && g[+m[1] - 1];
            if (p) dir.file(x.src, await G.ambil(p)); else if (m) kurang.push(x.src);
          }
          if (c.hadiah && c.hadiah.qr) { if (f.duitnow) dir.file(c.hadiah.qr, await G.ambil(f.duitnow)); else kurang.push(c.hadiah.qr); }
        }
        muatTurunBlob(await zip.generateAsync({ type: "blob" }), `${nama}.zip`);
        mesejAdmin(kurang.length ? `ZIP downloaded. Files still missing: ${kurang.join(", ")}.` : "ZIP downloaded.");
      } catch (ex) { mesejAdmin("The ZIP couldn't be prepared: " + sebab(ex) + ". Try Download index.html.", true); }
      finally { b.disabled = false; }
    });
    on("#ad-html", "click", async () => { if (ADM.buka && bacaConfig()) muatTurunBlob(new Blob([await htmlKad()], { type: "text/html" }), "index.html"); });
    on("#ad-salin-html", "click", async (e) => { const b = e.currentTarget; if (ADM.buka && bacaConfig()) salin(await htmlKad(), b); });
    on("#ad-salin-sql", "click", (e) => salin($("#ad-sql").textContent, e.currentTarget));
    on("#ad-harga-simpan", "click", simpanHargaAdmin);
    on("#ad-pautan-simpan", "click", simpanPautanAdmin);
    on("#ad-tng-fail", "change", pilihQrTng);
    on("#ad-tng-simpan", "click", () => simpanTng(false));
    on("#ad-tng-buang", "click", (e) => {
      const b = e.currentTarget;
      if (!b.dataset.pasti) { b.dataset.pasti = "1"; b.textContent = "Press again to remove"; setTimeout(() => { if (b.isConnected) { delete b.dataset.pasti; b.textContent = "Remove QR code"; } }, 4000); return; }
      delete b.dataset.pasti; b.textContent = "Remove QR code";
      simpanTng(true);
    });
    const mb = $("#ad-mesej-bahasa");
    if (mb) { mb.value = bahasaMesej(); mb.addEventListener("change", () => { store.set("qawwam-ad-mesej-bahasa", mb.value); adminLangkah(); }); }
    on("#ad-salin-pemilik", "click", (e) => salin($("#ad-mesej-pemilik").value, e.currentTarget, $("#ad-mesej-pemilik")));
  }

  // the admin sign-in form works before anyone is signed in
  function pasangAdmin() {
    const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
    on("#ad-bukan-keluar", "click", keluarAkaun);
    on("#ad-borang", "submit", async (e) => {
      e.preventDefault();
      const nama = $("#ad-nama").value.trim().toLowerCase(), kata = $("#ad-kata").value, ralat = $("#ad-masuk-ralat"), btn = $("#ad-masuk-btn");
      if (!nama || !kata) { ralat.textContent = "Enter your username and password."; ralat.hidden = false; return; }
      btn.disabled = true;
      try { AKAUN.user = await G.masuk(nama, kata); $("#ad-kata").value = ""; ralat.hidden = true; lepasAuth(); }
      catch (ex) { ralat.textContent = ex && ex.kod === "salah" ? "Wrong username or password." : ex && ex.kod === "terlalu" ? "Too many attempts. Wait a minute, then try again." : "Couldn't sign in: " + sebab(ex); ralat.hidden = false; }
      finally { btn.disabled = false; }
    });
  }


  /* ---------- 19b. SHOWCASE VIDEO: shown only when video/qawwam-showcase.mp4 is in the site folder ---------- */
  function pasangVideo() {
    const sek = $("#video-demo"), v = $("#video-demo video");
    if (!sek || !v || !v.dataset.src) return;
    v.addEventListener("loadedmetadata", () => { sek.hidden = false; }, { once: true });
    v.addEventListener("error", () => { sek.hidden = true; }, { once: true });
    v.src = v.dataset.src;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: 0.3 }).observe(v);
    }
  }

  /* ---------- 20. EVENTS + PUBLIC API ---------- */
  function emit(nama, detail) { document.dispatchEvent(new CustomEvent("qawwam:" + nama, { detail })); }
  const api = {
    SHOP, TEMA, PAKEJ, state, t, kumpul, semak, tunjukRalat, pilihTema, pilihPakej, bukaModal, terjemah, Skrin, paparKad, blokAktif, buatConfig, susun, ambilTpl, failTema,
    FAIL, akaun: AKAUN, kadAkhir, lengkapkan,
    get gudang() { return G; },
    get tab() { return tabKini; },
    fokus(el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true }); },
    keBorang() {
      if (tabKini !== "tempah") tukarTab("tempah", $("#bina-seksyen"));
      else { const s = $("#bina-seksyen"); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" }); }
      if (location.hash !== "#tempah") history.replaceState(null, "", "#tempah");
    }
  };
  window.qawwam = api;

  /* ---------- 21. START ---------- */
  function mula() {
    binaSlot();
    const ubah = store.get("qawwam-ubah");
    if (ubah && ubah.id && !ubah.admin) state.edit = ubah;
    terapDraf(store.get("qawwam-draf"));
    state.temaIkut[jenisKini()] = state.tema;
    state.tapisHarga = jenisKini();
    binaPilihan();
    binaGaleri("#galeri-flip", TEMA.filter((x) => x.pakej === "flip"), 0);
    binaTapis("#tapis-flip", "#galeri-flip", "flip");
    binaWarnaFlip();
    binaGaleri("#galeri-basic", TEMA.filter((x) => x.pakej === "basic"), 0);
    binaTapis("#tapis-basic", "#galeri-basic", "basic");
    const prem = TEMA.filter((x) => x.pakej === "premium");
    binaGaleri("#galeri-premium", prem, Math.max(0, SLOT_PREMIUM - prem.length));
    binaTapis("#tapis-premium", "#galeri-premium", "premium");
    binaKolaj();
    autoHijri();
    kemasHadiah();
    pasangVideo();
    if ($("#skrin-hero")) skrinHero = new Skrin($("#skrin-hero"), 780, true);
    if ($("#skrin-bina")) skrinBina = new Skrin($("#skrin-bina"), 780, true);
    if ($("#skrin-insta")) skrinInsta = new Skrin($("#skrin-insta"), 780, false);
    pasangModal();
    pasangBorang();
    pasangFail();
    pasangHantar();
    pasangInsta();
    pasangMinat();
    pasangAuth();
    pasangPapan();
    pasangAdmin();
    kemasTogol();
    kemasUbahUI();
    $$("[data-bahasa]").forEach((b) => b.addEventListener("click", () => setBahasa(b.dataset.bahasa, true)));
    document.addEventListener("click", (e) => {
      const kb = e.target.closest("[data-kembali]"); if (kb) store.set("qawwam-kembali", kb.dataset.kembali);
      const pk = e.target.closest("[data-pakej-pilih]"); if (pk) pilihPakej(pk.dataset.pakejPilih, false);
      const ke = e.target.closest("[data-ke]");
      if (ke) { const s = document.getElementById(ke.dataset.ke); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    const d = kumpul(); kunciSampul = [d.anakP, d.pasP, d.tarikh].join("|");
    binaPakej();
    setBahasa(lang);
    pilihTema(state.tema, true);
    window.addEventListener("hashchange", laluan);
    laluan();
    paparHero();
    mulaAkaun();
    emit("sedia", api);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mula); else mula();
})();
