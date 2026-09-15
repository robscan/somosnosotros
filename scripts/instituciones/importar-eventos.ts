/**
 * Carga a la agenda los eventos elegidos de las agendas de las instituciones. Entran como los publica el admin
 * (--autor) y pasan la misma validación que el formulario (lib/eventos · validarEvento). No avisa a quienes siguen el
 * lugar: es una carga de agenda, no una publicación. Se salta lo pasado y lo que ya está (mismo título a la misma hora).
 * Quién se presenta se liga solo si el artista ya está registrado con ese nombre exacto; aquí no se crean artistas.
 * Uso: node scripts/instituciones/correr.mjs importar-eventos <eventos.json> --autor <id del admin> [--simular] [--salida <carpeta>]
 */
import { readFileSync } from "node:fs";
import { validarEvento } from "../../src/lib/eventos";
import { normalizarNombre } from "../../src/lib/lugares";
import { CIUDAD, guardarInforme, preparar } from "./entorno";
import { formularioDeEvento, resolverLugar, type EventoPropuesto } from "./instituciones";

const { archivo, autor, salida, simular, db } = preparar("importar-eventos");

/** Todas las filas de la ciudad, de mil en mil (PostgREST corta en 1 000 sin avisar). */
async function todas<T>(tabla: string, columnas: string): Promise<T[]> {
  let filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db.from(tabla).select(columnas).eq("ciudad", CIUDAD).range(desde, desde + 999);
    if (error) throw error;
    filas = filas.concat((data ?? []) as unknown as T[]);
    if (!data || data.length < 1000) return filas;
  }
}

async function main() {
  const propuestos = JSON.parse(readFileSync(archivo, "utf8")) as EventoPropuesto[];
  const [lugares, eventos, artistas] = await Promise.all([
    todas<{ id: string; nombre: string }>("lugares", "id, nombre"),
    todas<{ titulo: string; inicio: string }>("eventos", "titulo, inicio"),
    todas<{ id: string; nombre: string }>("artistas", "id, nombre"),
  ]);
  const clave = (titulo: string, inicio: string) => `${normalizarNombre(titulo)}|${new Date(inicio).toISOString()}`;
  const yaEstan = new Set(eventos.map((e) => clave(e.titulo, e.inicio)));
  const artistaPorNombre = new Map(artistas.map((a) => [normalizarNombre(a.nombre), a.id]));
  const informe = { entran: [] as string[], ya: [] as string[], sinLugar: [] as string[], fallidos: [] as string[] };
  const cargados: { id: string; nombre: string }[] = [];
  const ahora = new Date();

  for (const e of propuestos) {
    const lugar = resolverLugar(e.lugar, lugares);
    if (e.lugar && !lugar) {
      informe.sinLugar.push(`- ${e.titulo} · «${e.lugar}» no está registrado (o se parece a varios)`);
      continue;
    }
    const { datos, errores } = validarEvento(formularioDeEvento(e, lugar?.id ?? null));
    if (Object.keys(errores).length) {
      informe.fallidos.push(`- ${e.titulo}: ${Object.values(errores).join(" ")}`);
      continue;
    }
    if (new Date(datos.inicio) < ahora) {
      informe.fallidos.push(`- ${e.titulo}: ya pasó (${e.fecha} ${e.hora})`);
      continue;
    }
    if (yaEstan.has(clave(datos.titulo, datos.inicio))) {
      informe.ya.push(`- ${e.titulo} · ${e.fecha} ${e.hora}`);
      continue;
    }
    yaEstan.add(clave(datos.titulo, datos.inicio));
    // El informe dice con quién se liga cada evento: un nombre común puede ser otra persona del catálogo.
    const conFicha = (e.artistas ?? []).filter((n) => artistaPorNombre.has(normalizarNombre(n)));
    const ligados = [...new Set(conFicha.map((n) => artistaPorNombre.get(normalizarNombre(n)) ?? ""))];
    const linea = `- ${e.fecha} ${e.hora} · ${e.titulo} · ${lugar?.nombre ?? datos.sitio_texto} · ${datos.precio ?? "gratis"}${conFicha.length ? ` · con ${conFicha.join(", ")}` : ""}`;
    if (simular) {
      informe.entran.push(linea);
      continue;
    }
    const { privado: _p, ...fila } = datos;
    void _p;
    const { data, error } = await db
      .from("eventos")
      .insert({ ...fila, descripcion: fila.descripcion || null, ciudad: CIUDAD, creado_por: autor })
      .select("id")
      .single();
    if (error || !data) {
      informe.fallidos.push(`- ${e.titulo}: ${error?.message ?? "sin id"}`);
      continue;
    }
    if (ligados.length) {
      const { error: sinArtistas } = await db.from("eventos_artistas").insert(ligados.map((artista_id, orden) => ({ evento_id: data.id, artista_id, orden })));
      if (sinArtistas) informe.fallidos.push(`- ${e.titulo}: entró, pero sin ligar artistas (${sinArtistas.message})`);
    }
    cargados.push({ id: data.id, nombre: e.titulo });
    informe.entran.push(`${linea} · ${data.id}`);
    process.stdout.write(".");
  }

  const resumen = `Propuestos ${propuestos.length} · ${simular ? "entrarían" : "cargados"} ${informe.entran.length} · ya estaban ${informe.ya.length} · lugar sin registrar ${informe.sinLugar.length} · fallaron ${informe.fallidos.length}`;
  const ruta = guardarInforme(
    salida,
    "eventos",
    [
      `# Agenda de las instituciones → eventos · ${new Date().toISOString()}${simular ? " (simulación)" : ""}`,
      "",
      resumen,
      "",
      `## ${simular ? "Entrarían" : "Cargados"}`,
      ...informe.entran,
      "",
      "## Ya estaban",
      ...informe.ya,
      "",
      "## Lugar sin registrar",
      ...informe.sinLugar,
      "",
      "## Fallaron o ya pasaron",
      ...informe.fallidos,
      "",
    ],
    cargados,
    simular,
  );
  console.log(`\n${resumen}\nInforme: ${ruta}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
