"use client";

import { useId, useState } from "react";
import Boton from "@/components/ui/Boton";
import BotonIcono from "@/components/ui/BotonIcono";
import { Chip } from "@/components/ui/Chip";
import Hoja from "@/components/ui/Hoja";
import { IconoCerrar, IconoMas, IconoReloj } from "@/components/ui/Iconos";
import SelectorHora from "@/components/ui/SelectorHora";
import SoloLector from "@/components/ui/SoloLector";
import { etiquetaHora } from "@/lib/calendario";
import { conAbre, conDias, DIAS, diasDe, FRANJA_DE_ENTRADA, franjaNueva, HORAS_ABRE, horasDeCerrar, textoDias, textoRango, type Franja } from "@/lib/horarioLugar";
import pasos from "@/app/nuevo/evento/AltaEvento.module.css";
import styles from "./Horario.module.css";

/**
 * La hoja del horario de un lugar (OL-315; prototipo firmado `lugar-artista-por-pasos.html`, decisiones 2 a 4 de la bitácora 342). La
 * comparten el alta por pasos («Revisa») y editar (`FormularioLugar`); lo que se lee lo pinta `TextoHorario`, también en la ficha.
 */

/** Una franja nueva cuando ya no queda ninguna: sin días, con las horas de entrada. */
const VACIA: Franja = { dias: [], abre: FRANJA_DE_ENTRADA.abre, cierra: FRANJA_DE_ENTRADA.cierra };

type Props = {
  /** El horario como está; vacío, la hoja abre con la franja de entrada (Ma–Do de 10:00 a 18:00). */
  franjas: readonly Franja[];
  /** «Listo»: las franjas con días (las vacías se descartan). */
  onListo: (franjas: Franja[]) => void;
  /** La ✕ o tocar fuera: nada cambia. */
  onCerrar: () => void;
};

/**
 * «¿Qué días abre?»: una franja abierta a la vez, con los días (chips de Lu a Do) y a qué hora abre y cierra (chips y «Otra hora», que abre la
 * hoja de horas de siempre). Debajo, «Agregar otro horario»: la franja nueva llega con los días que aún no tienen horario ya marcados (si no
 * queda ninguno, vacía) y las horas de la que estaba abierta; la anterior se encoge a un renglón (días arriba, horas debajo) con su ✕, y
 * tocarlo la vuelve a abrir. Sin tope: se acepta cualquier combinación y la estructura la pone el sistema (ley de Postel). «Listo» va en el
 * pie de la hoja, siempre a la vista: solo se desplaza el cuerpo.
 */
