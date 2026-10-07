"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import CampoImagenUrl from "@/components/CampoImagenUrl";
import PorPasos from "@/components/PorPasos";
import { useTerminar } from "@/components/ui/Atras";
import type { Cupo, ResultadoEvento } from "@/app/eventos/acciones";
import { operacionEvento } from "@/app/eventos/operacionEvento";
import { useEstoyAqui } from "@/app/eventos/useEstoyAqui";
import type { ArtistaResumen } from "@/lib/artistas";
import type { Ciudad } from "@/lib/ciudad";
import { apartarGuardia, reponerGuardia } from "@/lib/guardiaSalida";
import type { LugarResumen } from "@/lib/lugares";
import CamposEvento from "./CamposEvento";
import { respuestasDelCartel } from "./cartelPorPasos";
import { faltaParaPublicar, preguntaDe, type Respuestas } from "./pasos";
import { PasoEspera, PasoInicio } from "./PasoCartel";
import Preguntas from "./Preguntas";
import Revisa from "./Revisa";
import { useLeerCartel } from "./useLeerCartel";
import { usePasosEvento } from "./usePasosEvento";
import { useSitioPorPasos } from "./useSitioPorPasos";
import { useZonaDelSitio } from "./useZonaDelSitio";

type Props = {
  /** `actualizarEvento` con el id del evento: devuelve a dónde volver (la ficha). */
  accion: (previo: ResultadoEvento | null, formData: FormData) => Promise<ResultadoEvento>;
  /** El evento como respuestas del flujo (`respuestasAlEditar`): con eso se entra en «Revisa». */
  respuestas: Respuestas;
  /** El cartel que ya tiene el evento; null si no tiene. */
  imagen: string | null;
  /** La versión del evento que se abrió (`actualizado_en`): si cambió mientras se editaba, no se pisa. */
  revision: string;
  /** La zona guardada del evento y la del punto de su sitio (la calcula el servidor), para leer las horas en la misma que al guardar. */
  zonaEvento: string;
  zonaSitio: string;
  lugares: LugarResumen[];
  /** Artistas ligados a mi cuenta: Quién los marca «tú». */
  mios: ArtistaResumen[];
  ciudadContexto: Ciudad | null;
  /** La ficha del evento: a donde sale la ✕ y el enlace a la versión de ahora si hubo un conflicto. */
  ficha: string;
  /** Quien edita: la carpeta de Storage donde sube el cartel nuevo. */
  usuarioId: string;
  /** La administración puede pegar la dirección de una imagen (eventos importados). */
  esAdmin: boolean;
  /** Si el servidor puede leer carteles; sin servicio el cartel nuevo se sube sin la casilla «Lectura automática». */
  cartelActivo: boolean;
  cupo: Cupo | null;
};

const FORMULARIO = "editar-evento";

/**
 * Editar un evento por pasos (OL-319; punto 2 del orden firmado por el founder: «editar evento por pasos (incluye horario por día)»). No se
 * vuelven a recorrer las preguntas: se entra directo en «Revisa» con todo el evento puesto y cada renglón abre la pregunta de siempre del alta
 * (`Preguntas`), que al contestarse vuelve aquí. Lo que cambia respecto al alta: la barra dice «Editar evento» y no hay línea de avance; el
 * botón dice «Guardar cambios» (y lo que falta, si algo falta); la ✕ vuelve a la ficha sin preguntar si nada cambió y, con cambios, con
 * «¿Salir sin guardar?»; al guardar vuelve a la ficha (`useTerminar`), sin pantalla «Publicado»; el evento que cambió mientras se editaba no
 * se pisa (la versión, `revision`) y el error enlaza la versión de ahora. El cartel se cambia, se pone o se quita desde «Revisa»: el paso del
 * cartel del alta, con la casilla «Lectura automática» desmarcada de entrada (lo puesto no se pisa sin pedirlo) y «Quitar el cartel» en vez de
 * «No tengo cartel»; la administración puede pegar la dirección de una imagen. El horario por día se ajusta igual que en el alta y se guarda en
 * la misma transacción que el evento (`editar_evento_con_sesiones`).
 */
