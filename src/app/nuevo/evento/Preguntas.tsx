"use client";

import { useEstoyAqui } from "@/app/eventos/useEstoyAqui";
import type { ArtistaResumen } from "@/lib/artistas";
import { CIUDAD_INICIAL, type Ciudad } from "@/lib/ciudad";
import type { ErroresEvento } from "@/lib/eventos";
import type { Franja } from "@/lib/horarioLugar";
import { contextoDondeEsta } from "@/lib/hojaDonde";
import type { LugarResumen } from "@/lib/lugares";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";
import { PasoDonde, PasoMapa, PasoUso } from "./PasosDonde";
import { PasoCuanto, PasoDia, PasoHora, PasoMas, PasoNombre } from "./PasosEvento";
import { PasoPrograma, PasoSesiones, PasoVisita } from "./PasosClase";
import { claseElegida, clasesALaVista, nombreDelSitio } from "./pasos";
import type { usePasosEvento } from "./usePasosEvento";
import type { useSitioPorPasos } from "./useSitioPorPasos";

type Props = {
  pasos: ReturnType<typeof usePasosEvento>;
  sitio: ReturnType<typeof useSitioPorPasos>;
  ubicacion: ReturnType<typeof useEstoyAqui>;
  /** La zona de las horas: la del sitio del evento. */
  zona: string;
  lugares: LugarResumen[];
  mios: ArtistaResumen[];
  ciudadContexto: Ciudad | null;
  errores: ErroresEvento;
  /** El horario de cada lugar del directorio (OL-321): la casilla «Horario del lugar» de una exposición. */
  horarios?: Record<string, Franja[]>;
  /** Los chips de la clase bajo el nombre (OL-345): en el alta. Editar no los lleva: entra por «Revisa», donde la clase se cambia con sus reglas
   *  (un festival con actividades no deja de serlo). */
  clases?: boolean;
};

/**
 * Las preguntas de un evento, una por pantalla (prototipo firmado `publicar-por-pasos.html`, bitácora 323): el nombre, el día, la hora (con el
 * horario por día de OL-311), los tres pasos de «Dónde» (OL-301), cuánto cuesta y lo opcional. Las comparten el alta (`AltaEvento`) y editar
 * (`EditarEvento`, OL-319): en el alta se recorren; al editar, cada una se abre desde «Revisa» y vuelve a ella. Pinta solo la del paso a la
 * vista; los demás pasos (el cartel, «Revisa», «Publicado») los pinta cada pantalla.
 */
export default function Preguntas({ pasos, sitio, ubicacion, zona, lugares, mios, ciudadContexto, errores, horarios = {}, clases = false }: Props) {
  const { r, candidato, paso, cambiar, contestar, seguir, elegir, confirmar, atras, sedeDeActo } = pasos;
  switch (paso) {
    case "nombre":
      return <PasoNombre nombre={r.nombre} clase={clases && clasesALaVista(r) ? r.clase : null} onCambio={(nombre) => cambiar({ nombre })} onClase={(clase) => cambiar(claseElegida(clase))} onSeguir={seguir} />;
    case "dia":
      return <PasoDia dias={r.dias} zona={zona} onElegir={(dias) => contestar({ dias })} />;
    case "hora":
      return <PasoHora r={r} zona={zona} onInicio={(hora) => cambiar({ hora, fin: null })} onFin={(fin) => contestar({ fin })} onCambiar={cambiar} onSeguir={seguir} />;
    // Cómo ocurre (OL-321): el paso del tiempo de una exposición, de un taller y de un festival.
    case "visita":
      return <PasoVisita visita={r.visita} zona={zona} horarioLugar={sitio.lugar ? (horarios[sitio.lugar.id] ?? []) : []} horario={r.horario} onVisita={(visita) => cambiar({ visita })} onHorario={(horario) => cambiar({ horario })} onSeguir={seguir} />;
    case "sesiones":
      return <PasoSesiones r={r} zona={zona} onCambiar={cambiar} onSeguir={seguir} />;
    case "programa":
      return (
        <PasoPrograma
          r={r}
          zona={zona}
          lugares={lugares}
          mios={mios}
          ciudadContexto={ciudadContexto}
          onCambiar={cambiar}
          onSede={(acto) => {
            // «¿Dónde es?» abre con lo que se sabe de esa sede: la elegida, o lo que dijo el cartel.
            const lugar = acto.sitio.modo === "lugar" ? lugares.find((l) => l.id === acto.sitio.lugarId) : undefined;
            sitio.setBusqueda(nombreDelSitio(acto.sitio, lugar) || acto.sedeLeida);
            sedeDeActo(acto.clave);
          }}
          onSeguir={seguir}
        />
      );
    case "donde":
      return (
        <PasoDonde
          q={sitio.busqueda}
          onBuscar={sitio.setBusqueda}
          lugares={lugares}
          contexto={contextoDondeEsta(null, sitio.busqueda, ciudadContexto, ubicacion.yo, ubicacionCercanaFresca())}
          ubicando={ubicacion.ubicando}
          avisoUbicacion={ubicacion.avisoUbicacion}
          onEstoyAqui={ubicacion.estoyAqui}
          onLugar={sitio.elegirLugar}
          onCandidato={elegir}
        />
      );
    case "mapa":
      return candidato ? <PasoMapa candidato={candidato} lugares={lugares} ciudad={ciudadContexto ?? CIUDAD_INICIAL} yo={ubicacion.yo} onLugar={sitio.elegirLugar} onConfirmar={confirmar} onOtro={() => atras("mapa")} /> : null;
    case "uso":
      return candidato ? <PasoUso candidato={candidato} guardando={sitio.guardando} error={sitio.errorLugar} onUsar={sitio.usarSitio} /> : null;
    case "cuanto":
      return <PasoCuanto precio={r.precio} onCosto={(costo) => contestar({ costo })} onPrecio={(precio) => cambiar({ precio })} />;
    case "mas":
      return <PasoMas r={r} mios={mios} ciudadContexto={ciudadContexto} errores={errores} onCambio={cambiar} onListo={seguir} />;
    default:
      return null;
  }
}
