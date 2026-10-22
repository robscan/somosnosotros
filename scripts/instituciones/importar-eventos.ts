/**
 * Carga a la agenda los eventos elegidos de las agendas de las instituciones. Entran como los publica el admin
 * (--autor, que tiene que ser una cuenta de la administración) y pasan la misma validación que el formulario (lib/eventos · validarEvento).
 * No avisa a quienes siguen el lugar: es una carga de agenda, no una publicación (inserta sin sesión, así que el evento queda «no nativo» y el
 * outbox no crea ningún job; banco supabase/tests/pg/eventos-procedencia.test.mjs). Se salta lo que ya está (mismo título a la misma hora).
 * Tampoco carga lo que se parece a un evento ya publicado (OL-384, como «¿Es este?» del alta): el mismo día, en el mismo sitio y con un título
 * parecido según `eventos_parecidos` (por ejemplo «Gitanos mexicanos 2.ª edición: Pargazz» y «Pargazz: Gitanos mexicanos, 2ª Edición»); queda en
 * el informe con el evento al que se parece. Con --forzar-parecidos se cargan igual (y el informe lo dice). Con --simular solo informa.
 * Quién se presenta se liga con el cruce de OL-440 (`artistasDelEvento` de src/lib/cargaEventos.ts: el mismo nombre aunque se escriba distinto,
 * apellidos de más, el mismo grupo, integrante de un grupo, o la ficha que el título nombra); aquí no se crean artistas: los nombres sin ficha
 * quedan en el informe y los propone scripts/instituciones/ligar-artistas.ts.
 *
 * Procedencia (OL-424): --origen <texto> y --fuente <url> quedan en cada fila cargada (`eventos.origen`, `eventos.fuente_url`) y en el informe.
 * Sin --historico, lo pasado se salta («ya pasó»), como siempre. Con --historico (que exige --origen y --fuente) lo pasado entra, visible: la
 * agenda ya no lo enseña y el historial de lugares y artistas, «Quién fue» y el grafo sí lo cuentan. Como `eventos_parecidos` no mira lo pasado,
 * lo pasado se compara también contra todo lo guardado ese día en ese sitio (instituciones.ts · parecidoGuardado). Y un `sitio` sin punto se
 * busca en Mapbox (mapbox.ts · ubicarSitio, dentro de la ciudad); si no aparece, el evento no entra y el informe lo lista en «Sitio sin punto».
 *
 * Uso: node scripts/instituciones/correr.mjs importar-eventos <eventos.json> --autor <id del admin> [--simular] [--forzar-parecidos]
 *        [--origen <texto> --fuente <url> [--historico]] [--salida <carpeta>]
 */
import { readFileSync } from "node:fs";
import { validarEvento } from "../../src/lib/eventos";
import type { EventoParecido } from "../../src/lib/eventosParecidos";
import { formatearCuando } from "../../src/lib/fechas";
import { LIMITES_EVENTO } from "../../src/lib/limites";
import { normalizarNombre } from "../../src/lib/lugares";
import { CIUDAD, guardarInforme, preparar } from "./entorno";
// La lógica de carga es la misma del servidor (OL-429: src/lib/cargaEventos.ts, que usa también la rutina de agendas).
import { artistasDelEvento, formularioDeEvento, parecidoGuardado, resolverLugar, type Eleccion, type EventoGuardado, type EventoPropuesto } from "../../src/lib/cargaEventos";
import { COMO_CRUCE, indiceDeArtistas, type FichaArtista } from "../../src/lib/cruceArtistas";
import { opcionesDeCarga } from "./instituciones";
import { ubicarSitio } from "./mapbox";

const { archivo, autor, salida, simular, token, db } = preparar("importar-eventos");
/** Cargar también lo que se parece a un evento ya publicado (el informe lo dice igual). */
const forzarParecidos = process.argv.includes("--forzar-parecidos");
const opciones = opcionesDeCarga(process.argv.slice(2));
if ("error" in opciones) {
  console.error(opciones.error);
  process.exit(1);
}
const { historico, origen, fuente } = opciones;

