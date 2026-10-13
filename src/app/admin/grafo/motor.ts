import * as THREE from "three";
import type { Grafo } from "@/lib/grafo";

/**
 * El motor del grafo cultural en 3D (OL-401, bitácora 432): el prototipo firmado de la rama grafo-3d (`docs/rediseno/prototipos/grafo-3d.html`)
 * pasado a TypeScript con la misma lógica. React pone el armazón (barra, columnas, botones) y este módulo, que solo se carga al entrar a
 * `/admin/grafo`, llena el árbol y la lista, dibuja la escena con three.js y atiende los gestos. Se dibuja solo cuando algo cambia (no hay
 * bucle fijo) y `destruir()` lo deja todo como estaba (escuchas, geometrías, materiales y el contexto de WebGL).
 */

export type Estilos = Record<string, string>;
type Tipo = "lugar" | "artista" | "persona" | "resumen";
type Nodo = {
  tipo: Tipo;
  clase: string;
  nombre: string;
  x: number;
  y: number;
  z: number;
  peso: number;
  seguidores?: number;
  asistentes?: number;
  eventos?: number;
  proximos?: number;
  d?: number[];
  ciudad?: string;
  fechas?: number;
  lugares?: number;
  suelto?: boolean;
  sitioLibre?: boolean;
  tramo?: number;
  inventada?: boolean;
};
type Linea = { a: number; b: number; t: string; w: number; d: number[]; par?: "artista" | "lugar" | "persona" };
type Filtro = { tipo: string | null; clase: string | null };
type Item = { i?: number; nombre: string; sub?: string; color: string; grupo?: boolean; n?: number };
type Resultado = { titulo: string; items: Item[] };
type Lente = { id: string; titulo: string; sub: string; aplicar: () => Resultado };
type Paso = ((t: number) => void) | null;
type Parte = string | { b: string };

/** Desde este ancho (el corte de 1048 de las hojas de estilo) árbol y lista son columnas; antes, hojas. */
const COLUMNAS = "(min-width: 1048px)";

const ETIQUETA: Record<string, string> = {
  casa_de_cultura: "Casa de cultura",
  museo: "Museo",
  foro: "Foro",
  galeria: "Galería",
  escuela: "Escuela",
  colectivo: "Colectivo",
  biblioteca: "Biblioteca",
  cafe_bar: "Café o bar",
  plaza: "Plaza",
  otro: "Otro",
  musica: "Música",
  teatro: "Teatro",
  danza: "Danza",
  artes_visuales: "Artes visuales",
  letras: "Letras",
  cine: "Cine",
  circo: "Circo",
  por_completar: "Por completar",
};
const etiqueta = (k: string) => ETIQUETA[k] ?? k;
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const NIVEL = ["baja", "media", "alta"];

/** Un elemento con clase y texto (nunca innerHTML con lo que viene de la base). */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase = "", texto = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto) e.textContent = texto;
  return e;
}

export type Motor = { destruir: () => void };

