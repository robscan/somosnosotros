import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { esUuid } from "@/lib/formulario";
import { claveDeVuelta, estadoConexion, type FilaConexion } from "@/lib/instagram/conexionEstado";
import { tituloDePagina } from "@/lib/marca";
import { GALLETA_CIUDAD, leerCiudad } from "@/lib/panel";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../Reintentar";
import ConexionInstagram from "./ConexionInstagram";
import { cargarCiudadesInstagram, cargarSugerencias } from "./datos";
import PantallaInstagram from "./PantallaInstagram";
import { cargarSemana } from "./semana";
import styles from "../admin.module.css";

export const metadata = { title: tituloDePagina("Instagram", "Administración"), robots: { index: false, follow: false } };

/**
 * Administración › Instagram (OL-458, prototipo firmado `admin-instagram.html`, pantalla B; bitácora 490): los eventos de la ciudad que se
 * pueden publicar en @smsnstrsapp en los próximos 7 días (y lo que está en curso con días por delante), en orden de señal, y lo ya publicado.
 * La ciudad: la de la dirección o, si no, la que se eligió en las listas de Administración en esta sesión. `?evento=` llega con su hoja abierta.
 * OL-471 (bitácora 503): arriba de la lista, el bloque «Conexión» con el estado de `instagram_conexion` (sin token; la lee la administración) y
 * «Conectar Instagram»; `?conectado=1` y `?error=<clave>` son la vuelta del inicio de sesión de Meta.
 * OL-479 (bitácora 511): la pestaña «Semana», primero: la semana de Instagram de la ciudad (`?semana=viene`, la que viene), que se arma sola con
 * la regla firmada y se programa en la cola; `?dia=` llega con la hoja de ese día abierta (el aviso al teléfono de lo que publicó la semana). El
 * bloque «Conexión» va en las dos pestañas (sin la cuenta conectada no sale nada de la semana).
 */
export default async function Instagram({ searchParams }: { searchParams: Promise<{ ciudad?: string; evento?: string; conectado?: string; error?: string; semana?: string; dia?: string }> }) {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/instagram");
  if (actual.perfil.rol !== "admin") redirect("/");
  const p = await searchParams;
  const ciudad = p.ciudad === "todas" ? null : leerCiudad("eventos", p.ciudad ?? (await cookies()).get(GALLETA_CIUDAD)?.value ?? null);
  const cual = p.semana === "viene" ? "viene" : "esta";
  const supabase = await clienteServidor();
  const [sugerencias, ciudades, conexion, semana] = supabase
    ? await Promise.all([
        cargarSugerencias(supabase, ciudad),
        cargarCiudadesInstagram(supabase),
        supabase
          .from("instagram_conexion")
          .select("pagina_nombre, instagram_usuario, permisos, conectado_en")
          .limit(1)
          .then(({ data }) => ((data ?? [])[0] as FilaConexion | undefined) ?? null),
        ciudad ? cargarSemana(supabase, ciudad, cual) : Promise.resolve(null),
      ])
    : [null, [], null, null];
  const nombre = ciudad ? (ciudades.find((c) => c.slug === ciudad)?.nombre ?? sugerencias?.filas[0]?.ciudad_nombre ?? ciudad) : "Todas las ciudades";
  const elegidas = ciudad && !ciudades.some((c) => c.slug === ciudad) ? [...ciudades, { slug: ciudad, nombre, n: 0 }] : ciudades;
  const total = sugerencias ? sugerencias.para.length + sugerencias.ya.length : 0;
  const bloqueConexion = <ConexionInstagram estado={estadoConexion(conexion, !!process.env.INSTAGRAM_TOKEN, new Date())} vuelta={p.conectado === "1" ? "conectado" : claveDeVuelta(p.error)} />;

  return (
    <main className={`${plantilla.paginaContenido} ${styles.listado}`}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} titulo="Instagram" />
      <PantallaInstagram
        semana={{ ciudad: { slug: ciudad, nombre }, ciudades: elegidas, semana, cual, abrir: esUuid(p.dia) ? p.dia! : null, conexion: bloqueConexion }}
        eventos={{
          ciudad: { slug: ciudad, nombre },
          ciudades: elegidas,
          para: sugerencias?.para ?? [],
          ya: sugerencias?.ya ?? [],
          abrir: sugerencias && esUuid(p.evento) ? p.evento! : null,
          conteo: sugerencias && total ? `${total === 1 ? "1 evento" : `${total} eventos`} en los próximos 7 días${sugerencias.ya.length ? ` · ${sugerencias.ya.length} ya en Instagram` : ""}` : null,
          vacio: sugerencias && !total ? `No hay eventos por publicar en ${ciudad ? nombre : "ninguna ciudad"} en los próximos 7 días.` : null,
          conexion: bloqueConexion,
        }}
      />
      {!sugerencias && <Reintentar texto="No pudimos leer los eventos." />}
    </main>
  );
}