export default function EditarEvento({ accion, respuestas, imagen, revision, zonaEvento, zonaSitio, lugares: iniciales, mios, ciudadContexto, ficha, usuarioId, esAdmin, cartelActivo, cupo }: Props) {
  const [lugares, setLugares] = useState(iniciales);
  const agregar = useCallback((nuevo: LugarResumen) => setLugares((actual) => (actual.some((l) => l.id === nuevo.id) ? actual : [...actual, nuevo])), []);
  const pasos = usePasosEvento([], null, respuestas);
  const { r, paso, direccion, primero, contestar, seguir, atras, abrir } = pasos;
  const sitio = useSitioPorPasos({ pasos, lugares, ciudadContexto, onLugarNuevo: agregar });
  // Un cartel nuevo se sube siempre; se lee solo si se marca la casilla. Lo leído cambia lo que el cartel dice (y se revisa en «Revisa», con su
  // sello); lo que no dice no se toca, y un cartel que no nombra artistas no le quita al evento los suyos.
  const cartel = useLeerCartel({
    usuarioId,
    servicio: cartelActivo,
    cupo,
    inicial: imagen,
    marcada: false,
    alGuardar: seguir,
    alLeer: (leido) => {
      const { quien, ...leidas } = respuestasDelCartel(leido, r.quien);
      if (leidas.sitio?.modo === "otro") sitio.setBusqueda(leidas.sitio.otro.sitioTexto || leidas.sitio.otro.direccion || "");
      contestar(leido.quien.length ? { ...leidas, quien } : leidas);
    },
  });
  const ubicacion = useEstoyAqui();
  const zona = useZonaDelSitio(r.sitio, sitio.lugar, { zonaEvento, zonaSitio });

  const [resultado, enviar, enviando] = useActionState<ResultadoEvento | null, FormData>(accion, null);
  // Guardado: la tarea termina sin quedarse en el historial (vuelve a la ficha); mientras vuelve, el botón sigue ocupado.
  const terminar = useTerminar();
  const terminado = resultado?.ok === true;
  useEffect(() => {
    if (resultado?.ok) terminar(resultado.volver);
  }, [resultado, terminar]);
  // Si el servidor no guardó, los cambios siguen en pantalla y la guardia que apartó «Guardar cambios» vuelve (OL-296).
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);
  const operacion = useRef<ReturnType<typeof operacionEvento> | null>(null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const falta = faltaParaPublicar(r);
  const atrasDelPaso = useCallback(() => atras(paso), [atras, paso]);

  function guardar(fd: FormData) {
    if (falta) return;
    // Un reintento con los mismos datos conserva su clave: el servidor no guarda dos veces.
    operacion.current = operacionEvento(fd, operacion.current);
    fd.set("operacion", operacion.current.id);
    apartarGuardia();
    enviar(fd);
  }
  const quitarCartel = () => {
    cartel.quitar();
    seguir();
  };

  return (
    <PorPasos
      titulo="Editar evento"
      paso={cartel.espera ? "espera" : paso}
      direccion={cartel.espera ? null : direccion}
      avance={0}
      salida={{ href: ficha, texto: "Volver al evento" }}
      onAtras={primero ? undefined : atrasDelPaso}
      pregunta={cartel.espera ? undefined : preguntaDe(paso, r)}
      guardia="guardar"
      fijo={
        <form id={FORMULARIO} action={guardar} hidden>
          <input type="hidden" name="revision" value={revision} />
          <CamposEvento r={r} ciudadContexto={ciudadContexto} imagen={cartel.subido?.url ?? null} />
        </form>
      }
    >
      {cartel.espera && <PasoEspera foto={cartel.miniatura} leyendo={cartel.espera === "leyendo"} />}
      {!cartel.espera && paso === "inicio" && (
        <PasoInicio casilla={cartel.casilla} error={cartel.error} onElegir={cartel.elegir} onSinCartel={quitarCartel} sinCartel={cartel.subido ? "Quitar el cartel" : null}>
          {esAdmin && <CampoImagenUrl valor={cartel.subido?.url ?? null} onCambio={cartel.poner} />}
        </PasoInicio>
      )}
      <Preguntas pasos={pasos} sitio={sitio} ubicacion={ubicacion} zona={zona} lugares={lugares} mios={mios} ciudadContexto={ciudadContexto} errores={errores} />
      {paso === "revisa" && (
        <Revisa
          r={r}
          zona={zona}
          lugar={sitio.lugar}
          mios={mios}
          cartel={cartel.subido}
          errores={errores}
          general={resultado && !resultado.ok ? resultado.general : undefined}
          enviando={enviando || terminado}
          falta={falta}
          formulario={FORMULARIO}
          onAbrir={sitio.abrirPaso}
          editar={{ onCartel: () => abrir("inicio"), conflicto: resultado && !resultado.ok && resultado.conflicto ? ficha : undefined }}
        />
      )}
    </PorPasos>
  );
}
