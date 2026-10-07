"use client";

import { useActionState, useCallback, useEffect, useReducer, useState } from "react";
import PorPasos from "@/components/PorPasos";
import HojaCiudad from "@/app/artistas/HojaCiudad";
import { HojaHorario } from "@/app/lugares/Horario";
import type { ResultadoLugar } from "@/app/lugares/acciones";
import { useEstoyAqui } from "@/app/eventos/useEstoyAqui";
import { enlaceAltaDeTipo, enlaceAltaEvento } from "@/lib/armazon";
import { ciudadParaPunto, type Ciudad, type CiudadConDatos } from "@/lib/ciudad";
import { apartarGuardia, reponerGuardia } from "@/lib/guardiaSalida";
import { contextoDondeEsta } from "@/lib/hojaDonde";
import { horarioParaEnviar } from "@/lib/horarioLugar";
import { medirCliente } from "@/lib/medir";
import type { LugarResumen } from "@/lib/lugares";
import { ubicacionCercanaFresca } from "@/lib/ubicacion";
import TiraTipos from "../TiraTipos";
import { avance, estadoInicial, faltaParaPublicar, flujo, pasoActual, type Arranque, type Paso, type Respuestas } from "./pasos";
import { PasoMas, PasoNombre, PasoOtro, PasoTipo, PasoUbicar } from "./PasosLugar";
import Publicado from "./Publicado";
import Revisa from "./Revisa";

type Props = {
  /** La acción del alta de lugar (`crearLugar`): con `quedarse`, devuelve lo creado sin salir de la pantalla. */
  accion: (previo: ResultadoLugar | null, formData: FormData) => Promise<ResultadoLugar>;
  /** Los lugares del directorio: «Ya tiene ficha» al escribir el nombre y «¿Es este?» en el mapa. */
  lugares: LugarResumen[];
  /** La ciudad desde la que se entró (o San Luis Potosí): acerca la búsqueda y, a menos de 50 km, es la del lugar si el mapa no la dice. */
  ciudadContexto: Ciudad;
  /** La ciudad que venía en la dirección (`?ciudad=`), tal cual: la llevan los enlaces de la tira. */
  conCiudad: string | null;
  /** Las ciudades con lugares, para elegir una cuando ni el mapa ni la de contexto la dan. */
  ciudades: CiudadConDatos[];
  /** Quien registra: la carpeta de Storage de la foto. */
  usuarioId: string;
  /** La administración ve también la dirección de una imagen y «Solo yo lo veo». */
  esAdmin: boolean;
  /** Con qué se abre: el nombre que se buscó y el punto donde se sostuvo el dedo en Lugares. */
  arranque: Arranque;
};

const FORMULARIO = "registrar-lugar";
const SALIDA = { href: "/lugares", texto: "Lugares" };
const PREGUNTA: Partial<Record<Paso, string>> = { nombre: "¿Cómo se llama?", tipo: "¿Qué tipo de lugar es?", otro: "¿Qué es?", mas: "¿Quieres agregar algo?" };

/** Lo que el servidor devolvió al publicar. */
type Creado = { id: string; slug: string | null };

/**
 * El alta de lugar por pasos (OL-315; prototipo firmado `lugar-artista-por-pasos.html`, casos 1 a 4, y su acta, bitácora 342): ¿Cómo se llama?
 * (con las sugerencias del mapa y «Ya tiene ficha») → confirmar en el mapa, siempre («¿Es aquí?» o «¿Dónde está?») → ¿Qué tipo de lugar es?
 * (solo si nada lo dijo) → Revisa (con el horario y lo opcional) → Publicado. El mismo armazón que el alta de evento (`PorPasos`): una pregunta
 * por pantalla, Atrás que conserva lo contestado, pie que dice qué falta y se queda sobre el teclado, guardia de salida. Las respuestas viven
 * en el reductor de `pasos.ts`; lo que se publica viaja en un formulario escondido con los campos del alta de siempre (`crearLugar`), más el
 * horario y `quedarse`, y es lo que mira la guardia. Publicar aparta la guardia; si el servidor devuelve un error, vuelve y el error sale en
 * «Revisa». La ciudad es la del mapa; si el mapa no la da, la de contexto a menos de 50 km; si tampoco, «Revisa» la pide en su renglón: nunca
 * San Luis Potosí en silencio. «Publicar otro» vuelve a montar el alta con otra `key`: todo vacío y la guardia de nuevo.
 */
