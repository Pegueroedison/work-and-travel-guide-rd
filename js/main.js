/* === WORK AND TRAVEL GUIDE RD — MAIN JS === */

// ── Consular Questions Data ──────────────────────────────
const QUESTIONS = [
  "Is this your first time?",
  "Where are you going?",
  "What are you going to do there? What will you work on?",
  "When did you start college?",
  "When are you going to finish college?",
  "What are you studying? What do you study?",
  "Where do you study?",
  "How many subjects or classes did you take last semester?",
  "How many subjects are you taking?",
  "Mention the subjects from last semester and this semester.",
  "Can you talk about your last homework?",
  "What is the most difficult and easiest subject you are taking, and why?",
  "What are you going to do when you finish your career?",
  "Does your college have summer break?",
  "What motivated you to study this career?",
  "Do you know your rights? Do you know Wilberforce?",
  "How many semesters do you have approved?",
  "What is your favorite movie and why?",
  "Why are you applying for this program?",
  "Who is paying for your program?",
  "What is your GPA?",
  "When does your next semester start?",
  "When will you return?",
  "For how long will you stay in the U.S.?",
  "What is your favorite subject this semester, and why?",
  "How many subjects will you take when you return?",
  "How much will you be paid in your position?",
  "How many hours a week are you going to work?",
  "Do you have any relatives in the U.S.? Who?",
  "Do your parents have a visa?",
  "How many credits do you have this semester?",
  "How many credits did you have last semester?",
  "How many credits did you pass last semester?",
  "How many days per week do you go to college? Which days?",
  "How many subjects do you have left in your career?",
  "How many credits do you have left in your career?",
  "How many semesters do you have left in your career?",
  "What are you going to do when you finish your program?",
  "When are you going to return from the U.S.?",
  "Why are you applying for this program?",
  "Who is your manager?",
  "Who is your host manager?",
  "How much does your housing cost?",
  "What is the address of your housing?",
  "What is the zip code of your housing?",
  "Mention a book from your career.",
  "How many credits does your career have in total?",
  "Who is your sponsor?",
  "Who is your employer?",
  "What do your parents do for a living?"
];

// ── Progress Bar ─────────────────────────────────────────
const progressBar = document.getElementById('progressBar');
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  progressBar.style.width = pct + '%';
});

// ── Sticky Nav ───────────────────────────────────────────
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
});

// ── Active Nav Link ───────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a[data-section]');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const link = document.querySelector(`.nav-menu a[data-section="${entry.target.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}, { threshold: 0.35 });

sections.forEach(s => observer.observe(s));

// ── Hamburger Menu ────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileNav.classList.toggle('open');
  document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
});

document.querySelectorAll('.nav-mobile a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ── Back to Top ───────────────────────────────────────────
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', () => {
  backTop.classList.toggle('visible', window.scrollY > 400);
});
backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── Scroll fade-in animation ──────────────────────────────
const fadeEls = document.querySelectorAll('.fade-in');
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
fadeEls.forEach(el => fadeObserver.observe(el));

// ── Collapsible Sections ──────────────────────────────────
document.querySelectorAll('.collapsible-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const content = btn.nextElementSibling;
    btn.classList.toggle('open');
    content.classList.toggle('open');
  });
});

// ── Tab Switcher ──────────────────────────────────────────
document.querySelectorAll('.tabs').forEach(tabGroup => {
  tabGroup.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      const parent = btn.closest('.tab-wrapper');

      parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      parent.querySelector(`#${target}`).classList.add('active');
    });
  });
});

// ── Speech Synthesis ──────────────────────────────────────
let synth = window.speechSynthesis;
let currentUtterance = null;
let currentIndex = -1;
let isRandomMode = false;
let randomHistory = [];
let currentRate = 0.8;

function getEnglishVoice() {
  const voices = synth.getVoices();
  return voices.find(v => v.lang.startsWith('en') && v.localService) ||
         voices.find(v => v.lang.startsWith('en')) ||
         voices[0] || null;
}

function speakQuestion(text, rate, onEnd) {
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = rate;
  utter.pitch = 1;
  const voice = getEnglishVoice();
  if (voice) utter.voice = voice;
  if (onEnd) utter.onend = onEnd;
  synth.speak(utter);
  currentUtterance = utter;
}

function clearHighlights() {
  document.querySelectorAll('.speech-card').forEach(c => {
    c.classList.remove('playing');
  });
}

