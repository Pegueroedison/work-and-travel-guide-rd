/* === Content Clean — Supabase only for content/publicidad === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escapeHtml = (v='') => String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const truthy = v => ['true','1','si','sí','yes','activo','active', true].includes(String(v ?? '').trim().toLowerCase());

  function normalizeLink(raw = '#') {
    const value = String(raw || '').trim();
    if(!value || value === '#') return '#';
    const map = {
      '#preguntas': './preguntas.html',
      '#record': './record.html',
      '#records': './record.html',
      '#visa': './visa.html',
      '#internet': './internet.html',
      '#foro': './foro.html',
      '#cursos': './cursos.html',
      '#comunidad': './index.html#comunidad'
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

  async function loadPublicContent(){
    const db = window.WTDB.client();
    const now = new Date().toISOString();

    const [ads, services, courses, groups, instagram, settings] = await Promise.all([
      db.from('announcements')
        .select('*')
        .eq('active', true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('sort_order', { ascending: true }),

      db.from('services_j1')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true }),

      db.from('english_courses')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true }),

      db.from('whatsapp_groups')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true }),

      db.from('instagram_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle(),

      db.from('site_settings')
        .select('*')
        .eq('is_public', true)
    ]);

    [ads, services, courses, groups, instagram, settings].forEach(res => {
      if(res.error) throw res.error;
    });

    return {
      ads: ads.data || [],
      services: services.data || [],
      courses: courses.data || [],
      groups: groups.data || [],
      instagram: instagram.data || null,
      settings: settings.data || []
    };
  }

  function adHtml(ad, mode='banner') {
    const title = escapeHtml(ad.title || 'Anuncio');
    const desc = escapeHtml(ad.description || '');
    const img = ad.image_url || '';
    const link = normalizeLink(ad.link_url || '#');
    const cta = escapeHtml(ad.cta || 'Ver más');
    const imgStyle = `object-position:${escapeHtml(imagePosition(ad.image_position))};object-fit:${escapeHtml(imageFit(ad.image_fit))};`;
    if(mode === 'featured') {
      return `<a class="featured-ad-card" href="${escapeHtml(link)}" ${/^https?:/i.test(link) ? 'target="_blank" rel="noopener noreferrer"' : ''}>
        ${img ? `<img src="${escapeHtml(img)}" alt="${title}" loading="lazy" style="${imgStyle}">` : ''}
        <span><h3>${title}</h3><p>${desc}</p><span class="ad-cta">${cta} →</span></span>
      </a>`;
    }
    return `<div class="ad-banner">
      ${img ? `<img src="${escapeHtml(img)}" alt="${title}" loading="lazy" style="${imgStyle}">` : ''}
      <span style="flex:1"><h3>${title}</h3><p>${desc}</p></span>
      <a href="${escapeHtml(link)}" ${/^https?:/i.test(link) ? 'target="_blank" rel="noopener noreferrer"' : ''}>${cta}</a>
    </div>`;
  }

  function renderAds(content) {
    const ads = [...(content.ads || [])].sort((a,b) => Number(a.sort_order || 999) - Number(b.sort_order || 999));
    const typeOf = a => String(a.type || '').toLowerCase().trim();
    const posOf = a => String(a.position || '').toLowerCase().trim();

    const banner = ads.find(a => typeOf(a) === 'banner_principal') || ads.find(a => posOf(a) === 'inicio');
    const popup = ads.find(a => typeOf(a) === 'popup' || posOf(a) === 'popup');
    const featured = ads.filter(a => typeOf(a) === 'destacado' || posOf(a) === 'hero');

    const bannerSlot = $('#adBannerPrincipal');
    if(bannerSlot) bannerSlot.innerHTML = banner ? adHtml(banner) : '';

    const featuredSlot = $('#heroFeaturedAds');
    if(featuredSlot) featuredSlot.innerHTML = featured.slice(0,3).map(a => adHtml(a, 'featured')).join('');

    const slotMap = {
      despues_servicios: '#adAfterServicios',
      despues_comunidad: '#adAfterComunidad',
      despues_preguntas: '#adAfterPreguntas',
      despues_record: '#adAfterRecord',
      despues_visa: '#adAfterVisa',
      despues_internet: '#adAfterInternet'
    };

    Object.entries(slotMap).forEach(([position, selector]) => {
      const slot = $(selector);
      if(!slot) return;
      const ad = ads.find(a => posOf(a) === position);
      slot.innerHTML = ad ? adHtml(ad) : '';
    });

    if(popup) {
      const overlay = $('#adPopup');
      const box = $('#adPopupContent');
      const key = 'wt_popup_seen_' + (popup.id || popup.legacy_id || popup.title);
      if(overlay && box && !sessionStorage.getItem(key)) {
        const html = adHtml(popup);
        if(html.trim()) {
          box.innerHTML = html;
          setTimeout(() => {
            overlay.hidden = false;
            sessionStorage.setItem(key, '1');
          }, Number(popup.delay_ms || 2500));
        }
      }
    }
  }

  function serviceLink(s) {
    return normalizeLink(s.link_url || '#comunidad');
  }

  function renderServices(content) {
    const grid = $('#servicesGrid');
    if(!grid) return;

    const services = (content.services || []).map(s => ({ ...s, kind:'service' }));
    const courses = content.courses || [];
    const hasCourses = courses.length > 0;

    const serviceCards = services.map(s => {
      const link = serviceLink(s);
      return `<article class="service-card ${s.featured ? 'featured' : ''}" data-card-link="${escapeHtml(link)}">
        <div class="service-icon">${escapeHtml(s.icon || '🧰')}</div>
        <h3>${escapeHtml(s.name || 'Servicio J1')}</h3>
        <p>${escapeHtml(s.description || '')}</p>
        <a class="service-action" href="${escapeHtml(link)}">${escapeHtml(s.cta || 'Ver más')}</a>
      </article>`;
    }).join('');

    const courseCard = `<article class="service-card featured" data-card-link="./cursos.html">
      <div class="service-icon">📚</div>
      <h3>Cursos de inglés</h3>
      <p>${hasCourses ? `${courses.length} curso${courses.length === 1 ? '' : 's'} disponible${courses.length === 1 ? '' : 's'}. Entra para ver fotos, costos y detalles.` : 'Cursos disponibles para prepararte para tu entrevista J1.'}</p>
      <a class="service-action" href="./cursos.html">Ver cursos disponibles</a>
    </article>`;

    grid.innerHTML = serviceCards + courseCard;
  }

  function renderInstagram(content) {
    const ig = content.instagram || {};
    const active = !!ig.active;
    const url = ig.url || '#';
    ['#heroInstagramBtn', '#communityInstagramBtn', '#footerInstagramBtn'].forEach(sel => {
      const btn = $(sel);
      if(!btn) return;
      btn.href = url;
      btn.style.display = active ? 'inline-flex' : 'none';
    });
  }

  function renderGroups(content) {
    const grid = $('#groupsGrid');
    if(!grid) return;

    window.WTGroups = content.groups || [];

    const paint = () => {
      const q = ($('#groupSearch')?.value || '').toLowerCase();
      const filter = $('#groupFilter')?.value || 'all';
      let items = [...window.WTGroups].sort((a,b) => Number(a.sort_order || 999) - Number(b.sort_order || 999));

      if(filter === 'main') items = items.filter(g => g.main_group);
      if(filter === 'featured') items = items.filter(g => g.featured);
      if(filter !== 'all' && filter !== 'main' && filter !== 'featured') {
        items = items.filter(g => String(g.state || '').toLowerCase() === filter.toLowerCase());
      }
      if(q) {
        items = items.filter(g => `${g.name || ''} ${g.state || ''} ${g.description || ''}`.toLowerCase().includes(q));
      }

      grid.innerHTML = items.length ? items.map(g => `
        <article class="group-card ${g.featured ? 'featured' : ''}">
          <span class="state-tag">${escapeHtml(g.state || 'General')}</span>
          <h3>${escapeHtml(g.name || 'Grupo de WhatsApp')}</h3>
          <p>${escapeHtml(g.description || '')}</p>
          <a href="${escapeHtml(g.link_url || '#')}" target="_blank" rel="noopener noreferrer">Unirme</a>
        </article>
      `).join('') : '<div class="empty-state">No hay grupos activos que coincidan con tu búsqueda.</div>';
    };

    paint();
    $('#groupSearch')?.addEventListener('input', paint);
    $('#groupFilter')?.addEventListener('change', paint);
  }

  function applyTheme(content) {
    const root = document.documentElement;
    const settings = content.settings || [];
    const get = key => settings.find(s => s.key === key)?.value;
    const map = {
      '--navy': get('theme_primary_color'),
      '--red': get('theme_red_color'),
      '--gold': get('theme_gold_color')
    };
    Object.entries(map).forEach(([k,v]) => { if(v) root.style.setProperty(k, v); });
  }

  async function initContent() {
    if(!window.WTDB || !window.WTDB.enabled()) {
      console.warn('Supabase Clean Content: desactivado. Activa USE_SUPABASE en js/supabase-config.js.');
      return;
    }

    try {
      const content = await loadPublicContent();
      window.WTContent = content;
      applyTheme(content);
      renderAds(content);
      renderServices(content);
      renderInstagram(content);
      renderGroups(content);
    } catch(err) {
      console.error('Error cargando contenido desde Supabase:', err);
      const slot = $('#adBannerPrincipal');
      if(slot) slot.innerHTML = `<div class="ad-banner"><span><h3>Error Supabase</h3><p>${escapeHtml(err.message || err)}</p></span></div>`;
    }
  }

  document.addEventListener('click', event => {
    const closePopup = event.target?.id === 'adPopupClose' || event.target?.id === 'adPopup';
    if(closePopup) {
      const overlay = $('#adPopup');
      if(overlay) overlay.hidden = true;
    }

    const card = event.target.closest && event.target.closest('.service-card[data-card-link]');
    if(card && !event.target.closest('a, button, input, textarea, select')) {
      const link = card.dataset.cardLink;
      if(link) window.location.href = link;
    }
  });

  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') {
      const overlay = $('#adPopup');
      if(overlay && !overlay.hidden) overlay.hidden = true;
    }
  });

  window.WTContentClean = {
    loadPublicContent,
    initContent
  };

  initContent();
})();
