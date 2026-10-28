/* ============================================================
   CONTACT — clean static portrait, 2D gaze, contact dialog
   Gaze = four transparent eye-band layers cut from the clean
   portrait itself; the iris/pupil is moved 4-5 source px inside
   a feathered sclera fill, so the body never moves and no video
   frame is decoded or reused.
   ============================================================ */

(function () {
  'use strict';

  var section = document.getElementById('contact');
  if (!section || section.getAttribute('data-ct-init') === '1') return;
  section.setAttribute('data-ct-init', '1');

  var figure = section.querySelector('[data-ct-figure]');
  var tilt = section.querySelector('[data-ct-tilt]');
  var baseImg = tilt ? tilt.querySelector('.ct-figure__img') : null;
  var cta = document.getElementById('contact-button');
  var dialog = document.getElementById('contact-dialog');
  var reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var QR = 'contact-assets/wechat-qr.png';
  var GAZE = {
    left: 'contact-assets/contact-gaze-left.webp',
    right: 'contact-assets/contact-gaze-right.webp',
    up: 'contact-assets/contact-gaze-up.webp',
    down: 'contact-assets/contact-gaze-down.webp'
  };

  function isReduced() {
    return !!(reducedQuery && reducedQuery.matches);
  }

  /* ---------- neutralise the old clickable figure ---------- */

  function prepareFigure() {
    if (!figure) return;
    var holder = figure.querySelector('.ct-figure__btn');

    if (holder && holder.tagName === 'BUTTON') {
      var replacement = document.createElement('div');
      replacement.className = holder.className;
      replacement.removeAttribute('style');
      while (holder.firstChild) replacement.appendChild(holder.firstChild);
      holder.parentNode.replaceChild(replacement, holder);
      holder = replacement;
    }

    if (holder) {
      ['role', 'tabindex', 'aria-haspopup', 'aria-label', 'onclick', 'onkeydown', 'onkeyup', 'onpointerdown']
        .forEach(function (name) { holder.removeAttribute(name); });
    }

    var hint = figure.querySelector('.ct-figure__hint');
    if (hint && hint.parentNode) hint.parentNode.removeChild(hint);

    var glow = figure.querySelector('.ct-figure__glow');
    if (glow && glow.parentNode) glow.parentNode.removeChild(glow);
  }

  prepareFigure();

  /* ---------- real-frame gaze ---------- */

  var gazeCurrent = '';
  var gazeFrame = 0;
  var gazePoint = null;
  var coarseQuery = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;

  function gazeAllowed() {
    if (isReduced()) return false;
    if (coarseQuery && coarseQuery.matches) return false;
    return window.innerWidth > 760;
  }

  function buildGaze() {
    if (!tilt || tilt.querySelector('.ct-gaze__layer')) return;
    Object.keys(GAZE).forEach(function (dir) {
      var img = document.createElement('img');
      img.className = 'ct-gaze__layer';
      img.setAttribute('data-dir', dir);
      img.setAttribute('aria-hidden', 'true');
      img.setAttribute('alt', '');
      img.setAttribute('width', '1534');
      img.setAttribute('height', '894');
      img.setAttribute('draggable', 'false');
      img.setAttribute('decoding', 'async');
      img.src = GAZE[dir];
      tilt.appendChild(img);
      if (img.decode) img.decode().catch(function () { /* first paint will decode */ });
    });
  }

  function setGaze(dir) {
    if (!figure) return;
    var next = dir && GAZE[dir] ? dir : '';
    if (next === gazeCurrent) return;
    gazeCurrent = next;
    if (next) figure.setAttribute('data-gaze', next);
    else figure.removeAttribute('data-gaze');
  }

  function gazeOrigin() {
    var rect = baseImg.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.4756,
      y: rect.top + rect.height * 0.3298
    };
  }

  function pickGaze() {
    gazeFrame = 0;
    if (!gazePoint) return;
    var origin = gazeOrigin();
    var dx = gazePoint.x - origin.x;
    var dy = gazePoint.y - origin.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      setGaze('');
      return;
    }
    if (Math.abs(dx) >= Math.abs(dy)) setGaze(dx > 0 ? 'right' : 'left');
    else setGaze(dy > 0 ? 'down' : 'up');
  }

  if (baseImg && tilt) {
    if (gazeAllowed()) buildGaze();

    section.addEventListener('pointermove', function (event) {
      if (!gazeAllowed() || event.pointerType === 'touch') {
        gazePoint = null;
        setGaze('');
        return;
      }
      if (!tilt.querySelector('.ct-gaze__layer')) buildGaze();
      gazePoint = { x: event.clientX, y: event.clientY };
      if (!gazeFrame) gazeFrame = window.requestAnimationFrame(pickGaze);
    }, { passive: true });

    section.addEventListener('pointerleave', function () {
      gazePoint = null;
      setGaze('');
    });

    section.addEventListener('pointercancel', function () {
      gazePoint = null;
      setGaze('');
    });

    window.addEventListener('blur', function () {
      gazePoint = null;
      setGaze('');
    });
  }

  /* ---------- dialog: rebuilt at runtime so stale handlers cannot fire ---------- */

  var lastTrigger = null;
  var closeBtn = null;
  var statusEl = null;
  var scrollLocked = false;
  var previousOverflow = '';
  var previousPadding = '';

  var CONTACTS = [
    {
      label: 'PHONE / 手机',
      display: '191 9111 8069',
      value: '19191118069',
      href: 'tel:19191118069',
      name: '手机号'
    },
    {
      label: 'EMAIL / 邮箱',
      display: '1849772318@qq.com',
      value: '1849772318@qq.com',
      href: 'mailto:1849772318@qq.com',
      name: '邮箱'
    },
    {
      label: 'WECHAT / 微信',
      display: 'shefu995',
      value: 'shefu995',
      href: '',
      name: '微信号'
    }
  ];

  var COPY_ICON = '<svg class="ct-copyact__icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
    '<rect x="5.6" y="5.6" width="8.4" height="8.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.35"/>' +
    '<path d="M10.4 3.6v-.7A1.4 1.4 0 0 0 9 1.5H2.9a1.4 1.4 0 0 0-1.4 1.4V9a1.4 1.4 0 0 0 1.4 1.4h.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/></svg>';

  function buildDialog() {
    if (!dialog) return;

    dialog.innerHTML =
      '<div class="ct-modal__panel">' +
        '<div class="ct-modal__bar">' +
          '<button class="ct-modal__close" type="button" data-ct-close aria-label="关闭联系方式"><span aria-hidden="true">×</span></button>' +
        '</div>' +
        '<div class="ct-modal__body">' +
          '<div class="ct-modal__grid">' +
            '<ul class="ct-list">' + CONTACTS.map(buildItem).join('') + '</ul>' +
            '<div class="ct-qr">' +
              '<div class="ct-qr__box">' +
                '<img class="ct-qr__img" src="' + QR + '" alt="微信二维码" width="673" height="673" decoding="async">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<p class="ct-status" role="status" aria-live="polite" aria-atomic="true"></p>' +
        '</div>' +
      '</div>';

    dialog.setAttribute('aria-label', '联系方式');
    dialog.removeAttribute('aria-labelledby');
    ['onclick', 'onclose', 'oncancel', 'onkeydown', 'onpointerdown'].forEach(function (name) {
      dialog.removeAttribute(name);
    });

    closeBtn = dialog.querySelector('[data-ct-close]');
    statusEl = dialog.querySelector('.ct-status');

    if (closeBtn) closeBtn.addEventListener('click', closeContact);

    dialog.querySelectorAll('[data-copy]').forEach(function (button) {
      button.addEventListener('click', function () { copyValue(button); });
    });

    var wechatInput = dialog.querySelector('#wechat-value');
    if (wechatInput) {
      wechatInput.addEventListener('click', function () {
        try { wechatInput.select(); } catch (error) { /* ignore */ }
      });
    }

    dialog.addEventListener('close', onDialogClosed);

    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      closeContact();
    });
  }

  function buildItem(item, index) {
    var id = item.href ? 'ct-value-' + index : 'wechat-value';
    var value;

    if (item.href) {
      value = '<a class="ct-item__value" id="' + id + '" href="' + item.href + '">' + item.display + '</a>';
    } else {
      value = '<input class="ct-item__value ct-item__input" id="' + id + '" type="text" value="' + item.value +
        '" readonly spellcheck="false" aria-label="微信号 ' + item.value + '">';
    }

    return '<li class="ct-item">' +
      '<div class="ct-item__main">' +
        '<span class="ct-item__label">' + item.label + '</span>' +
        value +
      '</div>' +
      '<button class="ct-copyact" type="button" data-copy="' + item.value + '" data-copy-target="' + id +
        '" data-name="' + item.name + '" aria-label="复制' + item.name + ' ' + item.display + '">' +
        COPY_ICON + '<span class="ct-copyact__text">复制</span>' +
      '</button>' +
    '</li>';
  }

  function announce(message) {
    if (!statusEl) return;
    statusEl.textContent = '';
    window.setTimeout(function () {
      statusEl.textContent = message;
    }, 30);
  }

  function selectFallback(id) {
    var target = document.getElementById(id);
    if (!target) return;
    if (typeof target.select === 'function') {
      try {
        target.focus({ preventScroll: true });
        target.select();
        return;
      } catch (error) { /* fall through to range selection */ }
    }
    var range = document.createRange();
    range.selectNodeContents(target);
    var selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function legacyCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function copyValue(button) {
    var text = button.getAttribute('data-copy') || '';
    var name = button.getAttribute('data-name') || '内容';
    var targetId = button.getAttribute('data-copy-target') || '';
    var textEl = button.querySelector('.ct-copyact__text');
    if (!text || !textEl) return;

    writeClipboard(text).then(function (ok) {
      if (ok) {
        button.classList.add('is-done');
        textEl.textContent = '已复制';
        announce(name + '已复制');
        window.clearTimeout(button.__ctTimer);
        button.__ctTimer = window.setTimeout(function () {
          button.classList.remove('is-done');
          textEl.textContent = '复制';
        }, 1800);
        return;
      }

      selectFallback(targetId);
      button.classList.add('is-done');
      textEl.textContent = '请手动复制';
      announce('复制失败，已选中' + name + '，请手动复制');
      window.clearTimeout(button.__ctTimer);
      button.__ctTimer = window.setTimeout(function () {
        button.classList.remove('is-done');
        textEl.textContent = '复制';
      }, 2600);
    });
  }

  /* ---------- open / close ---------- */

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    previousOverflow = document.body.style.overflow;
    previousPadding = document.body.style.paddingRight;
    var gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPadding;
  }

  function openContact(trigger) {
    if (!dialog || dialog.open) return;
    lastTrigger = trigger || document.activeElement;

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    if (trigger && trigger.setAttribute) trigger.setAttribute('aria-expanded', 'true');
    lockScroll();
    window.setTimeout(function () {
      if (dialog.open && closeBtn) closeBtn.focus({ preventScroll: true });
    }, 20);
  }

  function closeContact() {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
      return;
    }
    dialog.removeAttribute('open');
    onDialogClosed();
  }

  function onDialogClosed() {
    unlockScroll();
    resetCopyStates();
    if (statusEl) statusEl.textContent = '';
    if (lastTrigger && document.contains(lastTrigger)) {
      try { lastTrigger.focus({ preventScroll: true }); } catch (error) { /* ignore */ }
    }
    if (cta) cta.setAttribute('aria-expanded', 'false');
  }

  function resetCopyStates() {
    if (!dialog) return;
    dialog.querySelectorAll('.ct-copyact').forEach(function (button) {
      window.clearTimeout(button.__ctTimer);
      button.classList.remove('is-done');
      var textEl = button.querySelector('.ct-copyact__text');
      if (textEl) textEl.textContent = '复制';
    });
  }

  buildDialog();

  if (cta) {
    ['onclick', 'onkeydown', 'onkeyup'].forEach(function (name) { cta.removeAttribute(name); });
    cta.addEventListener('click', function () { openContact(cta); });
  }

  /* ---------- motion preference ---------- */

  function onMotionChange() {
    gazePoint = null;
    setGaze('');
  }

  if (reducedQuery) {
    if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', onMotionChange);
    else if (reducedQuery.addListener) reducedQuery.addListener(onMotionChange);
  }
})();
