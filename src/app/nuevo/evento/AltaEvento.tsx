"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PorPasos from "@/components/PorPasos";
import type { Cupo, ResultadoEvento } from "@/app/eventos/acciones";
import { operacionEvento } from "@/app/eventos/operacionEvento";
import { useEstoyAqui } from "@/app/eventos/useEstoyAqui";
import type { ArtistaResumen } from "@/lib/artistas";
import { enlaceAltaDeTipo } from "@/lib/armazon";
import type { Ciudad } from "@/lib/ciudad";
import { diaLocal, zonaSegura } from "@/lib/fechas";
import { nombreSitio } from "@/lib/eventos";
import type { Franja } from "@/lib/horarioLugar";
import { horarioParaEnviar } from "@/lib/horarioLugar";
import { pistasDe } from "@/lib/sugerencias";
import { apartarGuardia, reponerGuardia } from "@/lib/guardiaSalida";
import { claseMedida, medirCliente } from "@/lib/medir";
import type { LugarResumen } from "@/lib/lugares";
import TiraTipos from "../TiraTipos";
import { sinPisar, type Arranque } from "./arranque";
import CamposEvento from "./CamposEvento";
import { respuestasDelCartel, type Leido } from "./cartelPorPasos";
import type { ContextoClase } from "./contextoClase";
import { avance, claseElegida, eventoPublicado, faltaParaPublicar, preguntaDe, sesionesDe, type Creado } from "./pasos";
import { cuandoDeClase, sedesDelPrograma } from "./clasePorPasos";
import { CartelGuardado, PasoEspera, PasoInicio } from "./PasoCartel";
import { PasoVisita } from "./PasosClase";
import Preguntas from "./Preguntas";
import Publicado from "./Publicado";
import Revisa from "./Revisa";
import SugerenciaPublicado from "./SugerenciaPublicado";
import { useLeerCartel } from "./useLeerCartel";
import { usePasosEvento } from "./usePasosEvento";
import { useSitioPorPasos } from "./useSitioPorPasos";
import { useSugerencia, type AccionesSugerencia } from "./useSugerencia";

type Props = {
  /** La acción del alta de evento (`crearEvento`): devuelve lo creado, sin salir de la pantalla. */
  accion: (previo: ResultadoEvento | null, formData: FormData) => Promise<ResultadoEvento>;
  lugares: LugarResumen[];
  /** Artistas ligados a mi cuenta: si es uno solo, Quién ya viene con él (como en el alta de siempre, decisión 12). */
  mios: ArtistaResumen[];
  /** La ciudad desde la que se entró: una pista más para buscar el sitio. */
  ciudadContexto: Ciudad | null;
  /** A dónde sale la ✕ si no hay pantalla anterior. */
  salida: { href: string; texto: string };
  /** Quien publica: la carpeta de Storage donde sube el cartel. */
  usuarioId: string;
  /** Si el servidor puede leer carteles (hay llave de la IA); apagado, el cartel se sube igual pero sin la casilla «Lectura automática». */
  cartelActivo: boolean;
  /** Las lecturas de cartel que le quedan este mes al abrir la pantalla; null si no se supo o no aplica. */
  cupo: Cupo | null;
  /** Lo que ya se sabe por dónde se entró (el lugar, el artista o el evento que se duplica; OL-312); null si se entra de cero. */
  arranque: Arranque | null;
  /** El horario de cada lugar y los festivales que se pueden elegir (OL-321); sin ellos, las salidas nuevas no tienen de dónde leer. */
  contexto?: ContextoClase;
  /** Las acciones de la sugerencia de «Publicado» (OL-323); sin ellas, el final sale sin sugerencia. */
  sugerencias?: AccionesSugerencia;
};

const FORMULARIO = "publicar-evento";

type Interno = Props & {
  /** Un lugar que se guardó desde «No está en el directorio»: queda en la lista aunque se publique otro evento. */
  onLugarNuevo: (lugar: LugarResumen) => void;
};

