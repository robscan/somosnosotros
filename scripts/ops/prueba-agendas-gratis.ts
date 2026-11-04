/**
 * OL-509 · prueba real de SOLO LECTURA de los dos lectores gratis de «Buscar agendas» contra los sitios vivos: el catálogo de eventos de la
 * Secretaría de Cultura de San Luis Potosí y la API de «The Events Calendar» de Turismo del estado. Sin `.env`, sin base, sin la API de
 * Anthropic: baja las páginas con la calma de la cartelera (una petición cada 1,5 s) y cuenta lo que trae cada uno para los próximos 45 días
 * (cuántos eventos, cuántos con hora y con imagen) y tres ejemplos para cruzarlos contra la base.
 *
 *   npx tsx scripts/ops/prueba-agendas-gratis.ts [AAAA-MM-DD]
 */
import { clienteCartelera } from "../../src/lib/rutinas/carteleraCdmx";
import { filasDeCatalogo, leerFichaCatalogo, leerListaCatalogo, URL_CATALOGO_SLP, urlPaginaCatalogo } from "../../src/lib/rutinas/catalogoCultura";
import { filaDeTribe, leerPaginaTribe, URL_TRIBE_SLP, urlPaginaTribe } from "../../src/lib/rutinas/eventosTribe";

const hoy = process.argv[2] ?? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
const hasta = new Date(Date.parse(`${hoy}T00:00:00Z`) + 45 * 86_400_000).toISOString().slice(0, 10);
const cliente = clienteCartelera({ pedir: fetch });
type Ejemplo = { titulo: string; fecha: string; hora: string; lugar: string };

async function catalogo() {
  const fichas: string[] = [];
  for (let pagina: number | null = 1; pagina !== null; ) {
    const r = await cliente.traer(urlPaginaCatalogo(URL_CATALOGO_SLP, pagina));
    if (!r.ok) break;
    const l = leerListaCatalogo(r.texto, URL_CATALOGO_SLP, pagina);
    for (const f of l.fichas) if (!fichas.includes(f)) fichas.push(f);
    pagina = l.siguiente;
  }
  const cuenta = { fichas: fichas.length, leidas: 0, en45: 0, conHora: 0, conImagen: 0, filas: 0, motivos: {} as Record<string, number> };
  const ejemplos: Ejemplo[] = [];
  for (const url of fichas) {
    const r = await cliente.traer(url);
    if (!r.ok) continue;
    cuenta.leidas++;
    const f = leerFichaCatalogo(r.texto, url);
    if (!f) {
      cuenta.motivos.no_es_ficha = (cuenta.motivos.no_es_ficha ?? 0) + 1;
      continue;
    }
    const { filas, motivo } = filasDeCatalogo(f, hoy);
    const dentro = filas.filter((x) => x.fecha <= hasta);
    if (motivo) cuenta.motivos[motivo] = (cuenta.motivos[motivo] ?? 0) + 1;
    if (!dentro.length) continue;
    cuenta.en45++;
    cuenta.conHora++;
    if (f.imagen) cuenta.conImagen++;
    cuenta.filas += dentro.length;
    if (ejemplos.length < 3) ejemplos.push({ titulo: f.titulo, fecha: dentro[0].fecha, hora: dentro[0].hora, lugar: f.lugar || "(sin lugar)" });
  }
  return { cuenta, ejemplos };
}

async function tribe() {
  const cuenta = { eventos: 0, culturales: 0, conHora: 0, conImagen: 0, motivos: {} as Record<string, number>, categorias: {} as Record<string, number> };
  const ejemplos: Ejemplo[] = [];
  for (let pagina = 1, paginas = 1; pagina <= paginas; pagina++) {
    const r = await cliente.traer(urlPaginaTribe(URL_TRIBE_SLP, hoy, hasta, pagina), { headers: { accept: "application/json" } });
    const p = r.ok ? leerPaginaTribe(r.texto) : null;
    if (!p) break;
    paginas = p.paginas;
    for (const e of p.eventos) {
      cuenta.eventos++;
      for (const c of e.categorias.length ? e.categorias : ["(sin categoría)"]) cuenta.categorias[c] = (cuenta.categorias[c] ?? 0) + 1;
      const { fila, motivo } = filaDeTribe(e);
      if (motivo) cuenta.motivos[motivo] = (cuenta.motivos[motivo] ?? 0) + 1;
      if (!fila) continue;
      cuenta.culturales++;
      cuenta.conHora++;
      if (fila.imagen) cuenta.conImagen++;
      if (ejemplos.length < 3) ejemplos.push({ titulo: fila.titulo, fecha: fila.fecha, hora: fila.hora, lugar: `${fila.lugar}${fila.municipio ? ` (${fila.municipio})` : ""}` });
    }
  }
  return { cuenta, ejemplos };
}

async function principal() {
  console.log(`Del ${hoy} al ${hasta}`);
  const c = await catalogo();
  console.log("\nCatálogo de eventos de la Secretaría de Cultura de San Luis Potosí");
  console.log(JSON.stringify(c.cuenta));
  for (const e of c.ejemplos) console.log(`  · ${e.titulo} — ${e.fecha} ${e.hora} — ${e.lugar}`);
  const t = await tribe();
  console.log("\nEventos de Turismo de San Luis Potosí (The Events Calendar)");
  console.log(JSON.stringify(t.cuenta));
  for (const e of t.ejemplos) console.log(`  · ${e.titulo} — ${e.fecha} ${e.hora} — ${e.lugar}`);
  console.log(`\nPeticiones: ${cliente.peticiones()}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
