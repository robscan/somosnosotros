import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Barra from "@/components/ui/Barra";
import plantilla from "@/components/ui/Plantilla.module.css";
import { esUuid } from "@/lib/formulario";
import { CIUDAD_INICIAL } from "@/lib/ciudad";
import { diaLocal } from "@/lib/fechas";
import { claveDeVuelta, estadoConexion, leerConexion } from "@/lib/instagram/conexionEstado";
import { tituloDePagina } from "@/lib/marca";
import { GALLETA_CIUDAD, leerCiudad } from "@/lib/panel";
import { clienteAdmin } from "@/lib/supabase/admin";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import Reintentar from "../Reintentar";
import { cargarCiudadesInstagram, cargarSugerencias } from "./datos";
import PantallaInstagram from "./PantallaInstagram";
import { pestanaInicial, semanaConAlgo } from "./pestana";
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
 * OL-495 (firmado en el prototipo de OL-493, variante C, bitácora 525): abre con la ciudad de quien entra (`ciudadDeLaPantalla`) y su nombre de
 * `ciudades`; la conexión es un botón con su punto junto a las pestañas (el renglón, solo si falta algo o caducó; «caducó» lo dice la cola); y la
 * pestaña inicial es «Semana» si tiene algo de hoy en adelante y «Eventos» si no, con «Falta material» arriba cuando la semana está vacía por eso.
 */
export default async function Instagram({ searchParams }: { searchParams: Promise<{ ciudad?: string; evento?: string; conectado?: string; error?: string; semana?: string; dia?: string }> }) {
  const actual = await usuarioActual();
  if (!actual) redirect("/entrar?siguiente=/admin/instagram");
  if (actual.perfil.rol !== "admin") redirect("/");
  const p = await searchParams;
  const ciudad = await ciudadDeLaPantalla(p.ciudad, (await cookies()).get(GALLETA_CIUDAD)?.value ?? null, actual.perfil.id);
  const cual = p.semana === "viene" ? "viene" : "esta";
  const supabase = await clienteServidor();
  const [sugerencias, deEventos, nombres, conexion, semana] = supabase
    ? await Promise.all([
        cargarSugerencias(supabase, ciudad),
        cargarCiudadesInstagram(supabase),
        supabase
          .from("ciudades")
          .select("slug, nombre")
          .then(({ data }) => new Map(((data ?? []) as { slug: string; nombre: string }[]).map((c) => [c.slug, c.nombre]))),
        leerConexion(supabase),
        ciudad ? cargarSemana(supabase, ciudad, cual) : Promise.resolve(null),
      ])
    : [null, [], new Map<string, string>(), { fila: null, ultimo: null }, null];
  // El nombre de cada ciudad sale de `ciudades` (con su acento: «Querétaro», no «queretaro»); si no está ahí, el de sus eventos.
  const ciudades = deEventos.map((c) => ({ ...c, nombre: nombres.get(c.slug) ?? c.nombre }));
  const nombre = ciudad ? (nombres.get(ciudad) ?? ciudades.find((c) => c.slug === ciudad)?.nombre ?? sugerencias?.filas[0]?.ciudad_nombre ?? ciudad) : "Todas las ciudades";
  const elegidas = ciudad && !ciudades.some((c) => c.slug === ciudad) ? [...ciudades, { slug: ciudad, nombre, n: 0 }] : ciudades;
  const total = sugerencias ? sugerencias.para.length + sugerencias.ya.length : 0;
  const estado = estadoConexion(conexion.fila, !!process.env.INSTAGRAM_TOKEN, new Date(), conexion.ultimo);
  // OL-495: la pestaña con la que abre y, con la semana vacía por falta de material, «Falta material» arriba de «Eventos».
  const hoy = semana ? diaLocal(new Date(), semana.zona) : "";
  const conAlgo = !!semana && semanaConAlgo(semana.dias, hoy);
  const inicial = pestanaInicial(semana?.dias ?? null, hoy);
  const sinMaterial = semana && cual === "esta" && !conAlgo && semana.falta?.fichas.length ? { falta: semana.falta, usuarioId: actual.perfil.id } : null;

  return (
    <main className={`${plantilla.paginaContenido} ${styles.listado}`}>
      <Barra volver={{ href: "/admin", texto: "Administración" }} titulo="Instagram" />
      <PantallaInstagram
        inicial={inicial}
        conexion={estado}
        vuelta={p.conectado === "1" ? "conectado" : claveDeVuelta(p.error)}
        semana={{ ciudad: { slug: ciudad, nombre }, ciudades: elegidas, semana, cual, abrir: esUuid(p.dia) ? p.dia! : null, usuarioId: actual.perfil.id }}
        eventos={{
          ciudad: { slug: ciudad, nombre },
          ciudades: elegidas,
          para: sugerencias?.para ?? [],
          ya: sugerencias?.ya ?? [],
          abrir: sugerencias && esUuid(p.evento) ? p.evento! : null,
          conteo: sugerencias && total ? `${total === 1 ? "1 evento" : `${total} eventos`} en los próximos 7 días${sugerencias.ya.length ? ` · ${sugerencias.ya.length} ya en Instagram` : ""}` : null,
          vacio: sugerencias && !total ? `No hay eventos por publicar en ${ciudad ? nombre : "ninguna ciudad"} en los próximos 7 días.` : null,
        }}
        sinMaterial={sinMaterial}
      />
      {!sugerencias && <Reintentar texto="No pudimos leer los eventos." />}
    </main>
  );
}

/**
 * OL-495: la ciudad con la que abre la pantalla. La de la dirección (`?ciudad=todas`: todas); si no, la que se eligió en las listas de
 * Administración en esta sesión (la galleta de OL-456); si no, la de quien entra (`ciudad_de_persona`: la que más se repite en lo que lleva,
 * publicó y marcó «Voy»; la función es de la llave de servicio, y aquí solo pregunta por la persona misma); si no, la ciudad inicial. «Todas las
 * ciudades» sigue en la hoja, no por omisión.
 */
async function ciudadDeLaPantalla(deLaDireccion: string | undefined, deLaSesion: string | null, perfil: string): Promise<string | null> {
  if (deLaDireccion === "todas") return null;
  const elegida = leerCiudad("eventos", deLaDireccion ?? deLaSesion);
  if (elegida || deLaDireccion !== undefined || deLaSesion) return elegida;
  const db = clienteAdmin();
  const suya = db ? await db.rpc("ciudad_de_persona", { p_perfil: perfil }).then(({ data }) => (typeof data === "string" ? data : null), () => null) : null;
  return leerCiudad("eventos", suya) ?? CIUDAD_INICIAL.slug;
}
