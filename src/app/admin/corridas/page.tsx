import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import Cabecera from "@/components/ui/Cabecera";
import { Chip, Cuenta } from "@/components/ui/Chip";
import { IconoCalendario, IconoCartel, IconoDestello, IconoDocumento, IconoEstrella, IconoPin } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import EnCamino from "@/components/ui/EnCamino";
import renglon from "@/components/ui/Renglon.module.css";
import { avanceDe, credito, detalleCorrida, fechaVence, gruposDeCorridas, pildoraCorrida, tituloCorrida, usd, usdCorto, type CorridaPanel, type Pildora, type TipoCorrida } from "@/lib/ciudadesAdmin";
import { CLAVE_SEMANAL, leerAjusteSemanal, lineaSemanal } from "@/lib/rutinas/ajusteSemanal";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../Reintentar";
import InterruptorFichas from "../rutinas/InterruptorFichas";
import { cargarPanelCiudades, pedirPasoSiHayVaradas } from "../ciudades/consultas";
import styles from "../admin.module.css";
import css from "../ciudades/ciudades.module.css";
import { tituloDePagina } from "@/lib/marca";

export const metadata = { title: tituloDePagina("Corridas", "Administración"), robots: { index: false, follow: false } };

const ICONO: Record<TipoCorrida, typeof IconoPin> = { lugares: IconoPin, agendas: IconoCalendario, artistas: IconoEstrella, showcase: IconoDestello, carteles: IconoCartel, fichas: IconoDocumento };
const TONO: Record<Pildora["tono"], string | undefined> = { gris: undefined, violeta: styles.etiquetaRol, verde: css.ok, naranja: styles.destacada, rojo: css.fallo };
/** Los filtros: las corridas de Ciudades (sus tres botones) y las del showcase. Solo salen si hay de más de un tipo. */
const FILTROS = [
  { valor: "ciudades", etiqueta: "Ciudades", es: (c: CorridaPanel) => c.tipo !== "showcase" },
  { valor: "showcase", etiqueta: "Showcase", es: (c: CorridaPanel) => c.tipo === "showcase" },
] as const;

/**
 * Corridas (OL-427; prototipo firmado OL-425, pantalla E): arriba el crédito de la API y lo gastado (el gasto real lo descuenta la rutina,
 * OL-428); después cada corrida por cuándo —en curso, esta semana, por mes— con su fecha, parámetros, resultados, gasto y estado. Una corrida
 * con propuestas lleva a su bandeja. Se entra desde Ciudades y Atrás vuelve ahí; o desde el renglón «Rutinas» de la portada (`?desde=admin`, OL-494),
 * y Atrás vuelve a Administración. Arriba de todo, OL-494 (variante C firmada del prototipo OL-493): el interruptor de «Completar fichas», que
 * antes estaba en la portada (un ajuste que se toca una vez: en la portada confundía).
 */
export default async function Corridas({ searchParams }: { searchParams: Promise<{ tipo?: string; desde?: string }> }) {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/corridas");
  if (actual.perfil.rol !== "admin") redirect("/");
  const { tipo, desde } = await searchParams;
  const deAdmin = desde === "admin";
  const supabase = await clienteServidor();
  const [panel, semanal] = await Promise.all([cargarPanelCiudades(), supabase ? supabase.from("configuracion").select("valor").eq("clave", CLAVE_SEMANAL).maybeSingle() : null]);
  const barra = <Barra volver={deAdmin ? { href: "/admin", texto: "Administración" } : { href: "/admin/ciudades", texto: "Ciudades" }} titulo="Corridas" />;
  const filtrar = (valor: string | null) => `/admin/corridas${valor || deAdmin ? `?${new URLSearchParams({ ...(valor ? { tipo: valor } : {}), ...(deAdmin ? { desde: "admin" } : {}) })}` : ""}`;
  if (!panel)
    return (
      <main className={plantilla.paginaContenido}>
        {barra}
        <Reintentar texto="No pudimos leer las corridas." />
      </main>
    );
  const ahora = new Date();
  // La misma red de seguridad que Ciudades (OL-429): una corrida varada pide su paso después de responder.
  await pedirPasoSiHayVaradas(panel.corridas, ahora);
  const c = credito(panel.credito, ahora);
  const nombre = new Map(panel.ciudades.map((x) => [x.slug, x.nombre]));
  const filtro = FILTROS.find((f) => f.valor === tipo) ?? null;
  const conFiltros = FILTROS.filter((f) => panel.corridas.some(f.es)).length > 1;
  const visibles = filtro ? panel.corridas.filter(filtro.es) : panel.corridas;
  const semana = panel.corridas.filter((r) => Date.parse(r.creado_en) >= ahora.getTime() - 7 * 86400000).reduce((t, r) => t + r.gasto_usd, 0);
  return (
    <main className={`${plantilla.paginaContenido} ${styles.lista}`}>
      {barra}
      {/* Los filtros, en la fila de ui/Cabecera bajo la barra (OL-457), como en las listas del front. */}
      {conFiltros && (
        <Cabecera
          contexto={
            <>
              <Chip activo={!filtro} href={filtrar(null)}>
                Todas
                <Cuenta n={panel.corridas.length} />
              </Chip>
              {FILTROS.map((f) => (
                <Chip key={f.valor} activo={filtro?.valor === f.valor} href={filtrar(f.valor)}>
                  {f.etiqueta}
                  <Cuenta n={panel.corridas.filter(f.es).length} />
                </Chip>
              ))}
            </>
          }
        />
      )}
      {/* Rutinas (OL-489): las que corren solas una vez por semana, con su interruptor; el gasto de todas, debajo. */}
      <h2 className={styles.grupo}>Rutinas</h2>
      {semanal && !semanal.error ? (
        <ul className={renglon.tarjeta}>
          <li>
            <div className={renglon.ajuste}>
              <InterruptorFichas activa={leerAjusteSemanal(semanal.data?.valor).activa} lineas={lineaSemanal(leerAjusteSemanal(semanal.data?.valor), panel.corridas, ahora)} />
            </div>
          </li>
        </ul>
      ) : (
        <Reintentar texto="No pudimos leer las rutinas." />
      )}
      <h2 className={styles.grupo}>Crédito</h2>
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
              <span>
                <span className={[styles.etiqueta, TONO[p.tono]].filter(Boolean).join(" ")}>{p.texto}</span>
              </span>
              {avance !== null && (
                <span className={`${styles.barraEmbudo} ${css.avance}`} role="progressbar" aria-label="Avance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance * 100)}>
                  <i style={{ width: `${Math.round(avance * 100)}%` }} />
                </span>
              )}
            </>
          );
          // OL-489: una corrida de «Completar fichas» lleva a su informe (revisadas, propuestas por campo, gasto y «sin fuente»).
          const informe = r.tipo === "fichas" && r.estado !== "pendiente" && r.estado !== "cancelada";
          return (
            <li key={r.id}>
              {informe ? (
                <Link href={`/admin/corridas/${r.id}`} className={renglon.ajuste}>
                  {contenido}
                  <EnCamino className={renglon.enCamino} />
                </Link>
              ) : r.propuestas > 0 ? (
                <Link href={`/admin/ciudades/propuestas/${r.id}`} className={renglon.ajuste}>
                  {contenido}
                  <EnCamino className={renglon.enCamino} />
                </Link>
              ) : (
                <div className={renglon.ajuste}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
