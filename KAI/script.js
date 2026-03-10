/* ═══════════════════════════════════
   STATE
═══════════════════════════════════ */
let currentApp = 'home';
let calcStr = '', calcExpr = '';
let externalUrl = '';
let clockInterval = null, analogInterval = null;
let pinVal = '';
let qrPinVal = '';
let guideActive = false;
let guideStepIndex = 0;
let currentFlow = null;
let guideRenderToken = 0;
let pendingTapHandler = null;

// KAI Settings state
let kaiSettings = {
  childLock: false,
  language: 'english',
  strictness: false,
};

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */
window.addEventListener('load', () => {
  updateStatusTime(); setInterval(updateStatusTime, 1000);
  updateHomeTime();   setInterval(updateHomeTime, 1000);
  buildClockMarks();
  speak("Initializing K A I...");
  setTimeout(wishMe, 900);

  // App grid — event delegation (only grid icons, dock handled by inline onclick)
  const appGrid = document.querySelector('.app-grid');
  if (appGrid) {
    appGrid.addEventListener('click', (e) => {
      const icon = e.target.closest('.app-icon');
      if (!icon) return;
      const icons = Array.from(appGrid.querySelectorAll('.app-icon'));
      const index = icons.indexOf(icon);
      const apps = ['google', 'youtube', 'facebook', 'gcash', 'calculator', 'clock', 'wikipedia', 'maps'];
      if (index >= 0 && apps[index]) {
        openApp(apps[index]);
      }
    });
  }

  // NOTE: Dock icons use inline onclick handlers in the HTML — no delegation needed here.
});

function updateStatusTime() {
  const n = new Date();
  document.getElementById('status-time').textContent =
    pad(n.getHours()) + ':' + pad(n.getMinutes());
}
function updateHomeTime() {
  const n = new Date();
  document.getElementById('home-time-big').textContent = pad(n.getHours()) + ':' + pad(n.getMinutes());
  const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  document.getElementById('home-date-text').textContent =
    DAYS[n.getDay()] + ', ' + MONTHS[n.getMonth()] + ' ' + n.getDate();
  document.getElementById('home-greeting').textContent =
    n.getHours() < 12 ? 'GOOD MORNING' : n.getHours() < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
}
function pad(n) { return n.toString().padStart(2,'0'); }

/* ═══════════════════════════════════
   SPEECH
═══════════════════════════════════ */
function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.93; u.pitch = 1; u.volume = 1;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}
function wishMe() {
  const h = new Date().getHours();
  speak(h < 12
    ? "Good morning! K A I is ready. Open me and say help me send money — I will guide you step by step."
    : h < 17 ? "Good afternoon! K A I is ready to help."
             : "Good evening! K A I is ready to help.");
}

/* ═══════════════════════════════════
   TOAST
═══════════════════════════════════ */
function showToast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

/* ═══════════════════════════════════
   NAVIGATION
═══════════════════════════════════ */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active', 'app-opening');
  el.addEventListener('animationend', () => el.classList.remove('app-opening'), {once:true});
  currentApp = id;
}
function goHome() {
  stopGuide();
  if (clockInterval)  { clearInterval(clockInterval);  clockInterval  = null; }
  if (analogInterval) { clearInterval(analogInterval); analogInterval = null; }
  showView('home-screen');
}

/* ═══════════════════════════════════
   OPEN APP
═══════════════════════════════════ */
const appConfig = {
  google:  { title:'Google',  logo:'🌐', url:'https://google.com',         msg:'Search the web with Google' },
  youtube: { title:'YouTube', logo:'▶️', url:'https://youtube.com',        msg:'Watch videos on YouTube' },
  maps:    { title:'Maps',    logo:'🗺️', url:'https://maps.google.com',    msg:'Explore the world with Google Maps' },
};
function openApp(name) {
  if (name === 'kai')        { showView('kai-screen'); return; }
  if (name === 'calculator') { showView('calc-screen'); return; }
  if (name === 'clock')      { showView('clock-screen'); startClock(); return; }
  if (name === 'wikipedia')  { showView('wiki-screen'); return; }
  if (name === 'gcash')      { showView('gcash-screen'); gcashShowSub('gcash-home'); return; }
  if (name === 'facebook')   { showView('facebook-screen'); fbShowSub('fb-home'); return; }
  if (name === 'shopee')     { showView('shopee-screen'); spShowSub('sp-home'); spBuildHome(); return; }
  if (name === 'contacts')   { showView('contacts-screen'); ctBuildList(contacts); return; }
  if (name === 'maps')       { showView('maps-screen'); return; }
  if (name === 'fitness')    { showView('fitness-screen'); setTimeout(fitInit, 80); return; }
  const cfg = appConfig[name]; if (!cfg) return;
  externalUrl = cfg.url;
  document.getElementById('external-title').textContent   = cfg.title;
  document.getElementById('iframe-logo').textContent      = cfg.logo;
  document.getElementById('iframe-app-name').textContent  = cfg.title.toUpperCase();
  document.getElementById('iframe-msg').textContent       = cfg.msg;
  showView('external-screen');
}
function openExternal() { if (externalUrl) window.open(externalUrl, '_blank'); }

