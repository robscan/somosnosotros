import { diaCorto, diaLocal, formatearCuando } from "./fechas";
import { etiquetaDisciplina } from "./artistas";
import { etiquetaLugar, normalizarNombre } from "./lugares";

/**
 * Panel de administración (docs/rediseno/18 y 19, firmados por el founder el 2026-09-16): lo que se calcula y se
 * escribe sin tocar la base, para poder probarlo. Indicadores con su comparación y su tendencia, el texto de cada
 * renglón, los filtros de las listas y las guardas del rol. Los datos llegan de las funciones panel_* de la base
 * (migración 20260917090000_panel_administracion.sql).
 */

// ---------- lo que devuelve la base ----------
export type Ahora = {
  activas: number;
  cuentas: number;
  coincidencias: number;
  eventos_semana: number;
  lugares_con_fecha: number;
  lugares: number;
  comunidad: number;
  proximos: number;
  comunidad_nuevos: number;
  desglose: {
    abrieron: number;
    voy: number;
    siguieron: number;
    publicaron: number;
    nuevas: number;
    con_2: number;
    con_3_a_5: number;
    con_6_o_mas: number;
    mayor: { id: string; titulo: string; n: number } | null;
    personas_que_publican: number;
  };
};
/** La foto de un día (YYYY-MM-DD en la ciudad). */
export type Foto = { dia: string; activas: number; coincidencias: number; eventos_semana: number; comunidad: number };
export type Gestionar = {
  personas: number;
  personas_nuevas: number;
  nunca_entraron: number;
  correo_con_problema: number;
  lugares: number;
  lugares_sin_fecha: number;
  lugares_ocultos: number;
  lugares_privados: number;
  eventos: number;
  eventos_sin_imagen: number;
  artistas: number;
  artistas_ocultos: number;
  artistas_llevados: number;
  invitaciones: number;
};
export type Resumen = { ahora: Ahora; historia: Foto[]; gestionar: Gestionar };

/** Lo que devuelve `panel_comunidad()` (migración 20260917150000, doc 21 opción A): el embudo en bruto. */
export type Comunidad = { registradas: number; hicieron_algo: number; vuelven_base: number; vuelven: number };

export type EmbudoComunidad = {
  registradas: number;
  hicieronAlgo: { valor: number; porcentaje: number };
  /** `porcentaje` null cuando nadie tiene aún 7 días de vida (`vuelven_base` en 0): se pinta sin barra ni cifra, no
   *  un 0% que sugiere que sí se supo y fue cero. */
  vuelven: { valor: number; porcentaje: number | null };
};

/** El embudo listo para pintar (OL-060): de las cuentas nuevas de los últimos 30 días, cuántas hicieron algo en su
 *  primera semana y, de las que ya llevan más de 7 días, cuántas siguen volviendo. */
export function embudoComunidad(c: Comunidad): EmbudoComunidad {
  return {
    registradas: c.registradas,
    hicieronAlgo: { valor: c.hicieron_algo, porcentaje: c.registradas > 0 ? Math.round((c.hicieron_algo / c.registradas) * 100) : 0 },
    vuelven: { valor: c.vuelven, porcentaje: c.vuelven_base > 0 ? Math.round((c.vuelven / c.vuelven_base) * 100) : null },
  };
}

export type TipoFicha = "lugar" | "evento" | "artista" | "perfil";
export type Pendiente = {
  id: string;
  tipo: TipoFicha;
  objeto_id: string;
  motivo: string;
  detalle: string | null;
  creado_en: string;
  creado_por: string | null;
  autor: string | null;
  /** Nombre de la ficha; null si ya no existe. */
  objeto: string | null;
  objeto_visible: boolean | null;
};

export type PersonaFila = {
  id: string;
  nombre: string;
  foto: string | null;
  rol: "admin" | "usuario";
  reservado: boolean;
  creado_en: string;
  confirmado: boolean;
  ultima_entrada: string | null;
  /** Último día (YYYY-MM-DD) que abrió la app. */
  visto: string | null;
  correo_oculto: string | null;
  va_a: number;
  sigue: number;
  publico: number;
  lleva: string | null;
  lleva_n: number;
  total: number;
};

