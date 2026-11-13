// guide-release.js
//
// Single source of truth for the three paid Money Dilemmas companion
// guides: release date/time (Australia/Sydney), title, page count and
// Stripe checkout link. Every page that can show a "Get the guide" button
// loads this file before the script that uses it, and reads from
// window.GUIDE_RELEASE instead of hardcoding a date or a link.
//
// TO CHANGE A RELEASE DATE: edit the `release` ISO string below and the
// matching `releaseLabel` ("Available <releaseLabel>" is what visitors see
// before release -- include the year, e.g. "Sunday 22 November 2026", so it
// never reads as this year once the date's actually passed). Keep the
// Sydney UTC offset explicit: +11:00 while daylight saving applies (true
// for all three dates here), +10:00 only for a date outside daylight
// saving (roughly early April to early October).
//
// ONCE A GUIDE IS LIVE: its `releaseLabel` is set to 'now' ("Available
// now"). The pending label itself is hidden the moment isLive() flips true
// (replaced by the real buy button everywhere it's used), so this only
// ever shows in the split-second before this script runs, or as a fallback
// if it doesn't load -- but 'now' is what's correct for that fallback once
// the release date has actually passed, so it's still worth setting.
//
// TO RELEASE A GUIDE MANUALLY/EARLY: set its `release` to any ISO datetime
// already in the past, e.g. "2020-01-01T00:00:00+10:00", and its
// `releaseLabel` to 'now'.
//
// TESTING: append ?guide-preview=1 to a page's URL to treat every guide as
// live, or ?guide-preview=0 to treat every guide as not yet live. This
// override only works on localhost/127.0.0.1 and Netlify Deploy Preview
// URLs (deploy-preview-<PR#>--<site>.netlify.app) - it's ignored on the
// production domain, so it can never accidentally hide or expose a buy
// link for a real visitor.
(function (global) {
  var GUIDES = {
    '1': {
      title: 'Divorce & Money',
      pages: 18,
      release: '2026-11-08T06:00:00+11:00',
      releaseLabel: 'now',
      link: 'https://buy.stripe.com/4gMbJ3gPx6k91H3ckK8Ra00'
    },
    '2': {
      title: 'The Bank of Mum and Dad',
      pages: 16,
      release: '2026-11-22T06:00:00+11:00',
      releaseLabel: 'Sunday 22 November 2026',
      link: 'https://buy.stripe.com/00w00ldDlcIx99vdoO8Ra02'
    },
    '3': {
      title: 'Property & Your Financial Future',
      pages: 16,
      release: '2026-12-06T06:00:00+11:00',
      releaseLabel: 'Sunday 6 December 2026',
      link: 'https://buy.stripe.com/14A3cxdDl37X5XjfwW8Ra01'
    }
  };

  function previewOverride() {
    try {
      var host = global.location.hostname;
      var allowed = host === 'localhost' || host === '127.0.0.1' ||
        /^deploy-preview-\d+--.*\.netlify\.app$/.test(host);
      if (!allowed) return null;
      var params = new global.URLSearchParams(global.location.search);
      var v = params.get('guide-preview');
      if (v === '1') return true;
      if (v === '0') return false;
    } catch (e) {}
    return null;
  }

  // Fails safe: any error, a missing/unknown id, or an unparseable date
  // all resolve to "not live" rather than risk showing a buy link early.
  function guideIsLive(id) {
    try {
      var override = previewOverride();
      if (override !== null) return override;
      var g = GUIDES[id];
      if (!g || !g.release) return false;
      var releaseTime = Date.parse(g.release);
      if (isNaN(releaseTime)) return false;
      return Date.now() >= releaseTime;
    } catch (e) {
      return false;
    }
  }

  // ---- generic wiring for plain (non-React-templated) buy buttons ----
  // A gated spot marks its wrapper with data-guide-id="<id>" and holds two
  // children: the real link, carrying data-guide-live, whose static style
  // starts with "display:none" (so it's invisible by default - fails safe
  // even if this script never runs - with no href baked in; this function
  // sets the href only once the guide is live), and a data-guide-pending
  // label already styled as the visible-by-default "coming soon" state.
  // Toggling style.display directly (not the hidden attribute) avoids a
  // specificity fight with each element's own inline display value.
  // Pages with their own render logic (the GuideOffer component,
  // money-dilemmas.js) read guides/isLive above directly instead.
  function wireAll() {
    try {
      var wraps = global.document.querySelectorAll('[data-guide-id]');
      for (var i = 0; i < wraps.length; i++) {
        var wrap = wraps[i];
        var id = wrap.getAttribute('data-guide-id');
        var g = GUIDES[id];
        var live = g ? guideIsLive(id) : false;
        var a = wrap.querySelector('[data-guide-live]');
        var pending = wrap.querySelector('[data-guide-pending]');
        if (live && g) {
          if (a) { a.href = g.link; a.style.display = wrap.getAttribute('data-live-display') || 'block'; }
          if (pending) pending.style.display = 'none';
        } else {
          if (a) { a.removeAttribute('href'); a.style.display = 'none'; }
          if (pending) {
            pending.style.display = '';
            if (g) pending.textContent = 'Available ' + g.releaseLabel;
          }
        }
      }
    } catch (e) {}
  }

  global.GUIDE_RELEASE = { guides: GUIDES, isLive: guideIsLive, wireAll: wireAll };

  function init() {
    wireAll();
    var tries = 0;
    var t = global.setInterval(function () {
      tries++;
      wireAll();
      if (tries > 40) global.clearInterval(t);
    }, 200);
    global.setInterval(wireAll, 60000);
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
