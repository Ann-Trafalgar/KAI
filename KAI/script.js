/* ═══════════════════════════════════
   STATE
═══════════════════════════════════ */
let currentApp = 'home';
let calcStr = '', calcExpr = '';
let externalUrl = '';
let clockInterval = null, analogInterval = null;
let pinVal = '';
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
  facebook:{ title:'Facebook',logo:'📘', url:'https://facebook.com',       msg:'Connect with Facebook' },
  maps:    { title:'Maps',    logo:'🗺️', url:'https://maps.google.com',    msg:'Explore the world with Google Maps' },
};
function openApp(name) {
  if (name === 'kai')        { showView('kai-screen'); return; }
  if (name === 'calculator') { showView('calc-screen'); return; }
  if (name === 'clock')      { showView('clock-screen'); startClock(); return; }
  if (name === 'wikipedia')  { showView('wiki-screen'); return; }
  if (name === 'gcash')      { showView('gcash-screen'); gcashShowSub('gcash-home'); return; }
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
    targetId: 'gcash-confirm-btn',
    viewId:   'gcash-screen',
    subviewId:'gcash-send-review',
    message:  "Read the details carefully — check the name and amount are correct. If everything looks right, tap 'Confirm & Enter PIN'.",
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
  if (step.subviewId) gcashShowSub(step.subviewId);

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
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const hx = rx - pad - 3, hy = ry - pad - 3;
  const hw = rw + (pad+3)*2, hh = rh + (pad+3)*2;
  ctx.clearRect(hx, hy, hw, hh);

  const oldBlocker = document.getElementById('guide-blocker');
  if (oldBlocker) oldBlocker.remove();

  const blocker = document.createElement('div');
  blocker.id = 'guide-blocker';
  blocker.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:501;';

  const zones = [
    { left:0, top:0, width:pRect.width, height: hy },
    { left:0, top: hy+hh, width:pRect.width, height: pRect.height - (hy+hh) },
    { left:0, top: hy, width: hx, height: hh },
    { left: hx+hw, top: hy, width: pRect.width - (hx+hw), height: hh },
  ];
  zones.forEach(z => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${z.left}px;top:${z.top}px;
      width:${z.width}px;height:${z.height}px;pointer-events:all;z-index:502;`;
    d.addEventListener('click', (e) => { e.stopPropagation(); });
    blocker.appendChild(d);
  });
  overlay.appendChild(blocker);

  // Move bubble to end so it's on top
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

  const bubbleH  = 190;
  const bubbleW  = 280;
  const targetCX = rx + rw / 2;
  const arrowOffset = 28;

  let bTop, arrowClass;
  if (ry - pad - bubbleH - 16 > 38) {
    bTop       = ry - pad - bubbleH - 16;
    arrowClass = 'bubble-arrow-bottom';
  } else {
    bTop       = ry + rh + pad + 16;
    arrowClass = 'bubble-arrow-top';
  }

  let bLeft = targetCX - arrowOffset - 14;
  bLeft = Math.max(8, Math.min(bLeft, pRect.width - bubbleW - 8));

  bubble.className  = arrowClass;
  bubble.style.top  = Math.max(38, Math.min(bTop, pRect.height - bubbleH - 24)) + 'px';
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
  const blocker = document.getElementById('guide-blocker');
  if (blocker) blocker.remove();
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
    ? 'Try saying: "Help me send money"' : s;
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
  else if (msg.includes('gcash') || msg.includes('open gcash')) {
    respond("Opening GCash. Say help me send money to get guided step by step!", () => openApp('gcash'));
  }
  else if (msg.includes('open google'))   respond("Opening Google.",     () => openApp('google'));
  else if (msg.includes('open youtube'))  respond("Opening YouTube.",    () => openApp('youtube'));
  else if (msg.includes('open facebook')) respond("Opening Facebook.",   () => openApp('facebook'));
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