(() => {
  const raiz = document.querySelector("main") || document.body;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const todos = [...raiz.querySelectorAll("*")].filter((e) => !(e instanceof SVGElement) || e.tagName === "svg");
  const desc = (el) => {
    const cls = (typeof el.className === "string" ? el.className : el.getAttribute("class") || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((c) => "." + c.replace(/^(.+?)-module__[A-Za-z0-9]+__/, "$1/"))
      .join("");
    return el.tagName.toLowerCase() + cls + (el.id ? "#" + el.id : "");
  };
  const profundidad = (el) => {
    let d = 0;
    while (el && el !== raiz) {
      d++;
      el = el.parentElement;
    }
    return d;
  };
  let maxProf = 0;
  let sumaProf = 0;
  let masProfundo = "";
  const envoltorios = [];
  const desbordes = [];
  const fueraVentana = [];
  const negativos = [];
  const apilamiento = [];
  const toquesChicos = [];
  const contenidoDesborda = [];
  const textoChico = [];
  const posicionados = { absolute: 0, fixed: 0, sticky: 0, relative: 0 };
  for (const el of todos) {
    const p = profundidad(el);
    if (p > maxProf) {
      maxProf = p;
      masProfundo = desc(el);
    }
    sumaProf += p;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.position in posicionados) posicionados[cs.position]++;
    const textoPropio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (el.children.length === 1 && !textoPropio && (el.tagName === "DIV" || el.tagName === "SPAN")) {
      const conEstilo =
        cs.backgroundColor !== "rgba(0, 0, 0, 0)" ||
        cs.borderTopWidth !== "0px" ||
        cs.borderBottomWidth !== "0px" ||
        cs.borderLeftWidth !== "0px" ||
        cs.borderRightWidth !== "0px" ||
        cs.paddingTop !== "0px" ||
        cs.paddingBottom !== "0px" ||
        cs.paddingLeft !== "0px" ||
        cs.paddingRight !== "0px" ||
        cs.position !== "static" ||
        cs.overflow !== "visible" ||
        cs.boxShadow !== "none" ||
        cs.transform !== "none" ||
        cs.borderRadius !== "0px" ||
        cs.opacity !== "1";
      envoltorios.push({ el: desc(el), conEstilo, display: cs.display, hijo: desc(el.children[0]) });
    }
    const m = [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft].map(parseFloat);
    if (m.some((v) => v < -0.5)) negativos.push({ el: desc(el), margen: m.map(Math.round) });
    const contexto =
      (cs.position !== "static" && cs.zIndex !== "auto") ||
      cs.position === "fixed" ||
      cs.position === "sticky" ||
      cs.transform !== "none" ||
      cs.opacity !== "1" ||
      cs.isolation === "isolate" ||
      cs.filter !== "none" ||
      (cs.contain || "").includes("paint");
    if (contexto) {
      apilamiento.push({
        el: desc(el),
        position: cs.position,
        z: cs.zIndex,
        motivo: cs.zIndex !== "auto" ? "z-index" : cs.position === "fixed" || cs.position === "sticky" ? cs.position : cs.transform !== "none" ? "transform" : cs.opacity !== "1" ? "opacity" : "otro",
      });
    }
    if (cs.overflowY === "visible" && cs.display !== "inline" && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) {
      contenidoDesborda.push({ el: desc(el), alto: el.clientHeight, contenido: el.scrollHeight });
    }
    if (cs.overflow === "visible" && r.width > 0) {
      for (const h of el.children) {
        const hr = h.getBoundingClientRect();
        if (hr.width === 0 && hr.height === 0) continue;
        const hcs = getComputedStyle(h);
        if (hcs.position === "fixed") continue;
        const fuera = { der: hr.right - r.right, izq: r.left - hr.left, arr: r.top - hr.top, aba: hr.bottom - r.bottom };
        const max = Math.max(fuera.der, fuera.izq, fuera.arr, fuera.aba);
        if (max > 1) {
          desbordes.push({
            padre: desc(el),
            hijo: desc(h),
            fuera: Object.fromEntries(
              Object.entries(fuera)
                .filter(([, v]) => v > 1)
                .map(([k, v]) => [k, Math.round(v)]),
            ),
            posHijo: hcs.position,
          });
        }
      }
    }
    if (r.width > 0 && r.right > vw + 1 && cs.position !== "fixed") {
      let a = el.parentElement;
      let recortado = false;
      while (a && a !== raiz.parentElement) {
        const ov = getComputedStyle(a).overflowX;
        if (ov === "auto" || ov === "scroll" || ov === "hidden" || ov === "clip") {
          recortado = true;
          break;
        }
        a = a.parentElement;
      }
      if (!recortado) fueraVentana.push({ el: desc(el), derecha: Math.round(r.right - vw) });
    }
    const interactivo = el.matches('a[href], button, input, select, textarea, [role="button"], [role="tab"], label');
    if (interactivo && r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
      toquesChicos.push({ el: desc(el), w: Math.round(r.width), h: Math.round(r.height), texto: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30) });
    }
    if (textoPropio) {
      const fs = parseFloat(cs.fontSize);
      if (fs < 12) textoChico.push({ el: desc(el), fs });
    }
  }
  const inter = todos
    .filter((e) => e.matches('a[href], button, [role="button"]'))
    .map((e) => ({ e, r: e.getBoundingClientRect() }))
    .filter((x) => x.r.width > 0);
  const pegados = [];
  for (let i = 0; i < inter.length; i++) {
    for (let j = i + 1; j < inter.length; j++) {
      if (inter[i].e.contains(inter[j].e) || inter[j].e.contains(inter[i].e)) continue;
      const a = inter[i].r;
      const b = inter[j].r;
      const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
      const d = Math.hypot(dx, dy);
      if (d < 8) pegados.push({ a: desc(inter[i].e), b: desc(inter[j].e), distancia: Math.round(d), solapan: dx === 0 && dy === 0 });
    }
  }
  // Contraste del glifo de cada botón contra el fondo real que tiene debajo (WCAG 2.1: 3:1 para controles).
  const lum = (c) => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    const v = [m[1], m[2], m[3]].map((x) => { const n = parseFloat(x) / 255; return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4); });
    return { l: 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
  };
  const fondoDe = (el) => {
    let e = el;
    while (e && e !== document.documentElement) { const f = lum(getComputedStyle(e).backgroundColor); if (f && f.a > 0.9) return f.l; e = e.parentElement; }
    return 1;
  };
  const contraste = [];
  for (const b of raiz.querySelectorAll("button, a[href], [role=\"button\"]")) {
    const svg = b.querySelector("svg");
    if (!svg) continue;
    const r = b.getBoundingClientRect();
    if (r.width === 0) continue;
    const g = lum(getComputedStyle(svg).color);
    if (!g) continue;
    const fondo = fondoDe(b);
    const ratio = (Math.max(g.l, fondo) + 0.05) / (Math.min(g.l, fondo) + 0.05);
    if (ratio < 3) contraste.push({ el: desc(b), ratio: +ratio.toFixed(2), etiqueta: (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 24) });
  }
  const franjas = {};
  for (const h of document.querySelectorAll("header")) {
    const r = h.getBoundingClientRect();
    franjas[desc(h)] = { top: Math.round(r.top), alto: Math.round(r.height), position: getComputedStyle(h).position };
  }
  const nav = document.querySelector("nav");
  if (nav) {
    const r = nav.getBoundingClientRect();
    franjas[desc(nav)] = { top: Math.round(r.top), alto: Math.round(r.height), position: getComputedStyle(nav).position };
  }
  const mainRect = raiz.getBoundingClientRect();
  return {
    url: location.pathname + location.search,
    vw,
    vh,
    raiz: desc(raiz),
    mainAncho: Math.round(mainRect.width),
    nodos: todos.length,
    profundidadMax: maxProf,
    masProfundo,
    profundidadMedia: +(sumaProf / Math.max(1, todos.length)).toFixed(1),
    scrollHorizontal: document.documentElement.scrollWidth > vw + 1,
    anchoDocumento: document.documentElement.scrollWidth,
    altoDocumento: document.documentElement.scrollHeight,
    posicionados,
    franjas,
    envoltorios,
    desbordes,
    fueraVentana,
    negativos,
    apilamiento,
    toquesChicos,
    contenidoDesborda,
    textoChico,
    pegados: pegados.slice(0, 60),
    contraste,
  };
})()
