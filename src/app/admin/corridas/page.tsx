import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { Chip, Chips, Cuenta } from "@/components/ui/Chip";
import { IconoCalendario, IconoDestello, IconoEstrella, IconoPin } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { avanceDe, credito, detalleCorrida, fechaVence, gruposDeCorridas, pildoraCorrida, tituloCorrida, usd, usdCorto, type CorridaPanel, type Pildora, type TipoCorrida } from "@/lib/ciudadesAdmin";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../Reintentar";
import { cargarPanelCiudades } from "../ciudades/consultas";
import styles from "../admin.module.css";
import css from "../ciudades/ciudades.module.css";

export const metadata = { title: "Corridas · Administración · Somos Nosotros", robots: { index: false, follow: false } };

const ICONO: Record<TipoCorrida, typeof IconoPin> = { lugares: IconoPin, agendas: IconoCalendario, artistas: IconoEstrella, showcase: IconoDestello };
const TONO: Record<Pildora["tono"], string | undefined> = { gris: undefined, violeta: styles.etiquetaRol, verde: css.ok, naranja: styles.destacada, rojo: css.fallo };
/** Los filtros: las corridas de Ciudades (sus tres botones) y las del showcase. Solo salen si hay de más de un tipo. */
const FILTROS = [
  { valor: "ciudades", etiqueta: "Ciudades", es: (c: CorridaPanel) => c.tipo !== "showcase" },
  { valor: "showcase", etiqueta: "Showcase", es: (c: CorridaPanel) => c.tipo === "showcase" },
] as const;

/**
 * Corridas (OL-427; prototipo firmado OL-425, pantalla E): arriba el crédito de la API y lo gastado (el gasto real lo descuenta la rutina,
 * OL-428); después cada corrida por cuándo —en curso, esta semana, por mes— con su fecha, parámetros, resultados, gasto y estado. Una corrida
 * con propuestas lleva a su bandeja. Se entra desde Ciudades y Atrás vuelve ahí.
 */
export default async function Corridas({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/corridas");
  if (actual.perfil.rol !== "admin") redirect("/");
  const { tipo } = await searchParams;
  const panel = await cargarPanelCiudades();
  const barra = <Barra volver={{ href: "/admin/ciudades", texto: "Ciudades" }} />;
  if (!panel)
    return (
      <main className={plantilla.paginaContenido}>
        {barra}
        <h1 className={styles.titulo}>Corridas</h1>
        <Reintentar texto="No pudimos leer las corridas." />
      </main>
    );
  const ahora = new Date();
  const c = credito(panel.credito, ahora);
  const nombre = new Map(panel.ciudades.map((x) => [x.slug, x.nombre]));
  const filtro = FILTROS.find((f) => f.valor === tipo) ?? null;
  const conFiltros = FILTROS.filter((f) => panel.corridas.some(f.es)).length > 1;
  const visibles = filtro ? panel.corridas.filter(filtro.es) : panel.corridas;
  const semana = panel.corridas.filter((r) => Date.parse(r.creado_en) >= ahora.getTime() - 7 * 86400000).reduce((t, r) => t + r.gasto_usd, 0);
  return (
    <main className={`${plantilla.paginaContenido} ${styles.lista}`}>
      {barra}
      <h1 className={styles.titulo}>Corridas</h1>
      <ul className={`${styles.indicadores} ${css.credito}`}>
        <li>
          <div className={`${styles.indicador} ${css.quieto}`}>
            <span className={styles.nombreIndicador}>Crédito</span>
            <b>{usd(c.queda)}</b>
            <small>{`USD de ${usdCorto(c.inicial)}${c.vence ? ` · ${c.dias === null ? "venció" : "vence"} el ${fechaVence(c.vence)}` : ""}`}</small>
            {c.dias !== null && <span className={styles.cambio}>{c.dias === 1 ? "1 día" : `${c.dias} días`}</span>}
          </div>
        </li>
        <li>
          <div className={`${styles.indicador} ${css.quieto}`}>
            <span className={styles.nombreIndicador}>Gastado</span>
            <b>{usd(c.gastado)}</b>
            <small>{`USD en ${panel.corridas.length} ${panel.corridas.length === 1 ? "corrida" : "corridas"}`}</small>
            {semana > 0 && <span className={styles.cambio}>{`▲ ${usd(semana)} esta semana`}</span>}
          </div>
        </li>
      </ul>
      {conFiltros && (
        <Chips ariaLabel="Filtrar corridas">
          <Chip activo={!filtro} href="/admin/corridas">
            Todas
            <Cuenta n={panel.corridas.length} />
          </Chip>
          {FILTROS.map((f) => (
            <Chip key={f.valor} activo={filtro?.valor === f.valor} href={`/admin/corridas?tipo=${f.valor}`}>
              {f.etiqueta}
              <Cuenta n={panel.corridas.filter(f.es).length} />
            </Chip>
          ))}
        </Chips>
      )}
      {visibles.length === 0 && <p className={styles.vacio}>Todavía no hay corridas: las deja cada botón de una ciudad al tocar «Correr».</p>}
      {gruposDeCorridas(visibles, ahora).map((g) => (
        <GrupoCorridas key={g.titulo} titulo={g.titulo} corridas={g.corridas} nombre={nombre} ahora={ahora} />
      ))}
    </main>
  );
}

function GrupoCorridas({ titulo, corridas, nombre, ahora }: { titulo: string; corridas: CorridaPanel[]; nombre: Map<string, string>; ahora: Date }) {
  return (
    <>
      <h2 className={styles.grupo}>
        {titulo}
        {titulo === "En curso" && <b>{corridas.length}</b>}
      </h2>
      <ul className={renglon.tarjeta}>
        {corridas.map((r) => {
          const Icono = ICONO[r.tipo];
          const p = pildoraCorrida(r);
          const avance = avanceDe(r);
          const contenido = (
            <>
              <Icono width={20} height={20} />
              <b>{tituloCorrida(r, r.ciudad ? (nombre.get(r.ciudad) ?? r.ciudad) : null)}</b>
              <small>{detalleCorrida(r, ahora)}</small>
              <span className={styles.total}>
                <span className={[styles.etiqueta, TONO[p.tono]].filter(Boolean).join(" ")}>{p.texto}</span>
              </span>
              {avance !== null && (
                <span className={`${styles.barraEmbudo} ${css.avance}`} role="progressbar" aria-label="Avance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance * 100)}>
                  <i style={{ width: `${Math.round(avance * 100)}%` }} />
                </span>
              )}
            </>
          );
          return (
            <li key={r.id}>
              {r.propuestas > 0 ? (
                <Link href={`/admin/ciudades/propuestas/${r.id}`} className={styles.fila}>
                  {contenido}
                </Link>
              ) : (
                <div className={styles.fila}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
