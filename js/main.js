/* ==========================================================================
   Grupo Tinbet — Home
   Interacciones: header, menú, progreso de lectura, titulares animados,
   arte del hero, tarjetas apiladas de verticales, escenas fijadas con scroll
   (principios, titular y lista de innovación), figuras laterales, tilt de
   tarjetas, carruseles, contadores, acordeones y modal de video.
   Obras por impuestos: franja de fotos, titular que se ilumina, sliders,
   mapa con obra destacada y "Mostrar más".
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
  const hero = $('[data-hero]');
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

  /** Envuelve cada palabra en <span class="word"> (titulares que se iluminan con el scroll). */
  function wrapWords(node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) { wrapWords(child); return; }
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
  }

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

  /* ---------- Verticales ---------- */
  // Escritorio: tarjetas apiladas (sticky) que se reducen cuando llega la siguiente.
  // Móvil: la sección queda fijada y las tarjetas pasan como slider horizontal con el scroll.
  const stack = $('[data-stack]');
  const vSection = $('[data-vsection]');
  const vTrack = $('[data-vtrack]');
  const vNav = $('[data-vstack-nav]');
  if (stack) {
    const cards = $$('.vcard', stack);
    const V_START = 0.08;
    const V_SPAN = 0.8;
    let vSlider = false;
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

    if (vSection && vTrack) {
      const goToCard = (index) => scrollToProgress(vTrack, V_START + V_SPAN * (index / (cards.length - 1)));

      // Indicadores del slider (uno por vertical, con su color).
      const dots = cards.map((card, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `vstack-nav__dot vstack-nav__dot--${card.id}`;
        dot.setAttribute('aria-label', `Vertical: ${$('.vcard__title', card).textContent.trim()}`);
        dot.addEventListener('click', () => goToCard(i));
        if (vNav) vNav.appendChild(dot);
        return dot;
      });

      const setVSlider = (on) => {
        vSlider = on;
        vSection.classList.toggle('is-slider', on);
        if (!on) {
          stack.style.removeProperty('--slide');
          cards.forEach((card) => { card.style.removeProperty('--off'); $('.vcard__content', card).inert = false; });
        }
      };

      // Los enlaces a una vertical (hero, menú, footer) llevan a su tarjeta dentro del slider.
      document.addEventListener('click', (e) => {
        if (!vSlider) return;
        const link = e.target.closest('a[href^="#"]');
        const index = link ? cards.findIndex((card) => `#${card.id}` === link.getAttribute('href')) : -1;
        if (index < 0) return;
        e.preventDefault();
        goToCard(index);
      });

      whenMatches('(max-width: 860px) and (min-height: 720px)', setVSlider);
      onFrame(() => {
        if (!vSlider) return;
        const n = cards.length;
        const p = clamp((trackProgress(vTrack) - V_START) / V_SPAN) * (n - 1);
        // Suavizado por tramo: el slider se detiene un momento en cada tarjeta.
        const base = Math.floor(p);
        const f = p - base;
        const slide = Math.min(n - 1, base + f * f * (3 - 2 * f));
        stack.style.setProperty('--slide', slide.toFixed(4));
        cards.forEach((card, i) => {
          const off = clamp(Math.abs(i - slide));
          card.style.setProperty('--off', off.toFixed(3));
          $('.vcard__content', card).inert = off > 0.5;
        });
        dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === Math.round(slide))));
      });
    }
  }

  /* ---------- Principios: mazo de tarjetas ---------- */
  // La sección queda fijada y avanza con el scroll:
  //  - escritorio ('stack'): las tarjetas se apilan una por una;
  //  - móvil ('slider'): las tarjetas pasan como un slider horizontal.
  // Con poca altura de pantalla o movimiento reducido funciona como mazo con clic ('click').
  const deck = $('[data-deck]');
  const deckNav = $('[data-deck-nav]');
  const deckSection = $('[data-deck-section]');
  const deckTrack = $('[data-deck-track]');
  if (deck && deckSection && deckTrack) {
    const cards = $$('.deck-card', deck);
    let order = cards.slice();
    let busy = false;
    let timer = null;
    let mode = 'click';
    // Tramo de la pista: pausa inicial, recorrido de las tarjetas y pausa final.
    const DECK_START = 0.06;
    const DECK_SPAN = 0.82;
    const stackQuery = window.matchMedia('(min-width: 861px) and (min-height: 620px)');
    const sliderQuery = window.matchMedia('(max-width: 860px) and (min-height: 560px)');

    const titleOf = (card) => $('.deck-card__title', card).textContent.trim();
    const peekOf = (card) => $('.deck-card__peek', card);
    const bodyOf = (card) => $('.deck-card__body', card);

    function goTo(card) {
      if (mode === 'click') {
        bringToFront(card);
        restart();
      } else {
        scrollToProgress(deckTrack, DECK_START + DECK_SPAN * (cards.indexOf(card) / (cards.length - 1)));
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
        bodyOf(card).inert = i !== 0;
        peekOf(card).hidden = i === 0;
      });
      setCurrent(cards.indexOf(order[0]));
    }

    function updateFromScroll() {
      if (mode === 'click') return;
      const n = cards.length;
      const p = clamp((trackProgress(deckTrack) - DECK_START) / DECK_SPAN) * (n - 1);

      if (mode === 'slider') {
        // Suavizado por tramo: el slider se detiene un momento en cada tarjeta.
        const base = Math.floor(p);
        const f = p - base;
        const s = Math.min(n - 1, base + f * f * (3 - 2 * f));
        deck.style.setProperty('--slide', s.toFixed(4));
        cards.forEach((card, i) => {
          const off = clamp(Math.abs(i - s));
          card.style.setProperty('--off', off.toFixed(3));
          if (card.dataset.depth !== '0') card.dataset.depth = '0';
          bodyOf(card).inert = off > 0.5;
          peekOf(card).hidden = true;
        });
        setCurrent(Math.round(s));
        deckSection.style.setProperty('--deck-p', (s / (n - 1)).toFixed(3));
        return;
      }

      cards.forEach((card, i) => {
        const d = p - i; // > 0: ya apilada (detrás), < 0: aún por entrar desde abajo
        const depth = d >= 0.5 ? Math.min(3, Math.max(1, Math.round(d))) : 0;
        card.style.setProperty('--dd', clamp(d, 0, 3).toFixed(3));
        card.style.setProperty('--enter', clamp(-d).toFixed(3));
        card.style.setProperty('--z', String(i + 1));
        if (card.dataset.depth !== String(depth)) card.dataset.depth = String(depth);
        bodyOf(card).inert = depth !== 0 || d < -0.5;
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
    const start = () => { if (!reducedMotion && mode === 'click' && !timer) timer = window.setInterval(next, 6500); };
    const restart = () => { stop(); start(); };

    function applyMode() {
      const nextMode = reducedMotion ? 'click' : stackQuery.matches ? 'stack' : sliderQuery.matches ? 'slider' : 'click';
      if (nextMode === mode && deckSection.dataset.mode) return;
      mode = nextMode;
      deckSection.dataset.mode = mode;
      deckSection.classList.toggle('is-scroll', mode !== 'click');
      deck.classList.toggle('is-scrolly', mode === 'stack');
      deck.classList.toggle('is-slider', mode === 'slider');

      cards.forEach((c) => {
        c.classList.remove('is-leaving', 'is-entering');
        ['--dd', '--enter', '--z', '--off'].forEach((prop) => c.style.removeProperty(prop));
      });
      deck.style.removeProperty('--slide');
      deckSection.style.removeProperty('--deck-p');

      if (mode === 'click') {
        order = cards.slice();
        render();
      } else {
        stop();
        updateFromScroll();
      }
    }

    [stackQuery, sliderQuery].forEach((mq) => mq.addEventListener('change', () => { applyMode(); requestFrame(); }));
    applyMode();
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
    // Las palabras se pueden definir por página con data-words (JSON con text, bg y fg).
    let words = [
      { text: 'diversas', bg: 'var(--c-ent)', fg: 'var(--c-ent-dark)' },
      { text: 'innovadoras', bg: 'var(--c-inv)', fg: 'var(--c-inv-dark)' },
      { text: 'auténticas', bg: 'var(--c-seg)', fg: 'var(--c-white)' },
      { text: 'que suman', bg: 'var(--c-green)', fg: 'var(--c-forest)' }
    ];
    try {
      if (swap.dataset.words) words = JSON.parse(swap.dataset.words);
    } catch (err) { /* JSON inválido: se mantienen las palabras por defecto */ }
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
    wrapWords(wordsTitle);

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

  /* ---------- Titulares que se iluminan palabra por palabra con el scroll ---------- */
  // A diferencia de Innovación, la sección no queda fijada: las palabras se encienden
  // mientras el titular recorre la pantalla.
  $$('[data-scroll-words]').forEach((title) => {
    if (reducedMotion) return;
    wrapWords(title);
    const words = $$('.word', title);
    (title.closest('section') || title).classList.add('is-scroll-words');
    onFrame(() => {
      const vh = window.innerHeight;
      const rect = title.getBoundingClientRect();
      if (rect.bottom < -vh || rect.top > vh * 2) return;
      const p = clamp((vh * 0.85 - rect.top) / (vh * 0.4 + rect.height));
      const lit = Math.round(p * words.length);
      words.forEach((word, i) => word.classList.toggle('is-lit', i < lit));
    });
  });

  /* ---------- Obras por impuestos: franja de fotos de la cabecera ---------- */
  // Las fotos crecen desde abajo al cargar y, en escritorio, siguen un leve parallax.
  const strip = $('[data-strip]');
  if (strip) {
    void strip.offsetWidth; // asegura el estado inicial antes de animar
    requestAnimationFrame(() => strip.classList.add('is-ready'));
    if (!reducedMotion) {
      const desktop = window.matchMedia('(min-width: 861px)');
      onFrame(() => {
        if (!desktop.matches) return;
        const vh = window.innerHeight;
        const rect = strip.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        strip.style.setProperty('--strip-p', clamp((vh - rect.top) / (vh + rect.height)).toFixed(3));
      });
    }
  }

  /* ---------- Sliders simples (textos y galerías de fotos) ---------- */
  $$('[data-slider]').forEach((root) => {
    const slides = $$('[data-slide]', root);
    if (slides.length < 2) return;
    const count = $('[data-slider-count]', root);
    const prev = $('[data-slider-prev]', root);
    const next = $('[data-slider-next]', root);
    let index = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));

    const show = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((slide, n) => {
        const on = n === index;
        slide.classList.toggle('is-active', on);
        slide.inert = !on;
        slide.setAttribute('aria-hidden', String(!on));
      });
      if (count) count.textContent = `${index + 1} de ${slides.length}`;
    };

    if (prev) prev.addEventListener('click', () => show(index - 1));
    if (next) next.addEventListener('click', () => show(index + 1));

    // Deslizar con el dedo
    let x0 = null;
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 45) show(index + (dx < 0 ? 1 : -1));
    }, { passive: true });

    show(index);
  });

  /* ---------- Obras por impuestos: mapa y obra destacada ---------- */
  // Cada pin enlaza a la ficha de su proyecto. En escritorio, los pines y las flechas cambian
  // la obra destacada del banner, que avanza sola mientras está visible; en móvil el banner
  // se oculta y el pin lleva directo a la ficha.
  const works = $('[data-works]');
  if (works) {
    const pins = $$('[data-work-pin]', works);
    const projects = pins.map((pin) => document.getElementById(pin.getAttribute('href').slice(1)));
    const banner = $('[data-works-banner]', works);
    const caption = $('[data-works-caption]', works);
    const titleLink = $('[data-works-title]', works);
    const region = $('[data-works-region]', works);
    const count = $('[data-works-count]', works);
    const interval = Number(works.dataset.autoplay) || 6000;
    let current = 0;
    let swapTimer = null;

    const bannerShown = () => Boolean(banner && banner.offsetParent);

    function select(index) {
      current = (index + pins.length) % pins.length;
      pins.forEach((pin, i) => {
        if (i === current) pin.setAttribute('aria-current', 'true');
        else pin.removeAttribute('aria-current');
      });
      const project = projects[current];
      const apply = () => {
        titleLink.href = `#${project.id}`;
        $('span', titleLink).textContent = $('.oxi-project__title', project).textContent.trim();
        region.textContent = project.dataset.region;
        count.textContent = `${current + 1} de ${pins.length}`;
        caption.classList.remove('is-changing');
      };
      window.clearTimeout(swapTimer);
      if (reducedMotion) { apply(); return; }
      caption.classList.add('is-changing');
      swapTimer = window.setTimeout(apply, 300);
    }

    let timer = null;
    let paused = false;
    let visible = false;
    const tick = () => { if (!paused && document.visibilityState === 'visible' && bannerShown()) select(current + 1); };
    const start = () => { if (!reducedMotion && visible && !timer) timer = window.setInterval(tick, interval); };
    const stop = () => { window.clearInterval(timer); timer = null; };
    const restart = () => { stop(); start(); };

    pins.forEach((pin, i) => pin.addEventListener('click', (e) => {
      if (!bannerShown()) return;
      e.preventDefault();
      select(i);
      restart();
    }));
    const prev = $('[data-works-prev]', works);
    const next = $('[data-works-next]', works);
    if (prev) prev.addEventListener('click', () => { select(current - 1); restart(); });
    if (next) next.addEventListener('click', () => { select(current + 1); restart(); });

    works.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') paused = true; });
    works.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') paused = false; });
    works.addEventListener('focusin', () => { paused = true; });
    works.addEventListener('focusout', (e) => { if (!works.contains(e.relatedTarget)) paused = false; });
    watchVisibility(works, () => { visible = true; start(); }, () => { visible = false; stop(); }, { threshold: 0.3 });
  }

  /* ---------- "Mostrar más" en las fichas de proyecto (móvil) ---------- */
  $$('[data-more]').forEach((wrap) => {
    const btn = $('[data-more-toggle]', wrap);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const open = wrap.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      $('span', btn).textContent = open ? 'Mostrar menos' : 'Mostrar más';
    });
  });

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

  /* ---------- Carruseles automáticos en bucle ---------- */
  // Cada carrusel avanza solo y vuelve a empezar sin saltos (al final de la pista hay copias
  // de los elementos). Se pausa mientras el usuario lo usa y fuera de pantalla.
  $$('[data-carousel-root]').forEach((root) => {
    const track = $('[data-carousel]', root);
    if (!track) return;
    const items = $$(':scope > *', track);
    const n = items.length;
    if (n < 2) return;
    const prev = $('[data-carousel-prev]', root);
    const nextBtn = $('[data-carousel-next]', root);
    const count = $('[data-carousel-count]', root);
    const dotsWrap = $('[data-carousel-dots]', root);
    const interval = Number(root.dataset.autoplay) || 4000;

    // Copias solo visuales para el bucle continuo.
    items.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.classList.add('is-clone');
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      $$('[id]', clone).forEach((el) => el.removeAttribute('id'));
      track.appendChild(clone);
    });
    const firstClone = $(':scope > .is-clone', track);

    const step = () => items[1].offsetLeft - items[0].offsetLeft;
    const setWidth = () => firstClone.offsetLeft - items[0].offsetLeft;
    const current = () => ((Math.round(track.scrollLeft / step()) % n) + n) % n;
    const jump = (left) => {
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = left;
      void track.offsetWidth;
      track.style.scrollBehavior = '';
    };
    // Si la vista quedó sobre las copias, vuelve a los originales equivalentes (mismo contenido).
    const normalize = () => { if (track.scrollLeft >= setWidth() - 2) jump(track.scrollLeft - setWidth()); };

    const dots = dotsWrap ? items.map((item, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Ir al elemento ${i + 1} de ${n}`);
      dot.addEventListener('click', () => { goTo(i); restart(); });
      dotsWrap.appendChild(dot);
      return dot;
    }) : [];

    const update = () => {
      const index = current();
      if (count) count.textContent = `${index + 1} de ${n}`;
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    };

    const scrollToLeft = (left) => track.scrollTo({ left, behavior: reducedMotion ? 'auto' : 'smooth' });
    function go(dir) {
      const s = step();
      if (dir < 0 && track.scrollLeft < 2) jump(track.scrollLeft + setWidth());
      if (dir > 0 && track.scrollLeft + s > track.scrollWidth - track.clientWidth + 2) jump(track.scrollLeft - setWidth());
      scrollToLeft(Math.round(track.scrollLeft / s + dir) * s);
    }
    function goTo(index) {
      normalize();
      scrollToLeft(index * step());
    }

    let endTimer = null;
    track.addEventListener('scroll', () => {
      requestAnimationFrame(update);
      window.clearTimeout(endTimer);
      endTimer = window.setTimeout(() => { normalize(); update(); }, 150);
    }, { passive: true });
    window.addEventListener('resize', () => { normalize(); update(); });

    // Avance automático
    let timer = null;
    let paused = false;
    let visible = false;
    let resumeTimer = null;
    const tick = () => { if (!paused && visible && document.visibilityState === 'visible') go(1); };
    const start = () => { if (!reducedMotion && !timer) timer = window.setInterval(tick, interval); };
    const stop = () => { window.clearInterval(timer); timer = null; };
    const restart = () => { stop(); if (visible) start(); };
    const pause = () => { paused = true; window.clearTimeout(resumeTimer); };
    const resumeLater = (ms = 2500) => {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => { paused = false; restart(); }, ms);
    };

    root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pause(); });
    root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') resumeLater(600); });
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('touchend', () => resumeLater(4000), { passive: true });
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) resumeLater(); });

    if (prev) prev.addEventListener('click', () => { go(-1); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { go(1); restart(); });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); restart(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); restart(); }
    });

    watchVisibility(root, () => { visible = true; start(); }, () => { visible = false; stop(); }, { threshold: 0.3 });
    update();
  });

  /* ---------- Lo último y Áreas de negocio: filtros por categoría y "Ver más" ---------- */
  // Un elemento puede tener varias categorías separadas por espacios (data-category="a b").
  const newsGrid = $('[data-news-grid], [data-filter-grid]');
  if (newsGrid) {
    const cards = $$('[data-category]', newsGrid);
    const filters = $$('[data-filter]');
    const moreBtn = $('[data-news-more]');
    const empty = $('[data-news-empty]');
    const PAGE = Number(newsGrid.dataset.page) || 8;
    let limit = PAGE;
    let filter = 'todo';

    const render = () => {
      const matching = cards.filter((card) => filter === 'todo' || card.dataset.category.split(/\s+/).includes(filter));
      cards.forEach((card) => { card.hidden = true; card.classList.remove('is-shown'); });
      matching.slice(0, limit).forEach((card, i) => {
        card.hidden = false;
        card.style.setProperty('--i', String(i % PAGE));
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('is-shown')));
      });
      if (moreBtn) moreBtn.hidden = matching.length <= limit;
      if (empty) empty.hidden = matching.length > 0;
    };

    filters.forEach((btn) => btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      limit = PAGE;
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    }));
    if (moreBtn) moreBtn.addEventListener('click', () => { limit += PAGE; render(); });
    render();
  }

  /* ---------- Aviso breve (toast) ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer = null;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  /* ---------- Compartir nota ---------- */
  const share = $('[data-share]');
  if (share) {
    const pageUrl = window.location.href.split('#')[0];
    const url = encodeURIComponent(pageUrl);
    const title = encodeURIComponent(document.title);
    const targets = {
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    };
    $$('[data-share-to]', share).forEach((link) => { link.href = targets[link.dataset.shareTo]; });
    const copyBtn = $('[data-share-copy]', share);
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(pageUrl);
          toast('Enlace copiado');
        } catch (err) {
          toast('No se pudo copiar el enlace');
        }
      });
    }
  }

  /* ---------- Personas y talento: vacantes ---------- */
  // Los filtros se aplican al pulsar "Buscar"; cada filtro aplicado aparece como una etiqueta
  // que se puede quitar. Las vacantes se paginan de a data-page elementos.
  const jobs = $('[data-jobs]');
  if (jobs) {
    const items = $$('[data-job]', jobs);
    const form = $('[data-job-filters]', jobs);
    const chips = $('[data-job-chips]', jobs);
    const count = $('[data-job-count]', jobs);
    const pager = $('[data-job-pager]', jobs);
    const empty = $('[data-job-empty]', jobs);
    const list = $('[data-job-list]', jobs);
    const PAGE = Number(jobs.dataset.page) || 6;
    let applied = {};
    let page = 1;

    const labelOf = (input) => input.parentElement.textContent.trim();
    const readForm = () => {
      applied = {};
      $$('input[type="checkbox"]:checked', form).forEach((input) => {
        (applied[input.name] = applied[input.name] || []).push(input.value);
      });
    };
    const matches = (item) => Object.keys(applied).every((key) => applied[key].includes(item.dataset[key]));

    function renderChips() {
      chips.replaceChildren();
      $$('input[type="checkbox"]:checked', form).forEach((input) => {
        if (!(applied[input.name] || []).includes(input.value)) return;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'jchip';
        chip.setAttribute('aria-label', `Quitar filtro: ${labelOf(input)}`);
        chip.innerHTML = `<span></span><svg aria-hidden="true"><use href="#i-close"/></svg>`;
        chip.firstChild.textContent = labelOf(input);
        chip.addEventListener('click', () => {
          input.checked = false;
          readForm();
          page = 1;
          render();
        });
        chips.appendChild(chip);
      });
    }

    function pageButton(content, target, label, current) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = content;
      btn.setAttribute('aria-label', label);
      if (current) btn.setAttribute('aria-current', 'page');
      btn.disabled = target < 1 || target > Math.ceil(lastTotal / PAGE);
      btn.addEventListener('click', () => {
        page = target;
        render();
        list.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
      return btn;
    }

    let lastTotal = items.length;
    function render() {
      const matching = items.filter(matches);
      const pages = Math.max(1, Math.ceil(matching.length / PAGE));
      lastTotal = matching.length;
      page = Math.min(page, pages);
      const from = (page - 1) * PAGE;
      const shown = matching.slice(from, from + PAGE);

      items.forEach((item) => { item.hidden = true; item.classList.remove('is-shown'); });
      shown.forEach((item, i) => {
        item.hidden = false;
        item.style.setProperty('--i', String(i));
        requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('is-shown')));
      });

      count.textContent = matching.length
        ? `Mostrando ${from + 1} a ${from + shown.length} de ${matching.length} vacantes`
        : 'No hay vacantes con esos filtros';
      empty.hidden = matching.length > 0;

      pager.replaceChildren();
      if (pages > 1) {
        pager.appendChild(pageButton('<svg aria-hidden="true"><use href="#i-chevron-left"/></svg>', page - 1, 'Página anterior'));
        for (let n = 1; n <= pages; n++) pager.appendChild(pageButton(String(n), n, `Página ${n}`, n === page));
        pager.appendChild(pageButton('<svg aria-hidden="true"><use href="#i-chevron-right"/></svg>', page + 1, 'Página siguiente'));
      }
      renderChips();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      readForm();
      page = 1;
      render();
    });
    $$('[data-job-clear]', jobs).forEach((btn) => btn.addEventListener('click', () => {
      form.reset();
      readForm();
      page = 1;
      render();
    }));

    // Compartir una vacante: menú nativo del sistema o, si no existe, copiar el enlace.
    $$('[data-job-share]', jobs).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const job = btn.closest('[data-job]');
        const url = `${window.location.href.split('#')[0]}#${job.id}`;
        const title = $('.job__title', job).textContent.trim();
        try {
          if (navigator.share) {
            await navigator.share({ title: `${title} | Grupo Tinbet`, url });
          } else {
            await navigator.clipboard.writeText(url);
            toast('Enlace de la vacante copiado');
          }
        } catch (err) {
          if (err && err.name !== 'AbortError') toast('No se pudo compartir la vacante');
        }
      });
    });

    // Enlace directo a una vacante (#vacante-…): abre la página donde está.
    const linked = items.find((item) => `#${item.id}` === window.location.hash);
    if (linked) page = Math.floor(items.indexOf(linked) / PAGE) + 1;
    render();
    if (linked) requestAnimationFrame(() => linked.scrollIntoView({ block: 'center' }));
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
