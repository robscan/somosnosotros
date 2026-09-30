import type { ReactNode } from "react";
import Boton from "./Boton";
import canon from "./FormularioCanon.module.css";

/**
 * El botón que publica o guarda un formulario, con la única nota que dice qué falta (doc 50, H-32; canon de los formularios). Mientras
 * algo falte va apagado con `aria-disabled` -se llega a él y el lector de pantalla lee el motivo (`aria-describedby`)- y no envía
 * nada (es un botón que no manda, no un `submit`); al completar la nota se va y el botón envía. `ocupado`: el servidor trabaja o la
 * tarea ya terminó, y el botón se apaga del todo.
 */
export default function BotonPublicar({ id, falta, ocupado = false, children }: { id: string; falta: string | null; ocupado?: boolean; children: ReactNode }) {
  return (
    <>
      <Boton type={falta ? "button" : "submit"} disabled={ocupado} aria-disabled={falta ? true : undefined} aria-describedby={falta ? id : undefined}>
        {children}
      </Boton>
      {falta && (
        <p id={id} className={canon.notaBoton}>
          {falta}
        </p>
      )}
    </>
  );
}
