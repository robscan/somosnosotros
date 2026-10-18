import { describe, expect, it } from "vitest";
import { datosPersona, type PersonaFicha } from "./panel";
import {
  cuandoPublicado,
  disciplinaArtista,
  dondePublicado,
  estadoArtista,
  estadoEvento,
  estadoLugar,
  faltanPublicado,
  fotoEventoPublicado,
  hrefVerMasPublicado,
  leerPaginasPublicado,
  PAGINA_PUBLICADO,
  tipoLugar,
  TOPE_PUBLICADO,
  totalesPublicado,
  totalPublicado,
  type EventoPublicado,
  type Publicado,
} from "./panelPublicado";

const AHORA = new Date("2026-10-18T16:00:00Z"); // domingo 18 de octubre, 10:00 en San Luis Potosí
const ZONA = "America/Mexico_City";
const PERFIL = "11111111-1111-4111-8111-111111111111";

function evento(extra: Partial<EventoPublicado> = {}): EventoPublicado {
  return { id: "e1", slug: "e1", titulo: "Evento", imagen: null, inicio: "2026-10-22T01:00:00Z", fin: null, zona: ZONA, clase: "puntual", visible: true, borrador: false, cancelado: false, evento_padre_id: null, creado_en: "2026-10-10T18:00:00Z", sitio_texto: null, lugar: null, ...extra };
}

function publicado(eventos: number, lugares: number, artistas: number, vistos = { eventos, lugares, artistas }): Publicado {
  const filas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
  return {
    eventos: { filas: filas(vistos.eventos) as unknown as EventoPublicado[], total: eventos },
    lugares: { filas: filas(vistos.lugares) as unknown as Publicado["lugares"]["filas"], total: lugares },
    artistas: { filas: filas(vistos.artistas) as unknown as Publicado["artistas"]["filas"], total: artistas },
    festivales: {},
  };
}

function ficha(extra: Partial<PersonaFicha> = {}): PersonaFicha {
  return {
    id: PERFIL, nombre: "Ana", foto: null, colonia: null, reservado: false, rol: "usuario", creado_en: "2026-09-13T18:00:00Z", correo_oculto: null, confirmado: true, ultima_entrada: null, visto: null,
    avisos_correo: false, avisos_correo_motivo: null, telefonos: 0, va_a: 0, le_interesa: 0, sigue_lugares: 0, sigue_artistas: 0, publico_lugares: 0, publico_eventos: 0, publico_artistas: 0,
    lleva: [], reclamos: 0, reportes: 0, pendientes: 0, de_origen: false, es_yo: false, puedo_cambiar_rol: true, administradores: 1, cambio_rol: null, ...extra,
  };
}

describe("lo que el público no ve", () => {
  it("un acto sin publicar es Borrador; lo ocultado, Oculto; lo cancelado, Cancelado; uno solo y en ese orden", () => {
    expect(estadoEvento({ visible: true, borrador: false, cancelado: false })).toBeNull();
    expect(estadoEvento({ visible: false, borrador: true, cancelado: false })).toBe("Borrador");
    expect(estadoEvento({ visible: false, borrador: false, cancelado: true })).toBe("Oculto");
    expect(estadoEvento({ visible: true, borrador: null, cancelado: true })).toBe("Cancelado");
  });
  it("un lugar oculto o privado; un artista oculto", () => {
    expect(estadoLugar({ visible: true, privado: false })).toBeNull();
    expect(estadoLugar({ visible: false, privado: true })).toBe("Oculto");
    expect(estadoLugar({ visible: true, privado: true })).toBe("Privado");
    expect(estadoArtista({ visible: false })).toBe("Oculto");
    expect(estadoArtista({ visible: true })).toBeNull();
  });
});

