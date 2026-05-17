/* === WORK AND TRAVEL GUIDE RD — UI NOTIFICATIONS === */
(function () {
  const ICONS = {
    success: '✓',
    error: '!',
    warning: '!',
    info: 'i',
    question: '?'
  };

  const TITLES = {
    success: 'Listo',
    error: 'Algo salió mal',
    warning: 'Atención',
    info: 'Aviso',
    question: 'Confirmar acción'
  };

  function ensureToastRoot() {
    let root = document.getElementById('wtToastRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'wtToastRoot';
      root.className = 'wt-toast-root';
      root.setAttribute('aria-live', 'polite');
      root.setAttribute('aria-atomic', 'true');
      document.body.appendChild(root);
    }
    return root;
  }

  function toast(message, type = 'info', options = {}) {
    const root = ensureToastRoot();
    const item = document.createElement('div');
    const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
    item.className = `wt-toast wt-toast-${safeType}`;
    item.innerHTML = `
      <div class="wt-toast-icon" aria-hidden="true">${ICONS[safeType]}</div>
      <div class="wt-toast-content">
        <strong>${options.title || TITLES[safeType]}</strong>
        <span>${String(message || '').replace(/[<>&]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]))}</span>
      </div>
      <button type="button" class="wt-toast-close" aria-label="Cerrar aviso">×</button>
    `;
    root.appendChild(item);

    const close = () => {
      item.classList.add('is-hiding');
      window.setTimeout(() => item.remove(), 230);
    };
    item.querySelector('.wt-toast-close').addEventListener('click', close);
    window.setTimeout(close, Number(options.duration || 4200));
    return close;
  }

  function modal(message, options = {}) {
    const type = options.type || 'info';
    const safeType = ['success', 'error', 'warning', 'info', 'question'].includes(type) ? type : 'info';
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'wt-dialog-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="wt-dialog wt-dialog-${safeType}">
          <div class="wt-dialog-icon" aria-hidden="true">${ICONS[safeType]}</div>
          <div class="wt-dialog-body">
            <h3>${options.title || TITLES[safeType]}</h3>
            <p>${String(message || '').replace(/[<>&]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]))}</p>
            <div class="wt-dialog-actions"></div>
          </div>
        </div>
      `;

      const actions = overlay.querySelector('.wt-dialog-actions');
      const closeWith = value => {
        overlay.classList.add('is-closing');
        document.removeEventListener('keydown', onKeyDown);
        window.setTimeout(() => {
          overlay.remove();
          resolve(value);
        }, 200);
      };
      const onKeyDown = ev => {
        if (ev.key === 'Escape') closeWith(false);
      };
      document.addEventListener('keydown', onKeyDown);
      overlay.addEventListener('click', ev => {
        if (ev.target === overlay && options.closeOnBackdrop !== false) closeWith(false);
      });

      if (options.confirm) {
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'wt-dialog-btn wt-dialog-cancel';
        cancel.textContent = options.cancelText || 'Cancelar';
        cancel.addEventListener('click', () => closeWith(false));

        const accept = document.createElement('button');
        accept.type = 'button';
        accept.className = 'wt-dialog-btn wt-dialog-confirm';
        accept.textContent = options.confirmText || 'Confirmar';
        accept.addEventListener('click', () => closeWith(true));

        actions.append(cancel, accept);
        window.setTimeout(() => accept.focus(), 60);
      } else {
        const ok = document.createElement('button');
        ok.type = 'button';
        ok.className = 'wt-dialog-btn wt-dialog-confirm';
        ok.textContent = options.buttonText || 'Aceptar';
        ok.addEventListener('click', () => closeWith(true));
        actions.append(ok);
        window.setTimeout(() => ok.focus(), 60);
      }

      document.body.appendChild(overlay);
    });
  }

  window.WTNotify = {
    toast,
    alert: (message, options = {}) => modal(message, { ...options, confirm: false }),
    confirm: (message, options = {}) => modal(message, { type: 'question', ...options, confirm: true })
  };

  // Evita cuadros nativos feos si queda algún alert viejo en el proyecto.
  window.alert = function (message) {
    toast(message, String(message || '').toLowerCase().includes('error') ? 'error' : 'info');
  };
})();
