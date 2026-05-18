/* === SUPABASE CONTENT CLIENT — Fase 1 === */
(function(){
  const cfg = window.WT_SUPABASE_CONFIG || {};

  function ready(){
    return !!(cfg.USE_SUPABASE && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  }

  function client(){
    if(!ready()) return null;
    if(!window.WTSupabaseClient){
      window.WTSupabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return window.WTSupabaseClient;
  }

  function mapAnnouncement(r){
    return {
      id: r.legacy_id || r.id,
      tipo: r.type,
      posicion: r.position,
      titulo: r.title,
      descripcion: r.description,
      imagen_url: r.image_url,
      image_path: r.image_path,
      image_position: r.image_position || 'center',
      image_fit: r.image_fit || 'cover',
      enlace: r.link_url,
      cta: r.cta,
      orden: r.sort_order,
      destacado: r.featured,
      activo: r.active,
      delay_ms: r.delay_ms,
      fecha_inicio: r.starts_at,
      fecha_fin: r.ends_at
    };
  }

  function mapService(r){
    return {
      id: r.legacy_id || r.id,
      nombre: r.name,
      descripcion: r.description,
      icono: r.icon,
      imagen_url: r.image_url,
      image_path: r.image_path,
      image_position: r.image_position || 'center',
      image_fit: r.image_fit || 'cover',
      enlace: r.link_url,
      cta: r.cta,
      orden: r.sort_order,
      destacado: r.featured,
      activo: r.active
    };
  }

  function mapCourse(r){
    return {
      id: r.legacy_id || r.id,
      titulo: r.title,
      descripcion: r.description,
      precio: r.price,
      imagen_url: r.image_url,
      image_path: r.image_path,
      image_position: r.image_position || 'center',
      image_fit: r.image_fit || 'cover',
      enlace: r.link_url,
      cta: r.cta,
      orden: r.sort_order,
      destacado: r.featured,
      activo: r.active
    };
  }

  function mapGroup(r){
    return {
      id: r.legacy_id || r.id,
      nombre: r.name,
      estado: r.state,
      descripcion: r.description,
      enlace: r.link_url,
      orden: r.sort_order,
      destacado: r.featured,
      principal: r.main_group,
      activo: r.active
    };
  }

  function mapInstagram(r){
    return {
      id: 'IG-001',
      url: r?.url || '',
      texto_boton: r?.button_text || 'Síguenos en Instagram',
      mostrar_inicio: !!r?.show_home,
      mostrar_footer: !!r?.show_footer,
      mostrar_comunidad: !!r?.show_community,
      activo: !!r?.active
    };
  }

  async function loadPublicContent(){
    const db = client();
    if(!db) throw new Error('Supabase no está configurado o USE_SUPABASE está en false.');

    const now = new Date().toISOString();

    const [
      adsRes,
      servicesRes,
      coursesRes,
      groupsRes,
      instagramRes,
      settingsRes
    ] = await Promise.all([
      db.from('announcements')
        .select('*')
        .eq('active', true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('sort_order', { ascending:true }),

      db.from('services_j1')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending:true }),

      db.from('english_courses')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending:true }),

      db.from('whatsapp_groups')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending:true }),

      db.from('instagram_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle(),

      db.from('site_settings')
        .select('*')
        .eq('is_public', true)
    ]);

    [adsRes, servicesRes, coursesRes, groupsRes, instagramRes, settingsRes].forEach(res => {
      if(res.error) throw res.error;
    });

    const englishCourses = (coursesRes.data || []).map(mapCourse);

    return {
      config: settingsRes.data || [],
      ads: (adsRes.data || []).map(mapAnnouncement),
      services: (servicesRes.data || []).map(mapService),
      englishCourses,
      englishCourse: englishCourses[0] || {},
      groups: (groupsRes.data || []).map(mapGroup),
      instagram: mapInstagram(instagramRes.data)
    };
  }

  async function uploadContentImage(file, folder='content'){
    const db = client();
    if(!db) throw new Error('Supabase no está configurado.');
    if(!file) return { url:'', path:'' };

    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${folder}/${Date.now()}-${safe}`;

    const { error } = await db.storage
      .from(cfg.BUCKET_CONTENT_IMAGES || 'content-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if(error) throw error;

    const { data } = db.storage
      .from(cfg.BUCKET_CONTENT_IMAGES || 'content-images')
      .getPublicUrl(path);

    return { url: data.publicUrl, path };
  }

  window.WTSupabase = {
    ready,
    client,
    loadPublicContent,
    uploadContentImage
  };
})();
