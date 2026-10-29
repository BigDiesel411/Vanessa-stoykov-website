(function () {
  var MC = 'https://vanessastoykov.us18.list-manage.com/subscribe/post?u=5bafccece958e5ca2514b2ee2&id=0681d8d525';
  var HP = 'b_5bafccece958e5ca2514b2ee2_0681d8d525';
  var FS = 'https://formspree.io/f/mwlperzr';
  var NAVY = '#001E60', PINK = '#FF1F7A', GOLD = '#FFB81C';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Quiz questions go here once supplied. Shape:
  // { q: 'Question?', options: [{ label: 'Answer', topic: 'property' }] }
  // While empty, "Take the quiz" offers a notify-me signup instead.
  var QUIZ = [];

  // Paid companion guides, one per episode. Links match the episode pages.
  var GUIDES = {
    '1': { title: 'Divorce & Money', pages: 18, link: 'https://buy.stripe.com/4gMbJ3gPx6k91H3ckK8Ra00' },
    '2': { title: 'The Bank of Mum and Dad', pages: 16, link: 'https://buy.stripe.com/00w00ldDlcIx99vdoO8Ra02' },
    '3': { title: 'Property & Your Financial Future', pages: 16, link: 'https://buy.stripe.com/14A3cxdDl37X5XjfwW8Ra01' }
  };

  var MSG = {
    alerts: "You're in. The next dilemma will land in your inbox the day it drops.",
    quiznotify: "You're on the list. We'll email you the moment the quiz is live.",
    quizresult: 'Thanks. Your results and the episodes made for your situation are on their way.'
  };

  function mc(fields) {
    var b = new URLSearchParams();
    for (var k in fields) b.append(k, fields[k]);
    b.append(HP, '');
    return fetch(MC, { method: 'POST', mode: 'no-cors', body: b }).catch(function () {});
  }

  // ---------- modal shell ----------
  var host = null, player = null;
  function close() {
    if (player && player.destroy) { try { player.destroy(); } catch (e) {} }
    player = null;
    if (host) { host.remove(); host = null; }
    document.body.style.overflow = '';
  }
  function modal(inner, opts) {
    opts = opts || {};
    close();
    host = document.createElement('div');
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,14,48,0.84);display:flex;align-items:center;justify-content:center;padding:20px;';
    host.innerHTML =
      '<div style="position:relative;width:100%;max-width:' + (opts.wide ? '980px' : '460px') + ';max-height:92vh;overflow:auto;background:' + (opts.dark ? '#000' : '#FFF') + ';border-radius:20px;' + (opts.dark ? '' : 'padding:44px 34px 34px;') + 'font-family:Inter,sans-serif;color:' + NAVY + ';">' +
      '<button type="button" data-md-close="1" aria-label="Close" style="position:absolute;top:12px;right:12px;width:44px;height:44px;border:none;border-radius:50%;background:' + (opts.dark ? 'rgba(255,255,255,0.16)' : '#F4F2EF') + ';color:' + (opts.dark ? '#FFF' : NAVY) + ';font-size:22px;line-height:1;cursor:pointer;z-index:5;">&times;</button>' +
      inner + '</div>';
    document.body.appendChild(host);
    document.body.style.overflow = 'hidden';
    host.addEventListener('click', function (e) {
      if (e.target === host || (e.target.closest && e.target.closest('[data-md-close]'))) close();
    });
    var first = host.querySelector('input');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // ---------- "Send us your dilemma" pop-up (posts to the same Formspree form as the Contact page) ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-md-dilemma-open]');
    if (!t) return;
    e.preventDefault();
    modal(
      '<div style="font-size:12px;font-weight:800;letter-spacing:0.14em;color:#FF1F7A;margin-bottom:12px;">SEND US YOUR DILEMMA</div>' +
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:36px;line-height:0.95;color:#001E60;margin:0 0 12px;">It could be our next episode.</div>' +
      '<p style="font-size:15px;line-height:1.6;color:#5a6a8f;margin:0 0 22px;">Tell us what you\'re weighing up, in your own words.</p>' +
      '<form data-md-form="dilemma" style="display:flex;flex-direction:column;gap:14px;">' +
      '<input name="FNAME" type="text" required placeholder="First name" autocomplete="given-name" style="width:100%;padding:15px 16px;border:1px solid #D7D2CB;border-radius:12px;font-size:16px;font-family:Inter,sans-serif;color:#001E60;box-sizing:border-box;">' +
      '<input name="EMAIL" type="email" required placeholder="Email address" autocomplete="email" style="width:100%;padding:15px 16px;border:1px solid #D7D2CB;border-radius:12px;font-size:16px;font-family:Inter,sans-serif;color:#001E60;box-sizing:border-box;">' +
      '<textarea name="DILEMMA" required rows="5" placeholder="Your dilemma" style="width:100%;padding:15px 16px;border:1px solid #D7D2CB;border-radius:12px;font-size:16px;font-family:Inter,sans-serif;color:#001E60;box-sizing:border-box;resize:vertical;"></textarea>' +
      '<input name="_gotcha" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;">' +
      '<label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:#33456f;"><input name="CONTACT_OK" type="checkbox" required style="margin-top:3px;width:18px;height:18px;flex-shrink:0;"><span>I agree to be contacted by the Money Dilemmas team about my dilemma.</span></label>' +
      '<label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:#33456f;"><input name="CONSENT" type="checkbox" style="margin-top:3px;width:18px;height:18px;flex-shrink:0;"><span>Yes, send me Money Dilemmas updates from Vanessa</span></label>' +
      '<button type="submit" style="background:#FF1F7A;color:#FFFFFF;border:none;padding:18px 20px;border-radius:999px;font-size:14px;font-weight:800;letter-spacing:0.08em;cursor:pointer;">SEND MY DILEMMA</button>' +
      '<div data-md-status="1" style="font-size:13px;line-height:1.5;"></div></form>'
    );
  });


  // ---------- form pieces ----------
  var INPUT = 'width:100%;padding:15px 16px;border:1px solid #D7D2CB;border-radius:12px;font-size:16px;font-family:Inter,sans-serif;color:' + NAVY + ';background:#FFF;box-sizing:border-box;';
  var BTN = 'width:100%;background:' + NAVY + ';color:#FFF;border:none;padding:17px 20px;border-radius:999px;font-size:13px;font-weight:800;letter-spacing:0.08em;cursor:pointer;';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function capture(kind, topic, label) {
    return '<form data-md-form="' + kind + '" data-topic="' + esc(topic || '') + '" style="display:flex;flex-direction:column;gap:12px;">' +
      '<input name="FNAME" type="text" required placeholder="First name" autocomplete="given-name" style="' + INPUT + '">' +
      '<input name="EMAIL" type="email" required placeholder="Email address" autocomplete="email" style="' + INPUT + '">' +
      '<label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.5;color:#33456f;"><input name="CONSENT" type="checkbox" required style="margin-top:3px;width:18px;height:18px;flex-shrink:0;"><span>Yes, send me Money Dilemmas updates from Vanessa</span></label>' +
      '<button type="submit" style="' + BTN + '">' + (label || 'SEND IT TO ME') + '</button>' +
      '<div data-md-status="1" style="font-size:13px;line-height:1.5;"></div></form>';
  }
  function say(form, text, bad) {
    var st = form.querySelector('[data-md-status]');
    if (st) { st.textContent = text; st.style.color = bad ? '#B0124F' : NAVY; }
  }
  function done(form, text) {
    form.innerHTML = '<p style="font-size:16px;line-height:1.6;font-weight:600;margin:0;color:inherit;">' + esc(text) + '</p>';
  }

  // ---------- submit handling (all Money Dilemmas forms) ----------
  document.addEventListener('submit', function (e) {
    var f = e.target;
    var kind = f && f.getAttribute && f.getAttribute('data-md-form');
    if (!kind) return;
    e.preventDefault();
    var fn = (f.querySelector('[name="FNAME"]') || {}).value || '';
    var em = ((f.querySelector('[name="EMAIL"]') || {}).value || '').trim();
    if (!EMAIL_RE.test(em)) return say(f, 'Please enter a valid email address.', true);
    var updates = f.querySelector('[name="CONSENT"]');
    var btn = f.querySelector('button[type="submit"]');
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'SENDING…';

    if (kind === 'dilemma') {
      var b = new URLSearchParams();
      b.append('First Name', fn);
      b.append('email', em);
      b.append('Dilemma', (f.querySelector('[name="DILEMMA"]') || {}).value || '');
      b.append('Agreed to be contacted', 'Yes');
      b.append('Money Dilemmas updates', updates && updates.checked ? 'Yes' : 'No');
      b.append('_subject', 'Money Dilemmas submission from ' + (fn || em));
      b.append('_replyto', em);
      var gotcha = f.querySelector('[name="_gotcha"]');
      if (gotcha) b.append('_gotcha', gotcha.value);
      fetch(FS, { method: 'POST', headers: { Accept: 'application/json' }, body: b })
        .then(function (r) {
          if (!r.ok) throw new Error('rejected');
          if (updates && updates.checked) mc({ EMAIL: em, FNAME: fn, TOPIC: 'Money Dilemmas' });
          done(f, 'Thanks! Your dilemma is with us. Keep an eye on future episodes.');
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = label;
          say(f, 'Something went wrong sending that. Please try again.', true);
        });
      return;
    }

    var topic = f.getAttribute('data-topic') || '';
    mc({ EMAIL: em, FNAME: fn, TOPIC: 'Money Dilemmas' + (topic ? ' – ' + topic : '') })
      .then(function () { done(f, MSG[kind] || "You're in."); });
  }, true);

  // ---------- video + end-of-video card ----------
  var ytReady = null;
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise(function (res) {
      if (window.YT && window.YT.Player) return res();
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { if (prev) prev(); res(); };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
    return ytReady;
  }
  function cards() { return Array.prototype.slice.call(document.querySelectorAll('[data-md-episode]')); }
  function attrs(el) {
    return 'data-md-play="1" data-yt="' + esc(el.getAttribute('data-yt') || '') + '" data-title="' + esc(el.getAttribute('data-title') || '') + '" data-topic="' + esc(el.getAttribute('data-topic') || '') + '" data-ep="' + esc(el.getAttribute('data-ep') || '') + '"';
  }
  function endCard(box, ep, topic) {
    var list = cards();
    var idx = list.findIndex(function (c) { return c.getAttribute('data-ep') === ep; });
    var next = idx > -1 ? list[idx + 1] : null;
    var card = document.createElement('div');
    card.style.cssText = 'position:absolute;inset:0;background:rgba(0,30,96,0.97);display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;';
    card.innerHTML = '<div style="width:100%;max-width:420px;color:#FFF;">' +
      (GUIDES[ep] ?
        '<div style="font-size:12px;font-weight:800;letter-spacing:0.12em;color:' + GOLD + ';margin-bottom:10px;">COMPANION GUIDE</div>' +
        '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:34px;line-height:1;margin-bottom:10px;">Take this episode further</div>' +
        '<div style="font-size:15px;line-height:1.6;color:#C7D0E4;margin-bottom:20px;">' + esc(GUIDES[ep].title) + ' · ' + GUIDES[ep].pages + ' pages · $19.99 AUD</div>' +
        '<a href="' + GUIDES[ep].link + '" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;background:#FFFFFF;color:' + NAVY + ';padding:16px;border-radius:999px;font-size:13px;font-weight:800;letter-spacing:0.06em;text-decoration:none;">GET THE GUIDE, $19.99</a>'
        : '') +
      (next ? '<button type="button" ' + attrs(next) + ' style="margin-top:14px;width:100%;background:' + GOLD + ';color:' + NAVY + ';border:none;padding:16px;border-radius:999px;font-size:13px;font-weight:800;letter-spacing:0.08em;cursor:pointer;">WATCH NEXT EPISODE →</button>' : '') +
      '</div>';
    box.appendChild(card);
  }
  function play(el) {
    var id = (el.getAttribute('data-yt') || '').trim();
    var title = el.getAttribute('data-title') || 'Money Dilemmas';
    var ep = el.getAttribute('data-ep') || '';
    var topic = el.getAttribute('data-topic') || '';
    var frame = '<div data-md-video="1" style="position:relative;aspect-ratio:16/9;background:' + NAVY + ';">';
    if (!id) {
      modal(frame + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;color:#FFF;">' +
        '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:clamp(26px,4vw,40px);line-height:1;">' + esc(title) + '</div>' +
        '<div style="font-size:15px;color:#C7D0E4;max-width:380px;line-height:1.6;">Video link to come.</div></div></div>', { wide: true, dark: true });
      return;
    }
    modal(frame + '<div id="md-player" style="position:absolute;inset:0;"></div></div>', { wide: true, dark: true });
    var box = host.querySelector('[data-md-video]');
    loadYT().then(function () {
      if (!host) return;
      player = new window.YT.Player('md-player', {
        videoId: id,
        width: '100%', height: '100%',
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onStateChange: function (ev) { if (ev.data === 0 && ep) endCard(box, ep, topic); } }
      });
    });
  }

  // ---------- quiz ----------
  function quiz() {
    if (!QUIZ.length) {
      modal('<div style="font-size:12px;font-weight:800;letter-spacing:0.12em;color:' + PINK + ';margin-bottom:10px;">60-SECOND QUIZ</div>' +
        '<h3 style="font-family:\'Bebas Neue\',sans-serif;font-size:36px;line-height:1;margin:0 0 12px;font-weight:400;">The quiz is almost ready</h3>' +
        '<p style="font-size:15px;line-height:1.6;color:#33456f;margin:0 0 22px;">Leave your details and we\'ll email you the moment it\'s live, along with the episodes made for your situation.</p>' +
        capture('quiznotify', 'quiz'));
      return;
    }
    var i = 0, picks = [];
    function step() {
      var box = host.querySelector('[data-md-quiz-body]');
      var pct = Math.round((i / QUIZ.length) * 100);
      var bar = '<div style="height:6px;background:#F4F2EF;border-radius:999px;overflow:hidden;margin-bottom:26px;"><div style="height:100%;width:' + pct + '%;background:' + PINK + ';transition:width .35s ease;"></div></div>';
      if (i >= QUIZ.length) {
        box.innerHTML = bar.replace('width:' + pct + '%', 'width:100%') +
          '<h3 style="font-family:\'Bebas Neue\',sans-serif;font-size:34px;line-height:1;margin:0 0 12px;font-weight:400;">Your results are ready</h3>' +
          '<p style="font-size:15px;line-height:1.6;color:#33456f;margin:0 0 20px;">Where should we send your results and the episodes made for your situation?</p>' +
          capture('quizresult', picks.join(', '), 'SEND MY RESULTS');
        return;
      }
      var q = QUIZ[i];
      box.innerHTML = bar +
        '<div style="font-size:12px;font-weight:800;letter-spacing:0.12em;color:' + PINK + ';margin-bottom:10px;">QUESTION ' + (i + 1) + ' OF ' + QUIZ.length + '</div>' +
        '<h3 style="font-family:\'Bebas Neue\',sans-serif;font-size:32px;line-height:1.05;margin:0 0 20px;font-weight:400;">' + esc(q.q) + '</h3>' +
        '<div style="display:flex;flex-direction:column;gap:10px;">' + q.options.map(function (o, n) {
          return '<button type="button" data-md-answer="' + n + '" style="text-align:left;padding:16px 18px;border:1px solid #D7D2CB;border-radius:14px;background:#FFF;font-size:15px;font-weight:600;color:' + NAVY + ';cursor:pointer;">' + esc(o.label) + '</button>';
        }).join('') + '</div>';
      box.querySelectorAll('[data-md-answer]').forEach(function (b) {
        b.addEventListener('click', function () {
          var o = q.options[+b.getAttribute('data-md-answer')];
          if (o.topic) picks.push(o.topic);
          i++; step();
        });
      });
    }
    modal('<div data-md-quiz-body="1"></div>');
    step();
  }

  // ---------- clicks ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null;
    if (!t) return;
    var p = t.closest('[data-md-play]');
    if (p) { e.preventDefault(); play(p); return; }
    var q = t.closest('[data-md-quiz]');
    if (q) { e.preventDefault(); quiz(); return; }
    var s = t.closest('[data-md-soon]');
    if (s) { e.preventDefault(); }
  });

  // ---------- scroll-in reveal ----------
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = (!reduce && 'IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (x) {
      if (x.isIntersecting) { x.target.style.opacity = '1'; x.target.style.transform = 'none'; io.unobserve(x.target); }
    });
  }, { threshold: 0.12 }) : null;
  function reveal() {
    if (!io) return;
    document.querySelectorAll('[data-md-reveal]').forEach(function (el) {
      if (el.__mdSeen) return;
      el.__mdSeen = true;
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
      el.style.transition = 'opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1)';
      io.observe(el);
    });
  }
  function init() {
    reveal();
    var n = 0, t = setInterval(function () { n++; reveal(); if (n > 30) clearInterval(t); }, 200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // Keep the "Have a money dilemma?" image exactly as tall as the form box beside it,
  // so both are fully visible together. When the grid stacks on mobile, go full width.
  function fitShare() {
    var g = document.querySelector('[data-md-share-grid]');
    if (!g) return;
    var img = g.querySelector('[data-md-share-img]');
    var card = g.children[1];
    if (!img || !card) return;
    var cols = getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length;
    if (cols > 1) { img.style.width = 'auto'; img.style.height = card.offsetHeight + 'px'; }
    else { img.style.width = '100%'; img.style.height = 'auto'; }
  }
  window.addEventListener('resize', fitShare);
  window.addEventListener('load', fitShare);
  setTimeout(fitShare, 300); setTimeout(fitShare, 1200);
})();
