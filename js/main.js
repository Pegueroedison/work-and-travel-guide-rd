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

// ── Render question cards only on preguntas.html ──────────────────────────────
function renderQuestionCards() {
  const container = document.getElementById('questionsList');
  if (!container || container.dataset.rendered === '1') return;
  container.dataset.rendered = '1';
  QUESTIONS.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'speech-card';
    div.setAttribute('data-index', i);
    div.innerHTML = `<div class="q-num">${i + 1}</div><div class="q-text">${q}</div>`;
    div.addEventListener('click', () => speakQuestion(q, 0.75, () => {
      div.classList.remove('playing');
      div.classList.add('completed');
    }));
    container.appendChild(div);
  });
}

// ── Progress Bar ─────────────────────────────────────────
const progressBar = document.getElementById('progressBar');
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  if (progressBar) progressBar.style.width = pct + '%';
});

// ── Sticky Nav ───────────────────────────────────────────
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
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

if (hamburger && mobileNav) hamburger.addEventListener('click', () => {
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
  if (backTop) backTop.classList.toggle('visible', window.scrollY > 400);
});
if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

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
      if (stopBtn) stopBtn.disabled = true;
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
  if (stopBtn) stopBtn.disabled = false;
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

if (btnSlow) btnSlow.addEventListener('click', () => {
  renderQuestionCards();
  playSequential(0, 0.65);
});

if (btnFast) btnFast.addEventListener('click', () => {
  renderQuestionCards();
  playSequential(0, 1.0);
});

if (stopBtn) stopBtn.addEventListener('click', () => {
  synth.cancel();
  clearHighlights();
  if (stopBtn) stopBtn.disabled = true;
});

if (resetBtn) resetBtn.addEventListener('click', () => {
  synth.cancel();
  clearHighlights();
  document.querySelectorAll('.speech-card').forEach(c => c.classList.remove('completed'));
  currentIndex = -1;
  if (stopBtn) stopBtn.disabled = true;
  hideRandomUI();
});

function showRandomUI() {
  if (randomUI) randomUI.classList.add('active');
  randomHistory = [];
}

function hideRandomUI() {
  if (randomUI) randomUI.classList.remove('active');
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

  if (randomQEl) randomQEl.textContent = QUESTIONS[idx];
  if (randomNumEl) randomNumEl.textContent = `Pregunta #${idx + 1} de ${QUESTIONS.length}`;
  highlightCard(idx);
}

if (btnRandom) btnRandom.addEventListener('click', () => {
  isRandomMode = true;
  showRandomUI();
  if (stopBtn) stopBtn.disabled = false;
  pickRandomQuestion();
});

if (btnNextRandom) btnNextRandom.addEventListener('click', () => {
  synth.cancel();
  pickRandomQuestion();
});

if (btnListenRandom) btnListenRandom.addEventListener('click', () => {
  const text = randomQEl.textContent;
  if (text) speakQuestion(text, 0.7, null);
});

if (btnCloseRandom) btnCloseRandom.addEventListener('click', () => {
  synth.cancel();
  hideRandomUI();
  clearHighlights();
  if (stopBtn) stopBtn.disabled = true;
});

// Load voices when ready
if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = () => {}; // trigger load
}

renderQuestionCards();

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


