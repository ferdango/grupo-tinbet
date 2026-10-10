/* ==========================================================================
   Grupo Tinbet — Home
   Interacciones: header, menú, progreso de lectura, titulares animados,
   arte del hero, tarjetas apiladas de verticales, escenas fijadas con scroll
   (principios, titular y lista de innovación), figuras laterales, tilt de
   tarjetas, carruseles, contadores, acordeones y modal de video.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const supportsIO = 'IntersectionObserver' in window;

  /** Ejecuta `onEnter` / `onLeave` cuando el elemento entra o sale del viewport. */
  function watchVisibility(el, onEnter, onLeave, options = { threshold: 0.25 }) {
    if (!supportsIO) { onEnter(); return; }
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onEnter();
      else if (onLeave) onLeave();
    }, options).observe(el);
  }

  /** Agrupa callbacks de scroll/resize en un solo requestAnimationFrame. */
  const frameTasks = new Set();
  let frameQueued = false;
  function onFrame(task) {
    frameTasks.add(task);
    task();
  }
  function requestFrame() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(() => {
      frameQueued = false;
      frameTasks.forEach((task) => task());
    });
  }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);

  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

  /** Activa un modo mientras la media query coincida (nunca con movimiento reducido). */
  function whenMatches(query, apply) {
    const mq = window.matchMedia(query);
    const run = () => apply(mq.matches && !reducedMotion);
    mq.addEventListener('change', () => { run(); requestFrame(); });
    run();
  }

  /* ---------- Header: estado sobre el hero, sombra y progreso ---------- */
  const header = $('[data-header]');
  const hero = $('.hero');
  const progress = $('[data-progress]');

  /** Progreso (0–1) de una pista cuyo contenido queda fijado bajo el header. */
  function trackProgress(track) {
    const headerH = header.offsetHeight;
    const pinH = window.innerHeight - headerH;
    const rect = track.getBoundingClientRect();
    const total = rect.height - pinH;
    return total > 0 ? clamp((headerH - rect.top) / total) : 0;
  }

  /** Lleva el scroll al punto de la pista que corresponde a `value` (0–1). */
  function scrollToProgress(track, value) {
    const headerH = header.offsetHeight;
    const pinH = window.innerHeight - headerH;
    const top = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.round(top - headerH + value * (track.offsetHeight - pinH)) + 1,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  }

  onFrame(() => {
    const y = window.scrollY;
    const heroEnd = hero ? hero.offsetHeight - header.offsetHeight - 40 : 0;
    header.classList.toggle('is-over-hero', y < heroEnd);
    header.classList.toggle('is-scrolled', y > 8);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : '0');
  });

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
  const navLinks = $$('.site-nav__list > li > a[href^="#"]');
  if (supportsIO) {
    const linkFor = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = linkFor.get(entry.target.id);
        navLinks.forEach((a) => a.classList.toggle('is-current', a === link));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((section) => spy.observe(section));
  }

  /* ---------- Titulares palabra por palabra ---------- */
  function splitWords(node, counter) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const outer = document.createElement('span');
          const inner = document.createElement('span');
          outer.className = 'split-word';
          inner.textContent = part;
          inner.style.setProperty('--w', counter.i++);
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        splitWords(child, counter);
      }
    });
  }

  const splitEls = $$('[data-split]');
  if (!reducedMotion) splitEls.forEach((el) => splitWords(el, { i: 0 }));

  /* ---------- Animaciones de entrada ---------- */
  const revealEls = $$('[data-reveal]');
  revealEls.forEach((el) => {
    const siblings = $$(':scope > [data-reveal]', el.parentElement);
    const index = siblings.indexOf(el);
    if (index > 0) el.style.transitionDelay = `${Math.min(index, 5) * 100}ms`;
  });

  const animated = revealEls.concat(splitEls);
  if (supportsIO && !reducedMotion) {
    const revealer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    animated.forEach((el) => revealer.observe(el));
  } else {
    animated.forEach((el) => el.classList.add('is-visible'));
  }

  // Una vez visibles, el retraso escalonado ya no debe afectar a los hovers.
  revealEls.forEach((el) => {
    const clearDelay = (e) => {
      if (e.target !== el) return;
      el.style.transitionDelay = '';
      el.removeEventListener('transitionend', clearDelay);
    };
    el.addEventListener('transitionend', clearDelay);
  });

  /* ---------- Arte del hero: entrada y parallax con el puntero ---------- */
  const heroArt = $('[data-hero-art]');
  if (hero) {
    requestAnimationFrame(() => hero.classList.add('is-ready'));
    if (heroArt && finePointer && !reducedMotion) {
      hero.addEventListener('pointermove', (e) => {
        const rect = hero.getBoundingClientRect();
        heroArt.style.setProperty('--mx', (((e.clientX - rect.left) / rect.width) - 0.5).toFixed(3));
        heroArt.style.setProperty('--my', (((e.clientY - rect.top) / rect.height) - 0.5).toFixed(3));
      });
      hero.addEventListener('pointerleave', () => {
        heroArt.style.setProperty('--mx', '0');
        heroArt.style.setProperty('--my', '0');
      });
    }
  }

  /* ---------- Verticales: tarjetas apiladas al hacer scroll ---------- */
  const stack = $('[data-stack]');
  if (stack) {
    const cards = $$('.vcard', stack);
    cards.forEach((card) => watchVisibility(card, () => card.classList.add('is-in'), null, { threshold: 0.3 }));

    const stacking = window.matchMedia('(min-width: 861px)');
    if (!reducedMotion) {
      onFrame(() => {
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next || !stacking.matches) { card.style.setProperty('--stack-p', '0'); return; }
          const rect = card.getBoundingClientRect();
          const nextTop = next.getBoundingClientRect().top;
          // 0 cuando la siguiente tarjeta aún está debajo, 1 cuando la cubre por completo.
          const p = Math.min(Math.max(1 - (nextTop - rect.top) / rect.height, 0), 1);
          card.style.setProperty('--stack-p', p.toFixed(3));
        });
      });
    }
  }

  /* ---------- Principios: mazo de tarjetas ---------- */
  // En escritorio la sección queda fijada y las tarjetas se apilan una por una con el scroll;
  // en pantallas pequeñas funciona como mazo con clic y avance automático.
  const deck = $('[data-deck]');
  const deckNav = $('[data-deck-nav]');
  const deckSection = $('[data-deck-section]');
  const deckTrack = $('[data-deck-track]');
  if (deck && deckSection && deckTrack) {
    const cards = $$('.deck-card', deck);
    let order = cards.slice();
    let busy = false;
    let timer = null;
    let scrollMode = false;
    // Tramo de la pista: pausa inicial, recorrido de las tarjetas y pausa final.
    const DECK_START = 0.06;
    const DECK_SPAN = 0.82;

    const titleOf = (card) => $('.deck-card__title', card).textContent.trim();
    const peekOf = (card) => $('.deck-card__peek', card);

    function goTo(card) {
      if (scrollMode) {
        scrollToProgress(deckTrack, DECK_START + DECK_SPAN * (cards.indexOf(card) / (cards.length - 1)));
      } else {
        bringToFront(card);
        restart();
      }
    }

    // Botón invisible sobre las tarjetas que asoman detrás.
    cards.forEach((card) => {
      const peek = document.createElement('button');
      peek.type = 'button';
      peek.className = 'deck-card__peek';
      peek.setAttribute('aria-label', `Ver principio: ${titleOf(card)}`);
      peek.addEventListener('click', () => goTo(card));
      card.appendChild(peek);
    });

    // Indicadores (uno por principio).
    const dots = cards.map((card) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Principio: ${titleOf(card)}`);
      dot.style.setProperty('--accent', card.style.getPropertyValue('--accent'));
      dot.addEventListener('click', () => goTo(card));
      if (deckNav) deckNav.appendChild(dot);
      return dot;
    });

    const setCurrent = (index) => dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));

    function render() {
      order.forEach((card, i) => {
        card.dataset.depth = String(i);
        $('.deck-card__body', card).inert = i !== 0;
        peekOf(card).hidden = i === 0;
      });
      setCurrent(cards.indexOf(order[0]));
    }

    function updateFromScroll() {
      if (!scrollMode) return;
      const n = cards.length;
      const p = clamp((trackProgress(deckTrack) - DECK_START) / DECK_SPAN) * (n - 1);
      cards.forEach((card, i) => {
        const d = p - i; // > 0: ya apilada (detrás), < 0: aún por entrar desde abajo
        const depth = d >= 0.5 ? Math.min(3, Math.max(1, Math.round(d))) : 0;
        card.style.setProperty('--dd', clamp(d, 0, 3).toFixed(3));
        card.style.setProperty('--enter', clamp(-d).toFixed(3));
        card.style.setProperty('--z', String(i + 1));
        if (card.dataset.depth !== String(depth)) card.dataset.depth = String(depth);
        $('.deck-card__body', card).inert = depth !== 0 || d < -0.5;
        peekOf(card).hidden = depth === 0;
      });
      setCurrent(Math.round(p));
      deckSection.style.setProperty('--deck-p', (p / (n - 1)).toFixed(3));
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
    const start = () => { if (!reducedMotion && !scrollMode && !timer) timer = window.setInterval(next, 6500); };
    const restart = () => { stop(); start(); };

    function setMode(on) {
      scrollMode = on;
      deckSection.classList.toggle('is-scroll', on);
      deck.classList.toggle('is-scrolly', on);
      if (on) {
        stop();
        cards.forEach((c) => c.classList.remove('is-leaving', 'is-entering'));
        updateFromScroll();
      } else {
        cards.forEach((c) => ['--dd', '--enter', '--z'].forEach((prop) => c.style.removeProperty(prop)));
        deckSection.style.removeProperty('--deck-p');
        order = cards.slice();
        render();
      }
    }

    whenMatches('(min-width: 861px) and (min-height: 620px)', setMode);
    onFrame(updateFromScroll);
    deck.addEventListener('mouseenter', stop);
    deck.addEventListener('mouseleave', start);
    deck.addEventListener('focusin', stop);
    deck.addEventListener('focusout', (e) => { if (!deck.contains(e.relatedTarget)) start(); });
    watchVisibility(deck, start, stop);
  }

  /* ---------- Tilt 3D en tarjetas ---------- */
  if (finePointer && !reducedMotion) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ---------- Arrastrar para desplazar (carrusel) ---------- */
  $$('[data-carousel]').forEach((track) => {
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

  /* ---------- Contadores ---------- */
  $$('[data-count-to]').forEach((el) => {
    const target = Number(el.dataset.countTo);
    if (reducedMotion || !supportsIO) return;
    el.textContent = '0';
    let done = false;
    watchVisibility(el, () => {
      if (done) return;
      done = true;
      const duration = target > 10 ? 1800 : 1000;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, null, { threshold: 0.6 });
  });

  /* ---------- Rotador de palabras (talento) ---------- */
  const swap = $('[data-word-swap]');
  const progressBars = $('[data-word-progress]');
  if (swap && progressBars) {
    const words = [
      { text: 'diversas', bg: 'var(--c-ent)', fg: 'var(--c-ent-dark)' },
      { text: 'innovadoras', bg: 'var(--c-inv)', fg: 'var(--c-inv-dark)' },
      { text: 'auténticas', bg: 'var(--c-seg)', fg: 'var(--c-white)' },
      { text: 'que suman', bg: 'var(--c-green)', fg: 'var(--c-forest)' }
    ];
    const bars = $$('span', progressBars);
    const interval = 2800;
    let current = 0;
    let timer = null;
    progressBars.style.setProperty('--swap-ms', `${interval}ms`);

    const paint = (i) => {
      swap.textContent = words[i].text;
      swap.style.setProperty('--swap', words[i].bg);
      swap.style.color = words[i].fg;
      bars.forEach((bar, b) => {
        bar.classList.remove('is-active');
        bar.classList.toggle('is-done', b < i);
      });
      void progressBars.offsetWidth; // reinicia la animación de la barra activa
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
    onFrame(() => {
      parallaxCols.forEach((col) => {
        if (!desktop.matches) { col.style.transform = ''; return; }
        const rect = col.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
        const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
        col.style.transform = `translate3d(0, ${(offset * Number(col.dataset.parallax)).toFixed(1)}px, 0)`;
      });
    });
  }

  /* ---------- Innovación: titular que se pinta de verde palabra por palabra ---------- */
  const innovation = $('#innovacion');
  const wordsTitle = $('[data-words]');
  const wordsTrack = $('[data-words-track]');
  if (innovation && wordsTitle && wordsTrack && !reducedMotion) {
    (function wrap(node) {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) { wrap(child); return; }
        if (child.nodeType !== Node.TEXT_NODE) return;
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const word = document.createElement('span');
          word.className = 'word';
          word.textContent = part;
          frag.appendChild(word);
        });
        child.replaceWith(frag);
      });
    })(wordsTitle);

    const words = $$('.word', wordsTitle);
    const sticky = $('.innovation__sticky--words', innovation);
    innovation.classList.add('is-scroll-words');
    onFrame(() => {
      const raw = trackProgress(wordsTrack);
      const lit = Math.round(clamp((raw - 0.1) / 0.72) * words.length);
      words.forEach((word, i) => word.classList.toggle('is-lit', i < lit));
      sticky.style.setProperty('--wp', clamp(raw / 0.85).toFixed(3));
    });
  }

  /* ---------- Innovación: lista que se abre ítem por ítem ---------- */
  // En escritorio cada tramo de scroll abre el siguiente ítem; en pantallas pequeñas
  // se abre con clic y avanza solo mientras está visible.
  const featureList = $('[data-feature-list]');
  const featureTrack = $('[data-features-track]');
  const featureVisual = $('.innovation__visual');
  if (innovation && featureList && featureTrack) {
    const items = $$('.feature', featureList);
    const duration = 6000;
    const FEAT_START = 0.05;
    const FEAT_SPAN = 0.85;
    let active = 0;
    let timer = null;
    let scrollMode = false;
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
      if (reducedMotion || scrollMode || timer) return;
      activate(active, true);
      timer = window.setInterval(() => activate((active + 1) % items.length, true), duration);
    };

    function updateFromScroll() {
      if (!scrollMode) return;
      const raw = trackProgress(featureTrack);
      const p = clamp((raw - FEAT_START) / FEAT_SPAN) * items.length;
      const idx = Math.min(items.length - 1, Math.floor(p));
      if (idx !== active) activate(idx, false);
      items.forEach((item, i) => item.style.setProperty('--fp', i === idx ? clamp(p - idx).toFixed(3) : (i < idx ? '1' : '0')));
      if (featureVisual) featureVisual.style.setProperty('--fprog', raw.toFixed(3));
    }

    function setMode(on) {
      scrollMode = on;
      innovation.classList.toggle('is-scroll-features', on);
      if (on) {
        stop();
        updateFromScroll();
      } else {
        items.forEach((item) => item.style.removeProperty('--fp'));
        if (featureVisual) featureVisual.style.removeProperty('--fprog');
      }
    }

    items.forEach((item, i) => {
      $('.feature__toggle', item).addEventListener('click', () => {
        if (scrollMode) {
          scrollToProgress(featureTrack, FEAT_START + FEAT_SPAN * (i + 0.15) / items.length);
        } else {
          stop();
          activate(i, false);
        }
      });
    });

    whenMatches('(min-width: 1101px) and (min-height: 620px)', setMode);
    onFrame(updateFromScroll);
    watchVisibility(featureList, start, stop, { threshold: 0.4 });
  }

  /* ---------- Figuras laterales animadas con el scroll ---------- */
  const scrollShapes = $$('[data-scroll-shape]');
  if (scrollShapes.length && !reducedMotion) {
    onFrame(() => {
      const vh = window.innerHeight;
      scrollShapes.forEach((shape) => {
        const rect = shape.parentElement.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const enter = clamp((vh - rect.top) / (vh * 0.85));
        shape.style.setProperty('--sp', (1 - Math.pow(1 - enter, 3)).toFixed(3));
        shape.style.setProperty('--sd', clamp((rect.top + rect.height / 2 - vh / 2) / vh, -1, 1).toFixed(3));
      });
    });
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
      const styles = getComputedStyle(carousel);
      const gap = parseFloat(styles.columnGap) || 0;
      const cardWidth = cards[0].getBoundingClientRect().width + gap;
      const padStart = parseFloat(styles.paddingLeft) || 0;
      const perPage = Math.max(1, Math.floor((carousel.clientWidth - padStart + gap) / cardWidth));
      return { cardWidth, perPage, pages: Math.max(1, Math.ceil(cards.length / perPage)) };
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
    carousel.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
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
