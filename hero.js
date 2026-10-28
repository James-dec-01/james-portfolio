(function () {
  'use strict';

  var reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduced = !!(reducedQuery && reducedQuery.matches);
  var hero = document.querySelector('.hero');
  if (!hero) return;

  (function () {
    var tab = document.querySelector('.hf-tab');
    if (!tab) return;
    var items = Array.prototype.slice.call(tab.querySelectorAll('.hf-tab__item'));
    var pill = tab.querySelector('.hf-tab__pill');
    var glow = tab.querySelector('.hf-tab__glow');
    var sections = {
      home: null,
      about: document.getElementById('about'),
      work: document.getElementById('work'),
      contact: document.getElementById('contact')
    };
    var active = 'home';
    var lockUntil = 0;
    var rafId = 0;

    function activeItem() {
      for (var i = 0; i < items.length; i++) {
        if (items[i].classList.contains('is-active')) return items[i];
      }
      return items[0];
    }
    function placePill(item) {
      if (!item || !pill) return;
      pill.style.width = item.offsetWidth + 'px';
      pill.style.transform = 'translate3d(' + item.offsetLeft + 'px,0,0)';
      if (glow) {
        var tabRect = tab.getBoundingClientRect();
        var pillLeft = tabRect.left + item.offsetLeft;
        var pillRight = pillLeft + item.offsetWidth;
        var extra = Math.min(104, Math.max(24, 2 * (pillLeft - 4)), Math.max(24, 2 * (window.innerWidth - pillRight - 4)));
        glow.style.width = (item.offsetWidth + extra) + 'px';
        glow.style.transform = 'translate3d(' + (item.offsetLeft - extra / 2) + 'px,0,0)';
      }
    }
    function setActive(name) {
      var item = items[0];
      for (var i = 0; i < items.length; i++) {
        if (items[i].dataset.section === name) item = items[i];
      }
      for (var j = 0; j < items.length; j++) {
        var on = items[j] === item;
        items[j].classList.toggle('is-active', on);
        if (on) items[j].setAttribute('aria-current', 'page');
        else items[j].removeAttribute('aria-current');
      }
      active = name;
      placePill(item);
    }
    function currentSection() {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      var doc = document.documentElement;
      if (y + window.innerHeight >= doc.scrollHeight - 6) return 'contact';
      if (y < 10) return 'home';
      var name = 'home';
      var order = [['about', sections.about], ['work', sections.work], ['contact', sections.contact]];
      for (var i = 0; i < order.length; i++) {
        var el = order[i][1];
        if (el && el.getBoundingClientRect().top <= 170) name = order[i][0];
      }
      return name;
    }
    function spy() {
      rafId = 0;
      if (performance.now() < lockUntil) return;
      var next = currentSection();
      if (next !== active) setActive(next);
    }
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(spy);
    }

    items.forEach(function (item) {
      item.addEventListener('click', function (event) {
        var name = item.dataset.section;
        var section = sections[name];
        var top = section ? section.getBoundingClientRect().top + (window.scrollY || 0) - 88 : 0;
        event.preventDefault();
        lockUntil = performance.now() + 950;
        setActive(name);
        try {
          window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
        } catch (e) {
          window.scrollTo(0, Math.max(0, top));
        }
        if (window.history && history.replaceState) {
          history.replaceState(null, '', name === 'home' ? '#top' : '#' + name);
        }
        flashPill();
      });
    });

    var sheenTimer = 0;
    function flashPill() {
      if (!pill || reduced) return;
      pill.classList.remove('is-sheen');
      void pill.offsetWidth;
      pill.classList.add('is-sheen');
      clearTimeout(sheenTimer);
      sheenTimer = setTimeout(function () {
        pill.classList.remove('is-sheen');
      }, 700);
    }
    items.forEach(function (item) {
      item.addEventListener('pointerenter', function () {
        if (item.classList.contains('is-active')) flashPill();
      });
      item.addEventListener('focus', function () {
        if (item.classList.contains('is-active')) flashPill();
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      requestAnimationFrame(function () {
        setActive(active);
      });
    });
    setActive('home');
    requestAnimationFrame(function () {
      placePill(activeItem());
      spy();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        placePill(activeItem());
      });
    }
  })();

  var video = hero.querySelector('.hero-video');
  var heroVisible = true;

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.disablePictureInPicture = true;
  }

  function syncVideo() {
    if (!video) return;
    hero.classList.toggle('is-reduced', reduced);
    if (reduced) {
      try { video.pause(); video.currentTime = 0; } catch (e) {}
      return;
    }
    if (heroVisible && !document.hidden) {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      try { video.pause(); } catch (e) {}
    }
  }
  if (video) {
    video.addEventListener('canplay', syncVideo);
    video.addEventListener('loadeddata', syncVideo);
    var retryPlay = function () {
      if (reduced) return;
      syncVideo();
      if (!video.paused) {
        document.removeEventListener('pointerdown', retryPlay, true);
        document.removeEventListener('touchstart', retryPlay, true);
      }
    };
    document.addEventListener('pointerdown', retryPlay, true);
    document.addEventListener('touchstart', retryPlay, true);
  }
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      syncVideo();
    }, { threshold: 0.05 }).observe(hero);
  }
  document.addEventListener('visibilitychange', syncVideo);
  syncVideo();

  (function () {
    var tools = Array.prototype.slice.call(hero.querySelectorAll('.hero-tool'));
    var tip = document.getElementById('hero-tip');
    if (!tools.length || !tip) return;
    var tipName = tip.querySelector('.hero-tip__name');
    var tipDesc = tip.querySelector('.hero-tip__desc');
    var data = {
      figma: ['Figma', 'B/C 端 UI 组件化设计、原型搭建与团队协作输出'],
      photoshop: ['Photoshop', '图像合成、视觉精修、海报版式与画面质感塑造'],
      illustrator: ['Illustrator', '矢量图标、LOGO、字体及 IP 矢量图形标准化绘制'],
      c4d: ['C4D', '三维建模、产品渲染与立体视觉设计'],
      chatgpt: ['ChatGPT', '创意发散、设计文案与方案梳理'],
      codex: ['Codex', '前端原型搭建、交互实现与重复任务自动化']
    };
    var owner = null;
    var pinned = false;

    function place(button) {
      tip.style.left = '0px';
      tip.style.top = '0px';
      var w = tip.offsetWidth;
      var h = tip.offsetHeight;
      var r = button.getBoundingClientRect();
      var left = r.left - 14 - w;
      if (left < 8) left = 8;
      if (left + w > window.innerWidth - 8) left = window.innerWidth - 8 - w;
      var top = r.top + r.height / 2;
      var minTop = h / 2 + 8;
      var maxTop = window.innerHeight - h / 2 - 8;
      if (top < minTop) top = minTop;
      if (top > maxTop) top = maxTop;
      tip.style.left = Math.round(left) + 'px';
      tip.style.top = Math.round(top) + 'px';
    }
    function open(button, pin) {
      var meta = data[button.dataset.tool];
      if (!meta) return;
      owner = button;
      pinned = !!pin;
      tipName.textContent = meta[0];
      tipDesc.textContent = meta[1];
      tip.classList.add('is-open');
      tip.setAttribute('aria-hidden', 'false');
      place(button);
    }
    function close() {
      owner = null;
      pinned = false;
      tip.classList.remove('is-open');
      tip.setAttribute('aria-hidden', 'true');
    }

    tools.forEach(function (button) {
      button.addEventListener('mouseenter', function () {
        if (!pinned) open(button, false);
      });
      button.addEventListener('mouseleave', function () {
        if (!pinned) close();
      });
      button.addEventListener('focus', function () {
        open(button, false);
      });
      button.addEventListener('blur', function () {
        if (!pinned) close();
      });
      button.addEventListener('click', function (event) {
        event.preventDefault();
        if (owner === button && pinned) close();
        else open(button, true);
      });
    });
    document.addEventListener('pointerdown', function (event) {
      if (!owner) return;
      if (event.target.closest && event.target.closest('.hero-tool')) return;
      close();
    }, true);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && owner) close();
    });
    window.addEventListener('scroll', function () {
      if (owner && pinned) close();
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (owner) place(owner);
    });
  })();

  var stage = document.getElementById('hero-stage');
  var tiltEl = document.getElementById('hero-tilt');
  var canvas = hero.querySelector('.hero-reveal');
  var ctx = canvas ? canvas.getContext('2d') : null;
  if (!stage || !tiltEl || !canvas || !ctx) return;

  var PERSPECTIVE = 900;
  var MAX_RY = 8.6;
  var MAX_RX = 7.4;
  var DAMPING = 0.12;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var sw = 0, sh = 0, box = 1, coreD = 200;
  var MASK = 192;
  var TRAIL_LIFE = 320;
  var TAIL_MAX = 0.85;

  var cache = document.createElement('canvas');
  var cctx = cache.getContext('2d');
  cctx.imageSmoothingEnabled = true;
  var maskCanvas = document.createElement('canvas');
  maskCanvas.width = MASK;
  maskCanvas.height = MASK;
  var mctx = maskCanvas.getContext('2d');
  mctx.imageSmoothingEnabled = true;
  var softCanvas = document.createElement('canvas');
  softCanvas.width = MASK;
  softCanvas.height = MASK;
  var sctx = softCanvas.getContext('2d');
  sctx.imageSmoothingEnabled = true;

  var revealImg = new Image();
  var imgReady = false;
  var rect = { left: 0, top: 0, width: 1, height: 1 };
  var seeded = false;

  var px = 0, py = 0, tx = 0, ty = 0;
  var alpha = 0, targetAlpha = 0;
  var tiltX = 0, tiltY = 0, targetTiltX = 0, targetTiltY = 0;
  var pointer = null;
  var keyboardOn = false;
  var touchOn = false;
  var running = false;
  var raf = 0;
  var lastTime = 0;
  var prevPx = 0, prevPy = 0;
  var prevSeeded = false;
  var flowSpeed = 0, flowAngle = 0, tailAlpha = 0;
  var trail = [];
  var inView = true;

  function updateRect() {
    var r = stage.getBoundingClientRect();
    rect.left = r.left;
    rect.top = r.top;
    rect.width = r.width;
    rect.height = r.height;
  }

  function buildCache() {
    if (!imgReady || !sw || !sh) return;
    var w = Math.max(1, Math.round(sw * dpr));
    var h = Math.max(1, Math.round(sh * dpr));
    if (cache.width !== w || cache.height !== h) {
      cache.width = w;
      cache.height = h;
    }
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.clearRect(0, 0, w, h);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.drawImage(revealImg, 0, 0, sw, sh);
  }

  function resize() {
    updateRect();
    if (rect.width > 0) sw = rect.width;
    if (rect.height > 0) sh = rect.height;
    if (!sw || !sh) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    coreD = sw < 520 ? Math.max(112, Math.min(sw * 0.28, 148)) : Math.max(190, Math.min(sw * 0.36, 240));
    box = Math.round(coreD * 1.9 + 40);
    buildCache();
    canvas.width = Math.max(1, Math.round(box * dpr));
    canvas.height = Math.max(1, Math.round(box * dpr));
    canvas.style.width = box + 'px';
    canvas.style.height = box + 'px';
    if (!seeded) {
      seeded = true;
      px = tx = sw * 0.5;
      py = ty = sh * 0.3;
    }
    if (alpha > 0) draw();
  }

  function readSize() {
    var r = stage.getBoundingClientRect();
    if (r.width > 0) sw = r.width;
    if (r.height > 0) sh = r.height;
  }

  revealImg.onload = function () {
    imgReady = true;
    readSize();
    buildCache();
    if (alpha > 0) draw();
  };
  revealImg.onerror = function () {
    imgReady = false;
  };
  revealImg.src = 'hero-future.png';

  readSize();
  tiltEl.style.transform = 'perspective(' + PERSPECTIVE + 'px) rotateX(0deg) rotateY(0deg)';
  if (document.readyState === 'complete') resize();
  window.addEventListener('load', resize);

  function planePoint(clientX, clientY) {
    var ox = sw * 0.5;
    var oy = sh * 0.57;
    var sx = clientX - rect.left - ox;
    var sy = clientY - rect.top - oy;
    var rx = tiltX * Math.PI / 180;
    var ry = tiltY * Math.PI / 180;
    var cx = Math.cos(rx), snx = Math.sin(rx);
    var cy = Math.cos(ry), sny = Math.sin(ry);

    var a = cy, b = 0, c = 0;
    var d = sny * snx, e = cx, f = 0;
    var g = sny * cx / PERSPECTIVE, h = -snx / PERSPECTIVE, i = 1;
    var det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    if (!det) return { x: sx + ox, y: sy + oy };

    var invX = ((e * i - f * h) * sx + (c * h - b * i) * sy + (b * f - c * e)) / det;
    var invY = ((f * g - d * i) * sx + (a * i - c * g) * sy + (c * d - a * f)) / det;
    var invW = ((d * h - e * g) * sx + (b * g - a * h) * sy + (a * e - b * d)) / det;
    if (Math.abs(invW) < 0.0001) return { x: sx + ox, y: sy + oy };
    return { x: ox + invX / invW, y: oy + invY / invW };
  }

  function chaikin(pts, iterations) {
    for (var k = 0; k < iterations; k++) {
      if (pts.length < 3) break;
      var next = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
        next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
      }
      next.push(pts[pts.length - 1]);
      pts = next;
    }
    return pts;
  }

  var spineLength = 0;

  function collectSpine(now, bx, by) {
    var pts = [];
    var maxD = coreD * TAIL_MAX;
    for (var i = 0; i < trail.length; i++) {
      if (now - trail[i].t > TRAIL_LIFE) continue;
      var dx = trail[i].x - px, dy = trail[i].y - py;
      if (dx * dx + dy * dy > maxD * maxD) continue;
      pts.push({ x: trail[i].x - bx, y: trail[i].y - by });
    }
    var length = 0;
    for (var j = 1; j < pts.length; j++) {
      var sx = pts[j].x - pts[j - 1].x;
      var sy = pts[j].y - pts[j - 1].y;
      length += Math.sqrt(sx * sx + sy * sy);
    }
    return { pts: length > 2 ? chaikin(pts, 2) : pts, length: length };
  }

  function paintTail(spine, hx, hy, now, radius) {
    var n = spine.length;
    if (n < 2) return;
    var left = [], right = [];
    for (var i = 0; i < n; i++) {
      var p = spine[i];
      var pv = spine[Math.max(0, i - 1)];
      var nx = spine[Math.min(n - 1, i + 1)];
      var dx = nx.x - pv.x, dy = nx.y - pv.y;
      var dl = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = -dy / dl, uy = dx / dl;
      var u = i / (n - 1);
      var ripple = 1 + Math.sin(u * 6.2 - now * 0.0045) * 0.15 * (1 - u * 0.45);
      var w = radius * (0.17 + 0.72 * Math.pow(u, 0.8)) * ripple;
      var wob = Math.sin(u * 4.4 - now * 0.0024) * radius * 0.075 * (1 - u * 0.35);
      var cxp = p.x + ux * wob, cyp = p.y + uy * wob;
      left.push(cxp + ux * w, cyp + uy * w);
      right.push(cxp - ux * w, cyp - uy * w);
    }
    var path = new Path2D();
    path.moveTo(left[0], left[1]);
    for (var a = 2; a < left.length; a += 2) path.lineTo(left[a], left[a + 1]);
    for (var b = right.length - 2; b >= 0; b -= 2) path.lineTo(right[b], right[b + 1]);
    path.closePath();
    mctx.globalAlpha = 0.96 * tailAlpha;
    mctx.fillStyle = '#fff';
    mctx.fill(path);
    mctx.globalAlpha = 1;

    var fadeStart = radius * 0.7;
    if (spineLength > fadeStart * 0.4) {
      var fadeEnd = fadeStart + Math.max(1, spineLength * 0.96);
      var fade = mctx.createRadialGradient(hx, hy, fadeStart, hx, hy, fadeEnd);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(0.32, 'rgba(0,0,0,0.04)');
      fade.addColorStop(0.72, 'rgba(0,0,0,0.26)');
      fade.addColorStop(1, 'rgba(0,0,0,0.8)');
      mctx.globalCompositeOperation = 'destination-out';
      mctx.fillStyle = fade;
      mctx.fillRect(hx - fadeEnd, hy - fadeEnd, fadeEnd * 2, fadeEnd * 2);
      mctx.globalCompositeOperation = 'source-over';
    }
  }

  function paintHead(hx, hy, radius, angle, stretch, now) {
    mctx.save();
    mctx.translate(hx, hy);
    mctx.rotate(angle);
    mctx.scale(stretch, 1 / Math.sqrt(stretch));

    var phase = now * 0.0016;
    var path = new Path2D();
    var steps = 72;
    for (var i = 0; i <= steps; i++) {
      var a = i / steps * Math.PI * 2;
      var wob = 0.945
        + 0.052 * Math.sin(3 * a + phase * 1.6)
        + 0.03 * Math.sin(5 * a - phase * 1.1 + 1.3)
        + 0.016 * Math.sin(7 * a + phase * 0.7 + 2.4);
      var px2 = Math.cos(a) * radius * wob;
      var py2 = Math.sin(a) * radius * wob;
      if (i === 0) path.moveTo(px2, py2);
      else path.lineTo(px2, py2);
    }
    path.closePath();

    var g = mctx.createRadialGradient(0, 0, radius * 0.04, 0, 0, radius);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.62, 'rgba(255,255,255,1)');
    g.addColorStop(0.76, 'rgba(255,255,255,.99)');
    g.addColorStop(0.85, 'rgba(255,255,255,.95)');
    g.addColorStop(0.91, 'rgba(255,255,255,.82)');
    g.addColorStop(0.955, 'rgba(255,255,255,.5)');
    g.addColorStop(0.98, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    mctx.fillStyle = g;
    mctx.fill(path);

    var breathe = 0.2 + Math.sin(now * 0.0016) * 0.03;
    var lx = Math.cos(angle + 1.85) * radius * breathe;
    var ly = Math.sin(angle + 1.85) * radius * breathe;
    var lg = mctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 0.86);
    lg.addColorStop(0, 'rgba(255,255,255,.6)');
    lg.addColorStop(0.5, 'rgba(255,255,255,.38)');
    lg.addColorStop(0.82, 'rgba(255,255,255,.1)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    mctx.fillStyle = lg;
    mctx.beginPath();
    mctx.arc(lx, ly, radius * 0.86, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();
  }

  function buildMask(bx, by, now) {
    var s = MASK / box;
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, MASK, MASK);
    mctx.setTransform(s, 0, 0, s, 0, 0);
    mctx.globalCompositeOperation = 'source-over';
    mctx.globalAlpha = 1;

    var hx = px - bx;
    var hy = py - by;
    var radius = coreD * 0.5;
    var stretch = 1 + Math.min(0.52, flowSpeed / 2200);
    var angle = flowAngle;

    var spine = collectSpine(now, bx, by);
    spineLength = spine.length;
    if (spine.pts.length > 2 && spine.length > radius * 0.18) {
      paintTail(spine.pts, hx, hy, now, radius);
    }
    paintHead(hx, hy, radius, angle, stretch, now);

    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, MASK, MASK);
    sctx.filter = 'blur(' + (MASK / box * 5.5).toFixed(2) + 'px)';
    sctx.drawImage(maskCanvas, 0, 0);
    sctx.filter = 'none';
  }

  function draw(now) {
    if (!imgReady || !sw || alpha <= 0.004) {
      canvas.style.opacity = '0';
      return;
    }
    var size = box;
    var bx = px - size / 2;
    var by = py - size / 2;
    buildMask(bx, by, now || performance.now());

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, size, size);

    var ix0 = Math.max(0, Math.floor(bx));
    var iy0 = Math.max(0, Math.floor(by));
    var ix1 = Math.min(sw, Math.ceil(bx + size));
    var iy1 = Math.min(sh, Math.ceil(by + size));
    if (ix1 > ix0 && iy1 > iy0) {
      ctx.drawImage(cache,
        ix0 * dpr, iy0 * dpr, (ix1 - ix0) * dpr, (iy1 - iy0) * dpr,
        ix0 - bx, iy0 - by, ix1 - ix0, iy1 - iy0);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(softCanvas, 0, 0, MASK, MASK, 0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
    }

    canvas.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0)';
    canvas.style.opacity = String(alpha);
  }

  function applyTilt() {
    tiltEl.style.transform = 'perspective(' + PERSPECTIVE + 'px) rotateX(' +
      tiltX.toFixed(3) + 'deg) rotateY(' + tiltY.toFixed(3) + 'deg)';
  }

  function tick(now) {
    if (!running) return;
    if (!inView || document.hidden) {
      running = false;
      raf = 0;
      return;
    }
    var dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    var kt = reduced ? 1 : (1 - Math.exp(-dt / DAMPING));
    tiltX += (targetTiltX - tiltX) * kt;
    tiltY += (targetTiltY - tiltY) * kt;
    if (Math.abs(targetTiltX - tiltX) < 0.004) tiltX = targetTiltX;
    if (Math.abs(targetTiltY - tiltY) < 0.004) tiltY = targetTiltY;
    applyTilt();

    if (pointer) {
      var p = planePoint(pointer.x, pointer.y);
      tx = p.x;
      ty = p.y;
    }

    var kp = reduced ? 1 : (1 - Math.exp(-dt / 0.045));
    px += (tx - px) * kp;
    py += (ty - py) * kp;
    if (!prevSeeded) { prevPx = px; prevPy = py; prevSeeded = true; }
    var moveX = px - prevPx;
    var moveY = py - prevPy;
    var instSpeed = Math.sqrt(moveX * moveX + moveY * moveY) / dt;
    prevPx = px;
    prevPy = py;

    var kv = reduced ? 1 : (1 - Math.exp(-dt / 0.09));
    flowSpeed += (instSpeed - flowSpeed) * kv;
    var tailTarget = flowSpeed > 60 ? 1 : 0;
    tailAlpha += (tailTarget - tailAlpha) * (reduced ? 1 : (1 - Math.exp(-dt / 0.11)));
    if (!isFinite(flowSpeed) || flowSpeed < 4) flowSpeed = 0;
    if (instSpeed > 40) {
      var aim = Math.atan2(moveY, moveX);
      var da = aim - flowAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      flowAngle += da * (reduced ? 1 : (1 - Math.exp(-dt / 0.085)));
    }

    if (pointer && !reduced) {
      var last = trail.length ? trail[trail.length - 1] : null;
      if (!last || Math.abs(tx - last.x) + Math.abs(ty - last.y) > 0.7) {
        trail.push({ x: tx, y: ty, t: now });
      }
    }
    while (trail.length && now - trail[0].t > TRAIL_LIFE) trail.shift();
    if (trail.length > 40) trail.shift();

    var tau = targetAlpha > alpha ? 0.08 : 0.15;
    var ka = reduced ? 1 : (1 - Math.exp(-dt / tau));
    alpha += (targetAlpha - alpha) * ka;
    if (Math.abs(targetAlpha - alpha) < 0.003) alpha = targetAlpha;

    draw(now);

    if (alpha === 0 && targetAlpha === 0 && Math.abs(targetTiltX - tiltX) < 0.01 && Math.abs(targetTiltY - tiltY) < 0.01) {
      running = false;
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running || !inView || document.hidden) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function clearTrail() {
    trail.length = 0;
    flowSpeed = 0;
    tailAlpha = 0;
    prevSeeded = false;
    prevPx = 0;
    prevPy = 0;
  }

  function hideReveal() {
    targetAlpha = 0;
    keyboardOn = false;
    pointer = null;
    clearTrail();
    start();
  }

  function onPointerMove(event) {
    if (event.pointerType !== 'mouse') return;
    var overTool = event.target && event.target.closest && event.target.closest('.hero-tool,.hero-brand');
    pointer = { x: event.clientX, y: event.clientY };
    updateRect();

    if (!reduced) {
      var nx = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      var ny = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      targetTiltY = nx * MAX_RY;
      targetTiltX = -ny * MAX_RX;
    }

    if (overTool) {
      targetAlpha = 0;
      if (reduced) pointer = null;
    } else {
      var p = planePoint(event.clientX, event.clientY);
      var inside = p.x > 2 && p.x < sw - 2 && p.y > 2 && p.y < sh - 2;
      if (reduced) {
        pointer = null;
        tx = sw * 0.5;
        ty = sh * 0.34;
        targetAlpha = inside ? 1 : 0;
      } else if (inside) {
        if (targetAlpha === 0 && alpha < 0.02) {
          px = tx = p.x;
          py = ty = p.y;
          clearTrail();
        }
        targetAlpha = 1;
      } else {
        targetAlpha = 0;
      }
    }
    start();
  }

  hero.addEventListener('pointermove', onPointerMove, { passive: true });

  hero.addEventListener('pointerleave', function (event) {
    if (event.pointerType !== 'mouse') return;
    targetAlpha = 0;
    targetTiltX = 0;
    targetTiltY = 0;
    pointer = null;
    keyboardOn = false;
    clearTrail();
    start();
  }, { passive: true });

  function touchPoint(touch) {
    updateRect();
    var p = planePoint(touch.clientX, touch.clientY);
    if (p.x <= 2 || p.x >= sw - 2 || p.y <= 2 || p.y >= sh - 2) return false;
    pointer = { x: touch.clientX, y: touch.clientY };
    px = tx = p.x;
    py = ty = p.y;
    return true;
  }

  hero.addEventListener('touchstart', function (event) {
    if (event.touches.length !== 1) return;
    touchOn = true;
    keyboardOn = false;
    targetTiltX = 0;
    targetTiltY = 0;
    clearTrail();
    if (touchPoint(event.touches[0])) {
      targetAlpha = 1;
      start();
    }
  }, { passive: true });

  hero.addEventListener('touchmove', function (event) {
    if (!touchOn || event.touches.length !== 1) return;
    if (touchPoint(event.touches[0])) {
      targetAlpha = 1;
      start();
    }
  }, { passive: true });

  function endTouch() {
    if (!touchOn) return;
    touchOn = false;
    pointer = null;
    if (!keyboardOn) targetAlpha = 0;
    clearTrail();
    start();
  }
  hero.addEventListener('touchend', endTouch, { passive: true });
  hero.addEventListener('touchcancel', endTouch, { passive: true });

  stage.addEventListener('keydown', function (event) {
    if (event.key !== ' ' && event.key !== 'Enter' && event.key !== 'Spacebar') return;
    event.preventDefault();
    updateRect();
    keyboardOn = !keyboardOn;
    if (keyboardOn) {
      targetAlpha = 1;
      px = tx = sw * 0.5;
      py = ty = sh * 0.3;
      targetTiltX = 0;
      targetTiltY = 0;
      clearTrail();
    } else {
      targetAlpha = 0;
      clearTrail();
    }
    start();
  });
  stage.addEventListener('blur', function () {
    if (!keyboardOn) return;
    keyboardOn = false;
    targetAlpha = 0;
    start();
  });

  window.addEventListener('scroll', function () {
    updateRect();
    if (touchOn) {
      touchOn = false;
      pointer = null;
      if (!keyboardOn) targetAlpha = 0;
      clearTrail();
    }
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) start();
      else stop();
    }, { threshold: 0.03 }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      resize();
    }).observe(stage);
  }
  window.addEventListener('resize', function () {
    requestAnimationFrame(resize);
  });

  if (reducedQuery) {
    var onReducedChange = function () {
      reduced = reducedQuery.matches;
      if (reduced) {
        targetTiltX = targetTiltY = tiltX = tiltY = 0;
        applyTilt();
      }
      syncVideo();
      start();
    };
    if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', onReducedChange);
    else if (reducedQuery.addListener) reducedQuery.addListener(onReducedChange);
  }
})();
