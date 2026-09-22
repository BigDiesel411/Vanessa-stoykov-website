(function () {
  var NAVY = '#001E60', PINK = '#F09491', SLATE = '#5a6a8f', LINE = '#D7D2CB';
  var index = null, loading = null;

  function base() {
    // Pages in a topic subfolder must climb one level to reach the index and
    // root-relative links. Derived from the URL rather than a hardcoded folder
    // list, so a new topic folder needs no change here.
    var dir = location.pathname.replace(/[^/]*$/, '');
    var last = dir.replace(/\/$/, '').split('/').pop() || '';
    return /^(adultchildren|ageingparents|careerincome|divorce|inheritance|investing|moneymindset|property|relationships|retirement)$/.test(last) ? '../' : '';
  }

  function load() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    loading = fetch(base() + 'search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        index = (Array.isArray(d) ? d : []).map(function (a) {
          var body = a.text || a.content || a.excerpt || '';
          return {
            title: a.title || '',
            topic: a.topic || '',
            href: a.href || a.url || '',
            thumb: a.thumb || '',
            excerpt: a.excerpt || '',   // read by search-results.js
            text: String(body).toLowerCase()
          };
        }).filter(function (a) { return a.title && a.href; });
        return index;
      })
      .catch(function () { index = []; return index; });
    return loading;
  }

  function score(a, terms) {
    var s = 0;
    var title = (a.title || '').toLowerCase();
    var topic = (a.topic || '').toLowerCase();
    var text = a.text || '';
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!t) continue;
      var inTitle = title.indexOf(t) > -1;
      if (inTitle) s += 10;
      if (topic.indexOf(t) > -1) s += 6;
      var hits = text.split(t).length - 1;
      if (!hits && !inTitle && topic.indexOf(t) === -1) return 0;  // every term must appear somewhere
      s += Math.min(hits, 8);
    }
    return s;
  }

  function search(q) {
    var terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return (index || []).map(function (a) { return { a: a, s: score(a, terms) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (x, y) { return y.s - x.s; })
      .map(function (r) { return r.a; });
  }

  function highlight(text, q) {
    var terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    var out = text;
    terms.forEach(function (t) {
      out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
        '<mark style="background:#FBE0D4;color:' + NAVY + ';padding:0 1px;">$1</mark>');
    });
    return out;
  }

  window.vsSearch = { load: load, run: search, highlight: highlight, base: base };

  // ---------- dropdown on any search input ----------
  function wire(input) {
    if (input.getAttribute('data-vs-search') === '1') return;
    input.setAttribute('data-vs-search', '1');
    load();

    var wrap = input.parentElement;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

    var panel = document.createElement('div');
    panel.style.cssText = 'position:absolute;top:calc(100% + 8px);left:0;right:0;background:#FFFFFF;border:1px solid ' + LINE +
      ';border-radius:16px;box-shadow:0 16px 40px rgba(0,30,96,0.18);overflow:hidden;z-index:200;display:none;text-align:left;max-height:420px;overflow-y:auto;';
    wrap.appendChild(panel);

    function close() { panel.style.display = 'none'; }

    function render() {
      var q = input.value.trim();
      if (q.length < 2) return close();
      var hits = search(q);
      if (!hits.length) {
        panel.innerHTML = '<div style="padding:20px;font-size:14px;color:' + SLATE + ';">No articles match “' +
          q.replace(/</g, '&lt;') + '”.</div>';
        panel.style.display = 'block';
        return;
      }
      var b = base();
      panel.innerHTML = hits.slice(0, 6).map(function (a) {
        return '<a href="' + b + a.href + '" style="display:flex;gap:14px;align-items:center;padding:14px 18px;border-bottom:1px solid #F3F1EE;text-decoration:none;">' +
          (a.thumb ? '<span style="flex:0 0 64px;height:48px;border-radius:8px;overflow:hidden;background:#F7F5F2;display:block;"><img src="' + b + a.thumb + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"></span>' : '') +
          '<span style="flex:1;min-width:0;display:block;">' +
            '<span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.08em;color:' + PINK + ';margin-bottom:4px;">' + a.topic.toUpperCase() + '</span>' +
            '<span style="display:block;font-size:14px;font-weight:600;color:' + NAVY + ';line-height:1.35;">' + highlight(a.title, q) + '</span>' +
          '</span></a>';
      }).join('') +
      '<a href="' + b + 'SearchResults.dc.html?q=' + encodeURIComponent(q) + '" style="display:block;padding:14px 18px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:' + NAVY + ';text-decoration:none;background:#FDFCFB;">SEE ALL ' + hits.length + ' RESULT' + (hits.length === 1 ? '' : 'S') + ' →</a>';
      panel.style.display = 'block';
    }

    input.addEventListener('input', function () { load().then(render); });
    input.addEventListener('focus', function () { load().then(render); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var q = input.value.trim();
        if (q) location.href = base() + 'SearchResults.dc.html?q=' + encodeURIComponent(q);
      }
      if (e.key === 'Escape') close();
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) close();
    });
  }

  function scan() {
    var inputs = document.querySelectorAll('input[type="text"][placeholder*="Search" i], input[type="search"]');
    Array.prototype.forEach.call(inputs, wire);
  }

  function init() {
    scan();
    var n = 0;
    var t = setInterval(function () { n++; scan(); if (n > 40) clearInterval(t); }, 200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
