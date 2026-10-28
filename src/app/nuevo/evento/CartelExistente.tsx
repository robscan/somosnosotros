"use client";

import { useId } from "react";
import { PiePaso } from "@/components/PorPasos";
import Boton from "@/components/ui/Boton";
import canon from "@/components/ui/FormularioCanon.module.css";
import Parecidos, { RenglonParecido } from "@/components/ui/Parecidos";
import { TEXTOS, type RespuestaParecido } from "@/lib/cartelExistente";
import { hrefEvento } from "@/lib/eventos";
import { renglonParecido, type EventoParecido } from "@/lib/eventosParecidos";
import { CartelLeido } from "./PasoCartel";

/**
 * «¿Es este?» con tu cartel (OL-467; prototipo firmado de OL-466, bitácora 498). Solo piezas que ya existen: la caja de siempre (`ui/Parecidos`
 * con `RenglonParecido`), el pie de `PorPasos` y `ui/Boton`. La respuesta principal va en el pie, un solo botón morado en pantalla (A1):
 * «Sí, es este: ponerle mi cartel» si el que ya está no tiene cartel; «Sí, es este: ir al evento» si ya tiene uno (B). Cambiar un cartel que ya
 * está va en la caja, en segundo plano, y solo para quien lo publicó o la administración; a los demás, apagado con «Solo quien lo publicó puede
 * cambiarlo.» (decisión 3 del founder). Con dos o más parecidos no hay respuesta principal: cada renglón abre su ficha (decisión 4).
 */

export const TEXTO_PARECIDOS = "Ya hay uno parecido ese día en el mismo sitio:";

/** Cambiar su cartel por el mío, en la caja, antes de «No, es otro» (solo si el que ya está tiene cartel). */
export function CambiarSuCartel({ respuesta, onCambiar, enviando }: { respuesta: RespuestaParecido | null; onCambiar: () => void; enviando: boolean }) {
  const nota = useId();
  if (respuesta?.tipo !== "ir") return null;
  if (respuesta.puedeCambiar) {
    return (
      <Boton type="button" variante="secundario" onClick={onCambiar} disabled={enviando}>
        {TEXTOS.cambiar}
      </Boton>
    );
  }
  return (
    <>
      <Boton type="button" variante="secundario" aria-disabled aria-describedby={nota}>
        {TEXTOS.cambiar}
      </Boton>
      <p id={nota} className={canon.notaBoton}>
        {TEXTOS.soloQuien}
      </p>
    </>
  );
}

/** El pie con la respuesta principal (y, encima, lo que no salió). */
export function PieRespuesta({ respuesta, onPoner, enviando, error }: { respuesta: RespuestaParecido; onPoner: () => void; enviando: boolean; error: string | null }) {
  return (
    <PiePaso>
      {error && (
        <p className="aviso-error" role="alert">
          {error}
        </p>
      )}
      {respuesta.tipo === "poner" ? (
        <Boton type="button" onClick={onPoner} disabled={enviando} aria-busy={enviando || undefined}>
          {enviando ? TEXTOS.poniendo : TEXTOS.poner}
        </Boton>
      ) : (
        // Lo que hoy hace tocar el renglón, dicho: abre su ficha en lugar del alta.
        <Boton href={hrefEvento(respuesta.parecido)} replace prefetch={false}>
          {TEXTOS.ir}
        </Boton>
      )}
    </PiePaso>
  );
}

/**
 * C2 · la pregunta en cuanto se lee el cartel, en la misma espera: el cartel de la persona se queda grande (ya sin latir), debajo la caja
 * «¿Es este?» con el renglón del que ya está y «No, es otro: seguir», y el pie con la respuesta principal. Con dos o más, sin pie.
 */
export function PreguntaAlLeer({ foto, parecidos, respuesta, onSeguir, onPoner, onCambiar, enviando, error }: { foto: string; parecidos: EventoParecido[]; respuesta: RespuestaParecido | null; onSeguir: () => void; onPoner: () => void; onCambiar: () => void; enviando: boolean; error: string | null }) {
  return (
    <>
      <CartelLeido foto={foto} />
      <Parecidos texto={TEXTO_PARECIDOS} conFoto onConfirmar={onSeguir} confirmar={TEXTOS.seguir} antes={<CambiarSuCartel respuesta={respuesta} onCambiar={onCambiar} enviando={enviando} />}>
        {parecidos.map((p) => (
          <RenglonParecido key={p.id} {...renglonParecido(p)} />
        ))}
      </Parecidos>
      {respuesta && <PieRespuesta respuesta={respuesta} onPoner={onPoner} enviando={enviando} error={error} />}
    </>
  );
}
