"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import PorPasos from "@/components/PorPasos";
import { crearLugarDesdeEvento } from "@/app/lugares/acciones";
import type { Cupo, ResultadoEvento } from "@/app/eventos/acciones";
import CamposSitio from "@/app/eventos/CamposSitio";
import { operacionEvento } from "@/app/eventos/operacionEvento";
import { useEstoyAqui } from "@/app/eventos/useEstoyAqui";
import type { ArtistaResumen } from "@/lib/artistas";
import { deducirTipo } from "@/lib/buscarLugares";
import { CIUDAD_INICIAL, ciudadParaPunto, type Ciudad } from "@/lib/ciudad";
import { zonaSegura } from "@/lib/fechas";
import { apartarGuardia, reponerGuardia } from "@/lib/guardiaSalida";
import { contextoDondeEsta } from "@/lib/hojaDonde";
import type { LugarResumen } from "@/lib/lugares";
import { sesionesParaEnviar } from "@/lib/sesionesEvento";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";
import { respuestasDelCartel } from "./cartelPorPasos";
import { avance, eventoPublicado, faltaParaPublicar, finDe, inicioDe, nombreDelSitio, sitioDeLugar, type Candidato, type Creado, type Paso, type Respuestas, type Uso } from "./pasos";
import { CartelGuardado, PasoEspera, PasoInicio } from "./PasoCartel";
import { PasoDonde, PasoMapa, PasoUso } from "./PasosDonde";
import { PasoCuanto, PasoDia, PasoHora, PasoMas, PasoNombre } from "./PasosEvento";
import Publicado from "./Publicado";
import Revisa from "./Revisa";
import { useLeerCartel } from "./useLeerCartel";
import { usePasosEvento } from "./usePasosEvento";

type Props = {
  /** La acción de siempre del alta de evento (`crearEvento`): mismos campos, mismas validaciones. Con el campo `quedarse` no lleva a la ficha: devuelve lo creado. */
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
};

const FORMULARIO = "publicar-evento";
/** La acción que crea un lugar pide a dónde volver solo para que nunca redirija: aquí no se sale de la pantalla. */
const VOLVER_A = "/nuevo/evento";
const NO_SE_GUARDO = "No se pudo guardar el lugar. Puedes usarlo solo en este evento.";
const PREGUNTA: Partial<Record<Paso, string>> = {
  nombre: "¿Cómo se llama?",
  dia: "¿Qué día es?",
  hora: "¿A qué hora?",
  donde: "¿Dónde es?",
  mapa: "¿Es aquí?",
  uso: "No está en el directorio",
  cuanto: "¿Cuánto cuesta?",
  mas: "¿Quieres agregar algo?",
};

/** La pregunta de cada paso; con varios días la de la hora cambia: el horario del primer día vale para todos. */
const preguntaDe = (paso: Paso, r: Respuestas): string | undefined => (paso === "hora" && r.dias?.hasta ? "¿A qué hora, cada día?" : PREGUNTA[paso]);