export type PersonaFicha = {
  id: string;
  nombre: string;
  foto: string | null;
  colonia: string | null;
  reservado: boolean;
  rol: "admin" | "usuario";
  creado_en: string;
  correo_oculto: string | null;
  confirmado: boolean;
  ultima_entrada: string | null;
  visto: string | null;
  avisos_correo: boolean;
  avisos_correo_motivo: "baja" | "rebote" | "queja" | null;
  telefonos: number;
  va_a: number;
  le_interesa: number;
  sigue_lugares: number;
  sigue_artistas: number;
  publico_lugares: number;
  publico_eventos: number;
  publico_artistas: number;
  lleva: { tipo: "artista" | "lugar"; id: string; nombre: string }[];
  reclamos: number;
  reportes: number;
  pendientes: number;
  de_origen: boolean;
  es_yo: boolean;
  puedo_cambiar_rol: boolean;
  administradores: number;
  cambio_rol: { rol: "admin" | "usuario"; creado_en: string; por: string | null; por_nombre: string | null } | null;
};

export type LugarFila = { id: string; nombre: string; foto: string | null; tipo: string; detalle: string | null; visible: boolean; privado: boolean; origen: string | null; proximas: number; lleva: string | null; lleva_n: number; total: number };
export type EventoFila = { id: string; titulo: string; imagen: string | null; inicio: string; fin: string | null; visible: boolean; sitio: string | null; autor: string | null; autor_admin: boolean; van: number; total: number; /** La zona del evento y si su lugar se ve: el panel no los devuelve, se leen aparte (admin/consultas). */ zona?: string; lugar?: { visible: boolean; privado: boolean } | null };
export type ArtistaFila = { id: string; nombre: string; foto: string | null; disciplina: string; detalle: string | null; visible: boolean; origen: string | null; proximas: number; lleva: string | null; lleva_n: number; total: number };

