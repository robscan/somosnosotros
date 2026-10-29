import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { IconoCalendario, IconoChevronDerecha, IconoEstrella, IconoEtiqueta, IconoInstagram, IconoPersonas, IconoPin, IconoPincel, IconoUbicacion } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import { credito, propuestasPorRevisar, resumenCiudades, usd } from "@/lib/ciudadesAdmin";
import { CLAVE_SEMANAL, leerAjusteSemanal, lineaSemanal, SEMANA_MS } from "@/lib/rutinas/ajusteSemanal";
import InterruptorFichas from "./rutinas/InterruptorFichas";
import { diaLocal } from "@/lib/fechas";
import { cuandoPaso, indicadorAvisos, indicadores, indicadoresAportes, indicadoresFichas, notaFichas, notaSemana, renglonesGestionar } from "@/lib/panel";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { GALLETA_CIUDAD, leerCiudad } from "@/lib/panel";
import { CUENTA_INSTAGRAM } from "@/lib/instagram/texto";
import { cargarResumenInstagram } from "./instagram/datos";
import { resumenDeLaPortada } from "./instagram/semana";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { cargarAportes, cargarAvisos, cargarComunidad, cargarResumen, cargarVinculadas } from "./consultas";
import ComunidadComoVa from "./ComunidadComoVa";
import CapoComoVa from "./CapoComoVa";
import { cargarCapo } from "./capo-consultas";
import { cargarPanelCiudades } from "./ciudades/consultas";
import IconoGrafo from "./grafo/IconoGrafo";
import Indicadores from "./Indicadores";
import Pendientes from "./Pendientes";
import Reintentar from "./Reintentar";
import GrupoShowcase from "./showcase/GrupoShowcase";
import { cargarResumenPorAprobar } from "./showcase/consultas";
import { renglonPorAprobar } from "@/lib/showcasePorAprobar";
import styles from "./admin.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { tituloDePagina } from "@/lib/marca";

export const metadata = { title: tituloDePagina("Administración"), robots: { index: false, follow: false } };

const ICONO = { personas: IconoPersonas, lugares: IconoPin, eventos: IconoCalendario, artistas: IconoEstrella };
const SECCIONES = [
  { clave: "personas", titulo: "Personas", href: "/admin/personas" },
  { clave: "lugares", titulo: "Lugares", href: "/admin/lugares" },
  { clave: "eventos", titulo: "Eventos", href: "/admin/eventos" },
  { clave: "artistas", titulo: "Artistas", href: "/admin/artistas" },
] as const;

/**
 * Administración (docs/rediseno/18 y 19, firmados por el founder el 2026-09-16): una pantalla con tres grupos en el
 * orden de la intención. Pendiente (lo que pide una acción), Últimos 7 días (cómo va, sin contar a la administración)
 * y Gestionar (entrar a una lista). Se entra desde Ajustes y Atrás vuelve ahí.
 */