/**
 * El alta de evento por pasos (OL-300, OL-301, OL-302 y OL-304; prototipo firmado `publicar-por-pasos.html`, bitácora 323). Sin cartel («No tengo
 * cartel»): ¿Cómo se llama? → ¿Qué día es? → ¿A qué hora? → ¿Dónde es? (con «¿Es aquí?» y «No está en el directorio» si el sitio no es
 * del directorio) → ¿Cuánto cuesta? → Revisa → Publicar. Con cartel («Sube el cartel»; OL-307: se sube siempre): se sube y, si la casilla
 * «Lectura automática» está marcada y quedan lecturas, se lee mientras la pantalla espera (`useLeerCartel`); lo leído rellena las
 * respuestas y solo se preguntan los pasos que falten (`cartelPorPasos.ts`); con todo leído se pasa directo a «Revisa». Sin lectura
 * (desmarcada, agotada, sin servicio) o si la lectura falla, el cartel queda guardado y se sigue a las preguntas, con una fila chica
 * «Cartel guardado» sobre la primera. Las respuestas viven en `usePasosEvento`; lo que se publica viaja en un formulario escondido con los mismos campos que
 * editar, que también es lo que mira la guardia de salida. Publicar aparta la guardia; si el servidor devuelve un error, vuelve,
 * y el error sale en «Revisa». Si publica, la pantalla no sale: se queda en «Publicado» (la acción devuelve lo creado, no redirige a
 * la ficha); de ahí se sale a la ficha («Ver el evento») o compartiendo (OL-365 quitó «Publicar otro»). Los lugares que se guardan en el
 * camino se suman aquí a la lista. Es la única alta de evento (OL-312): «Publicar aquí», «Publicar
 * fecha» y «Duplicar» llegan con su `arranque`, y lo que traen no lo pisa la lectura del cartel (`sinPisar`). Solo el primer paso lleva, abajo, la tira
 * de tipos (OL-313): la salida a registrar un lugar o un artista (sus altas por pasos), que la alta única había quitado.
 */
export default function AltaEvento(props: Props) {
  const [lugares, setLugares] = useState(props.lugares);
  const agregar = useCallback((nuevo: LugarResumen) => setLugares((actual) => (actual.some((l) => l.id === nuevo.id) ? actual : [...actual, nuevo])), []);
  return <AltaPorPasos {...props} lugares={lugares} onLugarNuevo={agregar} />;
}