export function crearMotor(DATOS: Grafo, raiz: HTMLElement, S: Estilos): Motor {
  const limpiezas: Array<() => void> = [];
  const escuchar = <T extends EventTarget>(blanco: T, tipo: string, fn: (ev: never) => void, opciones?: AddEventListenerOptions) => {
    blanco.addEventListener(tipo, fn as EventListener, opciones);
    limpiezas.push(() => blanco.removeEventListener(tipo, fn as EventListener, opciones));
  };
  const q = <T extends HTMLElement>(nombre: string) => raiz.querySelector(`[data-g="${nombre}"]`) as T;
  const lienzo = q<HTMLCanvasElement>("lienzo");
  const arbol = q<HTMLElement>("arbol");
  const lista = q<HTMLElement>("lista");
  const rotulo = q<HTMLDivElement>("rotulo");
  const capaVecinos = q<HTMLDivElement>("vecinos");
  const capaEtiquetas = q<HTMLDivElement>("etiquetas");
  const tarjeta = q<HTMLElement>("tarjeta");
  const fpsEl = q<HTMLElement>("fps");

  // ---------- Nodos ----------
  const nodos: Nodo[] = [];
  for (const l of DATOS.lugares) nodos.push({ tipo: "lugar", clase: l.tipo, nombre: l.nombre, x: l.x, y: 0, z: l.z, peso: l.seguidores + l.asistentes, seguidores: l.seguidores, asistentes: l.asistentes, eventos: l.eventos, proximos: l.proximos, d: l.d, ciudad: l.ciudad });
  const baseArt = nodos.length;
  for (const a of DATOS.artistas) nodos.push({ tipo: "artista", clase: a.disciplina, nombre: a.nombre, x: a.x, y: a.y, z: a.z, peso: a.seguidores + a.asistentes, seguidores: a.seguidores, asistentes: a.asistentes, fechas: a.fechas, lugares: a.lugares || 0, suelto: !!a.suelto, sitioLibre: !!a.sitioLibre, ciudad: a.ciudad });
  const basePer = nodos.length;
  DATOS.personas.forEach((p, i) => nodos.push({ tipo: "persona", clase: "persona", nombre: `Asistente anónimo ${i + 1}`, x: p.x, y: p.y, z: p.z, peso: p.tramo, tramo: p.tramo, inventada: true }));
  // El nodo resumen de los que no tienen ninguna conexión: uno solo, en el anillo exterior
  const RESUMEN = nodos.length;
  nodos.push({ tipo: "resumen", clase: "resumen", nombre: `${DATOS.resumen.artistasSueltos} artistas por conectar`, x: 620, y: 0, z: -620, peso: 0 });
  const sueltos: number[] = [];
  nodos.forEach((n, i) => {
    if (n.suelto) sueltos.push(i);
  });

  // ---------- Líneas (con sus días, para el tiempo) ----------
  const aristas: Linea[] = DATOS.aristas.map(([t, a, b, w, d]) =>
    t === "a"
      ? { a: baseArt + a, b, t: "toca en", w, d }
      : t === "pl"
        ? { a: basePer + a, b, t: "va a", w, d }
        : t === "pa"
          ? { a: basePer + a, b: baseArt + b, t: "fue a ver a", w, d }
          : t === "aa"
            ? { a: baseArt + a, b: baseArt + b, t: "tocan juntos", w, d, par: "artista" as const }
            : t === "ll"
              ? { a, b, t: "mismo festival", w, d, par: "lugar" as const }
              : { a: basePer + a, b: basePer + b, t: "coinciden en eventos", w, d, par: "persona" as const },
  );
  const vecinos: number[][] = nodos.map(() => []);
  aristas.forEach((e, i) => {
    vecinos[e.a].push(i);
    vecinos[e.b].push(i);
  });
  const otro = (e: Linea, i: number) => (e.a === i ? e.b : e.a);

  // ---------- Estado ----------
  let factorTamano = 1;
  let factorAltura = 1;
  let mostrarSueltos = false;
  let mostrarLineas = true;
  let filtro: Filtro = { tipo: null, clase: null };
  let seleccion = -1;
  let primero = new Set<number>();
  let segundo = new Set<number>();
  let enfoque: Set<number> | null = null; // una lente puede enfocar un conjunto de nodos
  let lenteActiva: string | null = null;
  let vista: "mapa" | "red" = "mapa";
  let hasta = DATOS.ultimoDia;
  let ventana = Infinity; // la línea está activa si tiene un evento en (hasta − ventana, hasta]
  const todoElTiempo = () => ventana === Infinity && hasta >= DATOS.ultimoDia;
  const activa = (e: Linea) => todoElTiempo() || e.d.some((x) => x > hasta - ventana && x <= hasta);
  const activas = aristas.map(() => true);
  const recalcularTiempo = () => aristas.forEach((e, i) => (activas[i] = activa(e)));

  function radio(n: Nodo): number {
    if (n.tipo === "resumen") return 26 * factorTamano;
    if (n.tipo === "persona") return (4 + 3 * (n.tramo ?? 1)) * factorTamano;
    if (n.suelto) return 2.5 * factorTamano;
    return (5 + 4 * Math.sqrt(Math.min(n.peso, 64))) * factorTamano;
  }

  // ---------- Escena ----------
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    throw new Error("sin-webgl");
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(50, 1, 1, 30000);
  // Iluminación de estudio: ambiente suave, luz clave cálida desde arriba a la derecha, relleno frío desde la izquierda y un contraluz que recorta las esferas del fondo.
  escena.add(new THREE.HemisphereLight(0xffffff, 0x2a2438, 0.55));
  const clave = new THREE.DirectionalLight(0xfff4e6, 2.2);
  clave.position.set(700, 1300, 900);
  escena.add(clave);
  const relleno = new THREE.DirectionalLight(0xdde6ff, 0.7);
  relleno.position.set(-900, 400, -300);
  escena.add(relleno);
  const contraluz = new THREE.DirectionalLight(0xffffff, 1.1);
  contraluz.position.set(-300, 500, -1200);
  escena.add(contraluz);
  // Esferas finas (48×32 caras) con material físico: un poco de brillo, nada de metal. Una sola malla instanciada.
  const geo = new THREE.SphereGeometry(1, 48, 32);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.05 });
  const malla = new THREE.InstancedMesh(geo, mat, nodos.length);
  malla.frustumCulled = false;
  escena.add(malla);
  const m4 = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const q4 = new THREE.Quaternion();
  const ARRIBA = new THREE.Vector3(0, 1, 0);
  const esc3 = new THREE.Vector3();

  // Anillos de 1 km en el suelo
  const anillos = new THREE.Group();
  for (let km = 1; km <= 10; km++) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * km * 100, 0, Math.sin(a) * km * 100));
    }
    anillos.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: km % 5 === 0 ? 0.16 : 0.06 })));
  }
  escena.add(anillos);

  // Líneas como tubos finos (grosor por peso): tenues (todas), destacadas (las del elegido) y de segundo paso
  const geoTubo = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  function tubos(opacidad: number) {
    const m = new THREE.InstancedMesh(geoTubo, new THREE.MeshBasicMaterial({ transparent: true, opacity: opacidad, depthWrite: false }), Math.max(1, aristas.length));
    m.frustumCulled = false;
    m.count = 0;
    escena.add(m);
    return m;
  }
  const tenues = tubos(0.22);
  const destacadas = tubos(0.9);
  const segundas = tubos(0.42);

  // El anillo del elegido
  const geoAro = new THREE.RingGeometry(1.35, 1.6, 48);
  const aro = new THREE.Mesh(geoAro, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
  aro.visible = false;
  escena.add(aro);
  // Marcas de zonas sin lugar (lente 1): discos planos en el suelo
  const geoDisco = new THREE.CircleGeometry(46, 24);
  geoDisco.rotateX(-Math.PI / 2);
  const zonasMesh = new THREE.InstancedMesh(geoDisco, new THREE.MeshBasicMaterial({ color: 0xd35400, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }), 400);
  zonasMesh.count = 0;
  zonasMesh.frustumCulled = false;
  zonasMesh.visible = false;
  escena.add(zonasMesh);

  // ---------- Colores por tema (de los tokens de la app; en oscuro, lugares y asistentes un poco más claros para que se lean sobre la banda) ----------
  const colores = {} as Record<"lugar" | "artista" | "persona" | "suelto" | "sel" | "resumen" | "fondo" | "cruzada", THREE.Color>;
  const mezclar = (c: THREE.Color, con: THREE.Color, k: number) => c.clone().lerp(con, k);
  let claro = false;
  function leerTema() {
    claro = raiz.dataset.tema === "claro";
    const cs = getComputedStyle(raiz);
    const token = (n: string) => new THREE.Color(cs.getPropertyValue(n).trim() || "#808080");
    const blanco = new THREE.Color(1, 1, 1);
    const primario = token("--primario");
    const destacado = token("--destacado");
    const suave = token("--texto-suave");
    colores.lugar = claro ? primario : mezclar(primario, blanco, 0.2);
    colores.artista = claro ? token("--texto") : token("--fondo-contenido");
    colores.persona = claro ? destacado : mezclar(destacado, blanco, 0.2);
    colores.suelto = claro ? mezclar(token("--borde"), suave, 0.5) : mezclar(suave, blanco, 0.4);
    colores.sel = claro ? token("--texto") : blanco;
    colores.resumen = colores.suelto;
    colores.fondo = token(claro ? "--fondo-contenido" : "--banda");
    colores.cruzada = claro ? token("--texto") : blanco;
    for (const k of ["lugar", "artista", "persona", "suelto"] as const) raiz.style.setProperty(`--g-c-${k}`, `#${colores[k].getHexString()}`);
    anillos.children.forEach((l, i) => {
      const material = (l as THREE.Line).material as THREE.LineBasicMaterial;
      material.color.set(claro ? 0x000000 : 0xffffff);
      material.opacity = (i + 1) % 5 === 0 ? 0.15 : 0.055;
    });
    (aro.material as THREE.MeshBasicMaterial).color.copy(colores.sel);
    (zonasMesh.material as THREE.MeshBasicMaterial).color.copy(destacado);
  }
  const colorNodo = (n: Nodo) => (n.tipo === "persona" ? colores.persona : n.tipo === "lugar" ? colores.lugar : n.tipo === "resumen" ? colores.resumen : n.suelto ? colores.suelto : colores.artista);
  const colorLinea = (e: Linea) => (e.par ? colores[e.par] : colores.cruzada);

  // ---------- Posiciones: mapa (geografía) y red (fuerzas), con transición ----------
  const posMapa = nodos.map((n) => [n.x, n.y, n.z]);
  let posRed: number[][] | null = null;
  const pos = posMapa.map((p) => p.slice());
  let transicion: Paso = null;
  function calcularRed() {
    // Fuerzas sencillas (Fruchterman-Reingold en 3D) sobre los nodos con alguna conexión; cada uno tira suavemente hacia la altura de su capa.
    // Solo los nodos con alguna línea entran en las fuerzas; los lugares sin ninguna van a un anillo aparte, para que no manden en la escala.
    // Sin azar: los nodos que empiezan encimados se separan en una dirección que sale de su número.
    const ids: number[] = [];
    const sinLinea: number[] = [];
    nodos.forEach((n, i) => {
      if (n.tipo === "resumen" || n.suelto) return;
      if (vecinos[i].length) ids.push(i);
      else sinLinea.push(i);
    });
    const k = 120;
    const P = ids.map((i) => [posMapa[i][0] * 0.5, posMapa[i][1], posMapa[i][2] * 0.5]);
    const donde = new Map(ids.map((id, j) => [id, j]));
    const E = aristas.map((e) => [donde.get(e.a), donde.get(e.b), e.w] as const).filter((x): x is readonly [number, number, number] => x[0] !== undefined && x[1] !== undefined);
    const capa = (i: number) => (nodos[i].tipo === "lugar" ? 0 : nodos[i].tipo === "artista" ? 90 : -90);
    let t = 60;
    for (let it = 0; it < 260; it++) {
      const D = P.map(() => [0, 0, 0]);
      for (let i = 0; i < P.length; i++)
        for (let j = i + 1; j < P.length; j++) {
          let dx = P[i][0] - P[j][0];
          let dy = P[i][1] - P[j][1];
          let dz = P[i][2] - P[j][2];
          let d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 1) {
            dx = Math.sin(i * 12.9898 + j * 78.233) / 2;
            dy = Math.sin(i * 39.346 + j * 11.135) / 2;
            dz = Math.sin(i * 73.156 + j * 52.235) / 2;
            d2 = 1;
          }
          const f = ((k * k) / d2) * 0.9;
          D[i][0] += dx * f;
          D[i][1] += dy * f * 0.25;
          D[i][2] += dz * f;
          D[j][0] -= dx * f;
          D[j][1] -= dy * f * 0.25;
          D[j][2] -= dz * f;
        }
      for (const [a, b, w] of E) {
        const dx = P[a][0] - P[b][0];
        const dy = P[a][1] - P[b][1];
        const dz = P[a][2] - P[b][2];
        const d = Math.hypot(dx, dy, dz) || 1;
        const f = (d / k) * (0.6 + 0.25 * Math.min(w, 6));
        D[a][0] -= dx * f;
        D[a][1] -= dy * f;
        D[a][2] -= dz * f;
        D[b][0] += dx * f;
        D[b][1] += dy * f;
        D[b][2] += dz * f;
      }
      for (let i = 0; i < P.length; i++) {
        D[i][0] -= P[i][0] * 0.012;
        D[i][2] -= P[i][2] * 0.012;
        D[i][1] += (capa(ids[i]) - P[i][1]) * 0.25;
        const m = Math.hypot(D[i][0], D[i][1], D[i][2]) || 1;
        const s = Math.min(m, t) / m;
        P[i][0] += D[i][0] * s;
        P[i][1] += D[i][1] * s;
        P[i][2] += D[i][2] * s;
      }
      t = Math.max(2, t * 0.985);
    }
    // Los cúmulos se repelen entre sí y algunos se van lejos: la escala la fija el percentil 75 y lo que sobra se recoge a 760 (sigue fuera, pero a la vista).
    const n = P.length || 1;
    const mx = P.reduce((s, p) => s + p[0], 0) / n;
    const mz = P.reduce((s, p) => s + p[2], 0) / n;
    for (const p of P) {
      p[0] -= mx;
      p[2] -= mz;
    } // centrar en el centro de masa
    const radios = P.map((p) => Math.hypot(p[0], p[2])).sort((x, y) => x - y);
    const R = radios[Math.floor(radios.length * 0.75)] || 1;
    const esc = 500 / R;
    posRed = posMapa.map((p) => p.slice());
    ids.forEach((id, j) => {
      let x = P[j][0] * esc;
      let z = P[j][2] * esc;
      const r = Math.hypot(x, z);
      if (r > 760) {
        x *= 760 / r;
        z *= 760 / r;
      }
      (posRed as number[][])[id] = [x, P[j][1], z];
    });
    sinLinea.forEach((id, j) => {
      const a = (j / sinLinea.length) * Math.PI * 2;
      (posRed as number[][])[id] = [Math.cos(a) * 680, 0, Math.sin(a) * 680];
    });
  }
  function cambiarVista(nueva: "mapa" | "red") {
    if (nueva === vista) return;
    vista = nueva;
    if (vista === "red" && !posRed) calcularRed();
    const desde = pos.map((p) => p.slice());
    const destino = (vista === "red" ? posRed : posMapa) as number[][];
    const t0 = performance.now();
    transicion = (t) => {
      const k = Math.min(1, (t - t0) / 900);
      const e = 1 - Math.pow(1 - k, 3);
      for (let i = 0; i < pos.length; i++) for (let c = 0; c < 3; c++) pos[i][c] = desde[i][c] + (destino[i][c] - desde[i][c]) * e;
      pintar(false);
      if (k >= 1) transicion = null;
    };
    anillos.visible = vista === "mapa";
    zonasMesh.visible = vista === "mapa" && lenteActiva === "zonas";
    animarCamara({ objetivo: new THREE.Vector3(0, 0, 0), distancia: vista === "red" ? 1450 : 1700 }, 900); // la cámara vuelve a encuadrar la nube entera
    botonRed.setAttribute("aria-pressed", String(vista === "red"));
    botonRed.textContent = vista === "red" ? "Mapa" : "Red";
    pedirCuadro();
  }
  const P3 = (i: number) => v3.set(pos[i][0], pos[i][1] * factorAltura, pos[i][2]);

  // ---------- Filtro, enfoque y dibujo ----------
  function pasaFiltro(n: Nodo): boolean {
    if (n.tipo === "resumen") return !mostrarSueltos && (!filtro.tipo || filtro.tipo === "artista");
    if (n.suelto && !mostrarSueltos && filtro.tipo !== "sueltos") return false;
    if (!filtro.tipo) return true;
    if (filtro.tipo === "sueltos") return n.tipo === "artista" && !!n.suelto;
    if (filtro.tipo === "libres") return n.tipo === "artista" && !!n.sitioLibre;
    if (n.tipo !== filtro.tipo) return false;
    if (filtro.tipo === "artista" && filtro.clase === "conectados") return !n.suelto && !n.sitioLibre;
    return !filtro.clase || n.clase === filtro.clase;
  }
  const visible = nodos.map(() => true);
  const activoEnPeriodo = nodos.map(() => true);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  function ponerTubos(mesh: THREE.InstancedMesh, lineas: Linea[], grosor: number) {
    let k = 0;
    for (const e of lineas) {
      va.copy(P3(e.a));
      vb.copy(P3(e.b));
      dir.subVectors(vb, va);
      const len = dir.length() || 0.001;
      dir.divideScalar(len);
      mid.addVectors(va, vb).multiplyScalar(0.5);
      q4.setFromUnitVectors(ARRIBA, dir);
      const r = (0.5 + 0.35 * Math.sqrt(e.w)) * grosor;
      m4.compose(mid, q4, esc3.set(r, len, r));
      mesh.setMatrixAt(k, m4);
      mesh.setColorAt(k, colorLinea(e));
      k++;
    }
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  function pintar(recalcular = true) {
    const haySel = seleccion >= 0;
    if (recalcular) {
      const conAlguna = nodos.map(() => false);
      aristas.forEach((e, i) => {
        if (activas[i]) {
          conAlguna[e.a] = true;
          conAlguna[e.b] = true;
        }
      });
      nodos.forEach((_, i) => {
        activoEnPeriodo[i] = conAlguna[i] || vecinos[i].length === 0;
      });
    }
    for (let i = 0; i < nodos.length; i++) {
      const n = nodos[i];
      const pasa = pasaFiltro(n);
      visible[i] = pasa;
      let r = pasa ? radio(n) : 0.0001;
      let c = colorNodo(n);
      if (pasa) {
        if (haySel) {
          if (i === seleccion) {
            c = colores.sel;
            r *= 1.15;
          } else if (primero.has(i)) r *= 1.05;
          else if (segundo.has(i)) c = c.clone().lerp(colores.fondo, 0.45);
          else {
            c = c.clone().lerp(colores.fondo, 0.8);
            r *= 0.7;
          }
        } else if (enfoque && !enfoque.has(i)) {
          c = c.clone().lerp(colores.fondo, 0.78);
          r *= 0.7;
        } else if (!activoEnPeriodo[i]) {
          c = c.clone().lerp(colores.fondo, 0.7);
          r *= 0.75;
        }
      }
      m4.makeScale(r, r, r).setPosition(pos[i][0], pos[i][1] * factorAltura, pos[i][2]);
      malla.setMatrixAt(i, m4);
      malla.setColorAt(i, c);
    }
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    // líneas: las del elegido, las del segundo paso y las demás tenues
    const mias = new Set(haySel ? vecinos[seleccion].filter((i) => activas[i]) : []);
    const deSegundo = new Set<number>();
    if (haySel)
      aristas.forEach((e, i) => {
        if (mias.has(i) || !activas[i] || !visible[e.a] || !visible[e.b]) return;
        const pa = primero.has(e.a);
        const pb = primero.has(e.b);
        if ((pa && (pb || segundo.has(e.b))) || (pb && segundo.has(e.a))) deSegundo.add(i);
      });
    ponerTubos(tenues, mostrarLineas ? aristas.filter((e, i) => activas[i] && visible[e.a] && visible[e.b] && !mias.has(i) && !deSegundo.has(i) && (!enfoque || (enfoque.has(e.a) && enfoque.has(e.b)))) : [], 1);
    (tenues.material as THREE.MeshBasicMaterial).opacity = (claro ? 0.2 : 0.22) * (haySel ? 0.4 : 1);
    ponerTubos(destacadas, [...mias].map((i) => aristas[i]), 1.5);
    ponerTubos(segundas, [...deSegundo].map((i) => aristas[i]), 1.2);
    if (haySel) {
      aro.visible = true;
      aro.position.copy(P3(seleccion));
      const r = radio(nodos[seleccion]) * 1.15;
      aro.scale.set(r, r, r);
    } else aro.visible = false;
    pedirCuadro();
  }
  function seleccionar(i: number, volar = false) {
    seleccion = i;
    primero = new Set();
    segundo = new Set();
    if (i >= 0) {
      for (const ei of vecinos[i]) if (activas[ei]) primero.add(otro(aristas[ei], i));
      for (const p of primero) for (const ei of vecinos[p]) if (activas[ei]) {
        const o = otro(aristas[ei], p);
        if (o !== i && !primero.has(o)) segundo.add(o);
      }
    }
    pintarTarjeta();
    pintar();
    pintarLista();
    if (i >= 0 && volar) volarA(i);
  }

  // ---------- Cámara ----------
  const cam = { objetivo: new THREE.Vector3(0, 0, 0), distancia: 1700, theta: -0.35, phi: 0.95 };
  const camInicial = { ...cam, objetivo: cam.objetivo.clone() };
  let animacion: Paso = null;
  let desdeArriba = false;
  function colocarCamara() {
    const d = cam.distancia;
    const sp = Math.sin(cam.phi);
    camara.position.set(cam.objetivo.x + d * sp * Math.sin(cam.theta), cam.objetivo.y + d * Math.cos(cam.phi), cam.objetivo.z + d * sp * Math.cos(cam.theta));
    camara.lookAt(cam.objetivo);
    aro.quaternion.copy(camara.quaternion);
  }
  function acotar() {
    cam.phi = Math.min(1.5, Math.max(0.05, cam.phi));
    cam.distancia = Math.min(6000, Math.max(60, cam.distancia));
  }
  type Destino = { objetivo?: THREE.Vector3; distancia?: number; phi?: number; theta?: number };
  function animarCamara(hastaC: Destino, ms = 650) {
    const desde = { objetivo: cam.objetivo.clone(), distancia: cam.distancia, phi: cam.phi, theta: cam.theta };
    const t0 = performance.now();
    animacion = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      if (hastaC.objetivo) cam.objetivo.lerpVectors(desde.objetivo, hastaC.objetivo, e);
      if (hastaC.distancia !== undefined) cam.distancia = desde.distancia + (hastaC.distancia - desde.distancia) * e;
      if (hastaC.phi !== undefined) cam.phi = desde.phi + (hastaC.phi - desde.phi) * e;
      if (hastaC.theta !== undefined) cam.theta = desde.theta + (hastaC.theta - desde.theta) * e;
      if (k >= 1) animacion = null;
    };
    pedirCuadro();
  }
  const volarA = (i: number) => animarCamara({ objetivo: P3(i).clone(), distancia: Math.min(cam.distancia, 520) });
  const botonRed = q<HTMLButtonElement>("red");
  const botonArriba = q<HTMLButtonElement>("arriba");
  function ponerArriba(si: boolean) {
    desdeArriba = si;
    animarCamara(si ? { phi: 0.06, theta: 0 } : { phi: 0.95, theta: -0.35 });
    botonArriba.setAttribute("aria-pressed", String(si));
    botonArriba.textContent = si ? "Volver al 3D" : "Desde arriba";
  }
  const punteros = new Map<number, { x: number; y: number }>();
  let inicioToque: { x: number; y: number; t: number } | null = null;
  let gestoPrevio: { dist: number; cx: number; cy: number } | null = null;
  escuchar(lienzo, "pointerdown", (ev: PointerEvent) => {
    lienzo.setPointerCapture(ev.pointerId);
    punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (punteros.size === 1) inicioToque = { x: ev.clientX, y: ev.clientY, t: performance.now() };
    gestoPrevio = null;
    animacion = null;
  });
  escuchar(lienzo, "pointermove", (ev: PointerEvent) => {
    const p = punteros.get(ev.pointerId);
    if (!p) return;
    const dx = ev.clientX - p.x;
    const dy = ev.clientY - p.y;
    p.x = ev.clientX;
    p.y = ev.clientY;
    if (punteros.size === 1) {
      cam.theta -= dx * 0.006;
      cam.phi -= dy * 0.006;
      acotar();
      if (inicioToque && Math.hypot(ev.clientX - inicioToque.x, ev.clientY - inicioToque.y) > 8) inicioToque = null;
    } else if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      if (gestoPrevio) {
        cam.distancia *= gestoPrevio.dist / dist;
        mover(cx - gestoPrevio.cx, cy - gestoPrevio.cy);
        acotar();
      }
      gestoPrevio = { dist, cx, cy };
      inicioToque = null;
    }
    pedirCuadro();
  });
  // Los arrastres terminan solo con pointerup/pointercancel (en Safari, pointerleave se dispara con el primer movimiento del dedo)
  function soltar(ev: PointerEvent) {
    punteros.delete(ev.pointerId);
    gestoPrevio = null;
    if (inicioToque && punteros.size === 0 && performance.now() - inicioToque.t < 600) elegirEnPantalla(inicioToque.x, inicioToque.y);
    inicioToque = null;
  }
  escuchar(lienzo, "pointerup", soltar);
  escuchar(lienzo, "pointercancel", soltar);
  escuchar(
    lienzo,
    "wheel",
    (ev: WheelEvent) => {
      ev.preventDefault();
      cam.distancia *= Math.exp(ev.deltaY * 0.0012);
      acotar();
      pedirCuadro();
    },
    { passive: false },
  );
  function mover(dx: number, dy: number) {
    const k = cam.distancia * 0.0012;
    const derecha = new THREE.Vector3().setFromMatrixColumn(camara.matrix, 0);
    const arriba = new THREE.Vector3().setFromMatrixColumn(camara.matrix, 1);
    cam.objetivo.addScaledVector(derecha, -dx * k).addScaledVector(arriba, dy * k);
  }
  let repetir: ReturnType<typeof setInterval> | undefined;
  function mando(m: string) {
    if (m === "izq") cam.theta -= 0.12;
    if (m === "der") cam.theta += 0.12;
    if (m === "arriba") cam.phi -= 0.08;
    if (m === "abajo") cam.phi += 0.08;
    if (m === "mas") cam.distancia *= 0.82;
    if (m === "menos") cam.distancia /= 0.82;
    if (m === "centro") {
      cam.objetivo.copy(camInicial.objetivo);
      cam.distancia = camInicial.distancia;
      cam.theta = desdeArriba ? 0 : camInicial.theta;
      cam.phi = desdeArriba ? 0.06 : camInicial.phi;
    }
    acotar();
    pedirCuadro();
  }
  const detenerRepeticion = () => clearInterval(repetir);
  raiz.querySelectorAll<HTMLButtonElement>("[data-mando]").forEach((b) => {
    escuchar(b, "pointerdown", (ev: PointerEvent) => {
      ev.preventDefault();
      const m = b.dataset.mando as string;
      mando(m);
      clearInterval(repetir);
      repetir = setInterval(() => mando(m), 90);
      // Se deja de repetir solo con pointerup/pointercancel, en la ventana (no con pointerleave)
      const fin = () => {
        detenerRepeticion();
        window.removeEventListener("pointerup", fin);
        window.removeEventListener("pointercancel", fin);
      };
      window.addEventListener("pointerup", fin);
      window.addEventListener("pointercancel", fin);
      limpiezas.push(fin);
    });
  });
  limpiezas.push(detenerRepeticion);
  escuchar(window, "keydown", (ev: KeyboardEvent) => {
    const blanco = ev.target as HTMLElement | null;
    if (blanco && ["INPUT", "SELECT", "TEXTAREA"].includes(blanco.tagName)) return;
    const k = ({ ArrowLeft: "izq", ArrowRight: "der", ArrowUp: "arriba", ArrowDown: "abajo", "+": "mas", "-": "menos", Home: "centro" } as Record<string, string>)[ev.key];
    if (k) {
      ev.preventDefault();
      mando(k);
    }
    if (ev.key === "Escape") seleccionar(-1);
  });
  escuchar(botonRed, "click", () => cambiarVista(vista === "red" ? "mapa" : "red"));
  escuchar(botonArriba, "click", () => ponerArriba(!desdeArriba));

  // Tocar: el nodo más cercano en pantalla (22 px más el radio aparente)
  const pxPorUnidad = () => lienzo.clientHeight / 2 / (cam.distancia * Math.tan(THREE.MathUtils.degToRad(25)));
  const v3b = new THREE.Vector3();
  function proyectar(i: number) {
    P3(i);
    v3b.copy(v3).project(camara);
    const r = lienzo.getBoundingClientRect();
    return { x: ((v3b.x + 1) / 2) * r.width + r.left, y: ((1 - v3b.y) / 2) * r.height + r.top, dentro: v3b.z < 1 };
  }
  function elegirEnPantalla(px: number, py: number) {
    let mejor = -1;
    let mejorD = Infinity;
    const ppu = pxPorUnidad();
    for (let i = 0; i < nodos.length; i++) {
      if (!visible[i]) continue;
      const p = proyectar(i);
      if (!p.dentro) continue;
      const d = Math.hypot(p.x - px, p.y - py) - Math.min(radio(nodos[i]) * ppu, 40);
      if (d < mejorD) {
        mejorD = d;
        mejor = i;
      }
    }
    if (mejor >= 0 && mejorD < 22) seleccionar(mejor, false);
    else seleccionar(-1);
  }

  // ---------- Rótulos: el elegido, sus vecinos y, de cerca, los lugares ----------
  function pintarRotulos() {
    const r = lienzo.getBoundingClientRect();
    const ppu = pxPorUnidad();
    if (seleccion < 0) {
      rotulo.style.display = "none";
      capaVecinos.replaceChildren();
    } else {
      const p = proyectar(seleccion);
      rotulo.style.display = p.dentro ? "block" : "none";
      rotulo.textContent = nodos[seleccion].nombre;
      // El rótulo se queda dentro de la escena aunque el nodo esté en el borde
      const mitad = rotulo.offsetWidth / 2 + 8;
      const x = Math.min(Math.max(p.x - r.left, mitad), Math.max(mitad, r.width - mitad));
      rotulo.style.transform = `translate(${x.toFixed(0)}px, ${(p.y - r.top).toFixed(0)}px) translate(-50%, calc(-100% - ${(radio(nodos[seleccion]) * ppu + 10).toFixed(0)}px))`;
      const hijos: HTMLElement[] = [];
      let k = 0;
      for (const i of primero) {
        if (k++ > 14) break;
        const o = proyectar(i);
        if (!o.dentro) continue;
        const d = el("div", `${S.rotulo} ${S.vecino}`, nodos[i].nombre);
        d.style.display = "block";
        d.style.transform = `translate(${(o.x - r.left).toFixed(0)}px, ${(o.y - r.top).toFixed(0)}px) translate(-50%, -140%)`;
        hijos.push(d);
      }
      capaVecinos.replaceChildren(...hijos);
    }
    if (cam.distancia < 700 && seleccion < 0) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const cand: { i: number; q: { x: number; y: number }; d: number }[] = [];
      for (let i = 0; i < baseArt; i++) {
        if (!visible[i] || i === seleccion || primero.has(i)) continue;
        const o = proyectar(i);
        if (!o.dentro || o.x < r.left || o.x > r.right || o.y < r.top || o.y > r.bottom) continue;
        cand.push({ i, q: o, d: Math.hypot(o.x - cx, o.y - cy) });
      }
      cand.sort((a, b) => a.d - b.d);
      capaEtiquetas.replaceChildren(
        ...cand.slice(0, 24).map(({ i, q: o }) => {
          const d = el("div", `${S.rotulo} ${S.lugar}`, nodos[i].nombre);
          d.style.display = "block";
          d.style.transform = `translate(${(o.x - r.left).toFixed(0)}px, ${(o.y - r.top + radio(nodos[i]) * ppu + 4).toFixed(0)}px) translate(-50%, 0)`;
          return d;
        }),
      );
    } else capaEtiquetas.replaceChildren();
  }

  // ---------- Tarjeta ----------
  function pintarTarjeta() {
    if (seleccion < 0) {
      tarjeta.dataset.abierta = "false";
      return;
    }
    const n = nodos[seleccion];
    const c = n.tipo === "persona" ? "var(--g-c-persona)" : n.tipo === "lugar" ? "var(--g-c-lugar)" : n.tipo === "resumen" ? "var(--g-c-suelto)" : "var(--g-c-artista)";
    let linea1: string;
    let linea2: string;
    let linea3: string;
    if (n.tipo === "resumen") {
      const porDisc: Record<string, number> = {};
      for (const i of sueltos) porDisc[nodos[i].clase] = (porDisc[nodos[i].clase] || 0) + 1;
      linea1 = "Artistas sin ningún evento ni lugar";
      linea2 = Object.entries(porDisc)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${etiqueta(k)} ${v}`)
        .join(" · ");
      linea3 = "La lista para la siguiente tanda de invitaciones. «Mostrar sin conexión» los dibuja en el anillo exterior.";
    } else {
      if (n.tipo === "lugar") {
        linea1 = `${etiqueta(n.clase)} · ${n.ciudad}`;
        linea2 = `${plural(n.seguidores ?? 0, "seguidor", "seguidores")} · ${plural(n.asistentes ?? 0, "asistencia", "asistencias")} · ${plural(n.eventos ?? 0, "evento", "eventos")}${n.proximos ? ` (${n.proximos} próximos)` : ""}`;
      } else if (n.tipo === "artista") {
        linea1 = `${etiqueta(n.clase)}${n.ciudad !== "San Luis Potosí" ? ` · ${n.ciudad}` : ""}${n.suelto ? " · sin conexión" : n.sitioLibre ? " · solo en sitios libres" : ` · en ${plural(n.lugares ?? 0, "lugar", "lugares")}`}`;
        linea2 = `${plural(n.seguidores ?? 0, "seguidor", "seguidores")} · ${plural(n.asistentes ?? 0, "asistencia", "asistencias")} · ${plural(n.fechas ?? 0, "fecha", "fechas")}`;
      } else {
        linea1 = "Asistente · sin nombre ni perfil";
        linea2 = `Actividad ${NIVEL[(n.tramo ?? 1) - 1]} · posición inventada (la base no guarda dónde está nadie)`;
      }
      const porTipo: Record<string, number> = {};
      let cuenta = 0;
      for (const ei of vecinos[seleccion]) {
        if (!activas[ei]) continue;
        cuenta++;
        const o = nodos[otro(aristas[ei], seleccion)];
        porTipo[o.tipo] = (porTipo[o.tipo] || 0) + 1;
      }
      const partes: string[] = [];
      if (n.tipo === "artista") {
        if (porTipo.artista) partes.push(`toca con ${plural(porTipo.artista, "artista", "artistas")}`);
        if (porTipo.lugar) partes.push(`en ${plural(porTipo.lugar, "lugar", "lugares")}`);
        if (porTipo.persona) partes.push(plural(porTipo.persona, "asistente", "asistentes"));
      } else if (n.tipo === "lugar") {
        if (porTipo.artista) partes.push(plural(porTipo.artista, "artista", "artistas"));
        if (porTipo.lugar) partes.push(`${plural(porTipo.lugar, "lugar", "lugares")} del mismo festival`);
        if (porTipo.persona) partes.push(plural(porTipo.persona, "asistente", "asistentes"));
      } else {
        if (porTipo.lugar) partes.push(`va a ${plural(porTipo.lugar, "lugar", "lugares")}`);
        if (porTipo.artista) partes.push(plural(porTipo.artista, "artista", "artistas"));
        if (porTipo.persona) partes.push(`coincide con ${plural(porTipo.persona, "asistente", "asistentes")}`);
      }
      const periodo = todoElTiempo() ? "" : " en el periodo";
      linea3 = partes.length ? `${plural(cuenta, "conexión", "conexiones")}${periodo}: ${partes.join(" · ")}${segundo.size ? ` · a dos pasos, ${segundo.size}` : ""}` : `sin conexiones${periodo}`;
    }
    const punto = el("span", S.punto);
    punto.style.setProperty("--c", c);
    const texto = el("div");
    texto.append(el("h3", "", n.nombre), el("p", "", linea1), el("p", "", linea2), el("p", "", linea3));
    const cerrar = el("button", S.cerrar, "✕");
    cerrar.type = "button";
    cerrar.setAttribute("aria-label", "Cerrar");
    cerrar.onclick = () => seleccionar(-1);
    tarjeta.replaceChildren(punto, texto, cerrar);
    tarjeta.dataset.abierta = "true";
  }

  // ---------- Cálculos para el diagnóstico y las lentes ----------
  const nombreL = (i: number) => nodos[i].nombre;
  function lugaresDeArtista(i: number) {
    const s = new Set<number>();
    for (const ei of vecinos[i]) {
      const e = aristas[ei];
      if (e.t === "toca en") s.add(e.b);
    }
    return s;
  }
  function artistasDeLugar(i: number) {
    const s = new Set<number>();
    for (const ei of vecinos[i]) {
      const e = aristas[ei];
      if (e.t === "toca en") s.add(e.a);
    }
    return s;
  }
  function componentesDeLugares(): number[][] {
    const con: number[] = [];
    for (let i = 0; i < baseArt; i++) if ((nodos[i].eventos ?? 0) > 0) con.push(i);
    const padre = new Map(con.map((i) => [i, i]));
    const raizDe = (x: number): number => {
      while (padre.get(x) !== x) {
        padre.set(x, padre.get(padre.get(x) as number) as number);
        x = padre.get(x) as number;
      }
      return x;
    };
    const unir = (a: number, b: number) => {
      if (padre.has(a) && padre.has(b)) padre.set(raizDe(a), raizDe(b));
    };
    for (let i = baseArt; i < basePer; i++) {
      const ls = [...lugaresDeArtista(i)];
      for (let k = 1; k < ls.length; k++) unir(ls[0], ls[k]);
    }
    for (const e of aristas) if (e.t === "mismo festival") unir(e.a, e.b);
    const grupos = new Map<number, number[]>();
    for (const i of con) {
      const r = raizDe(i);
      grupos.set(r, [...(grupos.get(r) ?? []), i]);
    }
    return [...grupos.values()].sort((a, b) => b.length - a.length);
  }
  type Celda = { gx: number; gz: number; cx: number; cz: number };
  type Zona = { celdas: Celda[]; cx: number; cz: number; km2: number };
  function zonasSinLugar(): { celdas: Celda[]; zonas: Zona[] } {
    // cuadrícula de 1 km sobre un círculo de 7 km; una celda está «sin lugar» si no hay lugar a menos de 2 km de su centro; las vecinas se juntan en zonas
    const celda = 100;
    const N = 7;
    const cel: Celda[] = [];
    for (let gx = -N; gx < N; gx++)
      for (let gz = -N; gz < N; gz++) {
        const cx = gx * celda + celda / 2;
        const cz = gz * celda + celda / 2;
        if (Math.hypot(cx, cz) > 700) continue;
        let cerca = false;
        for (let i = 0; i < baseArt; i++)
          if (Math.hypot(posMapa[i][0] - cx, posMapa[i][2] - cz) < 200) {
            cerca = true;
            break;
          }
        if (!cerca) cel.push({ gx, gz, cx, cz });
      }
    const clave = (gx: number, gz: number) => `${gx},${gz}`;
    const mapa = new Map(cel.map((c) => [clave(c.gx, c.gz), c]));
    const vistas = new Set<string>();
    const zonas: Zona[] = [];
    for (const c of cel) {
      const k = clave(c.gx, c.gz);
      if (vistas.has(k)) continue;
      const cola = [c];
      vistas.add(k);
      const z: Celda[] = [];
      while (cola.length) {
        const u = cola.pop() as Celda;
        z.push(u);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const kk = clave(u.gx + dx, u.gz + dz);
          const vecina = mapa.get(kk);
          if (vecina && !vistas.has(kk)) {
            vistas.add(kk);
            cola.push(vecina);
          }
        }
      }
      zonas.push({ celdas: z, cx: z.reduce((s, u) => s + u.cx, 0) / z.length, cz: z.reduce((s, u) => s + u.cz, 0) / z.length, km2: z.length });
    }
    zonas.sort((a, b) => b.km2 - a.km2);
    return { celdas: cel, zonas };
  }
  function rumbo(cx: number, cz: number) {
    const d = Math.hypot(cx, cz) / 100;
    const ang = ((Math.atan2(cx, -cz) * 180) / Math.PI + 360) % 360;
    const n = ["norte", "noreste", "este", "sureste", "sur", "suroeste", "oeste", "noroeste"][Math.round(ang / 45) % 8];
    return `${d.toFixed(1)} km al ${n} del centro`;
  }
  const cache: { zonas?: ReturnType<typeof zonasSinLugar>; comp?: number[][] } = {};
  const zonasDe = () => (cache.zonas ??= zonasSinLugar());
  const compDe = () => (cache.comp ??= componentesDeLugares());
  /** Las frases del diagnóstico, calculadas al vuelo: cada una es una lista de trozos, los que son `{ b }` en negritas. */
  function diagnostico(): Parte[][] {
    const zonas = zonasDe();
    const comp = compDe();
    const nArt = basePer - baseArt;
    const sinEvento = nodos.slice(baseArt, basePer).filter((n) => n.fechas === 0).length;
    const porLugar = nodos.slice(0, baseArt).map((n) => n.eventos ?? 0).sort((a, b) => b - a);
    const totalEv = porLugar.reduce((a, b) => a + b, 0);
    const top5 = porLugar.slice(0, 5).reduce((a, b) => a + b, 0);
    const conEv = nodos.slice(0, baseArt).filter((n) => (n.eventos ?? 0) > 0).length;
    const frases: Parte[][] = [
      [{ b: `${Math.round((sinEvento / (nArt || 1)) * 10)} de cada 10 artistas` }, ` no tienen ningún evento registrado (${sinEvento} de ${nArt}).`],
      [{ b: `El ${Math.round((top5 / (totalEv || 1)) * 100)} % de los eventos` }, ` con sede ocurre en 5 lugares; ${baseArt - conEv} de los ${baseArt} lugares no tienen ninguno.`],
      ["Los lugares con eventos forman ", { b: plural(comp.length, "cúmulo", "cúmulos") }, ` que no comparten ni un artista ni un festival entre sí (el mayor, ${comp[0]?.length ?? 0} lugares).`],
      [{ b: `${plural(zonas.zonas.length, "zona", "zonas")} de la ciudad` }, ` no tienen un lugar a menos de 2 km (${zonas.celdas.length} km² dentro de 7 km del centro).`],
    ];
    if (!todoElTiempo()) frases.push(["En el periodo elegido hay ", { b: `${activas.filter(Boolean).length} conexiones activas` }, ` de ${aristas.length}.`]);
    return frases;
  }
  // Las lentes: una pregunta, un filtro, una vista y una lista que se copia
  const LENTES: Lente[] = [
    {
      id: "zonas",
      titulo: "¿Qué zonas no tienen un lugar a 2 km?",
      sub: "mapa desde arriba; las zonas en naranja",
      aplicar() {
        const z = zonasDe();
        filtro = { tipo: "lugar", clase: null };
        enfoque = null;
        cambiarVista("mapa");
        ponerArriba(true);
        animarCamara({ objetivo: new THREE.Vector3(0, 0, 0), distancia: 1900, phi: 0.06, theta: 0 });
        zonasMesh.count = Math.min(z.celdas.length, 400);
        z.celdas.slice(0, 400).forEach((c, k) => {
          m4.makeTranslation(c.cx, 0.5, c.cz);
          zonasMesh.setMatrixAt(k, m4);
        });
        zonasMesh.instanceMatrix.needsUpdate = true;
        zonasMesh.visible = true;
        return { titulo: `Zonas sin lugar a 2 km · ${z.zonas.length}`, items: z.zonas.map((zo) => ({ nombre: rumbo(zo.cx, zo.cz), sub: `${zo.km2} km²`, color: "var(--destacado)" })) };
      },
    },
    {
      id: "islas",
      titulo: "¿Qué lugares no comparten artista con nadie?",
      sub: "islas: tienen eventos, pero ningún artista suyo toca en otro lugar",
      aplicar() {
        filtro = { tipo: "lugar", clase: null };
        cambiarVista("mapa");
        const islas: number[] = [];
        const sinEventos: number[] = [];
        for (let i = 0; i < baseArt; i++) {
          const n = nodos[i];
          if ((n.eventos ?? 0) === 0) {
            sinEventos.push(i);
            continue;
          }
          let isla = true;
          for (const a of artistasDeLugar(i))
            if (lugaresDeArtista(a).size > 1) {
              isla = false;
              break;
            }
          for (const ei of vecinos[i]) if (aristas[ei].t === "mismo festival") isla = false;
          if (isla) islas.push(i);
        }
        enfoque = new Set(islas);
        return {
          titulo: `Islas · ${islas.length}`,
          items: [
            ...islas.map((i) => ({ i, nombre: nombreL(i), sub: `${etiqueta(nodos[i].clase)} · ${plural(nodos[i].eventos ?? 0, "evento", "eventos")} · ${plural(artistasDeLugar(i).size, "artista", "artistas")} solo aquí`, color: "var(--g-c-lugar)" })),
            ...sinEventos.map((i) => ({ i, nombre: nombreL(i), sub: `${etiqueta(nodos[i].clase)} · sin eventos`, color: "var(--g-c-suelto)" })),
          ],
        };
      },
    },
    {
      id: "dependencia",
      titulo: "¿Qué artistas tocan siempre en el mismo sitio?",
      sub: "dos o más fechas, un solo lugar",
      aplicar() {
        filtro = { tipo: "artista", clase: "conectados" };
        cambiarVista("mapa");
        const lis: number[] = [];
        for (let i = baseArt; i < basePer; i++) {
          const n = nodos[i];
          if ((n.fechas ?? 0) >= 2 && n.lugares === 1) lis.push(i);
        }
        enfoque = new Set(lis);
        lis.sort((a, b) => (nodos[b].fechas ?? 0) - (nodos[a].fechas ?? 0));
        return { titulo: `Siempre en el mismo sitio · ${lis.length}`, items: lis.map((i) => ({ i, nombre: nombreL(i), sub: `${plural(nodos[i].fechas ?? 0, "fecha", "fechas")} en ${nombreL([...lugaresDeArtista(i)][0])}`, color: "var(--g-c-artista)" })) };
      },
    },
    {
      id: "puentes",
      titulo: "¿Quién une lugares distintos?",
      sub: "red: artistas que tocan en más de un lugar",
      aplicar() {
        filtro = { tipo: null, clase: null };
        cambiarVista("red");
        const lis: number[] = [];
        for (let i = baseArt; i < basePer; i++) if ((nodos[i].lugares ?? 0) >= 2) lis.push(i);
        const sitios = new Set<number>();
        for (const i of lis) for (const l of lugaresDeArtista(i)) sitios.add(l);
        enfoque = new Set([...lis, ...sitios]);
        lis.sort((a, b) => (nodos[b].lugares ?? 0) - (nodos[a].lugares ?? 0));
        return { titulo: `Puentes · ${lis.length}`, items: lis.map((i) => ({ i, nombre: nombreL(i), sub: `une ${[...lugaresDeArtista(i)].map(nombreL).join(" y ")}`, color: "var(--g-c-artista)" })) };
      },
    },
    {
      id: "festivales",
      titulo: "¿Qué festivales conectan sedes?",
      sub: "lugares unidos por un festival (líneas violeta)",
      aplicar() {
        filtro = { tipo: "lugar", clase: null };
        cambiarVista("mapa");
        const cuenta: Record<number, number> = {};
        for (const e of aristas)
          if (e.t === "mismo festival") {
            cuenta[e.a] = (cuenta[e.a] || 0) + e.w;
            cuenta[e.b] = (cuenta[e.b] || 0) + e.w;
          }
        const lis = Object.keys(cuenta).map(Number).sort((a, b) => cuenta[b] - cuenta[a]);
        enfoque = new Set(lis);
        return {
          titulo: `Sedes compartidas · ${lis.length} lugares, ${DATOS.resumen.festivales} festivales`,
          items: lis.map((i) => ({ i, nombre: nombreL(i), sub: `comparte festival con ${plural(vecinos[i].filter((ei) => aristas[ei].t === "mismo festival").length, "lugar", "lugares")}`, color: "var(--g-c-lugar)" })),
        };
      },
    },
    {
      id: "conectar",
      titulo: "¿Cuántos faltan por conectar, por disciplina?",
      sub: "artistas sin ningún evento: la lista para invitar",
      aplicar() {
        filtro = { tipo: null, clase: null };
        enfoque = null;
        cambiarVista("mapa");
        const porDisc: Record<string, number[]> = {};
        for (const i of sueltos) (porDisc[nodos[i].clase] ||= []).push(i);
        const items: Item[] = [];
        for (const [k, v] of Object.entries(porDisc).sort((a, b) => b[1].length - a[1].length)) {
          items.push({ nombre: `${etiqueta(k)} · ${v.length}`, sub: "", color: "var(--g-c-suelto)", grupo: true });
          for (const i of v.sort((a, b) => nodos[a].nombre.localeCompare(nodos[b].nombre, "es"))) items.push({ i, nombre: nodos[i].nombre, sub: nodos[i].ciudad !== "San Luis Potosí" ? nodos[i].ciudad : "", color: "var(--g-c-suelto)" });
        }
        seleccionar(RESUMEN, false);
        return { titulo: `Por conectar · ${sueltos.length}`, items };
      },
    },
  ];
  let resultadoLente: Resultado | null = null;
  function aplicarLente(id: string) {
    if (lenteActiva === id) {
      quitarLente();
      return;
    }
    quitarLente(false);
    const l = LENTES.find((x) => x.id === id) as Lente;
    lenteActiva = id;
    if (seleccion >= 0) {
      seleccion = -1;
      primero = new Set();
      segundo = new Set();
      pintarTarjeta();
    }
    resultadoLente = l.aplicar();
    pintarArbol();
    pintar();
    pintarLista();
    if (!columnas.matches) abrirHoja("lista");
  }
  function quitarLente(repintar = true) {
    lenteActiva = null;
    resultadoLente = null;
    enfoque = null;
    zonasMesh.visible = false;
    if (desdeArriba) ponerArriba(false);
    if (repintar) {
      pintarArbol();
      pintar();
      pintarLista();
    }
  }

  // ---------- Árbol (izquierda): lentes, filtros, tiempo, ajustes ----------
  function fila(texto: string, n: string | number | undefined, color: string | null, activo: boolean, onclick: () => void, sub?: string, clase = ""): HTMLButtonElement {
    const b = el("button", `${S.fila} ${clase}`.trim());
    b.type = "button";
    b.setAttribute("aria-pressed", String(activo));
    if (color) {
      const p = el("span", S.punto);
      p.style.setProperty("--c", color);
      b.append(p);
    }
    const t = el("span");
    t.append(el("b", "", texto));
    if (sub) t.append(el("small", "", sub));
    b.append(t, el("span", S.n, n === undefined ? "" : String(n)));
    b.onclick = onclick;
    return b;
  }
  const fechaDeDia = (d: number) => new Date(d * 86400000).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
  function pintarArbol() {
    arbol.replaceChildren();
    const h0 = el("h2", "", "Lentes de diagnóstico");
    arbol.append(h0);
    const ulL = el("ul");
    for (const l of LENTES) {
      const li = el("li");
      li.append(fila(l.titulo, "", null, lenteActiva === l.id, () => aplicarLente(l.id), l.sub, S.lente));
      ulL.append(li);
    }
    arbol.append(ulL);
    arbol.append(el("h2", "", "Filtrar"));
    const ul = el("ul");
    const li = (hijo: HTMLElement) => {
      const l = el("li");
      l.append(hijo);
      ul.append(l);
      return l;
    };
    const poner = (t: string | null, c: string | null) => {
      if (lenteActiva) quitarLente(false);
      ponerFiltro(t, c);
    };
    li(fila("Todo", nodos.length - 1 - sueltos.length + (mostrarSueltos ? sueltos.length : 0), "var(--g-suave)", !filtro.tipo && !lenteActiva, () => poner(null, null)));
    const lLug = li(fila("Lugares", DATOS.lugares.length, "var(--g-c-lugar)", filtro.tipo === "lugar" && !filtro.clase && !lenteActiva, () => poner("lugar", null)));
    const tipos: Record<string, number> = {};
    for (const l of DATOS.lugares) tipos[l.tipo] = (tipos[l.tipo] || 0) + 1;
    const ulLug = el("ul");
    for (const [t, n] of Object.entries(tipos).sort((a, b) => b[1] - a[1])) {
      const x = el("li");
      x.append(fila(etiqueta(t), n, "var(--g-c-lugar)", filtro.tipo === "lugar" && filtro.clase === t && !lenteActiva, () => poner("lugar", t)));
      ulLug.append(x);
    }
    lLug.append(ulLug);
    const lArt = li(fila("Artistas", DATOS.artistas.length, "var(--g-c-artista)", filtro.tipo === "artista" && !filtro.clase && !lenteActiva, () => poner("artista", null)));
    const disc: Record<string, number> = {};
    for (const a of DATOS.artistas) disc[a.disciplina] = (disc[a.disciplina] || 0) + 1;
    const ulA = el("ul");
    const add = (et: string, n: number, activo: boolean, f: () => void, sub?: string) => {
      const x = el("li");
      x.append(fila(et, n, "var(--g-c-artista)", activo && !lenteActiva, f, sub));
      ulA.append(x);
    };
    add("Con lugar", DATOS.resumen.artistasConectados, filtro.tipo === "artista" && filtro.clase === "conectados", () => poner("artista", "conectados"), "flotan sobre el lugar donde más tocan");
    for (const [t, n] of Object.entries(disc).sort((a, b) => b[1] - a[1])) add(etiqueta(t), n, filtro.tipo === "artista" && filtro.clase === t, () => poner("artista", t));
    lArt.append(ulA);
    li(fila("Solo en sitios libres", DATOS.resumen.artistasEnSitioLibre, "var(--g-c-artista)", filtro.tipo === "libres" && !lenteActiva, () => poner("libres", null), "eventos sin ficha de lugar; se colocan en ese sitio"));
    li(fila("Sin conexión", DATOS.resumen.artistasSueltos, "var(--g-c-suelto)", filtro.tipo === "sueltos" && !lenteActiva, () => poner("sueltos", null), "ni evento ni lugar: resumidos en un nodo; aquí se despliegan"));
    li(fila("Asistentes", DATOS.personas.length, "var(--g-c-persona)", filtro.tipo === "persona" && !lenteActiva, () => poner("persona", null), "anónimos; solo quienes dijeron Voy o Me interesa"));
    arbol.append(ul);

    arbol.append(el("h2", "", "Tiempo"));
    arbol.insertAdjacentHTML(
      "beforeend",
      `<label class="${S.ajuste}"><span>Ventana</span><select data-g="t-ventana"><option value="14">2 semanas</option><option value="30">1 mes</option><option value="90">3 meses</option><option value="Infinity">Todo</option></select></label>
       <label class="${S.ajuste}"><span>Hasta <b data-g="t-hasta-txt"></b></span><input type="range" data-g="t-hasta" min="${DATOS.primerDia}" max="${DATOS.ultimoDia}" step="7" value="${hasta}"></label>
       <p class="${S.nota}">Una línea está activa si tiene un evento dentro de la ventana que termina en «Hasta»; lo demás se apaga. Hoy la base cubre del ${fechaDeDia(DATOS.primerDia)} al ${fechaDeDia(DATOS.ultimoDia)}: ${DATOS.ultimoDia - DATOS.primerDia} días. Para comparar dos momentos, mueve «Hasta» y mira cómo cambian el diagnóstico y la nube.</p>`,
    );
    const txt = arbol.querySelector<HTMLElement>('[data-g="t-hasta-txt"]') as HTMLElement;
    txt.textContent = fechaDeDia(hasta);
    const selVentana = arbol.querySelector<HTMLSelectElement>('[data-g="t-ventana"]') as HTMLSelectElement;
    selVentana.value = String(ventana);
    selVentana.onchange = () => {
      ventana = selVentana.value === "Infinity" ? Infinity : +selVentana.value;
      cambiarTiempo();
    };
    const rango = arbol.querySelector<HTMLInputElement>('[data-g="t-hasta"]') as HTMLInputElement;
    rango.oninput = () => {
      hasta = +rango.value;
      txt.textContent = fechaDeDia(hasta);
      cambiarTiempo();
    };

    arbol.append(el("h2", "", "Ajustes"));
    arbol.insertAdjacentHTML(
      "beforeend",
      `<label class="${S.ajuste}"><span>Tamaño de las esferas</span><input type="range" data-g="aj-tamano" min="0.4" max="2.2" step="0.1" value="${factorTamano}"></label>
       <label class="${S.ajuste}"><span>Altura de las capas</span><input type="range" data-g="aj-altura" min="0" max="2" step="0.1" value="${factorAltura}"></label>
       <label class="${S.ajuste}"><span>Mostrar sin conexión</span><input type="checkbox" data-g="aj-sueltos" ${mostrarSueltos ? "checked" : ""}></label>
       <label class="${S.ajuste}"><span>Todas las líneas, tenues</span><input type="checkbox" data-g="aj-lineas" ${mostrarLineas ? "checked" : ""}></label>
       <p class="${S.nota}">Lugares a escala real: 1 unidad = 10 m desde el centro de los lugares de San Luis Potosí; cada anillo del suelo es 1 km. Lo que está a más de 10 km (San Miguel de Allende) se acerca en logaritmo. En «Red» la cercanía deja de ser la de la ciudad y pasa a ser la relación.</p>
       <p class="${S.nota}">Datos reales de solo lectura del ${DATOS.extraido}: ${DATOS.resumen.eventos} eventos, ${DATOS.resumen.seguimientos} seguimientos, ${DATOS.resumen.asistencias} asistencias. Los seguimientos solo suman al tamaño; las personas que solo siguen (${DATOS.resumen.personasQueSiguen - DATOS.personas.length}) no se dibujan. Las líneas de una persona solo salen de eventos con 3 o más asistencias.</p>`,
    );
    const aj = <T extends HTMLElement>(n: string) => arbol.querySelector(`[data-g="${n}"]`) as T;
    aj<HTMLInputElement>("aj-tamano").oninput = (e) => {
      factorTamano = +(e.target as HTMLInputElement).value;
      pintar();
    };
    aj<HTMLInputElement>("aj-altura").oninput = (e) => {
      factorAltura = +(e.target as HTMLInputElement).value;
      pintar();
    };
    aj<HTMLInputElement>("aj-sueltos").onchange = (e) => {
      mostrarSueltos = (e.target as HTMLInputElement).checked;
      if (seleccion === RESUMEN) seleccionar(-1);
      pintar();
      pintarLista();
    };
    aj<HTMLInputElement>("aj-lineas").onchange = (e) => {
      mostrarLineas = (e.target as HTMLInputElement).checked;
      pintar();
    };
  }
  function cambiarTiempo() {
    recalcularTiempo();
    if (seleccion >= 0) seleccionar(seleccion, false);
    else {
      pintar();
      pintarLista();
    }
  }
  function ponerFiltro(tipo: string | null, clase: string | null) {
    filtro = { tipo, clase };
    if (seleccion >= 0 && !pasaFiltro(nodos[seleccion])) {
      seleccion = -1;
      primero = new Set();
      segundo = new Set();
      pintarTarjeta();
    }
    pintarArbol();
    pintar();
    pintarLista();
    if (!columnas.matches) cerrarHojas();
  }

  // ---------- Lista (derecha): diagnóstico y lo filtrado o lo de la lente ----------
  function pintarLista() {
    lista.replaceChildren();
    lista.append(el("h2", "", "Diagnóstico"));
    const dg = el("div", S.diagnostico);
    for (const f of diagnostico()) {
      const p = el("p");
      for (const parte of f) {
        if (typeof parte === "string") p.append(parte);
        else p.append(el("b", "", parte.b));
      }
      dg.append(p);
    }
    lista.append(dg);
    let titulo: string;
    let items: Item[];
    if (resultadoLente) {
      titulo = resultadoLente.titulo;
      items = resultadoLente.items;
    } else {
      const idx: number[] = [];
      for (let i = 0; i < nodos.length; i++) if (visible[i] && i !== RESUMEN) idx.push(i);
      idx.sort((a, b) => radio(nodos[b]) - radio(nodos[a]) || nodos[a].nombre.localeCompare(nodos[b].nombre, "es"));
      titulo =
        (!filtro.tipo
          ? "Todo"
          : filtro.tipo === "lugar"
            ? filtro.clase
              ? etiqueta(filtro.clase)
              : "Lugares"
            : filtro.tipo === "artista"
              ? filtro.clase === "conectados"
                ? "Artistas con lugar"
                : filtro.clase
                  ? etiqueta(filtro.clase)
                  : "Artistas"
              : filtro.tipo === "libres"
                ? "Solo en sitios libres"
                : filtro.tipo === "sueltos"
                  ? "Sin conexión"
                  : "Asistentes") + ` · ${idx.length}`;
      items = idx.map((i) => {
        const n = nodos[i];
        return {
          i,
          nombre: n.nombre,
          color: n.tipo === "persona" ? "var(--g-c-persona)" : n.tipo === "lugar" ? "var(--g-c-lugar)" : n.suelto ? "var(--g-c-suelto)" : "var(--g-c-artista)",
          sub: n.tipo === "persona" ? `actividad ${NIVEL[(n.tramo ?? 1) - 1]}` : `${etiqueta(n.clase)} · ${n.seguidores} siguen · ${n.asistentes} van`,
          n: vecinos[i].filter((ei) => activas[ei]).length,
        };
      });
    }
    const h = el("h2");
    h.append(el("span", "", titulo));
    const copiar = el("button", S.copiar, "Copiar lista");
    copiar.type = "button";
    copiar.onclick = async () => {
      const texto = `${titulo}\n` + items.map((it) => `${it.grupo ? "\n" : "- "}${it.nombre}${it.sub ? ` · ${it.sub}` : ""}`).join("\n");
      try {
        await navigator.clipboard.writeText(texto);
        copiar.textContent = "Copiada";
      } catch {
        copiar.textContent = "No se pudo";
      }
      setTimeout(() => {
        copiar.textContent = "Copiar lista";
      }, 1500);
    };
    h.append(copiar);
    lista.append(h);
    const ul = el("ul");
    const tope = 400;
    for (const it of items.slice(0, tope)) {
      const b = fila(it.nombre, it.n ?? "", it.color, false, () => {
        if (it.i !== undefined) {
          seleccionar(it.i, true);
          if (!columnas.matches) cerrarHojas();
        }
      }, it.sub);
      if (it.grupo) b.classList.add(S.grupo);
      if (it.i === seleccion) b.setAttribute("aria-current", "true");
      const li = el("li");
      li.append(b);
      ul.append(li);
    }
    lista.append(ul);
    if (items.length > tope) lista.append(el("p", S.nota, `Se muestran ${tope} de ${items.length}.`));
    // Se lleva el renglón elegido a la vista desplazando solo la lista (scrollIntoView movería también la escena si la hoja está cerrada)
    const sel = lista.querySelector('[aria-current="true"]');
    if (sel) {
      const a = sel.getBoundingClientRect();
      const b = lista.getBoundingClientRect();
      if (a.top < b.top) lista.scrollTop -= b.top - a.top;
      else if (a.bottom > b.bottom) lista.scrollTop += a.bottom - b.bottom;
    }
  }

  // ---------- Hojas, tema, cifras, bucle ----------
  const columnas = window.matchMedia(COLUMNAS);
  /** Una hoja cerrada no recibe toques ni foco (`inert`); en columnas, nada se cierra. */
  function sincronizarHojas() {
    arbol.inert = !columnas.matches && raiz.dataset.hoja !== "arbol";
    lista.inert = !columnas.matches && raiz.dataset.hoja !== "lista";
  }
  function abrirHoja(cual: "arbol" | "lista") {
    raiz.dataset.hoja = cual;
    sincronizarHojas();
  }
  function cerrarHojas() {
    delete raiz.dataset.hoja;
    sincronizarHojas();
  }
  escuchar(columnas, "change", sincronizarHojas);
  escuchar(q("abrirArbol"), "click", () => abrirHoja("arbol"));
  escuchar(q("abrirLista"), "click", () => abrirHoja("lista"));
  escuchar(q("velo"), "click", cerrarHojas);
  const botonTema = q<HTMLButtonElement>("tema");
  escuchar(botonTema, "click", () => {
    const aClaro = raiz.dataset.tema !== "claro";
    raiz.dataset.tema = aClaro ? "claro" : "oscuro";
    botonTema.textContent = aClaro ? "Oscuro" : "Claro";
    botonTema.setAttribute("aria-pressed", String(aClaro));
    leerTema();
    pintar();
  });
  q("cifras").textContent = `${nodos.length - 1} nodos · ${aristas.length} conexiones · ${DATOS.lugares.length} lugares · ${DATOS.artistas.length} artistas · ${DATOS.personas.length} asistentes`;

  let cuadros = 0;
  let t0 = performance.now();
  let pendiente = false;
  let medirContinuo = false;
  let muerto = false;
  let idCuadro = 0;
  function pedirCuadro() {
    if (!pendiente && !muerto) {
      pendiente = true;
      idCuadro = requestAnimationFrame(cuadro);
    }
  }
  function cuadro(t: number) {
    pendiente = false;
    if (animacion) {
      animacion(t);
      pedirCuadro();
    }
    if (transicion) {
      transicion(t);
      pedirCuadro();
    }
    colocarCamara();
    renderer.render(escena, camara);
    pintarRotulos();
    cuadros++;
    if (t - t0 >= 1000) {
      fpsEl.textContent = cuadros >= 8 ? `${Math.round((cuadros * 1000) / (t - t0))} fps` : "en reposo";
      cuadros = 0;
      t0 = t;
    }
    if (medirContinuo) pedirCuadro();
  }
  function redimensionar() {
    const r = (lienzo.parentElement as HTMLElement).getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    renderer.setSize(r.width, r.height, false);
    camara.aspect = r.width / r.height;
    camara.updateProjectionMatrix();
    pedirCuadro();
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(lienzo.parentElement as HTMLElement);
  limpiezas.push(() => observador.disconnect());

  // Mediciones para repetir en cualquier aparato desde la consola: window.grafo.medirFps(), .medirRender(), .estresar(n)
  const medirFps = (ms = 3000) =>
    new Promise<number>((res) => {
      medirContinuo = true;
      let total = 0;
      const inicio = performance.now();
      const cuenta = () => {
        total++;
        if (performance.now() - inicio < ms) requestAnimationFrame(cuenta);
        else {
          medirContinuo = false;
          res(Math.round((total * 1000) / (performance.now() - inicio)));
        }
      };
      requestAnimationFrame(cuenta);
      pedirCuadro();
    });
  const medirRender = (n = 60) => {
    colocarCamara();
    const t = performance.now();
    for (let i = 0; i < n; i++) renderer.render(escena, camara);
    return +((performance.now() - t) / n).toFixed(2);
  };
  const estresar = (extra: number) => {
    const g = new THREE.InstancedMesh(geo, mat, extra);
    const m = new THREE.Matrix4();
    for (let i = 0; i < extra; i++) {
      const a = Math.sin(i * 12.9898) * 3.14159 + 3.14159;
      const r = Math.sqrt((Math.sin(i * 78.233) + 1) / 2) * 900;
      m.makeScale(4, 4, 4).setPosition(r * Math.cos(a), Math.sin(i * 39.346) * 150, r * Math.sin(a));
      g.setMatrixAt(i, m);
      g.setColorAt(i, colores.artista);
    }
    g.frustumCulled = false;
    g.name = "estres";
    escena.add(g);
    pedirCuadro();
    return extra;
  };
  const quitarEstres = () => {
    for (const o of [...escena.children]) if (o.name === "estres") escena.remove(o);
    pedirCuadro();
  };
  window.grafo = {
    nodos,
    aristas,
    seleccionar,
    ponerFiltro,
    aplicarLente,
    cambiarVista,
    ponerArriba,
    cam,
    pedirCuadro,
    diagnostico,
    renderer,
    camara,
    medirFps,
    medirRender,
    estresar,
    quitarEstres,
    get vista() {
      return vista;
    },
    get posRed() {
      return posRed;
    },
  };

  recalcularTiempo();
  leerTema();
  sincronizarHojas();
  redimensionar();
  pintarArbol();
  pintar();
  pintarLista();

  return {
    destruir() {
      muerto = true;
      cancelAnimationFrame(idCuadro);
      limpiezas.splice(0).forEach((f) => f());
      delete window.grafo;
      const liberar = (o: THREE.Object3D) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const material = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((x) => x.dispose());
        else material?.dispose();
        if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
      };
      escena.traverse(liberar);
      geo.dispose();
      mat.dispose();
      geoTubo.dispose();
      geoAro.dispose();
      geoDisco.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      arbol.replaceChildren();
      lista.replaceChildren();
      capaVecinos.replaceChildren();
      capaEtiquetas.replaceChildren();
      tarjeta.replaceChildren();
      tarjeta.dataset.abierta = "false";
    },
  };
}

declare global {
  interface Window {
    grafo?: {
      nodos: Nodo[];
      aristas: Linea[];
      seleccionar: (i: number, volar?: boolean) => void;
      ponerFiltro: (tipo: string | null, clase: string | null) => void;
      aplicarLente: (id: string) => void;
      cambiarVista: (v: "mapa" | "red") => void;
      ponerArriba: (si: boolean) => void;
      cam: { objetivo: THREE.Vector3; distancia: number; theta: number; phi: number };
      pedirCuadro: () => void;
      diagnostico: () => Parte[][];
      renderer: THREE.WebGLRenderer;
      camara: THREE.PerspectiveCamera;
      medirFps: (ms?: number) => Promise<number>;
      medirRender: (n?: number) => number;
      estresar: (extra: number) => number;
      quitarEstres: () => void;
      readonly vista: "mapa" | "red";
      readonly posRed: number[][] | null;
    };
  }
}
