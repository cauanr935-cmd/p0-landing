// Home: monta a linha do tempo em ilhas a partir de /data/conteudos.json,
// toca a prévia da ilha visível, atualiza o contador e revela a frase final.
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stopsEl = document.getElementById('stops');
  var ticker = document.getElementById('ticker');

  var VERDICTS = {
    acerto: '✓ Deu certo',
    erro: '✕ Não deu certo',
    teste: '◐ Teste',
    decisao: '◆ Decisão',
  };
  var PLATFORMS = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn' };
  var METRICS = [
    ['views', 'views'],
    ['curtidas', 'curtidas'],
    ['comentarios', 'comentários'],
    ['salvamentos', 'salvamentos'],
  ];

  var MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function parseDate(iso) {
    var p = String(iso).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function formatDate(iso) {
    var d = parseDate(iso);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function daysSince(iso, until) {
    var start = parseDate(iso);
    var end = until ? parseDate(until) : new Date();
    end.setHours(0, 0, 0, 0);
    return Math.floor((end - start) / 86400000) + 1;
  }

  var compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  function formatNumber(n) {
    if (n === null || n === undefined) return '—';
    return n < 10000 ? n.toLocaleString('pt-BR') : compact.format(n);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'text') node.textContent = value;
      else if (key === 'class') node.className = value;
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function isExternal(href) {
    return /^https?:\/\//.test(href);
  }

  function linkChip(href, label) {
    if (!href) return null;
    var external = isExternal(href);
    return el('a', {
      class: 'chip-link',
      href: href,
      target: external ? '_blank' : null,
      rel: external ? 'noopener' : null,
    }, [label + (external ? ' ↗' : ' →')]);
  }

  function verdictTag(v) {
    return el('span', { class: 'verdict', 'data-v': v || 'pendente', text: VERDICTS[v] || '… Veredito em breve' });
  }

  function emptyMedia(title) {
    return el('div', { class: 'media-empty' }, [
      el('strong', { text: title }),
      el('span', { text: 'prévia chegando' }),
    ]);
  }

  function renderContent(item) {
    var vertical = item.formato === 'vertical';
    var media = el('div', { class: 'media' }, [
      el('span', { class: 'platform', text: PLATFORMS[item.plataforma] || item.plataforma }),
    ]);

    if (item.previa) {
      media.appendChild(el('video', {
        muted: '',
        loop: '',
        playsinline: '',
        preload: 'none',
        poster: item.capa,
        'data-src': item.previa,
        'aria-label': 'Prévia de ' + item.titulo,
      }));
    } else if (item.capa) {
      var img = el('img', { src: item.capa, alt: 'Capa de ' + item.titulo, loading: 'lazy' });
      img.addEventListener('error', function () { img.replaceWith(emptyMedia(item.titulo)); });
      media.appendChild(img);
    } else {
      media.appendChild(emptyMedia(item.titulo));
    }

    var metrics = el('div', { class: 'metrics' });
    METRICS.forEach(function (pair) {
      if (!item.metricas || !(pair[0] in item.metricas)) return;
      metrics.appendChild(el('div', { class: 'metric' }, [
        el('b', { text: formatNumber(item.metricas[pair[0]]) }),
        el('small', { text: pair[1] }),
      ]));
    });

    var lesson = el('p', {
      class: 'lesson' + (item.aprendizado ? '' : ' is-empty'),
      text: item.aprendizado || 'ainda escrevendo',
    });

    var info = el('div', { class: 'info' }, [
      verdictTag(item.veredito),
      el('h3', { text: item.titulo }),
      metrics,
      lesson,
      el('div', { class: 'links' }, [linkChip(item.link, 'Assistir completo')]),
    ]);

    return el('div', {
      class: 'island island--content reveal ' + (vertical ? 'is-vertical' : 'is-horizontal'),
    }, [media, info]);
  }

  function renderDecision(item) {
    return el('div', { class: 'island island--decision reveal' }, [
      verdictTag(item.veredito || 'decisao'),
      el('p', { class: 'quote', text: item.frase }),
      item.contexto ? el('p', { class: 'context', text: item.contexto }) : null,
      item.link ? el('div', { class: 'links' }, [linkChip(item.link, 'Ler o registro')]) : null,
    ]);
  }

  function renderMilestone(item) {
    return el('div', { class: 'island island--milestone reveal' }, [
      el('p', { class: 'milestone-label', text: '★ ' + item.rotulo }),
      el('h3', { text: item.titulo }),
      item.texto ? el('p', { text: item.texto }) : null,
      el('div', { class: 'links' }, [linkChip(item.link, item.link_rotulo || 'Saiba mais')]),
    ]);
  }

  function renderLog(item) {
    return el('a', { class: 'island island--log reveal', href: item.link }, [
      el('span', { class: 'log-num', text: item.numero }),
      el('span', { class: 'log-title' }, [
        el('span', { class: 'log-kind', text: 'Registro no diário' }),
        item.titulo,
      ]),
      el('span', { 'aria-hidden': 'true', text: '→' }),
    ]);
  }

  var RENDER = {
    conteudo: renderContent,
    decisao: renderDecision,
    marco: renderMilestone,
    registro: renderLog,
  };

  function setStat(name, value) {
    document.querySelectorAll('[data-stat="' + name + '"]').forEach(function (node) {
      node.textContent = value;
    });
  }

  function render(data) {
    var items = data.itens || [];
    var running = 0;
    var anyViews = false;

    items.forEach(function (item) {
      var views = item.metricas && item.metricas.views;
      if (typeof views === 'number') {
        running += views;
        anyViews = true;
      }
      var renderer = RENDER[item.tipo];
      if (!renderer) return;

      var stop = el('article', {
        class: 'stop',
        id: item.id,
        'data-date': formatDate(item.data) + ' · dia ' + daysSince(data.inicio_publico, item.data),
        'data-views': anyViews ? String(running) : '',
      }, [
        el('p', { class: 'stop-date', text: formatDate(item.data) + ' · dia ' + daysSince(data.inicio_publico, item.data) }),
        renderer(item),
      ]);
      stopsEl.appendChild(stop);
    });

    var registros = items.filter(function (i) { return /^registro-\d+\.html$/.test(i.link || ''); }).length;
    setStat('dia', daysSince(data.inicio_publico));
    setStat('conteudos', items.filter(function (i) { return i.tipo === 'conteudo'; }).length);
    setStat('views', anyViews ? formatNumber(running) : '—');
    setStat('registros', registros);
    setStat('decisoes', items.filter(function (i) { return i.tipo === 'decisao'; }).length);
  }

  // ── Comportamento ao rolar ──

  function setupReveal() {
    var nodes = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    nodes.forEach(function (n) { io.observe(n); });
  }

  // Uma prévia tocando por vez: a da ilha visível.
  function setupVideos() {
    var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-src]'));
    if (reduceMotion || !('IntersectionObserver' in window)) return; // só a capa
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          if (!video.src) video.src = video.dataset.src;
          videos.forEach(function (other) { if (other !== video) other.pause(); });
          video.muted = true;
          var p = video.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: [0, 0.55, 1] });
    videos.forEach(function (v) { io.observe(v); });
  }

  // Contador fixo: data da parada atual e views somadas até ela.
  function setupTicker() {
    var stops = Array.prototype.slice.call(document.querySelectorAll('#stops .stop'));
    var timeline = document.getElementById('linha-do-tempo');
    var dateNode = ticker.querySelector('[data-tick="data"]');
    var viewsNode = ticker.querySelector('[data-tick="views"]');
    if (!stops.length) return;

    function update() {
      var mark = window.innerHeight * 0.55;
      var current = null;
      stops.forEach(function (stop) {
        var top = stop.getBoundingClientRect().top;
        if (top < mark) {
          current = stop;
          stop.classList.add('is-seen');
        }
      });
      var t = timeline.getBoundingClientRect();
      var inside = t.top < window.innerHeight * 0.4 && t.bottom > window.innerHeight * 0.6;
      ticker.classList.toggle('is-on', inside && !!current);
      if (current) {
        dateNode.textContent = current.dataset.date;
        viewsNode.textContent = current.dataset.views ? formatNumber(Number(current.dataset.views)) : '—';
      }
    }

    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Frase final: as palavras acendem conforme a seção sobe na tela.
  function setupFinale() {
    var finale = document.getElementById('finale');
    var words = finale.querySelectorAll('.w');
    if (reduceMotion) {
      finale.classList.add('is-done');
      return;
    }
    function update() {
      var r = finale.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.7)));
      var lit = Math.round(progress * words.length);
      words.forEach(function (w, i) { w.classList.toggle('is-on', i < lit); });
      finale.classList.toggle('is-done', lit >= words.length);
    }
    window.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    update();
  }

  function start() {
    setupReveal();
    setupVideos();
    setupTicker();
    setupFinale();
  }

  fetch('/data/conteudos.json', { cache: 'no-cache' })
    .then(function (res) { return res.json(); })
    .then(function (data) { render(data); start(); })
    .catch(function () {
      stopsEl.appendChild(el('p', { class: 'hero-sub', text: 'Não foi possível carregar a linha do tempo agora. Os registros estão logo abaixo.' }));
      start();
    });
})();
