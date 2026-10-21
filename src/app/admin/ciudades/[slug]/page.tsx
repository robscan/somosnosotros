import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import { IconoEtiqueta, IconoOjo, IconoPendiente } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import {
  baseArtistas,
  baseEventos,
  baseLugares,
  BOTONES,
  busquedasDe,
  cabeceraCiudad,
  cifra,
  credito,
  detallePorRevisar,
  estadoVisible,
  ETIQUETA_ESTADO,
  fechaVence,
  gastoDe,
  hrefPropuestas,
  juntarAlias,
  leerParametrosVista,
  lineaBusqueda,
  pegado,
  porRevisarDe,
  siguientePaso,
  tarjetaConsultas,
  textoRevisar,
  usd,
  usdCorto,
  vezPasada,
  type EstadoVisible,
  type TipoBoton,
} from "@/lib/ciudadesAdmin";
import { diaLocal } from "@/lib/fechas";
import { trazoTendencia } from "@/lib/panel";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../../Reintentar";
import { cargarDatosCiudad, cargarExtras, cargarPanelCiudades, conCifras, pedirPasoSiHayVaradas } from "../consultas";
import TarjetaBusqueda from "../TarjetaBusqueda";
import styles from "../../admin.module.css";
import css from "../ciudades.module.css";

export const metadata = { title: "Ciudad · Administración · Somos Nosotros", robots: { index: false, follow: false } };

const PILDORA: Record<EstadoVisible, string> = { abierta: `${styles.etiqueta} ${css.ok}`, detectada: `${styles.etiqueta} ${styles.destacada}`, cerrada: styles.etiqueta };

/**
 * El panel de una ciudad (OL-432; prototipo firmado OL-431, pantallas D, E y F): cómo va y sus búsquedas. Arriba, su nombre, su píldora y desde
 * cuándo, con lo que cuenta con ella. Luego las tarjetas de «Últimos 7 días»: Por revisar (a la bandeja de la ciudad), Lugares, Eventos próximos
 * y Artistas con la búsqueda que alimenta cada una y su botón, y Consultas y Gasto. Un solo botón violeta: el siguiente paso. Desde 1048, en la
 * columna ancha, de tres en tres. Atrás vuelve a la lista.
 */