/* ═══════════════════════════════════
   GCASH
═══════════════════════════════════ */
function gcashShowSub(id) {
  document.querySelectorAll('.gcash-subview').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function gcashGoSend()  { gcashShowSub('gcash-send-step1'); }
function gcashGoHome()  { gcashShowSub('gcash-home'); qrPinVal = ''; updateQrPinDots(); }
function gcashBack(to)  { gcashShowSub(to); }

function gcashGoStep2() {
  gcashShowSub('gcash-send-step2');
  if (guideActive) setTimeout(renderGuideStep, 250);
}
function gcashGoReview() {
  const num  = document.getElementById('gcash-number-input').value;
  const amt  = document.getElementById('gcash-amount-input').value;
  const note = document.getElementById('gcash-note-input').value || 'No note';
  document.getElementById('review-amt').textContent    = '₱' + parseFloat(amt).toFixed(2);
  document.getElementById('review-number').textContent = num;
  document.getElementById('review-to').textContent     = contactName(num);
  document.getElementById('review-note').textContent   = note;
  gcashShowSub('gcash-send-review');
  if (guideActive) setTimeout(renderGuideStep, 250);
}
function gcashGoPin() {
  pinVal = ''; updatePinDots();
  gcashShowSub('gcash-send-pin');
  if (guideActive) setTimeout(renderGuideStep, 250);
}
function gcashGoSuccess() {
  const amt = document.getElementById('gcash-amount-input').value;
  const num = document.getElementById('gcash-number-input').value;
  document.getElementById('success-amt').textContent = '₱' + parseFloat(amt).toFixed(2);
  document.getElementById('success-to').textContent  = contactName(num) + ' (' + num + ')';
  document.getElementById('success-ref').textContent = 'REF: GC' + Date.now().toString().slice(-10);
  gcashShowSub('gcash-send-success');
  speak("Money sent successfully! Well done. The transaction is complete.");
  showToast("✅ Money sent successfully!");
  stopGuide();
}

function contactName(num) {
  if (num === '09171234567') return 'Maria Santos';
  if (num === '09281234567') return 'Juan Dela Cruz';
  if (num === '09391234567') return 'Ana Reyes';
  return 'GCash User';
}
function gcashFillContact(num) {
  document.getElementById('gcash-number-input').value = num;
  gcashValidateStep1();
}
function gcashValidateStep1() {
  const v = document.getElementById('gcash-number-input').value;
  document.getElementById('gcash-next-btn-1').disabled = v.length < 11;
}
function gcashValidateStep2() {
  const v = parseFloat(document.getElementById('gcash-amount-input').value);
  document.getElementById('gcash-next-btn-2').disabled = !(v > 0 && v <= 2450);
}
function gcashSetAmt(n) {
  document.getElementById('gcash-amount-input').value = n;
  document.querySelectorAll('.gcash-amt-chip').forEach(c => {
    const val = parseInt(c.textContent.replace(/[₱,]/g,''));
    c.classList.toggle('selected', val === n);
  });
  gcashValidateStep2();
}

/* PIN */
function pinPress(d) {
  if (pinVal.length >= 4) return;
  pinVal += d; updatePinDots();
  if (pinVal.length === 4) {
    setTimeout(() => {
      if (pinVal === '1234') { gcashGoSuccess(); }
      else {
        speak("Incorrect PIN. Please try again.");
        showToast("❌ Wrong PIN. Try: 1 2 3 4");
        pinVal = ''; updatePinDots();
      }
    }, 350);
  }
}
function pinBackspace() { pinVal = pinVal.slice(0,-1); updatePinDots(); }
function updatePinDots() {
  for (let i=0; i<4; i++)
    document.getElementById('pd'+i).classList.toggle('filled', i < pinVal.length);
}

/* ═══════════════════════════════════
   SHOPEE
═══════════════════════════════════ */

// Product catalog — each has: id, name, emoji, price, rating, sold, desc, category
const spProducts = [
  // Phones
  { id:'s1',  name:'Samsung Galaxy A15 4G',             emoji:'📱', price:6990,  rating:4.8, sold:12400, desc:'6.5" display, 50MP camera, 5000mAh battery. Perfect everyday smartphone.', cat:'Phones' },
  { id:'s2',  name:'Xiaomi Redmi 13C',                  emoji:'📱', price:4999,  rating:4.6, sold:9800,  desc:'6.74" display, 50MP AI triple camera. Best budget phone.', cat:'Phones' },
  { id:'s3',  name:'realme C55',                        emoji:'📱', price:7299,  rating:4.7, sold:7200,  desc:'108MP camera, 5000mAh, 33W fast charging. For content creators.', cat:'Phones' },
  { id:'sp4', name:'OPPO A78 5G',                       emoji:'📱', price:8999,  rating:4.5, sold:6100,  desc:'6.56" display, 50MP AI camera, 5000mAh. Blazing 5G speeds.', cat:'Phones' },
  { id:'sp5', name:'vivo Y16',                          emoji:'📱', price:5499,  rating:4.4, sold:8300,  desc:'6.51" display, 13MP camera, 5000mAh. Slim & lightweight design.', cat:'Phones' },
  { id:'sp6', name:'iPhone 11 64GB (Refurbished)',       emoji:'📱', price:14999, rating:4.6, sold:4200,  desc:'A13 Bionic chip, dual 12MP cameras, Face ID. Certified refurbished.', cat:'Phones' },
  { id:'sp7', name:'Tecno Spark 20C',                   emoji:'📱', price:3999,  rating:4.3, sold:11200, desc:'6.56" HD+ display, 16MP camera. Best entry-level pick.', cat:'Phones' },
  // Fashion
  { id:'s4',  name:'Oversized Graphic Tee',             emoji:'👕', price:199,   rating:4.5, sold:32000, desc:'100% cotton, unisex fit. Available in 8 colors.', cat:'Fashion' },
  { id:'s10', name:'Nike Dri-FIT Running Shorts',       emoji:'🩳', price:899,   rating:4.6, sold:8700,  desc:'Lightweight, sweat-wicking. Built-in liner. Sizes S-XXL.', cat:'Fashion' },
  { id:'sf3', name:'Palazzo Wide-Leg Pants',            emoji:'👖', price:349,   rating:4.7, sold:21000, desc:'High-waist flowy fit. Chic & comfortable for daily wear.', cat:'Fashion' },
  { id:'sf4', name:'Bucket Hat UV Protection',          emoji:'🧢', price:159,   rating:4.6, sold:15800, desc:'UPF50+ protection. Packable & washable. 6 colors.', cat:'Fashion' },
  { id:'sf5', name:'Ribbed Crop Tank Top',              emoji:'👚', price:149,   rating:4.4, sold:27500, desc:'Stretchy rib fabric. Pairs with everything. S-2XL.', cat:'Fashion' },
  { id:'sf6', name:'Korean-Style Sneakers',             emoji:'👟', price:799,   rating:4.7, sold:13200, desc:'Lightweight sole, breathable mesh upper. Unisex sizing.', cat:'Fashion' },
  { id:'sf7', name:'Linen Button-Down Shirt',           emoji:'👔', price:459,   rating:4.5, sold:9400,  desc:'Breathable linen blend. Perfect for humid PH weather.', cat:'Fashion' },
  // Beauty
  { id:'s5',  name:'Korean Skincare Set (6pcs)',         emoji:'🧴', price:599,   rating:4.9, sold:28000, desc:'Cleanser, toner, serum, moisturizer, eye cream, sunscreen.', cat:'Beauty' },
  { id:'s11', name:'Collagen Whitening Soap 3-pack',    emoji:'🧼', price:149,   rating:4.7, sold:67000, desc:'Papaya + kojic acid. Visible results in 2 weeks.', cat:'Beauty' },
  { id:'sb3', name:'Hyaluronic Acid Serum 30ml',        emoji:'💧', price:299,   rating:4.8, sold:34000, desc:'Deeply hydrating, plumps skin. All skin types. Fragrance-free.', cat:'Beauty' },
  { id:'sb4', name:'Sunscreen SPF50 PA++++ 50ml',       emoji:'🌞', price:249,   rating:4.8, sold:41000, desc:'Lightweight, non-greasy finish. Daily UV protection.', cat:'Beauty' },
  { id:'sb5', name:'Maybelline Fit Me Foundation',      emoji:'💄', price:399,   rating:4.6, sold:19500, desc:'Natural finish. 40 shades. Dermatologist-tested.', cat:'Beauty' },
  { id:'sb6', name:'Retinol Anti-Aging Night Cream',    emoji:'🌙', price:449,   rating:4.7, sold:12300, desc:'Reduces fine lines overnight. With Vitamin E & C.', cat:'Beauty' },
  { id:'sb7', name:'Hair Repair Mask 300ml',            emoji:'💆', price:199,   rating:4.5, sold:23000, desc:'Keratin-infused deep conditioner. Frizz-free in 1 use.', cat:'Beauty' },
  // Food
  { id:'s6',  name:'Lucky Me Pancit Canton 6-pack',     emoji:'🍜', price:89,    rating:4.8, sold:95000, desc:'Original flavor. Fast cook. Kids and adults love it!', cat:'Food' },
  { id:'sfd2',name:'Nescafe 3-in-1 Coffee 30s',         emoji:'☕', price:189,   rating:4.8, sold:78000, desc:'Rich creamy coffee. Perfect for busy mornings. Resealable pack.', cat:'Food' },
  { id:'sfd3',name:'Oishi Prawn Crackers 6-pack',       emoji:'🦐', price:149,   rating:4.7, sold:52000, desc:'Crispy, light snack. 6 big bags. Party favorite!', cat:'Food' },
  { id:'sfd4',name:'Monde Mamon 10pcs',                 emoji:'🧁', price:99,    rating:4.6, sold:43000, desc:'Soft fluffy sponge cake. A classic Filipino snack.', cat:'Food' },
  { id:'sfd5',name:'Virgin Coconut Oil 500ml',          emoji:'🥥', price:199,   rating:4.7, sold:31000, desc:'Cold-pressed, unrefined. For cooking, hair & skin.', cat:'Food' },
  { id:'sfd6',name:'Apple Cider Vinegar 750ml',         emoji:'🍎', price:249,   rating:4.5, sold:17000, desc:'With mother. Raw & unfiltered. Supports digestion.', cat:'Food' },
  // Toys
  { id:'s7',  name:'Stuffed Bear Plushie 40cm',         emoji:'🧸', price:299,   rating:4.7, sold:18000, desc:'Super soft. Great gift for all ages. Machine washable.', cat:'Toys' },
  { id:'st2', name:'LEGO Classic Bricks Set 484pcs',    emoji:'🧩', price:1299,  rating:4.9, sold:8700,  desc:'484 classic LEGO bricks in 33 colors. Ages 4+. Creative play.', cat:'Toys' },
  { id:'st3', name:'Remote Control Car 1:18 Scale',     emoji:'🚗', price:699,   rating:4.6, sold:11200, desc:'2.4GHz, 20km/h top speed, rechargeable. Kids & adults.', cat:'Toys' },
  { id:'st4', name:'Magnetic Drawing Board',            emoji:'✏️', price:249,   rating:4.8, sold:24000, desc:'Colorful doodle board. No mess, no ink. Perfect for toddlers.', cat:'Toys' },
  { id:'st5', name:'Kinetic Sand 1kg Set',              emoji:'🏖️', price:399,   rating:4.7, sold:9300,  desc:'Moldable sensory sand. 3 colors + tools. Non-toxic.', cat:'Toys' },
  { id:'st6', name:'Bubble Gun Auto Blower',            emoji:'🫧', price:199,   rating:4.5, sold:19800, desc:'Shoots 500+ bubbles/min. Battery-operated. Kids 3+.', cat:'Toys' },
  // Electronics
  { id:'s8',  name:'JBL GO 3 Portable Speaker',         emoji:'🔊', price:1499,  rating:4.7, sold:14500, desc:'Waterproof, bold JBL sound, 5h battery. Clip anywhere.', cat:'Electronics' },
  { id:'s9',  name:'Wireless Earbuds TWS',              emoji:'🎧', price:399,   rating:4.4, sold:41000, desc:'Bluetooth 5.0, 4h playback + 12h charging case. Clear sound.', cat:'Electronics' },
  { id:'s13', name:'Mechanical Keyboard RGB',           emoji:'⌨️', price:1299,  rating:4.6, sold:5400,  desc:'Blue switches, TKL layout, USB-C. Perfect for gaming.', cat:'Electronics' },
  { id:'s15', name:'Wireless Mouse Ergonomic',          emoji:'🖱️', price:599,   rating:4.5, sold:9300,  desc:'2.4GHz, silent click, 1600 DPI. Long 12-month battery.', cat:'Electronics' },
  { id:'se5', name:'65W USB-C GaN Charger',             emoji:'🔌', price:499,   rating:4.8, sold:22000, desc:'Charges laptop + phone simultaneously. Foldable plug.', cat:'Electronics' },
  { id:'se6', name:'10000mAh Power Bank Slim',          emoji:'🔋', price:699,   rating:4.7, sold:37000, desc:'22.5W fast charge, dual USB + USB-C. Airline-approved.', cat:'Electronics' },
  { id:'se7', name:'Ring Light 10" with Stand',         emoji:'💡', price:899,   rating:4.6, sold:16800, desc:'3 light modes, 10 brightness levels. Perfect for streaming.', cat:'Electronics' },
  { id:'se8', name:'Webcam 1080p Full HD',              emoji:'📷', price:799,   rating:4.5, sold:8900,  desc:'Auto-focus, built-in mic, plug & play. WFH essential.', cat:'Electronics' },
  { id:'se9', name:'Bluetooth Speaker 360° Waterproof', emoji:'🔊', price:849,   rating:4.6, sold:12100, desc:'360° surround sound, 12h battery, IPX7 waterproof.', cat:'Electronics' },
  { id:'se10',name:'Smart LED Bulb RGB WiFi',           emoji:'💡', price:299,   rating:4.5, sold:28500, desc:'16M colors, voice & app control. Works with Alexa & Google.', cat:'Electronics' },
  // Mouse-specific
  { id:'sm1', name:'Logitech M185 Wireless Mouse',      emoji:'🖱️', price:749,   rating:4.7, sold:18600, desc:'1000 DPI, 12-month battery, reliable 2.4GHz nano receiver.', cat:'Electronics' },
  { id:'sm2', name:'Gaming Mouse RGB 6400 DPI',         emoji:'🖱️', price:499,   rating:4.5, sold:14200, desc:'7 programmable buttons, RGB lighting, braided cable.', cat:'Electronics' },
  { id:'sm3', name:'Mouse Pad XL Desk Mat 80x30cm',     emoji:'🖱️', price:249,   rating:4.8, sold:31000, desc:'Stitched edges, smooth surface, non-slip rubber base.', cat:'Electronics' },
  { id:'sm4', name:'Vertical Ergonomic Mouse',          emoji:'🖱️', price:699,   rating:4.6, sold:7800,  desc:'Natural hand posture, reduces wrist strain. 800-1600 DPI.', cat:'Electronics' },
  // Accessories
  { id:'s12', name:'Stick-on Phone Wallet',             emoji:'💳', price:79,    rating:4.3, sold:22000, desc:'Holds 3 cards + cash. Strong adhesive. Works with MagSafe.', cat:'Accessories' },
  { id:'sa2', name:'Tempered Glass Screen Protector',   emoji:'📲', price:59,    rating:4.6, sold:48000, desc:'9H hardness, full cover, anti-fingerprint. Fits all models.', cat:'Accessories' },
  { id:'sa3', name:'Braided Charging Cable 1.2m',       emoji:'🔌', price:129,   rating:4.7, sold:61000, desc:'USB-C & Lightning. Fast charge, tangle-free nylon braid.', cat:'Accessories' },
  { id:'sa4', name:'Phone Stand Adjustable Desktop',    emoji:'📱', price:199,   rating:4.6, sold:17300, desc:'360° rotation, foldable, compatible with all phone sizes.', cat:'Accessories' },
  { id:'sa5', name:'Laptop Sleeve 14" Waterproof',      emoji:'💼', price:349,   rating:4.7, sold:9800,  desc:'Slim neoprene, shock-absorbing. Fits MacBook & Lenovo.', cat:'Accessories' },
  // Kitchen
  { id:'s14', name:'Reusable Water Bottle 1L',          emoji:'🍶', price:249,   rating:4.8, sold:31000, desc:'Stainless steel, keeps cold 24h / hot 12h. BPA-free.', cat:'Kitchen' },
  { id:'sk2', name:'Air Fryer 3.5L Digital',            emoji:'🍳', price:2499,  rating:4.7, sold:6700,  desc:'8 preset modes, rapid air technology. 360° even heat.', cat:'Kitchen' },
  { id:'sk3', name:'Non-Stick Frying Pan 28cm',         emoji:'🍳', price:599,   rating:4.6, sold:21000, desc:'PFOA-free coating, induction compatible, soft-grip handle.', cat:'Kitchen' },
  { id:'sk4', name:'Electric Kettle 1.7L SS',           emoji:'☕', price:699,   rating:4.8, sold:14200, desc:'Fast boil 1500W, auto shut-off, keep warm function.', cat:'Kitchen' },
  { id:'sk5', name:'Meal Prep Containers 10-set',       emoji:'🥗', price:399,   rating:4.7, sold:25000, desc:'BPA-free, leak-proof, microwave & dishwasher safe.', cat:'Kitchen' },
];

let spCurrentProduct = null;
let spCart = [];
let spLastSearch = '';
let spKaiRec = null; // the KAI-recommended product for current search

function spShowSub(id) {
  document.querySelectorAll('.sp-subview').forEach(v => v.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function spBuildHome() {
  // Flash deals — top 5 by discount simulation
  const flash = [
    { name:'Earbuds', emoji:'🎧', price:'₱399', orig:'₱799', off:'50%' },
    { name:'Tote Bag', emoji:'👜', price:'₱99', orig:'₱299', off:'67%' },
    { name:'Facemask', emoji:'😷', price:'₱49', orig:'₱150', off:'67%' },
    { name:'Notebook', emoji:'📓', price:'₱39', orig:'₱89', off:'56%' },
    { name:'Sneakers', emoji:'👟', price:'₱499', orig:'₱1299', off:'62%' },
  ];
  const row = document.getElementById('sp-flash-row');
  if (row && !row.innerHTML) {
    row.innerHTML = flash.map(f => `
      <div class="sp-flash-item">
        <div class="sp-flash-emoji">${f.emoji}</div>
        <div class="sp-flash-name">${f.name}</div>
        <div class="sp-flash-price">${f.price}</div>
        <div class="sp-flash-off">${f.off} OFF</div>
      </div>`).join('');
  }
  const grid = document.getElementById('sp-home-grid');
  if (grid && !grid.innerHTML) {
    const picks = [...spProducts].sort(() => Math.random() - 0.5).slice(0, 6);
    grid.innerHTML = picks.map(p => spCardHTML(p)).join('');
  }
}

function spCardHTML(p, isKaiPick = false) {
  const stars = '★'.repeat(Math.floor(p.rating)) + (p.rating % 1 >= 0.5 ? '½' : '');
  const soldStr = p.sold >= 1000 ? (p.sold/1000).toFixed(0)+'k' : p.sold;
  return `<div class="sp-card${isKaiPick ? ' kai-top' : ''}" onclick="spOpenProduct('${p.id}')">
    <div class="sp-card-img">${p.emoji}</div>
    <div class="sp-card-body">
      <div class="sp-card-name">${p.name}</div>
      <div class="sp-card-price">₱${p.price.toLocaleString()}</div>
      <div class="sp-card-meta">
        <div class="sp-card-rating">★ ${p.rating}</div>
        <div class="sp-card-sold">${soldStr} sold</div>
      </div>
    </div>
  </div>`;
}

function spSearchCategory(cat) {
  document.getElementById('sp-search-input').value = cat;
  spDoSearch();
}

// Called by guide steps 3 & 4 to guarantee the search has run and banner is visible
function spEnsureSearchAndBanner() {
  const q = (document.getElementById('sp-search-input').value || '').trim();
  if (!q) return;
  // Re-run search unconditionally so banner is always fresh and visible
  spDoSearch();
  // Belt-and-suspenders: explicitly show banner if spKaiRec was set
  const banner = document.getElementById('sp-kai-banner');
  if (banner && spKaiRec && kaiSettings.strictness) {
    banner.style.display = 'block';
  }
}

function spDoSearch() {
  const q = (document.getElementById('sp-search-input').value || '').trim().toLowerCase();
  if (!q) return;
  spLastSearch = q;
  const results = spProducts.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.cat.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q)
  );
  document.getElementById('sp-results-keyword').textContent = document.getElementById('sp-search-input').value;
  document.getElementById('sp-results-count').textContent = results.length + ' items';
  const grid = document.getElementById('sp-results-grid');

  // KAI recommendation — best by (rating * 0.4 + normalised sold * 0.6)
  const banner = document.getElementById('sp-kai-banner');
  if (kaiSettings.strictness && results.length > 0) {
    const maxSold = Math.max(...results.map(r => r.sold));
    const scored = results.map(r => ({ ...r, score: r.rating * 0.4 + (r.sold / maxSold) * 0.6 }));
    spKaiRec = scored.sort((a, b) => b.score - a.score)[0];

    document.getElementById('sp-kai-rec-card').innerHTML = `
      <div class="sp-kai-rec-emoji">${spKaiRec.emoji}</div>
      <div class="sp-kai-rec-info">
        <div class="sp-kai-rec-name">${spKaiRec.name}</div>
        <div class="sp-kai-rec-price">₱${spKaiRec.price.toLocaleString()}</div>
        <div class="sp-kai-rec-row">
          <span class="sp-kai-rec-stars">★ ${spKaiRec.rating}</span>
          <span class="sp-kai-rec-sold">${spKaiRec.sold.toLocaleString()} sold</span>
        </div>
      </div>
      <i class="fas fa-chevron-right" style="color:rgba(255,255,255,.3);font-size:12px"></i>`;
    document.getElementById('sp-kai-reason').textContent =
      `Chosen because it has the highest combination of rating (${spKaiRec.rating}★) and sales (${spKaiRec.sold.toLocaleString()} sold) among all results.`;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
    spKaiRec = null;
  }

  grid.innerHTML = results.length
    ? results.map(p => spCardHTML(p, kaiSettings.strictness && spKaiRec && p.id === spKaiRec.id)).join('')
    : '<div style="text-align:center;padding:30px;color:#999;font-family:Inter,sans-serif;font-size:12px">No results found</div>';
  spShowSub('sp-results');
}

function spOpenProduct(id) {
  const p = id === '__kai_rec__' ? spKaiRec : spProducts.find(x => x.id === id);
  if (!p) return;
  spCurrentProduct = p;
  document.getElementById('sp-product-img').textContent   = p.emoji;
  document.getElementById('sp-product-name').textContent  = p.name;
  document.getElementById('sp-product-rating').textContent = `★ ${p.rating} (${p.sold.toLocaleString()} ratings)`;
  document.getElementById('sp-product-sold').textContent  = `${p.sold.toLocaleString()} sold`;
  document.getElementById('sp-product-price').textContent = `₱${p.price.toLocaleString()}`;
  document.getElementById('sp-product-desc').textContent  = p.desc;
  document.getElementById('sp-add-cart-btn').innerHTML    = '<i class="fas fa-cart-plus"></i> Add to Cart';
  spShowSub('sp-product');
  if (guideActive) setTimeout(renderGuideStep, 300);
}

function spBackToResults() {
  spShowSub('sp-results');
  if (guideActive) setTimeout(renderGuideStep, 250);
}

function spAddToCart() {
  if (!spCurrentProduct) return;
  spCart.push({ ...spCurrentProduct });
  const badge = document.getElementById('sp-cart-badge');
  badge.style.display = 'flex';
  badge.textContent = spCart.length;
  document.getElementById('sp-add-cart-btn').innerHTML = '<i class="fas fa-check"></i> Added!';
  showToast('🛒 Added to cart: ' + spCurrentProduct.name);
  if (guideActive) setTimeout(renderGuideStep, 300);
}

function spBuyNow() {
  if (!spCurrentProduct) return;
  spAddToCart();
  setTimeout(() => { spShowSub('sp-cart'); spRenderCart(); }, 300);
}

function spRenderCart() {
  const el = document.getElementById('sp-cart-items');
  const count = document.getElementById('sp-cart-count');
  count.textContent = spCart.length;
  if (!spCart.length) {
    el.innerHTML = '<div class="sp-empty-cart"><span class="sp-empty-cart-emoji">🛒</span>Your cart is empty</div>';
    document.getElementById('sp-cart-total').textContent = '₱0.00';
    return;
  }
  el.innerHTML = spCart.map(p => `
    <div class="sp-cart-item">
      <div class="sp-cart-item-emoji">${p.emoji}</div>
      <div class="sp-cart-item-info">
        <div class="sp-cart-item-name">${p.name}</div>
        <div class="sp-cart-item-price">₱${p.price.toLocaleString()}</div>
      </div>
    </div>`).join('');
  const total = spCart.reduce((s, p) => s + p.price, 0);
  document.getElementById('sp-cart-total').textContent = '₱' + total.toLocaleString();
}

function spCheckout() {
  showToast('✅ Order placed successfully! Arriving in 3–5 days.');
  speak("Your order has been placed! It will arrive in 3 to 5 days.");
  spCart = [];
  document.getElementById('sp-cart-badge').style.display = 'none';
  setTimeout(() => spShowSub('sp-home'), 1200);
}

function spOpenCart() {
  spShowSub('sp-cart');
  spRenderCart();
}

document.addEventListener('DOMContentLoaded', () => {
  const cartBtn = document.getElementById('sp-cart-btn');
  if (cartBtn) cartBtn.onclick = () => spOpenCart();
});

/* ── Shop guide — no strictness (just search) ── */
const shopGuideBasic = [
  {
    targetId: 'home-shopee-icon',
    viewId:   'home-screen',
    message:  "Let's find what you need! First, tap the Shopee icon to open the app.",
    tapToAdvance: true,
    onTap() { openApp('shopee'); },
  },
  {
    targetId: 'sp-search-input',
    viewId:   'shopee-screen',
    subviewId: 'sp-home',
    message:  "Type the product you're looking for in the search bar, then press Enter.",
    tapToAdvance: false,
    okLabel:  "I searched →",
    onOk() {
      const q = (document.getElementById('sp-search-input').value || '').trim();
      if (q) spDoSearch();
    },
  },
  {
    targetId: 'sp-results-grid',
    viewId:   'shopee-screen',
    subviewId: 'sp-results',
    message:  "Here are your search results! Tap any product to see its details, price, and reviews.",
    tapToAdvance: false,
    okLabel:  "Got it ✓",
  },
];

/* ── Shop guide — WITH strictness (KAI recommends best pick) ── */
const shopGuideStrict = [
  {
    targetId: 'home-shopee-icon',
    viewId:   'home-screen',
    message:  "Let's go shopping! Tap the Shopee icon to open the app.",
    tapToAdvance: true,
    onTap() { openApp('shopee'); },
  },
  {
    targetId: 'sp-search-input',
    viewId:   'shopee-screen',
    subviewId: 'sp-home',
    message:  "Type the product you want in the search bar and press Enter. I'll scan all results and find the best one for you!",
    tapToAdvance: false,
    okLabel:  "I searched →",
    onOk() {
      const q = (document.getElementById('sp-search-input').value || '').trim();
      if (q) spDoSearch();
    },
  },
  {
    targetId: 'sp-results-header',
    viewId:   'shopee-screen',
    subviewId: 'sp-results',
    message:  "I analyzed every result and ranked them by rating and sales. My top pick is shown in the dark banner — scroll up to see it!",
    tapToAdvance: false,
    okLabel:  "Show me →",
    onShow() {
      // Guarantee the search has run and banner is populated
      spEnsureSearchAndBanner();
      const el = document.getElementById('sp-results');
      if (el) el.scrollTop = 0;
    },
  },
  {
    targetId: 'sp-kai-banner',
    viewId:   'shopee-screen',
    subviewId: 'sp-results',
    message:  "This is my top pick! Tap it to see the full details — price, reviews, and description.",
    tapToAdvance: true,
    onShow() {
      // Guarantee the search has run and banner is populated
      spEnsureSearchAndBanner();
      const el = document.getElementById('sp-results');
      if (el) el.scrollTop = 0;
    },
    onTap() { if (spKaiRec) spOpenProduct(spKaiRec.id); },
  },
  {
    targetId: 'sp-add-cart-btn',
    viewId:   'shopee-screen',
    subviewId: 'sp-product',
    message:  "You're on the product page! Review the details, and when you're ready, tap 'Add to Cart'.",
    tapToAdvance: true,
    onTap() { spAddToCart(); },
  },
];

/* ═══════════════════════════════════
   FACEBOOK
═══════════════════════════════════ */
let fbSelectedPhoto = null;
const fbPhotoEmojis = ['🌅','🏖️','🌸','🎉','🌃','🍕','🐶','🎵','🌿'];

function fbShowSub(id) {
  document.querySelectorAll('.fb-subview').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function fbBack(to) { fbShowSub(to); }

function fbOpenPhotoUpload() {
  fbSelectedPhoto = null;
  document.querySelectorAll('.fb-gallery-item').forEach(i => i.classList.remove('selected'));
  document.getElementById('fb-next-btn-1').disabled = true;
  fbShowSub('fb-photo-step1');
  if (guideActive) setTimeout(renderGuideStep, 250);
}

function fbSelectPhoto(idx) {
  fbSelectedPhoto = idx;
  document.querySelectorAll('.fb-gallery-item').forEach((el,i) => {
    el.classList.toggle('selected', i === idx);
  });
  document.getElementById('fb-next-btn-1').disabled = false;
  if (guideActive) setTimeout(renderGuideStep, 250);
}

function fbGoStep2() {
  if (fbSelectedPhoto === null) return;
  const emoji = fbPhotoEmojis[fbSelectedPhoto];
  document.getElementById('fb-selected-preview').textContent = emoji;
  document.getElementById('fb-caption-input').value = '';
  fbShowSub('fb-photo-step2');
  if (guideActive) setTimeout(renderGuideStep, 250);
}

function fbGoSuccess() {
  const emoji = fbPhotoEmojis[fbSelectedPhoto ?? 0];
  document.getElementById('fb-success-preview').textContent = emoji;
  fbShowSub('fb-photo-success');
  speak("Your photo has been posted! It's now live on Facebook.");
  showToast("📸 Photo posted successfully!");
  stopGuide();
}

function fbOpenPostModal() { showToast("✏️ Post composer coming soon!"); }

/* ═══════════════════════════════════
   FACEBOOK — REACTIONS
═══════════════════════════════════ */
const fbLikeState = { 1: null, 2: null }; // null = not reacted
let fbReactionTimer = {};

function fbShowReactions(postId) {
  clearTimeout(fbReactionTimer[postId]);
  document.getElementById('fb-reaction-picker-' + postId)?.classList.add('visible');
}
function fbHideReactions(postId) {
  fbReactionTimer[postId] = setTimeout(() => {
    document.getElementById('fb-reaction-picker-' + postId)?.classList.remove('visible');
  }, 400);
}
function fbToggleLike(postId) {
  if (fbLikeState[postId]) {
    fbPickReaction(postId, null, null); // un-react
  } else {
    fbPickReaction(postId, '👍', 'Like');
  }
}
function fbPickReaction(postId, emoji, label) {
  fbHideReactions(postId);
  const btn   = document.getElementById('fb-like-btn-' + postId);
  const lbl   = document.getElementById('fb-like-label-' + postId);
  const count = document.getElementById('fb-post' + postId + '-react-count');
  if (!btn || !lbl) return;

  if (emoji === null) {
    // Remove reaction
    fbLikeState[postId] = null;
    btn.classList.remove('liked');
    btn.querySelector('i').className = 'fas fa-thumbs-up';
    lbl.textContent = 'Like';
    if (count && postId === 1) count.textContent = '👍 ❤️ 142';
    if (count && postId === 2) count.textContent = '👍 😍 87';
  } else {
    fbLikeState[postId] = emoji;
    btn.classList.add('liked');
    btn.querySelector('i').className = 'fas fa-thumbs-up';
    btn.querySelector('i').textContent = '';
    lbl.innerHTML = emoji + ' ' + label;
    if (count && postId === 1) count.textContent = emoji + ' ❤️ 143';
    if (count && postId === 2) count.textContent = emoji + ' 😍 88';
    showToast('You reacted ' + emoji + ' to this post!');
    if (guideActive) setTimeout(renderGuideStep, 260);
  }
}

/* ═══════════════════════════════════
   FACEBOOK — SHARE
═══════════════════════════════════ */
let fbSharePostId = null;

function fbOpenShare(postId) {
  fbSharePostId = postId;
  // Update preview for the correct post
  const previews = {
    1: { avatar:'👩', name:'Maria Santos', text:'Enjoying the beautiful sunset at Rizal Park today! 🌅' },
    2: { avatar:'👨', name:'Juan Dela Cruz', text:'Merienda time with the family! 🍜🍗' },
  };
  const p = previews[postId] || previews[1];
  const sheet = document.getElementById('fb-share-sheet');
  sheet.querySelector('.fb-share-preview-avatar').textContent = p.avatar;
  sheet.querySelector('.fb-share-preview-name').textContent   = p.name;
  sheet.querySelector('.fb-share-preview-text').textContent   = p.text;

  document.getElementById('fb-share-overlay').classList.add('visible');
  setTimeout(() => sheet.classList.add('open'), 10);
  if (guideActive) setTimeout(renderGuideStep, 350);
}
function fbCloseShare() {
  document.getElementById('fb-share-sheet').classList.remove('open');
  document.getElementById('fb-share-overlay').classList.remove('visible');
}
function fbShareNow() {
  fbCloseShare();
  const countEl = document.getElementById('fb-post1-share-count');
  if (fbSharePostId === 1 && countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
  const banner = document.getElementById('fb-share-success');
  banner.classList.add('show');
  speak("Post shared to your timeline!");
  showToast("🔁 Post shared successfully!");
  setTimeout(() => banner.classList.remove('show'), 3000);
  if (guideActive) stopGuide();
}

/* ── React to Post Guide Flow ── */
const reactPostFlow = [
  {
    targetId: 'fb-app-icon',
    viewId:   'home-screen',
    message:  "First, open the Facebook app from your home screen.",
    tapToAdvance: true,
    onTap() { openApp('facebook'); },
  },
  {
    targetId: 'fb-post-1',
    viewId:   'facebook-screen',
    subviewId: 'fb-home',
    message:  "Here's a post on your feed. To react, find the 👍 Like button at the bottom of the post.",
    tapToAdvance: false,
    okLabel:  "Got it →",
  },
  {
    targetId: 'fb-like-btn-1',
    viewId:   'facebook-screen',
    subviewId: 'fb-home',
    message:  "This is the Like button. Tap it once to Like, or hold it (hover on desktop) to see more reactions like ❤️ Love, 😂 Haha, and more!",
    tapToAdvance: false,
    okLabel:  "I see it →",
  },
  {
    targetId: 'fb-reaction-picker-1',
    viewId:   'facebook-screen',
    subviewId: 'fb-home',
    message:  "These are your reaction options! Tap any emoji — 👍 Like, ❤️ Love, 😂 Haha, 😮 Wow, 😢 Sad, or 😡 Angry. Pick one now!",
    tapToAdvance: false,
    okLabel:  "I picked a reaction ✓",
    onShow()  { fbShowReactions(1); },
  },
  {
    targetId: 'fb-like-btn-1',
    viewId:   'facebook-screen',
    subviewId: 'fb-home',
    message:  "Great! Your reaction is saved. The counter updated too. To remove it, just tap the button again.",
    tapToAdvance: false,
    okLabel:  "Done! 🎉",
  },
];

/* ── Share a Post Guide Flow ── */
const sharePostFlow = [
  {
    targetId: 'fb-app-icon',
    viewId:   'home-screen',
    message:  "First, open the Facebook app from your home screen.",
    tapToAdvance: true,
    onTap() { openApp('facebook'); },
  },
  {
    targetId: 'fb-post-1',
    viewId:   'facebook-screen',
    subviewId: 'fb-home',
    message:  "Here's a post you can share. Scroll down to see the Share button at the bottom of the post.",
    tapToAdvance: false,
    okLabel:  "I can see it →",
  },
  {
    targetId: 'fb-share-btn-1',
    viewId:   'facebook-screen',
    subviewId: 'fb-home',
    message:  "This is the Share button. Tap it to see your sharing options!",
    tapToAdvance: true,
    onTap() { fbOpenShare(1); },
  },
  {
    targetId: 'fb-share-sheet',
    viewId:   'facebook-screen',
    subviewId: 'fb-home',
    message:  "A menu appeared with sharing options. You can share now, add a caption, share to your Story, or send via Messenger.",
    tapToAdvance: false,
    okLabel:  "Got it →",
  },
  {
    targetId: 'fb-share-now-btn',
    viewId:   'facebook-screen',
    subviewId: 'fb-home',
    message:  "Tap 'Share Now' to instantly post this to your timeline. Your friends will see it!",
    tapToAdvance: true,
    onTap() { fbShareNow(); },
  },
];

/* ═══════════════════════════════════
   GCASH — QR / RECEIVE
═══════════════════════════════════ */

/* Simple SVG QR code generator (decorative pattern) */
function buildQrSvg(elId) {
  const size = 130;
  const cells = 11;
  const cell = Math.floor(size / cells);
  // Deterministic "QR-like" pattern
  const pattern = [
    [1,1,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,1],
    [1,0,1,1,1,0,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,0,1,1],
    [1,0,1,1,1,0,1,0,1,1,0],
    [1,0,0,0,0,0,1,0,1,0,1],
    [1,1,1,1,1,1,1,0,1,0,1],
    [0,0,0,0,0,0,0,0,1,1,0],
    [1,0,1,1,0,1,1,1,1,0,1],
    [0,1,0,0,1,0,0,1,0,1,0],
    [1,1,1,1,0,1,1,0,1,0,1],
  ];
  let rects = '';
  pattern.forEach((row, r) => {
    row.forEach((v, c) => {
      if (v) rects += `<rect x="${c*cell}" y="${r*cell}" width="${cell-1}" height="${cell-1}" rx="1" fill="#0070ba"/>`;
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rects}</svg>`;
  const el = document.getElementById(elId);
  if (el) el.innerHTML = svg;
}

/* QR PIN pad */
function qrPinPress(d) {
  if (qrPinVal.length >= 4) return;
  qrPinVal += d; updateQrPinDots();
  if (qrPinVal.length === 4) {
    setTimeout(() => {
      if (qrPinVal === '1234') {
        gcashShowSub('gcash-qr-success');
        buildQrSvg('gcash-qr-svg');
        buildQrSvg('gcash-qr-svg-final');
        // Also show QR in info screen
        document.getElementById('gcash-qr-locked').style.display = 'none';
        document.getElementById('gcash-qr-active').classList.remove('gcash-qr-active-hidden');
        buildQrSvg('gcash-qr-svg');
        speak("Your QR code is now activated! Show it to anyone who wants to send you money.");
        showToast("✅ QR Code activated!");
        if (guideActive) stopGuide();
      } else {
        speak("Incorrect PIN. Please try again.");
        showToast("❌ Wrong PIN. Try: 1 2 3 4");
        qrPinVal = ''; updateQrPinDots();
      }
    }, 350);
  }
}
function qrPinBackspace() { qrPinVal = qrPinVal.slice(0,-1); updateQrPinDots(); }
function updateQrPinDots() {
  for (let i = 0; i < 4; i++)
    document.getElementById('qpd'+i).classList.toggle('filled', i < qrPinVal.length);
}

/* ── Receive Money (QR Activation) Guide Flow ── */
const receiveMoneyFlow = [
  {
    targetId: 'gcash-receive-btn',
    viewId:   'gcash-screen',
    subviewId:'gcash-home',
    message:  "We're in GCash! Now tap the 'Receive' button to start setting up your QR code.",
    tapToAdvance: true,
    onTap() { gcashShowSub('gcash-receive'); },
  },
  {
    targetId: 'gcash-qr-option-btn',
    viewId:   'gcash-screen',
    subviewId:'gcash-receive',
    message:  "You'll see different receive options. Tap 'My QR Code' — this lets people scan and send money directly to you.",
    tapToAdvance: true,
    onTap() { gcashShowSub('gcash-qr-info'); },
  },
  {
    targetId: 'gcash-qr-frame',
    viewId:   'gcash-screen',
    subviewId:'gcash-qr-info',
    message:  "This is where your QR code will appear. Right now it's locked — we need to activate it. You can also set a specific amount if you want.",
    tapToAdvance: false,
    okLabel:  "Got it →",
  },
  {
    targetId: 'gcash-activate-qr-btn',
    viewId:   'gcash-screen',
    subviewId:'gcash-qr-info',
    message:  "Tap 'Activate QR Code' to unlock your personal QR. GCash will ask you to confirm with your MPIN for security.",
    tapToAdvance: true,
    onTap() { gcashShowSub('gcash-qr-confirm'); qrPinVal=''; updateQrPinDots(); },
  },
  {
    targetId: 'gcash-qr-pin-pad',
    viewId:   'gcash-screen',
    subviewId:'gcash-qr-confirm',
    message:  "Enter your 4-digit MPIN to verify it's really you. This keeps your account secure. For this demo, use 1 2 3 4.",
    tapToAdvance: false,
    okLabel:  "I entered my PIN →",
  },
];

/* ── Upload Photo Guide Flow ── */
const uploadPhotoFlow = [
  {
    targetId: 'fb-app-icon',
    viewId:   'home-screen',
    message:  "First, find the Facebook app on your home screen and tap it to open it.",
    tapToAdvance: true,
    onTap() { openApp('facebook'); },
  },
  {
    targetId: 'fb-photo-btn',
    viewId:   'facebook-screen',
    subviewId:'fb-home',
    message:  "Facebook is open! Now tap the 📷 Photo button in the 'What's on your mind?' box to start uploading.",
    tapToAdvance: true,
    onTap() { fbOpenPhotoUpload(); },
  },
  {
    targetId: 'fb-gallery',
    viewId:   'facebook-screen',
    subviewId:'fb-photo-step1',
    message:  "Choose a photo from your gallery by tapping on it. A blue border will appear around the selected photo.",
    tapToAdvance: false,
    okLabel:  "I selected a photo →",
  },
  {
    targetId: 'fb-next-btn-1',
    viewId:   'facebook-screen',
    subviewId:'fb-photo-step1',
    message:  "Great choice! Now tap 'Next' to continue to the caption screen.",
    tapToAdvance: true,
    onTap() { fbGoStep2(); },
  },
  {
    targetId: 'fb-caption-input',
    viewId:   'facebook-screen',
    subviewId:'fb-photo-step2',
    message:  "You can type a caption for your photo here — describe what's happening or add a fun message! This step is optional.",
    tapToAdvance: false,
    okLabel:  "I added a caption →",
  },
  {
    targetId: 'fb-post-btn',
    viewId:   'facebook-screen',
    subviewId:'fb-photo-step2',
    message:  "Everything looks good! Tap the blue POST button to share your photo with your friends.",
    tapToAdvance: true,
    onTap() { fbGoSuccess(); },
  },
];

/* ═══════════════════════════════════
   KAI GUIDED NAVIGATION SYSTEM
═══════════════════════════════════ */
const sendMoneyFlow = [
  {
    targetId: 'home-gcash-icon',
    viewId:   'home-screen',
    message:  "First, tap the GCash icon on your home screen. It's the blue card icon.",
    tapToAdvance: true,
    onTap() { openApp('gcash'); },
  },
  {
    targetId: 'gcash-send-btn',
    viewId:   'gcash-screen',
    subviewId:'gcash-home',
    message:  "GCash is open! Now tap 'Send Money' — the blue button with the arrow.",
    tapToAdvance: true,
    onTap() { gcashGoSend(); },
  },
  {
    targetId: 'gcash-number-input',
    viewId:   'gcash-screen',
    subviewId:'gcash-send-step1',
    message:  "Type the mobile number of the person you want to send money to. You can also tap a saved contact below.",
    tapToAdvance: false,
    okLabel:  "I typed the number →",
  },
  {
    targetId: 'gcash-next-btn-1',
    viewId:   'gcash-screen',
    subviewId:'gcash-send-step1',
    message:  "Good! Now tap the 'Continue' button to move to the next step.",
    tapToAdvance: true,
    onTap() { gcashGoStep2(); },
  },
  {
    targetId: 'gcash-amount-input',
    viewId:   'gcash-screen',
    subviewId:'gcash-send-step2',
    message:  "Enter the amount you want to send. You can also tap one of the quick amount buttons.",
    tapToAdvance: false,
    okLabel:  "I entered the amount →",
  },
  {
    targetId: 'gcash-next-btn-2',
    viewId:   'gcash-screen',
    subviewId:'gcash-send-step2',
    message:  "Tap 'Review Details' to check everything before sending.",
    tapToAdvance: true,
    onTap() { gcashGoReview(); },
  },
  {
    targetId: 'gcash-review-summary',
    viewId:   'gcash-screen',
    subviewId:'gcash-send-review',
    message:  "Here's your Transaction Summary — double-check the name, number, and amount. Transactions cannot be reversed once sent!",
    tapToAdvance: false,
    okLabel:  "I've reviewed it ✓",
  },
  {
    targetId: 'gcash-confirm-btn',
    viewId:   'gcash-screen',
    subviewId:'gcash-send-review',
    message:  "Everything looks correct? Tap 'Confirm & Enter PIN' to proceed.",
    tapToAdvance: true,
    onTap() { gcashGoPin(); },
  },
  {
    targetId: 'gcash-pin-pad',
    viewId:   'gcash-screen',
    subviewId:'gcash-send-pin',
    message:  "Almost done! Enter your secret 4-digit PIN to authorize. Never share your PIN with anyone — not even family.",
    tapToAdvance: false,
    okLabel:  "I entered my PIN",
  },
];

function startGuide(flowSteps) {
  currentFlow     = flowSteps;
  guideStepIndex  = 0;
  guideActive     = true;
  renderGuideStep();
}

function renderGuideStep() {
  if (!guideActive || !currentFlow) return;
  const step = currentFlow[guideStepIndex];

  guideRenderToken = (guideRenderToken || 0) + 1;
  const myToken = guideRenderToken;

  if (step.viewId && currentApp !== step.viewId) showView(step.viewId);
  if (step.subviewId) {
    if (step.viewId === 'facebook-screen') fbShowSub(step.subviewId);
    else if (step.viewId === 'shopee-screen') spShowSub(step.subviewId);
    else gcashShowSub(step.subviewId);
  }

  // For the KAI banner step: make the banner visible NOW before any delays
  // so the browser has maximum time to reflow before we try to measure dimensions.
  if (step.targetId === 'sp-kai-banner') {
    spEnsureSearchAndBanner();
    const resultsEl = document.getElementById('sp-results');
    if (resultsEl) resultsEl.scrollTop = 0;
  }

  setTimeout(() => { if (guideRenderToken === myToken) positionGuideOn(step, myToken); }, 160);
}

function positionGuideOn(step, token) {
  if (!guideActive || guideRenderToken !== token) return;

  const overlay    = document.getElementById('kai-guide-overlay');
  const ring       = document.getElementById('kai-guide-ring');
  const bubble     = document.getElementById('kai-guide-bubble');
  const canvas     = document.getElementById('kai-guide-backdrop');
  const msgEl      = document.getElementById('guide-message');
  const badgeEl    = document.getElementById('guide-step-badge');
  const tapHintEl  = document.getElementById('guide-tap-hint');
  const okBtn      = document.getElementById('guide-ok-btn');

  const target = document.getElementById(step.targetId);
  if (!target) { stopGuide(); return; } // safety: never leave overlay blocking UI

  // Call onShow before positioning (scrolls to top etc.)
  if (step.onShow) step.onShow();

  // For the KAI banner: ensure it's visible, then poll until it has real dimensions
  if (step.targetId === 'sp-kai-banner') {
    const waitForBanner = (triesLeft) => {
      if (guideRenderToken !== token) return;
      const el = document.getElementById('sp-kai-banner');
      const resultsEl = document.getElementById('sp-results');
      if (resultsEl) resultsEl.scrollTop = 0;
      // Force banner visible on every retry
      if (el) el.style.display = 'block';
      const r = el ? el.getBoundingClientRect() : null;
      if (r && r.width > 10 && r.height > 10) {
        _drawGuide(step, overlay, ring, bubble, canvas, msgEl, badgeEl, tapHintEl, okBtn, token);
      } else if (triesLeft > 0) {
        setTimeout(() => waitForBanner(triesLeft - 1), 150);
      } else {
        // Final attempt: re-run search, force visible, then draw
        spEnsureSearchAndBanner();
        if (el) el.style.display = 'block';
        if (resultsEl) resultsEl.scrollTop = 0;
        setTimeout(() => {
          if (guideRenderToken !== token) return;
          _drawGuide(step, overlay, ring, bubble, canvas, msgEl, badgeEl, tapHintEl, okBtn, token);
        }, 300);
      }
    };
    setTimeout(() => waitForBanner(12), 300);
    return;
  }

  const scrollParent = target.closest('.gcash-flow-body, .gcash-body, .fb-feed, .app-content, .fb-caption-area, #sp-results, .sp-home-content');
  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offsetInsideParent = targetRect.top - parentRect.top + scrollParent.scrollTop;
    const desiredScroll = offsetInsideParent - (scrollParent.clientHeight * 0.25);
    scrollParent.scrollTo({ top: Math.max(0, desiredScroll), behavior: 'smooth' });
  }

  setTimeout(() => {
    if (guideRenderToken !== token) return;
    _drawGuide(step, overlay, ring, bubble, canvas, msgEl, badgeEl, tapHintEl, okBtn, token);
  }, 320);
}

function _drawGuide(step, overlay, ring, bubble, canvas, msgEl, badgeEl, tapHintEl, okBtn, token) {
  if (!guideActive || (token !== undefined && guideRenderToken !== token)) return;
  const target = document.getElementById(step.targetId);
  if (!target) { stopGuide(); return; }

  overlay.classList.add('active');

  const pRect = document.getElementById('phone-screen').getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const rx = tRect.left - pRect.left;
  const ry = tRect.top  - pRect.top;
  const rw = tRect.width;
  const rh = tRect.height;
  const pad = 7;

  // Clamp ring to stay within phone screen bounds
  ring.style.cssText = `
    left:${rx - pad}px; top:${ry - pad}px;
    width:${rw + pad*2}px; height:${rh + pad*2}px;
    border-radius:${rh > 44 ? '14px' : '50px'};
  `;

  canvas.width  = pRect.width;
  canvas.height = pRect.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const r = 30;
  const W = canvas.width, H = canvas.height;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(W-r, 0); ctx.quadraticCurveTo(W, 0, W, r);
  ctx.lineTo(W, H-r); ctx.quadraticCurveTo(W, H, W-r, H);
  ctx.lineTo(r, H); ctx.quadraticCurveTo(0, H, 0, H-r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);
  const hx = rx - pad - 3, hy = ry - pad - 3;
  const hw = rw + (pad+3)*2, hh = rh + (pad+3)*2;
  ctx.clearRect(hx, hy, hw, hh);
  ctx.restore();

  // Remove old blocker — no blocker divs needed
  const oldBlocker = document.getElementById('guide-blocker');
  if (oldBlocker) oldBlocker.remove();

  // Move bubble to top of DOM so it stays above everything
  const bubble_el = document.getElementById('kai-guide-bubble');
  bubble_el.parentNode.appendChild(bubble_el);

  msgEl.textContent   = step.message;
  badgeEl.textContent = (guideStepIndex + 1) + '/' + currentFlow.length;

  if (step.tapToAdvance) {
    okBtn.style.display     = 'none';
    tapHintEl.style.display = 'block';
  } else {
    okBtn.style.display     = 'block';
    okBtn.textContent       = step.okLabel || 'I did it →';
    tapHintEl.style.display = 'none';
  }

  speak(step.message);

  const bubbleH    = 200;
  const bubbleW    = 280;
  const targetCX   = rx + rw / 2;
  const arrowOffset = 28;
  const screenH    = pRect.height;
  const screenW    = pRect.width;
  const margin     = 10;

  const ringTop    = ry - pad;
  const ringBottom = ry + rh + pad;
  const spaceAbove = ringTop - margin - 44;   // 44 = status bar
  const spaceBelow = screenH - ringBottom - margin - 50; // 50 = home bar

  let bTop, arrowClass;
  if (spaceBelow >= bubbleH + 8) {
    // Prefer below — target is near top after scroll, bubble fits below cleanly
    bTop       = ringBottom + 12;
    arrowClass = 'bubble-arrow-top';
  } else if (spaceAbove >= bubbleH + 8) {
    bTop       = ringTop - bubbleH - 12;
    arrowClass = 'bubble-arrow-bottom';
  } else if (spaceBelow >= spaceAbove) {
    bTop       = Math.min(screenH - bubbleH - 54, ringBottom + 8);
    arrowClass = 'bubble-arrow-top';
  } else {
    bTop       = Math.max(44, ringTop - bubbleH - 8);
    arrowClass = 'bubble-arrow-bottom';
  }

  let bLeft = targetCX - arrowOffset - 14;
  bLeft = Math.max(margin, Math.min(bLeft, screenW - bubbleW - margin));

  bubble.className  = arrowClass;
  bubble.style.top  = Math.max(44, Math.min(bTop, screenH - bubbleH - 24)) + 'px';
  bubble.style.left = bLeft + 'px';

  let arrowStyle = document.getElementById('guide-arrow-style');
  if (!arrowStyle) {
    arrowStyle = document.createElement('style');
    arrowStyle.id = 'guide-arrow-style';
    document.head.appendChild(arrowStyle);
  }
  const arrowLeft = targetCX - bLeft - 6;
  arrowStyle.textContent = `
    #kai-guide-bubble::after { left: ${Math.max(12, Math.min(arrowLeft, bubbleW - 24))}px !important; }
  `;

  if (step.tapToAdvance && step.onTap) {
    if (pendingTapHandler && pendingTapHandler.el) {
      pendingTapHandler.el.removeEventListener('click', pendingTapHandler.fn);
    }
    const fn = (e) => {
      e.stopPropagation();
      if (!guideActive) return;
      step.onTap();
      guideStepIndex++;
      if (guideStepIndex >= currentFlow.length) { stopGuide(); return; }
      setTimeout(renderGuideStep, 380);
    };
    target.addEventListener('click', fn, { once: true });
    pendingTapHandler = { el: target, fn };
  }
}

function guideNextManual() {
  if (!guideActive) return;
  const step = currentFlow[guideStepIndex];
  if (step && step.onOk) {
    step.onOk();
    guideStepIndex++;
    if (guideStepIndex >= currentFlow.length) { stopGuide(); return; }
    // Give the DOM a moment to reflect any changes from onOk before rendering
    setTimeout(renderGuideStep, 200);
    return;
  }
  guideStepIndex++;
  if (guideStepIndex >= currentFlow.length) { stopGuide(); return; }
  renderGuideStep();
}

function stopGuide() {
  guideActive = false;
  if (pendingTapHandler && pendingTapHandler.el) {
    pendingTapHandler.el.removeEventListener('click', pendingTapHandler.fn);
    pendingTapHandler = null;
  }
  const overlay = document.getElementById('kai-guide-overlay');
  overlay.classList.remove('active');
  const ctx = document.getElementById('kai-guide-backdrop').getContext('2d');
  ctx.clearRect(0, 0, 9999, 9999);
}

/* ═══════════════════════════════════
   VOICE
═══════════════════════════════════ */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.onresult = (e) => {
    const t = e.results[e.resultIndex][0].transcript;
    setKaiTranscript(t); setListening(false);
    takeCommand(t.toLowerCase());
  };
  recognition.onerror = () => { setListening(false); setKaiStatus('ERROR — TRY AGAIN'); };
  recognition.onend   = () => setListening(false);
}
function startListening() {
  if (!SpeechRecognition) { showToast('⚠ Speech recognition not supported'); return; }
  setListening(true); setKaiStatus('LISTENING...'); setKaiTranscript('...');
  recognition.start();
}
function setListening(v) {
  document.getElementById('kai-input-bar').classList.toggle('listening', v);
  document.getElementById('kai-mic-icon').innerHTML = v
    ? '<i class="fas fa-microphone-alt" style="color:#00e5ff"></i>'
    : '<i class="fas fa-microphone-alt"></i>';
}
function setKaiStatus(s) {
  const el = document.getElementById('kai-subtitle');
  if (el) el.textContent = (s === 'READY') ? langHints[kaiSettings.language] : s;
}
function setKaiTranscript(t) { document.getElementById('kai-transcript').textContent = t; }

/* ═══════════════════════════════════
   KAI CHAT MODE
═══════════════════════════════════ */
function kaiSetMode(mode) {
  const voiceBar  = document.getElementById('kai-input-bar');
  const chatWrap  = document.getElementById('kai-chat-wrap');
  const btnVoice  = document.getElementById('kai-mode-voice');
  const btnChat   = document.getElementById('kai-mode-chat');

  if (mode === 'voice') {
    voiceBar.style.display = 'flex';
    chatWrap.classList.remove('active');
    btnVoice.classList.add('active');
    btnChat.classList.remove('active');
  } else {
    voiceBar.style.display = 'none';
    chatWrap.classList.add('active');
    btnChat.classList.add('active');
    btnVoice.classList.remove('active');
    setTimeout(() => document.getElementById('kai-chat-input').focus(), 150);
  }
}

function sendChat() {
  const input = document.getElementById('kai-chat-input');
  const msg   = (input.value || '').trim();
  if (!msg) return;
  input.value = '';

  // Append user bubble
  appendChatMsg(msg, 'user');

  // Run through same command engine as voice
  takeCommand(msg.toLowerCase(), true);
}

function appendChatMsg(text, who) {
  const history = document.getElementById('kai-chat-history');
  const div = document.createElement('div');
  div.className = 'kai-chat-msg ' + who;
  if (who === 'kai') {
    div.innerHTML = '<span class="kai-chat-label">K·A·I</span>' + text;
  } else {
    div.textContent = text;
  }
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}


function openKaiSettings() {
  showView('kai-settings-screen');
  renderSettingsState();
}
function closeKaiSettings() {
  showView('kai-screen');
}

function toggleStrictness() {
  kaiSettings.strictness = !kaiSettings.strictness;
  renderSettingsState();
  const msg = kaiSettings.strictness
    ? "Smart Suggestions is ON. I'll now give you personalized coaching — best products while shopping, cheapest routes on Maps, and fitness insights based on your real data."
    : "Smart Suggestions is OFF. I'll guide you through tasks without extra analysis.";
  showToast(kaiSettings.strictness ? '💡 Smart Suggestions ON' : '💡 Smart Suggestions OFF');
  speak(msg);
}

function renderSettingsState() {
  // Spend Guard toggle
  const toggle = document.getElementById('childlock-toggle');
  const desc   = document.getElementById('childlock-desc');
  const info   = document.getElementById('kai-childlock-info');
  if (kaiSettings.childLock) {
    toggle?.classList.add('on');
    if (desc) desc.textContent = 'Money guides are blocked';
    info?.classList.add('active');
  } else {
    toggle?.classList.remove('on');
    if (desc) desc.textContent = 'Financial guides are unlocked';
    info?.classList.remove('active');
  }

  // Smart Suggestions toggle
  const stToggle = document.getElementById('strictness-toggle');
  const stDesc   = document.getElementById('strictness-desc');
  if (kaiSettings.strictness) {
    stToggle?.classList.add('on');
    if (stDesc) stDesc.textContent = 'KAI coaches: fitness, routes & shopping';
  } else {
    stToggle?.classList.remove('on');
    if (stDesc) stDesc.textContent = 'KAI guides without extra analysis';
  }

  // Language buttons
  ['english','taglish','tagalog'].forEach(lang => {
    document.getElementById('lang-' + lang)
      ?.classList.toggle('active', kaiSettings.language === lang);
  });
}

function toggleChildLock() {
  kaiSettings.childLock = !kaiSettings.childLock;
  renderSettingsState();
  const msg = kaiSettings.childLock
    ? "Spend Guard is now on. I won't guide any money transfers or payments."
    : "Spend Guard is off. I can now help with money guides again.";
  showToast(kaiSettings.childLock ? '🔒 Spend Guard ON' : '🔓 Spend Guard OFF');
  speak(msg);
}

const langHints = {
  english: 'Hello! How may I help you?',
  taglish:  'Hello! How may I help you?',
  tagalog:  'Hello! How may I help you?',
};

function setLanguage(lang) {
  kaiSettings.language = lang;
  renderSettingsState();
  const el = document.getElementById('kai-subtitle');
  if (el) el.textContent = langHints[lang];
  showToast('🌐 Input language: ' + lang.charAt(0).toUpperCase() + lang.slice(1));
  speak("Got it! You can now speak to me in " + lang + ". I'll still reply in English.");
}

function updateLangPreview() {} // no-op, preview removed


function takeCommand(msg, fromChat = false) {
  setKaiStatus('PROCESSING...');
  const respond = (text, action) => {
    setKaiStatus('RESPONDING');
    setKaiTranscript(text);
    showToast('🤖 ' + text);
    if (fromChat) appendChatMsg(text, 'kai');
    // Fire action only after speech synthesis actually finishes — no guessing needed
    speak(text, action ? () => { action(); setTimeout(() => setKaiStatus('READY'), 400); } : null);
    if (!action) setTimeout(() => setKaiStatus('READY'), 3500);
  };

  const lang = kaiSettings.language; // 'english' | 'taglish' | 'tagalog'

  // ── Intent keyword maps per language ──────────────────────────
  const intents = {

    sendMoney: {
      english: ['send money','transfer money','help me send','how to send'],
      taglish:  ['magpadala ng pera','padala ng pera','help me magpadala','paano magpadala','mag send ng pera'],
      tagalog:  ['magpadala ng pera','paano magpadala','tulungan mo akong magpadala','padala'],
    },

    receiveMoney: {
      english: ['receive money','help me receive','activate qr','qr code','how to receive'],
      taglish:  ['tumanggap ng pera','i-activate ang qr','qr code ko','paano tumanggap','help me tumanggap'],
      tagalog:  ['tumanggap ng pera','paano tumanggap','i-activate ang qr code','kunin ang pera'],
    },

    uploadPhoto: {
      english: ['upload a photo','post a photo','how do i upload','share a photo','post photo'],
      taglish:  ['mag-upload ng photo','mag post ng picture','paano mag-upload','i-share ang photo'],
      tagalog:  ['mag-upload ng larawan','paano mag-post ng larawan','i-share ang larawan'],
    },

    reactPost: {
      english: ['react to a post','how to react','like a post','how do i react','love react'],
      taglish:  ['mag-react sa post','paano mag-react','i-like ang post','paano mag-like'],
      tagalog:  ['mag-react sa objek','paano mag-like','paano mag-react sa post'],
    },

    sharePost: {
      english: ['share a post','how to share','share post','how do i share'],
      taglish:  ['i-share ang post','paano mag-share','share ng post','mag share'],
      tagalog:  ['ibahagi ang post','paano ibahagi','paano mag-share ng post'],
    },

    shopee: {
      english: ['help me shop','open shopee','shopee','help me buy','i want to buy','shop in shopee'],
      taglish:  ['help me shop','buksan ang shopee','shopee','gusto kong bumili','mag-shop sa shopee'],
      tagalog:  ['tulungan mo akong mamili','buksan ang shopee','shopee','gusto kong bumili'],
    },

    openFacebook: {
      english: ['open facebook','facebook'],
      taglish:  ['buksan ang facebook','facebook'],
      tagalog:  ['buksan ang facebook','facebook'],
    },

    openGcash: {
      english: ['open gcash','gcash'],
      taglish:  ['buksan ang gcash','gcash'],
      tagalog:  ['buksan ang gcash','gcash'],
    },

    openGoogle: {
      english: ['open google'],
      taglish:  ['buksan ang google','open google'],
      tagalog:  ['buksan ang google'],
    },

    openYoutube: {
      english: ['open youtube'],
      taglish:  ['buksan ang youtube','open youtube'],
      tagalog:  ['buksan ang youtube'],
    },

    calculator: {
      english: ['calculator','open calculator'],
      taglish:  ['calculator','kalkulator','buksan ang calculator'],
      tagalog:  ['kalkulator','buksan ang kalkulator'],
    },

    clock: {
      english: ['open clock','clock'],
      taglish:  ['buksan ang oras','open clock','orasan'],
      tagalog:  ['buksan ang orasan','orasan'],
    },

    wikipedia: {
      english: ['wikipedia','open wikipedia'],
      taglish:  ['wikipedia','buksan ang wikipedia'],
      tagalog:  ['wikipedia','buksan ang wikipedia'],
    },

    time: {
      english: ['what time','current time','time is it'],
      taglish:  ['anong oras','what time','oras na'],
      tagalog:  ['anong oras na','sabihin ang oras'],
    },

    date: {
      english: ['what date','today date','what day'],
      taglish:  ['anong petsa','what date','anong araw'],
      tagalog:  ['anong petsa','anong araw ngayon'],
    },

    settings: {
      english: ['settings','open settings'],
      taglish:  ['settings','buksan ang settings'],
      tagalog:  ['mga setting','buksan ang mga setting'],
    },

    goHome: {
      english: ['go home','home screen'],
      taglish:  ['go home','home screen','uwi'],
      tagalog:  ['umuwi','bumalik sa home'],
    },

    openContacts: {
      english: ['open contacts','contacts'],
      taglish:  ['buksan ang contacts','contacts'],
      tagalog:  ['buksan ang contacts','contacts'],
    },

    openMaps: {
      english: ['open maps','open map','maps app'],
      taglish:  ['buksan ang maps','buksan ang mapa','maps'],
      tagalog:  ['buksan ang mapa','mapa'],
    },

    openFitness: {
      english: ['open fitness','fitness app','open fit','my fitness'],
      taglish:  ['buksan ang fitness','fitness app','buksan ang fit'],
      tagalog:  ['buksan ang fitness','fitness'],
    },

    logWorkout: {
      english: ['log workout','log my workout','add workout','record workout','i worked out','i exercised','log exercise'],
      taglish:  ['mag-log ng workout','i-log ang workout','nag-workout na ako','nag-ehersisyo'],
      tagalog:  ['i-log ang ehersisyo','nag-ehersisyo ako','i-record ang workout'],
    },

    logWeight: {
      english: ['log weight','log my weight','i weigh','my weight is','update weight'],
      taglish:  ['i-log ang timbang','ang timbang ko','mag-log ng weight'],
      tagalog:  ['i-log ang timbang ko','ang bigat ko'],
    },

    logWater: {
      english: ['log water','drank water','log my water','water intake','update water'],
      taglish:  ['i-log ang tubig','uminom ng tubig','mag-log ng water'],
      tagalog:  ['i-log ang tubig','uminom ako ng tubig'],
    },

    fitnessStats: {
      english: ['fitness stats','my stats','show my stats','check my stats','my bmi','my tdee','my bmr','body stats','fitness data'],
      taglish:  ['fitness stats','aking stats','aking bmi','aking tdee','body stats'],
      tagalog:  ['fitness stats','mga stats ko','aking bmi','aking tdee'],
    },

    fitnessProgress: {
      english: ['my progress','show progress','fitness progress','workout history','my history'],
      taglish:  ['aking progress','show progress','workout history'],
      tagalog:  ['aking pag-unlad','kasaysayan ng workout'],
    },

    fitnessNutrition: {
      english: ['log nutrition','log meal','add meal','nutrition','my macros','log food','calorie intake'],
      taglish:  ['i-log ang pagkain','macros ko','calorie ko','log meal'],
      tagalog:  ['i-log ang pagkain','mga macros ko'],
    },

    fitnessDashboard: {
      english: ['fitness dashboard','dashboard','today fitness','daily overview'],
      taglish:  ['fitness dashboard','overview ngayon'],
      tagalog:  ['fitness dashboard'],
    },

    navigateTo: {
      english: ['how to go to','directions to','navigate to','take me to','go to','how do i get to','route to','find route'],
      taglish:  ['paano pumunta sa','paano makarating sa','directions to','navigate to','saan ang','hanapin ang daan papunta sa','go to'],
      tagalog:  ['paano pumunta sa','paano makarating sa','hanapin ang daan papunta sa','direksyon papunta sa','saan naroon ang'],
    },

    dialContact: {
      english: ['call','dial','contact','phone'],
      taglish:  ['tawagan','i-call','i-dial','tumawag'],
      tagalog:  ['tawagan','tumawag kay','i-call'],
    },

    hello: {
      english: ['hello','hey','hi kai'],
      taglish:  ['hello','hey','kumusta','oy kai'],
      tagalog:  ['kumusta','magandang araw','helo'],
    },
  };

  // Helper — checks if msg matches any keyword for the given intent + active language
  const is = (intent) => (intents[intent][lang] || []).some(k => msg.includes(k));

  // ── Wrong-language detection ──────────────────────────────────
  // Check if msg matches a *different* language's keywords
  const otherLangs = ['english','taglish','tagalog'].filter(l => l !== lang);
  const matchesOtherLang = (intent) =>
    otherLangs.some(l => (intents[intent][l] || []).some(k => msg.includes(k)));
  const anyOtherLangMatch = Object.keys(intents).some(i => matchesOtherLang(i));

  const wrongLangMsg = {
    english: "I only recognize English commands right now. Go to Settings to change the input language.",
    taglish:  "I only recognize Taglish commands right now. Go to Settings to change the input language.",
    tagalog:  "I only recognize Tagalog commands right now. Go to Settings to change the input language.",
  };

  // ── Route intents ─────────────────────────────────────────────
  if (is('sendMoney')) {
    if (kaiSettings.childLock) {
      respond("Sorry, financial guides are currently restricted. Ask a parent or guardian to turn off Child Lock in KAI Settings.");
      return;
    }
    respond("Sure! Follow the highlights — I'll guide you step by step to send money safely.", () => startGuide(sendMoneyFlow));
  }
  else if (is('receiveMoney')) {
    if (kaiSettings.childLock) {
      respond("Sorry, financial guides are currently restricted. Ask a parent or guardian to turn off Child Lock in KAI Settings.");
      return;
    }
    respond("Sure! I'll guide you on how to activate your QR code so people can send you money!", () => {
      openApp('gcash');
      setTimeout(() => startGuide(receiveMoneyFlow), 700);
    });
  }
  else if (is('uploadPhoto'))  respond("Sure! I'll guide you step by step on how to upload a photo on Facebook!", () => startGuide(uploadPhotoFlow));
  else if (is('shopee')) {
    if (kaiSettings.strictness) {
      respond("Shopping mode with recommendations! I'll find products AND suggest the best one based on ratings and sales. Let's go!", () => startGuide(shopGuideStrict));
    } else {
      respond("Sure! I'll guide you through Shopee so you can find what you need.", () => startGuide(shopGuideBasic));
    }
  }
  else if (is('reactPost'))    respond("Sure! I'll show you how to react to a Facebook post step by step!", () => startGuide(reactPostFlow));
  else if (is('sharePost'))    respond("Let me guide you on how to share a Facebook post step by step!", () => startGuide(sharePostFlow));
  else if (is('openFacebook')) respond("Opening Facebook!", () => openApp('facebook'));
  else if (is('openGcash'))    respond("Opening GCash!", () => openApp('gcash'));
  else if (is('openGoogle'))   respond("Opening Google.", () => openApp('google'));
  else if (is('openYoutube'))  respond("Opening YouTube.", () => openApp('youtube'));
  else if (is('calculator'))   respond("Opening Calculator.", () => openApp('calculator'));
  else if (is('clock'))        respond("Opening Clock.", () => openApp('clock'));
  else if (is('wikipedia')) {
    const q = msg.replace(/wikipedia|buksan|ang|open/g,'').trim();
    respond("Opening Wikipedia." + (q ? ' Searching for ' + q + '.' : ''), () => {
      openApp('wikipedia');
      if (q) setTimeout(() => wikiSearch(q), 400);
    });
  }
  else if (is('time'))     respond("The current time is " + new Date().toLocaleString(undefined,{hour:'numeric',minute:'numeric'}));
  else if (is('date'))     respond("Today is " + new Date().toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric'}));
  else if (is('settings')) respond("Opening KAI Settings!", () => openKaiSettings());
  else if (is('goHome'))   respond("Going home.", goHome);
  else if (is('openContacts')) respond("Opening Contacts!", () => openApp('contacts'));
  else if (is('openMaps')) respond("Opening Maps!", () => openApp('maps'));
  else if (is('openFitness')) respond("Opening your Fitness app!", () => openApp('fitness'));
  else if (is('fitnessDashboard')) {
    respond("Opening your fitness dashboard!", () => {
      openApp('fitness');
      setTimeout(() => fitSetTab('dashboard'), 300);
      if (kaiSettings.strictness) setTimeout(() => startGuide(fitDashboardFlow), 500);
    });
  }
  else if (is('logWorkout')) {
    respond(kaiSettings.strictness
      ? "Let me guide you through logging your workout with smart intensity tips!"
      : "Sure! I'll guide you to log your workout step by step.",
      () => startGuide(fitWorkoutFlow));
  }
  else if (is('logWeight')) {
    // Try to extract weight number
    const numMatch = msg.match(/(\d+\.?\d*)\s*(kg|kilo|kilos)?/);
    const wVal = numMatch ? parseFloat(numMatch[1]) : null;
    respond(wVal ? `Logging your weight as ${wVal} kg!` : "Opening the weight log!", () => {
      openApp('fitness');
      setTimeout(() => {
        fitSetTab('body');
        fitOpenModal('modal-weight');
        if (wVal) { const el = document.getElementById('modal-weight-val'); if (el) el.value = wVal; }
      }, 400);
    });
  }
  else if (is('logWater')) {
    respond("Opening water tracker to log your intake!", () => {
      openApp('fitness');
      setTimeout(() => fitOpenModal('modal-water'), 400);
    });
  }
  else if (is('fitnessStats')) {
    respond(kaiSettings.strictness
      ? "Pulling up your body stats with KAI analysis!"
      : "Opening your body stats!",
      () => startGuide(fitBodyStatsFlow));
  }
  else if (is('fitnessNutrition')) {
    respond(kaiSettings.strictness
      ? "Let's check your macros and caloric balance — I'll highlight what needs attention!"
      : "Opening nutrition tracker!",
      () => startGuide(fitNutritionFlow));
  }
  else if (is('fitnessProgress')) {
    respond("Opening your fitness progress and workout history!", () => {
      openApp('fitness');
      setTimeout(() => fitSetTab('stats'), 400);
    });
  }
  else if (is('navigateTo')) {
    const stripPhrases = [
      'how to go to','directions to','navigate to','take me to','how do i get to',
      'route to','find route to','paano pumunta sa','paano makarating sa',
      'hanapin ang daan papunta sa','direksyon papunta sa','saan naroon ang',
      'go to','saan ang',
    ];
    let dest = msg;
    stripPhrases.forEach(w => {
      dest = dest.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'), '');
    });
    dest = dest.trim();
    if (!dest) {
      respond("Where would you like to go? Try saying 'how to go to Morayta' or 'navigate to Ayala'.");
      return;
    }
    if (kaiSettings.strictness) {
      respond(`Opening Maps for ${dest}! I'll show the route AND suggest the cheapest, traffic-free transport. 🗺️`, () => {
        mapsNavigateTo(dest);
        setTimeout(() => startGuide(mapsNavGuide(dest)), 1300);
      });
    } else {
      respond(`Sure! Opening Maps and finding directions to ${dest}. I'll guide you!`, () => {
        mapsNavigateTo(dest);
        setTimeout(() => startGuide(mapsNavGuide(dest)), 1300);
      });
    }
  }
  else if (is('dialContact')) {
    // Extract name from message by stripping trigger words
    const stripWords = ['call','dial','contact','phone','tawagan','i-call','i-dial','tumawag','tumawag kay','tawagan','please','pls','can you','si'];
    let nameQuery = msg;
    stripWords.forEach(w => { nameQuery = nameQuery.replace(new RegExp('\\b' + w + '\\b','gi'), ''); });
    nameQuery = nameQuery.trim();
    if (!nameQuery) {
      respond("Who would you like to call? Try saying 'call Ana Santos'.");
      return;
    }
    const match = contacts.find(c => c.name.toLowerCase().includes(nameQuery));
    if (match) {
      respond(`Calling ${match.name}!`, () => {
        openApp('contacts');
        setTimeout(() => startCall(match), 400);
      });
    } else {
      respond(`I couldn't find "${nameQuery}" in your contacts. Try opening Contacts to find the right name.`);
    }
  }
  else if (is('hello')) {
    respond("Hello! I'm KAI. How may I help you?");
  }
  else if (anyOtherLangMatch) {
    respond(wrongLangMsg[lang]);
  }
  else {
    // In chat mode → ask Gemini as a fallback for general questions
    if (fromChat) {
      askGemini(msg);
    } else {
      respond("I didn't catch that. Try: 'send money', 'open GCash', or 'upload a photo'.");
    }
  }
}

/* ═══════════════════════════════════
   GEMINI AI FALLBACK (Chat Mode Only)
═══════════════════════════════════ */
async function askGemini(userMsg) {
  setKaiStatus('THINKING...');

  // Show a typing indicator bubble
  const history = document.getElementById('kai-chat-history');
  const typing = document.createElement('div');
  typing.className = 'kai-chat-msg kai kai-typing';
  typing.innerHTML = '<span class="kai-chat-label">K·A·I</span><span class="kai-typing-dots"><span>.</span><span>.</span><span>.</span></span>';
  history.appendChild(typing);
  history.scrollTop = history.scrollHeight;

  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg })
    });
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    const reply = data.reply || "I'm not sure about that.";
    typing.remove();
    appendChatMsg(reply, 'kai');
  } catch (err) {
    typing.remove();
    appendChatMsg("Sorry, I couldn't connect right now. Please try again.", 'kai');
  }

  setKaiStatus('READY');
}