// ---------- números en palabras ----------
/** "1 lugar" · "3 lugares"; con 0, null (lo que no hay no se escribe). */
export function contar(n: number, uno: string, varios: string): string | null {
  if (!n) return null;
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Une lo que hay con " · "; si no hay nada, `vacio`. */
export function unir(partes: (string | null | false | undefined)[], vacio = ""): string {
  const hay = partes.filter(Boolean) as string[];
  return hay.length ? hay.join(" · ") : vacio;
}

function mayuscula(t: string): string {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/** Días enteros de `desde` a `hasta` (YYYY-MM-DD). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000);
}

function sumarDias(dia: string, n: number): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

// ---------- indicadores ----------
type ClaveFoto = "activas" | "coincidencias" | "eventos_semana" | "comunidad";

/** La foto de hace una semana: la de hace 7 días o, si ese día no hubo, la más cercana de hasta 3 días antes. */
export function haceUnaSemana(historia: Foto[], clave: ClaveFoto, hoy: string, semanas = 1): number | null {
  const objetivo = sumarDias(hoy, -7 * semanas);
  const limite = sumarDias(objetivo, -3);
  let elegida: Foto | null = null;
  for (const f of historia) if (f.dia <= objetivo && f.dia >= limite && (!elegida || f.dia > elegida.dia)) elegida = f;
  return elegida ? elegida[clave] : null;
}

/** Una muestra por semana, de la más vieja a hoy (12 como máximo). La tendencia se corta donde falta una semana y
 *  solo aparece con 4 muestras o más: sin historia no se dibuja una tendencia que no existe (decisión 4). */
export function serieSemanal(historia: Foto[], clave: ClaveFoto, valorHoy: number, hoy: string): number[] | null {
  const serie = [valorHoy];
  for (let k = 1; k < 12; k++) {
    const antes = haceUnaSemana(historia, clave, hoy, k);
    if (antes === null) break;
    serie.unshift(antes);
  }
  return serie.length >= 4 ? serie : null;
}

/** "▲ 3 más" · "▼ 4 menos" · "Igual que hace una semana". La flecha y el signo llevan la dirección, sin verde ni rojo. */
export function textoCambio(ahora: number, antes: number): string {
  const d = ahora - antes;
  if (d > 0) return `▲ ${d} más`;
  if (d < 0) return `▼ ${-d} menos`;
  return "Igual que hace una semana";
}

export type ClaveIndicador = "activas" | "coincidencias" | "agenda" | "comunidad";
export type Indicador = {
  clave: ClaveIndicador;
  nombre: string;
  valor: number;
  /** Con qué se compara el número ("de 4 cuentas, sin administradores"). */
  base: string;
  /** Frente a hace una semana; null sin foto de entonces. */
  cambio: string | null;
  serie: number[] | null;
  /** Qué cuenta, exactamente (al abrirlo). */
  que: string;
  partes: string[];
  enlace: { texto: string; href: string };
};

export function indicadores(r: Resumen, hoy: string): Indicador[] {
  const a = r.ahora;
  const d = a.desglose;
  const h = r.historia;
  const cambio = (clave: ClaveFoto, valor: number) => {
    const antes = haceUnaSemana(h, clave, hoy);
    return antes === null ? null : textoCambio(valor, antes);
  };
  return [
    {
      clave: "activas",
      nombre: "Personas activas",
      valor: a.activas,
      base: `de ${a.cuentas} ${a.cuentas === 1 ? "cuenta" : "cuentas"}, sin administradores`,
      cambio: cambio("activas", a.activas),
      serie: serieSemanal(h, "activas", a.activas, hoy),
      que: "Cuentas que en 7 días abrieron la app o hicieron algo: Voy, Seguir, publicar o reportar. Sin administradores.",
      partes: [contar(d.abrieron, "abrió la app", "abrieron la app"), contar(d.voy, "dijo Voy o Me interesa", "dijeron Voy o Me interesa"), contar(d.siguieron, "siguió algo", "siguieron algo"), contar(d.publicaron, "publicó", "publicaron"), contar(d.nuevas, "cuenta nueva", "cuentas nuevas")].filter(Boolean) as string[],
      enlace: { texto: "Ver las personas", href: "/admin/personas" },
    },
    {
      clave: "coincidencias",
      nombre: "Coincidencias",
      valor: a.coincidencias,
      base: `eventos con 2 o más que van, de ${a.eventos_semana}`,
      cambio: cambio("coincidencias", a.coincidencias),
      serie: serieSemanal(h, "coincidencias", a.coincidencias, hoy),
      que: "Eventos de los próximos 7 días donde 2 o más personas dijeron Voy, sin contar administradores.",
      partes: d.mayor
        ? ([contar(d.con_2, "con 2 personas", "con 2 personas"), contar(d.con_3_a_5, "con 3 a 5", "con 3 a 5"), contar(d.con_6_o_mas, "con 6 o más", "con 6 o más"), `La más grande: ${d.mayor.titulo}, ${d.mayor.n} van`].filter(Boolean) as string[])
        : ["Aún en ningún evento de la semana van 2 o más"],
      enlace: { texto: "Ver los eventos de la semana", href: hrefLista("eventos", { filtro: "semana" }) },
    },
    {
      clave: "agenda",
      nombre: "Agenda de la semana",
      valor: a.eventos_semana,
      base: `eventos · ${a.lugares_con_fecha} de ${a.lugares} lugares con fecha`,
      cambio: cambio("eventos_semana", a.eventos_semana),
      serie: serieSemanal(h, "eventos_semana", a.eventos_semana, hoy),
      que: "Eventos visibles en los próximos 7 días, los publique quien los publique.",
      partes: [`${a.lugares_con_fecha} de ${a.lugares} lugares tienen alguna fecha próxima`, contar(a.lugares - a.lugares_con_fecha, "no tiene ninguna", "no tienen ninguna")].filter(Boolean) as string[],
      enlace: { texto: "Ver los lugares sin fecha", href: hrefLista("lugares", { filtro: "sin_fecha" }) },
    },
    {
      clave: "comunidad",
      nombre: "Publica la comunidad",
      valor: a.comunidad,
      base: `de ${a.proximos} eventos próximos`,
      cambio: a.comunidad_nuevos > 0 ? `▲ ${a.comunidad_nuevos} esta semana` : "Ninguno nuevo esta semana",
      serie: serieSemanal(h, "comunidad", a.comunidad, hoy),
      que: "Eventos próximos que publicó una cuenta que no es de administración.",
      partes: a.comunidad ? ([`${a.comunidad} de ${a.proximos} eventos próximos`, contar(d.personas_que_publican, "persona los publica", "personas los publican"), contar(a.comunidad_nuevos, "publicado esta semana", "publicados esta semana")].filter(Boolean) as string[]) : ["Aún todo lo publica la administración"],
      enlace: { texto: "Ver los eventos de la comunidad", href: hrefLista("eventos", { filtro: "comunidad" }) },
    },
  ];
}

/** La nota bajo "Últimos 7 días": sin ninguna comparación posible, lo dice. */
export function notaSemana(lista: Indicador[]): string {
  return lista.some((i) => i.clave !== "comunidad" && i.cambio) ? "Comparado con hace una semana" : "Primera semana: aún sin comparación";
}

/** La línea de tendencia dentro de un rectángulo: puntos del trazo y el último punto, que se resalta. */
export function trazoTendencia(serie: number[], ancho = 88, alto = 28, margen = 3): { puntos: string; ultimo: { x: number; y: number } } {
  const max = Math.max(...serie);
  const min = Math.min(...serie);
  const x = (i: number) => Math.round((margen + (i * (ancho - 2 * margen)) / Math.max(serie.length - 1, 1)) * 10) / 10;
  const y = (n: number) => Math.round((alto - margen - ((n - min) * (alto - 2 * margen)) / (max - min || 1)) * 10) / 10;
  return { puntos: serie.map((n, i) => `${x(i)},${y(n)}`).join(" "), ultimo: { x: x(serie.length - 1), y: y(serie[serie.length - 1]) } };
}

// ---------- gestionar ----------
export type RenglonGestionar = { clave: "personas" | "lugares" | "eventos" | "artistas"; titulo: string; total: number; detalle: string; href: string };

export function renglonesGestionar(g: Gestionar): RenglonGestionar[] {
  return [
    { clave: "personas", titulo: "Personas", total: g.personas, href: "/admin/personas", detalle: unir([contar(g.personas_nuevas, "nueva", "nuevas"), contar(g.nunca_entraron, "nunca entró", "nunca entraron"), contar(g.correo_con_problema, "correo rebota o se quejó", "correos rebotan o se quejaron")], "Nada que atender") },
    { clave: "lugares", titulo: "Lugares", total: g.lugares, href: "/admin/lugares", detalle: unir([contar(g.lugares_sin_fecha, "sin fecha próxima", "sin fecha próxima"), contar(g.lugares_ocultos, "oculto", "ocultos"), contar(g.lugares_privados, "privado", "privados")], "Todos con fecha próxima") },
    { clave: "eventos", titulo: "Eventos", total: g.eventos, href: "/admin/eventos", detalle: unir([contar(g.eventos_sin_imagen, "sin imagen", "sin imagen")], g.eventos ? "Todos con imagen" : "Ninguno próximo") },
    { clave: "artistas", titulo: "Artistas", total: g.artistas, href: "/admin/artistas", detalle: unir([contar(g.artistas_llevados, "llevado por su gente", "llevados por su gente"), contar(g.invitaciones, "invitación", "invitaciones"), contar(g.artistas_ocultos, "oculto", "ocultos")], "Ninguno llevado por su gente") },
  ];
}

/** El detalle del renglón de Administración en Ajustes. */
export function textoPendientes(n: number): string {
  return n === 0 ? "Nada pendiente" : n === 1 ? "1 pendiente" : `${n} pendientes`;
}

// ---------- pendientes ----------
const MOTIVO_CORTO: Record<string, string> = { falso: "no existe o es falso", ofensivo: "es ofensivo", duplicado: "está repetido", no_cultural: "no es cultural", otro: "otra cosa" };
const TIPO: Record<TipoFicha, string> = { lugar: "Lugar", evento: "Evento", artista: "Artista", perfil: "Persona" };

export function esReclamo(p: Pick<Pendiente, "motivo">): boolean {
  return p.motivo === "es_mio" || p.motivo === "retirar";
}

/** Qué pide, con verbo propio: un reclamo no es un reporte (R5). */
export function quePide(p: Pick<Pendiente, "motivo">): string {
  if (p.motivo === "es_mio") return "Pide llevar la ficha";
  if (p.motivo === "retirar") return "Pide que se quite la ficha";
  return `Reporte: ${MOTIVO_CORTO[p.motivo] ?? "otra cosa"}`;
}

export function etiquetaFicha(tipo: TipoFicha): string {
  return TIPO[tipo];
}

export function rutaFicha(tipo: TipoFicha, id: string): string {
  return tipo === "lugar" ? `/lugares/${id}` : tipo === "evento" ? `/eventos/${id}` : tipo === "artista" ? `/artistas/${id}` : `/admin/personas/${id}`;
}

export type Decision = "dejar" | "ocultar" | "pasar";
export type AccionPendiente = { decision: "ocultar" | "pasar"; texto: string; apagada: string | null };

/** La acción de la derecha, si la hay. Sin ficha (se borró) o una persona reportada: solo cerrar (A7). */
export function accionDe(p: Pendiente): AccionPendiente | null {
  if (p.objeto === null || p.tipo === "perfil") return null;
  if (p.motivo === "es_mio") return p.tipo === "evento" ? null : { decision: "pasar", texto: "Pasarle la ficha", apagada: p.creado_por ? null : "La cuenta que la pidió ya no existe" };
  if (p.objeto_visible === false) return null;
  return { decision: "ocultar", texto: "Ocultar la ficha", apagada: null };
}

export function textoDejar(p: Pendiente): string {
  return p.objeto === null ? "Cerrar el reporte" : "Dejarla como está";
}

/** La línea que queda al decidir (decisión 3). Sin género: sirve para cualquier nombre de ficha. */
export function textoHecho(p: Pendiente, decision: Decision): string {
  if (decision === "ocultar") return `${p.objeto} ya no se ve`;
  if (decision === "pasar") return `${p.autor ?? "La cuenta"} ya lleva ${p.objeto}`;
  if (p.objeto === null) return "Reporte cerrado";
  return esReclamo(p) ? "Reclamo cerrado; la ficha sigue igual" : "Reporte cerrado; la ficha sigue igual";
}

/** "hace un momento" · "hace 5 h" · "ayer" · "mar 15 de sep". */
export function cuandoPaso(iso: string, ahora: Date = new Date()): string {
  const minutos = (ahora.getTime() - Date.parse(iso)) / 60000;
  if (minutos < 60) return "hace un momento";
  if (minutos < 24 * 60) return `hace ${Math.floor(minutos / 60)} h`;
  const dias = diasEntre(diaLocal(new Date(iso)), diaLocal(ahora));
  return dias === 1 ? "ayer" : diaCorto(iso, ahora);
}

// ---------- personas ----------
/** "Abrió la app hoy" · "Abrió la app hace 5 días" · "Entró el mar 15 de sep" · "Nunca entró". En segunda persona para tu cuenta. */
export function ultimaVez(p: { visto: string | null; ultima_entrada: string | null }, ahora: Date = new Date(), tu = false): string {
  const hoy = diaLocal(ahora);
  const entrada = p.ultima_entrada ? diaLocal(new Date(p.ultima_entrada)) : null;
  const abrio = tu ? "Abriste la app" : "Abrió la app";
  const entro = tu ? "Entraste" : "Entró";
  if (p.visto && (!entrada || p.visto >= entrada)) {
    const d = diasEntre(p.visto, hoy);
    if (d <= 0) return `${abrio} hoy`;
    if (d === 1) return `${abrio} ayer`;
    if (d < 14) return `${abrio} hace ${d} días`;
    return `${abrio} hace ${Math.floor(d / 7)} semanas`;
  }
  if (entrada && p.ultima_entrada) {
    const d = diasEntre(entrada, hoy);
    if (d <= 0) return `${entro} hoy`;
    if (d === 1) return `${entro} ayer`;
    return `${entro} el ${diaCorto(p.ultima_entrada, ahora)}`;
  }
  return tu ? "Nunca entraste" : "Nunca entró";
}

function hace(iso: string, ahora: Date): string {
  const d = diasEntre(diaLocal(new Date(iso)), diaLocal(ahora));
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : d < 14 ? `hace ${d} días` : `el ${diaCorto(iso, ahora)}`;
}

/** Lo más significativo de cada quien, en una línea: "Abrió la app hoy · 3 voy · lleva Colectivo Barro". */
export function detallePersona(p: PersonaFila, ahora: Date = new Date(), buscar: string | null = null, tu = false): string {
  const porCorreo = buscar && p.correo_oculto && !normalizarNombre(p.nombre).includes(normalizarNombre(buscar)) ? p.correo_oculto : null;
  const vez = ultimaVez(p, ahora, tu);
  const nunca = !p.visto && !p.ultima_entrada;
  const partes = [
    porCorreo,
    p.reservado && "perfil reservado",
    porCorreo || p.reservado ? vez.charAt(0).toLowerCase() + vez.slice(1) : vez,
    nunca && `alta ${hace(p.creado_en, ahora)}`,
    nunca && !p.confirmado && "sin confirmar su correo",
    p.va_a > 0 && `${p.va_a} voy`,
    p.publico > 0 && `publicó ${p.publico}`,
    p.lleva && `lleva ${p.lleva}${p.lleva_n > 1 ? ` y ${p.lleva_n - 1} más` : ""}`,
  ];
  const texto = unir(partes);
  return porCorreo ? texto : mayuscula(texto);
}

export function textoAvisos(f: Pick<PersonaFicha, "telefonos" | "avisos_correo" | "avisos_correo_motivo">): string {
  const telefono = f.telefonos === 0 ? null : f.telefonos === 1 ? "en el teléfono" : `en ${f.telefonos} teléfonos`;
  const motivo = { baja: "correo apagado por la persona", rebote: "el correo rebota", queja: "marcó un correo como spam" } as const;
  const correo = f.avisos_correo ? "por correo" : f.avisos_correo_motivo ? motivo[f.avisos_correo_motivo] : null;
  return mayuscula(unir([telefono, correo], "Sin avisos"));
}

/** Los renglones de la ficha de administración (grupos Cuenta y Actividad): clave y valor ya escritos. */
export function datosPersona(f: PersonaFicha, ahora: Date = new Date()) {
  const publico = unir([contar(f.publico_eventos, "evento", "eventos"), contar(f.publico_lugares, "lugar", "lugares"), contar(f.publico_artistas, "artista", "artistas")], "Nada aún");
  return {
    alta: `${diaCorto(f.creado_en, ahora)} · ${hace(f.creado_en, ahora)}`,
    ultimaVez: ultimaVez(f, ahora, f.es_yo) + (!f.visto && !f.ultima_entrada && !f.confirmado ? ": no confirmó su correo" : ""),
    avisos: textoAvisos(f),
    vaA: unir([contar(f.va_a, "evento próximo", "eventos próximos"), contar(f.le_interesa, "le interesa", "le interesan")], "Nada próximo"),
    sigue: unir([contar(f.sigue_lugares, "lugar", "lugares"), contar(f.sigue_artistas, "artista", "artistas")], "Nada"),
    publico,
    reportes: unir([contar(f.reclamos, "reclamo", "reclamos"), contar(f.reportes, "reporte", "reportes"), f.pendientes > 0 && (f.pendientes === 1 ? "1 pendiente" : `${f.pendientes} pendientes`)], "Nada"),
  };
}

// ---------- rol (decisión 9, D1) ----------
export type EstadoRol = { etiqueta: string; detalle: string; accion: "hacer" | "quitar" | null };

/** El renglón de Rol: estado, detalle y la acción posible. Cada guarda se dice en el detalle; nada se esconde (P7). */
export function estadoRol(f: PersonaFicha, yo: string, ahora: Date = new Date()): EstadoRol {
  if (f.rol === "admin") {
    if (f.de_origen) return { etiqueta: "Administrador", detalle: "Desde el inicio: no se quita desde la app", accion: null };
    if (!f.puedo_cambiar_rol) return { etiqueta: "Administrador", detalle: "Solo quien fundó Somos Nosotros cambia el rol", accion: null };
    if (f.es_yo) return { etiqueta: "Administrador", detalle: nombradoPor(f, yo, ahora), accion: null };
    if (f.administradores <= 1) return { etiqueta: "Administrador", detalle: "Es el único administrador", accion: null };
    return { etiqueta: "Administrador", detalle: nombradoPor(f, yo, ahora), accion: "quitar" };
  }
  if (!f.puedo_cambiar_rol) return { etiqueta: "Usuario", detalle: "Solo quien fundó Somos Nosotros cambia el rol", accion: null };
  if (!f.confirmado) return { etiqueta: "Usuario", detalle: "Aún no confirma su correo: podrás hacerlo administrador cuando entre", accion: null };
  return { etiqueta: "Usuario", detalle: "Publica, dice Voy y sigue", accion: "hacer" };
}

/** "Desde hoy, lo nombraste tú" cuando quien lo nombró es quien mira; sin registro, "Desde el inicio". */
export function nombradoPor(f: Pick<PersonaFicha, "cambio_rol">, yo: string, ahora: Date = new Date()): string {
  const c = f.cambio_rol;
  if (!c || c.rol !== "admin") return "Desde el inicio";
  const quien = c.por === yo ? "lo nombraste tú" : c.por_nombre ? `lo nombró ${c.por_nombre}` : "lo nombró una cuenta borrada";
  return `Desde ${hace(c.creado_en, ahora)}, ${quien}`;
}

export type CodigoRol = "ok" | "sin_cambio" | "sin_permiso" | "rol_desconocido" | "no_existe" | "sin_confirmar" | "a_ti_mismo" | "de_origen" | "ultimo";

/** Lo que dice la hoja cuando la base no hizo el cambio: la causa, en palabras (A6, P7). */
export function textoCodigoRol(codigo: string): string | null {
  switch (codigo) {
    case "ok":
    case "sin_cambio":
      return null;
    case "sin_permiso":
      return "Solo quien fundó Somos Nosotros cambia el rol.";
    case "sin_confirmar":
      return "Aún no confirma su correo: podrás hacerlo administrador cuando entre.";
    case "a_ti_mismo":
      return "No te puedes quitar la administración a ti mismo.";
    case "de_origen":
      return "Es administrador desde el inicio: no se quita desde la app.";
    case "ultimo":
      return "Es el único administrador.";
    case "no_existe":
      return "Esta cuenta ya no existe.";
    default:
      return "No se pudo cambiar el rol. Intenta de nuevo.";
  }
}

// ---------- listas ----------
export const PAGINA_PANEL = 30;

export const FILTROS = {
  personas: [
    { valor: "todas", etiqueta: "Todas", vacio: "Aún no hay personas." },
    { valor: "nuevas", etiqueta: "Nuevas", vacio: "Nadie nuevo en 7 días." },
    { valor: "sin_entrar", etiqueta: "Sin entrar", vacio: "Todas las personas han entrado." },
    { valor: "administracion", etiqueta: "Administración", vacio: "Nadie tiene la administración." },
  ],
  lugares: [
    { valor: "todos", etiqueta: "Todos", vacio: "Aún no hay lugares." },
    { valor: "destacados", etiqueta: "Destacados", vacio: "Ningún lugar destacado ahora." },
    { valor: "ocultos", etiqueta: "Ocultos", vacio: "Ningún lugar oculto." },
    { valor: "sin_fecha", etiqueta: "Sin fecha próxima", vacio: "Todos los lugares tienen alguna fecha próxima." },
    { valor: "sin_foto", etiqueta: "Sin foto", vacio: "Todos los lugares tienen foto." },
    { valor: "catalogo", etiqueta: "Del catálogo", vacio: "Ningún lugar viene del catálogo." },
  ],
  eventos: [
    { valor: "proximos", etiqueta: "Próximos", vacio: "No hay eventos próximos." },
    { valor: "destacados", etiqueta: "Destacados", vacio: "Ningún evento destacado ahora." },
    { valor: "semana", etiqueta: "Esta semana", vacio: "No hay eventos en los próximos 7 días." },
    { valor: "sin_imagen", etiqueta: "Sin imagen", vacio: "Todos los eventos próximos tienen imagen." },
    { valor: "comunidad", etiqueta: "De la comunidad", vacio: "Aún no hay eventos próximos de la comunidad." },
    { valor: "ocultos", etiqueta: "Ocultos", vacio: "Ningún evento próximo oculto." },
  ],
  artistas: [
    { valor: "todos", etiqueta: "Todos", vacio: "Aún no hay artistas." },
    { valor: "destacados", etiqueta: "Destacados", vacio: "Ningún artista destacado ahora." },
    { valor: "por_reclamar", etiqueta: "Por reclamar", vacio: "No hay fichas del catálogo por reclamar." },
    { valor: "llevados", etiqueta: "Llevados por su gente", vacio: "Aún nadie lleva su ficha." },
    { valor: "sin_foto", etiqueta: "Sin foto", vacio: "Todos los artistas tienen foto." },
    { valor: "ocultos", etiqueta: "Ocultos", vacio: "Ningún artista oculto." },
  ],
} as const;
export type SeccionPanel = keyof typeof FILTROS;
export type Lista = { q: string | null; filtro: string; n: number };

export function esSeccionFichas(s: string): s is "lugares" | "eventos" | "artistas" {
  return s === "lugares" || s === "eventos" || s === "artistas";
}

/** El filtro de la URL con valores seguros: el filtro debe existir; `n`, múltiplo de la página y con tope. */
export function leerLista(seccion: SeccionPanel, p: { q?: string; filtro?: string; n?: string }): Lista {
  const filtros = FILTROS[seccion];
  const filtro = filtros.some((f) => f.valor === p.filtro) ? p.filtro! : filtros[0].valor;
  const n = Number(p.n);
  return { q: p.q?.trim().slice(0, 80) || null, filtro, n: Number.isInteger(n) && n > PAGINA_PANEL ? Math.min(Math.ceil(n / PAGINA_PANEL) * PAGINA_PANEL, 600) : PAGINA_PANEL };
}

/** La URL de una lista del panel, sin lo que vale por defecto. */
export function hrefLista(seccion: SeccionPanel, l: Partial<Lista>): string {
  const p = new URLSearchParams();
  if (l.q?.trim()) p.set("q", l.q.trim());
  if (l.filtro && l.filtro !== FILTROS[seccion][0].valor) p.set("filtro", l.filtro);
  if (l.n && l.n > PAGINA_PANEL) p.set("n", String(l.n));
  const s = p.toString();
  return `/admin/${seccion}${s ? `?${s}` : ""}`;
}

export function vacioDe(seccion: SeccionPanel, filtro: string, q: string | null): string {
  if (q) return seccion === "personas" ? `Nadie con «${q}».` : `Nada con «${q}».`;
  return FILTROS[seccion].find((f) => f.valor === filtro)?.vacio ?? "Nada por aquí.";
}

// ---------- renglones de fichas ----------
export function detalleLugar(l: LugarFila): string {
  return unir([
    etiquetaLugar(l),
    l.proximas ? contar(l.proximas, "fecha próxima", "fechas próximas") : l.visible && !l.privado ? "sin fecha próxima" : null,
    l.lleva ? `la lleva ${l.lleva}${l.lleva_n > 1 ? ` y ${l.lleva_n - 1} más` : ""}` : l.origen === "capo" ? "del catálogo, por reclamar" : null,
    l.privado && "privado",
  ]);
}

export function detalleEvento(e: EventoFila, ahora: Date = new Date()): string {
  return unir([formatearCuando(e.inicio, e.fin, ahora, e.zona), e.sitio, e.autor_admin ? null : `publicó ${e.autor ?? "una cuenta borrada"}`, contar(e.van, "va", "van")]);
}

export function detalleArtista(a: ArtistaFila): string {
  return unir([
    a.disciplina === "por_completar" ? "Disciplina por completar" : etiquetaDisciplina(a.disciplina) + (a.detalle ? ` · ${a.detalle}` : ""),
    a.proximas ? contar(a.proximas, "fecha próxima", "fechas próximas") : "sin fecha próxima",
    a.lleva ? `la lleva ${a.lleva}${a.lleva_n > 1 ? ` y ${a.lleva_n - 1} más` : ""}` : a.origen === "capo" ? "del catálogo, por reclamar" : null,
  ]);
}

/** Lo que dice el menú de los tres puntos: las mismas palabras que el menú de cada ficha. */
export function textoOcultar(seccion: "lugares" | "eventos" | "artistas", visible: boolean): string {
  if (!visible) return "Volver a mostrar";
  return seccion === "lugares" ? "Ocultar del mapa" : seccion === "eventos" ? "Ocultar de la agenda" : "Ocultar de Artistas";
}

export function rutaEditar(seccion: "lugares" | "eventos" | "artistas", id: string): string {
  return `/${seccion}/${id}/editar`;
}
