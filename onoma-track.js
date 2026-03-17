/**
 * ONOMA Track — Librería de tracking de comportamiento
 * Incluir en cualquier portal: <script src="onoma-track.js"></script>
 *
 * Trackea automáticamente:
 * - Tiempo en cada piso (dwell time)
 * - Fotos con zoom
 * - Precio consultado
 * - Scroll depth
 * - Dispositivo y origen
 * - Hora local
 *
 * Los eventos se envían en batch cada 30s o al salir de la página.
 */
(function() {
  var WH = 'https://onomahomes.app.n8n.cloud/webhook/track';
  var queue = [];
  var sessionId = 'ses_' + Date.now().toString(36) + Math.random().toString(36).substr(2,4);
  var userId = null;
  var userRole = null;
  var currentPiso = null;
  var pisoStartTime = null;
  var pageStartTime = Date.now();

  // Detectar usuario desde localStorage
  try {
    userId = localStorage.getItem('onoma_record_id') || localStorage.getItem('onoma_user_id') || null;
    userRole = localStorage.getItem('onoma_role') || null;
  } catch(e) {}

  // Detectar dispositivo
  var device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  var screenSize = screen.width + 'x' + screen.height;

  // ── Push evento ──
  function track(evento, datos) {
    queue.push({
      session_id: sessionId,
      user_id: userId,
      user_role: userRole,
      evento: evento,
      piso_id: (datos && datos.piso_id) || currentPiso || null,
      demanda_id: (datos && datos.demanda_id) || null,
      datos: Object.assign({ screen: screenSize }, datos || {}),
      duracion_ms: (datos && datos.duracion_ms) || null,
      dispositivo: device,
      origen: document.referrer || 'direct',
      hora_local: new Date().toLocaleString('es-ES'),
      pagina: location.pathname + location.search
    });
  }

  // ── Flush: enviar batch ──
  function flush() {
    if (!queue.length) return;
    var batch = queue.splice(0, queue.length);
    var body = JSON.stringify({ events: batch });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(WH, new Blob([body], { type: 'application/json' }));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', WH, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
    }
  }

  // ── Auto-flush cada 30s ──
  setInterval(flush, 30000);

  // ── Flush al salir ──
  window.addEventListener('beforeunload', function() {
    // Cerrar piso abierto
    if (currentPiso && pisoStartTime) {
      track('piso_salida', { piso_id: currentPiso, duracion_ms: Date.now() - pisoStartTime });
      currentPiso = null;
    }
    // Tiempo total en página
    track('pagina_salida', { duracion_ms: Date.now() - pageStartTime });
    flush();
  });

  // ── Evento inicial ──
  track('pagina_entrada', { url: location.href });

  // ── API pública ──
  window.OnomaTrack = {
    // Llamar cuando el usuario abre un piso
    pisoVisto: function(pisoId, datos) {
      // Cerrar piso anterior si había
      if (currentPiso && pisoStartTime) {
        track('piso_salida', { piso_id: currentPiso, duracion_ms: Date.now() - pisoStartTime });
      }
      currentPiso = pisoId;
      pisoStartTime = Date.now();
      track('piso_visto', Object.assign({ piso_id: pisoId }, datos || {}));
    },

    // Llamar cuando el usuario cierra/sale de un piso
    pisoSalida: function(pisoId) {
      var dur = pisoStartTime ? Date.now() - pisoStartTime : 0;
      track('piso_salida', { piso_id: pisoId || currentPiso, duracion_ms: dur });
      currentPiso = null;
      pisoStartTime = null;
    },

    // Llamar cuando hace zoom en una foto
    fotoZoom: function(pisoId, fotoIndex, fotoUrl) {
      track('foto_zoom', { piso_id: pisoId, foto_index: fotoIndex, foto_url: fotoUrl });
    },

    // Llamar cuando ve el precio
    precioVisto: function(pisoId, precio) {
      track('precio_visto', { piso_id: pisoId, precio: precio });
    },

    // Llamar cuando abre galería de fotos
    galeriaAbierta: function(pisoId, totalFotos) {
      track('galeria_abierta', { piso_id: pisoId, total_fotos: totalFotos });
    },

    // Llamar cuando hace click en "Visitar" o "Me interesa"
    accion: function(pisoId, tipo, datos) {
      track('accion_' + tipo, Object.assign({ piso_id: pisoId }, datos || {}));
    },

    // Llamar cuando descarta un piso
    descarte: function(pisoId, motivo) {
      track('descarte', { piso_id: pisoId, motivo: motivo });
    },

    // Evento genérico
    evento: function(nombre, datos) {
      track(nombre, datos);
    },

    // Setear usuario manualmente
    setUser: function(id, role) {
      userId = id;
      userRole = role;
    },

    // Forzar envío
    flush: flush
  };

  // ── Auto-track scroll depth ──
  var maxScroll = 0;
  window.addEventListener('scroll', function() {
    var pct = Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100);
    if (pct > maxScroll) maxScroll = pct;
  });
  setInterval(function() {
    if (maxScroll > 0) {
      track('scroll_depth', { porcentaje: maxScroll });
      maxScroll = 0;
    }
  }, 60000); // cada 60s registra scroll depth

})();
