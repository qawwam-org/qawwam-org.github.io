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
    whatsapp: "",                 // TUKAR: nombor WhatsApp kedai, kod negara + digit, cth "60123456789"
    harga: "RM4.90",              // harga paling rendah (Kad Flip), dipaparkan sebagai "dari RM4.90"
    siapDalam: { ms: "24 jam", en: "24 hours" },
    aktifSelama: { ms: "3 bulan selepas majlis", en: "3 months after the majlis" },
    bayarUrl: "",                 // pilihan: pautan bayaran ToyyibPay / DuitNow
    url: "https://qawwam-org.github.io",  // alamat laman. Lencana setiap kad dan pautan kad (k/<nama>/) guna alamat ini.
    // Supabase: SATU projek untuk akaun, tempahan, fail pelanggan DAN RSVP semua kad (Project Settings → API).
    // Selagi kosong, laman berjalan dalam "mod demo": akaun dan tempahan disimpan dalam pelayar sahaja.
    supabaseUrl: "",              // Project URL, cth "https://abcd1234.supabase.co"
    supabaseAnonKey: "",          // anon public key (memang boleh didedahkan)
    // Akaun nama pengguna log masuk ke Supabase sebagai <nama>@<akaunDomain>. Tiada e-mel dihantar ke alamat ini.
    // JANGAN tukar selepas pelanggan pertama mendaftar, kerana akaun lama tidak akan dapat log masuk.
    akaunDomain: "qawwam-org.github.io"
  };
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
    { id: "flip", jenis: "flip", harga: "RM4.90",
      nama: { ms: "Kad Flip", en: "Flip Card" },
      ringkas: { ms: "Sekeping kad, dua muka. Ringkas, macam kad yang dipegang di tangan.", en: "One card, two faces. Simple, like a card you hold in your hand." },
      ciri: {
        ms: ["4 pilihan warna: Gading, Zamrud, Mawar, Nila", "Depan: nama dan tarikh. Belakang: butiran majlis", "Tarikh Masihi dan Hijri", "Butang Google Maps", "Tajuk dan Bismillah ikut pilihan anda", "Pautan aktif 3 bulan selepas majlis"],
        en: ["4 colours: Ivory, Emerald, Rose, Indigo", "Front: names and date. Back: majlis details", "Gregorian and Hijri dates", "Google Maps button", "Your choice of heading and Bismillah", "Link live for 3 months after the majlis"] },
      tiada: { ms: "Tiada RSVP, aturcara, kiraan detik atau muzik.", en: "No RSVP, programme, countdown or music." } }
  ];
  const HARGA_INSTA = "RM29.90";

  /* ---------- 3. TEMPLATES ----------
     pakej: "flip" | "basic" | "premium". fail = file in tema/ (defaults to id). hero: shown as a swatch on Home.
     label = style filter: Basic islamik/melayu/klasik/moden/taman, Premium malam/senja/taman/klasik (see GAYA).
     kata = the card's one-line mood (shown in italics under its name); ms/en = the longer story.
     Adding a template: put the file in tema/ (same CONFIG markers), then add a line here. */
  const TEMA = [
    { id: "flip-gading", nama: "Flip Gading", fail: "flip", gaya: "gading", pakej: "flip", warna: ["#FBF7EE", "#BE9A48"], label: "flip",
      kata: { ms: "Lembut, macam kad yang disimpan dalam laci.", en: "Soft, like a card you'd keep in a drawer." },
      ms: "Kertas gading dengan kerawang emas yang halus. Kalau majlis anda kecil dan mesra, akad nikah di rumah atau kenduri keluarga, kad ini cukup untuk menjemput dengan sopan tanpa banyak hiasan.",
      en: "Ivory paper with fine gold filigree. If your day is small and close, a nikah at home or a family kenduri, this card invites people politely, without any fuss." },
    { id: "flip-zamrud", nama: "Flip Zamrud", fail: "flip", gaya: "zamrud", pakej: "flip", warna: ["#13402F", "#D4AF5C"], label: "flip",
      kata: { ms: "Hijau tua yang tak pernah lapuk.", en: "A deep green that never dates." },
      ms: "Hijau zamrud dan tulisan emas, warna yang kita kenal dari baju Melayu dan songket raya. Sekeping kad sahaja, tapi tetamu tetap rasa majlis ini dirancang dengan teliti.",
      en: "Emerald with gold lettering, the colour we know from baju Melayu and festive songket. Only one card, yet guests can still tell the day was planned with care." },
    { id: "flip-mawar", nama: "Flip Mawar", fail: "flip", gaya: "mawar", pakej: "flip", warna: ["#FAEFEB", "#BF7F6B"], label: "flip",
      kata: { ms: "Manis, untuk majlis tengah hari.", en: "Sweet, for a midday majlis." },
      ms: "Merah jambu mawar dengan emas mawar. Masa mereka kad ini, kami terbayang khemah putih di laman rumah, bau nasi minyak, dan sepupu-sepupu beratur untuk bergambar.",
      en: "Rose pink with rose gold. While designing it we kept picturing a white canopy in the front yard, the smell of nasi minyak, and cousins queuing for photos." },
    { id: "flip-nila", nama: "Flip Nila", fail: "flip", gaya: "nila", pakej: "flip", warna: ["#1C2B4A", "#D5B062"], label: "flip",
      kata: { ms: "Tenang, untuk majlis waktu malam.", en: "Calm, for an evening do." },
      ms: "Biru nila yang dalam dengan sentuhan emas. Sesuai untuk resepsi malam atau majlis di hotel, bila anda mahu kad yang nampak matang walaupun ringkas.",
      en: "Deep indigo with touches of gold. Right for an evening reception or a hotel dinner, when you want something grown-up even though it's simple." },

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
  const GAYA = { basic: ["islamik", "melayu", "klasik", "moden", "taman"], premium: ["malam", "senja", "taman", "klasik"] };

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
      "label.flip": "Kad Flip", "label.premium": "Premium", "tapis.semua": "Semua",
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
      "r.hargaNota": "Harga akhir kami sahkan sebelum anda bayar.",
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
      "au.isi": "Isi nama pengguna dan kata laluan.",
      "au.nama": "Nama pengguna mesti 3 hingga 24 aksara: huruf kecil, nombor, titik atau garis bawah.",
      "au.kata": "Kata laluan mesti sekurang-kurangnya 8 aksara.",
      "au.emel": "Semak alamat e-mel anda, atau biarkan kosong.",
      "au.diambil": "Nama pengguna ini sudah digunakan. Cuba yang lain.",
      "au.salah": "Nama pengguna atau kata laluan salah.",
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
      "pb.draf": "Semak butiran dan kad anda. Bila semuanya betul, sahkan tempahan dan kami mula menyiapkannya. Belum perlu bayar.",
      "pb.dihantar": "Terima kasih! Tempahan anda sudah kami terima. Kami akan hubungi anda di WhatsApp {tel} dengan harga akhir dan pautan bayaran.",
      "pb.diproses": "Kami sedang menyiapkan kad anda. Ia siap dalam {siap} selepas bayaran.",
      "pb.siap": "Kad anda sudah siap. Kongsikan pautan ini dengan keluarga dan sahabat.",
      "pb.batal": "Tempahan ini dibatalkan. Hubungi kami jika ada sebarang soalan.",
      "pb.bayar": "Bayar {harga}",
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
      "dl.hargaAnggar": "{harga} · harga akhir kami sahkan",
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
      "papan.kataOk": "Kata laluan ditukar."
    },
    en: {
      "nav.masuk": "Sign in", "nav.soalan": "FAQ", "tab.home": "Home", "tab.tempah": "Order", "tab.templat": "Templates",
      "paparan.mobile": "Mobile view", "paparan.desktop": "Desktop view",
      "hero.eyebrow": "Digital wedding cards · from {harga}",
      "hero.h1": "See <em>your names</em> on the card before you pay.",
      "hero.sub": "Pick a card that makes you smile, type both your names, and watch it become yours right there. When it feels like “yes, this is us”, send your order. You'll check it once more in your dashboard before confirming, and we'll get your link ready to share with everyone you love.",
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
      "q2": "How does RSVP work?", "j2": "Guests enter their name, whether they're coming, how many, and a short wish, then tap Send. Replies are saved online, not scattered across your WhatsApp. To see them, open your card and type the owner ID we give you into the Name box of the RSVP form: you get the totals, filters and an Excel download. An RSVP panel in your dashboard on this site is coming. Basic takes up to 300 replies and Premium up to 3,000. The Flip Card has no RSVP.",
      "q9": "What's the difference between the packages?", "j9": "The Flip Card is one card with two faces and no RSVP, good for an akad nikah or a small majlis. Basic is a complete card that reads top to bottom, with RSVP and music. Premium is a paged card that opens in its own way, with a gallery, guestbook, money gifts, an RSVP PDF and a printed-card design. Edit It Yourself and Custom are coming soon.",
      "q3": "How soon is my card ready?", "j3": "Flip, Basic and Premium are ready within {siap} after payment is confirmed. Before publishing, we check the spelling of every name and the Hijri date against the JAKIM takwim.",
      "q4": "Can I change details after submitting?", "j4": "While the order is still a draft, you can change anything from your dashboard. After you confirm, contact us for any changes. Premium includes 2 rounds of corrections after the card is published. For Flip and Basic, check the preview carefully, because what you see is what we publish.",
      "q5": "How long does the card link stay live?", "j5": "Flip and Basic: {aktif}. Premium: 6 months after the majlis.",
      "q10": "Why do I need to sign in?", "j10": "So your order, photos and song are saved to your own account, and you can check the order's status any time. Signing up only needs a username and password. Email is optional, and you can also just use your Google account.",
      "q6": "Can I add a song?", "j6": "Yes, from Basic upwards. Upload an MP3 right in the form, or type the song title or a link and we'll find it. Make sure you have the right to use it, such as royalty-free music or a track you've licensed. The Flip Card has no music.",
      "q11": "What is the printed-card design in Premium?", "j11": "From your owner panel you can download a 5×7 in printed card (print-ready PDF, 300 dpi) that matches your digital card, with a QR code to your card link. Nice for grandparents and relatives who like holding a card. Printing isn't included; just take the file to any print shop.",
      "q12": "Is my RSVP list private?", "j12": "Yes. Guests can only send a reply, never read the list. Your owner ID is stored encrypted and checked inside the database, not in the card's code, and repeated wrong tries get locked out. Just one request: don't share that ID with guests.",
      "q7": "How do I pay?", "j7": "FPX or DuitNow. After you confirm your order, we contact you on WhatsApp with a payment link. Nothing to pay before we've confirmed everything.",
      "q8": "What language is the card in?", "j8": "Bahasa Melayu, with Quranic verses and doa in Arabic script alongside their meaning.",
      "tp.eyebrow": "Order", "tp.h1": "Choose your package", "tp.sub": "Nothing to pay yet. Pick a package, fill in the details and submit. You can check the card again in your dashboard before confirming, and you only pay once we've been in touch.",
      "tempah.h2": "Fill in your card details",
      "tempah.sub": "The card beside the form is the real thing. Empty fields show a sample for now, so you can see where everything will sit.",
      "b.tema": "Choose a card", "b.pengantin": "Couple", "b.tarikh": "Date & time", "b.lokasi": "Venue", "b.aturcara": "Programme", "b.rsvp": "RSVP & contacts", "b.premium": "Premium extras", "b.hantar": "Review & send",
      "l.tajuk": "Card heading", "l.bismillah": "Show Bismillah at the top of the back",
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
      "h.rsvp": "Guests reply on the card itself and every reply is stored safely online. You can view the list from your own card with the owner ID we send you, and soon from your dashboard on this site too.",
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
      "hantar": "Submit order", "hantar.nota": "Your order goes to your dashboard as a draft. Check the card once more, then confirm it. Nothing to pay yet.",
      "pr.kad": "Card", "pr.sampul": "Cover", "pr.belakang": "Back", "pr.depan": "Front", "pr.lihat": "Preview my card", "pr.nota": "This is the real card. Go on, tap it.",
      "langkah.seterusnya": "Next", "langkah.kembali": "Back",
      "tl.eyebrow": "Collection", "tl.h1": "Our cards, and the stories behind them",
      "tl.sub": "We designed every card with a particular wedding in mind. Tap any of them and open it the way your guests will. If you typed your names on Home, those are the names you'll see.",
      "tl.flip": "Flip Card", "tl.flipP": "For when you just want one beautiful card, no fuss. Names on the front, details on the back. Four colours, one tap to turn it over.",
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
      "igk.1t": "Order and sign in", "igk.1p": "Your album and QR code are ready within {siap}.",
      "igk.2t": "Put the QR cards on the tables", "igk.2p": "Guests scan and start sharing on the day.",
      "igk.3t": "Keep the memories", "igk.3p": "Uploads stay open for 3 months from the majlis. The album can be viewed and downloaded for 12 months.",
      "igt.eyebrow": "Order InstaWedding", "igt.h2": "RM29.90 for one majlis",
      "igt.1": "A private album with its own link and QR code", "igt.2": "Photos, 30-second videos, wishes and reactions",
      "igt.3": "QR table card design, ready to print", "igt.4": "3 months of uploads, 12 months of album access",
      "igt.lNama": "Couple's names", "igt.lTarikh": "Majlis date", "igt.lTetamu": "Expected guests", "igt.hantar": "Order on WhatsApp",
      "masuk.petik": "From invitation to album of memories.",
      "masuk.h1": "Sign in to qawwam", "masuk.sub": "Check your orders, cards and RSVPs in one place.",
      "masuk.btn": "Continue with Google",
      "masuk.tanpa": "Continue without signing in",
      "akaun.keluar": "Sign out",
      "kaki.tag": "Digital wedding cards, designed in Malaysia.",
      "modal.seb": "Previous template", "modal.brk": "Next template", "modal.tutup": "Close",
      "label.islamik": "Islamic", "label.melayu": "Malay heritage", "label.klasik": "Classic", "label.moden": "Modern", "label.taman": "Garden & nature",
      "label.flip": "Flip Card", "label.premium": "Premium", "tapis.semua": "All",
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
      "r.hargaNota": "We confirm the final price before you pay.",
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
      "ubah.admin": "Admin mode: editing order {kod} for @{nama}.",
      "ubah.baharu": "Start a new order",
      "ubah.kembali": "Back to admin",
      "masuk.sorok": "Hide password",
      "au.isi": "Enter your username and password.",
      "au.nama": "Usernames are 3 to 24 characters: lowercase letters, numbers, dots or underscores.",
      "au.kata": "Passwords need at least 8 characters.",
      "au.emel": "Check your email address, or leave it empty.",
      "au.diambil": "That username is taken. Try another one.",
      "au.salah": "Wrong username or password.",
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
      "pb.draf": "Check your details and card. When everything looks right, confirm the order and we'll start on it. Nothing to pay yet.",
      "pb.dihantar": "Thank you! We've received your order and will contact you on WhatsApp {tel} with the final price and a payment link.",
      "pb.diproses": "We're working on your card. It's ready within {siap} of payment.",
      "pb.siap": "Your card is ready. Share this link with family and friends.",
      "pb.batal": "This order was cancelled. Get in touch if you have any questions.",
      "pb.bayar": "Pay {harga}",
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
      "dl.hargaAnggar": "{harga} · we confirm the final price",
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
      "j13": "Pick a package and a card on the Order tab, fill in the details, then press Submit order. You'll need to sign in with a username and password, or with Google, so the order is saved to your account. It lands in your dashboard as a draft. Check the details and the card once more, and when everything is right, press Confirm order. We'll contact you on WhatsApp about payment.",
      "q14": "Why is Basic RM8.90 to RM15.90?",
      "j14": "The final price depends on your card and order details. We review your order first, then the final price shows in your dashboard before you pay. No hidden charges after that.",
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
      "h.telefon": "We'll contact you on this number about the final price and payment.",
      "masuk.tunggu": "Sign in or create an account to submit your order. Everything you filled in is still here.",
      "masuk.tabMasuk": "Sign in",
      "masuk.tabDaftar": "Create account",
      "masuk.nama": "Username",
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
      "papan.akan": "Coming soon",
      "papan.hadir": "Attending",
      "papan.tetamu": "Guests",
      "papan.tidak": "Not attending",
      "papan.rsvpT": "The RSVP panel is under maintenance",
      "papan.rsvpP": "Soon you'll see your guests' replies right here. In the meantime every reply is still stored safely: open your card, go to RSVP, and type your owner ID into the Name box.",
      "papan.semua": "All orders",
      "papan.nota": "This is the card we'll publish. Tap to open it.",
      "papan.kataOk": "Password changed.",
      "papan.tetapan": "Change password",
      "papan.kataBaru": "New password",
      "papan.simpanKata": "Save password"
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
  let lang = store.get("qawwam-bahasa") === "en" ? "en" : "ms";
  const ASAL = new WeakMap();
  const VARS = () => ({ harga: SHOP.harga, siap: SHOP.siapDalam[lang], aktif: SHOP.aktifSelama[lang], nama: SHOP.nama });
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
  function setBahasa(l) {
    lang = l === "en" ? "en" : "ms";
    store.set("qawwam-bahasa", lang);
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
  const state = { tema: "zamrud", pakej: "basic", temaIkut: {}, tapisHarga: "basic", tapisGaya: "semua", edit: null };
  const nilai = (id) => { const el = $("#f-" + id); return el ? el.value.trim() : ""; };
  const cek = (id) => { const el = $("#f-" + id); return el ? el.checked : true; };
  const jenisKini = () => pakejById(state.pakej).jenis;

  function barisAcara() { return $$("#aturcara-senarai .baris").map((r) => [$(".ac-masa", r).value, $(".ac-acara", r).value.trim()]); }
  function barisHubungi() { return $$("#hubungi-senarai .baris").map((r) => ({ nama: $(".hb-nama", r).value.trim(), peranan: $(".hb-peranan", r).value.trim(), nombor: $(".hb-nombor", r).value.trim() })); }

  function kumpul() {
    const hb = $('input[name="hubungan"]:checked'), mz = $('input[name="muzik"]:checked');
    return {
      tema: state.tema, pakej: state.pakej, hubungan: hb ? hb.value : "puteri",
      anakP: nilai("anakP"), anakN: nilai("anakN"), pasP: nilai("pasP"), pasN: nilai("pasN"), tr1: nilai("tr1"), tr2: nilai("tr2"),
      tarikh: nilai("tarikh"), mula: nilai("mula"), tamat: nilai("tamat"), hijri: nilai("hijri"),
      hijriAuto: $("#f-hijri") ? $("#f-hijri").dataset.auto !== "0" : true,
      lokNama: nilai("lokNama"), lokAlamat: nilai("lokAlamat"), lokNota: nilai("lokNota"), gmaps: nilai("gmaps"), waze: nilai("waze"),
      aturcara: barisAcara(), rsvpAkhir: nilai("rsvpAkhir"), maksPax: nilai("maksPax"), hubungi: barisHubungi(),
      tajuk: nilai("tajuk"), bismillah: cek("bismillah"), muzik: mz ? mz.value : "sendiri", muzikTajuk: nilai("muzikTajuk"),
      aturcaraAda: cek("aturcaraAda"), galeriAda: cek("galeriAda"), galeriKap: kapsyenSlot(),
      hadiahAda: cek("hadiahAda"), bank: nilai("bank"), akaunNama: nilai("akaunNama"), akaun: nilai("akaun"), bukuTetamu: cek("bukuTetamu"),
      telefon: nilai("telefon"), nota: nilai("nota"), idea: nilai("idea")
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
    const set = (id, v) => { const el = $("#f-" + id); if (el && v != null) el.value = v; };
    ["anakP", "anakN", "pasP", "pasN", "tr1", "tr2", "tarikh", "mula", "tamat", "hijri", "lokNama", "lokAlamat", "lokNota", "gmaps", "waze",
      "rsvpAkhir", "maksPax", "tajuk", "muzikTajuk", "bank", "akaunNama", "akaun", "telefon", "nota", "idea"].forEach((k) => set(k, d[k] == null ? "" : d[k]));
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
  const jenama = (jenis) => { const p = pakejById(jenis === "flip" ? "flip" : "basic"); return { nama: SHOP.nama, url: SHOP.url || "/", harga: p.hargaDari || p.harga }; };
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
      c.gaya = tm.gaya || "gading";
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
    if (!telSah(d.telefon)) tambah(f("telefon"), t("err.telefon"));
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
    $("#r-tema").textContent = temaById(state.tema).nama;
    $("#r-pengantin").textContent = d.anakP && d.pasP ? `${d.anakP} & ${d.pasP}` : kosong;
    $("#r-tarikh").textContent = d.tarikh ? tarikhPenuh(d.tarikh) : kosong;
    $("#r-harga").textContent = p.harga;
    const n = $("#r-harga-nota"); if (n) n.hidden = !p.harga.includes("–");
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
        <span class="pakej-harga${p.harga.includes("–") ? " julat" : ""}">${esc(p.harga)}</span>
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
    const ey = $("#bina-eyebrow"); if (ey) ey.textContent = t("pakej.label", { nama: p.nama[lang], harga: p.harga });
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
      $$("[data-pilih]", el).forEach((b) => b.addEventListener("click", () => { pilihTema(tm.id); api.keBorang(); }));
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
      const teks = p ? `${p.nama[lang]} <span>${esc(p.harga)}</span>` : esc(t("tapis.semuaHarga"));
      return `<button type="button" class="tapis" data-tapis-harga="${j}" aria-pressed="${state.tapisHarga === j}">${p ? esc(p.nama[lang]) + " <span>" + esc(p.harga) + "</span>" : teks}</button>`;
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
      box.innerHTML = senarai.map((tm) => `<label class="tema-pil"><input type="radio" name="tema" value="${tm.id}"${tm.id === state.tema ? " checked" : ""}><span class="warna" style="--c1:${tm.warna[0]};--c2:${tm.warna[1]}"></span><span class="tp-teks"><span class="tp-nama">${esc(!semua && tm.pakej === "flip" ? tm.nama.replace(/^Flip /, "") : tm.nama)}</span>${semua ? `<span class="tp-harga">${esc(pakejById(pakejUntuk(tm.pakej)).harga)}</span>` : ""}</span></label>`).join("");
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
    paparModal();
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
  }
  function paparModal() {
    kemasModalTeks();
    if (skrinModal) paparKad(skrinModal, TEMA[modalIdx].id, { bunyi: true });
  }
  function kemasModalTeks() {
    if (!$("#modal")) return;
    const tm = TEMA[modalIdx];
    $("#modal-tajuk").textContent = tm.nama;
    const sama = modalDari === "borang" && tm.id === state.tema;
    $("#modal-pilih").textContent = t(sama ? "modal.kembali" : "modal.pilih");
    const h = $("#modal-harga"); if (h) h.textContent = pakejById(tm.pakej).harga;
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
    $("#modal-seb").addEventListener("click", () => { modalIdx = (modalIdx + TEMA.length - 1) % TEMA.length; paparModal(); });
    $("#modal-brk").addEventListener("click", () => { modalIdx = (modalIdx + 1) % TEMA.length; paparModal(); });
    $("#modal-pilih").addEventListener("click", () => {
      const id = TEMA[modalIdx].id, sama = modalDari === "borang" && id === state.tema;
      tutup();
      if (!sama) { pilihTema(id); api.keBorang(); }
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
    const perlu = !!(G && G.sebenar) && !AKAUN.user;
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
      if (AKAUN.user) L.push(`Akaun: @${AKAUN.user.nama_pengguna}${AKAUN.user.emel ? " · " + AKAUN.user.emel : ""}`);
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
    if (TAB.includes(h)) return tukarTab(h, null);
    const el = h && /^[\w-]+$/.test(h) ? document.getElementById(h) : null;
    const sec = el ? el.closest("[data-tab-isi]") : null;
    if (sec) return tukarTab(sec.dataset.tabIsi, el);
    if (!tabKini) tukarTab("home", null);
  }
  function tukarTab(id, sasaran) {
    const berubah = id !== tabKini;
    tabKini = id;
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
        if (e.target.name === "tema") pilihTema(e.target.value);
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
  const AKAUN = { user: null, siap: false };   // user = profile: { id, nama_pengguna, nama, emel, telefon, peranan }
  const ralatKod = (kod) => Object.assign(new Error(kod), { kod });
  const sebab = (e) => String((e && (e.message || e.error_description || e.msg)) || e || "").slice(0, 160);
  const emelAkaun = (nama) => `${nama}@${SHOP.akaunDomain}`;
  const ABJAD = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rawak = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ABJAD[b % ABJAD.length]).join("");
  const laluanFail = (f) => (f ? [f.lagu, f.duitnow].concat(f.galeri || []).filter(Boolean) : []);

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
      return data || { id: u.id, nama_pengguna: (u.email || "").split("@")[0], nama: "", emel: "", peranan: "pelanggan" };
    },
    async mula(ubah) {
      await this.sedia();
      const { data } = await this.sb.auth.getSession();
      this.sb.auth.onAuthStateChange((_ev, sesi) => {
        const u = sesi ? sesi.user : null;
        if ((u ? u.id : null) === (AKAUN.user ? AKAUN.user.id : null)) return;
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
    async keluar() { await this.sb.auth.signOut(); },
    async tukarKata(baru) { const { error } = await this.sb.auth.updateUser({ password: baru }); if (error) throw error; },
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
      const q = id ? this.sb.from("tempahan").update(row).eq("id", id) : this.sb.from("tempahan").insert(row);
      const { data, error } = await q.select().single();
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
      const h = await this.cincang(kata), u = this.p().find((x) => x.nama_pengguna === nama && x.kata === h);
      if (!u) throw ralatKod("salah");
      store.set(this.K_S, { id: u.id });
      return this.awam(u);
    },
    async google() { throw ralatKod("belum"); },
    async keluar() { store.set(this.K_S, null); },
    async tukarKata(baru) { const s = this.p(), u = s.find((x) => AKAUN.user && x.id === AKAUN.user.id); if (!u) throw ralatKod("gagal"); u.kata = await this.cincang(baru); store.set(this.K_P, s); },
    async satu(id) { const r = this.tp().find((x) => x.id === id); return r && (r.pemilik === AKAUN.user.id || this.admin()) ? r : null; },
    async senaraiSaya() { return this.tp().filter((x) => x.pemilik === AKAUN.user.id).sort((a, b) => (a.dicipta < b.dicipta ? 1 : -1)); },
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
        if (!admin && s.filter((x) => x.pemilik === AKAUN.user.id && x.status === "draf").length >= 10) throw new Error("Terlalu banyak draf. Padam draf lama dahulu.");
        let kod; do { kod = "QW-" + rawak(6); } while (s.some((x) => x.kod === kod));
        r = Object.assign({ borang: {}, config: null, fail: {}, telefon: "", harga: null, pautan: null, kad_id: null, nota_admin: null, dihantar: null }, row,
          { id: crypto.randomUUID ? crypto.randomUUID() : "t" + rawak(20), kod, pemilik: AKAUN.user.id, dicipta: kini, dikemaskini: kini });
        if (!admin) Object.assign(r, { status: "draf", harga: null, pautan: null, kad_id: null, nota_admin: null });
        if (!r.status) r.status = "draf";
        s.push(r);
      } else {
        r = s.find((x) => x.id === id);
        if (!r || (!admin && (r.pemilik !== AKAUN.user.id || r.status !== "draf"))) throw ralatKod("terkunci");
        const ubah = Object.assign({}, row);
        ["id", "kod", "pemilik", "dicipta"].forEach((k) => delete ubah[k]);
        if (!admin) {
          ["harga", "pautan", "kad_id", "nota_admin"].forEach((k) => delete ubah[k]);
          if (ubah.status && !["draf", "dihantar"].includes(ubah.status)) throw ralatKod("terkunci");
        }
        if (ubah.status === "dihantar" && r.status === "draf") ubah.dihantar = kini;
        if (ubah.status === "draf") ubah.dihantar = null;
        Object.assign(r, ubah, { dikemaskini: kini });
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
        if (!b) throw new Error("Fail tiada: " + laluan);
        this.urlCache.set(laluan, URL.createObjectURL(b));
      }
      return this.urlCache.get(laluan);
    },
    async ambil(laluan) { const b = await IDB.get("demo", laluan); if (!b) throw new Error("Fail tiada: " + laluan); return b; },
    async buangFail(senarai) { for (const l of senarai) { await IDB.set("demo", l, null); this.urlCache.delete(l); } }
  };
  let G = null;

  /* =====================================================================
     C. SIGN-IN (username + password, optional email, or Google)
     ===================================================================== */
  const namaPaparan = () => (AKAUN.user ? AKAUN.user.nama_pengguna || AKAUN.user.nama || "" : "");
  function kemasAkaunUI() {
    const masuk = !!AKAUN.user, nama = namaPaparan(), awal = (nama || "?").trim().charAt(0).toUpperCase();
    $$("[data-akaun-btn]").forEach((b) => {
      const av = $(".avatar", b), tk = $(".akaun-teks", b);
      if (av) { av.hidden = !masuk; av.textContent = awal; }
      if (tk) tk.textContent = masuk ? nama : t("masuk.nav");
      b.setAttribute("aria-label", masuk ? t("akaun.nav") : t("masuk.nav"));
    });
    if ($("#masuk-keluar")) {
      $("#masuk-keluar").hidden = masuk;
      $("#masuk-dalam").hidden = !masuk;
      $("#masuk-demo").hidden = !G || G.sebenar;
      $("#masuk-tunggu").hidden = !store.get("qawwam-tunggu");
      if (masuk) {
        $("#akaun-avatar").textContent = awal;
        $("#akaun-salam").textContent = t("akaun.salam", { nama });
        const u = AKAUN.user;
        $("#akaun-emel").textContent = ["@" + u.nama_pengguna, u.emel].filter(Boolean).join(" · ");
      }
    }
  }
  function lepasAuth() {
    kemasAkaunUI(); kemasInstaUI(); kemasUbahUI();
    if (tabKini === "masuk" && AKAUN.user) muatPapan();
    if (tabKini === "admin") kemasAdmin();
  }
  // after signing in: finish the order that was waiting, if any
  function selepasMasuk() {
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
    try { AKAUN.user = await G.mula(() => { lepasAuth(); selepasMasuk(); }); }
    catch (e) { AKAUN.user = null; }
    AKAUN.siap = true;
    lepasAuth();
    const kembali = store.get("qawwam-kembali");
    if (AKAUN.user && kembali && !store.get("qawwam-tunggu")) { store.set("qawwam-kembali", null); location.hash = kembali; }
    else if (location.hash.includes("access_token")) { history.replaceState(null, "", location.pathname + location.search + "#masuk"); laluan(); }
    selepasMasuk();
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
      try {
        AKAUN.user = daftar ? await G.daftar(nama, kata, emel) : await G.masuk(nama, kata);
        $("#au-kata").value = "";
        lepasAuth();
        selepasMasuk();
      } catch (err) {
        if (err && err.kod) salah("au." + err.kod); else salah("au.gagal", sebab(err));
      } finally { btn.disabled = false; btn.removeAttribute("aria-busy"); }
    });
  }
  async function masukGoogle() {
    const notis = $("#masuk-notis");
    const papar = (k, tambah) => { if (notis) { notis.textContent = t(k) + (tambah ? " " + tambah : ""); notis.hidden = false; } };
    if (!G || !G.sebenar) return papar("masuk.belum");
    try { await G.google(); } catch (e) { papar("masuk.gagal", sebab(e)); }
  }
  async function keluarAkaun() {
    try { if (G) await G.keluar(); } catch (e) { /* signed out locally anyway */ }
    AKAUN.user = null;
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
        $("#ubah-teks").textContent = e.admin ? t("ubah.admin", { kod: e.kod, nama: e.nama || "?" }) : t("ubah.teks", { kod: e.kod });
        $("#ubah-baharu").textContent = t(e.admin ? "ubah.kembali" : "ubah.baharu");
        jalur.classList.toggle("admin", !!e.admin);
      }
    }
    const teks = $("#hantar-teks");
    if (teks) teks.textContent = t(!e ? "hantar" : e.admin ? "hantar.admin" : "hantar.simpan");
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
    if (!AKAUN.user) {
      store.set("qawwam-tunggu", 1);
      store.set("qawwam-draf", d);
      location.hash = "#masuk";
      return;
    }
    const btn = $("#hantar");
    sedangHantar = true;
    if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); }
    statusHantar(t("hantar.sedang"));
    try {
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
      const row = { pakej: d.pakej, tema: d.tema, borang: borangUntukSimpan(d), telefon: normTel(d.telefon), config: configAkhir(d, lama && lama.kad_id) };
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
  }

  // load an order into the form (customer: their own draft; admin: any order)
  async function ubahTempahan(tp, admin) {
    if (admin) state.edit = { id: tp.id, kod: tp.kod, admin: true, nama: tp.profil ? tp.profil.nama_pengguna : "" };
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
  const papan = { senarai: [], buka: null, skrin: null, tok: 0 };
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
    try { const s = await G.senaraiSaya(); if (tok !== papan.tok) return; papan.senarai = s; }
    catch (e) { box.innerHTML = `<p class="ralat">${esc(t("papan.ralat", { sebab: sebab(e) }))}</p>`; return; }
    paparSenaraiPapan();
    const id = bukaId || (papan.buka && papan.buka.id);
    if (id && papan.senarai.some((x) => x.id === id)) bukaTempahan(id); else tutupTempahan();
  }
  function paparSenaraiPapan() {
    const box = $("#papan-senarai");
    if (!box) return;
    if (!papan.senarai.length) { box.innerHTML = `<div class="papan-kosong"><p>${esc(t("papan.kosong"))}</p><a class="btn utama kecil" href="#tempah">${esc(t("papan.baharu"))}</a></div>`; return; }
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

  function barisDl(label, nilai, html) { return nilai ? `<div><dt>${esc(label)}</dt><dd>${html ? nilai : esc(nilai)}</dd></div>` : ""; }
  // the order's details, read from the saved form (shared by the dashboard and the admin page)
  function dlTempahan(tp, admin) {
    const b = tp.borang || {}, c = tp.config || {}, tm = temaById(tp.tema), p = pakejById(tp.pakej), jenis = tm.pakej;
    const L = [];
    const harga = tp.harga ? tp.harga : (p.harga.includes("–") && !admin ? t("dl.hargaAnggar", { harga: p.harga }) : p.harga);
    L.push(barisDl(t("dl.pakej"), `${p.nama[lang]} · ${harga}`));
    L.push(barisDl(t("dl.kad"), tm.nama));
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
    L.push(barisDl(t("dl.telefon"), tp.telefon ? telPapar(tp.telefon) : ""));
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
    if (!papan.skrin) papan.skrin = new Skrin($("#pb-skrin"), 780, true);
    window.scrollTo(0, 0);
    const cfg = await cfgPratonton(tp.config, tp.fail, tp.tema);
    if (papan.buka !== tp) return;
    paparKad(papan.skrin, tp.tema, { cfg });
  }
  function paparTindakanPapan(tp) {
    const box = $("#pb-tindakan"), st = tp.status;
    const bayar = SHOP.bayarUrl && st === "diproses" && tp.harga ? `<a class="btn utama" href="${esc(SHOP.bayarUrl)}" target="_blank" rel="noopener">${esc(t("pb.bayar", { harga: tp.harga }))}</a>` : "";
    const wa = SHOP.whatsapp ? `<a class="btn garis" href="${esc(waPautan(t("pb.waTeks", { kod: tp.kod })))}" target="_blank" rel="noopener"><svg class="ikon" aria-hidden="true"><use href="#i-wa"/></svg>${esc(t("pb.wa"))}</a>` : "";
    let teks = "", butang = "";
    if (st === "draf") {
      teks = t("pb.draf");
      butang = `<button class="btn utama" type="button" data-pb="sahkan">${esc(t("pb.sahkan"))}</button>
        <button class="btn garis" type="button" data-pb="ubah">${esc(t("pb.ubah"))}</button>
        <button class="btn teks bahaya" type="button" data-pb="padam">${esc(t("pb.padam"))}</button>`;
    } else if (st === "dihantar") { teks = t("pb.dihantar", { tel: telPapar(tp.telefon || "") }); butang = wa; }
    else if (st === "diproses") { teks = t("pb.diproses"); butang = bayar + wa; }
    else if (st === "siap") {
      teks = t("pb.siap");
      butang = tp.pautan ? `<a class="btn utama" href="${esc(tp.pautan)}" target="_blank" rel="noopener">${esc(t("pb.buka"))}</a><button class="btn garis" type="button" data-pb="salin">${esc(t("pb.salin"))}</button>` : "";
    } else { teks = t("pb.batal"); butang = wa; }
    box.innerHTML = `<p>${esc(teks)}</p>${st === "siap" && tp.pautan ? `<p class="pautan-kad">${esc(tp.pautan)}</p>` : ""}<div class="pb-butang">${butang}</div><p class="pb-mesej" role="status" hidden></p>`;
  }
  function pasangPapan() {
    const on = (s, fn) => { const el = $(s); if (el) el.addEventListener("click", fn); };
    on("#papan-senarai", (e) => { const b = e.target.closest(".t-item"); if (b) bukaTempahan(b.dataset.id); });
    on("#pb-kembali", () => { tutupTempahan(); window.scrollTo(0, 0); });
    on("#papan-muat", () => muatPapan());
    on("#btn-keluar", keluarAkaun);
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
    on("#pb-tindakan", async (e) => {
      const b = e.target.closest("[data-pb]"), tp = papan.buka;
      if (!b || !tp) return;
      const mesej = $(".pb-mesej", $("#pb-tindakan"));
      const papar = (s, gagal) => { mesej.textContent = s; mesej.hidden = !s; mesej.classList.toggle("gagal", !!gagal); };
      const k = b.dataset.pb;
      if (k === "salin") return salin(tp.pautan, b);
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
          await G.simpan(tp.id, { status: "dihantar" });
          if (state.edit && state.edit.id === tp.id) tamatUbah();
          await muatPapan(tp.id);
          const m = $(".pb-mesej", $("#pb-tindakan")); if (m) { m.textContent = t("pb.disahkan"); m.hidden = false; }
        } else if (k === "padam") {
          await G.padam(tp);
          if (state.edit && state.edit.id === tp.id) tamatUbah();
          tutupTempahan();
          await muatPapan();
        }
      } catch (ex) {
        papar(t("pb.gagal", { sebab: sebab(ex) }), true);
        $$("[data-pb]", $("#pb-tindakan")).forEach((x) => { x.disabled = false; });
      }
    });
  }

  /* =====================================================================
     F. ADMIN: every order, its status, its content, and the finished card to download
     Only accounts with profil.peranan = 'admin' get here (checked by the database, not just this page).
     ===================================================================== */
  const JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  const ADM = { senarai: [], tapis: "aktif", cari: "", buka: null, cfg: null, skrin: null, tok: 0, sedia: false };
  const ST_ADMIN = { draf: "Draf pelanggan", dihantar: "Baharu", diproses: "Diproses", siap: "Siap", batal: "Batal" };
  const TAPIS_ADMIN = [["aktif", "Perlu tindakan", ["dihantar", "diproses"]], ["dihantar", "Baharu", ["dihantar"]], ["diproses", "Diproses", ["diproses"]],
    ["siap", "Siap", ["siap"]], ["draf", "Draf pelanggan", ["draf"]], ["batal", "Batal", ["batal"]], ["semua", "Semua", null]];
  const chipAdmin = (st) => `<span class="status st-${esc(st)}">${esc(ST_ADMIN[st] || st)}</span>`;
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
      c.gaya = tm.gaya || "gading";
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
    if (u && !admin) $("#ad-bukan-nama").textContent = "@" + u.nama_pengguna;
    $("#ad-demo-pintu").hidden = !G || G.sebenar;
    $("#ad-demo").hidden = !G || G.sebenar;
    if (!admin) return;
    $("#ad-siapa").textContent = "@" + u.nama_pengguna;
    siapkanAdmin();
    adminMuat();
  }

  async function adminMuat(bukaId) {
    const box = $("#ad-senarai"), tok = ++ADM.tok;
    if (!ADM.senarai.length) box.innerHTML = `<p class="redup">Memuatkan…</p>`;
    try { const s = await G.senaraiSemua(); if (tok !== ADM.tok) return; ADM.senarai = s; }
    catch (e) { box.innerHTML = `<p class="ralat">Tempahan tidak dapat dimuatkan. ${esc(sebab(e))}</p>`; return; }
    adminSenarai();
    const id = bukaId || (ADM.buka && ADM.buka.id);
    if (id && ADM.senarai.some((x) => x.id === id)) adminBuka(id); else adminTutup();
  }

  function adminSenarai() {
    const q = ADM.cari.trim().toLowerCase();
    const cocok = (tp) => !q || [tp.kod, pasanganDari(tp), tp.telefon, tp.profil && tp.profil.nama_pengguna, tp.profil && tp.profil.emel, tp.kad_id]
      .some((v) => v && String(v).toLowerCase().includes(q));
    $("#ad-tapis").innerHTML = TAPIS_ADMIN.map(([k, l, st]) => {
      const n = ADM.senarai.filter((tp) => !st || st.includes(tp.status)).length;
      return `<button type="button" class="tapis" data-ad-tapis="${k}" aria-pressed="${ADM.tapis === k}">${esc(l)} <span>${n}</span></button>`;
    }).join("");
    const st = TAPIS_ADMIN.find((x) => x[0] === ADM.tapis)[2];
    const senarai = ADM.senarai.filter((tp) => (!st || st.includes(tp.status)) && cocok(tp));
    const box = $("#ad-senarai");
    if (!senarai.length) { box.innerHTML = `<p class="ad-kosong">${ADM.senarai.length ? "Tiada tempahan yang sepadan." : "Belum ada tempahan."}</p>`; return; }
    box.innerHTML = senarai.map((tp) => {
      const tm = temaById(tp.tema), p = pakejById(tp.pakej), pr = tp.profil || {};
      return `<button type="button" class="ad-item" data-id="${esc(tp.id)}">
        <span class="ad-i-status">${chipAdmin(tp.status)}</span>
        <span class="ad-i-utama"><b>${esc(pasanganDari(tp))}</b><span>${esc(tp.kod)} · ${esc(p.nama.ms)} · ${esc(tm.nama)}</span></span>
        <span class="ad-i-majlis">${esc(tarikhTempahan(tp) || "-")}</span>
        <span class="ad-i-pelanggan">@${esc(pr.nama_pengguna || "?")}${tp.telefon ? "<br>" + esc(telPapar(tp.telefon)) : ""}</span>
        <span class="ad-i-masa">${esc(tp.harga || "")}${tp.harga ? "<br>" : ""}${esc(masaLalu(tp.dikemaskini))}</span>
      </button>`;
    }).join("");
  }

  function adminTutup() {
    ADM.buka = null; ADM.cfg = null;
    $("#ad-butiran").hidden = true;
    $("#ad-senarai-blok").hidden = false;
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
    $("#ad-senarai-blok").hidden = true;
    $("#ad-butiran").hidden = false;
    if (baru) { mesejAdmin(""); window.scrollTo(0, 0); }
    const pr = tp.profil || {}, p = pakejById(tp.pakej);
    const wa = tp.telefon ? `<a class="btn wa kecil" href="https://wa.me/${esc(normTel(tp.telefon))}?text=${encodeURIComponent(`Assalamualaikum, ini qawwam tentang tempahan ${tp.kod} (${pasanganDari(tp)}).`)}" target="_blank" rel="noopener"><svg class="ikon" aria-hidden="true"><use href="#i-wa"/></svg>${esc(telPapar(tp.telefon))}</a>` : "";
    $("#ad-b-kepala").innerHTML = `<div><p class="eyebrow">${esc(tp.kod)} · ${esc(p.nama.ms)} ${esc(tp.harga || p.harga)}</p><h2>${esc(pasanganDari(tp))}</h2>
      <p class="redup">@${esc(pr.nama_pengguna || "?")}${pr.emel ? " · " + esc(pr.emel) : ""} · dicipta ${esc(masaLalu(tp.dicipta))}${tp.dihantar ? " · disahkan " + esc(masaLalu(tp.dihantar)) : ""}</p></div>
      <div class="ad-b-kanan">${chipAdmin(tp.status)}${wa}</div>`;
    adminTindakan(tp);
    $("#ad-dl").innerHTML = dlTempahan(tp, true);
    $("#ad-harga").value = tp.harga || "";
    $("#ad-tema").value = tp.tema;
    $("#ad-slug").value = tp.kad_id || (tp.config && tp.config.kadId) || namaKad(tp.config || { anak: { panggilan: "kad" }, pasangan: { panggilan: "" } });
    $("#ad-pautan").value = tp.pautan || "";
    $("#ad-nota").value = tp.nota_admin || "";
    ADM.cfg = lengkapkan(tp.config || {}, temaById(tp.tema), slugAdmin());
    $("#ad-config").value = JSON.stringify(ADM.cfg, null, 2);
    $("#ad-ralat").hidden = true;
    const tarikh = (tp.borang && tp.borang.tarikh) || (ADM.cfg.mula || "").slice(0, 10);
    $("#ad-hijri").textContent = `pelanggan: ${ADM.cfg.hijri || "(kosong)"} · Umm al-Qura: ${hijriDari(tarikh) || "-"}`;
    if (baru) $("#ad-idpemilik").value = "";
    adminFail(tp);
    adminLangkah();
    adminPratonton();
  }

  function adminTindakan(tp) {
    const b = (k, l, kelas) => `<button class="btn ${kelas || "garis"} kecil" type="button" data-ad="${k}">${l}</button>`;
    const st = tp.status, L = [];
    if (st === "draf") L.push(`<span class="petunjuk">Pelanggan belum mengesahkan tempahan ini.</span>`, b("dihantar", "Sahkan bagi pihak pelanggan"));
    if (st === "dihantar") L.push(b("diproses", "Proses tempahan", "utama"), b("batal", "Batalkan"));
    if (st === "diproses") L.push(b("siap", "Tandakan siap", "utama"), b("dihantar", "Kembali ke Baharu"), b("batal", "Batalkan"));
    if (st === "siap") { if (tp.pautan) L.push(`<a class="btn utama kecil" href="${esc(tp.pautan)}" target="_blank" rel="noopener">Buka kad</a>`); L.push(b("diproses", "Kembali ke Diproses")); }
    if (st === "batal") L.push(b("dihantar", "Pulihkan tempahan"));
    L.push(b("padam", "Padam", "teks bahaya"));
    $("#ad-tindakan").innerHTML = L.join("");
  }

  async function adminFail(tp) {
    const box = $("#ad-fail"), f = tp.fail || {}, b = tp.borang || {}, tok = ADM.tok, buka = tp;
    const L = [];
    const url = async (p) => { try { return await G.url(p); } catch (e) { return ""; } };
    if (temaById(tp.tema).pakej !== "flip") {
      if (b.muzik === "tiada") L.push(`<p><b>Lagu:</b> tiada</p>`);
      else {
        const u = f.lagu ? await url(f.lagu) : "";
        L.push(`<p><b>Lagu:</b> ${u ? `<a href="${esc(u)}" target="_blank" rel="noopener" download="lagu.mp3">lagu.mp3</a>` : "belum ada fail"}${b.muzikTajuk ? ` · diminta: <i>${esc(b.muzikTajuk)}</i>` : ""}</p>`);
        if (u) L.push(`<audio controls preload="none" src="${esc(u)}"></audio>`);
      }
    }
    const g = (f.galeri || []).filter(Boolean), kap = (tp.config && tp.config.galeri) || [];
    if (g.length) {
      const us = await Promise.all(g.map(url));
      L.push(`<div class="ad-gambar">${us.map((u, i) => `<figure><a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Gambar ${i + 1}" loading="lazy"></a><figcaption>${i + 1}. ${esc((kap[i] && kap[i].kapsyen) || "")}</figcaption></figure>`).join("")}</div>`);
    }
    if (f.duitnow) { const u = await url(f.duitnow); L.push(`<p><b>QR DuitNow:</b></p><div class="ad-gambar"><figure><a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="QR DuitNow"></a></figure></div>`); }
    if (ADM.buka !== buka || tok !== ADM.tok) return;
    box.innerHTML = L.join("") || `<p class="redup">Tiada fail.</p>`;
  }

  function adminLangkah() {
    const tp = ADM.buka;
    if (!tp) return;
    const tm = temaAdmin(), nama = slugAdmin(), c = ADM.cfg || {};
    const pautan = $("#ad-pautan").value.trim() || `${SHOP.url || "https://<alamat-laman-anda>"}/k/${nama}/`;
    $("#ad-folder").textContent = `k/${nama}/`;
    const f = tp.fail || {}, fail = [`k/${nama}/index.html`];
    const rsvp = tm.pakej !== "flip";
    if (rsvp && c.muzik === "lagu.mp3") fail.push(f.lagu ? `k/${nama}/lagu.mp3` : `k/${nama}/lagu.mp3: BELUM ADA. Muat naik lagu di atas, atau letak sendiri (tanpanya butang muzik tersembunyi)`);
    if (tm.pakej === "premium") {
      const g = Array.isArray(c.galeri) ? c.galeri.length : 0;
      if (g) fail.push(`k/${nama}/galeri/1.jpg hingga ${g}.jpg`);
      if (c.hadiah && c.hadiah.qr) fail.push(`k/${nama}/${c.hadiah.qr}`);
    }
    $("#ad-fail-senarai").innerHTML = fail.map((x) => `<li><code>${esc(x)}</code></li>`).join("");
    // two orders on one link would overwrite each other's card and share one RSVP list
    const sama = rsvp || tm.pakej === "flip" ? ADM.senarai.filter((x) => x.id !== tp.id && x.status !== "batal" && (x.kad_id || (x.config && x.config.kadId)) === nama) : [];
    $("#ad-slug-sama").hidden = !sama.length;
    if (sama.length) $("#ad-slug-sama").textContent = `Nama pautan "${nama}" juga digunakan oleh ${sama.map((x) => x.kod).join(", ")}. Tukar nama pautan (cth tambah -2) supaya kad dan RSVP tidak bercampur.`;
    $("#ad-db").hidden = !rsvp;
    if (rsvp) {
      const pas = c.anak && c.pasangan ? `${c.anak.panggilan} & ${c.pasangan.panggilan}` : nama;
      const L = ["-- 1. Daftar kad. Salin ID pemilik (QW-XXXX-XXXX) yang dipulangkan: ia dipaparkan sekali sahaja.",
        `select public.daftar_kad_baharu(${sqlTeks(nama)}, ${sqlTeks(pas)});`];
      if (tm.pakej === "premium") L.push("-- 2. Premium: buka RSVP 3,000 dan buku tetamu", `update public.kad set pakej = 'premium' where kad_id = ${sqlTeks(nama)};`);
      $("#ad-sql").textContent = L.join("\n");
      $("#ad-supabase").hidden = !!(SHOP.supabaseUrl && SHOP.supabaseAnonKey);
    }
    const id = ($("#ad-idpemilik").value.trim() || "QW-XXXX-XXXX").toUpperCase();
    const M = [`Assalamualaikum ${c.anak ? c.anak.panggilan + " & " + c.pasangan.panggilan : ""}, kad anda sudah siap:`, pautan];
    if (rsvp) {
      M.push("", `Untuk lihat senarai RSVP: buka kad anda → bahagian RSVP → taip ID ini di ruang Nama: ${id} → tekan Lihat rekod RSVP. Jangan kongsi ID ini dengan tetamu.`);
      if (tm.pakej === "premium") M.push("", "Dalam papan yang sama anda boleh muat turun senarai PDF, reka bentuk kad fizikal, serta pautan dan kod QR kad anda.");
    }
    $("#ad-mesej-pemilik").value = M.join("\n");
    $("#ad-idpemilik-medan").hidden = !rsvp;
    const wa = $("#ad-wa-pemilik");
    wa.hidden = !tp.telefon;
    if (tp.telefon) wa.href = `https://wa.me/${normTel(tp.telefon)}?text=${encodeURIComponent(M.join("\n"))}`;
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
    catch (e) { $("#ad-ralat").textContent = "CONFIG bukan JSON yang sah: " + e.message; $("#ad-ralat").hidden = false; return false; }
  }
  async function htmlKad() {
    const tm = temaAdmin();
    return kadAkhir(await ambilTpl(failTema(tm.id)), ADM.cfg, tm);
  }
  async function adminKemas(patch, mesej) {
    const tp = ADM.buka;
    mesejAdmin("Menyimpan…");
    try {
      await G.simpan(tp.id, patch);
      await adminMuat(tp.id);
      mesejAdmin(mesej || "Disimpan.");
    } catch (e) { mesejAdmin("Tidak berjaya: " + sebab(e), true); }
  }

  function siapkanAdmin() {
    if (ADM.sedia) return;
    ADM.sedia = true;
    const kumpulan = [["flip", "Kad Flip"], ["basic", "Basic"], ["premium", "Premium"]];
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
        if (!b.dataset.pasti) { b.dataset.pasti = "1"; b.textContent = "Tekan sekali lagi untuk padam"; setTimeout(() => { if (b.isConnected) { delete b.dataset.pasti; b.textContent = "Padam"; } }, 4000); return; }
        mesejAdmin("Memadam…");
        try { await G.padam(tp); adminTutup(); await adminMuat(); mesejAdmin(""); } catch (ex) { mesejAdmin("Tidak berjaya: " + sebab(ex), true); }
        return;
      }
      const patch = { status: k };
      if (k === "siap") {
        const pautan = $("#ad-pautan").value.trim() || `${SHOP.url}/k/${slugAdmin()}/`;
        Object.assign(patch, { pautan, kad_id: temaAdmin().pakej === "flip" ? null : slugAdmin() });
      }
      await adminKemas(patch, { diproses: "Tempahan sedang diproses.", siap: "Ditandakan siap. Pelanggan nampak pautan kad di papan pemuka.", batal: "Tempahan dibatalkan.", dihantar: "Status: Baharu." }[k]);
    });
    on("#ad-simpan", "click", () => {
      const tm = temaAdmin(), nama = slugAdmin();
      if (!bacaConfig()) return;
      const cfg = lengkapkan(ADM.cfg, tm, nama);
      adminKemas({ harga: $("#ad-harga").value.trim() || null, pautan: $("#ad-pautan").value.trim() || null, nota_admin: $("#ad-nota").value.trim() || null,
        kad_id: tm.pakej === "flip" ? null : nama, tema: tm.id, pakej: pakejById(ADM.buka.pakej).jenis === tm.pakej ? ADM.buka.pakej : pakejUntuk(tm.pakej), config: cfg });
    });
    on("#ad-tema", "change", () => {
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
    on("#ad-simpan-config", "click", () => { if (bacaConfig()) adminKemas({ config: ADM.cfg }, "CONFIG disimpan."); });
    on("#ad-ubah-borang", "click", () => { if (ADM.buka) ubahTempahan(ADM.buka, true); });
    on("#ad-lagu-fail", "change", async (e) => {
      const f = e.target.files && e.target.files[0], tp = ADM.buka;
      e.target.value = "";
      if (!f || !tp) return;
      if (!(/^audio\/(mpeg|mp3)$/.test(f.type) || /\.mp3$/i.test(f.name)) || f.size > MAKS_LAGU) { mesejAdmin("Fail lagu mesti MP3, tidak melebihi 10 MB.", true); return; }
      mesejAdmin("Memuat naik lagu…");
      try {
        const laluan = await G.muatNaik(`${tp.pemilik}/${tp.id}/lagu.mp3`, f, "audio/mpeg");
        const cfg = Object.assign({}, ADM.cfg, { muzik: "lagu.mp3" });
        await adminKemas({ fail: Object.assign({}, tp.fail || {}, { lagu: laluan }), config: cfg }, "Lagu dimuat naik.");
      } catch (ex) { mesejAdmin("Tidak berjaya: " + sebab(ex), true); }
    });
    on("#ad-zip", "click", async (e) => {
      const tp = ADM.buka, b = e.currentTarget;
      if (!tp || !bacaConfig()) return;
      b.disabled = true; mesejAdmin("Menyediakan ZIP…");
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
        mesejAdmin(kurang.length ? `ZIP dimuat turun. Fail yang belum ada: ${kurang.join(", ")}.` : "ZIP dimuat turun.");
      } catch (ex) { mesejAdmin("ZIP tidak dapat disediakan: " + sebab(ex) + ". Cuba Muat turun index.html.", true); }
      finally { b.disabled = false; }
    });
    on("#ad-html", "click", async () => { if (ADM.buka && bacaConfig()) muatTurunBlob(new Blob([await htmlKad()], { type: "text/html" }), "index.html"); });
    on("#ad-salin-html", "click", async (e) => { const b = e.currentTarget; if (ADM.buka && bacaConfig()) salin(await htmlKad(), b); });
    on("#ad-salin-sql", "click", (e) => salin($("#ad-sql").textContent, e.currentTarget));
    on("#ad-salin-pemilik", "click", (e) => salin($("#ad-mesej-pemilik").value, e.currentTarget, $("#ad-mesej-pemilik")));
  }

  // the admin sign-in form works before anyone is signed in
  function pasangAdmin() {
    const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
    on("#ad-bukan-keluar", "click", keluarAkaun);
    on("#ad-borang", "submit", async (e) => {
      e.preventDefault();
      const nama = $("#ad-nama").value.trim().toLowerCase(), kata = $("#ad-kata").value, ralat = $("#ad-masuk-ralat"), btn = $("#ad-masuk-btn");
      if (!nama || !kata) { ralat.textContent = "Isi nama pengguna dan kata laluan."; ralat.hidden = false; return; }
      btn.disabled = true;
      try { AKAUN.user = await G.masuk(nama, kata); $("#ad-kata").value = ""; ralat.hidden = true; lepasAuth(); }
      catch (ex) { ralat.textContent = ex && ex.kod === "salah" ? "Nama pengguna atau kata laluan salah." : ex && ex.kod === "terlalu" ? "Terlalu banyak cubaan. Tunggu seminit." : "Tidak dapat log masuk: " + sebab(ex); ralat.hidden = false; }
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
    $$("[data-bahasa]").forEach((b) => b.addEventListener("click", () => setBahasa(b.dataset.bahasa)));
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
