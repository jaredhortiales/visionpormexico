/* ==========================================================================
   VISIÓN POR MÉXICO — script.js
   JavaScript vanilla, sin dependencias. Módulos:
     1. Configuración (contacto, estados, tarifas futuras)
     2. Utilidades
     3. Almacenamiento del estado seleccionado
     4. Acceso por estado (combobox accesible)
     5. Header, navegación y enlaces de WhatsApp
     6. Catálogo (fetch, filtros, orden, conteo)
     7. Ficha rápida (dialog) + enlaces profundos por hash
     8. Movimiento (entrada, revelado) y mapa
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     1. CONFIGURACIÓN
     ------------------------------------------------------------------ */
  const CONTACT = {
    whatsapp: '526645002820',
    phoneHref: 'tel:+526645002820',
    phoneLabel: '664 500 2820'
  };

  const STORAGE_KEY = 'vpm.estado';
  const CATALOG_URL = './data/catalogo.json';

  // 32 entidades federativas (se ordenan alfabéticamente con localeCompare es-MX).
  const STATES = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
    'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ].sort((a, b) => a.localeCompare(b, 'es-MX'));

  /**
   * Tarifas regionales de TIPOS DE LENTES (no de armazones).
   * Desactivadas en esta versión: SHOW_PUBLIC_PRICES = false.
   * Para activar en el futuro: cambiar la bandera a true; el módulo
   * renderLensPricing() mostrará la tabla "desde" según el estado validado.
   * Nota: estos valores viven en un archivo estático y son legibles en el código;
   * la bandera controla la interfaz, no es un mecanismo de seguridad.
   */
  const PRICING = Object.freeze({
    SHOW_PUBLIC_PRICES: false,
    currency: 'MXN',
    regionNorte: Object.freeze([
      'Baja California', 'Baja California Sur', 'Chihuahua', 'Coahuila', 'Durango',
      'Nuevo León', 'Sinaloa', 'Sonora', 'Tamaulipas'
    ]),
    lentes: Object.freeze({
      norte: Object.freeze({ Monofocales: 650, Bifocales: 1500, Progresivos: 2000 }),
      resto: Object.freeze({ Monofocales: 599, Bifocales: 1200, Progresivos: 1500 })
    })
  });

  const SHAPES = {
    redondo: 'Redondo',
    rectangular: 'Rectangular',
    aviador: 'Aviador'
  };

  /* ------------------------------------------------------------------
     2. UTILIDADES
     ------------------------------------------------------------------ */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => prefersReducedMotion.matches;

  /** Quita acentos y mayúsculas para comparar texto. */
  function normalize(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function isValidState(name) {
    return typeof name === 'string' && STATES.includes(name);
  }

  function getRegion(state) {
    if (!isValidState(state)) return null;
    return PRICING.regionNorte.includes(state) ? 'norte' : 'resto';
  }

  function waLink(message) {
    return 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(message);
  }

  function messageGeneral(state) {
    let m = 'Hola, quisiera recibir información sobre los armazones y las opciones de lentes de Visión por México.';
    if (isValidState(state)) m += ' Mi estado es ' + state + '.';
    return m;
  }

  function messageLenses(state) {
    let m = 'Hola, quisiera orientación sobre los tipos de lentes (monofocales, bifocales y progresivos) de Visión por México.';
    if (isValidState(state)) m += ' Mi estado es ' + state + '.';
    return m;
  }

  function messageProduct(product, state) {
    return 'Hola, me interesa el armazón ' + product.marca + ' ' + product.modelo +
      ' (' + product.medida + '). Mi estado es ' + state +
      '. ¿Podrían confirmarme disponibilidad, opciones de lentes y cotización?';
  }

  function shapeOf(product) {
    const c = normalize(product.categoria);
    if (c.includes('redond')) return 'redondo';
    if (c.includes('rectang')) return 'rectangular';
    if (c.includes('aviador')) return 'aviador';
    return null;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach((c) => { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }

  /* ------------------------------------------------------------------
     3. ALMACENAMIENTO
     ------------------------------------------------------------------ */
  const storage = (function () {
    let memory = null;
    function pick() {
      try {
        const t = '__vpm_test__';
        window.localStorage.setItem(t, '1');
        window.localStorage.removeItem(t);
        return window.localStorage;
      } catch (e) {
        try {
          const t = '__vpm_test__';
          window.sessionStorage.setItem(t, '1');
          window.sessionStorage.removeItem(t);
          return window.sessionStorage;
        } catch (e2) {
          return null;
        }
      }
    }
    const store = pick();
    return {
      get() {
        try { return store ? store.getItem(STORAGE_KEY) : memory; } catch (e) { return memory; }
      },
      set(value) {
        memory = value;
        try { if (store) store.setItem(STORAGE_KEY, value); } catch (e) { /* almacenamiento bloqueado: se conserva en memoria */ }
      }
    };
  })();

  /* ------------------------------------------------------------------
     Estado global de la aplicación
     ------------------------------------------------------------------ */
  const app = {
    state: null,           // entidad validada o null
    products: [],          // catálogo cargado
    pendingProductId: null // ficha solicitada por hash antes de elegir estado
  };

  /* ------------------------------------------------------------------
     4. ACCESO POR ESTADO
     ------------------------------------------------------------------ */
  const gate = {
    root: $('#gate'),
    form: $('#gate-form'),
    input: $('#state-input'),
    clear: $('#state-clear'),
    list: $('#state-listbox'),
    status: $('#state-status'),
    submit: $('#gate-submit'),
    cancel: $('#gate-cancel'),
    selected: null,
    activeIndex: -1,
    matches: [],
    returnFocus: null,
    isChanging: false
  };

  const blockable = [$('#header'), $('#main'), $('.footer')];

  function setPageBlocked(blocked) {
    blockable.forEach((n) => { if (!n) return; if (blocked) n.setAttribute('inert', ''); else n.removeAttribute('inert'); });
    document.body.classList.toggle('gate-open', blocked);
  }

  function highlight(name, query) {
    if (!query) return el('span', { text: name });
    const n = normalize(name);
    const q = normalize(query);
    // Mapa índice normalizado → índice original (los acentos descompuestos ocupan +1)
    const map = [];
    let decomposed = name.normalize('NFD');
    let orig = 0;
    for (let i = 0; i < decomposed.length; i++) {
      const ch = decomposed[i];
      if (/[̀-ͯ]/.test(ch)) continue;
      map.push(orig);
      orig += 1;
    }
    const idx = n.indexOf(q);
    const span = el('span');
    if (idx < 0) { span.textContent = name; return span; }
    const start = map[idx];
    const end = map[idx + q.length - 1] + 1;
    span.append(name.slice(0, start));
    span.append(el('mark', { text: name.slice(start, end) }));
    span.append(name.slice(end));
    return span;
  }

  function renderList(query) {
    const q = normalize(query);
    gate.matches = STATES.filter((s) => normalize(s).includes(q));
    gate.list.innerHTML = '';
    gate.activeIndex = -1;
    gate.input.removeAttribute('aria-activedescendant');

    if (gate.matches.length === 0) {
      gate.list.appendChild(el('li', { class: 'listbox__empty', role: 'presentation', text: 'No encontramos un estado con ese nombre.' }));
      return;
    }
    gate.matches.forEach((name, i) => {
      const li = el('li', {
        class: 'listbox__item',
        role: 'option',
        id: 'state-opt-' + i,
        'aria-selected': gate.selected === name ? 'true' : 'false'
      }, [highlight(name, query)]);
      li.addEventListener('mousedown', (e) => e.preventDefault()); // evita perder el foco del input
      li.addEventListener('click', () => selectState(name));
      gate.list.appendChild(li);
    });
  }

  function openList() {
    gate.list.classList.add('is-open');
    gate.input.setAttribute('aria-expanded', 'true');
  }
  function closeList() {
    gate.list.classList.remove('is-open');
    gate.input.setAttribute('aria-expanded', 'false');
    gate.activeIndex = -1;
    gate.input.removeAttribute('aria-activedescendant');
    $$('.listbox__item.is-active', gate.list).forEach((n) => n.classList.remove('is-active'));
  }

  function setActive(index) {
    const items = $$('.listbox__item', gate.list);
    if (!items.length) return;
    items.forEach((n) => n.classList.remove('is-active'));
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    gate.activeIndex = index;
    const item = items[index];
    item.classList.add('is-active');
    gate.input.setAttribute('aria-activedescendant', item.id);
    item.scrollIntoView({ block: 'nearest' });
  }

  function selectState(name) {
    if (!isValidState(name)) return;
    gate.selected = name;
    gate.input.value = name;
    gate.submit.disabled = false;
    gate.status.innerHTML = '';
    gate.status.append('Seleccionaste ', el('strong', { text: name }), '.');
    gate.clear.hidden = false;
    closeList();
    gate.submit.focus();
  }

  function clearSelection(keepText) {
    gate.selected = null;
    gate.submit.disabled = true;
    if (!keepText) { gate.input.value = ''; gate.clear.hidden = true; }
    gate.status.textContent = '';
  }

  gate.input.addEventListener('input', () => {
    const v = gate.input.value;
    gate.clear.hidden = v.length === 0;
    // La selección sólo se conserva si el texto coincide exactamente con un estado.
    const exact = STATES.find((s) => normalize(s) === normalize(v));
    if (exact) {
      gate.selected = exact;
      gate.submit.disabled = false;
      gate.status.innerHTML = '';
      gate.status.append('Seleccionaste ', el('strong', { text: exact }), '.');
    } else {
      clearSelection(true);
    }
    renderList(v);
    openList();
  });

  gate.input.addEventListener('focus', () => { renderList(gate.input.value); openList(); });
  gate.input.addEventListener('click', () => { if (!gate.list.classList.contains('is-open')) { renderList(gate.input.value); openList(); } });

  gate.input.addEventListener('keydown', (e) => {
    const open = gate.list.classList.contains('is-open');
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { renderList(gate.input.value); openList(); }
        setActive(gate.activeIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) { renderList(gate.input.value); openList(); }
        setActive(gate.activeIndex - 1);
        break;
      case 'Home':
        if (open) { e.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (open) { e.preventDefault(); setActive(gate.matches.length - 1); }
        break;
      case 'Enter':
        e.preventDefault();
        if (open && gate.activeIndex >= 0 && gate.matches[gate.activeIndex]) {
          selectState(gate.matches[gate.activeIndex]);
        } else if (gate.selected) {
          gate.form.requestSubmit();
        } else {
          // No se selecciona implícitamente la primera coincidencia.
          gate.status.textContent = 'Elige un estado de la lista con las flechas o con un clic.';
          if (!open) { renderList(gate.input.value); openList(); }
        }
        break;
      case 'Escape':
        if (open) { e.preventDefault(); closeList(); }
        else if (gate.isChanging) { e.preventDefault(); cancelChange(); }
        break;
      case 'Tab':
        closeList();
        break;
      default:
        break;
    }
  });

  gate.clear.addEventListener('click', () => {
    clearSelection(false);
    renderList('');
    openList();
    gate.input.focus();
  });

  document.addEventListener('pointerdown', (e) => {
    if (gate.root.hidden) return;
    if (!$('#state-combobox').contains(e.target)) closeList();
  });

  gate.form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isValidState(gate.selected)) {
      gate.status.textContent = 'Elige un estado de la lista para continuar.';
      gate.input.focus();
      return;
    }
    applyState(gate.selected);
    hideGate();
  });

  gate.cancel.addEventListener('click', cancelChange);

  function cancelChange() {
    if (!isValidState(app.state)) return;
    hideGate();
  }

  function showGate(options) {
    options = options || {};
    gate.isChanging = !!options.changing && isValidState(app.state);
    gate.returnFocus = document.activeElement;
    gate.root.hidden = false;
    gate.root.classList.remove('is-leaving');
    gate.cancel.hidden = !gate.isChanging;
    gate.input.value = '';
    gate.clear.hidden = true;
    gate.selected = null;
    gate.submit.disabled = true;
    gate.status.innerHTML = '';
    if (gate.isChanging) {
      gate.status.append('Tu estado actual es ', el('strong', { text: app.state }), '.');
    } else if (app.pendingProductId) {
      gate.status.textContent = 'Elige tu estado para abrir la ficha del armazón que solicitaste.';
    }
    closeList();
    setPageBlocked(true);
    window.setTimeout(() => gate.input.focus(), 40);
  }

  function hideGate() {
    const finish = () => {
      gate.root.hidden = true;
      gate.root.classList.remove('is-leaving');
      setPageBlocked(false);
      document.body.classList.add('is-ready');
      if (app.pendingProductId) {
        const id = app.pendingProductId;
        app.pendingProductId = null;
        openProduct(id, null);
      } else if (gate.isChanging && gate.returnFocus && document.contains(gate.returnFocus)) {
        gate.returnFocus.focus();
      } else {
        const h = $('#hero-title');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      }
      gate.isChanging = false;
    };
    if (reduced()) { finish(); return; }
    gate.root.classList.add('is-leaving');
    window.setTimeout(finish, 420);
  }

  /* ------------------------------------------------------------------
     5. HEADER, NAVEGACIÓN, ESTADO Y ENLACES WHATSAPP
     ------------------------------------------------------------------ */
  const header = $('#header');
  const nav = $('#nav');
  const menuToggle = $('#menu-toggle');
  const chip = $('#state-chip');
  const chipLabel = $('#state-chip-label');
  const footerState = $('#footer-state');

  function applyState(name) {
    if (!isValidState(name)) return;
    app.state = name;
    storage.set(name);
    chip.classList.remove('is-empty');
    chipLabel.textContent = name;
    chip.setAttribute('aria-label', 'Estado seleccionado: ' + name + '. Cambiar estado');
    footerState.textContent = 'Consultas desde ' + name;
    updateGeneralLinks();
    renderLensPricing();
    // Si la ficha está abierta, se actualiza su mensaje
    if (productDialog.open && productDialog.dataset.productId) renderProduct(productDialog.dataset.productId);
  }

  function updateGeneralLinks() {
    $$('[data-wa="general"]').forEach((a) => { a.href = waLink(messageGeneral(app.state)); });
    $$('[data-wa="lentes"]').forEach((a) => { a.href = waLink(messageLenses(app.state)); });
  }

  chip.addEventListener('click', () => showGate({ changing: true }));
  $$('[data-change-state]').forEach((b) => b.addEventListener('click', () => showGate({ changing: true })));

  // Menú móvil
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.classList.toggle('menu-open', open);
  }
  menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('.nav__link', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // Sombra del header y pestaña activa
  const sections = ['inicio', 'armazones', 'tipos-de-lentes', 'como-cotizar', 'visitanos'].map((id) => document.getElementById(id)).filter(Boolean);
  const navLinks = $$('.nav__link', nav);
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      header.classList.toggle('is-stuck', window.scrollY > 4);
      const line = window.scrollY + header.offsetHeight + window.innerHeight * 0.35;
      let current = sections[0];
      sections.forEach((s) => { if (s.offsetTop <= line) current = s; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
      navLinks.forEach((a) => {
        const active = current && a.getAttribute('href') === '#' + current.id;
        a.classList.toggle('is-active', !!active);
        if (active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ------------------------------------------------------------------
     6. CATÁLOGO
     ------------------------------------------------------------------ */
  const grid = $('#catalog-grid');
  const emptyMsg = $('#catalog-empty');
  const countEl = $('#filter-count');
  const searchInput = $('#filter-search');
  const sortSelect = $('#filter-sort');
  const filtersForm = $('#filters');
  const cardTpl = $('#card-template');

  function altText(p) {
    const shape = shapeOf(p);
    return 'Armazón ' + p.marca + ' ' + p.modelo + (shape ? ', ' + SHAPES[shape].toLowerCase() : '') + ', ' + p.color.toLowerCase();
  }

  function buildCard(p, index) {
    const node = cardTpl.content.firstElementChild.cloneNode(true);
    const img = $('.card__img', node);
    img.src = './' + p.imagen.replace(/^\.?\//, '');
    img.alt = altText(p);
    $('.card__brand', node).textContent = p.marca;
    $('.card__model', node).textContent = p.modelo;
    $('.card__cat', node).textContent = p.categoria;
    $('.card__color', node).textContent = p.color;
    $('.card__size', node).textContent = p.medida;
    $('.card__media', node).setAttribute('aria-label', 'Ver modelo ' + p.marca + ' ' + p.modelo);
    $$('[data-open-product]', node).forEach((b) => { b.dataset.openProduct = p.id; });
    node.dataset.id = p.id;
    node.style.transitionDelay = reduced() ? '0ms' : ((index % 3) * 70) + 'ms';
    return node;
  }

  /** Celda de cierre (enlace real a WhatsApp) para no dejar huecos en la retícula. */
  function buildFill() {
    const cell = el('div', { class: 'catalog__fill', id: 'catalog-fill' });
    const link = el('a', { class: 'link-btn', href: waLink(messageGeneral(app.state)), target: '_blank', rel: 'noopener noreferrer', 'data-wa': 'general', text: 'Escríbenos por WhatsApp' });
    cell.append(el('p', { text: '¿Buscas otro modelo o color? Pregúntanos qué más tenemos.' }), link);
    return cell;
  }
  function sizeFill() {
    const cell = $('#catalog-fill');
    if (!cell) return;
    const cols = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const n = $$('.card', grid).length;
    const rest = n % cols;
    cell.style.gridColumn = 'span ' + (rest === 0 ? cols : cols - rest);
  }
  window.addEventListener('resize', sizeFill);

  function currentFilters() {
    const shape = (filtersForm.querySelector('input[name="shape"]:checked') || {}).value || 'todos';
    return { q: normalize(searchInput.value), shape, sort: sortSelect.value };
  }

  function filteredProducts() {
    const f = currentFilters();
    let list = app.products.filter((p) => {
      const hay = normalize(p.marca + ' ' + p.modelo + ' ' + p.marca + p.modelo);
      const okQ = !f.q || hay.includes(f.q);
      const okShape = f.shape === 'todos' || shapeOf(p) === f.shape;
      return okQ && okShape;
    });
    if (f.sort === 'az' || f.sort === 'za') {
      list = list.slice().sort((a, b) => (a.marca + ' ' + a.modelo).localeCompare(b.marca + ' ' + b.modelo, 'es-MX'));
      if (f.sort === 'za') list.reverse();
    }
    return list;
  }

  function renderCount(n) {
    const total = app.products.length;
    if (n === total) countEl.textContent = total + ' modelos';
    else countEl.textContent = n + ' de ' + total + ' modelos';
  }

  let cardObserver = null;
  function observeCards() {
    const cards = $$('.card', grid);
    if (reduced() || !('IntersectionObserver' in window)) { cards.forEach((c) => c.classList.add('is-visible')); return; }
    if (!cardObserver) {
      cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); cardObserver.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    }
    cards.forEach((c) => cardObserver.observe(c));
  }

  function renderCatalog(animate) {
    const list = filteredProducts();
    const paint = () => {
      grid.innerHTML = '';
      list.forEach((p, i) => grid.appendChild(buildCard(p, i)));
      if (list.length) grid.appendChild(buildFill());
      sizeFill();
      grid.setAttribute('aria-busy', 'false');
      grid.classList.remove('is-updating');
      emptyMsg.hidden = list.length !== 0;
      renderCount(list.length);
      observeCards();
    };
    if (animate && !reduced()) {
      grid.classList.add('is-updating');
      window.setTimeout(paint, 140);
    } else {
      paint();
    }
  }

  function loadCatalog() {
    return fetch(CATALOG_URL, { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Formato inesperado');
        app.products = data.filter((p) => p && p.id && p.marca && p.modelo && p.medida && p.imagen);
        if (app.products.length === 0) throw new Error('Catálogo vacío');
        renderCatalog(false);
        handleHash();
      })
      .catch((err) => {
        console.error('No se pudo cargar el catálogo:', err);
        grid.setAttribute('aria-busy', 'false');
        grid.innerHTML = '';
        const msg = el('div', { class: 'catalog__error' });
        msg.append(
          el('p', { text: 'No pudimos cargar el catálogo en este momento. Intenta recargar la página o escríbenos directamente por WhatsApp.' }),
          el('p', { html: '<a href="' + waLink(messageGeneral(app.state)) + '" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>' })
        );
        if (window.location.protocol === 'file:') {
          msg.append(el('p', { text: 'Nota técnica: el catálogo se lee con fetch() y los navegadores bloquean esa lectura al abrir el archivo directamente. Usa un servidor local (por ejemplo, python -m http.server 8000).' }));
        }
        grid.appendChild(msg);
        countEl.textContent = '';
      });
  }

  searchInput.addEventListener('input', () => renderCatalog(true));
  sortSelect.addEventListener('change', () => renderCatalog(true));
  $$('input[name="shape"]', filtersForm).forEach((r) => r.addEventListener('change', () => renderCatalog(true)));
  filtersForm.addEventListener('submit', (e) => e.preventDefault());
  $('#filters-reset').addEventListener('click', () => {
    searchInput.value = '';
    sortSelect.value = 'catalogo';
    filtersForm.querySelector('input[name="shape"][value="todos"]').checked = true;
    renderCatalog(true);
    searchInput.focus();
  });

  /* ------------------------------------------------------------------
     7. FICHA RÁPIDA + HASH
     ------------------------------------------------------------------ */
  const productDialog = $('#product-dialog');
  const productBody = $('#product-body');
  const productClose = $('#product-close');
  let productOpener = null;
  let closingTimer = null;

  function findProduct(id) { return app.products.find((p) => p.id === id) || null; }

  function siblingColor(p) {
    return app.products.find((o) => o.id !== p.id && o.marca === p.marca && o.modelo === p.modelo) || null;
  }

  function renderProduct(id) {
    const p = findProduct(id);
    if (!p) return false;
    const shape = shapeOf(p);
    productBody.innerHTML = '';

    const fig = el('figure', { class: 'product__figure' }, [
      el('img', { src: './' + p.imagen.replace(/^\.?\//, ''), alt: altText(p), width: '1400', height: '1400', decoding: 'async' })
    ]);

    const specs = el('dl', { class: 'product__specs' }, [
      el('div', null, [el('dt', { text: 'Color' }), el('dd', { text: p.color })]),
      el('div', null, [el('dt', { text: 'Medida' }), el('dd', null, [p.medida, el('small', { text: 'Calibre □ puente – varilla, en milímetros' })])]),
      shape ? el('div', null, [el('dt', { text: 'Forma' }), el('dd', { text: SHAPES[shape] })]) : null
    ]);

    const desc = el('p', {
      class: 'product__desc',
      text: p.categoria + ' de ' + p.marca + ', en ' + p.color.toLowerCase() + ', medida ' + p.medida + '. La disponibilidad, las opciones de lentes y el precio se confirman por WhatsApp.'
    });

    const sib = siblingColor(p);
    const alt = sib ? el('p', { class: 'product__alt' }, [
      (function () {
        const b = el('button', { type: 'button', class: 'link-btn', 'data-open-product': sib.id }, ['Otro color del mismo modelo: ' + sib.color]);
        b.addEventListener('click', () => { productOpenerKeep = true; openProduct(sib.id, productOpener); });
        return b;
      })()
    ]) : null;

    const stateLine = el('p', { class: 'product__state' });
    stateLine.append('Consulta para ', el('strong', { text: app.state || '—' }), ' · ');
    const changeBtn = el('button', { type: 'button', class: 'link-btn', text: 'Cambiar estado' });
    changeBtn.style.minHeight = '24px';
    changeBtn.addEventListener('click', () => {
      const reopen = p.id;
      closeProduct(() => { app.pendingProductId = reopen; showGate({ changing: true }); });
    });
    stateLine.append(changeBtn);

    const actions = el('div', { class: 'product__actions' }, [
      el('a', {
        class: 'btn btn--primary btn--lg',
        href: isValidState(app.state) ? waLink(messageProduct(p, app.state)) : waLink(messageGeneral(null)),
        target: '_blank', rel: 'noopener noreferrer',
        html: '<svg class="icon-wa" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 22l5.2-1.4A9.8 9.8 0 1 0 12 2.2Zm0 17.9a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.1 8.1 0 1 1 12 20.1Zm4.5-6c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.3 5.3 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3Z"/></svg><span>Consultar por WhatsApp</span>'
      }),
      el('a', { class: 'btn btn--outline btn--lg', href: CONTACT.phoneHref, text: 'Llamar · ' + CONTACT.phoneLabel }),
      stateLine
    ]);

    productBody.append(
      fig,
      el('p', { class: 'product__brand', text: p.marca }),
      el('h2', { class: 'product__model', id: 'product-title', text: p.modelo }),
      el('p', { class: 'product__cat', text: p.categoria }),
      specs,
      desc,
      alt,
      actions
    );
    productDialog.dataset.productId = p.id;
    return true;
  }

  let productOpenerKeep = false;

  function openProduct(id, opener) {
    if (!isValidState(app.state)) {
      app.pendingProductId = id;
      showGate({ changing: false });
      return;
    }
    if (!app.products.length) { app.pendingProductId = id; return; }
    if (!renderProduct(id)) return;

    if (closingTimer) { window.clearTimeout(closingTimer); closingTimer = null; }
    if (!productOpenerKeep) {
      let candidate = opener || document.activeElement;
      // Si quien abrió la ficha no está visible (p. ej. el acceso por estado), el foco vuelve a la tarjeta.
      if (!candidate || candidate === document.body || candidate.closest('#gate')) {
        candidate = $('.card[data-id="' + id + '"] .card__cta') || $('#catalog-title');
      }
      productOpener = candidate;
    }
    productOpenerKeep = false;

    if (!productDialog.open) {
      if (typeof productDialog.showModal === 'function') productDialog.showModal();
      else productDialog.setAttribute('open', '');
      document.body.classList.add('dialog-open');
    }
    productBody.scrollTop = 0;
    window.requestAnimationFrame(() => productDialog.classList.add('is-shown'));
    productClose.focus();

    if (window.location.hash !== '#armazon=' + id) {
      history.replaceState(null, '', window.location.pathname + window.location.search + '#armazon=' + id);
    }
  }

  function closeProduct(after) {
    if (!productDialog.open) { if (after) after(); return; }
    const finish = () => {
      productDialog.classList.remove('is-shown');
      if (productDialog.open) productDialog.close();
      document.body.classList.remove('dialog-open');
      delete productDialog.dataset.productId;
      if (/^#armazon=/.test(window.location.hash)) {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#armazones');
      }
      if (productOpener && document.contains(productOpener)) productOpener.focus();
      productOpener = null;
      if (after) after();
    };
    if (reduced()) { finish(); return; }
    productDialog.classList.remove('is-shown');
    closingTimer = window.setTimeout(() => { closingTimer = null; finish(); }, 240);
  }

  productClose.addEventListener('click', () => closeProduct());
  productDialog.addEventListener('cancel', (e) => { e.preventDefault(); closeProduct(); });
  productDialog.addEventListener('click', (e) => { if (e.target === productDialog) closeProduct(); });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-product]');
    if (!btn || btn.closest('#product-dialog')) return;
    e.preventDefault();
    openProduct(btn.dataset.openProduct, btn);
  });

  function handleHash() {
    const m = /^#armazon=([a-z0-9-]+)$/i.exec(window.location.hash || '');
    if (!m) return;
    const id = m[1];
    if (!app.products.length) { app.pendingProductId = id; return; }
    if (!findProduct(id)) return;
    openProduct(id, $('#catalog-title'));
  }
  window.addEventListener('hashchange', () => {
    if (/^#armazon=/.test(window.location.hash)) handleHash();
    else if (productDialog.open) closeProduct();
  });

  /* ------------------------------------------------------------------
     Tarifas futuras (no se renderizan con la bandera desactivada)
     ------------------------------------------------------------------ */
  function renderLensPricing() {
    const box = $('#lens-pricing');
    if (!box) return;
    if (!PRICING.SHOW_PUBLIC_PRICES || !isValidState(app.state)) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    const region = getRegion(app.state);
    const tier = PRICING.lentes[region];
    const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: PRICING.currency, maximumFractionDigits: 0 });
    const table = el('table', null, [
      el('caption', { text: 'Tipos de lentes desde, para ' + app.state }),
      el('thead', null, [el('tr', null, [el('th', { text: 'Tipo de lente' }), el('th', { text: 'Desde' })])]),
      el('tbody', null, Object.keys(tier).map((k) => el('tr', null, [el('td', { text: k }), el('td', { text: fmt.format(tier[k]) })])))
    ]);
    box.innerHTML = '';
    box.append(table, el('p', { class: 'section__note', text: 'Tarifas orientativas de tipos de lentes; no incluyen el armazón. Confirma la cotización por WhatsApp.' }));
    box.hidden = false;
  }

  /* ------------------------------------------------------------------
     8. MOVIMIENTO, MAPA Y ARRANQUE
     ------------------------------------------------------------------ */
  function setupReveal() {
    const targets = $$('[data-reveal]');
    if (reduced() || !('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach((t) => io.observe(t));
  }

  function setupMap() {
    const iframe = $('#map-iframe');
    const fallback = $('#map-fallback');
    if (!iframe || !fallback) return;
    let loaded = false;
    iframe.addEventListener('load', () => { loaded = true; fallback.hidden = true; });
    iframe.addEventListener('error', () => { fallback.hidden = false; });
    if (navigator.onLine === false) { fallback.hidden = false; }
    // Si en 12 s no ha cargado (bloqueo, sin red), se muestra la alternativa.
    const check = () => { if (!loaded) fallback.hidden = false; };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); window.setTimeout(check, 12000); }
      });
      io.observe(iframe);
    } else {
      window.setTimeout(check, 12000);
    }
  }

  function init() {
    if (!reduced()) document.documentElement.classList.add('smooth');
    $('#year').textContent = String(new Date().getFullYear());
    chip.classList.add('is-empty');
    updateGeneralLinks();

    // Estado guardado: sólo se acepta si coincide con el listado oficial.
    const saved = storage.get();
    const hashMatch = /^#armazon=([a-z0-9-]+)$/i.exec(window.location.hash || '');
    if (hashMatch) app.pendingProductId = hashMatch[1];

    if (isValidState(saved)) {
      applyState(saved);
      gate.root.hidden = true;
      setPageBlocked(false);
      document.body.classList.add('is-ready');
    } else {
      showGate({ changing: false });
    }

    setupReveal();
    setupMap();
    onScroll();
    loadCatalog();
  }

  // API mínima de sólo lectura para pruebas y depuración.
  window.VisionPorMexico = Object.freeze({
    getState: () => app.state,
    getRegion: () => getRegion(app.state),
    regionOf: getRegion,
    states: STATES.slice(),
    pricing: PRICING,
    normalize
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
