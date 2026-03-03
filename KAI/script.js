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
function speak(text) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.93; u.pitch = 1; u.volume = 1;
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
function gcashGoHome()  { gcashShowSub('gcash-home'); }
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
  { id:'s1',  name:'Samsung Galaxy A15 4G',          emoji:'📱', price:6990,  rating:4.8, sold:12400, desc:'6.5" display, 50MP camera, 5000mAh battery. Perfect everyday smartphone.', cat:'Phones' },
  { id:'s2',  name:'Xiaomi Redmi 13C',                emoji:'📱', price:4999,  rating:4.6, sold:9800,  desc:'6.74" display, 50MP AI triple camera. Best budget phone.', cat:'Phones' },
  { id:'s3',  name:'realme C55',                      emoji:'📱', price:7299,  rating:4.7, sold:7200,  desc:'108MP camera, 5000mAh, 33W fast charging. For content creators.', cat:'Phones' },
  { id:'s4',  name:'Oversized Graphic Tee',           emoji:'👕', price:199,   rating:4.5, sold:32000, desc:'100% cotton, unisex fit. Available in 8 colors.', cat:'Fashion' },
  { id:'s5',  name:'Korean Skincare Set (6pcs)',       emoji:'🧴', price:599,   rating:4.9, sold:28000, desc:'Cleanser, toner, serum, moisturizer, eye cream, sunscreen.', cat:'Beauty' },
  { id:'s6',  name:'Lucky Me Pancit Canton 6-pack',   emoji:'🍜', price:89,    rating:4.8, sold:95000, desc:'Original flavor. Fast cook. Kids and adults love it!', cat:'Food' },
  { id:'s7',  name:'Stuffed Bear Plushie 40cm',       emoji:'🧸', price:299,   rating:4.7, sold:18000, desc:'Super soft. Great gift for all ages. Machine washable.', cat:'Toys' },
  { id:'s8',  name:'JBL GO 3 Portable Speaker',       emoji:'🔊', price:1499,  rating:4.7, sold:14500, desc:'Waterproof, bold JBL sound, 5h battery. Clip anywhere.', cat:'Electronics' },
  { id:'s9',  name:'Wireless Earbuds TWS',            emoji:'🎧', price:399,   rating:4.4, sold:41000, desc:'Bluetooth 5.0, 4h playback + 12h charging case. Clear sound.', cat:'Electronics' },
  { id:'s10', name:'Nike Dri-FIT Running Shorts',     emoji:'🩳', price:899,   rating:4.6, sold:8700,  desc:'Lightweight, sweat-wicking. Built-in liner. Sizes S-XXL.', cat:'Fashion' },
  { id:'s11', name:'Collagen Whitening Soap 3-pack',  emoji:'🧼', price:149,   rating:4.7, sold:67000, desc:'Papaya + kojic acid. Visible results in 2 weeks.', cat:'Beauty' },
  { id:'s12', name:'Stick-on Phone Wallet',           emoji:'💳', price:79,    rating:4.3, sold:22000, desc:'Holds 3 cards + cash. Strong adhesive. Works with MagSafe.', cat:'Accessories' },
  { id:'s13', name:'Mechanical Keyboard RGB',         emoji:'⌨️', price:1299,  rating:4.6, sold:5400,  desc:'Blue switches, TKL layout, USB-C. Perfect for gaming.', cat:'Electronics' },
  { id:'s14', name:'Reusable Water Bottle 1L',        emoji:'🍶', price:249,   rating:4.8, sold:31000, desc:'Stainless steel, keeps cold 24h / hot 12h. BPA-free.', cat:'Kitchen' },
  { id:'s15', name:'Wireless Mouse Ergonomic',        emoji:'🖱️', price:599,   rating:4.5, sold:9300,  desc:'2.4GHz, silent click, 1600 DPI. Long 12-month battery.', cat:'Electronics' },
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
  if (guideActive) setTimeout(renderGuideStep, 300);
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
    message:  "Type the product you want in the search bar and press Enter. I'll analyze the results for you!",
    tapToAdvance: false,
    okLabel:  "I searched →",
  },
  {
    targetId: 'sp-kai-banner',
    viewId:   'shopee-screen',
    subviewId: 'sp-results',
    message:  "I analyzed all the results and picked the BEST product — based on the highest combination of rating and sales volume. Check my recommendation above!",
    tapToAdvance: false,
    okLabel:  "Show me →",
  },
  {
    targetId: 'sp-kai-rec-card',
    viewId:   'shopee-screen',
    subviewId: 'sp-results',
    message:  "This is my top pick! Tap it to see full details — price, reviews, and description.",
    tapToAdvance: true,
    onTap() { if (spKaiRec) spOpenProduct(spKaiRec.id); },
  },
  {
    targetId: 'sp-add-cart-btn',
    viewId:   'shopee-screen',
    subviewId: 'sp-product',
    message:  "You're on the product page. Review the details, and if you're happy, tap 'Add to Cart'!",
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
function gcashGoHome() {
  gcashShowSub('gcash-home');
  qrPinVal = '';
  updateQrPinDots();
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

  if (step.viewId && currentApp !== step.viewId) showView(step.viewId);
  if (step.subviewId) {
    if (step.viewId === 'facebook-screen') fbShowSub(step.subviewId);
    else if (step.viewId === 'shopee-screen') spShowSub(step.subviewId);
    else gcashShowSub(step.subviewId);
  }
  if (step.onShow) setTimeout(step.onShow, 200);

  setTimeout(() => positionGuideOn(step), 160);
}

function positionGuideOn(step) {
  const overlay    = document.getElementById('kai-guide-overlay');
  const ring       = document.getElementById('kai-guide-ring');
  const bubble     = document.getElementById('kai-guide-bubble');
  const canvas     = document.getElementById('kai-guide-backdrop');
  const msgEl      = document.getElementById('guide-message');
  const badgeEl    = document.getElementById('guide-step-badge');
  const tapHintEl  = document.getElementById('guide-tap-hint');
  const okBtn      = document.getElementById('guide-ok-btn');

  const target = document.getElementById(step.targetId);
  if (!target) return;

  // Scroll the target into the top quarter of its scrollable container
  // so the bubble can sit below it without covering it or the content above
  const scrollParent = target.closest('.gcash-flow-body, .gcash-body, .fb-feed, .app-content, .fb-caption-area');
  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offsetInsideParent = targetRect.top - parentRect.top + scrollParent.scrollTop;
    // Put the target near 30% from the top of the container
    const desiredScroll = offsetInsideParent - (scrollParent.clientHeight * 0.25);
    scrollParent.scrollTo({ top: Math.max(0, desiredScroll), behavior: 'smooth' });
  }

  // Wait for scroll to settle before measuring positions
  setTimeout(() => _drawGuide(step, overlay, ring, bubble, canvas, msgEl, badgeEl, tapHintEl, okBtn), 320);
}