/* ═══════════════════════════════════
   FITNESS APP
═══════════════════════════════════ */

// ── State ──────────────────────────
let fitnessData = {
  profile: { age: 22, heightCm: 170, weightKg: 68, gender: 'male', goal: 'muscle', activity: 'moderate' },
  today: { steps: 7840, caloriesBurned: 420, activeMin: 52, waterGlasses: 6 },
  vitals: { restingHR: 63, hrv: 44, sleepHrs: 7.5, sleepQuality: 'good' },
  workouts: [
    { date: 'Mon', type: 'strength', icon: '🏋️', duration: 55, intensity: 'high',   kcal: 380, notes: 'Chest & Triceps — Bench 3x8@80kg' },
    { date: 'Tue', type: 'cardio',   icon: '🏃', duration: 30, intensity: 'moderate',kcal: 260, notes: 'Treadmill 5km' },
    { date: 'Thu', type: 'hiit',     icon: '⚡', duration: 25, intensity: 'high',   kcal: 310, notes: 'Tabata core circuit' },
    { date: 'Sat', type: 'strength', icon: '🏋️', duration: 60, intensity: 'high',   kcal: 420, notes: 'Back & Biceps — Deadlift 3x5@100kg' },
  ],
  weightLog: [
    { date: '02/10', kg: 69.2 },
    { date: '02/17', kg: 68.8 },
    { date: '02/24', kg: 68.5 },
    { date: '03/03', kg: 68.1 },
    { date: '03/09', kg: 67.8 },
  ],
  nutrition: { calories: 1850, protein: 148, carbs: 210, fat: 52, fiber: 28, target: { calories: 2200, protein: 170, carbs: 240, fat: 60, fiber: 35 } },
  prs: [
    { name: 'Bench Press', val: '100 kg × 1' },
    { name: 'Squat',       val: '120 kg × 1' },
    { name: 'Deadlift',    val: '140 kg × 1' },
    { name: '5km Run',     val: '24:10 min' },
  ],
};
let fitCurrentTab = 'dashboard';
let fitWorkoutIntensity = 'low';
let fitSleepQuality = 'fair';
let fitWaterModal = 6;
let fitGender = 'male';

