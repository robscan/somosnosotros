import fs from "node:fs";
const dir = process.argv[2] || "json-prod";
const filtro = process.argv[3] || "";
const archivos = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f.includes(filtro)).sort();
const u = (arr, f) => [...new Map(arr.map((x) => [f(x), x])).values()];
for (const f of archivos) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  const desb = u(j.desbordes, (d) => d.padre + ">" + d.hijo + JSON.stringify(d.fuera));
  const env = u(j.envoltorios, (e) => e.el + ">" + e.hijo);
  const toq = u(j.toquesChicos, (t) => t.el + t.w + "x" + t.h);
  const peg = u(j.pegados.filter((p) => !/Publicar|NavInferior|accionFija|verOtraVista/.test(p.a + p.b)), (p) => p.a + "|" + p.b);
  const neg = u(j.negativos, (n) => n.el + n.margen.join());
  const fuera = u(j.fueraVentana, (x) => x.el);
  console.log(`\n### ${j.pantalla} · ${j.dispositivo} (${j.vw}×${j.vh})  raíz ${j.raiz} ancho ${j.mainAncho}  nodos ${j.nodos}  prof máx ${j.profundidadMax} (${j.masProfundo})  media ${j.profundidadMedia}  alto doc ${j.altoDocumento}  scrollH ${j.scrollHorizontal}  pos ${JSON.stringify(j.posicionados)}  fuente ${j.fuente.join("/")}  hover ${j.medios.hover}`);
  console.log("franjas:", Object.entries(j.franjas).map(([k, v]) => `${k} top ${v.top} alto ${v.alto} ${v.position}`).join(" · "));
  console.log(`envoltorios ${j.envoltorios.length} (${env.length} distintos):`, env.map((e) => `${e.el}>${e.hijo}${e.conEstilo ? "" : " [sin estilo]"}`).join(" · "));
  console.log(`desbordes ${j.desbordes.length} (${desb.length} distintos):`, desb.map((d) => `${d.padre}>${d.hijo} ${JSON.stringify(d.fuera)} ${d.posHijo}`).join(" · "));
  console.log(`fuera de ventana ${fuera.length}:`, fuera.map((x) => `${x.el} +${x.derecha}`).join(" · "));
  console.log(`negativos ${neg.length}:`, neg.map((n) => `${n.el} ${n.margen.join(",")}`).join(" · "));
  console.log(`apilamiento ${j.apilamiento.length}:`, u(j.apilamiento, (a) => a.el).map((a) => `${a.el} ${a.position} z${a.z} (${a.motivo})`).join(" · "));
  console.log(`toques <44 ${toq.length}:`, toq.map((t) => `${t.el} ${t.w}×${t.h} "${t.texto}"`).join(" · "));
  console.log(`pegados/solapes ${peg.length}:`, peg.slice(0, 12).map((p) => `${p.a} ~ ${p.b} ${p.distancia}px${p.solapan ? " SOLAPAN" : ""}`).join(" · "));
  if (j.contenidoDesborda.length) console.log("contenido desborda caja:", j.contenidoDesborda.map((c) => `${c.el} ${c.alto}<${c.contenido}`).join(" · "));
  if (j.textoChico.length) console.log("texto <12px:", j.textoChico.map((t) => `${t.el} ${t.fs}`).join(" · "));
  if (j.errores.length) console.log("errores consola:", j.errores.slice(0, 3).join(" | "));
}
