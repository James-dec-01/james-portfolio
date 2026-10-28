/* ============================================================
   MOTION — IntersectionObserver reveal (centre-out) + guardrails
   Adds classes only; if this file fails every section stays visible.
   ============================================================ */

(function () {
  'use strict';

  var root = document.documentElement;
  if (!root) return;

  var reduceMq = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function isReduced() {
    return !!(reduceMq && reduceMq.matches);
  }

  /* selector, variant ('' = centre-out clip, 'fade' = soft rise), delay */
  var TARGETS = [
    ['.ab-card-wrap', 'fade', 0],
    ['.ab-stats', 'fade', 90],
    ['.ab-namegrid', '', 0],
    ['.ab-edu', '', 80],
    ['.ab-profile', '', 160],
    ['.ab-jobs__title', '', 0],
    ['.ab-track', 'fade', 110],
    ['.prj-title', '', 0],
    ['.ct-copy', '', 0],
    ['.ct-figure', 'fade', 110],
    ['.site-foot p', '', 0]
  ];

  var items = [];

  TARGETS.forEach(function (entry) {
    var nodes = document.querySelectorAll(entry[0]);
    Array.prototype.forEach.call(nodes, function (el) {
      el.classList.add('rv');
      if (entry[1]) el.classList.add('rv--' + entry[1]);
      el.style.setProperty('--rv-d', entry[2] + 'ms');
      items.push(el);
    });
  });

  if (!items.length || isReduced()) return;

  root.classList.add('motion');

  /* ---------- hero copy: quick boot-in, scroll-linked centre-out fade ---------- */

  var hero = document.querySelector('.hero');
  var heroCopy = hero
    ? Array.prototype.slice.call(hero.querySelectorAll('.hero-brand,.hero-name h1,.hero-name p,.hero-role'))
    : [];
  var heroTop = 0;
  var heroRange = 1;
  var heroFrame = 0;
  var heroLive = false;
  var heroBooted = false;

  function heroMeasure() {
    if (!hero) return;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var rect = hero.getBoundingClientRect();
    heroTop = rect.top + y;
    heroRange = Math.max(220, (hero.offsetHeight || window.innerHeight) * 0.55);
  }

  function heroReset() {
    heroCopy.forEach(function (el) {
      el.style.opacity = '';
      el.style.clipPath = '';
    });
  }

  function heroApply() {
    heroFrame = 0;
    if (!hero || !heroCopy.length || !heroLive) return;
    var y = (window.scrollY || document.documentElement.scrollTop || 0) - heroTop;
    var p = y <= 0 ? 0 : (y >= heroRange ? 1 : y / heroRange);
    var eased = p * p * (3 - 2 * p);
    var inset = (eased * 44).toFixed(2);
    var opacity = (1 - eased).toFixed(3);
    heroCopy.forEach(function (el) {
      el.style.opacity = opacity;
      el.style.clipPath = 'inset(0 ' + inset + '% 0 ' + inset + '%)';
    });
  }

  function heroSchedule() {
    if (!heroLive || heroFrame) return;
    heroFrame = window.requestAnimationFrame(heroApply);
  }

  function heroBoot() {
    if (!hero || !heroCopy.length || heroBooted) return;
    heroBooted = true;
    heroMeasure();
    var delays = ['0ms', '0ms', '26ms', '76ms'];
    heroCopy.forEach(function (el, index) {
      el.style.setProperty('--hx-d', delays[index] || '0ms');
    });
    window.requestAnimationFrame(function () {
      heroCopy.forEach(function (el) { el.classList.add('is-hx-in'); });
      window.setTimeout(function () {
        hero.classList.add('is-hx-live');
        heroLive = true;
        heroApply();
      }, 500);
    });
  }

  if (heroCopy.length) {
    heroBoot();
    window.addEventListener('scroll', heroSchedule, { passive: true });
    window.addEventListener('resize', function () {
      heroMeasure();
      heroSchedule();
    }, { passive: true });
  }

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  function show(el) {
    el.classList.add('is-in');
    el.setAttribute('data-mv', 'in');
  }

  function leave(el) {
    if (el.getAttribute('data-mv') !== 'in') return;
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!vh) return;
    if (rect.bottom > vh * 0.02 && rect.top < vh * 0.98) return;
    el.classList.remove('is-in');
    el.setAttribute('data-mv', 'out');
  }

  var observers = new WeakMap();
  var exitTimers = new WeakMap();

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      var timer = exitTimers.get(el);
      if (timer) {
        window.clearTimeout(timer);
        exitTimers.delete(el);
      }
      if (entry.isIntersecting) {
        show(el);
      } else if (el.getAttribute('data-mv') === 'in') {
        exitTimers.set(el, window.setTimeout(function () {
          exitTimers.delete(el);
          leave(el);
        }, 150));
      }
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' });

  var vh = window.innerHeight || document.documentElement.clientHeight || 0;

  items.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < vh * 0.92 && rect.bottom > 0) {
      show(el);
    }
    observer.observe(el);
    observers.set(el, observer);
  });

  if (reduceMq) {
    var onReduce = function () {
      if (!isReduced()) return;
      items.forEach(function (el) {
        var timer = exitTimers.get(el);
        if (timer) window.clearTimeout(timer);
        exitTimers.delete(el);
        el.classList.add('is-in');
      });
      heroLive = false;
      heroReset();
      if (hero) hero.classList.remove('is-hx-live');
    };
    if (reduceMq.addEventListener) reduceMq.addEventListener('change', onReduce);
    else if (reduceMq.addListener) reduceMq.addListener(onReduce);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    items.forEach(function (el) {
      if (el.getAttribute('data-mv') === 'in' && !el.classList.contains('is-in')) {
        el.classList.add('is-in');
      }
    });
  });
})();
