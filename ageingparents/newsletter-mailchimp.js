(function () {
  var ACTION = 'https://vanessastoykov.us18.list-manage.com/subscribe/post?u=5bafccece958e5ca2514b2ee2&id=0681d8d525';
  var HONEYPOT = 'b_5bafccece958e5ca2514b2ee2_0681d8d525';
  var SUCCESS = "You're in! I'm so glad you're here. Courageous conversations about money are coming your way \u2014 I can't wait to share them with you. \u2014 Vanessa x";
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Topic pages only — the Homepage, About and Guides forms send no TOPIC.
  var TOPICS = {
    'Topic-AdultChildren.dc.html': 'Adult Children',
    'Topic-AgeingParents.dc.html': 'Ageing Parents',
    'Topic-CareerIncome.dc.html': 'Career & Income',
    'Topic-Divorce.dc.html': 'Divorce',
    'Topic-Inheritance.dc.html': 'Inheritance',
    'Topic-Investing.dc.html': 'Investing',
    'Topic-MoneyMindset.dc.html': 'Money Mindset',
    'Topic-Property.dc.html': 'Property',
    'Topic-Relationships.dc.html': 'Relationships',
    'Topic-Retirement.dc.html': 'Retirement'
  };
  var TOPIC = TOPICS[decodeURIComponent(location.pathname.split('/').pop() || '')] || '';

  function panelFor(btn) {
    var el = btn.parentElement;
    while (el && el !== document.body) {
      if (el.querySelector('input[type="email"]')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function errorBox(panel) {
    var e = panel.querySelector('[data-vs-nl-error]');
    if (e) return e;
    e = document.createElement('div');
    e.setAttribute('data-vs-nl-error', '1');
    e.style.cssText = 'font-size:13px;font-weight:600;color:#8a1c0f;margin:0 auto 16px;max-width:520px;display:none;';
    return e;
  }

  function honeypot(panel) {
    if (panel.querySelector('input[name="' + HONEYPOT + '"]')) return;
    var i = document.createElement('input');
    i.type = 'text';
    i.name = HONEYPOT;
    i.value = '';
    i.tabIndex = -1;
    i.setAttribute('autocomplete', 'off');
    i.setAttribute('aria-hidden', 'true');
    i.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
    panel.appendChild(i);
  }

  function topicField(panel) {
    if (!TOPIC) return;
    if (panel.querySelector('input[name="TOPIC"]')) return;
    var i = document.createElement('input');
    i.type = 'text';
    i.name = 'TOPIC';
    i.value = TOPIC;
    i.tabIndex = -1;
    i.setAttribute('autocomplete', 'off');
    i.setAttribute('aria-hidden', 'true');
    i.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
    panel.appendChild(i);
  }

  function succeed(panel) {
    var kill = panel.querySelectorAll('form, label, button, [data-vs-nl-error], input:not([name="' + HONEYPOT + '"]):not([name="TOPIC"])');
    Array.prototype.forEach.call(kill, function (n) { n.style.display = 'none'; });
    // the inputs' own wrapper rows collapse too, so nothing leaves a gap
    Array.prototype.forEach.call(panel.querySelectorAll('input:not([name="' + HONEYPOT + '"]):not([name="TOPIC"])'), function (n) {
      if (n.parentElement && n.parentElement !== panel) n.parentElement.style.display = 'none';
    });
    var msg = document.createElement('p');
    msg.setAttribute('data-vs-nl-success', '1');
    msg.style.cssText = 'font-size:17px;line-height:1.7;color:#001E60;font-weight:600;margin:0 auto;max-width:520px;';
    msg.textContent = SUCCESS;
    panel.appendChild(msg);
  }

  function wire(btn) {
    if (btn.getAttribute('data-vs-nl') === '1') return;
    var panel = panelFor(btn);
    if (!panel) return;
    btn.setAttribute('data-vs-nl', '1');

    var email = panel.querySelector('input[type="email"]');
    var name = panel.querySelector('input[type="text"]:not([name="' + HONEYPOT + '"]):not([name="TOPIC"])');
    var consent = panel.querySelector('input[type="checkbox"]');
    var form = panel.querySelector('form');

    honeypot(panel);
    topicField(panel);
    var err = errorBox(panel);
    if (!err.parentElement) btn.parentElement.insertBefore(err, btn);

    function fail(m) { err.textContent = m; err.style.display = 'block'; }

    function submit(ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      err.style.display = 'none';

      if (name && !name.value.trim()) return fail('Please enter your first name.');
      if (!email || !EMAIL_RE.test(email.value.trim())) return fail('Please enter a valid email address.');
      if (consent && !consent.checked) return fail('Please tick the box to confirm you\u2019d like to subscribe.');

      var label = btn.textContent;
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'default';
      btn.textContent = 'SUBMITTING...';

      var body = new URLSearchParams();
      body.append('EMAIL', email.value.trim());
      if (name) body.append('FNAME', name.value.trim());
      if (TOPIC) body.append('TOPIC', TOPIC);
      body.append(HONEYPOT, '');

      fetch(ACTION, { method: 'POST', mode: 'no-cors', body: body })
        .catch(function () {})
        .then(function () { succeed(panel); })
        .catch(function () {
          btn.disabled = false;
          btn.style.opacity = '';
          btn.style.cursor = 'pointer';
          btn.textContent = label;
          fail('Something went wrong. Please try again.');
        });
    }

    btn.addEventListener('click', submit);
    if (form) form.addEventListener('submit', submit, true);
    // the static pages keep the name/email inputs in their own <form>
    var outer = panel.querySelectorAll('form');
    Array.prototype.forEach.call(outer, function (f) { f.addEventListener('submit', submit, true); });
  }

  function scan() {
    var btns = document.querySelectorAll('button');
    Array.prototype.forEach.call(btns, function (b) {
      if (/^\s*SIGN ME UP\s*$/i.test(b.textContent)) wire(b);
    });
  }

  function init() {
    scan();
    var n = 0;
    var t = setInterval(function () { n++; scan(); if (n > 40) clearInterval(t); }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
