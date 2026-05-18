/* === Auth Clean — Supabase Global Login/Register === */
(function(){
  const $ = (s, r=document) => r.querySelector(s);

  function redirectTarget(){
    const p = new URLSearchParams(location.search);
    return p.get('redirect') || p.get('next') || 'index.html';
  }

  function message(type, text){
    let box = $('#authMessage') || $('.auth-message');
    if(!box){
      box = document.createElement('div');
      box.id = 'authMessage';
      box.className = 'auth-message';
      const form = document.querySelector('form') || document.querySelector('.auth-card');
      form?.prepend(box);
    }
    box.className = 'auth-message show ' + (type || 'info');
    box.textContent = text || '';
  }

  async function login(email, password){
    if(!window.WTDB?.enabled()) throw new Error('Supabase no está activo.');
    const { error } = await window.WTDB.client().auth.signInWithPassword({ email, password });
    if(error) throw error;
    message('success', 'Sesión Supabase iniciada correctamente.');
    setTimeout(() => { window.location.href = redirectTarget(); }, 550);
  }

  async function register(email, password, fullName=''){
    if(!window.WTDB?.enabled()) throw new Error('Supabase no está activo.');
    const { error } = await window.WTDB.client().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || email.split('@')[0] } }
    });
    if(error) throw error;
    message('success', 'Cuenta creada en Supabase. Si requiere verificación, revisa tu correo. Si no, ya puedes iniciar sesión.');
    setTimeout(() => { window.location.href = `login.html?redirect=${encodeURIComponent(redirectTarget())}`; }, 900);
  }

  async function recover(email){
    if(!window.WTDB?.enabled()) throw new Error('Supabase no está activo.');
    const redirectTo = location.origin + location.pathname.replace(/[^/]+$/, 'login.html');
    const { error } = await window.WTDB.client().auth.resetPasswordForEmail(email, { redirectTo });
    if(error) throw error;
    message('success', 'Te enviamos instrucciones de recuperación al correo.');
  }

  function formEmail(form){
    return (form.querySelector('[name="email"], #email, input[type="email"]')?.value || '').trim();
  }

  function formPassword(form){
    return (form.querySelector('[name="password"], #password, input[type="password"]')?.value || '').trim();
  }

  document.addEventListener('submit', async event => {
    const form = event.target;
    const isLogin = document.body.dataset.page === 'login' || /login\.html/i.test(location.pathname);
    const isRegister = document.body.dataset.page === 'registro' || /registro\.html/i.test(location.pathname);
    if(!isLogin && !isRegister) return;

    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation) event.stopImmediatePropagation();

    try{
      const email = formEmail(form);
      const password = formPassword(form);
      const name = (form.querySelector('[name="name"], [name="full_name"], #name, #fullName')?.value || '').trim();
      if(!email) throw new Error('Escribe el correo.');
      if(!password && !form.dataset.recover) throw new Error('Escribe la contraseña.');

      if(isRegister) await register(email, password, name);
      else await login(email, password);
    }catch(err){
      message('error', err.message || String(err));
    }
  }, true);

  document.addEventListener('click', async event => {
    if(event.target?.id === 'recoverPasswordBtn' || event.target?.matches?.('[data-auth-recover]')){
      event.preventDefault();
      try{
        const email = ($('#email')?.value || $('input[type="email"]')?.value || '').trim();
        if(!email) throw new Error('Escribe tu correo primero.');
        await recover(email);
      }catch(err){ message('error', err.message || String(err)); }
    }
  }, true);
})();