// ── Open / Init ────────────────────
function fitInit() {
  fitRenderDashboard();
  fitRenderWorkoutHistory();
  fitUpdateBodyStats();
  fitRenderNutrition();
  fitRenderStats();
  fitSetTab('dashboard');
  // Set today's date
  const el = document.getElementById('fit-dash-date');
  if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }).toUpperCase();
  // Pre-set modal date
  const dateEl = document.getElementById('modal-weight-date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
  // Build water modal buttons
  const bEl = document.getElementById('modal-water-btns');
  if (bEl) {
    bEl.innerHTML = [1,2,3,4,5,6,7,8,9,10,11,12].map(n =>
      `<button class="fit-water-num-btn ${n===fitWaterModal?'selected':''}" onclick="fitSelectWater(${n},this)">${n}</button>`
    ).join('');
  }
  // Show smart banner if enabled
  if (kaiSettings.strictness) fitShowSmartBanner();
}

function fitOpenKai() { openApp('kai'); }

// ── Tab system ─────────────────────
function fitSetTab(tab) {
  fitCurrentTab = tab;
  document.querySelectorAll('.fit-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.fit-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('fit-panel-' + tab)?.classList.add('active');
  document.getElementById('fit-nav-' + tab)?.classList.add('active');
}

// ── Dashboard ──────────────────────
function fitRenderDashboard() {
  const d = fitnessData.today;
  // Rings
  fitAnimateRing('fit-ring-cal',   'fit-ring-cal-val',    d.caloriesBurned, 600, d.caloriesBurned);
  fitAnimateRing('fit-ring-steps', 'fit-ring-steps-val',  d.steps,          10000, d.steps);
  fitAnimateRing('fit-ring-active','fit-ring-active-val', d.activeMin,      60, d.activeMin);

  // Vitals
  const v = fitnessData.vitals;
  document.getElementById('fit-vital-hr').textContent    = v.restingHR + ' bpm';
  document.getElementById('fit-vital-hrv').textContent   = v.hrv + ' ms';
  document.getElementById('fit-vital-sleep').textContent = v.sleepHrs + ' h';
  document.getElementById('fit-vital-water').textContent = d.waterGlasses + '/8 gl';

  // HR zones based on age
  const p = fitnessData.profile;
  const maxHR = 220 - p.age;
  const zones = [
    { name:'Zone 1 – Recovery',  pct:[50,60], color:'#74b9ff' },
    { name:'Zone 2 – Fat Burn',  pct:[60,70], color:'#00b894' },
    { name:'Zone 3 – Aerobic',   pct:[70,80], color:'#f9ca24' },
    { name:'Zone 4 – Threshold', pct:[80,90], color:'#e17055' },
    { name:'Zone 5 – VO₂ Max',   pct:[90,100],color:'#d63031' },
  ];
  const hzList = document.getElementById('fit-hz-list');
  if (hzList) {
    hzList.innerHTML = zones.map(z => {
      const lo = Math.round(maxHR * z.pct[0] / 100);
      const hi = Math.round(maxHR * z.pct[1] / 100);
      const barW = (z.pct[1] - z.pct[0]) * 2; // visual width
      return `<div class="fit-hz-item">
        <div class="fit-hz-dot" style="background:${z.color}"></div>
        <div class="fit-hz-name">${z.name}</div>
        <div class="fit-hz-bar-wrap"><div class="fit-hz-bar" style="width:${barW}%;background:${z.color}"></div></div>
        <div class="fit-hz-range">${lo}–${hi}</div>
      </div>`;
    }).join('');
  }

  if (kaiSettings.strictness) fitShowSmartBanner();
}

function fitAnimateRing(ringId, valId, value, max, display) {
  const circ = 201; // 2π × 32
  const pct = Math.min(value / max, 1);
  const el = document.getElementById(ringId);
  const vEl = document.getElementById(valId);
  if (el) setTimeout(() => { el.style.strokeDasharray = `${pct * circ} ${circ}`; }, 200);
  if (vEl) vEl.textContent = display >= 1000 ? (display/1000).toFixed(1)+'k' : display;
}

// ── Smart Banner ───────────────────
function fitShowSmartBanner() {
  const banner = document.getElementById('fit-smart-banner');
  const msg    = document.getElementById('fit-smart-banner-msg');
  if (!banner || !msg) return;
  banner.style.display = 'block';
  msg.innerHTML = fitGenerateSmartCoaching().join('<br>');
}

function fitGenerateSmartCoaching() {
  const p = fitnessData.profile;
  const n = fitnessData.nutrition;
  const v = fitnessData.vitals;
  const tips = [];
  const bmi = p.weightKg / Math.pow(p.heightCm / 100, 2);
  const bmr = p.gender === 'male'
    ? 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5
    : 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161;
  const actMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, extreme:1.9 };
  const tdee = Math.round(bmr * (actMult[p.activity] || 1.55));
  const protTarget = Math.round(p.weightKg * 2.2);
  const deficit = tdee - n.calories;

  // BMI check
  if (bmi < 18.5) tips.push(`⚠️ BMI ${bmi.toFixed(1)} — Underweight. Aim to eat in a ~300 kcal surplus daily.`);
  else if (bmi < 25) tips.push(`✅ BMI ${bmi.toFixed(1)} — Healthy range. Keep it up!`);
  else if (bmi < 30) tips.push(`⚠️ BMI ${bmi.toFixed(1)} — Slightly overweight. Target a ~300–500 kcal deficit.`);
  else tips.push(`🔴 BMI ${bmi.toFixed(1)} — Obese range. Prioritize cardio 3–4×/week + caloric deficit.`);

  // Caloric balance
  if (Math.abs(deficit) < 100) tips.push(`⚖️ You're eating at maintenance (${n.calories} vs TDEE ${tdee} kcal). Perfect for recomp.`);
  else if (deficit > 0) tips.push(`🔥 Deficit of ${deficit} kcal today — good for fat loss${deficit > 700 ? ', but don\'t go below 500 consistently' : ''}!`);
  else tips.push(`💪 Surplus of ${Math.abs(deficit)} kcal — good for muscle gain${Math.abs(deficit) > 600 ? ', consider trimming fat intake' : ''}!`);

  // Protein
  if (n.protein < protTarget * 0.8) tips.push(`🥩 Protein ${n.protein}g — too low for muscle gain. Target ${protTarget}g (2.2×BW).`);
  else if (n.protein >= protTarget) tips.push(`💪 Protein ${n.protein}g — on target! Muscle synthesis is supported.`);

  // Water
  if (fitnessData.today.waterGlasses < 6) tips.push(`💧 Only ${fitnessData.today.waterGlasses} glasses today — aim for 8+.`);

  // Sleep
  if (v.sleepHrs < 7) tips.push(`😴 ${v.sleepHrs}h sleep — under the 7–9h target. Poor sleep raises cortisol & kills gains.`);
  else if (v.sleepHrs >= 8) tips.push(`😴 ${v.sleepHrs}h sleep — excellent recovery!`);

  // Workout frequency
  const recent = fitnessData.workouts.length;
  if (recent < 3) tips.push(`📅 Only ${recent} workouts logged this week. Target 4–5 sessions for optimal progress.`);

  return tips.slice(0, 4); // max 4 tips
}