export default async function Admin() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin");
  if (actual.perfil.rol !== "admin") redirect("/");
  const ciudadSesion = leerCiudad("eventos", (await cookies()).get(GALLETA_CIUDAD)?.value ?? null);
  const supabase = await clienteServidor();
  const [{ resumen, pendientes, errorPendientes }, comunidad, capo, aportes, vinculadas, ciudades, porAprobar, instagram, avisos, semanaIg, semanal] = await Promise.all([cargarResumen(), cargarComunidad(), cargarCapo(), cargarAportes(), cargarVinculadas(), cargarPanelCiudades(), cargarResumenPorAprobar(), supabase ? cargarResumenInstagram(supabase, ciudadSesion) : null, cargarAvisos(), supabase ? resumenDeLaPortada(supabase, ciudadSesion ?? CIUDAD_INICIAL.slug).catch(() => null) : null, supabase ? supabase.from("configuracion").select("valor").eq("clave", CLAVE_SEMANAL).maybeSingle() : null]);
  const ahora = new Date();
  // Las propuestas de las rutinas por revisar suben a «Pendiente» (firma de OL-425); si Ciudades no se pudo leer, solo faltan ellas.
  // OL-446: primero las evidencias del showcase por aprobar (un solo renglón a «Por aprobar»); si no se pudieron leer, solo falta él.
  const showcase = renglonPorAprobar(porAprobar && { ...porAprobar, ultima: porAprobar.ultima && diaLocal(new Date(porAprobar.ultima)) }, diaLocal(ahora));
  const porRevisar = [...(showcase ? [showcase] : []), ...(ciudades ? propuestasPorRevisar(ciudades.corridas, ciudades.ciudades, ahora).filter((p) => p.tipo !== "showcase") : [])];
  // Los dos aportes nuevos (Voy / Me interesa y primeras publicaciones) vienen de su propia función: si falla, solo faltan ellos.
  // OL-480: los avisos abiertos, de su propia función (si falla, solo falta él).
  const lista = resumen ? [...indicadores(resumen, diaLocal(ahora)), ...(aportes ? indicadoresAportes(aportes) : []), ...(avisos ? [indicadorAvisos(avisos)] : [])] : [];
  const fichas = vinculadas ? indicadoresFichas(vinculadas) : [];
  const renglones = resumen ? renglonesGestionar(resumen.gestionar) : SECCIONES.map((s) => ({ ...s, total: null, detalle: null }));
  return (
    <main className={plantilla.paginaContenido}>
      <Barra volver={{ href: "/ajustes", texto: "Ajustes" }} titulo="Administración" />
      {/* La llave cambia cuando la lista pasa de no leída a leída (Intentar de nuevo): así se monta con los pendientes reales. */}
      <Pendientes key={errorPendientes ? "sin-leer" : "leidos"} iniciales={pendientes.map((p) => ({ ...p, cuando: cuandoPaso(p.creado_en, ahora) }))} error={errorPendientes} porRevisar={porRevisar} />

      <h2 className={resumen ? `${styles.grupo} ${styles.conNota}` : styles.grupo}>Últimos 7 días</h2>
      {resumen ? <Indicadores lista={lista} nota={notaSemana(lista)} /> : <Reintentar texto="No pudimos leer los indicadores." />}
      {resumen && !aportes && <Reintentar texto="No pudimos leer Voy y Me interesa ni las primeras publicaciones." />}

      <h2 className={styles.grupo}>Cómo va la comunidad</h2>
      {comunidad ? <ComunidadComoVa comunidad={comunidad} /> : <Reintentar texto="No pudimos leer el embudo de la comunidad." />}

      <h2 className={vinculadas ? `${styles.grupo} ${styles.conNota}` : styles.grupo}>Fichas</h2>
      {vinculadas ? <Indicadores lista={fichas} nota={notaFichas(fichas)} desglose="desglose-fichas" /> : <Reintentar texto="No pudimos leer las fichas vinculadas." />}

      <h2 className={styles.grupo}>Invitaciones CAPO</h2>
      {capo ? <CapoComoVa metricas={capo} /> : <Reintentar texto="No pudimos leer los resultados de las invitaciones CAPO." />}

      <h2 className={styles.grupo}>Gestionar</h2>
      <ul className={renglon.tarjeta}>
        {renglones.map((r) => {
          const Icono = ICONO[r.clave];
          return (
            <li key={r.clave}>
              <Link href={r.href} className={renglon.ajuste}>
                <Icono width={20} height={20} />
                <b>{r.titulo}</b>
                {r.detalle && <small>{r.detalle}</small>}
                <span>
                  {r.total}
                  <IconoChevronDerecha />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Instagram (OL-458, firmado): la cuenta de la marca, lo publicado esta semana (y cuántas en Facebook, OL-461) y lo que espera en la ciudad
          de la sesión; abre la lista. */}
      <h2 className={styles.grupo}>Instagram</h2>
      <ul className={renglon.tarjeta}>
        <li>
          <Link href="/admin/instagram" className={renglon.ajuste}>
            <IconoInstagram width={20} height={20} />
            <b>@{CUENTA_INSTAGRAM}</b>
            <small>
              {instagram
                ? `${instagram.semana === 1 ? "1 publicada" : `${instagram.semana} publicadas`} esta semana${instagram.facebook !== null ? ` · ${instagram.facebook} en Facebook` : ""} · ${instagram.porPublicar} por publicar${instagram.ciudad ? ` en ${instagram.ciudad}` : ""}${semanaIg ? ` · ${semanaIg}` : ""}`
                : "Publicar eventos en la cuenta de la marca"}
            </small>
            <span>
              <IconoChevronDerecha />
            </span>
          </Link>
        </li>
      </ul>

      {/* Obras colectivas (OL-088) es alta, no moderación: no encaja en SECCIONES/renglonesGestionar(), así que va
          en su propio bloque, no dentro de "Gestionar". */}
      <h2 className={styles.grupo}>Obras colectivas</h2>
      <ul className={renglon.tarjeta}>
        <li>
          <Link href="/admin/obras-colectivas" className={renglon.ajuste}>
            <IconoPincel width={20} height={20} />
            <b>Obras colectivas</b>
            <span>
              <IconoChevronDerecha />
            </span>
          </Link>
        </li>
      </ul>
      {/* El grafo cultural en 3D (OL-401): una herramienta de lectura, aparte de Gestionar y de las altas. */}
      <h2 className={styles.grupo}>Grafo cultural</h2>
      <ul className={renglon.tarjeta}>
        <li>
          <Link href="/admin/grafo" className={renglon.ajuste}>
            <IconoGrafo width={20} height={20} />
            <b>Grafo cultural</b>
            <small>Lugares, artistas y asistentes en 3D</small>
            <span>
              <IconoChevronDerecha />
            </span>
          </Link>
        </li>
      </ul>
      {/* Ciudades (OL-427, prototipo firmado OL-425): al mismo nivel que el grafo, con la mira. */}
      <h2 className={styles.grupo}>Ciudades</h2>
      <ul className={renglon.tarjeta}>
        <li>
          <Link href="/admin/ciudades" className={renglon.ajuste}>
            <IconoUbicacion width={20} height={20} />
            <b>Ciudades</b>
            <small>{ciudades ? resumenCiudades(ciudades.ciudades) : "No pudimos leer las ciudades"}</small>
            <span>
              <IconoChevronDerecha />
            </span>
          </Link>
        </li>
      </ul>
      {/* Rutinas (OL-489): las que corren solas una vez por semana, con su interruptor, y el gasto de todas, que se ve en Corridas. */}
      <h2 className={styles.grupo}>Rutinas</h2>
      {ciudades && semanal && !semanal.error ? (
        <ul className={renglon.tarjeta}>
          <li>
            <div className={renglon.ajuste}>
              <InterruptorFichas activa={leerAjusteSemanal(semanal.data?.valor).activa} lineas={lineaSemanal(leerAjusteSemanal(semanal.data?.valor), ciudades.corridas, ahora)} />
            </div>
          </li>
          <li>
            <Link href="/admin/corridas" className={renglon.ajuste}>
              <IconoEtiqueta width={20} height={20} />
              <b>Corridas</b>
              <small>{`${usd(credito(ciudades.credito, ahora).queda)}\u00a0USD de crédito · ${usd(ciudades.corridas.filter((c) => Date.parse(c.creado_en) >= ahora.getTime() - SEMANA_MS).reduce((t, c) => t + c.gasto_usd, 0))}\u00a0USD esta semana`}</small>
              <span>
                <IconoChevronDerecha />
              </span>
            </Link>
          </li>
        </ul>
      ) : (
        <Reintentar texto="No pudimos leer las rutinas." />
      )}
      {/* El showcase (OL-426, lo firmado en OL-425): al nivel del grafo, con su propio grupo. */}
      <GrupoShowcase />
    </main>
  );
}
