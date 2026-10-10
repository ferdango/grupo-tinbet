/* ==========================================================================
   Grupo Tinbet — Home
   Interacciones: header, menú móvil, animaciones de entrada, mazo de
   principios, carruseles, contador, rotador de palabras, parallax,
   acordeones y modal de video.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsIO = 'IntersectionObserver' in window;

  /** Ejecuta `onEnter` / `onLeave` cuando el elemento entra o sale del viewport. */
  function watchVisibility(el, onEnter, onLeave, options = { threshold: 0.25 }) {
    if (!supportsIO) { onEnter(); return; }
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onEnter();
      else if (onLeave) onLeave();
    }, options).observe(el);
  }

  /* ---------- Header ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menú móvil ---------- */
  const menuToggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');

  function setMenu(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.querySelector('.sr-only').textContent = open ? 'Cerrar menú' : 'Abrir menú';
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  }

  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); }
  });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Enlace activo según la sección visible ---------- */
  const navLinks = $$('.site-nav a[href^="#"]');
  if (supportsIO) {
    const linkFor = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = linkFor.get(entry.target.id);
        if (!link) return;
        navLinks.forEach((a) => a.classList.toggle('is-current', a === link));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    linkFor.forEach((_, id) => { const section = document.getElementById(id); if (section) spy.observe(section); });
  }

  /* ---------- Animaciones de entrada ---------- */
  const revealEls = $$('[data-reveal]');
  revealEls.forEach((el) => {
    const siblings = $$(':scope > [data-reveal]', el.parentElement);
    const index = siblings.indexOf(el);
    if (index > 0) el.style.transitionDelay = `${Math.min(index, 4) * 90}ms`;
  });

  if (supportsIO && !reducedMotion) {
    const revealer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => revealer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Principios: mazo de tarjetas ---------- */
  const deck = $('[data-deck]');
  if (deck) {
    let order = $$('.deck-card', deck).sort((a, b) => a.dataset.depth - b.dataset.depth);
    let busy = false;
    let timer = null;

    // Botón invisible para traer al frente las tarjetas que asoman detrás.
    order.forEach((card) => {
      const title = $('.deck-card__title', card).textContent.trim();
      const peek = document.createElement('button');
      peek.type = 'button';
      peek.className = 'deck-card__peek';
      peek.setAttribute('aria-label', `Ver principio: ${title}`);
      peek.addEventListener('click', () => { bringToFront(card); restart(); });
      card.appendChild(peek);
    });

    function render() {
      order.forEach((card, i) => {
        card.dataset.depth = String(i);
        const isFront = i === 0;
        $('.deck-card__body', card).inert = !isFront;
        $('.deck-card__peek', card).hidden = isFront;
      });
    }

    function bringToFront(card) {
      const idx = order.indexOf(card);
      if (idx <= 0 || busy) return;
      busy = true;
      const moving = order.slice(0, idx);
      moving.forEach((c) => c.classList.add('is-leaving'));

      window.setTimeout(() => {
        order = order.slice(idx).concat(moving);
        moving.forEach((c) => { c.style.transition = 'none'; c.classList.replace('is-leaving', 'is-entering'); });
        render();
        void deck.offsetWidth; // fuerza reflow antes de reactivar transiciones
        moving.forEach((c) => { c.style.transition = ''; c.classList.remove('is-entering'); });
        busy = false;
      }, reducedMotion ? 0 : 380);
    }

    const next = () => bringToFront(order[1]);
    const stop = () => { window.clearInterval(timer); timer = null; };
    const start = () => { if (!reducedMotion && !timer) timer = window.setInterval(next, 6500); };
    const restart = () => { stop(); start(); };

    render();
    deck.addEventListener('mouseenter', stop);
    deck.addEventListener('mouseleave', start);
    deck.addEventListener('focusin', stop);
    deck.addEventListener('focusout', (e) => { if (!deck.contains(e.relatedTarget)) start(); });
    watchVisibility(deck, start, stop);
  }

  /* ---------- Arrastrar para desplazar (carruseles horizontales) ---------- */
  $$('[data-drag-scroll], [data-carousel]').forEach((track) => {
    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let moved = false;

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
    });

    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        track.classList.add('is-dragging');
        track.style.scrollBehavior = 'auto';
        track.setPointerCapture(e.pointerId);
      }
      if (moved) track.scrollLeft = startScroll - dx;
    });

    const end = () => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      track.style.scrollBehavior = '';
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    track.addEventListener('dragstart', (e) => e.preventDefault());
  });

  /* ---------- Contador +300 ---------- */
  $$('[data-count-to]').forEach((el) => {
    const target = Number(el.dataset.countTo);
    if (reducedMotion || !supportsIO) return;
    el.textContent = '0';
    let done = false;
    watchVisibility(el, () => {
      if (done) return;
      done = true;
      const duration = 1600;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, null, { threshold: 0.6 });
  });

  /* ---------- Rotador de palabras (talento) ---------- */
  const swap = $('[data-word-swap]');
  const progress = $('[data-word-progress]');
  if (swap && progress) {
    const words = [
      { text: 'diversas', bg: 'var(--c-sky)', fg: 'var(--c-white)' },
      { text: 'innovadoras', bg: 'var(--c-sun)', fg: 'var(--c-forest)' },
      { text: 'auténticas', bg: 'var(--c-magenta)', fg: 'var(--c-white)' },
      { text: 'que suman', bg: 'var(--c-green)', fg: 'var(--c-white)' }
    ];
    const bars = $$('span', progress);
    const interval = 2800;
    let current = 0;
    let timer = null;
    progress.style.setProperty('--swap-ms', `${interval}ms`);

    const paint = (i) => {
      swap.textContent = words[i].text;
      swap.style.setProperty('--swap', words[i].bg);
      swap.style.color = words[i].fg;
      bars.forEach((bar, b) => {
        bar.classList.remove('is-active');
        bar.classList.toggle('is-done', b < i);
      });
      void progress.offsetWidth; // reinicia la animación de la barra activa
      bars[i].classList.add('is-active');
    };

    const step = () => {
      swap.classList.add('is-out');
      window.setTimeout(() => {
        current = (current + 1) % words.length;
        paint(current);
        swap.classList.remove('is-out');
      }, 300);
    };

    paint(0);
    if (!reducedMotion) {
      watchVisibility(swap,
        () => { if (!timer) timer = window.setInterval(step, interval); },
        () => { window.clearInterval(timer); timer = null; });
    }
  }

  /* ---------- Parallax del mosaico ---------- */
  const parallaxCols = $$('[data-parallax]');
  if (parallaxCols.length && !reducedMotion) {
    const desktop = window.matchMedia('(min-width: 861px)');
    let ticking = false;

    const update = () => {
      ticking = false;
      parallaxCols.forEach((col) => {
        if (!desktop.matches) { col.style.transform = ''; return; }
        const rect = col.getBoundingClientRect();
        const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
        col.style.transform = `translate3d(0, ${(offset * Number(col.dataset.parallax)).toFixed(1)}px, 0)`;
      });
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }

  /* ---------- Lista de innovación (acordeón con avance automático) ---------- */
  const featureList = $('[data-feature-list]');
  if (featureList) {
    const items = $$('.feature', featureList);
    const duration = 6000;
    let active = 0;
    let timer = null;
    featureList.style.setProperty('--feature-ms', `${duration}ms`);

    const activate = (i, timed) => {
      active = i;
      items.forEach((item, n) => {
        const on = n === i;
        item.classList.toggle('is-active', on);
        item.classList.remove('is-timed');
        $('.feature__toggle', item).setAttribute('aria-expanded', String(on));
        $('.feature__panel', item).hidden = !on;
      });
      if (timed) { void featureList.offsetWidth; items[i].classList.add('is-timed'); }
    };

    const stop = () => { window.clearInterval(timer); timer = null; items.forEach((it) => it.classList.remove('is-timed')); };
    const start = () => {
      if (reducedMotion || timer) return;
      activate(active, true);
      timer = window.setInterval(() => activate((active + 1) % items.length, true), duration);
    };

    items.forEach((item, i) => {
      $('.feature__toggle', item).addEventListener('click', () => { stop(); activate(i, false); });
    });
    watchVisibility(featureList, start, stop, { threshold: 0.4 });
  }

  /* ---------- FAQ: un solo elemento abierto a la vez ---------- */
  const accordion = $('[data-accordion]');
  if (accordion) {
    const items = $$('details', accordion);
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (item.open) items.forEach((other) => { if (other !== item) other.open = false; });
      });
    });
  }

  /* ---------- Carrusel "Lo último" ---------- */
  const carousel = $('[data-carousel]');
  const controls = $('[data-carousel-controls]');
  if (carousel && controls) {
    const prev = $('[data-carousel-prev]', controls);
    const nextBtn = $('[data-carousel-next]', controls);
    const count = $('[data-carousel-count]', controls);
    const cards = $$('.news-card', carousel);

    const metrics = () => {
      const gap = parseFloat(getComputedStyle(carousel).columnGap) || 0;
      const cardWidth = cards[0].getBoundingClientRect().width + gap;
      const padStart = parseFloat(getComputedStyle(carousel).paddingLeft) || 0;
      const perPage = Math.max(1, Math.floor((carousel.clientWidth - padStart + gap) / cardWidth));
      const pages = Math.max(1, Math.ceil(cards.length / perPage));
      return { cardWidth, perPage, pages };
    };

    const update = () => {
      const { cardWidth, perPage, pages } = metrics();
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      let page = Math.round(carousel.scrollLeft / (cardWidth * perPage)) + 1;
      if (carousel.scrollLeft >= maxScroll - 4) page = pages;
      page = Math.min(Math.max(page, 1), pages);
      count.textContent = `${page} de ${pages}`;
      prev.disabled = carousel.scrollLeft <= 4;
      nextBtn.disabled = carousel.scrollLeft >= maxScroll - 4;
    };

    const go = (dir) => {
      const { cardWidth, perPage } = metrics();
      carousel.scrollBy({ left: dir * cardWidth * perPage, behavior: reducedMotion ? 'auto' : 'smooth' });
    };

    prev.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));
    carousel.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    update();
  }

  /* ---------- Modal de video ---------- */
  const modal = $('[data-video-modal]');
  const frame = $('[data-video-frame]');
  let lastTrigger = null;

  function embedFor(url) {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`;
      iframe.title = 'Video de Grupo Tinbet';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      return iframe;
    }
    if (/\.(mp4|webm)(\?.*)?$/i.test(url)) {
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      return video;
    }
    return null;
  }

  function openVideo(trigger) {
    lastTrigger = trigger;
    const url = (trigger.dataset.video || '').trim();
    const player = url ? embedFor(url) : null;
    frame.replaceChildren();
    if (player) {
      frame.appendChild(player);
    } else {
      const empty = document.createElement('div');
      empty.className = 'video-modal__empty';
      empty.innerHTML = '<p>Video próximamente<span>Muy pronto podrás conocer más de Grupo Tinbet.</span></p>';
      frame.appendChild(empty);
    }
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  }

  function closeVideo() {
    if (modal.open && typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  }

  if (modal && frame) {
    $$('[data-video-open]').forEach((btn) => btn.addEventListener('click', () => openVideo(btn)));
    $('[data-video-close]', modal).addEventListener('click', closeVideo);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeVideo(); });
    modal.addEventListener('close', () => {
      frame.replaceChildren();
      if (lastTrigger) lastTrigger.focus();
    });
  }

  /* ---------- Año del footer ---------- */
  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
