/* === Courses Clean — Supabase === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  let courses = [];

  function normalizeLink(raw = '#') {
    const value = String(raw || '').trim();
    if(!value || value === '#') return './foro.html';
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

  function imagePosition(value) {
    const map = {
      top: 'center top',
      bottom: 'center bottom',
      left: 'left center',
      right: 'right center',
      center: 'center center'
    };
    return map[String(value || 'center').toLowerCase()] || 'center center';
  }

  function imageFit(value) {
    return String(value || 'cover').toLowerCase() === 'contain' ? 'contain' : 'cover';
  }

  function displayTitle(value) {
    const raw = String(value || '').trim();
    if(!raw || /^[\d\s.,$RDrd-]+$/.test(raw)) return 'Curso de inglés';
    return raw;
  }

  async function loadCourses() {
    if(!window.WTDB || !window.WTDB.enabled()) {
      throw new Error('Supabase no está activo. Revisa js/supabase-config.js.');
    }
    const { data, error } = await window.WTDB.client()
      .from('english_courses')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending:true });

    if(error) throw error;
    return data || [];
  }

  function render() {
    const grid = $('#coursesGrid');
    const status = $('#coursesStatus');
    if(!grid || !status) return;

    const q = ($('#courseSearch')?.value || '').toLowerCase().trim();
    const filter = $('#courseFilter')?.value || 'all';

    let list = courses.filter(c => c.active);

    if(q) {
      list = list.filter(c => `${c.title || ''} ${c.description || ''} ${c.price || ''}`.toLowerCase().includes(q));
    }
    if(filter === 'featured') list = list.filter(c => c.featured);
    if(filter === 'free') list = list.filter(c => /gratis|free|rd\$0|\$0|0/i.test(String(c.price || '')));
    if(filter === 'paid') list = list.filter(c => !/gratis|free|rd\$0|\$0|0/i.test(String(c.price || '')));

    if(!list.length) {
      grid.innerHTML = '';
      status.textContent = courses.length ? 'No hay cursos que coincidan con ese filtro.' : 'No hay cursos activos disponibles todavía.';
      return;
    }

    status.textContent = `${list.length} curso${list.length === 1 ? '' : 's'} disponible${list.length === 1 ? '' : 's'}.`;

    grid.innerHTML = list.map(c => {
      const title = displayTitle(c.title);
      const img = c.image_url || '';
      const link = normalizeLink(c.link_url || './foro.html');
      const fit = imageFit(c.image_fit);
      const pos = imagePosition(c.image_position);
      return `
        <article class="course-card ${c.featured ? 'featured' : ''}">
          <div class="course-image">
            ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy" style="object-fit:${escapeHtml(fit)};object-position:${escapeHtml(pos)}">` : '<span>📚</span>'}
          </div>
          <div class="course-body">
            <div class="course-meta">
              ${c.featured ? '<span class="course-badge gold">Destacado</span>' : ''}
              <span class="course-badge">Inglés J1</span>
            </div>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(c.description || '')}</p>
            ${c.price ? `<div class="course-price">${escapeHtml(c.price)}</div>` : ''}
            <div class="course-actions">
              <a href="${escapeHtml(link)}" ${/^https?:/i.test(link) ? 'target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(c.cta || 'Solicitar información')}</a>
              <a class="secondary" href="./foro.html">Preguntar en el foro</a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function init() {
    $('#courseSearch')?.addEventListener('input', render);
    $('#courseFilter')?.addEventListener('change', render);
    try {
      courses = await loadCourses();
      render();
    } catch(err) {
      const status = $('#coursesStatus');
      if(status) status.textContent = err.message || 'No se pudieron cargar los cursos.';
    }
  }

  init();
})();
