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

export function correoNuevoEvento(p: { titulo: string; cuando: string; lugar: string; eventoId: string }): { asunto: string; texto: string; html: string } {
  const url = `${ORIGEN}/eventos/${p.eventoId}`;
  const asunto = `Nuevo en ${p.lugar}: ${p.titulo}`;
  const texto = `${p.titulo}\n${p.cuando} · ${p.lugar}\n\nVer el evento: ${url}\n\nRecibes esto porque sigues ${p.lugar} en Somos Nosotros. Para dejar de recibir avisos, apágalos en tu perfil: ${ORIGEN}/perfil`;
  const html = `<p><strong>${escapar(p.titulo)}</strong><br>${escapar(p.cuando)} · ${escapar(p.lugar)}</p><p><a href="${url}">Ver el evento</a></p><p style="color:#5c5c5c;font-size:13px">Recibes esto porque sigues ${escapar(p.lugar)} en Somos Nosotros. Para dejar de recibir avisos, apágalos en <a href="${ORIGEN}/perfil">tu perfil</a>.</p>`;
  return { asunto, texto, html };
}

export function correoRecordatorio(p: { titulo: string; cuando: string; lugar: string; eventoId: string }): { asunto: string; texto: string; html: string } {
  const url = `${ORIGEN}/eventos/${p.eventoId}`;
  const asunto = `Hoy: ${p.titulo}`;
  const texto = `Hoy vas a ${p.titulo}\n${p.cuando} · ${p.lugar}\n\nVer el evento y quién más va: ${url}\n\nRecibes esto porque dijiste "Voy". Para dejar de recibir avisos, apágalos en tu perfil: ${ORIGEN}/perfil`;
  const html = `<p>Hoy vas a <strong>${escapar(p.titulo)}</strong><br>${escapar(p.cuando)} · ${escapar(p.lugar)}</p><p><a href="${url}">Ver el evento y quién más va</a></p><p style="color:#5c5c5c;font-size:13px">Recibes esto porque dijiste "Voy". Para dejar de recibir avisos, apágalos en <a href="${ORIGEN}/perfil">tu perfil</a>.</p>`;
  return { asunto, texto, html };
}

function escapar(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