// ── Workout ────────────────────────
function fitSetIntensity(val, btn) {
  fitWorkoutIntensity = val;
  document.querySelectorAll('#fit-intensity-row .fit-int-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function fitLogWorkout() {
  const type     = document.getElementById('fit-wk-type').value;
  const duration = parseInt(document.getElementById('fit-wk-duration').value) || 45;
  const notes    = document.getElementById('fit-wk-notes').value || '';
  const typeIcons = { strength:'🏋️', cardio:'🏃', hiit:'⚡', yoga:'🧘', cycling:'🚴', swimming:'🏊', sports:'⚽' };
  const kcalMap   = { strength:6, cardio:8, hiit:10, yoga:3, cycling:7, swimming:9, sports:7 };
  const intMult   = { low:0.8, moderate:1.0, high:1.25 };
  const kcal = Math.round(duration * (kcalMap[type] || 7) * (intMult[fitWorkoutIntensity] || 1));
  const today = new Date().toLocaleDateString('en-US',{weekday:'short'});
  fitnessData.workouts.unshift({ date:today, type, icon:typeIcons[type]||'🏋️', duration, intensity:fitWorkoutIntensity, kcal, notes });
  fitnessData.today.caloriesBurned += kcal;
  fitnessData.today.activeMin      += duration;
  fitRenderWorkoutHistory();
  fitRenderDashboard();
  fitRenderStats();
  showToast(`✅ ${typeIcons[type]} Workout logged — ${kcal} kcal burned!`);
  speak(`Workout logged! You burned ${kcal} calories. Great job!`);
  if (kaiSettings.strictness) fitShowSmartBanner();
}

function fitRenderWorkoutHistory() {
  const el = document.getElementById('fit-wk-history');
  if (!el) return;
  if (!fitnessData.workouts.length) { el.innerHTML = '<p style="color:rgba(255,255,255,.3);font-size:11px;text-align:center;padding:12px">No workouts yet. Log your first one!</p>'; return; }
  el.innerHTML = fitnessData.workouts.slice(0, 6).map(w => `
    <div class="fit-wk-item">
      <div class="fit-wk-icon">${w.icon}</div>
      <div class="fit-wk-info">
        <div class="fit-wk-name">${w.type.charAt(0).toUpperCase()+w.type.slice(1)} — ${w.intensity} intensity</div>
        <div class="fit-wk-sub">${w.date} · ${w.duration} min${w.notes ? ' · ' + w.notes : ''}</div>
      </div>
      <div class="fit-wk-kcal">${w.kcal} kcal</div>
    </div>
  `).join('');
}

function fitCalc1RM() {
  const w = parseFloat(document.getElementById('fit-1rm-weight').value);
  const r = parseInt(document.getElementById('fit-1rm-reps').value);
  if (!w || !r) return;
  // Epley formula
  const epley   = w * (1 + r / 30);
  const brzycki = w * (36 / (37 - r));
  const mayhew  = (100 * w) / (52.2 + 41.9 * Math.exp(-0.055 * r));
  const avg = (epley + brzycki + mayhew) / 3;
  const el = document.getElementById('fit-1rm-result');
  if (el) {
    el.className = 'fit-calc-result show';
    el.innerHTML = `
      <div style="color:#f9ca24;margin-bottom:4px">Estimated 1RM</div>
      Epley:   ${epley.toFixed(1)} kg<br>
      Brzycki: ${brzycki.toFixed(1)} kg<br>
      Mayhew:  ${mayhew.toFixed(1)} kg<br>
      <strong style="color:#2ecc71">Average: ${avg.toFixed(1)} kg</strong><br>
      <span style="color:rgba(255,255,255,.4);font-size:10px">90% = ${(avg*.9).toFixed(1)}kg · 85% = ${(avg*.85).toFixed(1)}kg · 80% = ${(avg*.8).toFixed(1)}kg</span>
    `;
  }
}

// ── Body ───────────────────────────
function fitSetGender(g, btn) {
  fitGender = g;
  fitnessData.profile.gender = g;
  document.querySelectorAll('.fit-gender-row .fit-int-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const hipRow = document.getElementById('fit-bf-hip-row');
  if (hipRow) hipRow.style.display = g === 'female' ? 'flex' : 'none';
  fitUpdateBodyStats();
}

function fitUpdateBodyStats() {
  const age  = parseInt(document.getElementById('fit-p-age')?.value)    || fitnessData.profile.age;
  const h    = parseInt(document.getElementById('fit-p-height')?.value) || fitnessData.profile.heightCm;
  const w    = parseFloat(document.getElementById('fit-p-weight')?.value) || fitnessData.profile.weightKg;
  const act  = document.getElementById('fit-p-activity')?.value         || fitnessData.profile.activity;
  const g    = fitGender;
  fitnessData.profile = { ...fitnessData.profile, age, heightCm:h, weightKg:w, activity:act, gender:g };

  const bmi  = w / Math.pow(h / 100, 2);
  const bmr  = g === 'male' ? 10*w + 6.25*h - 5*age + 5 : 10*w + 6.25*h - 5*age - 161;
  const actMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, extreme:1.9 };
  const tdee = Math.round(bmr * (actMult[act] || 1.55));
  const bmiClass = bmi < 18.5 ? ['Underweight','badge-yellow'] : bmi < 25 ? ['Normal','badge-green'] : bmi < 30 ? ['Overweight','badge-yellow'] : ['Obese','badge-red'];
  const lbm  = w * (1 - 0.15); // rough LBM estimate
  const ffmi = lbm / Math.pow(h / 100, 2);
  const protTarget = Math.round(w * 2.2);

  const grid = document.getElementById('fit-metrics-grid');
  if (grid) {
    grid.innerHTML = [
      { icon:'⚖️', val:bmi.toFixed(1), unit:'', label:'BMI', badge:bmiClass },
      { icon:'🔥', val:Math.round(bmr),  unit:' kcal', label:'BMR / day', badge:['Basal','badge-blue'] },
      { icon:'⚡', val:tdee,             unit:' kcal', label:'TDEE / day', badge:['Maintenance','badge-blue'] },
      { icon:'💪', val:protTarget,        unit:' g',   label:'Protein Target', badge:['Recommended','badge-green'] },
      { icon:'📏', val:ffmi.toFixed(1),  unit:'',      label:'FFMI', badge: ffmi >= 25 ? ['Elite','badge-green'] : ['Natural','badge-blue'] },
      { icon:'🧬', val:(w*1000/h).toFixed(1), unit:'', label:'Ponderal Index', badge:['Ratio','badge-blue'] },
    ].map(m => `
      <div class="fit-metric-card">
        <div class="fit-metric-icon">${m.icon}</div>
        <div class="fit-metric-val">${m.val}<span>${m.unit}</span></div>
        <div class="fit-metric-label">${m.label}</div>
        <div class="fit-metric-badge ${m.badge[1]}">${m.badge[0]}</div>
      </div>
    `).join('');
  }

  // Weight chart
  fitRenderWeightChart();
  // Energy panel
  fitRenderEnergyPanel(Math.round(bmr), tdee);
  if (kaiSettings.strictness) fitShowSmartBanner();
}

function fitCalcBodyFat() {
  const waist = parseFloat(document.getElementById('fit-bf-waist').value);
  const neck  = parseFloat(document.getElementById('fit-bf-neck').value);
  const h     = fitnessData.profile.heightCm;
  const g     = fitGender;
  let bf;
  if (g === 'male') {
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450;
  } else {
    const hip = parseFloat(document.getElementById('fit-bf-hip').value) || 95;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(h)) - 450;
  }
  bf = Math.max(2, Math.min(60, bf));
  const w = fitnessData.profile.weightKg;
  const lbm = w * (1 - bf/100);
  const fatMass = w * bf / 100;
  const category = bf < (g==='male'?6:14) ? '🔵 Essential Fat' : bf < (g==='male'?14:21) ? '🟢 Athletic' : bf < (g==='male'?18:25) ? '🟢 Fitness' : bf < (g==='male'?25:32) ? '🟡 Average' : '🔴 Obese';
  const el = document.getElementById('fit-bf-result');
  if (el) {
    el.className = 'fit-calc-result show';
    el.innerHTML = `Body Fat: <strong style="color:#f9ca24">${bf.toFixed(1)}%</strong> — ${category}<br>Fat Mass: ${fatMass.toFixed(1)} kg<br>Lean Mass: ${lbm.toFixed(1)} kg`;
  }
}

