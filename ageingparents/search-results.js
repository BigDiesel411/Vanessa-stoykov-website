(function () {
  var NAVY = '#001E60', PINK = '#F09491', SLATE = '#5a6a8f', LINE = '#D7D2CB';

  function q() {
    var m = location.search.match(/[?&]q=([^&]*)/);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function render(query) {
    var out = document.getElementById('vs-results');
    var head = document.getElementById('vs-results-heading');
    if (!out || !window.vsSearch) return false;

    if (!query) {
      if (head) head.textContent = 'Search results';
      out.innerHTML = '<p style="font-size:16px;color:' + SLATE + ';margin:0;">Type a word above to search every article on the site.</p>';
      return true;
    }

    var hits = window.vsSearch.run(query);
    if (head) head.textContent = hits.length + ' result' + (hits.length === 1 ? '' : 's') + ' for “' + query + '”';

    if (!hits.length) {
      out.innerHTML = '<p style="font-size:16px;line-height:1.7;color:' + SLATE + ';margin:0;">Nothing matched that. Try a broader word — for example <strong>divorce</strong>, <strong>super</strong>, <strong>inheritance</strong> or <strong>retirement</strong>.</p>';
      return true;
    }

    var hl = window.vsSearch.highlight;
    out.innerHTML = '<div style="border-top:1px solid ' + LINE + ';">' + hits.map(function (a) {
      return '<a href="' + a.href + '" style="display:flex;align-items:center;gap:24px;padding:28px 0;border-bottom:1px solid ' + LINE + ';text-decoration:none;">' +
        '<span style="flex:1;min-width:0;display:block;">' +
          '<span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;color:' + PINK + ';margin-bottom:8px;">' + a.topic.toUpperCase() + '</span>' +
          '<span style="display:block;font-size:19px;font-weight:700;color:' + NAVY + ';margin-bottom:8px;line-height:1.3;">' + hl(a.title, query) + '</span>' +
          '<span style="display:block;font-size:15px;color:' + SLATE + ';line-height:1.5;">' + hl(a.excerpt, query) + '</span>' +
        '</span>' +
        (a.thumb ? '<span style="flex:0 0 140px;height:100px;border-radius:12px;overflow:hidden;background:#F7F5F2;display:block;"><img src="' + a.thumb + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"></span>' : '') +
      '</a>';
    }).join('') + '</div>';
    return true;
  }

  function init() {
    var query = q();
    var input = document.getElementById('vs-results-input');
    if (input && query) input.value = query;

    if (!window.vsSearch) return false;
    return window.vsSearch.load().then(function () { return render(query); });
  }

  function start() {
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (document.getElementById('vs-results') && window.vsSearch) { clearInterval(t); init(); }
      else if (n > 60) clearInterval(t);
    }, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
