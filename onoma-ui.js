/**
 * ONOMA UI — Sistema de diseño + Error handling amigable
 * Incluir en portales: <script src="onoma-ui.js"></script>
 *
 * Provee:
 * - OnomaUI.toast(msg, type)    — notificaciones amigables
 * - OnomaUI.error(err)          — traduce errores técnicos a mensajes humanos
 * - OnomaUI.loading(el, on)     — estado loading en botones
 * - OnomaUI.confirm(msg)        — modal de confirmación
 * - OnomaUI.authFetch(url,opts) — fetch con JWT automático
 */
(function() {
  var WH = 'https://onomahomes.app.n8n.cloud/webhook';

  // ── Error messages map ──
  var errorMap = {
    'MISSING_EMAIL': 'Introduce tu email para continuar.',
    'MISSING_PASSWORD': 'Introduce tu contraseña.',
    'USER_NOT_FOUND': 'No encontramos una cuenta con ese email.',
    'WRONG_PASSWORD': 'La contraseña no es correcta. ¿La olvidaste?',
    'NO_PASSWORD': 'Tu cuenta aún no tiene contraseña. Revisa tu email de activación.',
    'TOKEN_EXPIRED': 'Tu sesión ha expirado. Vuelve a iniciar sesión.',
    'SESSION_INACTIVE': 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
    'INVALID_TOKEN': 'Sesión no válida. Inicia sesión de nuevo.',
    'NO_TOKEN': 'No has iniciado sesión.',
    'NETWORK_ERROR': 'Sin conexión. Comprueba tu internet e inténtalo de nuevo.',
    'INTERNAL': 'Ha ocurrido un error. Inténtalo de nuevo en unos segundos.',
    'TIMEOUT': 'La petición tardó demasiado. Inténtalo de nuevo.',
    'UNKNOWN': 'Algo salió mal. Inténtalo de nuevo.'
  };

  // ── Toast container ──
  var toastContainer;
  function ensureContainer() {
    if (toastContainer) return;
    toastContainer = document.createElement('div');
    toastContainer.id = 'onoma-toasts';
    toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:400px;pointer-events:none';
    document.body.appendChild(toastContainer);
  }

  // ── Inject shared styles ──
  var style = document.createElement('style');
  style.textContent = [
    '.onoma-toast{pointer-events:auto;padding:14px 20px;border-radius:12px;font-family:Inter,sans-serif;font-size:14px;line-height:1.5;color:#f0f0f5;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(0,0,0,.4);animation:onomaSlideIn .3s ease;display:flex;align-items:flex-start;gap:10px;max-width:100%}',
    '.onoma-toast-success{background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.25)}',
    '.onoma-toast-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25)}',
    '.onoma-toast-warning{background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.25)}',
    '.onoma-toast-info{background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.25)}',
    '.onoma-toast-icon{font-size:18px;flex-shrink:0;margin-top:1px}',
    '.onoma-toast-close{background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:0 0 0 8px;line-height:1;margin-left:auto;flex-shrink:0}',
    '.onoma-toast-close:hover{color:#fff}',
    '@keyframes onomaSlideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}',
    '@keyframes onomaSlideOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(40px)}}',
    '.onoma-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);z-index:10000;display:flex;align-items:center;justify-content:center;animation:onomaFadeIn .2s ease}',
    '.onoma-confirm-box{background:rgba(12,12,24,.97);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px 24px;max-width:400px;width:90%;text-align:center;font-family:Inter,sans-serif;animation:onomaSlideIn .3s ease}',
    '.onoma-confirm-msg{font-size:16px;color:#f0f0f5;line-height:1.6;margin-bottom:24px}',
    '.onoma-confirm-btns{display:flex;gap:10px;justify-content:center}',
    '.onoma-confirm-btn{padding:12px 28px;border-radius:10px;border:none;font-family:Inter,sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s}',
    '.onoma-confirm-yes{background:#C5A059;color:#060611}',
    '.onoma-confirm-no{background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.1)}',
    '@keyframes onomaFadeIn{from{opacity:0}to{opacity:1}}',
    '@media(max-width:768px){.onoma-toast{font-size:15px;padding:16px 18px}#onoma-toasts{top:12px;right:12px;left:12px;max-width:100%}}'
  ].join('\n');
  document.head.appendChild(style);

  var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  window.OnomaUI = {
    // Show a toast notification
    toast: function(msg, type) {
      ensureContainer();
      type = type || 'info';
      var el = document.createElement('div');
      el.className = 'onoma-toast onoma-toast-' + type;
      el.innerHTML = '<span class="onoma-toast-icon">' + (icons[type] || 'ℹ') + '</span><span>' + msg + '</span><button class="onoma-toast-close" onclick="this.parentElement.remove()">×</button>';
      toastContainer.appendChild(el);
      setTimeout(function() {
        el.style.animation = 'onomaSlideOut .3s ease forwards';
        setTimeout(function() { el.remove(); }, 300);
      }, 5000);
    },

    // Translate technical error to friendly message
    error: function(err) {
      var code = '';
      var msg = '';
      if (typeof err === 'string') {
        msg = err;
      } else if (err && err.code) {
        code = err.code;
        msg = errorMap[code] || err.error || err.message || 'Algo salió mal.';
      } else if (err && err.error) {
        msg = err.error;
      } else if (err && err.message) {
        // Don't show technical messages
        if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed')) {
          msg = errorMap.NETWORK_ERROR;
        } else {
          msg = errorMap.UNKNOWN;
        }
      } else {
        msg = errorMap.UNKNOWN;
      }
      this.toast(msg, 'error');
      return msg;
    },

    // Loading state on buttons
    loading: function(el, on) {
      if (typeof el === 'string') el = document.getElementById(el);
      if (!el) return;
      if (on) {
        el._originalText = el.textContent;
        el.disabled = true;
        el.style.opacity = '0.6';
        el.textContent = 'Cargando...';
      } else {
        el.disabled = false;
        el.style.opacity = '1';
        if (el._originalText) el.textContent = el._originalText;
      }
    },

    // Confirmation modal
    confirm: function(msg) {
      return new Promise(function(resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'onoma-confirm-overlay';
        overlay.innerHTML = '<div class="onoma-confirm-box"><div class="onoma-confirm-msg">' + msg + '</div><div class="onoma-confirm-btns"><button class="onoma-confirm-btn onoma-confirm-no">Cancelar</button><button class="onoma-confirm-btn onoma-confirm-yes">Confirmar</button></div></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('.onoma-confirm-yes').onclick = function() { overlay.remove(); resolve(true); };
        overlay.querySelector('.onoma-confirm-no').onclick = function() { overlay.remove(); resolve(false); };
        overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); resolve(false); } };
      });
    },

    // Authenticated fetch with JWT
    authFetch: function(url, opts) {
      opts = opts || {};
      opts.headers = opts.headers || {};
      var token = localStorage.getItem('onoma_token');
      if (token) opts.headers['Authorization'] = 'Bearer ' + token;
      return fetch(url, opts).then(function(r) {
        if (r.status === 401) {
          localStorage.removeItem('onoma_token');
          window.OnomaUI.toast('Sesión expirada. Redirigiendo...', 'warning');
          setTimeout(function() { location.href = 'portal.html'; }, 2000);
          throw new Error('UNAUTHORIZED');
        }
        return r.json();
      }).then(function(data) {
        if (data.error || data.code) {
          throw data;
        }
        return data;
      }).catch(function(err) {
        if (err.message !== 'UNAUTHORIZED') {
          window.OnomaUI.error(err);
        }
        throw err;
      });
    }
  };
})();