function _drawGuide(step, overlay, ring, bubble, canvas, msgEl, badgeEl, tapHintEl, okBtn) {
  const target = document.getElementById(step.targetId);
  if (!target) return;

  overlay.classList.add('active');

  const pRect = document.getElementById('phone-screen').getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const rx = tRect.left - pRect.left;
  const ry = tRect.top  - pRect.top;
  const rw = tRect.width;
  const rh = tRect.height;
  const pad = 7;

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
   KAI SETTINGS
═══════════════════════════════════ */
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
    ? "Intervention Strictness is ON. When you shop, I'll recommend the best product based on ratings and sales."
    : "Intervention Strictness is OFF. I'll guide you through tasks without extra suggestions.";
  showToast(kaiSettings.strictness ? '🧠 Strictness ON' : '🧠 Strictness OFF');
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

  // Strictness toggle
  const stToggle = document.getElementById('strictness-toggle');
  const stDesc   = document.getElementById('strictness-desc');
  if (kaiSettings.strictness) {
    stToggle?.classList.add('on');
    if (stDesc) stDesc.textContent = 'KAI actively suggests best products';
  } else {
    stToggle?.classList.remove('on');
    if (stDesc) stDesc.textContent = 'KAI only guides, no suggestions';
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
  english: 'Try: "Send money" · "Upload a photo" · "React to a post"',
  taglish:  'Subukan: "Magpadala ng pera" · "Mag-upload ng photo"',
  tagalog:  'Subukan: "Magpadala ng pera" · "Ibahagi ang post"',
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


function takeCommand(msg) {
  setKaiStatus('PROCESSING...');
  const respond = (text, action) => {
    speak(text); setKaiStatus('RESPONDING');
    setKaiTranscript(text); showToast('🤖 ' + text);
    if (action) setTimeout(action, 650);
    setTimeout(() => setKaiStatus('READY'), 3500);
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
  else if (is('hello')) {
    respond("Hello! I'm KAI. Try saying 'send money', 'upload a photo', or 'react to a post'!");
  }
  else if (anyOtherLangMatch) {
    respond(wrongLangMsg[lang]);
  }
  else {
    respond("I didn't catch that. Try: 'send money', 'open GCash', or 'upload a photo'.");
  }
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