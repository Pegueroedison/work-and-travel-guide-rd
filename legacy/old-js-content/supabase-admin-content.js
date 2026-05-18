/* === SUPABASE ADMIN CONTENT — Fase 1 ===
   Este archivo es opcional. Sirve para que el Panel Admin guarde contenido directo en Supabase.
   Para activarlo completamente, carga este archivo en admin.html DESPUÉS de supabase-content.js.
*/
(function(){
  if(!window.WTSupabase) return;

  const $ = (s,r=document)=>r.querySelector(s);
  const truthy = v => ['true','1','si','sí','yes','activo','active'].includes(String(v ?? '').trim().toLowerCase());

  function msg(type, text){
    const el = $('#adminMessage');
    if(el){
      el.className = 'admin-message ' + (type || 'info');
      el.textContent = text || '';
    }
  }

  async function requireAdmin(){
    const db = window.WTSupabase.client();
    const { data:{ user }, error } = await db.auth.getUser();
    if(error || !user) throw new Error('Debes iniciar sesión.');
    const { data: profile, error: pErr } = await db.from('user_profiles').select('role,status,email').eq('id', user.id).single();
    if(pErr) throw pErr;
    if(!['admin','superadmin'].includes(profile.role) || profile.status !== 'active') {
      throw new Error('No tienes permiso de admin.');
    }
    return { user, profile };
  }

  async function saveAnnouncement(row, file){
    const { user } = await requireAdmin();
    let image = {};
    if(file) image = await window.WTSupabase.uploadContentImage(file, 'announcements');

    const payload = {
      legacy_id: row.id || null,
      type: row.tipo,
      position: row.posicion,
      title: row.titulo,
      description: row.descripcion,
      image_url: image.url || row.imagen_url || null,
      image_path: image.path || row.image_path || null,
      image_position: row.image_position || 'center',
      image_fit: row.image_fit || 'cover',
      link_url: row.enlace || null,
      cta: row.cta || 'Ver más',
      sort_order: Number(row.orden || 1),
      featured: truthy(row.destacado),
      active: truthy(row.activo),
      delay_ms: Number(row.delay_ms || 2500),
      created_by: user.id
    };

    const db = window.WTSupabase.client();
    const { error } = await db.from('announcements').upsert(payload, { onConflict:'legacy_id' });
    if(error) throw error;
  }

  window.WTSupabaseAdminContent = {
    requireAdmin,
    saveAnnouncement
  };
})();
