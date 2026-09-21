import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { IconoCalendario, IconoChevronDerecha, IconoEstrella, IconoPersonas, IconoPin, IconoPincel } from "@/components/ui/Iconos";
import ficha from "@/components/ui/Ficha.module.css";
import { diaLocal } from "@/lib/fechas";
import { cuandoPaso, indicadores, notaSemana, renglonesGestionar } from "@/lib/panel";
import { usuarioActual } from "@/lib/supabase/servidor";
import { cargarComunidad, cargarResumen } from "./consultas";
import ComunidadComoVa from "./ComunidadComoVa";
import CapoComoVa from "./CapoComoVa";
import { cargarCapo } from "./capo-consultas";
import Indicadores from "./Indicadores";
import Pendientes from "./Pendientes";
import Reintentar from "./Reintentar";
import styles from "./admin.module.css";

export const metadata = { title: "Administración · Somos Nosotros", robots: { index: false, follow: false } };

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
  const [{ resumen, pendientes, errorPendientes }, comunidad, capo] = await Promise.all([cargarResumen(), cargarComunidad(), cargarCapo()]);
  const ahora = new Date();
  const lista = resumen ? indicadores(resumen, diaLocal(ahora)) : [];
  const renglones = resumen ? renglonesGestionar(resumen.gestionar) : SECCIONES.map((s) => ({ ...s, total: null, detalle: null }));
  return (
    <main className={ficha.pagina}>
      <Barra volver={{ href: "/ajustes", texto: "Ajustes" }} />
      <h1 className={styles.titulo}>Administración</h1>
      {/* La llave cambia cuando la lista pasa de no leída a leída (Intentar de nuevo): así se monta con los pendientes reales. */}
      <Pendientes key={errorPendientes ? "sin-leer" : "leidos"} iniciales={pendientes.map((p) => ({ ...p, cuando: cuandoPaso(p.creado_en, ahora) }))} error={errorPendientes} />

      <h2 className={styles.grupo}>Últimos 7 días</h2>
      {resumen ? <Indicadores lista={lista} nota={notaSemana(lista)} /> : <Reintentar texto="No pudimos leer los indicadores." />}

      <h2 className={styles.grupo}>Cómo va la comunidad</h2>
      {comunidad ? <ComunidadComoVa comunidad={comunidad} /> : <Reintentar texto="No pudimos leer el embudo de la comunidad." />}

      <h2 className={styles.grupo}>Invitaciones CAPO</h2>
      {capo ? <CapoComoVa metricas={capo} /> : <Reintentar texto="No pudimos leer los resultados de las invitaciones CAPO." />}

      <h2 className={styles.grupo}>Gestionar</h2>
      <ul className={styles.tarjeta}>
        {renglones.map((r) => {
          const Icono = ICONO[r.clave];
          return (
            <li key={r.clave}>
              <Link href={r.href} className={styles.fila}>
                <Icono width={20} height={20} />
                <b>{r.titulo}</b>
                {r.detalle && <small>{r.detalle}</small>}
                <span className={styles.total}>
                  {r.total}
                  <IconoChevronDerecha />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Obras colectivas (OL-088) es alta, no moderación: no encaja en SECCIONES/renglonesGestionar(), así que va
          en su propio bloque, no dentro de "Gestionar". */}
      <h2 className={styles.grupo}>Obras colectivas</h2>
      <ul className={styles.tarjeta}>
        <li>
          <Link href="/admin/obras-colectivas" className={styles.fila}>
            <IconoPincel width={20} height={20} />
            <b>Obras colectivas</b>
            <span className={styles.total}>
              <IconoChevronDerecha />
            </span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