function fitRenderWeightChart() {
  const el = document.getElementById('fit-weight-chart');
  if (!el || !fitnessData.weightLog.length) return;
  const logs = fitnessData.weightLog.slice(-7);
  const vals = logs.map(l => l.kg);
  const minV = Math.min(...vals) - 1;
  const maxV = Math.max(...vals) + 1;
  const maxH = 55;
  el.innerHTML = `
    <div class="fit-wt-bar-row">${vals.map(v => {
      const h = Math.round((v - minV) / (maxV - minV) * maxH) + 5;
      return `<div class="fit-wt-bar" style="height:${h}px" title="${v}kg"></div>`;
    }).join('')}</div>
    <div class="fit-wt-labels">${logs.map(l => `<div class="fit-wt-label">${l.date}<br><span style="color:rgba(255,255,255,.55)">${l.kg}</span></div>`).join('')}</div>
  `;
}

// ── Nutrition ──────────────────────
function fitLogNutrition() {
  const cal  = parseFloat(document.getElementById('fit-n-cal').value)     || 0;
  const prot = parseFloat(document.getElementById('fit-n-protein').value) || 0;
  const carb = parseFloat(document.getElementById('fit-n-carbs').value)   || 0;
  const fat  = parseFloat(document.getElementById('fit-n-fat').value)     || 0;
  const fib  = parseFloat(document.getElementById('fit-n-fiber').value)   || 0;
  fitnessData.nutrition.calories += cal;
  fitnessData.nutrition.protein  += prot;
  fitnessData.nutrition.carbs    += carb;
  fitnessData.nutrition.fat      += fat;
  fitnessData.nutrition.fiber    += fib;
  fitRenderNutrition();
  fitRenderDashboard();
  showToast(`🥗 Meal logged — ${cal} kcal added!`);
  if (kaiSettings.strictness) fitShowSmartBanner();
}

function fitRenderNutrition() {
  const n  = fitnessData.nutrition;
  const t  = n.target;
  const el = document.getElementById('fit-cal-balance');
  if (el) {
    const p = Math.min(n.calories / t.calories * 100, 100);
    const surplus = n.calories - t.calories;
    const color = Math.abs(surplus) < 100 ? '#2ecc71' : surplus > 0 ? '#e17055' : '#00cec9';
    el.innerHTML = `
      <div class="fit-cal-bal-row">
        <span class="fit-cal-bal-title">Calories Today</span>
        <span class="fit-cal-bal-val" style="color:${color}">${n.calories} <span style="font-size:11px;color:rgba(255,255,255,.35)">/ ${t.calories} kcal</span></span>
      </div>
      <div class="fit-cal-bal-bar"><div class="fit-cal-bal-fill" style="width:${p}%;background:${color}"></div></div>
      <div style="font-size:10px;color:rgba(255,255,255,.35);font-family:'Share Tech Mono',monospace;margin-top:5px">
        ${Math.abs(surplus) < 100 ? '⚖️ At maintenance' : surplus > 0 ? `🔺 Surplus +${surplus} kcal` : `🔻 Deficit ${Math.abs(surplus)} kcal`}
      </div>
    `;
  }
  const mb = document.getElementById('fit-macro-bars');
  if (mb) {
    const macros = [
      { name:'Protein', cur:n.protein, tgt:t.protein, unit:'g', color:'#e17055' },
      { name:'Carbohydrates', cur:n.carbs, tgt:t.carbs, unit:'g', color:'#f9ca24' },
      { name:'Fat', cur:n.fat, tgt:t.fat, unit:'g', color:'#74b9ff' },
      { name:'Fiber', cur:n.fiber, tgt:t.fiber, unit:'g', color:'#2ecc71' },
    ];
    mb.innerHTML = macros.map(m => {
      const p = Math.min(m.cur / m.tgt * 100, 100);
      return `<div class="fit-macro-bar-row">
        <div class="fit-macro-top"><span class="fit-macro-name">${m.name}</span><span class="fit-macro-nums">${m.cur}${m.unit} / ${m.tgt}${m.unit}</span></div>
        <div class="fit-macro-track"><div class="fit-macro-fill" style="width:${p}%;background:${m.color}"></div></div>
      </div>`;
    }).join('');
  }
  // Water tracker
  const wt = document.getElementById('fit-water-tracker');
  if (wt) {
    const glasses = fitnessData.today.waterGlasses;
    wt.innerHTML = `
      <div class="fit-water-glasses">${Array.from({length:8},(_,i)=>`<div class="fit-water-glass ${i<glasses?'filled':''}" onclick="fitToggleWaterGlass(${i})">💧</div>`).join('')}</div>
      <div class="fit-water-info">${glasses}/8 glasses (${(glasses*250)}ml) today</div>
    `;
  }
  // Energy panel
  const p = fitnessData.profile;
  const bmr = p.gender === 'male' ? 10*p.weightKg + 6.25*p.heightCm - 5*p.age + 5 : 10*p.weightKg + 6.25*p.heightCm - 5*p.age - 161;
  const actMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, extreme:1.9 };
  fitRenderEnergyPanel(Math.round(bmr), Math.round(bmr * (actMult[p.activity] || 1.55)));
}

function fitRenderEnergyPanel(bmr, tdee) {
  const p = fitnessData.profile;
  const goal = document.getElementById('fit-p-goal')?.value || p.goal;
  const targets = { cut: tdee - 400, muscle: tdee + 250, maintain: tdee, endurance: tdee + 100 };
  const goalTarget = targets[goal] || tdee;
  const ep = document.getElementById('fit-energy-panel');
  if (ep) ep.innerHTML = [
    { label:'BMR', val:bmr,        sub:'Basal — at rest' },
    { label:'TDEE', val:tdee,       sub:'Total daily burn' },
    { label:'TARGET', val:goalTarget, sub:'For your goal' },
    { label:'SURPLUS', val:fitnessData.nutrition.calories - tdee > 0 ? '+' + (fitnessData.nutrition.calories - tdee) : (fitnessData.nutrition.calories - tdee), sub:'Today\'s balance' },
  ].map(e => `<div class="fit-energy-card">
    <div class="fit-energy-label">${e.label}</div>
    <div class="fit-energy-val">${e.val}</div>
    <div class="fit-energy-sub">${e.sub}</div>
  </div>`).join('');
}

function fitToggleWaterGlass(i) {
  fitnessData.today.waterGlasses = i + 1;
  fitRenderNutrition();
  fitRenderDashboard();
  if (kaiSettings.strictness) fitShowSmartBanner();
}

