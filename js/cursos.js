
/* === Cursos de Inglés — Work and Travel Guide RD === */
(function(){
  const CONFIG = window.WT_CONFIG || {};
  const $ = (s, r=document) => r.querySelector(s);
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const truthy = value => ['true','1','si','sí','activo','active', true].includes(String(value).trim().toLowerCase());

  let courses = [];

  function normalizeLink(raw = '#') {
    const value = String(raw || '').trim();
    if (!value || value === '#') return './foro.html';
    const map = {
      '#comunidad': './index.html#comunidad',
      '#preguntas': './preguntas.html',
      '#record': './record.html',
      '#visa': './visa.html',
      '#internet': './internet.html',
      '#foro': './foro.html'
    };
    return map[value.toLowerCase()] || value;
  }

  async function loadPublicContent() {
    if (!CONFIG.CONTENT_API_URL) throw new Error('Falta CONTENT_API_URL en js/config.js.');
    const url = new URL(CONFIG.CONTENT_API_URL);
    url.searchParams.set('action', 'public');
    url.searchParams.set('_', Date.now());
    const res = await fetch(url.toString(), { cache:'no-store' });
    const data = await res.json();
    if (data.ok === false) throw new Error(data.message || 'No se pudo cargar contenido.');
    return data.data || {};
  }

  function courseImage(course) {
    return course.image_url || course.imagen_url || course.image || '';
  }

  function render() {
    const grid = $('#coursesGrid');
    const status = $('#coursesStatus');
    const q = ($('#courseSearch')?.value || '').toLowerCase().trim();
    const filter = $('#courseFilter')?.value || 'all';

    let list = courses.filter(c => truthy(c.activo ?? c.active));

    if (q) {
      list = list.filter(c => `${c.titulo || c.title || ''} ${c.descripcion || c.description || ''} ${c.precio || ''}`.toLowerCase().includes(q));
    }

    if (filter === 'featured') list = list.filter(c => truthy(c.destacado ?? c.featured));
    if (filter === 'free') list = list.filter(c => /gratis|free|rd\$0|\$0|0/i.test(String(c.precio || '')));
    if (filter === 'paid') list = list.filter(c => !/gratis|free|rd\$0|\$0|0/i.test(String(c.precio || '')));

    list.sort((a,b) => Number(a.orden || a.order || 999) - Number(b.orden || b.order || 999));

    if (!list.length) {
      grid.innerHTML = '';
      status.textContent = courses.length ? 'No hay cursos que coincidan con ese filtro.' : 'No hay cursos activos disponibles todavía.';
      return;
    }

    status.textContent = `${list.length} curso${list.length === 1 ? '' : 's'} disponible${list.length === 1 ? '' : 's'}.`;

    grid.innerHTML = list.map(c => {
      const title = c.titulo || c.title || 'Curso de inglés';
      const desc = c.descripcion || c.description || '';
      const price = c.precio || c.costo || '';
      const img = courseImage(c);
      const link = normalizeLink(c.enlace || c.link_url || c.url || './foro.html');
      const cta = c.cta || 'Solicitar información';
      const featured = truthy(c.destacado ?? c.featured);
      return `
        <article class="course-card ${featured ? 'featured' : ''}">
          <div class="course-image">
            ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">` : '<span>📚</span>'}
          </div>
          <div class="course-body">
            <div class="course-meta">
              ${featured ? '<span class="course-badge gold">Destacado</span>' : ''}
              <span class="course-badge">Inglés J1</span>
            </div>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(desc)}</p>
            ${price ? `<div class="course-price">${escapeHtml(price)}</div>` : ''}
            <div class="course-actions">
              <a href="${escapeHtml(link)}" ${/^https?:/i.test(link) ? 'target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(cta)}</a>
              <a class="secondary" href="./foro.html">Preguntar en el foro</a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function updateAuthUi() {
    const user = JSON.parse(localStorage.getItem('wt_user') || 'null');
    const role = String(user?.role || '').toLowerCase();
    const adminAllowed = ['admin','superadmin'].includes(role);
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = adminAllowed ? 'inline-flex' : 'none');
  }

  async function init() {
    updateAuthUi();
    $('#courseSearch')?.addEventListener('input', render);
    $('#courseFilter')?.addEventListener('change', render);
    try {
      const content = await loadPublicContent();
      courses = Array.isArray(content.englishCourses)
        ? content.englishCourses
        : (content.englishCourse && Object.keys(content.englishCourse).length ? [content.englishCourse] : []);
      render();
    } catch (err) {
      $('#coursesStatus').textContent = err.message || 'No se pudieron cargar los cursos.';
    }
  }

  init();
})();