// ── Dynamic Content, Ads, Users and Forum ───────────────────────────────
(function () {
  const CONFIG = window.WT_CONFIG || {};
  const state = {
    content: null,
    groups: [],
    currentUser: JSON.parse(localStorage.getItem('wt_user') || 'null'),
    sessionToken: localStorage.getItem('wt_session') || ''
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const isActive = value => ['true', '1', 'si', 'sí', 'activo', 'active', true].includes(String(value).trim().toLowerCase());
  const driveThumbUrl = fileId => fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w400` : '';
  const userPhotoUrl = user => user?.photo_url || driveThumbUrl(user?.photo_file_id) || './images/logo.png';

  function publicApiUrl(baseUrl, params = {}) {
    if (!baseUrl) return '';
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }

  async function apiGet(baseUrl, params = {}) {
    if (!baseUrl) return null;
    const res = await fetch(publicApiUrl(baseUrl, params));
    const data = await res.json();
    if (data && data.ok === false) throw new Error(data.message || 'Error de servidor');
    return data;
  }

  async function apiPost(baseUrl, payload = {}) {
    if (!baseUrl) throw new Error('Esta Web App todavía no está configurada. Pega la URL en js/config.js.');
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data && data.ok === false) throw new Error(data.message || 'Error de servidor');
    return data;
  }

  function adHtml(ad, mode = 'banner') {
    if (!ad || !isActive(ad.active)) return '';
    const title = escapeHtml(ad.title || ad.titulo || 'Anuncio');
    const desc = escapeHtml(ad.description || ad.descripcion || '');
    const img = ad.image_url || ad.imagen_url || ad.image || '';
    const link = ad.link_url || ad.enlace || '#';
    const cta = escapeHtml(ad.cta || 'Ver más');
    if (mode === 'featured') {
      return `<a class="featured-ad-card" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
        ${img ? `<img src="${escapeHtml(img)}" alt="${title}" loading="lazy">` : ''}
        <span><h3>${title}</h3><p>${desc}</p><span class="ad-cta">${cta} →</span></span>
      </a>`;
    }
    return `<div class="ad-banner">
      ${img ? `<img src="${escapeHtml(img)}" alt="${title}" loading="lazy">` : ''}
      <span style="flex:1"><h3>${title}</h3><p>${desc}</p></span>
      <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${cta}</a>
    </div>`;
  }

  function renderAds(content) {
    const ads = Array.isArray(content?.ads) ? content.ads : [];
    const byType = type => ads.filter(a => isActive(a.active) && String(a.type || a.tipo || '').toLowerCase() === type);
    const banner = byType('banner_principal')[0] || byType('banner')[0];
    const popup = byType('popup')[0];
    const between = byType('entre_secciones');
    const featured = byType('destacado');

    const bannerSlot = $('#adBannerPrincipal');
    if (bannerSlot) bannerSlot.innerHTML = banner ? adHtml(banner) : '';

    const featuredSlot = $('#heroFeaturedAds');
    if (featuredSlot) featuredSlot.innerHTML = featured.slice(0, 3).map(a => adHtml(a, 'featured')).join('');

    ['#adAfterServicios', '#adAfterComunidad', '#adAfterPreguntas', '#adAfterRecord', '#adAfterVisa', '#adAfterInternet'].forEach((sel, i) => {
      const slot = $(sel);
      if (slot && between[i]) slot.innerHTML = adHtml(between[i]);
    });

    const popupSeenKey = 'wt_popup_seen_' + (popup?.id || popup?.title || 'main');
    if (popup && !sessionStorage.getItem(popupSeenKey)) {
      const contentBox = $('#adPopupContent');
      const overlay = $('#adPopup');
      if (contentBox && overlay) {
        contentBox.innerHTML = adHtml(popup);
        setTimeout(() => {
          overlay.hidden = false;
          sessionStorage.setItem(popupSeenKey, '1');
        }, Number(popup.delay_ms || 2500));
      }
    }
  }

  function renderInstagram(content) {
    const instagram = content?.instagram || {};
    const active = isActive(instagram.active ?? instagram.activo);
    const url = instagram.url || instagram.enlace || CONFIG.DEFAULT_INSTAGRAM_URL;
    ['#heroInstagramBtn', '#communityInstagramBtn', '#footerInstagramBtn'].forEach(sel => {
      const btn = $(sel);
      if (!btn) return;
      btn.href = url;
      btn.style.display = active ? 'inline-flex' : 'none';
    });
  }

  function renderServices(content) {
    const grid = $('#servicesGrid');
    const course = content?.englishCourse || content?.cursoIngles || {};
    const services = Array.isArray(content?.services)
      ? content.services.filter(s => isActive(s.active ?? s.activo)).sort((a, b) => Number(a.order || a.orden || 999) - Number(b.order || b.orden || 999))
      : [];

    if (grid && services.length) {
      const serviceCards = services.map(s => `
        <article class="service-card ${isActive(s.featured ?? s.destacado) ? 'featured' : ''}">
          <div class="service-icon">${escapeHtml(s.icon || s.icono || '🧰')}</div>
          <h3>${escapeHtml(s.name || s.nombre || 'Servicio J1')}</h3>
          <p>${escapeHtml(s.description || s.descripcion || '')}</p>
          <a href="${escapeHtml(s.link_url || s.enlace || '#comunidad')}">${escapeHtml(s.cta || 'Ver más')}</a>
        </article>
      `).join('');
      const courseCard = isActive(course.active ?? course.activo ?? true) ? `
        <article class="service-card featured" id="englishCourseCard">
          <div class="service-icon">📚</div>
          <h3>${escapeHtml(course.title || course.titulo || 'Curso de inglés')}</h3>
          <p id="englishCourseDesc">${escapeHtml(course.description || course.descripcion || 'Contenido administrable desde Google Sheets.')}</p>
          <a id="englishCourseLink" href="${escapeHtml(course.link_url || course.enlace || '#comunidad')}">${escapeHtml(course.cta || 'Ver detalles')}</a>
        </article>
      ` : '';
      grid.innerHTML = serviceCards + courseCard;
      return;
    }

    const card = $('#englishCourseCard');
    if (!card) return;
    if (!isActive(course.active ?? course.activo ?? true)) {
      card.style.display = 'none';
      return;
    }
    card.style.display = '';
    const title = course.title || course.titulo || 'Curso de inglés';
    const desc = course.description || course.descripcion || 'Contenido administrable desde Google Sheets.';
    const url = course.link_url || course.enlace || '#comunidad';
    $('h3', card).textContent = title;
    $('#englishCourseDesc').textContent = desc;
    $('#englishCourseLink').href = url;
    $('#englishCourseLink').textContent = course.cta || 'Ver detalles';
  }

  function renderGroups(content) {
    const groups = Array.isArray(content?.groups) ? content.groups.filter(g => isActive(g.active ?? g.activo)) : [];
    state.groups = groups.sort((a, b) => Number(a.order || a.orden || 999) - Number(b.order || b.orden || 999));
    const main = state.groups.find(g => isActive(g.main ?? g.principal)) || state.groups[0];
    if (main) {
      const mainTitle = $('#mainWhatsappCard h3');
      const mainDesc = $('#mainWhatsappDesc');
      const mainLink = $('#mainWhatsappLink');
      if (mainTitle) mainTitle.textContent = main.name || main.nombre || 'Grupo Principal';
      if (mainDesc) mainDesc.textContent = main.description || main.descripcion || 'Comunidad de estudiantes Work and Travel.';
      if (mainLink) mainLink.href = main.link || main.enlace || '#';
    }
    paintGroupCards();
  }

  function paintGroupCards() {
    const grid = $('#groupsGrid');
    if (!grid) return;
    const q = ($('#groupSearch')?.value || '').toLowerCase();
    const filter = $('#groupFilter')?.value || 'all';
    const items = state.groups.filter(g => {
      if (filter === 'featured' && !isActive(g.featured ?? g.destacado)) return false;
      const haystack = [g.name, g.nombre, g.state, g.estado, g.description, g.descripcion].join(' ').toLowerCase();
      return !q || haystack.includes(q);
    });
    grid.innerHTML = items.length ? items.map(g => `
      <article class="group-card ${isActive(g.featured ?? g.destacado) ? 'featured' : ''}">
        <span class="state-tag">${escapeHtml(g.state || g.estado || 'General')}</span>
        <h3>${escapeHtml(g.name || g.nombre || 'Grupo de WhatsApp')}</h3>
        <p>${escapeHtml(g.description || g.descripcion || '')}</p>
        <a href="${escapeHtml(g.link || g.enlace || '#')}" target="_blank" rel="noopener noreferrer">Unirme</a>
      </article>
    `).join('') : '<div class="empty-state">No hay grupos activos que coincidan con tu búsqueda.</div>';
  }

  async function loadDynamicContent() {
    try {
      const data = await apiGet(CONFIG.CONTENT_API_URL, { action: 'public' });
      state.content = data?.data || data || {};
    } catch (err) {
      console.warn('Contenido dinámico no cargado:', err.message);
      state.content = fallbackContent();
    }
    renderAds(state.content);
    renderInstagram(state.content);
    renderServices(state.content);
    renderGroups(state.content);
  }

  function fallbackContent() {
    return {
      instagram: { active: false, url: CONFIG.DEFAULT_INSTAGRAM_URL },
      groups: [{ name: 'Summer Work 2026', state: 'General', description: 'Grupo principal de la comunidad.', link: 'https://chat.whatsapp.com/summer-work-2026', active: true, main: true, featured: true, order: 1 }],
      ads: [],
      englishCourse: { active: true, title: 'Curso de inglés', description: 'Conecta la Web App para administrar precio, enlace y descripción desde Google Sheets.', link_url: '#comunidad', cta: 'Solicitar información' }
    };
  }

  function showAuthMessage(type, msg) {
    const box = $('#authMessage');
    if (!box) return;
    box.className = `auth-message show ${type}`;
    box.textContent = msg;
  }

  function switchAuthTab(tab) {
    $$('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.authTab === tab));
    $$('.auth-panel').forEach(p => p.classList.toggle('active', p.dataset.authPanel === tab));
  }

  function updateAuthUi() {
    const logged = Boolean(state.currentUser && state.sessionToken);
    const role = String(state.currentUser?.role || '').toLowerCase();
    const adminAllowed = logged && ['admin','superadmin'].includes(role);
    const loginBtn = $('#openLoginBtn');
    const profileBtn = $('#openProfileBtn');
    if (loginBtn) loginBtn.style.display = logged ? 'none' : 'inline-flex';
    if (profileBtn) profileBtn.style.display = logged ? 'inline-flex' : 'none';
    $$('.auth-tab').forEach(tab => {
      const name = tab.dataset.authTab;
      if (logged) tab.style.display = name === 'profile' ? 'inline-flex' : 'none';
      else tab.style.display = ['login','register','recover'].includes(name) ? 'inline-flex' : 'none';
    });
    ['#adminNavLink','#adminMobileLink','#heroAdminBtn'].forEach(sel => {
      const el = $(sel); if (el) el.style.display = adminAllowed ? 'inline-flex' : 'none';
    });

    const forumPromo = $('#heroForumPromo');
    if (forumPromo) forumPromo.classList.toggle('logged-in', logged);
    const heroForumPhoto = $('#heroForumPhoto');
    const heroForumIconFallback = $('#heroForumIconFallback');

    if (logged) {
      const heroPhoto = userPhotoUrl(state.currentUser);
      if (heroForumPhoto) {
        heroForumPhoto.src = heroPhoto;
        heroForumPhoto.hidden = false;
        heroForumPhoto.onerror = () => {
          heroForumPhoto.hidden = true;
          if (heroForumIconFallback) heroForumIconFallback.textContent = '👋';
        };
      }
      if (heroForumIconFallback) heroForumIconFallback.textContent = '👋';
      if (heroForumIconFallback) heroForumIconFallback.style.display = heroForumPhoto ? 'none' : 'inline-flex';
      $('#heroForumLabel') && ($('#heroForumLabel').textContent = `Bienvenido${adminAllowed ? ' · administrador' : ''}`);
      $('#heroForumTitle') && ($('#heroForumTitle').textContent = `Hola, ${state.currentUser.name || 'estudiante'}`);
      $('#heroForumDesc') && ($('#heroForumDesc').textContent = adminAllowed
        ? 'Ya tienes sesión iniciada. Puedes entrar al foro, revisar publicaciones y abrir tu Panel Admin.'
        : 'Ya tienes sesión iniciada. Entra al foro para publicar, responder y seguir compartiendo con la comunidad.');
      $('#heroForumPrimaryBtn') && ($('#heroForumPrimaryBtn').textContent = 'Ir al Foro');
      $('#heroForumSecondaryBtn') && ($('#heroForumSecondaryBtn').textContent = adminAllowed ? 'Panel Admin' : 'Mi perfil');
      $('#heroForumSecondaryBtn') && ($('#heroForumSecondaryBtn').href = adminAllowed ? './admin.html' : './perfil.html');
    } else {
      if (heroForumPhoto) {
        heroForumPhoto.hidden = true;
        heroForumPhoto.removeAttribute('src');
      }
      if (heroForumIconFallback) {
        heroForumIconFallback.style.display = 'inline-flex';
        heroForumIconFallback.textContent = '🗣️';
      }
      $('#heroForumLabel') && ($('#heroForumLabel').textContent = 'Comunidad activa');
      $('#heroForumTitle') && ($('#heroForumTitle').textContent = 'Foro de Estudiantes Work and Travel RD');
      $('#heroForumDesc') && ($('#heroForumDesc').textContent = 'Pregunta, responde y comparte experiencias sobre entrevista consular, visa, documentos, housing, taxes, viajes e internet en USA.');
      $('#heroForumPrimaryBtn') && ($('#heroForumPrimaryBtn').textContent = 'Entrar al Foro');
      $('#heroForumSecondaryBtn') && ($('#heroForumSecondaryBtn').textContent = 'Iniciar sesión');
      $('#heroForumSecondaryBtn') && ($('#heroForumSecondaryBtn').href = './login.html?redirect=foro.html');
    }

    if (logged) {
      $('#profileName') && ($('#profileName').textContent = state.currentUser.name || 'Usuario');
      $('#profileEmail') && ($('#profileEmail').textContent = state.currentUser.email || '');
      $('#modalProfileNameInput') && ($('#modalProfileNameInput').value = state.currentUser.name || '');
      const profileImg = $('#profilePreview');
      if (profileImg) profileImg.src = userPhotoUrl(state.currentUser);
    }
  }

  function openAuth(tab = 'login') {
    const modal = $('#authModal');
    if (!modal) return;
    modal.hidden = false;
    updateAuthUi();
    const logged = Boolean(state.currentUser && state.sessionToken);
    switchAuthTab(logged ? 'profile' : tab);
  }

  function closeAuth() { const modal = $('#authModal'); if (modal) modal.hidden = true; }

  function formDataObj(form) { return Object.fromEntries(new FormData(form).entries()); }

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function loadForum() {
    const wrap = $('#forumPosts');
    if (!wrap) return;
    try {
      const data = await apiGet(CONFIG.FORUM_API_URL, { action: 'listPosts' });
      const posts = data?.data?.posts || data?.posts || [];
      wrap.innerHTML = posts.length ? posts.map(renderPost).join('') : '<div class="empty-state">Todavía no hay publicaciones. Sé el primero en publicar.</div>';
    } catch (err) {
      wrap.innerHTML = '<div class="empty-state">El foro se activará cuando conectes la Web App del Foro en js/config.js.</div>';
    }
  }

  function renderPost(post) {
    const status = post.status || post.estado || 'approved';
    return `<article class="forum-post" data-post-id="${escapeHtml(post.id || '')}">
      <h4>${escapeHtml(post.title || post.titulo || 'Publicación')}</h4>
      <div class="forum-meta">
        <span>${escapeHtml(post.category || post.categoria || 'General')}</span>
        <span>por ${escapeHtml(post.author_name || post.autor || 'Estudiante')}</span>
        <span class="status-badge ${escapeHtml(status)}">${escapeHtml(status)}</span>
      </div>
      <p>${escapeHtml(post.body || post.contenido || '')}</p>
      <div class="forum-actions">
        <button type="button" class="reply-btn">Responder</button>
        <button type="button" class="report-btn">Reportar</button>
      </div>
      <form class="comment-box">
        <textarea name="body" rows="3" maxlength="900" required placeholder="Escribe tu respuesta..."></textarea>
        <button class="btn btn-primary btn-sm" type="submit">Enviar respuesta</button>
      </form>
    </article>`;
  }

  document.addEventListener('click', async (e) => {
    if (e.target?.id === 'adPopupClose') $('#adPopup').hidden = true;
    if (e.target?.classList?.contains('legal-open')) { e.preventDefault(); const m = $('#legalModal'); if (m) m.hidden = false; }
    if (e.target?.id === 'legalClose') { const m = $('#legalModal'); if (m) m.hidden = true; }
    if (e.target?.id === 'openLoginBtn') openAuth('login');
    if (e.target?.id === 'openProfileBtn') openAuth('profile');
    if (e.target?.id === 'authClose') closeAuth();
    if (e.target?.classList?.contains('auth-tab')) switchAuthTab(e.target.dataset.authTab);
    if (e.target?.classList?.contains('reply-btn')) {
      const form = e.target.closest('.forum-post').querySelector('.comment-box');
      form.classList.toggle('active');
    }
    if (e.target?.classList?.contains('report-btn')) {
      const post = e.target.closest('.forum-post');
      try {
        await apiPost(CONFIG.FORUM_API_URL, { action: 'reportPost', post_id: post.dataset.postId, token: state.sessionToken, reason: 'Reporte desde la web' });
        window.WTNotify?.toast('Reporte enviado a moderación.', 'success', { title: 'Reporte enviado' });
      } catch (err) { window.WTNotify?.toast(err.message, 'error'); }
    }
    if (e.target?.id === 'modalSaveNameBtn') {
      e.preventDefault();
      if (!state.sessionToken) return showAuthMessage('error','Debes iniciar sesión primero.');
      try {
        const name = $('#modalProfileNameInput')?.value || '';
        const data = await apiPost(CONFIG.USERS_API_URL, { action:'updateProfile', token:state.sessionToken, name });
        state.currentUser = { ...(state.currentUser || {}), ...(data.user || data.data?.user || { name }) };
        localStorage.setItem('wt_user', JSON.stringify(state.currentUser));
        updateAuthUi();
        showAuthMessage('success','Nombre actualizado correctamente.');
      } catch (err) { showAuthMessage('error', err.message); }
    }
    if (e.target?.id === 'refreshForumBtn') loadForum();
    if (e.target?.id === 'logoutBtn') {
      localStorage.removeItem('wt_user'); localStorage.removeItem('wt_session');
      state.currentUser = null; state.sessionToken = ''; updateAuthUi(); showAuthMessage('info', 'Sesión cerrada.'); switchAuthTab('login');
    }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (form.id === 'loginForm') {
      e.preventDefault();
      try {
        const data = await apiPost(CONFIG.USERS_API_URL, { action: 'login', ...formDataObj(form) });
        const user = data.user || data.data?.user;
        const token = data.token || data.data?.token;
        state.currentUser = user; state.sessionToken = token;
        localStorage.setItem('wt_user', JSON.stringify(user)); localStorage.setItem('wt_session', token);
        updateAuthUi(); showAuthMessage('success', 'Sesión iniciada correctamente.'); switchAuthTab('profile'); loadForum();
      } catch (err) { showAuthMessage('error', err.message); }
    }
    if (form.id === 'registerForm') {
      e.preventDefault();
      try { const fd = formDataObj(form); await apiPost(CONFIG.USERS_API_URL, { action: 'register', ...fd }); $('#modalVerifyEmailHidden') && ($('#modalVerifyEmailHidden').value = fd.email); $('#modalVerifyEmailText') && ($('#modalVerifyEmailText').textContent = fd.email); const card = $('#modalVerifyEmailCard'); if(card){ card.hidden = false; card.style.display='flex'; } showAuthMessage('success', 'Te enviamos un código de verificación al correo. Revisa tu bandeja de entrada o spam.'); switchAuthTab('verify'); }
      catch (err) { showAuthMessage('error', err.message); }
    }
    if (form.id === 'verifyForm') {
      e.preventDefault();
      try { await apiPost(CONFIG.USERS_API_URL, { action: 'verifyEmail', ...formDataObj(form) }); showAuthMessage('success', 'Correo verificado. Ya puedes iniciar sesión.'); switchAuthTab('login'); }
      catch (err) { showAuthMessage('error', err.message); }
    }
    if (form.id === 'recoverForm') {
      e.preventDefault();
      try { const fd = formDataObj(form); await apiPost(CONFIG.USERS_API_URL, { action: 'requestPasswordReset', ...fd }); $('#modalResetEmailHidden') && ($('#modalResetEmailHidden').value = fd.email); $('#modalResetEmailText') && ($('#modalResetEmailText').textContent = fd.email); const card = $('#modalResetEmailCard'); if(card){ card.hidden=false; card.style.display='flex'; } const reset = $('#modalResetForm'); if(reset) reset.classList.remove('step-hidden'); showAuthMessage('success', 'Te enviamos un código de recuperación al correo. Revisa tu bandeja de entrada o spam.'); switchAuthTab('recover-reset'); }
      catch (err) { showAuthMessage('error', err.message); }
    }
    if (form.id === 'modalResetForm') {
      e.preventDefault();
      try { await apiPost(CONFIG.USERS_API_URL, { action:'resetPassword', ...formDataObj(form) }); showAuthMessage('success','Contraseña actualizada correctamente. Ya puedes iniciar sesión.'); switchAuthTab('login'); }
      catch (err) { showAuthMessage('error', err.message); }
    }
        if (form.id === 'profileForm') {
      e.preventDefault();
      const file = form.photo.files[0];
      if (!state.sessionToken) return showAuthMessage('error', 'Debes iniciar sesión primero.');
      if (!file) return showAuthMessage('info', 'Selecciona una foto primero.');
      if (file.size > (CONFIG.MAX_PROFILE_PHOTO_MB || 2) * 1024 * 1024) return showAuthMessage('error', 'La foto no puede pasar de 2 MB.');
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return showAuthMessage('error', 'Solo se permite JPG, JPEG, PNG o WEBP.');
      try {
        const base64 = await fileToBase64(file);
        const data = await apiPost(CONFIG.USERS_API_URL, { action: 'uploadProfilePhoto', token: state.sessionToken, file_name: file.name, mime_type: file.type, size: file.size, base64 });
        state.currentUser.photo_file_id = data.file_id || data.data?.file_id || state.currentUser.photo_file_id;
        state.currentUser.photo_url = data.photo_url || data.data?.photo_url || driveThumbUrl(state.currentUser.photo_file_id);
        localStorage.setItem('wt_user', JSON.stringify(state.currentUser)); updateAuthUi(); showAuthMessage('success', 'Foto actualizada correctamente.');
      } catch (err) { showAuthMessage('error', err.message); }
    }
    if (form.id === 'forumPostForm') {
      e.preventDefault();
      if (!state.sessionToken) return openAuth('login');
      try { await apiPost(CONFIG.FORUM_API_URL, { action: 'createPost', token: state.sessionToken, ...formDataObj(form) }); form.reset(); loadForum(); window.WTNotify?.toast('Publicación enviada. Si requiere moderación, aparecerá después de aprobarse.', 'success', { title: 'Publicación enviada' }); }
      catch (err) { window.WTNotify?.toast(err.message, 'error'); }
    }
    if (form.classList.contains('comment-box')) {
      e.preventDefault();
      if (!state.sessionToken) return openAuth('login');
      const post = form.closest('.forum-post');
      try { await apiPost(CONFIG.FORUM_API_URL, { action: 'createComment', token: state.sessionToken, post_id: post.dataset.postId, ...formDataObj(form) }); form.reset(); form.classList.remove('active'); window.WTNotify?.toast('Respuesta enviada. Puede pasar a moderación si contiene enlaces, teléfonos, correos o spam.', 'success', { title: 'Respuesta enviada' }); }
      catch (err) { window.WTNotify?.toast(err.message, 'error'); }
    }
  });

  $('#groupSearch')?.addEventListener('input', paintGroupCards);
  $('#groupFilter')?.addEventListener('change', paintGroupCards);

  loadDynamicContent();
  loadForum();
  updateAuthUi();
})();