export function HojaHorario({ franjas, onListo, onCerrar }: Props) {
  const [lista, setLista] = useState<Franja[]>(() => (franjas.length ? franjas.map((f) => ({ ...f })) : [{ ...FRANJA_DE_ENTRADA }]));
  const [abierta, setAbierta] = useState(0);
  const [otra, setOtra] = useState<"abre" | "cierra" | null>(null);
  const actual = lista[abierta];
  const cambiar = (f: Franja) => setLista((l) => l.map((x, i) => (i === abierta ? f : x)));

  function agregar() {
    setLista((l) => [...l, franjaNueva(l, actual)]);
    setAbierta(lista.length);
  }
  // Quitar una franja: la abierta pasa a la que quedó en su lugar (o a la última); sin ninguna, queda una vacía.
  function quitar(i: number) {
    const resto = lista.filter((_, j) => j !== i);
    setLista(resto.length ? resto : [{ ...VACIA }]);
    setAbierta((a) => Math.max(0, Math.min(i < a ? a - 1 : a, resto.length - 1)));
  }

  return (
    <>
      <Hoja
        etiqueta="Horario"
        titulo="¿Qué días abre?"
        onCerrar={onCerrar}
        pie={
          <Boton type="button" onClick={() => onListo(conDias(lista))}>
            Listo
          </Boton>
        }
      >
        <div className={styles.franjas}>
          {lista.map((f, i) =>
            i === abierta ? (
              <FranjaAbierta key={i} franja={f} quitable={lista.length > 1} onCambio={cambiar} onOtra={setOtra} onQuitar={() => quitar(i)} />
            ) : (
              <div key={i} className={styles.puesta}>
                <button type="button" className={styles.resumen} onClick={() => setAbierta(i)}>
                  <IconoReloj width={20} height={20} />
                  <b>{f.dias.length ? textoDias(f.dias) : "Sin días"}</b>
                  <small>{textoRango(f)}</small>
                </button>
                <BotonIcono tamano="accion" onClick={() => quitar(i)} aria-label={`Quitar el horario de ${f.dias.length ? textoDias(f.dias) : "sin días"}`}>
                  <IconoCerrar width={18} height={18} />
                </BotonIcono>
              </div>
            ),
          )}
          {actual && actual.dias.length > 0 && (
            <button type="button" className={styles.agregar} onClick={agregar}>
              <IconoMas width={20} height={20} />
              Agregar otro horario
            </button>
          )}
        </div>
      </Hoja>
      {actual && otra === "abre" && (
        <SelectorHora
          titulo="Abre"
          hora={actual.abre}
          onElegir={(hora) => {
            cambiar(conAbre(actual, hora));
            setOtra(null);
          }}
          onCerrar={() => setOtra(null)}
        />
      )}
      {actual && otra === "cierra" && (
        <SelectorHora
          titulo={`Cierra (abre ${etiquetaHora(actual.abre)})`}
          hora={actual.cierra}
          diaSiguienteDe={actual.abre}
          onElegir={(cierra) => {
            cambiar({ ...actual, cierra });
            setOtra(null);
          }}
          onCerrar={() => setOtra(null)}
        />
      )}
    </>
  );
}

/** La franja abierta: los días, «Abre» y «Cierra», con «Otra hora»; la hora elegida a mano sale como un chip más, marcado. */
function FranjaAbierta({ franja, quitable, onCambio, onOtra, onQuitar }: { franja: Franja; quitable: boolean; onCambio: (f: Franja) => void; onOtra: (cual: "abre" | "cierra") => void; onQuitar: () => void }) {
  const idAbre = useId();
  const idCierra = useId();
  const dias = diasDe(franja.dias);
  const cierres = horasDeCerrar(franja.abre);
  const abrePropia = !(HORAS_ABRE as readonly string[]).includes(franja.abre);
  const cierrePropio = !cierres.includes(franja.cierra);
  return (
    <div className={styles.franja}>
      <div className={styles.dias} role="group" aria-label="Días">
        {DIAS.map(({ dia, corto, nombre }) => (
          <Chip key={dia} activo={dias.includes(dia)} onClick={() => onCambio({ ...franja, dias: dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia] })}>
            <span aria-hidden="true">{corto}</span>
            <SoloLector>{nombre}</SoloLector>
          </Chip>
        ))}
      </div>
      <div className={pasos.grupo} role="group" aria-labelledby={idAbre}>
        <span id={idAbre}>Abre</span>
        {HORAS_ABRE.map((hora) => (
          <Chip key={hora} activo={franja.abre === hora} onClick={() => onCambio(conAbre(franja, hora))}>
            {etiquetaHora(hora)}
          </Chip>
        ))}
        <Chip onClick={() => onOtra("abre")}>Otra hora</Chip>
        {abrePropia && (
          <Chip activo onClick={() => onOtra("abre")}>
            {etiquetaHora(franja.abre)}
          </Chip>
        )}
      </div>
      <div className={pasos.grupo} role="group" aria-labelledby={idCierra}>
        <span id={idCierra}>Cierra</span>
        {cierres.map((hora) => (
          <Chip key={hora} activo={franja.cierra === hora} onClick={() => onCambio({ ...franja, cierra: hora })}>
            {etiquetaHora(hora)}
          </Chip>
        ))}
        <Chip onClick={() => onOtra("cierra")}>Otra hora</Chip>
        {cierrePropio && (
          <Chip activo onClick={() => onOtra("cierra")}>
            {etiquetaHora(franja.cierra)}
          </Chip>
        )}
      </div>
      {quitable && (
        <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={onQuitar}>
          Quitar este horario
        </Boton>
      )}
    </div>
  );
}
