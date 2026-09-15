/** Textos y resúmenes de la parte social: quién va, avisos por correo. */

export type Asistente = { id: string; nombre: string; foto: string | null };

/** "Van 3: Ana, Luis y 1 más" · "Va Ana" · "" si nadie. */
export function resumenAsistentes(asistentes: Asistente[], maximo = 2): string {
  const n = asistentes.length;
  if (n === 0) return "";
  const nombres = asistentes.map((a) => primerNombre(a.nombre)).filter(Boolean);
  const primeros = nombres.slice(0, maximo);
  const resto = n - primeros.length;
  const lista = resto > 0 ? `${primeros.join(", ")} y ${resto} más` : primeros.length === 2 ? `${primeros[0]} y ${primeros[1]}` : primeros.join(", ");
  return n === 1 ? `Va ${lista}` : `Van ${n}: ${lista}`;
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(" ")[0] ?? "";
}

const ORIGEN = "https://somosnosotros.org";

type Plantilla = { titulo: string; cuando: string; lugar: string; eventoId: string; bajaUrl?: string };

/** Pie de todo aviso: por qué llega y cómo dejar de recibirlo con un toque, sin entrar. */
function pie(porque: string, bajaUrl: string | undefined): { texto: string; html: string } {
  const baja = bajaUrl ?? `${ORIGEN}/perfil`;
  return {
    texto: `${porque} Dejar de recibir avisos (un toque, sin entrar): ${baja}\nAviso de privacidad: ${ORIGEN}/privacidad`,
    html: `<p style="color:#5c5c5c;font-size:13px">${escapar(porque)} <a href="${baja}">Dejar de recibir avisos</a> (un toque, sin entrar). <a href="${ORIGEN}/privacidad">Aviso de privacidad</a>.</p>`,
  };
}

export function correoNuevoEvento(p: Plantilla): { asunto: string; texto: string; html: string } {
  const url = `${ORIGEN}/eventos/${p.eventoId}`;
  const asunto = `Nuevo en ${p.lugar}: ${p.titulo}`;
  const f = pie(`Recibes esto porque sigues ${p.lugar} y pediste avisos por correo.`, p.bajaUrl);
  const texto = `${p.titulo}\n${p.cuando} · ${p.lugar}\n\nVer el evento: ${url}\n\n${f.texto}`;
  const html = `<p><strong>${escapar(p.titulo)}</strong><br>${escapar(p.cuando)} · ${escapar(p.lugar)}</p><p><a href="${url}">Ver el evento</a></p>${f.html}`;
  return { asunto, texto, html };
}

/** Qué cambió, en palabras: "la fecha", "el lugar" o "la fecha y el lugar". */
export function textoCambio(cambio: "cuando" | "donde" | "ambos"): string {
  return cambio === "ambos" ? "la fecha y el lugar" : cambio === "cuando" ? "la fecha" : "el lugar";
}

export function correoCambioEvento(p: Plantilla & { cambio: "cuando" | "donde" | "ambos" }): { asunto: string; texto: string; html: string } {
  const url = `${ORIGEN}/eventos/${p.eventoId}`;
  const que = textoCambio(p.cambio);
  const asunto = `Cambió ${que}: ${p.titulo}`;
  const f = pie(`Recibes esto porque dijiste "Voy" a este evento y pediste avisos por correo.`, p.bajaUrl);
  const texto = `Cambió ${que} de ${p.titulo}.
Ahora es: ${p.cuando} · ${p.lugar}

Ver el evento: ${url}

${f.texto}`;
  const html = `<p>Cambió ${que} de <strong>${escapar(p.titulo)}</strong>.<br>Ahora es: ${escapar(p.cuando)} · ${escapar(p.lugar)}</p><p><a href="${url}">Ver el evento</a></p>${f.html}`;
  return { asunto, texto, html };
}

export function correoRecordatorio(p: Plantilla): { asunto: string; texto: string; html: string } {
  const url = `${ORIGEN}/eventos/${p.eventoId}`;
  const asunto = `Hoy: ${p.titulo}`;
  const f = pie(`Recibes esto porque dijiste "Voy" y pediste el recordatorio por correo.`, p.bajaUrl);
  const texto = `Hoy vas a ${p.titulo}\n${p.cuando} · ${p.lugar}\n\nVer el evento y quién más va: ${url}\n\n${f.texto}`;
  const html = `<p>Hoy vas a <strong>${escapar(p.titulo)}</strong><br>${escapar(p.cuando)} · ${escapar(p.lugar)}</p><p><a href="${url}">Ver el evento y quién más va</a></p>${f.html}`;
  return { asunto, texto, html };
}

/** "robscan@gmail.com" → "ro…@gmail.com": evidencia de a dónde se escribe sin exponer el correo completo. */
export function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.split("@");
  if (!usuario || !dominio) return correo;
  return `${usuario.slice(0, 2)}…@${dominio}`;
}

function escapar(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
