/**
 * Da de alta como lugares las instituciones culturales investigadas (museos, casas de cultura, teatros, escuelas,
 * galerías…) que no estaban en la base. Entran como las registra el admin: autor visible (--autor), sin origen, sin foto.
 * El pin sale de Mapbox por nombre y por dirección, contrastados (instituciones.ts · elegirPunto); lo que no se ubica
 * queda en el informe para darlo de alta desde el teléfono. Se puede repetir: lo que ya existe por nombre se salta.
 * Uso: node scripts/instituciones/correr.mjs importar <lugares.json> --autor <id del admin> [--simular] [--salida <carpeta>]
 */
import { readFileSync } from "node:fs";
import { normalizarNombre, validarLugar } from "../../src/lib/lugares";
import { CIUDAD, guardarInforme, preparar, requerida } from "./entorno";
import { elegirPunto, enCiudad, tipoDeInstitucion, type Institucion } from "./instituciones";
import { porDireccion, porNombre } from "./mapbox";

const { archivo, autor, salida, simular, token, db } = preparar("importar");
const TOKEN = requerida(token, "NEXT_PUBLIC_MAPBOX_TOKEN en .env");
const MAPBOX = { token: TOKEN };

async function main() {
  const instituciones = JSON.parse(readFileSync(archivo, "utf8")) as Institucion[];
  const { data, error } = await db.from("lugares").select("nombre").eq("ciudad", CIUDAD);
  if (error) throw error;
  const existentes = new Map((data ?? []).map((l: { nombre: string }) => [normalizarNombre(l.nombre), l.nombre]));
  const informe = { entran: [] as string[], ya: [] as string[], sinUbicar: [] as string[], fallidos: [] as string[] };
  const importados: { id: string; nombre: string }[] = [];

  for (const i of instituciones) {
    const nombres = [i.nombre, ...(i.alias ?? [])];
    const igual = nombres.map(normalizarNombre).find((n) => existentes.has(n));
    if (igual) {
      informe.ya.push(`- ${i.nombre} (ya está como «${existentes.get(igual)}»)`);
      continue;
    }
    const fuente = i.lat != null && i.lng != null && enCiudad({ lat: i.lat, lng: i.lng }) ? { lat: i.lat, lng: i.lng, direccion: i.direccion } : null;
    const [nombre, direccion] = await Promise.all([porNombre(nombres, MAPBOX), porDireccion(i.direccion, MAPBOX)]);
    const eleccion = elegirPunto(fuente, nombre, direccion, i.direccion);
    if (!eleccion) {
      informe.sinUbicar.push(`- ${i.nombre} · ${i.direccion || "sin dirección"}`);
      process.stdout.write("?");
      continue;
    }
    const tipo = tipoDeInstitucion(i);
    const { datos, errores } = validarLugar({
      nombre: i.nombre,
      tipo,
      direccion: i.direccion,
      lat: String(eleccion.punto.lat),
      lng: String(eleccion.punto.lng),
      descripcion: i.descripcion,
      portada: "",
      enlaces: JSON.stringify(i.enlaces),
      ciudad: CIUDAD,
    });
    if (Object.keys(errores).length) {
      informe.fallidos.push(`- ${i.nombre}: ${Object.values(errores).join(" ")}`);
      continue;
    }
    existentes.set(normalizarNombre(i.nombre), i.nombre);
    const linea = `- ${i.nombre} · ${tipo} · ${datos.lat.toFixed(5)}, ${datos.lng.toFixed(5)} (${eleccion.como})${eleccion.nota ? ` · ${eleccion.nota}` : ""}`;
    if (simular) {
      informe.entran.push(linea);
      continue;
    }
    const { data: fila, error: e } = await db
      .from("lugares")
      .insert({ ...datos, descripcion: datos.descripcion || null, direccion: datos.direccion || null, ciudad: CIUDAD, creado_por: autor, visible: true })
      .select("id")
      .single();
    if (e || !fila) {
      informe.fallidos.push(`- ${i.nombre}: ${e?.message ?? "sin id"}`);
      continue;
    }
    importados.push({ id: fila.id, nombre: i.nombre });
    informe.entran.push(`${linea} · ${fila.id}`);
    process.stdout.write(".");
  }

  const resumen = `Revisadas ${instituciones.length} · ${simular ? "entrarían" : "insertadas"} ${informe.entran.length} · ya estaban ${informe.ya.length} · sin ubicar ${informe.sinUbicar.length} · fallaron ${informe.fallidos.length}`;
  const ruta = guardarInforme(
    salida,
    "lugares",
    [
      `# Instituciones culturales → lugares · ${new Date().toISOString()}${simular ? " (simulación)" : ""}`,
      "",
      resumen,
      "",
      `## ${simular ? "Entrarían" : "Insertadas"}`,
      ...informe.entran,
      "",
      "## Ya estaban",
      ...informe.ya,
      "",
      "## Sin ubicar: darlas de alta desde el teléfono",
      ...informe.sinUbicar,
      "",
      "## Fallaron",
      ...informe.fallidos,
      "",
    ],
    importados,
    simular,
  );
  console.log(`\n${resumen}\nInforme: ${ruta}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
