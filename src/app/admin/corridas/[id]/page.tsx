import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import Boton from "@/components/ui/Boton";
import { IconoChevronDerecha, IconoEstrella, IconoPin } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import EnCamino from "@/components/ui/EnCamino";
import renglon from "@/components/ui/Renglon.module.css";
import { hrefArtista } from "@/lib/artistas";
import { cuando, hrefPropuestas, informeFichas, pegado, pildoraCorrida, textoFaltan, textoPorCampo, textoRevisar, usd, usdChico, type Pildora } from "@/lib/ciudadesAdmin";
import { hrefLugar } from "@/lib/lugares";
import { tituloDePagina } from "@/lib/marca";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../../Reintentar";
import { cargarPanelCiudades } from "../../ciudades/consultas";
import styles from "../../admin.module.css";
import css from "../../ciudades/ciudades.module.css";

export const metadata = { title: tituloDePagina("Informe de la corrida", "Administración"), robots: { index: false, follow: false } };

const TONO: Record<Pildora["tono"], string | undefined> = { gris: undefined, violeta: styles.etiquetaRol, verde: css.ok, naranja: styles.destacada, rojo: css.fallo };

/**
 * El informe de una corrida de «Completar fichas» (OL-489): cuántas fichas revisó, cuántas propuestas dejó por campo, cuánto gastó y las que
 * quedaron «sin fuente» (nada que leer o nada útil), con lo que les falta y por qué, para completarlas a mano. Si quedan propuestas por
 * revisar, el botón lleva a la bandeja de su ciudad. Se entra desde Corridas y Atrás vuelve ahí.
 */
export default async function InformeCorrida({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/admin/corridas/${id}`)}`);
  if (actual.perfil.rol !== "admin") redirect("/");
  const panel = await cargarPanelCiudades();
  const barra = (titulo: string) => <Barra volver={{ href: "/admin/corridas", texto: "Corridas" }} titulo={titulo} />;
  if (!panel)
    return (
      <main className={plantilla.paginaContenido}>
        {barra("Informe")}
        <Reintentar texto="No pudimos leer la corrida." />
      </main>
    );
  const c = panel.corridas.find((x) => x.id === id);
  if (!c || c.tipo !== "fichas") notFound();
  const ciudad = panel.ciudades.find((x) => x.slug === c.ciudad)?.nombre ?? c.ciudad ?? "";
  const ahora = new Date();
  const inf = informeFichas(c.resumen);
  const p = pildoraCorrida(c);
  const semanal = c.parametros.semanal === true;
  return (
    <main className={`${plantilla.paginaContenido} ${styles.lista}`}>
      {barra(`Fichas · ${ciudad}`)}
      <p className={`${styles.nota} ${css.cabeza}`}>
        <span className={[styles.etiqueta, TONO[p.tono]].filter(Boolean).join(" ")}>{p.texto}</span> {pegado(`${semanal ? "La de la semana" : "A mano"} · ${cuando(c.fin ?? c.inicio ?? c.creado_en, ahora)}`)}
      </p>
      <ul className={`${styles.indicadores} ${css.credito}`}>
        <li>
          <div className={`${styles.indicador} ${css.quieto}`}>
            <span className={styles.nombreIndicador}>Revisadas</span>
            <b>{inf.revisadas}</b>
            <small>{`de ${inf.incompletas} con fecha y algo por completar`}</small>
            {inf.recientes + inf.deMas > 0 && <span className={styles.cambio}>{[inf.recientes ? `${inf.recientes} ${inf.recientes === 1 ? "ya buscada" : "ya buscadas"} este mes` : null, inf.deMas ? `${inf.deMas} esperan a la siguiente` : null].filter(Boolean).join(" · ")}</span>}
          </div>
        </li>
        <li>
          <div className={`${styles.indicador} ${css.quieto}`}>
            <span className={styles.nombreIndicador}>Propuestas</span>
            <b>{c.propuestas}</b>
            <small>{textoPorCampo(inf.porCampo)}</small>
            {c.aceptadas + c.rechazadas > 0 && <span className={styles.cambio}>{`${c.aceptadas} aceptadas · ${c.rechazadas} rechazadas`}</span>}
          </div>
        </li>
        <li>
          <div className={`${styles.indicador} ${css.quieto}`}>
            <span className={styles.nombreIndicador}>Gasto</span>
            <b>{usdChico(c.gasto_usd) === usd(c.gasto_usd) ? usd(c.gasto_usd) : "<0,01"}</b>
            <small>{pegado(`USD de ${usd(c.tope_usd)} USD de tope`)}</small>
          </div>
        </li>
        <li>
          <div className={`${styles.indicador} ${css.quieto}`}>
            <span className={styles.nombreIndicador}>Sin fuente</span>
            <b>{inf.sinFuente.length}</b>
            <small>se completan a mano</small>
          </div>
        </li>
      </ul>
      {c.por_revisar > 0 && c.ciudad && (
        <Boton href={hrefPropuestas(c.ciudad)} ancho="contenido">
          {textoRevisar(c.por_revisar)}
        </Boton>
      )}
      {inf.avisos.length > 0 && (
        <>
          <h2 className={styles.grupo}>Avisos</h2>
          <ul className={styles.puede}>
            {inf.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      )}
      <h2 className={styles.grupo}>
        Sin fuente
        {inf.sinFuente.length > 0 && <b>{inf.sinFuente.length}</b>}
      </h2>
      {inf.sinFuente.length === 0 ? (
        <p className={styles.vacio}>Todas las fichas revisadas tuvieron de dónde leer.</p>
      ) : (
        <ul className={renglon.tarjeta}>
          {inf.sinFuente.map((f) => {
            const Icono = f.tipo === "lugar" ? IconoPin : IconoEstrella;
            return (
              <li key={`${f.tipo}:${f.id}:${f.motivo}`}>
                <Link href={f.tipo === "lugar" ? hrefLugar({ id: f.id }) : hrefArtista({ id: f.id })} className={renglon.ajuste}>
                  <Icono width={20} height={20} />
                  <b>{f.nombre}</b>
                  <small>{[f.faltan.length ? `Falta: ${textoFaltan(f.faltan).charAt(0).toLowerCase()}${textoFaltan(f.faltan).slice(1)}` : null, f.motivo].filter(Boolean).join(" · ")}</small>
                  <span>
                    <IconoChevronDerecha />
                  </span>
                  <EnCamino className={renglon.enCamino} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