// ── Stats ──────────────────────────
function fitRenderStats() {
  const wks = fitnessData.workouts;
  const totalWk = wks.length;
  const totalKcal = wks.reduce((s,w) => s + w.kcal, 0);
  const totalMin  = wks.reduce((s,w) => s + w.duration, 0);
  const streak    = Math.min(totalWk, 7);
  const p = fitnessData.profile;

  const pg = document.getElementById('fit-perf-grid');
  if (pg) pg.innerHTML = [
    { icon:'🏋️', val:totalWk,              label:'Workouts Logged' },
    { icon:'🔥', val:totalKcal + ' kcal',  label:'Total Burned' },
    { icon:'⏱️', val:totalMin + ' min',    label:'Total Active Time' },
    { icon:'🔥', val:streak + ' days',     label:'Current Streak' },
  ].map(c => `<div class="fit-perf-card"><div class="fit-perf-icon">${c.icon}</div><div class="fit-perf-val">${c.val}</div><div class="fit-perf-label">${c.label}</div></div>`).join('');

  // Volume chart (7 days)
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const volByDay = days.map(d => {
    const ws = wks.filter(w => w.date === d);
    return ws.reduce((s,w) => s + w.duration, 0);
  });
  const maxVol = Math.max(...volByDay, 1);
  const vc = document.getElementById('fit-vol-chart');
  if (vc) vc.innerHTML = `
    <div class="fit-vol-bars">${volByDay.map(v => `<div class="fit-vol-bar" style="height:${Math.round(v/maxVol*65)+4}px" title="${v}min"></div>`).join('')}</div>
    <div class="fit-vol-day-row">${days.map(d => `<div class="fit-vol-day">${d}</div>`).join('')}</div>
  `;

  // VO2 max (Uth–Sørensen formula, simplified)
  const v = fitnessData.vitals;
  const maxHR = 220 - p.age;
  const vo2 = 15 * (maxHR / v.restingHR);
  const vo2Class = vo2 < 35 ? '🔴 Poor' : vo2 < 42 ? '🟡 Fair' : vo2 < 50 ? '🟢 Good' : vo2 < 57 ? '🔵 Excellent' : '🏆 Superior';
  const vc2 = document.getElementById('fit-vo2-card');
  if (vc2) vc2.innerHTML = `<div class="fit-vo2-val">${vo2.toFixed(1)}</div><div class="fit-vo2-unit">mL/kg/min</div><div class="fit-vo2-class">${vo2Class} for your age group</div>`;

  // PRs
  const pr = document.getElementById('fit-pr-list');
  if (pr) pr.innerHTML = fitnessData.prs.map(p => `<div class="fit-pr-item"><span class="fit-pr-name">${p.name}</span><span class="fit-pr-val">${p.val}</span></div>`).join('');

  // Recovery score
  const sleep = v.sleepHrs;
  const hrv   = v.hrv;
  const wkFreq = totalWk;
  let score = 50;
  score += (sleep >= 7 && sleep <= 9) ? 20 : sleep < 6 ? -15 : 5;
  score += hrv > 50 ? 20 : hrv > 40 ? 10 : 0;
  score += wkFreq <= 4 ? 10 : -5;
  score = Math.min(100, Math.max(0, score));
  const rColor = score >= 80 ? '#2ecc71' : score >= 60 ? '#f9ca24' : '#e17055';
  const rc = document.getElementById('fit-recovery-card');
  if (rc) rc.innerHTML = `
    <div class="fit-recovery-score" style="color:${rColor}">${score}</div>
    <div class="fit-recovery-bar"><div class="fit-recovery-fill" style="width:${score}%;background:${rColor}"></div></div>
    <div class="fit-recovery-label">${score>=80?'🟢 Ready to train hard!':score>=60?'🟡 Light to moderate session ok':'🔴 Rest day recommended — prioritize sleep & nutrition'}</div>
  `;
}

// ── Modals ─────────────────────────
function fitOpenModal(id) {
  document.getElementById('fit-modal-overlay')?.classList.add('open');
  document.getElementById(id)?.classList.add('open');
}
function fitCloseModal() {
  document.getElementById('fit-modal-overlay')?.classList.remove('open');
  document.querySelectorAll('.fit-modal').forEach(m => m.classList.remove('open'));
}

function fitSaveWeight() {
  const val  = parseFloat(document.getElementById('modal-weight-val').value);
  const date = document.getElementById('modal-weight-date').value;
  if (!val) return;
  const label = date ? new Date(date).toLocaleDateString('en-US',{month:'2-digit',day:'2-digit'}) : 'Today';
  fitnessData.weightLog.push({ date: label, kg: val });
  fitnessData.profile.weightKg = val;
  document.getElementById('fit-p-weight').value = val;
  fitUpdateBodyStats();
  fitCloseModal();
  showToast(`⚖️ Weight ${val} kg logged!`);
  speak(`Weight logged. ${val} kilograms.`);
}