function AltaPorPasos({ accion, lugares, mios, ciudadContexto, salida, usuarioId, cartelActivo, cupo, arranque, contexto, sugerencias, onLugarNuevo }: Interno) {
  const pasos = usePasosEvento(mios.length === 1 ? [{ id: mios[0].id, nombre: mios[0].nombre }] : [], arranque);
  const { r, paso, direccion, primero, primeraPregunta, cambiar, contestar, seguir, atras, publicado } = pasos;
  const horarios = contexto?.horarios ?? {};
  const sitio = useSitioPorPasos({ pasos, lugares, ciudadContexto, onLugarNuevo });
  // Lo que leyó el cartel, para las sugerencias de «Publicado» (OL-323): la visita de una exposición y el festival que nombra.
  const [leido, setLeido] = useState<Leido | null>(null);
  // Con cartel: se sube siempre y se lee si toca; lo leído rellena las respuestas y el flujo sigue en lo primero que falte (o en «Revisa»); sin
  // lectura, sigue la primera pregunta. Si el cartel nombra un sitio que no es del directorio, «¿Dónde es?» abre con ese nombre ya escrito.
  const cartel = useLeerCartel({
    usuarioId,
    servicio: cartelActivo,
    cupo,
    alGuardar: seguir,
    alLeer: (leido) => {
      setLeido(leido);
      const leidas = sinPisar(respuestasDelCartel(leido, r.quien), arranque);
      if (leidas.sitio?.modo === "otro") sitio.setBusqueda(leidas.sitio.otro.sitioTexto || leidas.sitio.otro.direccion || "");
      contestar(leidas);
    },
  });
  const ubicacion = useEstoyAqui();
  // Lo que devolvió el servidor al publicar; con eso y las respuestas se arma la tarjeta de «Publicado».
  const [creado, setCreado] = useState<(Creado & { borradores: number }) | null>(null);
  const [resultado, enviar, enviando] = useActionState<ResultadoEvento | null, FormData>(async (previo, datos) => {
    const hecho = await accion(previo, datos);
    if (hecho.ok) {
      setCreado({ id: hecho.id, slug: hecho.slug ?? null, creadoEn: new Date().toISOString(), borradores: hecho.programa?.borradores ?? 0 });
      medirCliente("evento_creado", { cartel: datos.get("imagen") ? "si" : "no", clase: claseMedida(datos.get("clase")) });
      publicado();
    }
    return hecho;
  }, null);
  const operacion = useRef<ReturnType<typeof operacionEvento> | null>(null);
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  // Las horas son las del sitio del evento: las del lugar, si es en uno; si no, las de la ciudad inicial (el servidor guarda en la del punto).
  const zona = zonaSegura(sitio.lugar?.zona);
  const falta = faltaParaPublicar(r);
  const atrasDelPaso = useCallback(() => atras(paso), [atras, paso]);

  // La sugerencia de «Publicado» (OL-323): a un evento o un taller, con las pistas del título y del cartel. H2 abre «¿Cuándo se puede visitar?»
  // (la pregunta de OL-321) dentro de esta misma pantalla, con «Desde» ya puesto; Atrás vuelve a «Publicado» sin crear nada.
  const pistas = useMemo(
    () => pistasDe(r.nombre, leido ? { clase: leido.valores.forma?.clase ?? null, visita: leido.valores.forma?.visita ?? null, inicio: leido.valores.inicio, horaLeida: leido.horaLeida, festival: leido.valores.festival ?? null } : null),
    [r.nombre, leido],
  );
  const conSugerencia = r.clase === "puntual" || r.clase === "taller";
  const sugerencia = useSugerencia(sugerencias, creado && conSugerencia ? creado.id : null, pistas);
  const [periodo, setPeriodo] = useState<{ visita: { desde: string; hasta: string | null }; horario: Franja[] | null } | null>(null);
  const [direccionPeriodo, setDireccionPeriodo] = useState<"entra" | "vuelve" | null>(null);
  const abrirPeriodo = useCallback(() => {
    const e = sugerencia.estado;
    if (e.fase !== "abierta" || e.s.tipo !== "exposicion" || e.s.modo !== "periodo") return;
    setDireccionPeriodo("entra");
    setPeriodo({ visita: { desde: e.s.desde, hasta: null }, horario: null });
  }, [sugerencia.estado]);
  const cerrarPeriodo = useCallback(() => {
    setDireccionPeriodo("vuelve");
    setPeriodo(null);
  }, []);

  function publicar(fd: FormData) {
    if (falta) return;
    // Un reintento con los mismos datos conserva su clave: el servidor no publica dos veces.
    operacion.current = operacionEvento(fd, operacion.current);
    fd.set("operacion", operacion.current.id);
    apartarGuardia();
    enviar(fd);
  }

  return (
    <PorPasos
      titulo={paso === "revisa" ? "Revisa" : "Publicar"}
      paso={cartel.espera ? "espera" : periodo ? "periodo" : paso}
      direccion={cartel.espera ? null : periodo || direccionPeriodo ? direccionPeriodo : direccion}
      avance={avance(paso)}
      salida={salida}
      onAtras={periodo ? cerrarPeriodo : primero ? undefined : atrasDelPaso}
      encima={!cartel.espera && primeraPregunta && preguntaDe(paso, r) && cartel.subido && !cartel.subido.leido ? <CartelGuardado foto={cartel.subido.url} noPude={cartel.subido.noPude} /> : undefined}
      pregunta={cartel.espera ? undefined : periodo ? "¿Cuándo se puede visitar?" : preguntaDe(paso, r)}
      fijo={
        <form id={FORMULARIO} action={publicar} hidden>
          <CamposEvento r={r} ciudadContexto={ciudadContexto} imagen={cartel.subido?.url ?? null} colores={cartel.subido?.colores} />
          {/* El festival que nombra el cartel (OL-323): se anota con el evento para reconocerlo cuando se publique otro acto (H4). */}
          <input type="hidden" name="festival_leido" value={leido?.valores.festival ?? ""} />
        </form>
      }
    >
      {cartel.espera && <PasoEspera foto={cartel.miniatura} leyendo={cartel.espera === "leyendo"} />}
      {!cartel.espera && paso === "inicio" && (
        <>
          <PasoInicio casilla={cartel.casilla} error={cartel.error} onElegir={cartel.elegir} onSinCartel={seguir} />
          {/* Solo en el primer paso, donde aún no hay nada escrito: la salida a registrar un lugar o un artista (sus altas por pasos). */}
          <TiraTipos actual="evento" destinos={{ lugar: enlaceAltaDeTipo("lugar", ciudadContexto?.slug ?? null), artista: enlaceAltaDeTipo("artista", ciudadContexto?.slug ?? null) }} />
        </>
      )}
      {/* La espera del cartel dura hasta que la imagen subida se ve (OL-353): mientras, solo ella, aunque el paso ya haya avanzado. */}
      {!cartel.espera && <Preguntas pasos={pasos} sitio={sitio} ubicacion={ubicacion} zona={zona} lugares={lugares} mios={mios} ciudadContexto={ciudadContexto} errores={errores} horarios={horarios} clases />}
      {!cartel.espera && paso === "revisa" && (
        <Revisa
          r={r}
          zona={zona}
          lugar={sitio.lugar}
          mios={mios}
          cartel={cartel.subido}
          errores={errores}
          general={resultado && !resultado.ok ? resultado.general : undefined}
          enviando={enviando}
          falta={falta}
          formulario={FORMULARIO}
          onAbrir={sitio.abrirPaso}
          onCambiar={cambiar}
          onClase={(clase) => contestar(claseElegida(clase))}
          horarioLugar={sitio.lugar ? (horarios[sitio.lugar.id] ?? []) : []}
          festivales={contexto?.festivales ?? []}
          sedes={r.clase === "festival" ? sedesDelPrograma(r, lugares) : undefined}
        />
      )}
      {paso === "publicado" && creado && periodo && (
        <PasoVisita
          visita={periodo.visita}
          zona={zona}
          horarioLugar={sitio.lugar ? (horarios[sitio.lugar.id] ?? []) : []}
          horario={periodo.horario}
          onVisita={(visita) => setPeriodo((p) => p && { ...p, visita })}
          onHorario={(horario) => setPeriodo((p) => p && { ...p, horario })}
          texto="Publicar exposición"
          onSeguir={() => {
            const { visita, horario } = periodo;
            if (!visita.hasta) return;
            void sugerencia.aceptar({ desde: visita.desde, hasta: visita.hasta, horario: horario?.length ? horarioParaEnviar(horario) : null });
            cerrarPeriodo();
          }}
        />
      )}
      {paso === "publicado" && creado && !periodo && (
        <AlPublicar r={r} creado={creado} evento={eventoPublicado(r, creado, { lugar: sitio.lugar, zona, imagen: cartel.subido?.url ?? null })} conCartel={!!cartel.subido} zona={zona} sugerencia={conSugerencia ? sugerencia : null} onPeriodo={abrirPeriodo} />
      )}
    </PorPasos>
  );
}

