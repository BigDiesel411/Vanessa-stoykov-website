(function () {
  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>';
  var BURGER = '<svg viewBox="0 0 24 24" fill="none" stroke="#001E60" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="#001E60" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function isStale(el) { return /\{\{/.test(el ? el.innerHTML : ''); }

  function build() {
    var existing = document.querySelector('#vs-drawer');
    if (existing) {
      if (isStale(existing)) { existing.remove(); document.documentElement.classList.remove('vs-shared-nav'); }
      else { ensureBurger(); return; }
    }
    var header = document.querySelector('header');
    if (!header) return;
    var bar = header.firstElementChild;
    if (!bar) return;
    var nav = header.querySelector('nav');
    if (!nav) return;
    if (/\{\{/.test(nav.innerHTML)) return; // DC hasn't hydrated yet — retry later

    // ---- collect items from the existing desktop nav ----
    var items = [];
    Array.prototype.forEach.call(nav.children, function (child) {
      if (child.tagName === 'A') {
        items.push({ type: 'link', label: child.textContent.trim(), href: child.getAttribute('href') });
        return;
      }
      // dropdown group: trigger span + menu of links
      var trigger = child.querySelector('span');
      var menu = child.querySelector('.topics-menu, div');
      if (trigger && menu) {
        var links = Array.prototype.map.call(menu.querySelectorAll('a'), function (a) {
          return { label: a.textContent.trim(), href: a.getAttribute('href') };
        });
        if (links.length) {
          items.push({ type: 'group', label: trigger.textContent.trim().replace(/\s+/g, ' '), links: links });
        }
      }
    });
    items = items.filter(function (it) {
      if (it.type === 'link') return !/\{\{/.test(it.label + it.href);
      it.links = it.links.filter(function (l) { return !/\{\{/.test(l.label + l.href); });
      return it.links.length > 0;
    });
    if (!items.length) return;

    // last plain link is usually the CTA (Work With Vanessa)
    var cta = null;
    for (var i = items.length - 1; i >= 0; i--) {
      if (items[i].type === 'link' && /work with vanessa|contact/i.test(items[i].label)) {
        cta = items.splice(i, 1)[0];
        break;
      }
    }

    // ---- burger (mounted on body so React re-renders can't strip it) ----
    var burger = document.getElementById('vs-burger');
    if (!burger) {
      burger = document.createElement('button');
      burger.id = 'vs-burger';
      burger.setAttribute('aria-label', 'Open menu');
      burger.innerHTML = BURGER;
      document.body.appendChild(burger);
    }

    // ---- drawer ----
    var drawer = document.createElement('div');
    drawer.id = 'vs-drawer';
    var logo = header.querySelector('img');
    var logoSrc = logo ? logo.getAttribute('src') : '';

    var html = '<div id="vs-drawer-panel"><div id="vs-drawer-head">' +
      (logoSrc ? '<img src="' + logoSrc + '" alt="Vanessa Stoykov" style="height:26px;width:auto;display:block;">' : '<span></span>') +
      '<button id="vs-drawer-close" aria-label="Close menu">' + CLOSE + '</button></div>';

    items.forEach(function (it) {
      if (it.type === 'link') {
        html += '<a class="vs-drawer-item" href="' + it.href + '">' + it.label + '</a>';
      } else {
        html += '<details class="vs-drawer-group"><summary>' + it.label + CHEVRON + '</summary><div class="vs-drawer-sub">';
        it.links.forEach(function (l) {
          html += '<a href="' + l.href + '">' + l.label + '</a>';
        });
        html += '</div></details>';
      }
    });

    if (cta) html += '<a class="vs-drawer-cta" href="' + cta.href + '">' + cta.label.toUpperCase() + '</a>';
    html += '</div>';
    drawer.innerHTML = html;
    document.body.appendChild(drawer);
    document.documentElement.classList.add('vs-shared-nav');

    function open() { drawer.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { drawer.classList.remove('open'); document.body.style.overflow = ''; }

    burger.addEventListener('click', open);
    drawer.querySelector('#vs-drawer-close').addEventListener('click', close);
    drawer.addEventListener('click', function (e) { if (e.target === drawer) close(); });
    Array.prototype.forEach.call(drawer.querySelectorAll('a'), function (a) {
      a.addEventListener('click', close);
    });
  }

  function ensureBurger() {
    if (document.getElementById('vs-burger')) return;
    var drawer = document.getElementById('vs-drawer');
    if (!drawer) return;
    var burger = document.createElement('button');
    burger.id = 'vs-burger';
    burger.setAttribute('aria-label', 'Open menu');
    burger.innerHTML = BURGER;
    burger.addEventListener('click', function () {
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    document.body.appendChild(burger);
  }

  function init() {
    build();
    // DC pages render asynchronously — retry until the drawer is built, then keep the burger alive
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      build();
      ensureBurger();
      if (tries > 60) clearInterval(t);
    }, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