function highlightCard(index) {
  clearHighlights();
  const cards = document.querySelectorAll('.speech-card');
  if (cards[index]) {
    cards[index].classList.add('playing');
    cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function markCompleted(index) {
  const cards = document.querySelectorAll('.speech-card');
  if (cards[index]) cards[index].classList.add('completed');
}

// Sequential playback
function playSequential(startIndex, rate) {
  isRandomMode = false;
  hideRandomUI();
  clearHighlights();
  currentRate = rate;
  currentIndex = startIndex;

  function playNext(i) {
    if (i >= QUESTIONS.length) {
      clearHighlights();
      stopBtn.disabled = true;
      return;
    }
    highlightCard(i);
    speakQuestion(QUESTIONS[i], rate, () => {
      markCompleted(i);
      setTimeout(() => playNext(i + 1), 600);
    });
    currentIndex = i;
  }

  playNext(currentIndex);
  stopBtn.disabled = false;
}

// Buttons
const btnSlow   = document.getElementById('btnSlow');
const btnFast   = document.getElementById('btnFast');
const btnRandom = document.getElementById('btnRandom');
const stopBtn   = document.getElementById('btnStop');
const resetBtn  = document.getElementById('btnReset');
const randomUI  = document.getElementById('randomPractice');
const randomQEl = document.getElementById('randomQuestion');
const randomNumEl = document.getElementById('randomNum');
const btnNextRandom = document.getElementById('btnNextRandom');
const btnCloseRandom = document.getElementById('btnCloseRandom');
const btnListenRandom = document.getElementById('btnListenRandom');

btnSlow.addEventListener('click', () => {
  playSequential(0, 0.65);
});

btnFast.addEventListener('click', () => {
  playSequential(0, 1.0);
});

stopBtn.addEventListener('click', () => {
  synth.cancel();
  clearHighlights();
  stopBtn.disabled = true;
});

resetBtn.addEventListener('click', () => {
  synth.cancel();
  clearHighlights();
  document.querySelectorAll('.speech-card').forEach(c => c.classList.remove('completed'));
  currentIndex = -1;
  stopBtn.disabled = true;
  hideRandomUI();
});

function showRandomUI() {
  randomUI.classList.add('active');
  randomHistory = [];
}

function hideRandomUI() {
  randomUI.classList.remove('active');
  isRandomMode = false;
}

function pickRandomQuestion() {
  let idx;
  let tries = 0;
  do {
    idx = Math.floor(Math.random() * QUESTIONS.length);
    tries++;
  } while (randomHistory.includes(idx) && tries < 30);

  if (randomHistory.length >= QUESTIONS.length) randomHistory = [];
  randomHistory.push(idx);

  randomQEl.textContent = QUESTIONS[idx];
  randomNumEl.textContent = `Pregunta #${idx + 1} de ${QUESTIONS.length}`;
  highlightCard(idx);
}

btnRandom.addEventListener('click', () => {
  isRandomMode = true;
  showRandomUI();
  stopBtn.disabled = false;
  pickRandomQuestion();
});

btnNextRandom.addEventListener('click', () => {
  synth.cancel();
  pickRandomQuestion();
});

btnListenRandom.addEventListener('click', () => {
  const text = randomQEl.textContent;
  if (text) speakQuestion(text, 0.7, null);
});

btnCloseRandom.addEventListener('click', () => {
  synth.cancel();
  hideRandomUI();
  clearHighlights();
  stopBtn.disabled = true;
});

// Load voices when ready
if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = () => {}; // trigger load
}

// ── Copy Reference Code ───────────────────────────────────
const refCode = document.getElementById('refCode');
const copyToast = document.getElementById('copyToast');

if (refCode) {
  refCode.addEventListener('click', () => {
    navigator.clipboard.writeText('29C7035E').then(() => {
      copyToast.textContent = '✓ Código copiado al portapapeles';
      copyToast.style.opacity = '1';
      setTimeout(() => copyToast.style.opacity = '0', 2500);
    });
  });
}

// ── Install PWA Prompt ─────────────────────────────────────
let deferredPrompt;
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installBtn');
const installDismiss = document.getElementById('installDismiss');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBanner) installBanner.style.display = 'flex';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (installBanner) installBanner.style.display = 'none';
  });
}

if (installDismiss) {
  installDismiss.addEventListener('click', () => {
    if (installBanner) installBanner.style.display = 'none';
  });
}

// ── Register Service Worker ────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.warn('SW failed:', err));
  });
}
