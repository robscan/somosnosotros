"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import PorPasos from "@/components/PorPasos";
import { crearLugarDesdeEvento } from "@/app/lugares/acciones";
import type { ResultadoEvento } from "@/app/eventos/acciones";
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
import { ubicacionCercanaFresca } from "@/lib/ubicacion";
import { avance, faltaParaPublicar, inicioDe, nombreDelSitio, sitioDeLugar, type Candidato, type Paso, type Uso } from "./pasos";
import { PasoDonde, PasoMapa, PasoUso } from "./PasosDonde";
import { PasoCuanto, PasoDia, PasoHora, PasoInicio, PasoMas, PasoNombre } from "./PasosEvento";
import Revisa from "./Revisa";
import { usePasosEvento } from "./usePasosEvento";

type Props = {
  /** La acción de siempre del alta de evento (`crearEvento`): mismos campos, mismas validaciones; al publicar lleva a la ficha. */
  accion: (previo: ResultadoEvento | null, formData: FormData) => Promise<ResultadoEvento>;
  lugares: LugarResumen[];
  /** Artistas ligados a mi cuenta: si es uno solo, Quién ya viene con él (como en el alta de siempre, decisión 12). */
  mios: ArtistaResumen[];
  /** La ciudad desde la que se entró: una pista más para buscar el sitio. */
  ciudadContexto: Ciudad | null;
  /** A dónde sale la ✕ si no hay pantalla anterior. */
  salida: { href: string; texto: string };
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

/**
 * El alta de evento por pasos, camino «No tengo cartel» (OL-300; prototipo firmado `publicar-por-pasos.html`, bitácora 323): ¿Cómo se
 * llama? → ¿Qué día es? → ¿A qué hora? → ¿Dónde es? (con «¿Es aquí?» y «No está en el directorio» si el sitio no es del directorio,
 * OL-301) → ¿Cuánto cuesta? → Revisa → Publicar. Las respuestas viven en `usePasosEvento`; lo que se publica viaja en un formulario escondido con los mismos campos que el alta de siempre,
 * que también es lo que mira la guardia de salida. Publicar aparta la guardia; si el servidor devuelve un error, vuelve, y el error sale
 * en «Revisa».
 */
export default function AltaEvento({ accion, lugares, mios, ciudadContexto, salida }: Props) {
  const { r, candidato, paso, direccion, primero, cambiar, contestar, seguir, abrir, atras, elegir, confirmar, usar } = usePasosEvento(mios.length === 1 ? [{ id: mios[0].id, nombre: mios[0].nombre }] : []);
  const ubicacion = useEstoyAqui();
  // Un lugar que se guarda desde «No está en el directorio» aún no está en la lista que trajo el servidor: se agrega aquí.
  const [listaLugares, setListaLugares] = useState(lugares);
  const [guardando, setGuardando] = useState(false);
  const [errorLugar, setErrorLugar] = useState<string | null>(null);
  // Lo escrito en «¿Dónde es?» vive aquí y no en el paso: al volver de «¿Es aquí?» (Atrás, «Buscar otro») la lista sigue ahí.
  const [busqueda, setBusqueda] = useState("");
  const [resultado, enviar, enviando] = useActionState<ResultadoEvento | null, FormData>(accion, null);
  const operacion = useRef<ReturnType<typeof operacionEvento> | null>(null);
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const lugar = r.sitio.modo === "lugar" ? listaLugares.find((l) => l.id === r.sitio.lugarId) : undefined;
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
      const creado = await crearLugarDesdeEvento({ nombre, direccion, lat: c.punto.lat, lng: c.punto.lng, ciudad: ciudadParaPunto(c.punto, c.ciudad, ciudadContexto) ?? "", volverA: VOLVER_A, privado: false });
      if (!creado.ok) {
        setErrorLugar(NO_SE_GUARDO);
        return;
      }
      const nuevo = listaLugares.find((l) => l.id === creado.id) ?? { id: creado.id, nombre, tipo: deducirTipo(nombre, c.categorias) ?? "otro", direccion, lat: c.punto.lat, lng: c.punto.lng, portada: null };
      setListaLugares((actual) => (actual.some((l) => l.id === nuevo.id) ? actual : [...actual, nuevo]));
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
      paso={paso}
      direccion={direccion}
      avance={avance(paso)}
      salida={salida}
      onAtras={primero ? undefined : atrasDelPaso}
      pregunta={PREGUNTA[paso]}
      fijo={
        <form id={FORMULARIO} action={publicar} hidden>
          <input type="hidden" name="titulo" value={r.nombre} />
          <input type="hidden" name="inicio" value={inicioDe(r)} />
          <input type="hidden" name="fin" value={r.fin ?? ""} />
          <CamposSitio modo={r.sitio.modo} lugarId={r.sitio.lugarId} otro={r.sitio.otro} ciudadContexto={ciudadContexto} />
          <input type="hidden" name="gratis" value={r.costo === "gratis" ? "si" : "no"} />
          <input type="hidden" name="cooperacion" value={r.costo === "cooperacion" ? "si" : "no"} />
          <input type="hidden" name="precio" value={r.costo === "precio" ? r.precio : ""} />
          <input type="hidden" name="quien" value={JSON.stringify(r.quien)} />
          <input type="hidden" name="descripcion" value={r.descripcion} />
          <input type="hidden" name="enlace" value={r.enlace} />
          <input type="hidden" name="imagen" value="" />
        </form>
      }
    >
      {paso === "inicio" && <PasoInicio onSinCartel={seguir} />}
      {paso === "nombre" && <PasoNombre nombre={r.nombre} onCambio={(nombre) => cambiar({ nombre })} onSeguir={seguir} />}
      {paso === "dia" && <PasoDia dias={r.dias} zona={zona} onElegir={(dias) => contestar({ dias })} />}
      {paso === "hora" && <PasoHora r={r} zona={zona} onInicio={(hora) => cambiar({ hora, fin: null })} onFin={(fin) => contestar({ fin })} />}
      {paso === "donde" && (
        <PasoDonde
          q={busqueda}
          onBuscar={setBusqueda}
          lugares={listaLugares}
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
          lugares={listaLugares}
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
          errores={errores}
          general={resultado && !resultado.ok ? resultado.general : undefined}
          enviando={enviando}
          falta={falta}
          formulario={FORMULARIO}
          onAbrir={abrirPaso}
        />
      )}
      {paso === "mas" && <PasoMas r={r} mios={mios} ciudadContexto={ciudadContexto} errores={errores} onCambio={cambiar} onListo={seguir} />}
    </PorPasos>
  );
}