describe("la meta de cada renglón", () => {
  it("un evento dice su día; con varios días, sus días; su clase si no es suelto", () => {
    expect(cuandoPublicado(evento(), null, AHORA)).toBe("mié 21 de oct");
    expect(cuandoPublicado(evento({ inicio: "2026-10-18T20:00:00Z" }), null, AHORA)).toBe("Hoy");
    expect(cuandoPublicado(evento({ clase: "festival", inicio: "2026-10-24T00:00:00Z", fin: "2026-10-27T06:00:00Z" }), null, AHORA)).toBe("Festival · Del 23 al 27 de oct");
    expect(cuandoPublicado(evento({ clase: "exposicion", inicio: "2026-09-15T06:00:00Z", fin: "2026-11-09T05:59:00Z" }), null, AHORA)).toMatch(/^Exposición · Del 15 de sep al 8 de nov/);
  });
  it("un acto de festival dice su día primero y luego de qué festival es", () => {
    expect(cuandoPublicado(evento({ evento_padre_id: "f1" }), "Festival de Cine de Invierno", AHORA)).toBe("mié 21 de oct · acto de Festival de Cine de Invierno");
  });
  it("dónde: el lugar con ficha, el sitio escrito o por confirmar", () => {
    expect(dondePublicado({ lugar: { nombre: "ACHE Galería", portada: null }, sitio_texto: "otro" })).toBe("ACHE Galería");
    expect(dondePublicado({ lugar: null, sitio_texto: "Jardín de San Juan de Dios" })).toBe("Jardín de San Juan de Dios");
    expect(dondePublicado({ lugar: null, sitio_texto: null })).toBe("Sitio por confirmar");
  });
  it("la foto de un evento: su cartel o la portada de su lugar", () => {
    expect(fotoEventoPublicado({ imagen: "a.jpg", lugar: { nombre: "x", portada: "b.jpg" } })).toBe("a.jpg");
    expect(fotoEventoPublicado({ imagen: null, lugar: { nombre: "x", portada: "b.jpg" } })).toBe("b.jpg");
    expect(fotoEventoPublicado({ imagen: null, lugar: null })).toBeNull();
  });
  it("un lugar dice su tipo; un artista, su disciplina", () => {
    expect(tipoLugar({ tipo: "galeria", detalle: null })).toBe("Galería");
    expect(tipoLugar({ tipo: "otro", detalle: "Patio de vecindad" })).toBe("Otro · Patio de vecindad");
    expect(disciplinaArtista({ disciplina: "musica", detalle: "Acordeón" })).toBe("Música · Acordeón");
    expect(disciplinaArtista({ disciplina: "teatro", detalle: null })).toBe("Teatro");
    expect(disciplinaArtista({ disciplina: "por_completar", detalle: null })).toBe("Disciplina por completar");
  });
});

describe("el número de «Publicó» es el de la lista", () => {
  it("los totales de la lectura van al renglón Publicó con las palabras de siempre", () => {
    const p = publicado(9, 2, 2);
    const d = datosPersona({ ...ficha({ publico_eventos: 99, publico_lugares: 99 }), ...totalesPublicado(p) }, AHORA);
    expect(d.publico).toBe("9 eventos · 2 lugares · 2 artistas");
    expect(totalPublicado(p)).toBe(13);
  });
  it("sin nada publicado, «Nada aún» y no hay lista", () => {
    const p = publicado(0, 0, 0);
    expect(datosPersona({ ...ficha(), ...totalesPublicado(p) }, AHORA).publico).toBe("Nada aún");
    expect(totalPublicado(p)).toBe(0);
  });
  it("«Ver más» dice cuántos faltan, y nada al llegar al total o al tope", () => {
    expect(faltanPublicado({ filas: Array(20).fill(0), total: 27 })).toBe(7);
    expect(faltanPublicado({ filas: Array(27).fill(0), total: 27 })).toBe(0);
    expect(faltanPublicado({ filas: Array(TOPE_PUBLICADO).fill(0), total: TOPE_PUBLICADO + 5 })).toBe(0);
  });
});

describe("la URL de «Ver más»", () => {
  it("de 20 en 20, de 20 al tope, y lo que no se entiende vale 20", () => {
    expect(leerPaginasPublicado({})).toEqual({ eventos: PAGINA_PUBLICADO, lugares: PAGINA_PUBLICADO, artistas: PAGINA_PUBLICADO });
    expect(leerPaginasPublicado({ eventos: "40", lugares: "abc", artistas: "-3" })).toEqual({ eventos: 40, lugares: 20, artistas: 20 });
    expect(leerPaginasPublicado({ eventos: "41" }).eventos).toBe(60);
    expect(leerPaginasPublicado({ eventos: "100000" }).eventos).toBe(TOPE_PUBLICADO);
    expect(leerPaginasPublicado({ eventos: ["40", "60"] }).eventos).toBe(40);
  });
  it("suma 20 al tipo tocado y conserva lo abierto de los otros", () => {
    expect(hrefVerMasPublicado(PERFIL, { eventos: 20, lugares: 20, artistas: 20 }, "eventos")).toBe(`/admin/personas/${PERFIL}?eventos=40`);
    expect(hrefVerMasPublicado(PERFIL, { eventos: 40, lugares: 20, artistas: 20 }, "artistas")).toBe(`/admin/personas/${PERFIL}?eventos=40&artistas=40`);
    expect(hrefVerMasPublicado(PERFIL, { eventos: TOPE_PUBLICADO, lugares: 20, artistas: 20 }, "eventos")).toBe(`/admin/personas/${PERFIL}?eventos=${TOPE_PUBLICADO}`);
  });
});