function fitSelectWater(n, btn) {
  fitWaterModal = n;
  document.querySelectorAll('.fit-water-num-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}
function fitSaveWater() {
  fitnessData.today.waterGlasses = fitWaterModal;
  fitRenderNutrition();
  fitRenderDashboard();
  fitCloseModal();
  showToast(`💧 ${fitWaterModal} glasses of water logged!`);
  if (kaiSettings.strictness) fitShowSmartBanner();
}

function fitSetSleepQ(q, btn) {
  fitSleepQuality = q;
  document.querySelectorAll('#modal-sleep .fit-int-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function fitSaveSleep() {
  const hrs = parseFloat(document.getElementById('modal-sleep-hrs').value) || 7;
  fitnessData.vitals.sleepHrs     = hrs;
  fitnessData.vitals.sleepQuality = fitSleepQuality;
  fitRenderDashboard();
  fitRenderStats();
  fitCloseModal();
  showToast(`😴 ${hrs}h sleep logged (${fitSleepQuality})!`);
  if (kaiSettings.strictness) fitShowSmartBanner();
}

// ── KAI Guide Flows ────────────────
const fitDashboardFlow = [
  { targetId:'home-fitness-icon', viewId:'home-screen',
    message:"Let's open your Fitness app! Tap the 💪 icon.", tapToAdvance:true,
    onTap() { openApp('fitness'); } },
  { targetId:'fit-rings-row', viewId:'fitness-screen',
    message:"These are your activity rings — calories burned, steps, and active minutes. They fill as you hit your daily targets.", tapToAdvance:false, okLabel:'Got it →' },
  { targetId:'fit-vitals-row', viewId:'fitness-screen',
    message:"Your vitals: Resting Heart Rate, HRV (heart rate variability — measures recovery), sleep hours, and water intake.", tapToAdvance:false, okLabel:'Next →' },
  { targetId:'fit-hz-list', viewId:'fitness-screen',
    message:"Heart Rate Zones show which zone you train in, calculated from your age. Zone 2 is best for fat loss and endurance.", tapToAdvance:false, okLabel:'Done ✓' },
];

const fitWorkoutFlow = [
  { targetId:'home-fitness-icon', viewId:'home-screen',
    message:"Open your Fitness app first.", tapToAdvance:true,
    onTap() { openApp('fitness'); } },
  { targetId:'fit-nav-workout', viewId:'fitness-screen',
    message:"Tap the Workout tab at the bottom to log your session.", tapToAdvance:true,
    onTap() { fitSetTab('workout'); } },
  { targetId:'fit-wk-type', viewId:'fitness-screen',
    message:"Pick your workout type from the dropdown — Strength, Cardio, HIIT, and more.", tapToAdvance:false, okLabel:'Selected →' },
  { targetId:'fit-intensity-row', viewId:'fitness-screen',
    message:"Set the intensity. Higher intensity = more calories burned! For heavy lifting, pick High.", tapToAdvance:false, okLabel:'Set intensity →' },
  { targetId:'fit-save-btn', viewId:'fitness-screen',
    message:"Tap 'Log Workout' to save your session. KAI will calculate calories burned automatically.", tapToAdvance:false, okLabel:'Done ✓' },
];

const fitBodyStatsFlow = [
  { targetId:'home-fitness-icon', viewId:'home-screen',
    message:"Let's check your body stats! Open the Fitness app.", tapToAdvance:true,
    onTap() { openApp('fitness'); } },
  { targetId:'fit-nav-body', viewId:'fitness-screen',
    message:"Tap the Body tab to see your profile and computed metrics.", tapToAdvance:true,
    onTap() { fitSetTab('body'); } },
  { targetId:'fit-metrics-grid', viewId:'fitness-screen',
    message:"Your computed metrics: BMI, BMR (calories at rest), TDEE (total daily burn), protein target, and FFMI (muscle density index).", tapToAdvance:false, okLabel:'Got it →' },
  { targetId:'fit-nav-body', viewId:'fitness-screen',
    message:"Scroll down to use the Body Fat calculator (Navy method) — it uses waist, neck, and hip measurements for an accurate estimate.", tapToAdvance:false, okLabel:'Done ✓' },
];

const fitNutritionFlow = [
  { targetId:'home-fitness-icon', viewId:'home-screen',
    message:"Let's check your nutrition! Open the Fitness app.", tapToAdvance:true,
    onTap() { openApp('fitness'); } },
  { targetId:'fit-nav-nutrition', viewId:'fitness-screen',
    message:"Tap the Nutrition tab.", tapToAdvance:true,
    onTap() { fitSetTab('nutrition'); } },
  { targetId:'fit-cal-balance', viewId:'fitness-screen',
    message:"The calorie balance bar shows how much you've eaten vs your TDEE target. Green = at maintenance, blue = deficit, red = surplus.", tapToAdvance:false, okLabel:'Got it →' },
  { targetId:'fit-macro-bars', viewId:'fitness-screen',
    message:"Macro bars track Protein, Carbs, Fat, and Fiber vs your targets. Protein is the most important for muscle — aim to hit it every day!", tapToAdvance:false, okLabel:'Done ✓' },
];

/* ═══════════════════════════════════
   CONTACTS
═══════════════════════════════════ */
const contacts = [
  { name:'Alex Reyes',     phone:'+63 912 345 6789', emoji:'👨', color:'rgba(66,133,244,0.25)' },
  { name:'Ana Santos',     phone:'+63 917 234 5678', emoji:'👩', color:'rgba(255,100,150,0.25)' },
  { name:'Bea Villanueva', phone:'+63 921 876 5432', emoji:'👱‍♀️', color:'rgba(180,60,255,0.25)' },
  { name:'Carlo Dizon',    phone:'+63 908 123 4567', emoji:'🧑', color:'rgba(0,180,255,0.25)' },
  { name:'Diana Cruz',     phone:'+63 939 987 6543', emoji:'👩‍💼', color:'rgba(255,160,0,0.25)' },
  { name:'Eduardo Lim',    phone:'+63 995 567 8901', emoji:'👨‍💼', color:'rgba(0,200,130,0.25)' },
  { name:'Fatima Ramos',   phone:'+63 906 654 3210', emoji:'🧕', color:'rgba(255,80,80,0.25)' },
  { name:'Gabriel Torres', phone:'+63 918 432 1098', emoji:'👦', color:'rgba(100,200,255,0.25)' },
  { name:'Hannah Flores',  phone:'+63 927 765 4321', emoji:'👧', color:'rgba(255,180,220,0.25)' },
  { name:'Ivan Mendoza',   phone:'+63 945 321 6789', emoji:'🧔', color:'rgba(150,255,150,0.25)' },
  { name:'Jasmine Aquino', phone:'+63 932 111 2222', emoji:'👩‍🦰', color:'rgba(255,220,100,0.25)' },
  { name:'Kevin Bautista', phone:'+63 919 333 4444', emoji:'👨‍🦱', color:'rgba(200,150,255,0.25)' },
  { name:'Lara Navarro',   phone:'+63 961 555 6666', emoji:'👩‍🦳', color:'rgba(0,230,200,0.25)' },
  { name:'Marco Dela Cruz',phone:'+63 904 777 8888', emoji:'🧑‍💻', color:'rgba(255,120,0,0.25)' },
  { name:'Nina Garcia',    phone:'+63 952 999 0000', emoji:'👩‍🎨', color:'rgba(220,0,180,0.2)' },
  { name:'Bernard',  phone:'+63 933 481 2096', emoji:'🧑‍🦯', color:'rgba(0,180,120,0.25)' },
];

let dialTimerInterval = null;
let dialSeconds = 0;
let dialMuted = false;
let dialSpeaker = false;

function ctBuildList(list) {
  const el = document.getElementById('ct-list');
  el.innerHTML = '';
  // Group by first letter
  const groups = {};
  list.forEach(c => {
    const letter = c.name[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(c);
  });
  Object.keys(groups).sort().forEach(letter => {
    const hdr = document.createElement('div');
    hdr.className = 'ct-section-header';
    hdr.textContent = letter;
    el.appendChild(hdr);
    groups[letter].forEach(c => {
      const row = document.createElement('div');
      row.className = 'ct-row';
      row.innerHTML = `
        <div class="ct-avatar" style="background:${c.color}">${c.emoji}</div>
        <div class="ct-info">
          <div class="ct-name">${c.name}</div>
          <div class="ct-phone">${c.phone}</div>
        </div>
        <button class="ct-call-btn" onclick="event.stopPropagation();startCall(${JSON.stringify(c)})">
          <i class="fas fa-phone"></i>
        </button>`;
      row.onclick = () => startCall(c);
      el.appendChild(row);
    });
  });
}

function ctToggleSearch() {
  const bar = document.getElementById('ct-search-bar');
  bar.classList.toggle('open');
  if (bar.classList.contains('open')) document.getElementById('ct-search-input').focus();
  else { document.getElementById('ct-search-input').value = ''; ctBuildList(contacts); }
}

function ctFilter(q) {
  const filtered = q ? contacts.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.phone.includes(q)
  ) : contacts;
  ctBuildList(filtered);
}

function startCall(contact) {
  const overlay = document.getElementById('dial-overlay');
  document.getElementById('dial-avatar').textContent = contact.emoji;
  document.getElementById('dial-avatar').style.background = contact.color || 'rgba(0,220,140,0.1)';
  document.getElementById('dial-name').textContent = contact.name;
  document.getElementById('dial-number').textContent = contact.phone;
  document.getElementById('dial-status').textContent = 'Calling…';
  document.getElementById('dial-timer').textContent = '';
  document.getElementById('dial-avatar').classList.remove('connected');
  dialMuted = false; dialSpeaker = false; dialSeconds = 0;
  document.getElementById('dial-mute-btn').classList.remove('active-btn');
  document.getElementById('dial-speaker-btn').classList.remove('active-btn');
  overlay.classList.add('active');
  // Simulate ringing → connected after 3s
  clearInterval(dialTimerInterval);
  setTimeout(() => {
    if (!overlay.classList.contains('active')) return;
    document.getElementById('dial-status').textContent = 'Connected';
    document.getElementById('dial-avatar').classList.add('connected');
    dialTimerInterval = setInterval(() => {
      dialSeconds++;
      const m = String(Math.floor(dialSeconds/60)).padStart(2,'0');
      const s = String(dialSeconds%60).padStart(2,'0');
      document.getElementById('dial-timer').textContent = m + ':' + s;
    }, 1000);
  }, 3000);
}

function endCall() {
  clearInterval(dialTimerInterval);
  dialTimerInterval = null;
  document.getElementById('dial-overlay').classList.remove('active');
}

function dialToggleMute() {
  dialMuted = !dialMuted;
  document.getElementById('dial-mute-btn').classList.toggle('active-btn', dialMuted);
}
function dialToggleSpeaker() {
  dialSpeaker = !dialSpeaker;
  document.getElementById('dial-speaker-btn').classList.toggle('active-btn', dialSpeaker);
}
function dialOpenKeypad() {
  showToast('📱 Keypad would open here');
}

/* ═══════════════════════════════════
   MAPS
═══════════════════════════════════ */
let mapsCurrentDest = '';
let mapsCurrentMode = 'd'; // d=driving, r=transit, w=walking

function mapsOnInput(val) {
  const clearBtn = document.getElementById('maps-search-clear');
  if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
}

function mapsSetMode(mode) {
  mapsCurrentMode = mode;
  const modeMap = { d: 'driving', r: 'transit', w: 'walking' };
  Object.keys(modeMap).forEach(m => {
    document.getElementById('maps-tab-' + modeMap[m])?.classList.toggle('active', m === mode);
  });
  if (mapsCurrentDest) mapsGetDirections(); // will re-fetch GPS automatically
}

function mapsSearch() {
  const input = document.getElementById('maps-search-input');
  const q = (input?.value || '').trim();
  if (!q) return;
  mapsCurrentDest = mapsDisambiguate(q);
  const clearBtn = document.getElementById('maps-search-clear');
  if (clearBtn) clearBtn.style.display = 'block';
  const loading = document.getElementById('maps-loading');
  if (loading) loading.style.display = 'flex';
  const iframe = document.getElementById('maps-iframe');
  if (iframe) {
    iframe.onload = () => { if (loading) loading.style.display = 'none'; };
    iframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(mapsCurrentDest)}&output=embed&hl=en`;
  }
}

// Makes vague PH place names unambiguous for Google Maps
function mapsDisambiguate(q) {
  const lower = q.toLowerCase();
  const alreadyLocated = ['manila','quezon','makati','pasig','taguig','caloocan',
    'marikina','paranaque','pasay','malabon','navotas','valenzuela','las piñas',
    'muntinlupa','pateros','philippines','ph'].some(k => lower.includes(k));
  return alreadyLocated ? q : q + ', Manila, Philippines';
}

function mapsLoadRoute(origin, destination, mode) {
  const loading = document.getElementById('maps-loading');
  if (loading) loading.style.display = 'flex';
  const iframe = document.getElementById('maps-iframe');
  if (!iframe) return;
  const src = `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&dirflg=${mode}&output=embed&hl=en`;
  iframe.onload = () => { if (loading) loading.style.display = 'none'; };
  iframe.src = src;
}

function mapsGetDirections() {
  const q = mapsDisambiguate(mapsCurrentDest || (document.getElementById('maps-search-input')?.value || '').trim());
  if (!q || q === mapsDisambiguate('')) { showToast('📍 Enter a destination first'); return; }
  mapsCurrentDest = q;

  const loading = document.getElementById('maps-loading');
  if (loading) { loading.style.display = 'flex'; }

  // Try to get real GPS location first
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        mapsLoadRoute(origin, q, mapsCurrentMode);
      },
      () => {
        // Geolocation denied or failed — use Manila city center as fallback
        mapsLoadRoute('Manila, Philippines', q, mapsCurrentMode);
      },
      { timeout: 6000, maximumAge: 60000 }
    );
  } else {
    mapsLoadRoute('Manila, Philippines', q, mapsCurrentMode);
  }

  if (kaiSettings.strictness) {
    setTimeout(() => mapsShowSmartPanel(q), 1200);
  }
}

function mapsNavigateTo(destination) {
  const dest = mapsDisambiguate(destination);
  openApp('maps');
  setTimeout(() => {
    const input = document.getElementById('maps-search-input');
    if (input) { input.value = dest; mapsOnInput(dest); }
    mapsCurrentDest = dest;
    mapsGetDirections();
  }, 450);
}

function mapsClear() {
  const input = document.getElementById('maps-search-input');
  if (input) { input.value = ''; mapsOnInput(''); }
  mapsCurrentDest = '';
  mapsCloseSmartPanel();
  const loading = document.getElementById('maps-loading');
  if (loading) loading.style.display = 'flex';
  const iframe = document.getElementById('maps-iframe');
  if (iframe) {
    iframe.onload = () => { if (loading) loading.style.display = 'none'; };
    iframe.src = 'https://maps.google.com/maps?q=Manila+Philippines&output=embed&hl=en';
  }
}

function mapsCloseSmartPanel() {
  document.getElementById('maps-smart-panel')?.classList.remove('open');
}

function mapsShowSmartPanel(destination) {
  const panel  = document.getElementById('maps-smart-panel');
  const destEl = document.getElementById('maps-smart-dest');
  const optsEl = document.getElementById('maps-smart-options');
  const tipEl  = document.getElementById('maps-smart-tip');
  if (!panel) return;

  if (destEl) destEl.textContent = 'Going to: ' + destination;

  const options = getMapsTransportOptions(destination);
  if (optsEl) {
    optsEl.innerHTML = options.map(opt => `
      <div class="maps-smart-option ${opt.recommended ? 'recommended' : ''}">
        <div class="maps-smart-opt-icon">${opt.icon}</div>
        <div class="maps-smart-opt-info">
          <div class="maps-smart-opt-name">
            ${opt.name}
            ${opt.recommended ? '<span class="maps-best-badge">BEST</span>' : ''}
          </div>
          <div class="maps-smart-opt-detail">${opt.detail}</div>
          ${opt.signage ? `<div class="maps-signage-wrap">
            <span class="maps-signage-label">🪧 Look for:</span>
            <div class="maps-signage-board">${opt.signage.map(s => `<span class="maps-signage-tag">${s}</span>`).join('')}</div>
          </div>` : ''}
        </div>
        <div class="maps-smart-opt-cost">
          <div class="maps-smart-opt-fare">${opt.fare}</div>
          <div class="maps-smart-opt-time">${opt.time}</div>
        </div>
      </div>
    `).join('');
  }

  // Traffic tip based on time of day
  const hr = new Date().getHours();
  const isRush = (hr >= 7 && hr <= 9) || (hr >= 17 && hr <= 20);
  const trafficMsg = isRush
    ? '⚠️ <strong>Rush hour detected!</strong> Expect heavy traffic on roads. Rail or walk is best right now.'
    : '✅ <strong>Light traffic now.</strong> Good time to travel! Avoid roads between 7–9AM and 5–8PM.';
  if (tipEl) tipEl.innerHTML = `<i class="fas fa-clock"></i> ${trafficMsg}`;

  panel.classList.add('open');
}

function getMapsTransportOptions(destination) {
  const d = destination.toLowerCase();

  // ── Rail detection ──────────────────────────────────────────────────────────
  const nearLRT2 = ['recto','morayta','españa','espana','sampaloc','legarda','pureza','v. mapa','j. ruiz','gilmore','betty go','cubao','anonas','katipunan','santolan'].some(s => d.includes(s));
  const nearLRT1 = ['baclaran','vito cruz','buendia','gil puyat','pedro gil','quirino','central','carriedo','doroteo jose','bambang','tayuman','blumentritt','abad santos','monumento','edsa-taft'].some(s => d.includes(s));
  const nearMRT  = ['north ave','quezon ave','gma','kamuning','araneta','shaw','boni','guadalupe','buendia','ayala','magallanes','taft','ortigas','cubao'].some(s => d.includes(s));
  const hasRail  = nearLRT1 || nearLRT2 || nearMRT;
  const railName = nearLRT2 ? 'LRT-2' : nearMRT ? 'MRT-3' : nearLRT1 ? 'LRT-1' : null;

  // ── Signage database — keyed by destination keywords ───────────────────────
  // Each entry: { jeep, bus, rail (optional override) }
  const signageDB = [
    // ── Manila / Quiapo / Intramuros ─────────────────
    { keys:['quiapo','quintin paredes','carriedo','sta. cruz','santa cruz'],
      jeep:['QUIAPO','DIVISORIA – QUIAPO','MONUMENTO – QUIAPO','CUBAO – QUIAPO'],
      bus: ['QUIAPO','DIVISORIA – QUIAPO'],
      rail: ['LRT-1 → Carriedo Station'] },

    { keys:['intramuros','rajah sulayman','manila city hall','ermita'],
      jeep:['INTRAMUROS','QUIAPO – INTRAMUROS','DIVISORIA – MANILA'],
      bus: ['MANILA – INTRAMUROS','BACLARAN – DIVISORIA'] },

    { keys:['divisoria','tondo','binondo','chinatown'],
      jeep:['DIVISORIA','QUIAPO – DIVISORIA','MONUMENTO – DIVISORIA'],
      bus: ['DIVISORIA – BACLARAN','MONUMENTO – DIVISORIA'] },

    // ── Morayta / España / Sampaloc ──────────────────
    { keys:['morayta','feu','far eastern university','lacson','españa','espana','sampaloc','ust','university of santo tomas'],
      jeep:['MORAYTA – QUIAPO','ESPAÑA – QUIAPO','SAMPALOC – DIVISORIA','ESPAÑA – DIVISORIA','UST – MORAYTA'],
      bus: ['ESPAÑA – QUIAPO','SAMPALOC – DIVISORIA'],
      rail: ['LRT-2 → Recto or Legarda Station'] },

    { keys:['legarda','recto','bambang'],
      jeep:['RECTO','LEGARDA – QUIAPO','SAMPALOC – DIVISORIA'],
      bus: ['RECTO – DIVISORIA'],
      rail: ['LRT-2 → Recto Station','LRT-1 → Bambang Station'] },

    // ── Cubao / Quezon City ──────────────────────────
    { keys:['cubao','araneta','gateway','farmers','ali mall'],
      jeep:['CUBAO','CUBAO – QUIAPO','CUBAO – DIVISORIA','CUBAO – MONUMENTO'],
      bus: ['CUBAO – BACLARAN','CUBAO – MONUMENTO'],
      rail: ['LRT-2 → Cubao Station','MRT-3 → Araneta-Cubao Station'] },

    { keys:['quezon ave','quezon avenue','sto. domingo'],
      jeep:['QUEZON AVE – QUIAPO','QUEZON AVE – CUBAO'],
      bus: ['QUEZON AVE – CUBAO'],
      rail: ['MRT-3 → Quezon Ave Station'] },

    { keys:['katipunan','ateneo','miriam','up diliman','university of the philippines','diliman'],
      jeep:['KATIPUNAN','KATIPUNAN – CUBAO','KATIPUNAN – FAIRVIEW'],
      bus: ['KATIPUNAN – CUBAO'],
      rail: ['LRT-2 → Katipunan Station'] },

    { keys:['fairview','commonwealth','batasan','novaliches'],
      jeep:['FAIRVIEW','COMMONWEALTH – CUBAO','BATASAN – CUBAO','FAIRVIEW – MONUMENTO'],
      bus: ['FAIRVIEW – CUBAO','COMMONWEALTH – CUBAO'] },

    { keys:['monumento','caloocan','malabon','grace park'],
      jeep:['MONUMENTO','CALOOCAN – DIVISORIA','MALABON – DIVISORIA'],
      bus: ['MONUMENTO – BACLARAN','MONUMENTO – DIVISORIA'],
      rail: ['LRT-1 → Monumento Station'] },

    // ── Makati / BGC / Ortigas ───────────────────────
    { keys:['makati','ayala','glorietta','greenbelt','salcedo','legazpi'],
      jeep:['AYALA – QUIAPO','AYALA – DIVISORIA','MAKATI – QUIAPO'],
      bus: ['AYALA – BACLARAN','AYALA – CUBAO','EDSA – AYALA'],
      rail: ['MRT-3 → Ayala Station'] },

    { keys:['bgc','bonifacio global city','taguig','high street','uptown'],
      jeep:['BGC – AYALA','TAGUIG – AYALA'],
      bus: ['BGC – AYALA','BGC – CUBAO (P2P)','BGCTERMINAL BUS'] },

    { keys:['ortigas','sm megamall','robinson galleria','shaw','mandaluyong'],
      jeep:['ORTIGAS – CUBAO','SHAW – CUBAO','ORTIGAS – QUIAPO'],
      bus: ['ORTIGAS – BACLARAN','ORTIGAS – CUBAO'],
      rail: ['MRT-3 → Shaw or Ortigas Station'] },

    // ── Pasay / Baclaran / Airport ───────────────────
    { keys:['baclaran','pasay','paranaque','naia','airport','terminal 1','terminal 2','terminal 3'],
      jeep:['BACLARAN – QUIAPO','BACLARAN – DIVISORIA'],
      bus: ['BACLARAN – CUBAO','BACLARAN – MONUMENTO'],
      rail: ['LRT-1 → Baclaran Station'] },

    { keys:['mall of asia','moa','entertainment city','solaire'],
      jeep:['MOA – BACLARAN','PASAY – BACLARAN'],
      bus: ['MOA – CUBAO (P2P)','BACLARAN – CUBAO'] },

    // ── Marikina / Pasig / Antipolo ──────────────────
    { keys:['marikina','santolan','robinson marikina','riverbanks'],
      jeep:['MARIKINA – CUBAO','SANTOLAN – CUBAO'],
      bus: ['MARIKINA – CUBAO'],
      rail: ['LRT-2 → Santolan Station'] },

    { keys:['antipolo','sumulong','cainta','taytay'],
      jeep:['ANTIPOLO – CUBAO','ANTIPOLO – ARANETA','CAINTA – CUBAO'],
      bus: ['ANTIPOLO – CUBAO','ANTIPOLO – ORTIGAS'] },

    { keys:['pasig','valle verde','kapitolyo','san antonio'],
      jeep:['PASIG – CUBAO','PASIG – QUIAPO','KAPITOLYO – ORTIGAS'],
      bus: ['PASIG – CUBAO','PASIG – ORTIGAS'] },

    // ── Mandaluyong / San Juan ────────────────────────
    { keys:['mandaluyong','boni','sm megamall','edsa shangrila'],
      jeep:['MANDALUYONG – QUIAPO','BONI – CUBAO'],
      bus: ['MANDALUYONG – CUBAO','EDSA – ORTIGAS'],
      rail: ['MRT-3 → Boni Station'] },

    // ── Las Piñas / Muntinlupa / Alabang ─────────────
    { keys:['alabang','muntinlupa','filinvest','southmall','starmall'],
      jeep:['ALABANG – BACLARAN','ALABANG – PASAY'],
      bus: ['ALABANG – CUBAO (P2P)','ALABANG – AYALA'] },

    // ── Novaliches / Valenzuela ──────────────────────
    { keys:['novaliches','valenzuela','meycauayan','bocaue'],
      jeep:['NOVALICHES – CUBAO','NOVALICHES – MONUMENTO','VALENZUELA – DIVISORIA'],
      bus: ['NOVALICHES – CUBAO','VALENZUELA – DIVISORIA'] },
  ];

  // ── Match destination to signage entry ─────────────────────────────────────
  let matched = signageDB.find(entry => entry.keys.some(k => d.includes(k)));

  // Generic fallback signage using the raw destination name
  const rawName = destination.replace(/, Manila, Philippines$/i,'').replace(/, Philippines$/i,'').trim().toUpperCase();
  const fallbackJeep = [rawName, `${rawName} – QUIAPO`, `${rawName} – CUBAO`];
  const fallbackBus  = [rawName, `${rawName} – BACLARAN`];

  const jeepSigns = matched ? matched.jeep : fallbackJeep;
  const busSigns  = matched ? matched.bus  : fallbackBus;
  const railSign  = matched?.rail || null;

  // ── Build options array ────────────────────────────────────────────────────
  const opts = [
    {
      icon: '🚌',
      name: 'Jeepney / E-Jeep',
      detail: 'Cheapest PH transport. Flag one down on the roadside.',
      signage: jeepSigns,
      fare: '₱13–₱25',
      time: '30–60 min',
      recommended: !hasRail,
    },
    {
      icon: '🚍',
      name: 'P2P / Aircon Bus',
      detail: 'Air-conditioned, fewer stops, faster than jeep.',
      signage: busSigns,
      fare: '₱25–₱65',
      time: '25–45 min',
      recommended: false,
    },
  ];

  if (hasRail) {
    opts.push({
      icon: '🚇',
      name: railName + ' (Rail)',
      detail: 'Fixed route, avoids road traffic completely. Best pick!',
      signage: railSign || [`${railName} → nearest station`],
      fare: '₱15–₱35',
      time: '15–30 min',
      recommended: true,
    });
  }

  opts.push(
    {
      icon: '🛵',
      name: 'Angkas / Joyride',
      detail: 'Motorcycle taxi — weaves through traffic fast. Book in-app.',
      signage: null,
      fare: '₱50–₱150',
      time: '15–25 min',
      recommended: false,
    },
    {
      icon: '🚗',
      name: 'Grab Car',
      detail: 'Most comfortable. Book via the Grab app.',
      signage: null,
      fare: '₱120–₱350',
      time: '20–45 min',
      recommended: false,
    }
  );

  return opts;
}

function mapsNavGuide(destination) {
  return [
    {
      targetId: 'maps-search-input',
      viewId: 'maps-screen',
      message: `I've entered "${destination}" in the search box. Now tap the blue arrows button to load directions on the map!`,
      tapToAdvance: false,
      okLabel: 'Next →',
    },
    {
      targetId: 'maps-dir-btn',
      viewId: 'maps-screen',
      message: 'Tap this Directions button! Google Maps will show you the best route right inside the app.',
      tapToAdvance: true,
      onTap() { mapsGetDirections(); },
    },
    {
      targetId: 'maps-mode-tabs',
      viewId: 'maps-screen',
      message: kaiSettings.strictness
        ? 'Switch transport mode here — Drive, Transit, or Walk. 🚇 Transit is cheapest and avoids traffic for most Manila routes!'
        : 'Switch between driving 🚗, transit 🚌, and walking 🚶 modes here. Each gives a different route on the map.',
      tapToAdvance: false,
      okLabel: 'Got it ✓',
    },
  ];
}

/* ═══════════════════════════════════
   CALCULATOR
═══════════════════════════════════ */
function calcInput(v){calcStr+=v;document.getElementById('calc-disp').textContent=calcStr||'0';}
function calcOp(op){calcStr+=op;document.getElementById('calc-disp').textContent=calcStr;}
function calcClear(){calcStr='';document.getElementById('calc-disp').textContent='0';document.getElementById('calc-expr').textContent='';}
function calcBackspace(){calcStr=calcStr.slice(0,-1);document.getElementById('calc-disp').textContent=calcStr||'0';}
function calcEquals(){
  try{
    const r=Function('"use strict";return ('+calcStr+')')();
    document.getElementById('calc-expr').textContent=calcStr+' =';
    calcStr=String(parseFloat(r.toFixed(10)));
    document.getElementById('calc-disp').textContent=calcStr;
  }catch{document.getElementById('calc-disp').textContent='ERROR';calcStr='';}
}

/* ═══════════════════════════════════
   CLOCK
═══════════════════════════════════ */
function buildClockMarks(){
  const c=document.getElementById('clock-marks');
  for(let i=0;i<12;i++){
    const m=document.createElement('div');
    m.className='clock-mark';
    m.style.transform=`rotate(${i*30}deg) translateX(-50%)`;
    c.appendChild(m);
  }
}
function startClock(){updateClock();updateAnalog();
  clockInterval=setInterval(updateClock,1000);analogInterval=setInterval(updateAnalog,1000);}
function updateClock(){
  const n=new Date();
  document.getElementById('clock-digital').textContent=
    pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds());
  const D=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  document.getElementById('clock-date-text').textContent=
    D[n.getDay()]+', '+M[n.getMonth()]+' '+n.getDate()+', '+n.getFullYear();
}
function updateAnalog(){
  const n=new Date();
  document.getElementById('sec-hand').style.transform=`rotate(${n.getSeconds()*6}deg)`;
  document.getElementById('min-hand').style.transform=`rotate(${n.getMinutes()*6+n.getSeconds()*.1}deg)`;
  document.getElementById('hour-hand').style.transform=`rotate(${(n.getHours()%12)*30+n.getMinutes()*.5}deg)`;
}

/* ═══════════════════════════════════
   WIKIPEDIA
═══════════════════════════════════ */
async function wikiSearch(query){
  const q=query||document.getElementById('wiki-input').value.trim();
  if(!q)return;
  document.getElementById('wiki-input').value=q;
  const res=document.getElementById('wiki-result');
  res.style.display='block';res.textContent='Searching...';
  try{
    const r=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
    if(!r.ok)throw new Error();
    const d=await r.json();
    res.innerHTML=`<strong style="color:var(--cyan)">${d.title}</strong><br><br>${d.extract}`;
  }catch{res.textContent='No result found.';}
}