/** Todas las filas de la ciudad, de mil en mil (PostgREST corta en 1 000 sin avisar). */
async function todas<T>(tabla: string, columnas: string): Promise<T[]> {
  let filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db.from(tabla).select(columnas).eq("ciudad", CIUDAD).order("id").range(desde, desde + 999);
    if (error) throw error;
    filas = filas.concat((data ?? []) as unknown as T[]);
    if (!data || data.length < 1000) return filas;
  }
}

async function main() {
  // Una carga a nombre de otra cuenta le sumaría a la administración un aviso de «evento nuevo» por fila (avisos_admin_trigger_eventos).
  const { data: perfil, error: sinPerfil } = await db.from("perfiles").select("rol").eq("id", autor).maybeSingle();
  if (sinPerfil) throw sinPerfil;
  if ((perfil as { rol?: string } | null)?.rol !== "admin") {
    console.error(`--autor ${autor} no es una cuenta de la administración: las cargas van a su nombre (y así no generan avisos).`);
    process.exit(1);
  }

  const propuestos = JSON.parse(readFileSync(archivo, "utf8")) as EventoPropuesto[];
  const [lugares, eventos, artistas] = await Promise.all([
    todas<{ id: string; nombre: string }>("lugares", "id, nombre"),
    todas<EventoGuardado>("eventos", "id, titulo, inicio, zona, lugar_id, sitio_texto, clase, borrador, visible"),
    todas<FichaArtista>("artistas", "id, nombre, tipo, disciplina, detalle, descripcion, visible"),
  ]);
  const clave = (titulo: string, inicio: string) => `${normalizarNombre(titulo)}|${new Date(inicio).toISOString()}`;
  const yaEstan = new Set(eventos.map((e) => clave(e.titulo, e.inicio)));
  const indiceArtistas = indiceDeArtistas(artistas, CIUDAD);
  const informe = { entran: [] as string[], ya: [] as string[], parecidos: [] as string[], sinPunto: [] as string[], sinLugar: [] as string[], fallidos: [] as string[], sinFicha: [] as string[] };
  const cargados: { id: string; nombre: string }[] = [];
  const ahora = new Date();
  const mapbox = token ? { token } : null;
  /** Un sitio se busca una sola vez aunque la agenda lo repita en varios eventos. */
  const ubicaciones = new Map<string, Eleccion | null>();

  for (const e of propuestos) {
    const lugar = resolverLugar(e.lugar, lugares);
    if (e.lugar && !lugar) {
      informe.sinLugar.push(`- ${e.titulo} · «${e.lugar}» no tiene ficha (o se parece a varios)`);
      continue;
    }
    // OL-424: todo sitio lleva su punto (OL-348). En una carga histórica, el que llega sin él se busca en Mapbox por su nombre (y su dirección).
    let propuesto = e;
    let ubicado = "";
    if (historico && !lugar && e.sitio?.trim() && (e.sitio_lat == null || e.sitio_lng == null)) {
      const buscado = normalizarNombre(`${e.sitio} ${e.sitio_direccion ?? ""}`);
      if (!ubicaciones.has(buscado)) ubicaciones.set(buscado, mapbox ? await ubicarSitio(e.sitio, e.sitio_direccion, mapbox) : null);
      const eleccion = ubicaciones.get(buscado);
      if (!eleccion) {
        informe.sinPunto.push(`- ${e.fecha} ${e.hora} · ${e.titulo} · «${e.sitio}»${e.sitio_direccion ? ` (${e.sitio_direccion})` : ""}${mapbox ? "" : " · sin NEXT_PUBLIC_MAPBOX_TOKEN no se buscó"}`);
        continue;
      }
      const direccion = e.sitio_direccion?.trim() || (eleccion.punto.direccion.length <= LIMITES_EVENTO.direccion ? eleccion.punto.direccion : "");
      propuesto = { ...e, sitio_lat: eleccion.punto.lat, sitio_lng: eleccion.punto.lng, sitio_direccion: direccion || null };
      const como = eleccion.nota ? `${eleccion.como}: ${eleccion.nota}` : `${eleccion.como}${eleccion.punto.nombre ? `: «${eleccion.punto.nombre}»` : ""}`;
      ubicado = ` · ubicado en ${eleccion.punto.lat.toFixed(5)}, ${eleccion.punto.lng.toFixed(5)}${direccion ? `, «${direccion}»` : ""} (${como})`;
    }
    const { datos, errores } = validarEvento(formularioDeEvento(propuesto, lugar?.id ?? null));
    if (Object.keys(errores).length) {
      informe.fallidos.push(`- ${e.titulo}: ${Object.values(errores).join(" ")}`);
      continue;
    }
    const pasado = new Date(datos.inicio) < ahora;
    if (pasado && !historico) {
      informe.fallidos.push(`- ${e.titulo}: ya pasó (${e.fecha} ${e.hora}); con --historico entra`);
      continue;
    }
    if (yaEstan.has(clave(datos.titulo, datos.inicio))) {
      informe.ya.push(`- ${e.titulo} · ${e.fecha} ${e.hora}`);
      continue;
    }
    // OL-384: lo que se parece a un evento ya publicado (el mismo día, en el mismo sitio, con un título parecido) no se carga, salvo con
    // --forzar-parecidos. Sin la función en la base (la migración 20261012120000 sin aplicar) no se carga nada sin forzar: mejor parar que duplicar.
    const { data: parecidos, error: errorParecidos } = await db.rpc("eventos_parecidos", { p_titulo: datos.titulo, p_inicio: datos.inicio, p_zona: datos.zona, p_lugar_id: datos.lugar_id, p_sitio_texto: datos.sitio_texto });
    if (errorParecidos && !forzarParecidos) {
      informe.fallidos.push(`- ${e.titulo}: no se pudo comprobar si ya hay uno parecido (${errorParecidos.message})`);
      continue;
    }
    const enLaBase = ((parecidos ?? []) as EventoParecido[])[0];
    // OL-424: `eventos_parecidos` solo ve lo que no ha pasado; para lo pasado se compara con todo lo guardado (y lo cargado en esta misma vuelta).
    const guardado = !enLaBase && pasado ? parecidoGuardado(datos, eventos, lugares) : null;
    const parecido = enLaBase ?? guardado;
    if (parecido) {
      const cuando = formatearCuando(parecido.inicio, null, ahora, parecido.zona ?? datos.zona);
      const oculto = guardado && guardado.visible === false ? ", oculto" : "";
      informe.parecidos.push(`- ${e.fecha} ${e.hora} · ${e.titulo} · ya existe «${parecido.titulo}» (${cuando}${oculto} · ${parecido.id})${forzarParecidos ? " · se carga igual" : ""}`);
      if (!forzarParecidos) continue;
    }
    yaEstan.add(clave(datos.titulo, datos.inicio));
    // El informe dice con quién se liga cada evento y cómo se supo: un nombre común puede ser otra persona del catálogo.
    const quienes = artistasDelEvento(e, indiceArtistas);
    const ligados = quienes.ligados.map((l) => l.id);
    const conFicha = quienes.ligados.map((l) =>
      l.como === "igual" ? l.ficha : `${l.ficha} (${COMO_CRUCE[l.como]}${l.nombres.length ? `: ${l.nombres.map((n) => `«${n.nombre}»`).join(", ")}` : ""})`,
    );
    const sinFicha = [
      ...quienes.sinFicha,
      ...quienes.ambiguos.map((a) => `${a.nombre} (se parece a ${a.fichas.join(" y ")})`),
      ...quienes.ocultos.map((o) => `${o.nombre} (ficha oculta «${o.ficha}»)`),
    ];
    if (sinFicha.length) informe.sinFicha.push(`- ${e.fecha} ${e.titulo}: ${sinFicha.join(", ")}`);
    const linea = `- ${e.fecha} ${e.hora} · ${e.titulo} · ${lugar?.nombre ?? datos.sitio_texto}${ubicado} · ${datos.precio ?? "gratis"}${conFicha.length ? ` · con ${conFicha.join(", ")}` : ""}`;
    const enEstaVuelta = (id: string): EventoGuardado => ({ id, titulo: datos.titulo, inicio: datos.inicio, zona: datos.zona, lugar_id: datos.lugar_id, sitio_texto: datos.sitio_texto, clase: "puntual", borrador: false, visible: true });
    if (simular) {
      eventos.push(enEstaVuelta(`(simulado: ${e.titulo})`));
      informe.entran.push(linea);
      continue;
    }
    const { privado: _p, ...fila } = datos;
    void _p;
    const { data, error } = await db
      .from("eventos")
      // Las dos columnas solo cuando se pasan: una carga sin --origen sigue funcionando aunque la migración 20261020120000 no esté aplicada.
      .insert({ ...fila, descripcion: fila.descripcion || null, ciudad: CIUDAD, creado_por: autor, ...(origen ? { origen } : {}), ...(fuente ? { fuente_url: fuente } : {}) })
      .select("id")
      .single();
    if (error || !data) {
      informe.fallidos.push(`- ${e.titulo}: ${error?.message ?? "sin id"}`);
      continue;
    }
    eventos.push(enEstaVuelta(data.id));
    if (ligados.length) {
      const { error: sinArtistas } = await db.from("eventos_artistas").insert(ligados.map((artista_id, orden) => ({ evento_id: data.id, artista_id, orden })));
      if (sinArtistas) informe.fallidos.push(`- ${e.titulo}: entró, pero sin ligar artistas (${sinArtistas.message})`);
    }
    cargados.push({ id: data.id, nombre: e.titulo });
    informe.entran.push(`${linea} · ${data.id}`);
    process.stdout.write(".");
  }

  const resumen = `Propuestos ${propuestos.length} · ${simular ? "entrarían" : "cargados"} ${informe.entran.length} · ya estaban ${informe.ya.length} · ya existen parecidos ${informe.parecidos.length}${forzarParecidos ? " (cargados igual)" : ""} · sitio sin punto ${informe.sinPunto.length} · lugar sin registrar ${informe.sinLugar.length} · fallaron ${informe.fallidos.length}`;
  const procedencia = `Origen: ${origen ?? "sin origen (como lo publica la administración)"} · Fuente: ${fuente ?? "sin fuente"}${historico ? " · carga histórica: entran también los eventos que ya pasaron" : ""}`;
  const ruta = guardarInforme(
    salida,
    "eventos",
    [
      `# Agenda de las instituciones → eventos · ${new Date().toISOString()}${simular ? " (simulación)" : ""}`,
      "",
      procedencia,
      "",
      resumen,
      "",
      `## ${simular ? "Entrarían" : "Cargados"}`,
      ...informe.entran,
      "",
      "## Ya estaban",
      ...informe.ya,
      "",
      `## Ya existen parecidos${forzarParecidos ? " (cargados igual: --forzar-parecidos)" : " (no se cargaron; con --forzar-parecidos entran)"}`,
      ...informe.parecidos,
      "",
      "## Sitio sin punto (Mapbox no lo encontró en la ciudad: ponerle punto o lugar a mano)",
      ...informe.sinPunto,
      "",
      "## Lugar sin registrar",
      ...informe.sinLugar,
      "",
      "## Fallaron o ya pasaron",
      ...informe.fallidos,
      "",
      "## Artistas sin ficha, parecidos a varias u ocultas (no se ligaron; ligar-artistas propone los que no tienen ficha)",
      ...informe.sinFicha,
      "",
    ],
    cargados,
    simular,
  );
  console.log(`\n${procedencia}\n${resumen}\nInforme: ${ruta}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
