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
  if (el) el.textContent = (s === 'READY')
    ? 'Try: "Help me send money" or "How to react on Facebook"' : s;
}
function setKaiTranscript(t) { document.getElementById('kai-transcript').textContent = t; }

/* ═══════════════════════════════════
   COMMANDS
═══════════════════════════════════ */
function takeCommand(msg) {
  setKaiStatus('PROCESSING...');
  const respond = (text, action) => {
    speak(text); setKaiStatus('RESPONDING');
    setKaiTranscript(text); showToast('🤖 ' + text);
    if (action) setTimeout(action, 650);
    setTimeout(() => setKaiStatus('READY'), 3500);
  };

  if (msg.includes('send money') || msg.includes('transfer') ||
      msg.includes('help me send') || msg.includes('magpadala') ||
      msg.includes('padala')) {
    respond("Sure! Follow the yellow highlights — I'll guide you step by step to send money safely.", () => {
      startGuide(sendMoneyFlow);
    });
  }
  else if (msg.includes('receive money') || msg.includes('help me receive') ||
           msg.includes('qr code') || msg.includes('activate qr') ||
           msg.includes('tumanggap') || msg.includes('receive')) {
    respond("Sure! I'll guide you step by step on how to activate your QR code so people can send you money. Follow the highlights!", () => {
      openApp('gcash');
      setTimeout(() => startGuide(receiveMoneyFlow), 700);
    });
  }
  else if (msg.includes('upload') || msg.includes('post a photo') ||
           msg.includes('post photo') || msg.includes('mag upload') ||
           msg.includes('how do i upload') || msg.includes('share a photo')) {
    respond("Sure! I'll guide you step by step on how to upload a photo on Facebook. Follow the yellow highlights!", () => {
      startGuide(uploadPhotoFlow);
    });
  }
  else if (msg.includes('react') || msg.includes('how to react') ||
           msg.includes('like a post') || msg.includes('mag react') ||
           msg.includes('love react') || msg.includes('how do i react')) {
    respond("Sure! I'll show you how to react to a Facebook post step by step. Follow the highlights!", () => {
      startGuide(reactPostFlow);
    });
  }
  else if (msg.includes('share a post') || msg.includes('how to share') ||
           msg.includes('mag share') || msg.includes('i share') ||
           msg.includes('share post') || msg.includes('how do i share')) {
    respond("Let me guide you on how to share a Facebook post! Follow the highlights step by step.", () => {
      startGuide(sharePostFlow);
    });
  }
  else if (msg.includes('facebook') || msg.includes('open facebook')) {
    respond("Opening Facebook!", () => openApp('facebook'));
  }
  else if (msg.includes('gcash') || msg.includes('open gcash')) {
    respond("Opening GCash. Say help me send money to get guided step by step!", () => openApp('gcash'));
  }
  else if (msg.includes('open google'))   respond("Opening Google.",     () => openApp('google'));
  else if (msg.includes('open youtube'))  respond("Opening YouTube.",    () => openApp('youtube'));
  else if (msg.includes('calculator'))    respond("Opening Calculator.", () => openApp('calculator'));
  else if (msg.includes('open clock'))    respond("Opening Clock.",      () => openApp('clock'));
  else if (msg.includes('wikipedia')) {
    const q = msg.replace('open wikipedia','').replace('wikipedia','').trim();
    respond("Opening Wikipedia." + (q ? ' Searching for ' + q + '.' : ''), () => {
      openApp('wikipedia');
      if (q) setTimeout(() => wikiSearch(q), 400);
    });
  }
  else if (msg.includes('time'))
    respond("The current time is " + new Date().toLocaleString(undefined,{hour:'numeric',minute:'numeric'}));
  else if (msg.includes('date'))
    respond("Today is " + new Date().toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric'}));
  else if (msg.includes('go home') || msg.includes('home screen'))
    respond("Going home.", goHome);
  else if (msg.includes('hello') || msg.includes('hey'))
    respond("Hello! I'm KAI. Say help me send money and I'll guide you through GCash step by step!");
  else
    respond("I didn't catch that. Try: help me send money, open GCash, or open calculator.");
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