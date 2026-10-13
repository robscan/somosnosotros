"use client";

import { useContext, useSyncExternalStore } from "react";
import Hecho from "@/components/Hecho";
import { IconoCalendarioCancelado, IconoCalendarioOk } from "@/components/ui/Iconos";
import { CerrarMenu } from "@/components/ui/MenuAcciones";
import renglon from "@/components/ui/Renglon.module.css";
import { medirCliente } from "@/lib/medir";
import { marcarCancelado } from "../acciones";

/**
 * «Se canceló» (OL-391, pieza 2 del historial; regla firmada con el prototipo OL-389): un evento que ya pasó cuenta como realizado salvo que quien
 * lo gestiona diga que se canceló, de un toque desde el menú «···» de su ficha, sin diálogo. El menú se cierra, la ficha se vuelve a pintar ya
 * cancelada (chip «Se canceló») y abajo sale el aviso con Deshacer (`Hecho`, el de las listas); marcado, la fila dice «No se canceló».
 *
 * La fila vive dentro de la hoja del menú, que se desmonta al cerrarse: el aviso no puede ser suyo. Los dos se hablan por un estado de módulo (una
 * ficha a la vez) y el aviso (`AvisoCancelado`) está en la ficha, fuera del menú.
 */

type Hecho = { eventoId: string; cancelado: boolean; fallo: boolean; clave: number } | null;
let hecho: Hecho = null;
const oyentes = new Set<() => void>();
function poner(h: Hecho) {
  hecho = h;
  for (const oyente of oyentes) oyente();
}
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

/** Guarda la marca; con `avisar`, el aviso dice lo hecho (Deshacer no avisa otra vez: el aviso ya se fue). Si no se pudo, el aviso lo dice siempre. */
async function cambiar(eventoId: string, cancelado: boolean, avisar = true) {
  const r = await marcarCancelado(eventoId, cancelado).catch(() => null);
  if (r?.ok) {
    medirCliente("cancelar", { que: cancelado ? "marcar" : "deshacer" });
    if (avisar) poner({ eventoId, cancelado, fallo: false, clave: Date.now() });
  } else poner({ eventoId, cancelado, fallo: true, clave: Date.now() });
}

/** La fila del menú «···»: «Se canceló» o, si ya lo está, «No se canceló». */
export default function RenglonCancelado({ eventoId, cancelado }: { eventoId: string; cancelado: boolean }) {
  const cerrar = useContext(CerrarMenu);
  return (
    <li>
      <button
        type="button"
        className={renglon.ajuste}
        onClick={() => {
          cerrar();
          void cambiar(eventoId, !cancelado);
        }}
      >
        {cancelado ? <IconoCalendarioOk width={20} height={20} /> : <IconoCalendarioCancelado width={20} height={20} />}
        <b>{cancelado ? "No se canceló" : "Se canceló"}</b>
        <small>{cancelado ? "Sí ocurrió: vuelve a contar en el historial" : "No ocurrió: se queda tachado y no cuenta"}</small>
      </button>
    </li>
  );
}

/** El aviso de lo hecho, en la ficha (fuera del menú): «Marcado: se canceló» con Deshacer; si no se pudo guardar, con Reintentar. */
export function AvisoCancelado({ eventoId }: { eventoId: string }) {
  const h = useSyncExternalStore(suscribir, () => hecho, () => null);
  if (!h || h.eventoId !== eventoId) return null;
  const texto = h.fallo ? "No se pudo guardar. Revisa tu conexión." : h.cancelado ? "Marcado: se canceló. Ya no cuenta en el historial." : "Marcado: sí ocurrió. Cuenta en el historial.";
  return (
    <Hecho
      key={h.clave}
      texto={texto}
      fallo={h.fallo}
      etiqueta={h.fallo ? "Reintentar" : "Deshacer"}
      onDeshacer={() => void cambiar(eventoId, h.fallo ? h.cancelado : !h.cancelado, h.fallo)}
      onCerrar={() => poner(null)}
    />
  );
}