/**
 * «Publicado» con la sugerencia de OL-323 debajo de la tarjeta (a un evento o un taller; la exposición y el festival traen la suya de OL-321).
 */
function AlPublicar({ r, creado, evento: publicado, conCartel, zona, sugerencia, onPeriodo }: { r: ReturnType<typeof usePasosEvento>["r"]; creado: Creado & { borradores: number }; evento: ReturnType<typeof eventoPublicado>; conCartel: boolean; zona: string; sugerencia: ReturnType<typeof useSugerencia> | null; onPeriodo: () => void }) {
  // OL-341: si entró a un festival con otro nombre («<artista> en <festival>»), la tarjeta y compartir dicen el nombre con que quedó.
  const hecha = sugerencia?.estado.fase === "hecha" ? sugerencia.estado : null;
  const evento = hecha?.titulo ? { ...publicado, titulo: hecha.titulo } : publicado;
  return (
    <Publicado
      evento={evento}
      conCartel={conCartel}
      conSesiones={!!sesionesDe(r)}
      clase={r.clase}
      cuando={cuandoDeClase(r, zona, creado.borradores)}
      sinInauguracion={!r.inauguracion}
      sugerencia={
        sugerencia && (
          <SugerenciaPublicado
            estado={sugerencia.estado}
            evento={{ titulo: evento.titulo, dia: evento.inicio ? diaLocal(new Date(evento.inicio), zona) : "", lugar: nombreSitio(evento) }}
            zona={zona}
            onAceptar={(titulo) => void sugerencia.aceptar(undefined, titulo)}
            onPeriodo={onPeriodo}
            onAhoraNo={sugerencia.ahoraNo}
          />
        )
      }
      sugerenciaAbierta={sugerencia?.estado.fase === "abierta"}
      sugerenciaVisible={sugerencia?.estado.fase === "abierta" || sugerencia?.estado.fase === "hecha"}
    />
  );
}
