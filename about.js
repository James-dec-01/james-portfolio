(function () {
  'use strict';

  var section = document.getElementById('about');
  if (!section) return;

  var card = section.querySelector('[data-ab-card]');
  var leftZone = section.querySelector('.ab-left');
  var jobEls = Array.prototype.slice.call(section.querySelectorAll('[data-ab-job]'));
  var nodes = jobEls.map(function (job) { return job.querySelector('[data-ab-job-btn]'); });
  var pop = section.querySelector('[data-ab-pop]');
  var bodies = pop ? Array.prototype.slice.call(pop.querySelectorAll('[data-ab-body]')) : [];
  var jobsEl = section.querySelector('[data-ab-jobs]');
  var pinEl = jobsEl ? jobsEl.querySelector('[data-ab-pin]') : null;
  var roomEl = jobsEl ? jobsEl.querySelector('[data-ab-room]') : null;
  var trackRow = section.querySelector('[data-ab-row]');

  var reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var hoverMq = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  var narrowMq = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;

  var reduced = !!(reduceMq && reduceMq.matches);
  var canHover = !!(hoverMq && hoverMq.matches);
  var narrow = !!(narrowMq && narrowMq.matches);

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  /* ---------------- design unit (scrollbar safe) ---------------- */
  var unitRaf = 0;
  var lastUnitW = -1;

  function sizeUnit() {
    unitRaf = 0;
    var w = section.clientWidth || (inner && inner.clientWidth) || 0;
    if (!w) return;
    var changed = Math.abs(w - lastUnitW) > 0.5;
    lastUnitW = w;
    if (w > 900) {
      section.style.setProperty('--u', (Math.min(w, 1568) / 1568).toFixed(5) + 'px');
    } else {
      section.style.removeProperty('--u');
    }
    if (changed) {
      measurePanel();
      queuePinMeasure();
    }
  }

  function queueUnit() {
    if (unitRaf) return;
    unitRaf = requestAnimationFrame(sizeUnit);
  }
  sizeUnit();

  /* ---------------- card: hover / focus / tap ---------------- */
  var hoverOn = false;
  var focusOn = false;
  var tapOn = false;

  function syncCard() {
    if (!card) return;
    var on = hoverOn || focusOn || tapOn;
    card.classList.toggle('is-live', on);
    card.setAttribute('aria-pressed', String(on));
  }

  if (card) {
    card.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        hoverOn = true;
        syncCard();
      }
    });
    card.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        if (!leftZone || !leftZone.matches(':hover')) {
          hoverOn = false;
          syncCard();
        }
      }
    });
    if (leftZone) {
      leftZone.addEventListener('pointerenter', function (event) {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        hoverOn = true;
        syncCard();
      });
      leftZone.addEventListener('pointerleave', function (event) {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        hoverOn = false;
        syncCard();
      });
    }
    card.addEventListener('focus', function () {
      requestAnimationFrame(function () {
        if (card.matches(':focus-visible')) {
          focusOn = true;
          syncCard();
        }
      });
    });
    card.addEventListener('blur', function () {
      if (!focusOn) return;
      focusOn = false;
      syncCard();
    });
    card.addEventListener('click', function (event) {
      if (canHover && !narrow) return;
      event.preventDefault();
      tapOn = !tapOn;
      syncCard();
    });
    card.addEventListener('keydown', function (event) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        tapOn = !tapOn;
        syncCard();
      }
    });
    document.addEventListener('pointerdown', function (event) {
      if (!tapOn) return;
      if (!card.contains(event.target)) {
        tapOn = false;
        syncCard();
      }
    }, true);
  }

  /* ---------------- photo parallax inside the window ---------------- */
  var tilt = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
  var MAX_TILT = 5.5;

  function applyTilt() {
    if (!card) return;
    card.style.setProperty('--ab-rx', tilt.x.toFixed(2) + 'deg');
    card.style.setProperty('--ab-ry', tilt.y.toFixed(2) + 'deg');
  }

  function tiltStep() {
    var dx = tilt.tx - tilt.x;
    var dy = tilt.ty - tilt.y;
    if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) {
      tilt.x = tilt.tx;
      tilt.y = tilt.ty;
      applyTilt();
      tilt.raf = 0;
      return;
    }
    tilt.x += dx * 0.16;
    tilt.y += dy * 0.16;
    applyTilt();
    tilt.raf = requestAnimationFrame(tiltStep);
  }

  function runTilt() {
    if (!tilt.raf) tilt.raf = requestAnimationFrame(tiltStep);
  }

  function pointTilt(event) {
    if (!card || reduced || !canHover) return;
    var r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var nx = clamp(((event.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    var ny = clamp(((event.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    tilt.tx = ny * MAX_TILT;
    tilt.ty = -nx * MAX_TILT;
    card.style.setProperty('--ab-mx', (50 + nx * 46).toFixed(1) + '%');
    card.style.setProperty('--ab-my', (50 + ny * 46).toFixed(1) + '%');
    card.style.setProperty('--ab-sheen', '1');
    runTilt();
  }

  function restTilt() {
    tilt.tx = 0;
    tilt.ty = 0;
    if (card) card.style.setProperty('--ab-sheen', '0');
    runTilt();
  }

  if (card && canHover) {
    card.addEventListener('pointermove', pointTilt);
    card.addEventListener('pointerenter', pointTilt);
    card.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'touch') return;
      restTilt();
    });
  }
  applyTilt();

  /* ---------------- internship timeline: shared flow panel ---------------- */
  var openIndex = -1;
  var closeTimer = 0;
  var pinned = false;
  var panelClose = pop ? pop.querySelector('[data-ab-pop-close]') : null;

  function triangle(index) {
    if (!pop || !nodes[index]) return;
    var pr = pop.getBoundingClientRect();
    var nr = nodes[index].getBoundingClientRect();
    pop.style.setProperty('--ab-tri', (nr.left + nr.width / 2 - pr.left).toFixed(1) + 'px');
  }

  function showBody(index) {
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].hidden = i !== index;
    }
  }

  /* The panel lives in the normal flow below the row and reserves its
     tallest body, so nothing jumps; it is then lifted by the caption
     height so its top edge sits 20px under the logos. */
  function measureRise() {
    if (!pop) return;
    var row = section.querySelector('[data-ab-row]');
    var logo = jobEls.length ? jobEls[0].querySelector('.ab-job__logo') : null;
    if (!row || !logo) return;
    var rise = row.offsetHeight - logo.offsetHeight;
    /* the active logo scales 1.152 around its centre, so its visible
       bottom is ~9.5px lower; keep the panel 20px under that edge */
    rise -= logo.offsetHeight * 0.076;
    pop.style.setProperty('--ab-rise', (rise > 0 ? rise : 0) + 'px');
  }

  function measurePanel() {
    if (!pop || !bodies.length) return;
    measureRise();
    if (narrow) {
      pop.style.removeProperty('--ab-panel-h');
      return;
    }
    var prev = openIndex;
    pop.style.setProperty('--ab-panel-h', '0px');
    var max = 0;
    for (var i = 0; i < bodies.length; i++) {
      for (var j = 0; j < bodies.length; j++) bodies[j].hidden = j !== i;
      var h = pop.getBoundingClientRect().height;
      if (h > max) max = h;
    }
    for (var k = 0; k < bodies.length; k++) bodies[k].hidden = k !== prev;
    if (max > 0) pop.style.setProperty('--ab-panel-h', Math.ceil(max) + 'px');
    else pop.style.removeProperty('--ab-panel-h');
  }

  /* ---------------- internship sticky scrub ----------------
     Native position:sticky only. The scene keeps its normal height and
     the extra room below the stage is the scrub distance; scrolling
     advances p 0 -> 1, which slides the three-logo row from "NetEase
     on the right" to the final left/centre/right order. Nothing here
     cancels wheel or touch scrolling, and the page never calls
     scrollTo() to fake a lock. */
  var pinRaf = 0;
  var pinState = { on: false, start: 0, extra: 1, p: -1, top: 0 };

  function pinExtra(vh) {
    return narrow
      ? clamp(300, Math.round(vh * 0.5), 450)
      : clamp(600, Math.round(vh * 0.8), 850);
  }

  function paintScrub(p, force) {
    if (!trackRow) return;
    if (!force && Math.abs(p - pinState.p) < 0.0004) {
      if (openIndex >= 0) triangle(openIndex);
      return;
    }
    pinState.p = p;
    var shift = (1 - p) * (200 / 3);
    trackRow.style.transform = 'translate3d(' + shift.toFixed(3) + '%,0,0)';
    if (openIndex >= 0) triangle(openIndex);
  }

  function scrubApply() {
    if (!pinState.on) return;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    jobsEl.classList.toggle(
      'is-holding',
      y >= pinState.start && y <= pinState.start + pinState.extra + 1
    );
    var p = (y - pinState.start) / pinState.extra;
    paintScrub(p < 0 ? 0 : p > 1 ? 1 : p, false);
  }

  function scheduleScrub() {
    if (!pinState.on || pinRaf) return;
    pinRaf = requestAnimationFrame(function () {
      pinRaf = 0;
      scrubApply();
    });
  }

  function pinMeasure() {
    if (!jobsEl || !pinEl) return;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;

    /* flow-root makes the stage's auto height match its visible box:
       the panel's lifted empty tail is contained instead of extending
       the sticky box, so releasing the pin adds no extra blank */
    pinEl.style.removeProperty('height');
    var stageH = pinEl.offsetHeight;
    var top = vh - stageH - 24;
    if (narrow && top < 0) top = 0;
    var minTop = narrow ? 0 : 88;
    var canPin = !reduced && vh >= 600 && stageH > 0 && top >= minTop;

    if (!canPin) {
      jobsEl.classList.remove('is-scene');
      jobsEl.classList.add('is-static');
      jobsEl.classList.remove('is-holding');
      jobsEl.style.removeProperty('--ab-room-h');
      jobsEl.style.removeProperty('--ab-pin-top');
      pinState.on = false;
      pinState.p = 1;
      if (trackRow) trackRow.style.transform = '';
      return;
    }

    var extra = pinExtra(vh);
    jobsEl.classList.remove('is-static');
    jobsEl.classList.add('is-scene');
    jobsEl.style.setProperty('--ab-pin-top', top.toFixed(1) + 'px');
    jobsEl.style.setProperty('--ab-room-h', extra + 'px');

    /* one layout read per measure, never per scroll frame */
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var sceneTop = jobsEl.getBoundingClientRect().top + y;
    pinState.on = true;
    pinState.top = top;
    pinState.extra = extra;
    pinState.start = sceneTop - top;
    pinState.vh = vh;
    pinState.p = -1;
    var p = (y - pinState.start) / extra;
    paintScrub(p < 0 ? 0 : p > 1 ? 1 : p, true);
    jobsEl.classList.toggle(
      'is-holding',
      y >= pinState.start && y <= pinState.start + extra + 1
    );
  }

  var pinMeasureRaf = 0;

  function queuePinMeasure() {
    if (pinMeasureRaf) return;
    pinMeasureRaf = requestAnimationFrame(function () {
      pinMeasureRaf = 0;
      pinMeasure();
    });
  }

  window.addEventListener('scroll', scheduleScrub, { passive: true });

  function openJob(index) {
    clearTimeout(closeTimer);
    pinned = false;
    if (openIndex === index) {
      triangle(index);
      return;
    }
    for (var i = 0; i < jobEls.length; i++) {
      var on = i === index;
      jobEls[i].classList.toggle('is-on', on);
      nodes[i].setAttribute('aria-expanded', String(on));
    }
    openIndex = index;
    showBody(index);
    pop.classList.add('is-open');
    pop.setAttribute('aria-hidden', 'false');
    triangle(index);
  }

  function closePanel() {
    clearTimeout(closeTimer);
    pinned = false;
    if (openIndex < 0) return;
    jobEls[openIndex].classList.remove('is-on');
    nodes[openIndex].setAttribute('aria-expanded', 'false');
    openIndex = -1;
    showBody(-1);
    pop.classList.remove('is-open');
    pop.setAttribute('aria-hidden', 'true');
  }

  function scheduleClose(delay) {
    if (pinned) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (!pinned) closePanel();
    }, delay);
  }

  if (pop) {
    jobEls.forEach(function (job, index) {
      job.addEventListener('pointerenter', function (event) {
        if (event.pointerType === 'touch') return;
        openJob(index);
      });
      job.addEventListener('pointerleave', function (event) {
        if (event.pointerType === 'touch') return;
        scheduleClose(240);
      });
      job.addEventListener('focusin', function (event) {
        if (event.target.matches && !event.target.matches(':focus-visible')) return;
        openJob(index);
      });
      job.addEventListener('focusout', function (event) {
        if (!job.contains(event.relatedTarget)) scheduleClose(120);
      });
      nodes[index].addEventListener('click', function (event) {
        if (canHover && !narrow) return;
        event.preventDefault();
        var wasOpen = openIndex === index;
        if (wasOpen) {
          closePanel();
        } else {
          openJob(index);
          pinned = true;
        }
      });
    });

    if (panelClose) {
      panelClose.addEventListener('click', function (event) {
        event.preventDefault();
        closePanel();
      });
    }

    pop.addEventListener('pointerenter', function () {
      clearTimeout(closeTimer);
    });
    pop.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'touch') return;
      scheduleClose(220);
    });
    pop.addEventListener('click', function (event) {
      if (narrow) return;
      event.stopPropagation();
    });

    document.addEventListener('pointerdown', function (event) {
      if (openIndex < 0) return;
      if (jobEls[openIndex].contains(event.target) || pop.contains(event.target)) return;
      closePanel();
    }, true);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && openIndex >= 0) {
        closePanel();
      }
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        measurePanel();
        pinMeasure();
        if (openIndex >= 0) triangle(openIndex);
      });
    }
  }

  /* ---------------- viewport changes ---------------- */
  var resizeRaf = 0;

  function onResize() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      sizeUnit();
      measurePanel();
      pinMeasure();
      if (openIndex >= 0) triangle(openIndex);
    });
  }

  function refresh() {
    reduced = !!(reduceMq && reduceMq.matches);
    canHover = !!(hoverMq && hoverMq.matches);
    narrow = !!(narrowMq && narrowMq.matches);
    closePanel();
    tipClose(true);
    restTilt();
    sizeUnit();
    measurePanel();
    pinMeasure();
  }

  window.addEventListener('resize', onResize, { passive: true });

  if (window.ResizeObserver) {
    var sizeObserver = new ResizeObserver(queueUnit);
    sizeObserver.observe(section);
  }

  if (reduceMq) {
    if (reduceMq.addEventListener) reduceMq.addEventListener('change', refresh);
    else if (reduceMq.addListener) reduceMq.addListener(refresh);
  }
  if (hoverMq) {
    if (hoverMq.addEventListener) hoverMq.addEventListener('change', refresh);
    else if (hoverMq.addListener) hoverMq.addListener(refresh);
  }
  if (narrowMq) {
    if (narrowMq.addEventListener) narrowMq.addEventListener('change', refresh);
    else if (narrowMq.addListener) narrowMq.addListener(refresh);
  }

  /* ---------------- shared portal tooltip ----------------
     One tooltip node lives on <body> (top layer when supported), so
     the tilted photo card, the reveal mask and any ancestor stacking
     context can never cover or clip it. Position follows the trigger
     rect, clamps inside the viewport, and keeps a 12px gap + arrow. */
  var pills = Array.prototype.slice.call(section.querySelectorAll('.ab-pill'));
  var tipPortal = null;
  var tipPill = null;
  var tipPinned = false;
  var tipShowTimer = 0;
  var tipHideTimer = 0;
  var tipPopoverTimer = 0;
  var tipRaf = 0;
  var tipPopover = false;
  var tipDescEl = null;
  var pillData = [];
  var coarseMq = window.matchMedia ? window.matchMedia('(hover: none), (pointer: coarse)') : null;

  function tipPlace() {
    tipRaf = 0;
    if (!tipPortal || !tipPill) return;
    var rect = tipPill.getBoundingClientRect();
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var pw = tipPortal.offsetWidth;
    var ph = tipPortal.offsetHeight;
    var gap = 10;
    var pad = 10;
    var topPad = 58;
    var left = clamp(rect.left + rect.width / 2 - pw / 2, pad, Math.max(pad, vw - pw - pad));
    var above = rect.top - gap - ph;
    var belowTop = rect.bottom + gap;
    var below = false;

    if (above < topPad) {
      below = true;
      if (belowTop + ph > vh - pad) {
        var spaceAbove = rect.top - topPad;
        var spaceBelow = vh - rect.bottom - pad;
        below = spaceBelow > spaceAbove;
      }
    }

    var top = below ? belowTop : above;
    top = clamp(top, topPad, Math.max(topPad, vh - ph - pad));

    tipPortal.classList.toggle('is-below', below);
    var arrow = clamp(rect.left + rect.width / 2 - left, 18, Math.max(18, pw - 18));
    tipPortal.style.setProperty('--ab-arrow-x', arrow.toFixed(1) + 'px');
    tipPortal.style.transform = 'translate3d(' + left.toFixed(2) + 'px,' + top.toFixed(2) + 'px,0)';
  }

  function tipQueuePlace() {
    if (!tipPill || tipRaf) return;
    tipRaf = requestAnimationFrame(tipPlace);
  }

  function tipFill(data) {
    tipDescEl.textContent = data.desc;
  }

  function tipShow(pill, pin) {
    if (!tipPortal) return;
    var data = null;
    for (var i = 0; i < pillData.length; i++) {
      if (pillData[i].el === pill) {
        data = pillData[i];
        break;
      }
    }
    if (!data) return;

    window.clearTimeout(tipShowTimer);
    window.clearTimeout(tipHideTimer);
    window.clearTimeout(tipPopoverTimer);

    if (tipPill && tipPill !== pill) {
      tipPill.setAttribute('aria-expanded', 'false');
      tipPill.classList.remove('is-active');
      if (tipPill.parentNode) tipPill.parentNode.classList.remove('is-pill-open');
    }

    tipPill = pill;
    tipPinned = !!pin;
    pill.classList.add('is-active');
    if (pill.parentNode) pill.parentNode.classList.add('is-pill-open');

    tipFill(data);

    tipPortal.style.transform = 'translate3d(-9999px, 0, 0)';
    tipPortal.setAttribute('aria-hidden', 'false');

    if (tipPopover) {
      if (!tipPortal.matches(':popover-open')) {
        try {
          tipPortal.showPopover();
        } catch (error) {
          tipPopupFallback();
        }
      }
    }

    /* flush the new content before measuring so the panel never
       jumps between its closed and placed positions */
    void tipPortal.offsetWidth;
    tipPlace();
    pill.setAttribute('aria-expanded', 'true');

    if (tipPopover) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (tipPill === pill) tipPortal.classList.add('is-open');
        });
      });
    } else {
      tipPortal.classList.add('is-open');
    }
  }

  function tipClose(force) {
    if (!tipPortal || !tipPill) return;
    if (tipPinned && !force) return;
    window.clearTimeout(tipShowTimer);
    window.clearTimeout(tipHideTimer);
    window.clearTimeout(tipPopoverTimer);

    var pill = tipPill;
    pill.setAttribute('aria-expanded', 'false');
    pill.classList.remove('is-active');
    if (pill.parentNode) pill.parentNode.classList.remove('is-pill-open');
    tipPill = null;
    tipPinned = false;
    tipPortal.classList.remove('is-open');
    tipPortal.setAttribute('aria-hidden', 'true');

    var wait = reduced ? 0 : 200;
    if (tipPopover) {
      tipPopoverTimer = window.setTimeout(function () {
        if (tipPill) return;
        try {
          if (tipPortal.matches(':popover-open')) tipPortal.hidePopover();
        } catch (error) { /* ignore */ }
        tipPortal.classList.remove('is-below');
      }, wait);
    } else {
      tipPopoverTimer = window.setTimeout(function () {
        if (!tipPill) tipPortal.classList.remove('is-below');
      }, wait);
    }
  }

  function tipPopupFallback() {
    tipPopover = false;
    tipPortal.removeAttribute('popover');
  }

  function tipScheduleShow(pill) {
    window.clearTimeout(tipHideTimer);
    window.clearTimeout(tipShowTimer);
    tipShowTimer = window.setTimeout(function () { tipShow(pill, false); }, 40);
  }

  function tipScheduleHide() {
    if (tipPinned) return;
    window.clearTimeout(tipShowTimer);
    window.clearTimeout(tipHideTimer);
    tipHideTimer = window.setTimeout(function () { tipClose(false); }, 100);
  }

  if (pills.length) {
    tipPortal = document.createElement('div');
    tipPortal.className = 'ab-tip-portal';
    tipPortal.id = 'ab-tip-portal';
    tipPortal.setAttribute('role', 'tooltip');
    tipPortal.setAttribute('aria-hidden', 'true');
    tipPopover = 'popover' in tipPortal && typeof tipPortal.showPopover === 'function';
    if (tipPopover) tipPortal.setAttribute('popover', 'manual');

    var inner = document.createElement('div');
    inner.className = 'ab-tip-portal__inner';

    tipDescEl = document.createElement('p');
    tipDescEl.className = 'ab-tip-portal__desc';

    inner.appendChild(tipDescEl);
    tipPortal.appendChild(inner);
    document.body.appendChild(tipPortal);

    pills.forEach(function (pill) {
      var described = pill.getAttribute('aria-describedby') || '';
      var source = described ? document.getElementById(described) : null;
      var text = source ? source.textContent.trim() : (pill.getAttribute('data-tip') || '');
      var raw = pill.textContent.replace(/\s+/g, ' ').trim();
      var match = raw.match(/^(.*?)(\d+)\s*(\+)?$/);
      var label = match ? match[1].trim() : raw;
      var num = match ? match[2] : '';
      var plus = match ? (match[3] || '') : '';

      if (source && source.parentNode) source.parentNode.removeChild(source);

      pillData.push({
        el: pill,
        label: label,
        num: num,
        plus: plus,
        desc: text
      });

      /* split the visible label so the figure can be emphasised
         without changing the accessible name of the button */
      pill.textContent = '';
      var labelEl = document.createElement('span');
      labelEl.className = 'ab-pill__label';
      labelEl.setAttribute('aria-hidden', 'true');
      labelEl.textContent = label;
      pill.appendChild(labelEl);
      if (num) {
        var numEl = document.createElement('span');
        numEl.className = 'ab-pill__num';
        numEl.setAttribute('aria-hidden', 'true');
        numEl.textContent = num;
        pill.appendChild(numEl);
      }
      if (plus) {
        var plusEl = document.createElement('span');
        plusEl.className = 'ab-pill__plus';
        plusEl.setAttribute('aria-hidden', 'true');
        plusEl.textContent = plus;
        pill.appendChild(plusEl);
      }
      pill.setAttribute('aria-label', label + num + plus);
      pill.setAttribute('aria-describedby', tipPortal.id);
      pill.setAttribute('aria-controls', tipPortal.id);
      pill.setAttribute('aria-expanded', 'false');

      pill.addEventListener('pointerenter', function (event) {
        if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        if (coarseMq && coarseMq.matches) return;
        if (tipPinned && tipPill === pill) return;
        tipScheduleShow(pill);
      });

      pill.addEventListener('pointerleave', function (event) {
        if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        tipScheduleHide();
      });

      pill.addEventListener('focus', function () {
        if (coarseMq && coarseMq.matches) return;
        tipShow(pill, false);
      });

      pill.addEventListener('blur', function () {
        tipScheduleHide();
      });

      pill.addEventListener('click', function (event) {
        event.preventDefault();
        if (tipPill === pill && tipPinned) tipClose(true);
        else tipShow(pill, true);
      });
    });

    tipPortal.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'touch') return;
      window.clearTimeout(tipHideTimer);
    });

    tipPortal.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'touch') return;
      tipScheduleHide();
    });

    document.addEventListener('pointerdown', function (event) {
      if (!tipPill) return;
      if (tipPill.contains(event.target) || tipPortal.contains(event.target)) return;
      tipClose(true);
    }, true);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && tipPill) {
        tipClose(true);
      }
    });

    window.addEventListener('scroll', tipQueuePlace, { passive: true });
    window.addEventListener('resize', tipQueuePlace, { passive: true });
  }

  measurePanel();
  pinMeasure();
})();