type Interno = Props & {
  /** «Publicar otro»: el alta empieza de cero. */
  onOtro: () => void;
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
 * «Cartel guardado» sobre la primera. Las respuestas viven en `usePasosEvento`; lo que se publica viaja en un formulario escondido con los mismos campos que el
 * alta de siempre, que también es lo que mira la guardia de salida. Publicar aparta la guardia; si el servidor devuelve un error, vuelve,
 * y el error sale en «Revisa». Si publica, la pantalla no sale: se queda en «Publicado» (el formulario manda `quedarse`, y la acción
 * devuelve lo creado en vez de redirigir a la ficha). «Publicar otro» la vuelve a montar con otra `key`: respuestas, cartel, error y clave de
 * la operación empiezan de cero y la guardia de salida se arma de nuevo; los lugares que se guardaron en el camino se conservan aquí.
 */
export default function AltaEvento(props: Props) {
  const [vuelta, setVuelta] = useState(0);
  const [lugares, setLugares] = useState(props.lugares);
  const agregar = useCallback((nuevo: LugarResumen) => setLugares((actual) => (actual.some((l) => l.id === nuevo.id) ? actual : [...actual, nuevo])), []);
  return <AltaPorPasos key={vuelta} {...props} lugares={lugares} onLugarNuevo={agregar} onOtro={() => setVuelta((v) => v + 1)} />;
}

function AltaPorPasos({ accion, lugares, mios, ciudadContexto, salida, usuarioId, cartelActivo, cupo, onOtro, onLugarNuevo }: Interno) {
  const { r, candidato, paso, direccion, primero, primeraPregunta, cambiar, contestar, seguir, abrir, atras, elegir, confirmar, usar, publicado } = usePasosEvento(mios.length === 1 ? [{ id: mios[0].id, nombre: mios[0].nombre }] : []);
  // Lo escrito en «¿Dónde es?» vive aquí y no en el paso: al volver de «¿Es aquí?» (Atrás, «Buscar otro») la lista sigue ahí.
  const [busqueda, setBusqueda] = useState("");
  // Con cartel: se sube siempre y se lee si toca; lo leído rellena las respuestas y el flujo sigue en lo primero que falte (o en «Revisa»); sin
  // lectura, sigue la primera pregunta. Si el cartel nombra un sitio que no es del directorio, «¿Dónde es?» abre con ese nombre ya escrito.
  const cartel = useLeerCartel({
    usuarioId,
    servicio: cartelActivo,
    cupo,
    alGuardar: seguir,
    alLeer: (leido) => {
      const leidas = respuestasDelCartel(leido, r.quien);
      if (leidas.sitio?.modo === "otro") setBusqueda(leidas.sitio.otro.sitioTexto || leidas.sitio.otro.direccion || "");
      contestar(leidas);
    },
  });
  const ubicacion = useEstoyAqui();
  const [guardando, setGuardando] = useState(false);
  const [errorLugar, setErrorLugar] = useState<string | null>(null);
  // Lo que devolvió el servidor al publicar; con eso y las respuestas se arma la tarjeta de «Publicado».
  const [creado, setCreado] = useState<Creado | null>(null);
  const [resultado, enviar, enviando] = useActionState<ResultadoEvento | null, FormData>(async (previo, datos) => {
    const hecho = await accion(previo, datos);
    if (hecho.ok) {
      setCreado({ id: hecho.id, slug: hecho.slug ?? null, creadoEn: new Date().toISOString() });
      publicado();
    }
    return hecho;
  }, null);
  const operacion = useRef<ReturnType<typeof operacionEvento> | null>(null);
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const lugar = r.sitio.modo === "lugar" ? lugares.find((l) => l.id === r.sitio.lugarId) : undefined;
  // Un lugar del directorio ya tiene su punto confirmado: contesta sin pasar por el mapa.
  const elegirLugar = (l: LugarResumen) => contestar({ sitio: sitioDeLugar(l, r.sitio.otro) });
  // «Guardarlo como lugar»: crea el lugar con la acción de la hoja de siempre (si ya existe uno igual cerca, usa ese) y el sitio pasa a ser ese lugar.
  async function guardarLugar(c: Candidato) {
    if (guardando) return;
    setGuardando(true);
    setErrorLugar(null);
    try {
      const nombre = c.nombre.trim();
      const direccion = c.direccion.trim();
      const lugarCreado = await crearLugarDesdeEvento({ nombre, direccion, lat: c.punto.lat, lng: c.punto.lng, ciudad: ciudadParaPunto(c.punto, c.ciudad, ciudadContexto) ?? "", volverA: VOLVER_A, privado: false });
      if (!lugarCreado.ok) {
        setErrorLugar(NO_SE_GUARDO);
        return;
      }
      const nuevo = lugares.find((l) => l.id === lugarCreado.id) ?? { id: lugarCreado.id, nombre, tipo: deducirTipo(nombre, c.categorias) ?? "otro", direccion, lat: c.punto.lat, lng: c.punto.lng, portada: null };
      onLugarNuevo(nuevo);
      contestar({ sitio: sitioDeLugar(nuevo, r.sitio.otro) });
    } catch {
      setErrorLugar(NO_SE_GUARDO);
    } finally {
      setGuardando(false);
    }
  }
  const usarSitio = (uso: Uso) => (uso === "lugar" ? (candidato ? void guardarLugar(candidato) : undefined) : (setErrorLugar(null), usar(uso)));
  // Cambiar el sitio desde «Revisa» vuelve a «¿Dónde es?» con lo elegido puesto.
  const abrirPaso = (p: Paso) => {
    if (p === "donde") setBusqueda(nombreDelSitio(r.sitio, lugar));
    abrir(p);
  };
  // Las horas son las del sitio del evento: las del lugar, si es en uno; si no, las de la ciudad inicial (el servidor guarda en la del punto).
  const zona = zonaSegura(lugar?.zona);
  const falta = faltaParaPublicar(r);
  const atrasDelPaso = useCallback(() => atras(paso), [atras, paso]);

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
      paso={cartel.espera ? "espera" : paso}
      direccion={cartel.espera ? null : direccion}
      avance={avance(paso)}
      salida={salida}
      onAtras={primero ? undefined : atrasDelPaso}
      encima={!cartel.espera && primeraPregunta && PREGUNTA[paso] && cartel.subido && !cartel.subido.leido ? <CartelGuardado foto={cartel.subido.url} noPude={cartel.subido.noPude} /> : undefined}
      pregunta={cartel.espera ? undefined : preguntaDe(paso, r)}
      fijo={
        <form id={FORMULARIO} action={publicar} hidden>
          <input type="hidden" name="titulo" value={r.nombre} />
          <input type="hidden" name="inicio" value={inicioDe(r)} />
          <input type="hidden" name="fin" value={finDe(r) ?? ""} />
          {/* Solo con la casilla «Mismo horario todos los días» desmarcada: una sesión por día; sin ella el evento se guarda como siempre. */}
          {r.sesiones && <input type="hidden" name="sesiones" value={sesionesParaEnviar(r.sesiones)} />}
          <CamposSitio modo={r.sitio.modo} lugarId={r.sitio.lugarId} otro={r.sitio.otro} ciudadContexto={ciudadContexto} />
          <input type="hidden" name="gratis" value={r.costo === "gratis" ? "si" : "no"} />
          <input type="hidden" name="cooperacion" value={r.costo === "cooperacion" ? "si" : "no"} />
          <input type="hidden" name="precio" value={r.costo === "precio" ? r.precio : ""} />
          <input type="hidden" name="quien" value={JSON.stringify(r.quien)} />
          <input type="hidden" name="descripcion" value={r.descripcion} />
          <input type="hidden" name="enlace" value={r.enlace} />
          <input type="hidden" name="imagen" value={cartel.subido?.url ?? ""} />
          {/* Publicar no sale de la pantalla: la acción devuelve lo creado y el paso «Publicado» lo enseña. */}
          <input type="hidden" name="quedarse" value="1" />
        </form>
      }
    >
      {cartel.espera && <PasoEspera foto={cartel.miniatura} leyendo={cartel.espera === "leyendo"} />}
      {!cartel.espera && paso === "inicio" && <PasoInicio casilla={cartel.casilla} error={cartel.error} onElegir={cartel.elegir} onSinCartel={seguir} />}
      {paso === "nombre" && <PasoNombre nombre={r.nombre} onCambio={(nombre) => cambiar({ nombre })} onSeguir={seguir} />}
      {paso === "dia" && <PasoDia dias={r.dias} zona={zona} onElegir={(dias) => contestar({ dias })} />}
      {paso === "hora" && <PasoHora r={r} zona={zona} onInicio={(hora) => cambiar({ hora, fin: null })} onFin={(fin) => contestar({ fin })} onCambiar={cambiar} onSeguir={seguir} />}
      {paso === "donde" && (
        <PasoDonde
          q={busqueda}
          onBuscar={setBusqueda}
          lugares={lugares}
          contexto={contextoDondeEsta(null, busqueda, ciudadContexto, ubicacion.yo, ubicacionCercanaFresca())}
          ubicando={ubicacion.ubicando}
          avisoUbicacion={ubicacion.avisoUbicacion}
          onEstoyAqui={ubicacion.estoyAqui}
          onLugar={elegirLugar}
          onCandidato={elegir}
        />
      )}
      {paso === "mapa" && candidato && (
        <PasoMapa
          candidato={candidato}
          lugares={lugares}
          ciudad={ciudadContexto ?? CIUDAD_INICIAL}
          yo={ubicacion.yo}
          onLugar={elegirLugar}
          onConfirmar={confirmar}
          onOtro={atrasDelPaso}
        />
      )}
      {paso === "uso" && candidato && <PasoUso candidato={candidato} guardando={guardando} error={errorLugar} onUsar={usarSitio} />}
      {paso === "cuanto" && <PasoCuanto precio={r.precio} onCosto={(costo) => contestar({ costo })} onPrecio={(precio) => cambiar({ precio })} />}
      {paso === "revisa" && (
        <Revisa
          r={r}
          zona={zona}
          lugar={lugar}
          mios={mios}
          cartel={cartel.subido}
          errores={errores}
          general={resultado && !resultado.ok ? resultado.general : undefined}
          enviando={enviando}
          falta={falta}
          formulario={FORMULARIO}
          onAbrir={abrirPaso}
        />
      )}
      {paso === "mas" && <PasoMas r={r} mios={mios} ciudadContexto={ciudadContexto} errores={errores} onCambio={cambiar} onListo={seguir} />}
      {paso === "publicado" && creado && <Publicado evento={eventoPublicado(r, creado, { lugar, zona, imagen: cartel.subido?.url ?? null })} conCartel={!!cartel.subido} conSesiones={!!r.sesiones} onOtro={onOtro} />}
    </PorPasos>
  );
}
