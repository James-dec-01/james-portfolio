/* ============================================================
   PLAY BALL — a fixed, viewport-bound metal sphere.
   - one independent rAF loop, translate3d + rotate on a single img
   - swept pointer collision so a fast cursor cannot tunnel through
   - no gravity, light damping, wall restitution, 8px safe margin
   - pauses under dialogs / aria-modal surfaces and when the tab hides
   ============================================================ */

(function () {
  'use strict';

  if (window.__playBall) return;

  var host = document.getElementById('ball-play');
  var img;
  if (!host) {
    host = document.createElement('div');
    host.className = 'ball-play';
    host.id = 'ball-play';
    host.tabIndex = 0;
    host.setAttribute('aria-label', '小球互动');
    img = document.createElement('img');
    img.className = 'ball-play__img';
    img.src = 'interaction-assets/metal-ball.webp';
    img.alt = '';
    img.width = 384;
    img.height = 384;
    img.draggable = false;
    img.decoding = 'async';
    host.appendChild(img);
    document.body.appendChild(host);
  } else {
    img = host.querySelector('.ball-play__img');
  }
  if (!img) return;

  /* The hero tooltip is fixed but lives inside the hero stacking context,
     which paints below this layer. Move the node itself (listeners and
     positioning intact) so the tooltip stays above the ball. */
  var heroTip = document.getElementById('hero-tip');
  if (heroTip && heroTip.parentElement && heroTip.parentElement !== document.body) {
    document.body.appendChild(heroTip);
  }

  var MARGIN = 8;
  var MIN_SPEED = 88;
  var MAX_SPEED = 780;
  var DAMPING = 0.965;
  var RESTITUTION = 0.94;
  var KICK_COOLDOWN = 70;
  var RADIUS_RATIO = 0.47;

  var reduceMq = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  var state = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    rotV: 0,
    size: 68,
    last: 0,
    raf: 0,
    running: false,
    paused: false,
    reduced: !!(reduceMq && reduceMq.matches),
    lastKick: -1000,
    bounces: 0,
    lastBounce: null,
    frames: 0,
    nudgeTimer: 0
  };

  var cursor = { has: false, x: 0, y: 0, t: 0, vx: 0, vy: 0 };
  var touchTap = null;
  var syncTimer = 0;

  function clock() {
    return window.performance && performance.now ? performance.now() : Date.now();
  }

  function viewport() {
    var vv = window.visualViewport;
    var w = vv && vv.width ? vv.width : (window.innerWidth || document.documentElement.clientWidth);
    var h = vv && vv.height ? vv.height : (window.innerHeight || document.documentElement.clientHeight);
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }

  function measure() {
    var size = img.offsetWidth || parseFloat(window.getComputedStyle(img).width) || 68;
    state.size = size;
    return size;
  }

  function limits() {
    var v = viewport();
    var size = state.size;
    return {
      minX: MARGIN,
      minY: MARGIN,
      maxX: Math.max(MARGIN, v.w - size - MARGIN),
      maxY: Math.max(MARGIN, v.h - size - MARGIN),
      w: v.w,
      h: v.h
    };
  }

  function speed() {
    return Math.sqrt(state.vx * state.vx + state.vy * state.vy);
  }

  function clampSpeed() {
    var sp = speed();
    if (sp > MAX_SPEED) {
      var k = MAX_SPEED / sp;
      state.vx *= k;
      state.vy *= k;
    } else if (sp > 0.001 && sp < MIN_SPEED) {
      var m = MIN_SPEED / sp;
      state.vx *= m;
      state.vy *= m;
    }
  }

  function render() {
    img.style.transform =
      'translate3d(' + state.x.toFixed(2) + 'px,' + state.y.toFixed(2) + 'px,0) rotate(' +
      state.rot.toFixed(2) + 'deg)';
  }

  function registerBounce() {
    state.bounces += 1;
    state.lastBounce = {
      t: Math.round(clock()),
      x: Math.round(state.x),
      y: Math.round(state.y),
      vx: Math.round(state.vx),
      vy: Math.round(state.vy)
    };
  }

  function clampBall(reflect) {
    var l = limits();
    var hit = false;
    if (state.x < l.minX) {
      state.x = l.minX;
      if (reflect && state.vx < 0) { state.vx = -state.vx * RESTITUTION; hit = true; }
    } else if (state.x > l.maxX) {
      state.x = l.maxX;
      if (reflect && state.vx > 0) { state.vx = -state.vx * RESTITUTION; hit = true; }
    }
    if (state.y < l.minY) {
      state.y = l.minY;
      if (reflect && state.vy < 0) { state.vy = -state.vy * RESTITUTION; hit = true; }
    } else if (state.y > l.maxY) {
      state.y = l.maxY;
      if (reflect && state.vy > 0) { state.vy = -state.vy * RESTITUTION; hit = true; }
    }
    if (hit) {
      clampSpeed();
      registerBounce();
    }
  }

  function update(dt) {
    var damp = Math.pow(DAMPING, dt);
    state.vx *= damp;
    state.vy *= damp;
    clampSpeed();

    state.x += state.vx * dt;
    state.y += state.vy * dt;

    var l = limits();
    var hit = false;

    if (state.x <= l.minX) {
      state.x = l.minX;
      if (state.vx < 0) {
        state.vx = -state.vx * RESTITUTION;
        state.rotV -= Math.min(90, 12 + Math.abs(state.vy) * 0.1);
        hit = true;
      }
    } else if (state.x >= l.maxX) {
      state.x = l.maxX;
      if (state.vx > 0) {
        state.vx = -state.vx * RESTITUTION;
        state.rotV += Math.min(90, 12 + Math.abs(state.vy) * 0.1);
        hit = true;
      }
    }

    if (state.y <= l.minY) {
      state.y = l.minY;
      if (state.vy < 0) {
        state.vy = -state.vy * RESTITUTION;
        state.rotV += (state.vx >= 0 ? 1 : -1) * Math.min(80, 10 + Math.abs(state.vx) * 0.1);
        hit = true;
      }
    } else if (state.y >= l.maxY) {
      state.y = l.maxY;
      if (state.vy > 0) {
        state.vy = -state.vy * RESTITUTION;
        state.rotV -= (state.vx >= 0 ? 1 : -1) * Math.min(80, 10 + Math.abs(state.vx) * 0.1);
        hit = true;
      }
    }

    if (hit) {
      clampSpeed();
      registerBounce();
    }

    state.rot += (state.rotV + state.vx * 0.075) * dt;
    state.rotV *= Math.pow(0.9, dt);
    if (state.rotV > 160) state.rotV = 160;
    if (state.rotV < -160) state.rotV = -160;
    state.frames += 1;
  }

  function frame(t) {
    state.raf = 0;
    if (!state.running || state.paused || document.hidden || state.reduced) {
      state.last = 0;
      return;
    }
    if (!state.last) state.last = t;
    var dt = (t - state.last) / 1000;
    state.last = t;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    update(dt);
    render();
    state.raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (state.running || state.raf || state.reduced) return;
    if (state.paused || document.hidden) return;
    state.running = true;
    state.last = 0;
    state.raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    state.running = false;
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.last = 0;
  }

  /* ---------- modal / dialog pause ---------- */

  function nodeVisible(el) {
    if (!el || !el.getClientRects) return false;
    if (!el.getClientRects().length) return false;
    var cs = window.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function ariaModalOpen(el) {
    if (!el || !el.getClientRects || !el.getClientRects().length) return false;
    var node = el;
    while (node && node !== document.documentElement) {
      if (node.hasAttribute && node.hasAttribute('hidden')) return false;
      if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return false;
      if (window.getComputedStyle(node).display === 'none') return false;
      node = node.parentElement;
    }
    return true;
  }

  function modalVisible() {
    var i;
    var dialogs = document.querySelectorAll('dialog[open]');
    for (i = 0; i < dialogs.length; i += 1) {
      if (nodeVisible(dialogs[i])) return true;
    }
    var modals = document.querySelectorAll('[aria-modal="true"]');
    for (i = 0; i < modals.length; i += 1) {
      if (ariaModalOpen(modals[i])) return true;
    }
    return false;
  }

  function syncPanelLayers() {
    var groups = document.querySelectorAll('.ab-jobs');
    for (var i = 0; i < groups.length; i += 1) {
      var open = !!groups[i].querySelector('.ab-pop.is-open');
      if (groups[i].classList.contains('panel-over-ball') !== open) {
        groups[i].classList.toggle('panel-over-ball', open);
      }
    }
  }

  function syncPause() {
    syncPanelLayers();
    var modal = modalVisible();
    var hidden = !!document.hidden;
    var hide = modal || hidden;

    host.classList.toggle('is-suspended', hide);
    host.tabIndex = hide ? -1 : 0;

    if (hide || state.reduced) {
      state.paused = true;
      stop();
    } else {
      state.paused = false;
      start();
    }
  }

  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = window.setTimeout(function () {
      syncTimer = 0;
      syncPause();
    }, 40);
  }

  /* ---------- direct interaction ---------- */

  function applyKick(nx, ny, power) {
    var p = Math.min(MAX_SPEED, Math.max(160, power));
    state.vx = nx * p;
    state.vy = ny * p;
    clampSpeed();
    state.lastKick = clock();
    state.rotV += (nx >= 0 ? 1 : -1) * Math.min(70, 14 + p * 0.06);
    clampBall(false);
    render();
  }

  function nudge() {
    host.classList.remove('is-nudge');
    void img.offsetWidth;
    host.classList.add('is-nudge');
    window.clearTimeout(state.nudgeTimer);
    state.nudgeTimer = window.setTimeout(function () {
      host.classList.remove('is-nudge');
    }, 560);
  }

  function blockedTarget(target) {
    if (!target || target.nodeType !== 1 || !target.closest) return false;
    return !!target.closest(
      '.hf-tab, header, dialog, .prj-modal, .prj-modal__panel, .ab-pop, .ab-tip-portal, [role="tooltip"], .ct-modal'
    );
  }

  function kickFromSweep(x0, y0, x1, y1, svx, svy, stamp) {
    var r = state.size * RADIUS_RATIO;
    var cx = state.x + state.size / 2;
    var cy = state.y + state.size / 2;
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len2 = dx * dx + dy * dy;
    var segT = len2 > 0 ? ((cx - x0) * dx + (cy - y0) * dy) / len2 : 0;
    if (segT < 0) segT = 0;
    if (segT > 1) segT = 1;
    var px = x0 + dx * segT;
    var py = y0 + dy * segT;
    var ox = cx - px;
    var oy = cy - py;
    var dist = Math.sqrt(ox * ox + oy * oy);
    if (dist > r + 2) return false;
    if (stamp - state.lastKick < KICK_COOLDOWN) return false;

    var nx;
    var ny;
    if (dist > 0.6) {
      nx = ox / dist;
      ny = oy / dist;
    } else {
      var csp = Math.sqrt(svx * svx + svy * svy);
      if (csp < 30) return false;
      nx = svx / csp;
      ny = svy / csp;
    }

    var cspeed = Math.sqrt(svx * svx + svy * svy);
    var power = Math.min(MAX_SPEED, Math.max(200, cspeed * 0.62 + 150));
    var dirx = cspeed > 0.001 ? svx / cspeed : nx;
    var diry = cspeed > 0.001 ? svy / cspeed : ny;
    var headOn = 1 - Math.min(1, dist / r);
    var nw = 0.68 * (1 - headOn * 0.62);
    var cw = 0.38 + headOn * 0.3;
    state.vx = nx * power * nw + dirx * power * cw + svx * 0.1;
    state.vy = ny * power * nw + diry * power * cw + svy * 0.1;
    clampSpeed();

    var l = limits();
    state.x = px + nx * (r + 3) - state.size / 2;
    state.y = py + ny * (r + 3) - state.size / 2;
    if (state.x < l.minX) state.x = l.minX;
    if (state.x > l.maxX) state.x = l.maxX;
    if (state.y < l.minY) state.y = l.minY;
    if (state.y > l.maxY) state.y = l.maxY;

    state.lastKick = stamp;
    state.rotV += (nx >= 0 ? 1 : -1) * Math.min(80, 12 + cspeed * 0.05);
    render();
    return true;
  }

  function sweepSample(x0, y0, x1, y1, svx, svy, stamp) {
    if (x0 === x1 && y0 === y1) return;
    kickFromSweep(x0, y0, x1, y1, svx, svy, stamp);
  }

  function onPointerMove(event) {
    if (state.reduced || state.paused || document.hidden) {
      cursor.has = false;
      return;
    }
    if (modalVisible()) {
      cursor.has = false;
      return;
    }
    if (blockedTarget(event.target)) {
      cursor.has = false;
      return;
    }

    var samples = [];
    if (event.getCoalescedEvents) {
      try {
        samples = event.getCoalescedEvents() || [];
      } catch (error) {
        samples = [];
      }
    }
    if (!samples.length) samples = [event];
    else {
      var last = samples[samples.length - 1];
      if (!last || last.clientX !== event.clientX || last.clientY !== event.clientY) {
        samples.push(event);
      }
    }

    var fallback = event.timeStamp || clock();

    for (var i = 0; i < samples.length; i += 1) {
      var p = samples[i];
      var x = p.clientX;
      var y = p.clientY;
      var t = p.timeStamp || fallback;

      if (!cursor.has) {
        cursor.has = true;
        cursor.x = x;
        cursor.y = y;
        cursor.t = t;
        cursor.vx = 0;
        cursor.vy = 0;
        continue;
      }

      var dt = (t - cursor.t) / 1000;
      if (dt <= 0.0001) {
        cursor.x = x;
        cursor.y = y;
        cursor.t = t;
        continue;
      }

      var svx = (x - cursor.x) / dt;
      var svy = (y - cursor.y) / dt;
      var cspeed = Math.sqrt(svx * svx + svy * svy);
      if (cspeed > 2600) {
        var k = 2600 / cspeed;
        svx *= k;
        svy *= k;
      }

      cursor.vx = svx;
      cursor.vy = svy;
      sweepSample(cursor.x, cursor.y, x, y, svx, svy, t);

      cursor.x = x;
      cursor.y = y;
      cursor.t = t;
    }
  }

  img.addEventListener('pointerdown', function (event) {
    if (modalVisible() || document.hidden) return;
    if (state.reduced) {
      nudge();
      return;
    }
    if (event.pointerType === 'touch') {
      cursor.has = true;
      cursor.x = event.clientX;
      cursor.y = event.clientY;
      cursor.t = event.timeStamp || clock();
      cursor.vx = 0;
      cursor.vy = 0;
      touchTap = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        t: clock()
      };
      return;
    }

    var cx = state.x + state.size / 2;
    var cy = state.y + state.size / 2;
    var nx = cx - event.clientX;
    var ny = cy - event.clientY;
    var dist = Math.sqrt(nx * nx + ny * ny);
    if (dist < 1) {
      nx = 0;
      ny = -1;
      dist = 1;
    }
    applyKick(nx / dist, ny / dist, 360 + Math.min(160, speed() * 0.2));
  }, { passive: true });

  img.addEventListener('pointerup', function (event) {
    if (!touchTap || event.pointerId !== touchTap.id) return;
    var elapsed = clock() - touchTap.t;
    var dx = event.clientX - touchTap.x;
    var dy = event.clientY - touchTap.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var tap = touchTap;
    touchTap = null;

    if (state.reduced) {
      nudge();
      return;
    }
    if (elapsed > 380 || dist > 12) return;

    var cx = state.x + state.size / 2;
    var cy = state.y + state.size / 2;
    var nx = cx - tap.x;
    var ny = cy - tap.y;
    var d = Math.sqrt(nx * nx + ny * ny);
    if (d < 1) {
      nx = 0;
      ny = -1;
      d = 1;
    }
    applyKick(nx / d, ny / d, 330);
  }, { passive: true });

  img.addEventListener('pointercancel', function () {
    touchTap = null;
  }, { passive: true });

  host.addEventListener('keydown', function (event) {
    if (event.key !== ' ' && event.key !== 'Spacebar' && event.key !== 'Enter') return;
    if (event.repeat) return;
    event.preventDefault();
    if (state.reduced) {
      nudge();
      return;
    }
    var sp = speed();
    var nx = sp > 0.01 ? state.vx / sp : -1;
    var ny = sp > 0.01 ? state.vy / sp : -0.4;
    if (sp <= 0.01) {
      var n = Math.sqrt(nx * nx + ny * ny);
      nx /= n;
      ny /= n;
    }
    applyKick(nx, ny, 330);
  });

  host.addEventListener('focus', function () {
    if (state.reduced) nudge();
  });

  /* ---------- placement / resize / reduced motion ---------- */

  function placeInitial() {
    measure();
    var l = limits();
    if (state.reduced) {
      state.x = l.maxX;
      state.y = l.maxY;
      state.vx = 0;
      state.vy = 0;
      state.rot = 0;
      state.rotV = 0;
      render();
      return;
    }
    var narrow = l.w < 720;
    state.x = Math.min(l.maxX, Math.round(l.w * (narrow ? 0.58 : 0.66)));
    state.y = Math.min(l.maxY, Math.round(l.h * (narrow ? 0.86 : 0.62)));
    var angle = -0.42;
    var sp = 118;
    state.vx = Math.cos(angle) * sp;
    state.vy = Math.sin(angle) * sp;
    state.rot = 0;
    state.rotV = 0;
    render();
  }

  function onViewportChange() {
    measure();
    if (state.reduced) {
      var l = limits();
      state.x = l.maxX;
      state.y = l.maxY;
      state.rot = 0;
      state.rotV = 0;
      render();
      return;
    }
    clampBall(false);
    render();
  }

  function onReducedChange() {
    var reduced = !!(reduceMq && reduceMq.matches);
    state.reduced = reduced;
    if (reduced) {
      stop();
      state.vx = 0;
      state.vy = 0;
      state.rot = 0;
      state.rotV = 0;
      onViewportChange();
    } else {
      measure();
      var sp = speed();
      if (sp < 0.01) {
        state.vx = Math.cos(-0.42) * 118;
        state.vy = Math.sin(-0.42) * 118;
      }
      syncPause();
    }
    syncPause();
  }

  /* ---------- boot ---------- */

  measure();
  placeInitial();
  if (!state.reduced) start();
  syncPause();

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', function (event) {
    if (!event.target || event.target !== img) cursor.has = false;
  }, { passive: true });
  window.addEventListener('pointerout', function (event) {
    if (!event.relatedTarget) cursor.has = false;
  }, { passive: true });
  window.addEventListener('blur', function () {
    cursor.has = false;
  });

  window.addEventListener('resize', onViewportChange, { passive: true });
  window.addEventListener('orientationchange', onViewportChange, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange, { passive: true });
  }

  document.addEventListener('visibilitychange', syncPause);

  if (window.MutationObserver) {
    new MutationObserver(scheduleSync).observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ['open', 'aria-modal', 'class', 'hidden']
    });
  }

  if (reduceMq) {
    if (reduceMq.addEventListener) reduceMq.addEventListener('change', onReducedChange);
    else if (reduceMq.addListener) reduceMq.addListener(onReducedChange);
  }

  try {
    Object.defineProperty(window, '__playBall', {
      configurable: true,
      value: {
        getState: function () {
          return {
            x: +state.x.toFixed(2),
            y: +state.y.toFixed(2),
            vx: +state.vx.toFixed(2),
            vy: +state.vy.toFixed(2),
            speed: +speed().toFixed(2),
            rot: +state.rot.toFixed(2),
            size: +state.size.toFixed(2),
            running: state.running,
            paused: state.paused,
            reduced: state.reduced,
            raf: state.raf,
            frames: state.frames,
            bounces: state.bounces,
            lastBounce: state.lastBounce
          };
        },
        getBounds: limits,
        kick: function (nx, ny, power) {
          var n = Math.sqrt(nx * nx + ny * ny) || 1;
          applyKick(nx / n, ny / n, power || 320);
        }
      }
    });
  } catch (error) {
    /* non-critical debug hook */
  }
})();
