import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cargarMisArtistas, cargarQuien } from "@/app/artistas/consultas";
import { cupoDeCartel } from "@/app/eventos/acciones";
import EditarEvento from "@/app/nuevo/evento/EditarEvento";
import { respuestasAlEditar } from "@/app/nuevo/evento/alEditar";
import { cargarContextoClase } from "@/app/nuevo/evento/contextoClase";
import { rangoDelPeriodo, textoProgramaRegistrado } from "@/lib/claseEvento";
import { franjaDeFila } from "@/lib/horarioLugar";
import { lecturaDeCartelActiva } from "@/lib/cartel";
import { esUuid } from "@/lib/formulario";
import { hrefEvento, type Evento, type SitioPrivado } from "@/lib/eventos";
import { zonaSegura } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import type { SesionGuardada } from "@/lib/sesionesEvento";
import { clienteServidor, usuarioActual } from "@/lib/supabase/servidor";
import { zonaDelSitio } from "@/lib/zona";
import { actualizarEvento } from "../../acciones";

export const metadata = { title: "Editar evento · Somos Nosotros", robots: { index: false, follow: false } };

type EventoGuardado = Evento & { actualizado_en: string; sesiones?: SesionGuardada[] | null };

/** Igual que la ficha: se busca por slug y, si no aparece, por UUID (la dirección vieja). Con sus sesiones (horario por día, OL-311). */
async function cargarEvento(idOSlug: string) {
  const supabase = await clienteServidor();
  if (!supabase) return null;
  const columnas = "*, sesiones:eventos_sesiones(inicio, fin)";
  const porSlug = await supabase.from("eventos").select(columnas).eq("slug", idOSlug).maybeSingle();
  const data = porSlug.data ?? (esUuid(idOSlug) ? (await supabase.from("eventos").select(columnas).eq("id", idOSlug).maybeSingle()).data : null);
  return data as EventoGuardado | null;
}

/**
 * Editar un evento (OL-319): el flujo por pasos del alta, que entra directo en «Revisa» con todo el evento puesto (`EditarEvento`). Solo su
 * autor y la administración; sin sesión, a Entrar y de vuelta aquí. La dirección vieja (con el UUID) redirige a la de hoy.
 */
export default async function EditarEventoPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actual = await usuarioActual();
  if (!actual) redirect(`/entrar?siguiente=${encodeURIComponent(`/eventos/${id}/editar`)}`);
  const evento = await cargarEvento(id);
  if (!evento) notFound();
  // Dirección vieja (/eventos/<uuid>/editar): redirige a la de hoy, con el mismo id real por debajo.
  if (id !== evento.slug) permanentRedirect(`${hrefEvento(evento)}/editar`);
  if (actual.perfil.rol !== "admin" && evento.creado_por !== actual.perfil.id) redirect(hrefEvento(evento));
  const supabase = await clienteServidor();
  // Los lugares privados de la cuenta entran por la política de lectura y «¿Dónde es?» los marca «Privado» (OL-179).
  const cartelActivo = lecturaDeCartelActiva();
  // Cómo ocurre (OL-321): el horario propio de una exposición, su inauguración, el festival del que es parte y las actividades de un festival.
  // Sin la migración (o si falla) llegan vacías: el evento se edita como siempre.
  const [{ data: lugares }, { data: privado }, quien, mios, cupo, contexto, horarioPropio, inauguracion, padre, actos] = await Promise.all([
    supabase?.from("lugares").select("id, nombre, tipo, direccion, lat, lng, portada, zona, privado").eq("visible", true).order("nombre") ?? { data: [] },
    evento.sitio_reservado && supabase ? supabase.from("eventos_sitio_privado").select("direccion, lat, lng, indicaciones, revelar_desde").eq("evento_id", evento.id).maybeSingle() : { data: null },
    cargarQuien(evento.id),
    cargarMisArtistas(actual.perfil.id),
    cartelActivo ? cupoDeCartel() : null,
    cargarContextoClase(supabase, { id: actual.perfil.id, admin: actual.perfil.rol === "admin" }),
    evento.clase === "exposicion" && supabase ? supabase.from("eventos_horarios").select("dias, abre, cierra").eq("evento_id", evento.id).order("creado_en").then(({ data }) => (data ?? []).map(franjaDeFila)) : [],
    evento.inaugura_id && supabase ? supabase.from("eventos").select("inicio").eq("id", evento.inaugura_id).maybeSingle().then(({ data }) => data as { inicio: string } | null) : null,
    evento.evento_padre_id && supabase ? supabase.from("eventos").select("id, titulo").eq("id", evento.evento_padre_id).maybeSingle().then(({ data }) => data as { id: string; titulo: string } | null) : null,
    evento.clase === "festival" && supabase ? supabase.from("eventos").select("id").eq("evento_padre_id", evento.id).eq("borrador", false).then(({ data }) => (Array.isArray(data) ? data.length : 0)) : 0,
  ]);
  const registrados = (lugares ?? []) as LugarResumen[];
  const sitioPrivado = privado as SitioPrivado | null;
  // Las horas se leen en la zona en que las guardará el servidor: la del lugar, o la del punto del sitio (un reservado sin dirección, la suya).
  const zonaSitio = evento.sitio_reservado && !sitioPrivado ? evento.zona : zonaDelSitio(evento, sitioPrivado);
  const lugar = evento.lugar_id ? registrados.find((l) => l.id === evento.lugar_id) : undefined;
  const zona = zonaSegura(evento.sitio_texto || evento.sitio_reservado ? zonaSitio : (lugar?.zona ?? evento.zona));
  const respuestas = respuestasAlEditar({ evento, privado: sitioPrivado, lugares: registrados, quien: quien.map((q) => ({ id: q.id, nombre: q.nombre })), sesiones: evento.sesiones, zona, clase: { horario: horarioPropio, inauguracion, padre, actos } });
  const festivalGuardado =
    evento.clase === "festival" && evento.fin
      ? { actos, resumen: [rangoDelPeriodo(evento.inicio, evento.fin, evento.zona), textoProgramaRegistrado(actos)].join(" · ") }
      : undefined;
  return (
    <EditarEvento
      accion={actualizarEvento.bind(null, evento.id)}
      respuestas={respuestas}
      imagen={evento.imagen}
      revision={evento.actualizado_en}
      zonaEvento={evento.zona}
      zonaSitio={zonaSitio}
      lugares={registrados}
      mios={mios}
      ciudadContexto={null}
      ficha={hrefEvento(evento)}
      usuarioId={actual.perfil.id}
      esAdmin={actual.perfil.rol === "admin"}
      cartelActivo={cartelActivo}
      cupo={cupo}
      contexto={contexto}
      festivalGuardado={festivalGuardado}
    />
  );
}
