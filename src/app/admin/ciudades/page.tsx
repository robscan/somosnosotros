import Link from "next/link";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import { IconoCalendario, IconoChevronDerecha, IconoDestello, IconoEstrella, IconoOk, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import plantilla from "@/components/ui/Plantilla.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import {
  avanceDe,
  BOTONES,
  cifrasCiudad,
  credito,
  fechaVence,
  lineaCredito,
  lineaInvestigacion,
  ordenarCiudades,
  propuestasPorRevisar,
  textoBoton,
  ultimaPorBoton,
  usd,
  type TipoCorrida,
} from "@/lib/ciudadesAdmin";
import { usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../Reintentar";
import { cargarPanelCiudades, conCifras } from "./consultas";
import TarjetaCiudad from "./TarjetaCiudad";
import styles from "../admin.module.css";

export const metadata = { title: "Ciudades · Administración · Somos Nosotros", robots: { index: false, follow: false } };

const ICONO: Record<TipoCorrida, typeof IconoPin> = { lugares: IconoPin, agendas: IconoCalendario, artistas: IconoEstrella, showcase: IconoDestello };

/**
 * Administración › Ciudades (OL-427; doc 57 §4.B; prototipo firmado OL-425, bitácora 458). Arriba, lo que pide una acción: las propuestas por
 * revisar, una por corrida. Luego una tarjeta por ciudad, primero las que tienen algo por decidir; cada una con su estado, cuánto se consulta,
 * qué tiene y sus tres botones en el orden del founder («Buscar lugares», «Buscar agendas y eventos», «Buscar artistas»). Al final, Corridas
 * con el crédito. Se entra desde la portada de Administración y Atrás vuelve ahí.
 */
export default async function Ciudades() {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/ciudades");
  if (actual.perfil.rol !== "admin") redirect("/");
  const panel = await cargarPanelCiudades();
  if (!panel)
    return (
      <main className={plantilla.paginaContenido}>
        <Barra volver={{ href: "/admin", texto: "Administración" }} />
        <h1 className={styles.titulo}>Ciudades</h1>
        <Reintentar texto="No pudimos leer las ciudades." />
      </main>
    );
  const ahora = new Date();
  const ciudades = ordenarCiudades(await conCifras(panel.ciudades), panel.corridas);
  const porRevisar = propuestasPorRevisar(panel.corridas, panel.ciudades, ahora);
  const n = porRevisar.reduce((t, p) => t + p.n, 0);
  const c = credito(panel.credito, ahora);
  const fraseCredito = `Crédito: ${usd(c.queda)} USD${c.vence ? `, ${c.dias === null ? "venció" : "vence"} el ${fechaVence(c.vence)}` : ""}`;
  return (
    <main className={plantilla.paginaContenido}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} />
      <h1 className={styles.titulo}>Ciudades</h1>

      <h2 className={styles.grupo}>Propuestas{n > 0 && <b>{n}</b>}</h2>
      {porRevisar.length ? (
        <ul className={renglon.tarjeta}>
          {porRevisar.map((p) => {
            const Icono = ICONO[p.tipo];
            return (
              <li key={p.corrida}>
                <Link href={`/admin/ciudades/propuestas/${p.corrida}`} className={styles.fila}>
                  <Icono width={20} height={20} />
                  <b>{p.titulo}</b>
                  <small>{p.detalle}</small>
                  <span className={styles.total}>
                    {p.n}
                    <IconoChevronDerecha />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.nada}>
          <IconoOk width={20} height={20} />
          <b>Nada por revisar</b>
          <small>Las propuestas llegan al correr una búsqueda</small>
        </p>
      )}

      <h2 className={styles.grupo}>Ciudades</h2>
      {ciudades.length === 0 && <p className={styles.vacio}>Todavía no hay ciudades: aparecen cuando alguien consulta una.</p>}
      {ciudades.map((ciudad) => {
        const propias = panel.corridas.filter((r) => r.ciudad === ciudad.slug);
        const ultima = ultimaPorBoton(panel.corridas, ciudad.slug);
        return (
          <TarjetaCiudad
            key={ciudad.slug}
            slug={ciudad.slug}
            nombre={ciudad.nombre}
            estado={ciudad.estado}
            cifras={cifrasCiudad(ciudad)}
            linea={lineaInvestigacion(ciudad, propias, ahora)}
            credito={fraseCredito}
            botones={BOTONES.map(({ tipo }) => {
              const r = ultima[tipo];
              const enCurso = r && (r.estado === "pendiente" || r.estado === "corriendo") ? { id: r.id, estado: r.estado, texto: textoBoton(r, ahora) } : null;
              return { tipo, texto: textoBoton(r, ahora), avance: r ? avanceDe(r) : null, enCurso };
            })}
          />
        );
      })}

      <h2 className={styles.grupo}>Corridas</h2>
      <ul className={renglon.tarjeta}>
        <li>
          <Link href="/admin/corridas" className={styles.fila}>
            <IconoReloj width={20} height={20} />
            <b>Corridas</b>
            <small>{lineaCredito(c)}</small>
            <span className={styles.total}>
              <IconoChevronDerecha />
            </span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