export default function AltaLugar(props: Props) {
  const [vuelta, setVuelta] = useState(0);
  return <AltaPorPasos key={vuelta} {...props} arranque={vuelta === 0 ? props.arranque : {}} onOtro={() => setVuelta((v) => v + 1)} />;
}

function AltaPorPasos({ accion, lugares, ciudadContexto, conCiudad, ciudades, usuarioId, esAdmin, arranque, onOtro }: Props & { onOtro: () => void }) {
  const [estado, despachar] = useReducer(flujo, arranque, estadoInicial);
  const { r, candidato } = estado;
  const paso = pasoActual(estado);
  const cambiar = useCallback((cambios: Partial<Respuestas>) => despachar({ tipo: "cambiar", cambios }), []);
  const atras = useCallback(() => despachar({ tipo: "atras", desde: paso }), [paso]);
  const abrir = (p: Paso) => despachar({ tipo: "abrir", paso: p });
  const ubicacion = useEstoyAqui();
  const [hoja, setHoja] = useState<"horario" | "ciudad" | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [creado, setCreado] = useState<Creado | null>(null);
  const [resultado, enviar, enviando] = useActionState<ResultadoLugar | null, FormData>(async (previo, datos) => {
    const hecho = await accion(previo, datos);
    if (hecho.ok) {
      setCreado({ id: hecho.id, slug: hecho.slug ?? null });
      medirCliente("lugar_creado", { desde: "alta" });
      despachar({ tipo: "publicado" });
    }
    return hecho;
  }, null);
  useEffect(() => {
    if (resultado && !resultado.ok) reponerGuardia();
  }, [resultado]);
  const errores = resultado && !resultado.ok ? resultado.errores : {};

  // La ciudad: la del mapa; si no, la de contexto si el punto cae a menos de 50 km; si tampoco, la que se elija en «Revisa».
  const deducida = r.sitio ? ciudadParaPunto(r.sitio.punto, r.sitio.ciudad, ciudadContexto) : null;
  const ciudad = deducida ?? (r.ciudad || null);
  const falta = faltaParaPublicar(r, ciudad);
  const contexto = contextoDondeEsta(r.sitio?.punto ?? null, r.nombre, ciudadContexto, ubicacion.yo, ubicacionCercanaFresca());

  function publicar(fd: FormData) {
    if (falta) return;
    apartarGuardia();
    enviar(fd);
  }

  return (
    <PorPasos
      titulo={paso === "revisa" ? "Revisa" : "Registrar un lugar"}
      paso={paso}
      direccion={estado.direccion}
      avance={avance(paso)}
      salida={SALIDA}
      onAtras={estado.pila.length > 1 ? atras : undefined}
      pregunta={paso === "mapa" ? (candidato ? "¿Es aquí?" : "¿Dónde está?") : PREGUNTA[paso]}
      fijo={
        <form id={FORMULARIO} action={publicar} hidden>
          <input type="hidden" name="nombre" value={r.nombre} />
          <input type="hidden" name="tipo" value={r.tipo ?? ""} />
          <input type="hidden" name="detalle" value={r.tipo === "otro" ? r.detalle : ""} />
          <input type="hidden" name="direccion" value={r.sitio?.direccion ?? ""} />
          <input type="hidden" name="lat" value={r.sitio?.punto.lat ?? ""} />
          <input type="hidden" name="lng" value={r.sitio?.punto.lng ?? ""} />
          <input type="hidden" name="ciudad" value={ciudad ?? ""} />
          <input type="hidden" name="horario" value={horarioParaEnviar(r.horario)} />
          <input type="hidden" name="descripcion" value={r.descripcion} />
          <input type="hidden" name="enlaces" value={JSON.stringify(r.redes)} />
          <input type="hidden" name="portada" value={r.portada ?? ""} />
          <input type="hidden" name="privado" value={r.privado ? "1" : ""} />
          <input type="hidden" name="confirmado" value={confirmado ? "1" : ""} />
          <input type="hidden" name="quedarse" value="1" />
        </form>
      }
    >
      {paso === "nombre" && (
        <PasoNombre
          nombre={r.nombre}
          lugares={lugares}
          contexto={contexto}
          tira={<TiraTipos actual="lugar" enPie destinos={{ evento: enlaceAltaEvento({ ciudad: conCiudad }), artista: enlaceAltaDeTipo("artista", conCiudad) }} />}
          onNombre={(nombre) => despachar({ tipo: "nombrar", nombre })}
          onSugerencia={(c) => despachar({ tipo: "sugerencia", candidato: c })}
          onSeguir={() => despachar({ tipo: "seguir" })}
        />
      )}
      {paso === "mapa" && (
        <PasoUbicar
          nombre={r.nombre}
          esAqui={!!candidato}
          inicial={r.sitio ?? (candidato && { punto: candidato.punto, direccion: candidato.direccion, ciudad: candidato.ciudad })}
          lugares={lugares}
          ciudad={ciudadContexto}
          contexto={contexto}
          yo={ubicacion.yo}
          ubicando={ubicacion.ubicando}
          avisoUbicacion={ubicacion.avisoUbicacion}
          onEstoyAqui={ubicacion.estoyAqui}
          onListo={(sitio) => despachar({ tipo: "ubicar", sitio })}
          onOtro={atras}
        />
      )}
      {paso === "tipo" && <PasoTipo onElegir={(valor) => despachar({ tipo: "tipo", valor })} />}
      {paso === "otro" && <PasoOtro detalle={r.detalle} error={errores.detalle} onCambio={(detalle) => cambiar({ detalle })} onSeguir={() => despachar({ tipo: "seguir" })} />}
      {paso === "revisa" && (
        <Revisa
          r={r}
          ciudad={ciudad}
          pedirCiudad={!!r.sitio && !deducida}
          errores={errores}
          general={resultado && !resultado.ok ? resultado.general : undefined}
          parecidos={resultado && !resultado.ok && !confirmado ? resultado.parecidos : undefined}
          enviando={enviando}
          falta={falta}
          formulario={FORMULARIO}
          onAbrir={abrir}
          onHorario={() => setHoja("horario")}
          onCiudad={() => setHoja("ciudad")}
          onConfirmar={() => setConfirmado(true)}
        />
      )}
      {paso === "mas" && <PasoMas r={r} usuarioId={usuarioId} esAdmin={esAdmin} errores={errores} onCambio={cambiar} onListo={() => despachar({ tipo: "seguir" })} />}
      {paso === "publicado" && creado && r.tipo && (
        <Publicado lugar={{ id: creado.id, slug: creado.slug, nombre: r.nombre.trim(), tipo: r.tipo, direccion: r.sitio?.direccion || null, portada: r.portada, privado: r.privado }} onOtro={onOtro} />
      )}
      {hoja === "horario" && (
        <HojaHorario
          franjas={r.horario}
          onListo={(horario) => {
            cambiar({ horario });
            setHoja(null);
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
      {hoja === "ciudad" && <HojaCiudad ciudad={r.ciudad} ciudades={ciudades} que="lugares" onElegir={(c) => cambiar({ ciudad: c })} onCerrar={() => setHoja(null)} />}
    </PorPasos>
  );
}