export default async function PanelCiudad({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/admin/ciudades/${slug}`)}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const barra = <Barra volver={{ href: "/admin/ciudades", texto: "Ciudades" }} />;
  const [panel, extras] = await Promise.all([cargarPanelCiudades(), cargarExtras()]);
  if (!panel)
    return (
      <main className={plantilla.paginaContenido}>
        {barra}
        <h1 className={styles.titulo}>Ciudad</h1>
        <Reintentar texto="No pudimos leer la ciudad." />
      </main>
    );
  const ahora = new Date();
  await pedirPasoSiHayVaradas(panel.corridas, ahora);
  const nombres = new Map(panel.ciudades.map((c) => [c.slug, { nombre: c.nombre, alias: extras?.get(c.slug)?.alias ?? [] }]));
  const { ciudades, juntadas } = juntarAlias(panel.ciudades, nombres);
  // Una fila que es otra ciudad con otro nombre lleva al panel de esa ciudad.
  const junta = juntadas.get(slug);
  if (junta) redirect(`/admin/ciudades/${junta}`);
  const ciudad = ciudades.find((c) => c.slug === slug);
  if (!ciudad) notFound();

  const extra = extras?.get(slug) ?? { alias: [], parametros: leerParametrosVista({}) };
  const suyas = [...juntadas].filter(([, a]) => a === slug).map(([s]) => s);
  const [[cifras], datos] = await Promise.all([conCifras([ciudad], extras ?? new Map()), cargarDatosCiudad({ slug, nombre: ciudad.nombre, alias: extra.alias, zona: ciudad.zona }, suyas, ahora)]);
  const b = busquedasDe(panel.corridas, slug);
  const n = porRevisarDe(panel.corridas, slug);
  const siguiente = siguientePaso(b, n);
  const c = credito(panel.credito, ahora);
  const fraseCredito = `Crédito: ${usd(c.queda)} USD${c.vence ? `, ${c.dias === null ? "venció" : "vence"} el ${fechaVence(c.vence)}` : ""}`;
  const estado = estadoVisible(ciudad.estado);

  const hoy = diaLocal(ahora, ciudad.zona);
  const desde = [diaLocal(new Date(ciudad.creado_en), ciudad.zona), ...(datos.vistas ?? []).filter((v) => v.consultas > 0).map((v) => v.dia)].sort()[0];
  const consultas = datos.vistas ? tarjetaConsultas(datos.vistas, hoy, desde) : { valor: ciudad.consultas, serie: null, base: "en 30 días, al abrir Inicio o Lugares", cambio: null };

  const numero: Record<TipoBoton, { valor: number; base: string | null }> = {
    lugares: { valor: cifras.lugares, base: datos.nuevos === null ? null : baseLugares(cifras.lugares, datos.nuevos) },
    agendas: { valor: cifras.eventos, base: cifras.eventos && datos.eventosPorOrigen ? baseEventos(datos.eventosPorOrigen) : null },
    artistas: { valor: cifras.artistas, base: cifras.artistas && datos.capo !== null ? baseArtistas(cifras.artistas, datos.capo) : null },
  };

  return (
    <main className={`${plantilla.paginaContenido} ${css.panel}`}>
      {barra}
      <h1 className={styles.titulo}>
        {ciudad.nombre} <span className={PILDORA[estado]}>{ETIQUETA_ESTADO[estado]}</span>
      </h1>
      <p className={`${styles.nota} ${css.cabeza}`}>{pegado(cabeceraCiudad({ estado: ciudad.estado, creado_en: ciudad.creado_en, alias: extra.alias, parametros: extra.parametros }, b, ahora))}</p>
      <ul className={`${styles.indicadores} ${css.tablero}`} aria-label={`Cómo va ${ciudad.nombre}`}>
        {n > 0 && (
          <li className={`${css.ancha} ${css.banda}`}>
            <div className={`${styles.indicador} ${css.tarjeta} ${css.porRevisarTarjeta}`} role="group" aria-label="Por revisar">
              <span className={`${styles.nombreIndicador} ${css.nombre}`}>
                <IconoPendiente width={18} height={18} />
                Por revisar
              </span>
              <b>{cifra(n)}</b>
              <small>{pegado(detallePorRevisar(panel.corridas, slug, ahora))}</small>
              <Boton href={hrefPropuestas(slug)} variante={siguiente === "revisar" ? "primario" : "secundario"} ancho="contenido" className={css.accion}>
                {textoRevisar(n)}
              </Boton>
            </div>
          </li>
        )}
        {BOTONES.map(({ tipo }) => {
          const r = b[tipo];
          return (
            <TarjetaBusqueda
              key={tipo}
              slug={slug}
              ciudad={ciudad.nombre}
              tipo={tipo}
              valor={cifra(numero[tipo].valor)}
              base={numero[tipo].base}
              linea={r ? lineaBusqueda(r, panel.corridas, ahora) : null}
              principal={siguiente === tipo}
              pendiente={r?.estado === "pendiente" ? r.id : null}
              corre={r?.estado === "corriendo"}
              credito={fraseCredito}
              vezPasada={vezPasada(r)}
            />
          );
        })}
        <li className={css.doble}>
          <div className={`${styles.indicador} ${css.tarjeta}`} role="group" aria-label="Consultas">
            <span className={`${styles.nombreIndicador} ${css.nombre}`}>
              <IconoOjo width={18} height={18} />
              Consultas
            </span>
            <b>{cifra(consultas.valor)}</b>
            {consultas.serie && <Tendencia serie={consultas.serie} />}
            <small>{consultas.base}</small>
            {consultas.cambio && <span className={styles.cambio}>{consultas.cambio}</span>}
          </div>
        </li>
        <li>
          <div className={`${styles.indicador} ${css.tarjeta}`} role="group" aria-label="Gasto">
            <span className={`${styles.nombreIndicador} ${css.nombre}`}>
              <IconoEtiqueta width={18} height={18} />
              Gasto
            </span>
            <b>{usd(gastoDe(panel.corridas, slug))}</b>
            <small>USD en esta ciudad</small>
            <span className={styles.cambio}>{`Quedan ${usd(c.queda)} de ${usdCorto(c.inicial)}`}</span>
            <Link href="/admin/corridas" className={`${styles.enlace} ${css.enlaceTarjeta}`}>
              Corridas ›
            </Link>
          </div>
        </li>
      </ul>
    </main>
  );
}

/** La tendencia de las consultas por semana (la de los indicadores de la portada): trazo gris y la de hoy en el color de acción. */
function Tendencia({ serie }: { serie: number[] }) {
  const { puntos, ultimo } = trazoTendencia(serie);
  return (
    <svg viewBox="0 0 88 28" aria-hidden="true">
      <polyline points={puntos} />
      <circle cx={ultimo.x} cy={ultimo.y} r={2.6} />
    </svg>
  );
}
