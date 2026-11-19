// Small enhancements for the public site. Everything works without this file;
// it adds slider buttons (F-021) and copy buttons on code blocks.
(function () {
  function initSlider(root) {
    var track = root.querySelector('.slider-track');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.slide'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-go]'));
    var counter = root.querySelector('[data-counter]');
    var magazine = document.body.classList.contains('theme-magazine');
    if (!track || slides.length < 2) return;
    var current = 0;

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function step() {
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return slides[0].getBoundingClientRect().width + gap;
    }
    function go(i) {
      var n = slides.length;
      i = ((i % n) + n) % n;
      track.scrollTo({ left: i * step(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    function update(i) {
      if (i === current) return;
      current = i;
      dots.forEach(function (d, k) {
        if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
        d.classList.toggle('is-done', k < i);
      });
      if (counter) counter.textContent = magazine ? pad(i + 1) + ' / ' + pad(slides.length) : (i + 1) + ' / ' + slides.length;
    }
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        update(Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / step()))));
      });
    }, { passive: true });
    root.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute('data-prev')) go(current - 1);
      else if (t.hasAttribute('data-next')) go(current + 1);
      else if (t.hasAttribute('data-go')) go(Number(t.getAttribute('data-go')));
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    });
  }

  function initCopy() {
    if (!navigator.clipboard) return;
    document.querySelectorAll('.prose pre').forEach(function (pre) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', function () {
        var code = pre.querySelector('code') || pre;
        navigator.clipboard.writeText(code.innerText).then(function () {
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
        });
      });
      pre.appendChild(btn);
    });
  }

  document.querySelectorAll('[data-slider]').forEach(initSlider);
  initCopy();
})();
