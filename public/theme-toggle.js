// Injetado em toda página pelo plugin do Vite (vite.config.js).
// Cria o botão de tema no <header> (ou flutuante, se a página não tiver um).
(function () {
  var KEY = 'bmm-theme';
  var COLORS = { light: '#f7f5ff', dark: '#0f0a1a' };
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');

  function saved() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* sem storage: só vale nesta visita */ }
  }

  function current() {
    return root.dataset.theme || (mq.matches ? 'dark' : 'light');
  }

  function paintThemeColor(mode) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = COLORS[mode];
  }

  var SVG =
    '<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
    '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/>' +
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

  var button = document.querySelector('.theme-toggle');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Tema escuro');
    button.innerHTML = SVG;

    var header = document.querySelector('header');
    if (header) {
      header.appendChild(button);
    } else {
      button.classList.add('theme-toggle--floating');
      document.body.appendChild(button);
    }
  }

  function sync() {
    var mode = current();
    button.dataset.mode = mode;
    button.setAttribute('aria-pressed', String(mode === 'dark'));
    paintThemeColor(mode);
  }

  button.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    save(next);
    sync();
  });

  // Sem escolha salva, acompanha o sistema operacional.
  var onSystemChange = function () { if (!saved()) sync(); };
  if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
  else if (mq.addListener) mq.addListener(onSystemChange);

  sync();
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('theme-ready'); });
  });
})();
