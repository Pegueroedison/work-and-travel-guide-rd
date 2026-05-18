/* === Supabase Client — Work and Travel RD === */
(function(){
  const cfg = window.WT_SUPABASE_CONFIG || {};

  function enabled(){
    return !!(cfg.USE_SUPABASE && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  }

  function getClient(){
    if(!enabled()) {
      throw new Error('Supabase no está activo. Revisa js/supabase-config.js.');
    }
    if(!window.WT_DB){
      window.WT_DB = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return window.WT_DB;
  }

  async function getUser(){
    if(!enabled()) return null;
    const { data, error } = await getClient().auth.getUser();
    if(error) return null;
    return data.user || null;
  }

  async function getProfile(){
    const user = await getUser();
    if(!user) return null;
    const { data, error } = await getClient()
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if(error) return null;
    return data;
  }

  async function isAdmin(){
    const profile = await getProfile();
    return !!(profile && ['admin','superadmin'].includes(profile.role) && profile.status === 'active');
  }

  window.WTDB = {
    enabled,
    client: getClient,
    getUser,
    getProfile,
    isAdmin,
    config: cfg
  };
})();
