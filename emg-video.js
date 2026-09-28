(function () {
  // Browsers only allow autoplay when muted. Start muted on arrival,
  // then turn sound on at the visitor's first click or tap anywhere.
  function player() { return document.querySelector('iframe[src*="player.vimeo.com"]'); }
  function send(msg) {
    var f = player();
    if (f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify(msg), '*');
  }
  var done = false;
  function unmute() {
    if (done) return;
    done = true;
    send({ method: 'setVolume', value: 1 });
    send({ method: 'setMuted', value: false });
    send({ method: 'play' });
    ['click', 'touchstart', 'keydown'].forEach(function (e) { document.removeEventListener(e, unmute, true); });
  }
  ['click', 'touchstart', 'keydown'].forEach(function (e) { document.addEventListener(e, unmute, true); });
})();
