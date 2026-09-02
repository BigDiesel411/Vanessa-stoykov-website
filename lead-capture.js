(function () {
  var pending = null;

  function css() {
    if (document.getElementById('vs-lead-css')) return;
    var s = document.createElement('style');
    s.id = 'vs-lead-css';
    s.textContent = [
      '#vs-lead-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,30,96,0.45);display:none;align-items:center;justify-content:center;padding:24px;}',
      '#vs-lead-backdrop.open{display:flex;}',
      '#vs-lead-modal{background:#FFFFFF;border-radius:20px;max-width:460px;width:100%;padding:40px 36px;box-shadow:0 24px 60px rgba(0,30,96,0.30);position:relative;font-family:Inter,sans-serif;max-height:90vh;overflow-y:auto;}',
      '#vs-lead-close{position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;padding:8px;line-height:0;}',
      '#vs-lead-close svg{width:20px;height:20px;}',
      '#vs-lead-kicker{font-size:11px;font-weight:700;letter-spacing:0.08em;color:#F09491;margin-bottom:10px;}',
      '#vs-lead-title{font-family:"Bebas Neue",sans-serif;font-size:28px;line-height:1.1;color:#001E60;margin:0 0 10px;}',
      '#vs-lead-sub{font-size:15px;line-height:1.6;color:#33456f;margin:0 0 26px;}',
      '.vs-lead-input{width:100%;padding:14px 16px;border:1px solid #D7D2CB;border-radius:10px;font-size:15px;font-family:Inter,sans-serif;color:#001E60;margin-bottom:14px;background:#FDFCFB;}',
      '.vs-lead-input:focus{outline:2px solid #F09491;outline-offset:1px;border-color:#F09491;}',
      '#vs-lead-consent{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.5;color:#33456f;margin:6px 0 24px;text-align:left;}',
      '#vs-lead-consent input{margin-top:3px;flex-shrink:0;}',
      '#vs-lead-submit{width:100%;background:#001E60;color:#FFFFFF;border:none;padding:16px;border-radius:999px;font-size:13px;font-weight:700;letter-spacing:0.06em;cursor:pointer;}',
      '#vs-lead-submit:hover{background:#0a2c7a;}',
      '#vs-lead-err{font-size:13px;color:#c0392b;margin:0 0 14px;display:none;}',
      '#vs-lead-done{display:none;text-align:center;}',
      '#vs-lead-done p{font-size:15px;line-height:1.6;color:#33456f;margin:0 0 24px;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function build() {
    if (document.getElementById('vs-lead-backdrop')) return;
    css();
    var b = document.createElement('div');
    b.id = 'vs-lead-backdrop';
    b.innerHTML =
      '<div id="vs-lead-modal" role="dialog" aria-modal="true" aria-labelledby="vs-lead-title">' +
        '<button id="vs-lead-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="#001E60" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<form id="vs-lead-form" novalidate>' +
          '<div id="vs-lead-kicker">FREE GUIDE</div>' +
          '<h2 id="vs-lead-title">Where should we send it?</h2>' +
          '<p id="vs-lead-sub">Pop in your details and we\u2019ll email your guide straight through.</p>' +
          '<p id="vs-lead-err"></p>' +
          '<input class="vs-lead-input" id="vs-lead-name" type="text" placeholder="First Name*" autocomplete="given-name">' +
          '<input class="vs-lead-input" id="vs-lead-email" type="email" placeholder="Email Address*" autocomplete="email">' +
          '<label id="vs-lead-consent"><input type="checkbox" id="vs-lead-check" checked>' +
            '<span>Yes, email me the guide and sign me up for <strong>Vanessa\u2019s Newsletter</strong>. I agree to the Privacy Policy and Terms of Use.*</span>' +
          '</label>' +
          '<button id="vs-lead-submit" type="submit">SEND ME THE GUIDE</button>' +
        '</form>' +
        '<div id="vs-lead-done">' +
          '<div id="vs-lead-kicker2" style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#F09491;margin-bottom:10px;">ON ITS WAY</div>' +
          '<h2 style="font-family:\'Bebas Neue\',sans-serif;font-size:28px;line-height:1.1;color:#001E60;margin:0 0 12px;">Thanks — check your inbox</h2>' +
          '<p>We\u2019ve got your details. Your guide is on its way to your email.</p>' +
          '<a id="vs-lead-fallback" href="#" style="font-size:14px;font-weight:700;color:#001E60;border-bottom:1.5px solid #F09491;text-decoration:none;">Or open it now \u2192</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(b);

    b.addEventListener('click', function (e) { if (e.target === b) close(); });
    document.getElementById('vs-lead-close').addEventListener('click', close);
    document.getElementById('vs-lead-form').addEventListener('submit', submit);
  }

  function open(href, filename, label) {
    build();
    pending = { href: href, filename: filename, label: label };
    document.getElementById('vs-lead-form').style.display = '';
    document.getElementById('vs-lead-done').style.display = 'none';
    document.getElementById('vs-lead-err').style.display = 'none';
    document.getElementById('vs-lead-kicker').textContent = label ? label.toUpperCase() : 'FREE GUIDE';
    document.getElementById('vs-lead-backdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('vs-lead-name').focus(); }, 60);
  }

  function close() {
    var b = document.getElementById('vs-lead-backdrop');
    if (b) b.classList.remove('open');
    document.body.style.overflow = '';
    pending = null;
  }

  function fail(msg) {
    var e = document.getElementById('vs-lead-err');
    e.textContent = msg;
    e.style.display = 'block';
  }

  function submit(ev) {
    ev.preventDefault();
    var name = document.getElementById('vs-lead-name').value.trim();
    var email = document.getElementById('vs-lead-email').value.trim();
    var consent = document.getElementById('vs-lead-check').checked;
    if (!name) return fail('Please enter your first name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.');
    if (!consent) return fail('Please tick the box so we can email your guide.');

    var lead = {
      name: name,
      email: email,
      guide: pending ? pending.label : '',
      file: pending ? pending.filename : '',
      page: location.pathname.split('/').pop(),
      at: new Date().toISOString()
    };

    // Store locally so nothing is lost before the email provider is connected.
    try {
      var key = 'vs_guide_leads';
      var all = JSON.parse(localStorage.getItem(key) || '[]');
      all.push(lead);
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) {}

    // Hook for a real provider: window.vsSubmitLead(lead) can POST to Mailchimp/ConvertKit etc.
    if (typeof window.vsSubmitLead === 'function') {
      try { window.vsSubmitLead(lead); } catch (e) {}
    }

    document.getElementById('vs-lead-form').style.display = 'none';
    var done = document.getElementById('vs-lead-done');
    done.style.display = 'block';
    var fb = document.getElementById('vs-lead-fallback');
    if (pending) {
      fb.setAttribute('href', pending.href);
      fb.setAttribute('target', '_blank');
      fb.setAttribute('rel', 'noopener');
    }
  }

  function wire() {
    var links = document.querySelectorAll('a[download]');
    Array.prototype.forEach.call(links, function (a) {
      if (a.getAttribute('data-vs-lead') === '1') return;
      a.setAttribute('data-vs-lead', '1');
      var href = a.getAttribute('href');
      var filename = a.getAttribute('download');
      // guide title = nearest card heading
      var label = 'Free guide';
      var card = a.closest('div');
      while (card && card.parentElement) {
        var kick = card.querySelector('div[style*="letter-spacing:0.08em"]');
        if (kick && kick.textContent.trim()) { label = kick.textContent.trim(); break; }
        card = card.parentElement;
      }
      a.removeAttribute('download');
      a.setAttribute('href', '#');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        open(href, filename, label);
      });
    });
  }

  function init() {
    wire();
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      wire();
      if (tries > 40) clearInterval(t);
    }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
