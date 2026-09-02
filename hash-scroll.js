(function () {
  function go() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return false;
    var el = document.getElementById(id);
    if (!el) return false;
    var y = el.getBoundingClientRect().top + window.pageYOffset - 80;
    window.scrollTo({ top: y, behavior: 'smooth' });
    return true;
  }
  function attempt() {
    if (!location.hash) return;
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (go() || n > 60) clearInterval(t);
    }, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attempt);
  else attempt();
  window.addEventListener('hashchange', go);
})();
