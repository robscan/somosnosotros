"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PiePaso } from "@/components/PorPasos";
import SelectorQuien from "@/app/eventos/SelectorQuien";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Casilla from "@/components/ui/Casilla";
import { Chip, Chips } from "@/components/ui/Chip";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import { IconoBoleto, IconoBuscar } from "@/components/ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import Opcion from "@/components/ui/Opcion";
import SelectorDia from "@/components/ui/SelectorDia";
import SelectorHora from "@/components/ui/SelectorHora";
import SoloLector from "@/components/ui/SoloLector";
import canon from "@/components/ui/FormularioCanon.module.css";
import type { ArtistaResumen } from "@/lib/artistas";
import { etiquetaHora } from "@/lib/calendario";
import type { Ciudad } from "@/lib/ciudad";
import { partirLocal, resumenCadaDia } from "@/lib/cuandoEvento";
import { CLASES, LIMITES_EVENTO, type Clase, type ErroresEvento } from "@/lib/eventos";
import { diaLargo, diaLocal } from "@/lib/fechas";
import { sinMovimiento } from "@/lib/movimiento";
import { admitePorDia, finComun, horarioComun, resumenPorDia, type HorarioDia } from "@/lib/sesionesEvento";
import { DURACIONES, HORAS_SUGERIDAS, diasElegidos, diasSugeridos, etiquetaDuracion, finConHora, finesSugeridos, type Costo, type Dias, type Respuestas } from "./pasos";
import HorarioPorDia from "./HorarioPorDia";
import styles from "./AltaEvento.module.css";

/**
 * Los pasos del alta de evento sin cartel (prototipo firmado, bitácora 323): cada uno pinta lo suyo dentro de `PorPasos`, que pone la
 * barra y la pregunta. Cuando la respuesta es un toque (un día, una hora de fin, una opción de costo) elegir avanza; cuando hay que
 * escribir, el botón del pie dice qué falta.
 */

/** «Siguiente», o lo que falta para poder seguir; apagado se puede alcanzar y el lector lo lee (`aria-disabled`, como `BotonPublicar`). */
function Siguiente({ falta, onSeguir }: { falta: string | null; onSeguir: () => void }) {
  return (
    <PiePaso>
      <Boton type="button" aria-disabled={falta ? true : undefined} onClick={falta ? undefined : onSeguir}>
        {falta ?? "Siguiente"}
      </Boton>
    </PiePaso>
  );
}

/** Intro en el teclado del teléfono hace lo mismo que el botón del pie. */
const conIntro = (seguir: (() => void) | null) => (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter" && seguir) seguir();
};

/**
 * «¿Cómo se llama?». En el alta (OL-345; founder, 2026-10-08: «no veo la opción de especificar que es una galería/exposición temporal»), justo
 * bajo el campo, los chips de la clase en su orden fijo (Evento · Exposición · Taller · Festival) con la propuesta del título ya marcada (o la del
 * cartel, o la que se eligió): un toque la fija y el paso sigue igual, sin pregunta nueva; «Siguiente» lleva al paso del tiempo de esa clase y
 * «Revisa» la confirma. Sin rótulo ni ayuda: la fila se nombra solo para el lector. Es la fila de los filtros (`ui/Chips`): si no cabe a lo ancho,
 * se desliza, nunca en dos renglones, y se desliza sola hasta dejar entero el marcado (a 320 «Festival» queda en el borde). Va justo después del
 * campo, con el aire de la columna y sin margen negativo (la medición no los admite); la tira Evento · Lugar · Artista (OL-313) es del paso del
 * cartel y no sale aquí. `clase` null: sin chips (sin nombre todavía, o al editar, que cambia la clase desde «Revisa»).
 */
export function PasoNombre({ nombre, clase = null, onCambio, onClase, onSeguir }: { nombre: string; clase?: Clase | null; onCambio: (nombre: string) => void; onClase?: (clase: Clase) => void; onSeguir: () => void }) {
  const listo = !!nombre.trim();
  const fila = useRef<HTMLDivElement>(null);
  // Lo que se marca (al escribir «Festival…», o al aparecer la fila) se ve entero: la fila se desliza lo justo, sin mover la página. Otra vez
  // cuando termina de llegar la letra: con Bricolage los chips cambian de ancho.
  useEffect(() => {
    const mostrar = () => {
      const caja = fila.current;
      const marcado = caja?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!caja || !marcado) return;
      const f = caja.getBoundingClientRect();
      const c = marcado.getBoundingClientRect();
      const falta = c.right > f.right ? c.right - f.right : c.left < f.left ? c.left - f.left : 0;
      if (falta) caja.scrollBy({ left: falta, behavior: sinMovimiento() ? "instant" : "smooth" });
    };
    mostrar();
    void document.fonts?.ready.then(mostrar);
  }, [clase]);
  return (
    <>
      <label className={`${canon.campo} ${nombre ? "" : canon.campoFalta}`}>
        <IconoBuscar width={20} height={20} />
        <input
          type="text"
          value={nombre}
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={conIntro(listo ? onSeguir : null)}
          maxLength={LIMITES_EVENTO.titulo}
          placeholder="Nombre del evento"
          aria-label="Nombre del evento"
          autoComplete="off"
          enterKeyHint="next"
          autoFocus
        />
        <Limpiar visible={!!nombre} />
        <ContadorCaracteres valor={nombre} tope={LIMITES_EVENTO.titulo} />
      </label>
      {clase && (
        <Chips ref={fila} ariaLabel="Cómo ocurre">
          {CLASES.map((c) => (
            <Chip key={c.clase} activo={c.clase === clase} onClick={() => onClase?.(c.clase)}>
              {c.corto}
            </Chip>
          ))}
        </Chips>
      )}
      <Siguiente falta={listo ? null : "Falta el nombre"} onSeguir={onSeguir} />
    </>
  );
}

/** Un chip de día elige y avanza; «Otro día» y «Dura varios días» abren el calendario (inicio y, si dura más, el último día). */
export function PasoDia({ dias, zona, onElegir }: { dias: Dias | null; zona: string; onElegir: (dias: Dias) => void }) {
  const [calendario, setCalendario] = useState(false);
  const ahora = new Date();
  const sugeridos = diasSugeridos(diaLocal(ahora, zona));
  const unDia = dias && !dias.hasta ? dias.desde : null;
  return (
    <>
      <div className={styles.grupo} role="group" aria-label="Día">
        {sugeridos.map(({ etiqueta, dia }) => (
          <Chip key={etiqueta} activo={unDia === dia} onClick={() => onElegir({ desde: dia, hasta: null })}>
            {etiqueta}
            <SoloLector>, {diaLargo(dia, ahora, zona)}</SoloLector>
          </Chip>
        ))}
        <Chip activo={!!dias && !sugeridos.some(({ dia }) => dia === unDia)} onClick={() => setCalendario(true)}>
          Otro día
        </Chip>
      </div>
      <Boton type="button" variante="quieto" onClick={() => setCalendario(true)}>
        Dura varios días
      </Boton>
      {calendario && <SelectorDia titulo="¿Qué día es?" desde={dias?.desde ?? ""} hasta={dias?.hasta ?? ""} zona={zona} onListo={(desde, hasta) => onElegir(diasElegidos(desde, hasta))} onCerrar={() => setCalendario(false)} />}
    </>
  );
}

/**
 * Primero cuándo empieza; al elegirlo aparece cuánto dura (1, 2 o 3 horas, «Otra hora» o «Sin hora de fin»), con el fin ya calculado
 * desde el inicio: puede caer en el día siguiente («empieza 10:00 p.m., dura 3 horas, termina 1:00 a.m.»). Elegir el fin avanza. En
 * un evento de varios días «cuánto dura» no tiene sentido (un festival no dura «2 horas»): la pregunta es «¿A qué hora, cada día?» (el
 * horario del primer día vale para todos), «Termina» son horas del día y «Sin hora de fin» es que acaba con el último; debajo, la casilla
 * «Mismo horario todos los días» (marcada de entrada) y una línea suave que lo dice en palabras («Del 10 al 12 de oct · cada día de 8:00 a
 * 9:00 p.m.»). Lo guardado es el mismo: el inicio del primer día y el fin del último.
 *
 * Desmarcar la casilla (OL-311; prototipo firmado `horario-por-dia.html`) quita los chips comunes y pone un renglón por día, todos con el horario
 * común (`HorarioPorDia`): tocar uno abre su hoja. El pie dice «Siguiente» (elegir una hora ya no avanza solo) y volver a marcar la casilla
 * devuelve a todos el horario común. Hasta 31 días: con más, la casilla queda marcada y quieta y dice por qué. La casilla aparece con «Termina»,
 * cuando ya hay un horario común de donde partir.
 */
export function PasoHora({ r, zona, onInicio, onFin, onCambiar, onSeguir }: { r: Respuestas; zona: string; onInicio: (hora: string) => void; onFin: (fin: string) => void; onCambiar: (cambios: Partial<Respuestas>) => void; onSeguir: () => void }) {
  const [hoja, setHoja] = useState<"inicio" | "fin" | null>(null);
  const idEmpieza = useId();
  const idTermina = useId();
  const propia = r.hora && !(HORAS_SUGERIDAS as readonly string[]).includes(r.hora) ? r.hora : null;
  const sinFin = finConHora(r, "");
  const dias = r.dias?.hasta ? { desde: r.dias.desde, hasta: r.dias.hasta } : null;
  const varios = !!dias;
  const porDia = !!dias && !!r.sesiones;
  // Con un fin puesto en un evento de un día, se dice a qué hora termina y si ya es el día siguiente (la hora de «Otra hora» no se ve
  // en ningún chip).
  const fin = r.fin && r.dias && !varios ? partirLocal(r.fin) : null;
  // Un fin que no es ninguno de los sugeridos ni «Sin hora de fin» vino de la hoja: el chip «Otra hora» queda marcado (como en «Empieza»).
  const sugeridos = finesSugeridos(r, zona);
  const hoy = diaLocal(new Date(), zona);
  const cambiarDia = (dia: string, cambios: Partial<Pick<HorarioDia, "hora" | "fin">>) => onCambiar({ sesiones: r.sesiones?.map((h) => (h.dia === dia ? { ...h, ...cambios } : h)) ?? null });
  return (
    <>
      {!porDia && (
        <div className={styles.grupo} role="group" aria-labelledby={idEmpieza}>
          <span id={idEmpieza}>Empieza</span>
          {HORAS_SUGERIDAS.map((hora) => (
            <Chip key={hora} activo={r.hora === hora} onClick={() => onInicio(hora)}>
              {etiquetaHora(hora)}
            </Chip>
          ))}
          <Chip onClick={() => setHoja("inicio")}>Otra hora</Chip>
          {propia && (
            <Chip activo onClick={() => setHoja("inicio")}>
              {etiquetaHora(propia)}
            </Chip>
          )}
        </div>
      )}
      {!porDia && r.hora && (
        <div className={`${styles.grupo} ${styles.aparece}`} role="group" aria-labelledby={idTermina}>
          <span id={idTermina}>{varios ? "Termina" : "¿Cuánto dura?"}</span>
          {sugeridos.map((sugerido, i) => (
            <Chip key={sugerido} activo={r.fin === sugerido} onClick={() => onFin(sugerido)}>
              {varios ? etiquetaHora(partirLocal(sugerido).hora) : etiquetaDuracion(DURACIONES[i])}
            </Chip>
          ))}
          <Chip activo={!!r.fin && r.fin !== sinFin && !sugeridos.includes(r.fin)} onClick={() => setHoja("fin")}>
            Otra hora
          </Chip>
          <Chip activo={r.fin === sinFin} onClick={() => onFin(sinFin)}>
            Sin hora de fin
          </Chip>
          {fin && r.dias && (
            <small>
              Termina {etiquetaHora(fin.hora)}
              {fin.fecha > r.dias.desde && " del día siguiente"}
            </small>
          )}
        </div>
      )}
      {dias && r.hora && (
        <Casilla
          titulo="Mismo horario todos los días"
          detalle={admitePorDia(dias) ? null : "Ajustar día por día es para eventos de hasta 31 días."}
          marcada={!porDia}
          disabled={!admitePorDia(dias)}
          onCambio={(marcada) => onCambiar(marcada ? { sesiones: null } : { sesiones: horarioComun(dias, r.hora ?? "", r.fin ?? ""), fin: r.fin ?? sinFin })}
        />
      )}
      {porDia && r.sesiones && r.hora && <HorarioPorDia horarios={r.sesiones} comun={{ hora: r.hora, fin: finComun(r.hora, r.fin ?? "") }} zona={zona} onCambio={cambiarDia} />}
      {dias && r.hora && <p className={styles.aviso}>{porDia && r.sesiones ? resumenPorDia(r.sesiones, { hora: r.hora, fin: finComun(r.hora, r.fin ?? "") }, hoy) : resumenCadaDia(dias, r.hora, r.fin ?? "", hoy)}</p>}
      {porDia && <Siguiente falta={null} onSeguir={onSeguir} />}
      {hoja === "inicio" && (
        <SelectorHora
          titulo="Empieza"
          hora={r.hora ?? ""}
          onElegir={(hora) => {
            onInicio(hora);
            setHoja(null);
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
      {hoja === "fin" && r.hora && <SelectorHora titulo={`Termina (empieza ${etiquetaHora(r.hora)})`} hora="" diaSiguienteDe={varios ? undefined : r.hora} onElegir={(hora) => onFin(finConHora(r, hora))} onCerrar={() => setHoja(null)} />}
    </>
  );
}

/** Tres opciones grandes: «Gratis» y «Cooperación» avanzan al tocarlas; «Tiene precio» abre el campo del precio, solo números. */
export function PasoCuanto({ precio, onCosto, onPrecio }: { precio: string; onCosto: (costo: Costo) => void; onPrecio: (precio: string) => void }) {
  const [conPrecio, setConPrecio] = useState(false);
  if (!conPrecio) {
    return (
      <div className={styles.opciones} role="group" aria-label="Cuánto cuesta">
        <Opcion icono={<IconoBoleto />} titulo="Gratis" detalle="Entrada libre" onClick={() => onCosto("gratis")} />
        <Opcion icono={<IconoBoleto />} titulo="Cooperación" detalle="Cada quien pone lo que puede" onClick={() => onCosto("cooperacion")} />
        <Opcion icono={<IconoBoleto />} titulo="Tiene precio" detalle="Escribe cuánto" onClick={() => setConPrecio(true)} />
      </div>
    );
  }
  const seguir = () => onCosto("precio");
  return (
    <>
      <label className={`${canon.campo} ${precio ? "" : canon.campoFalta}`}>
        <IconoBoleto width={20} height={20} />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={precio}
          onChange={(e) => onPrecio(e.target.value.replace(/\D/g, ""))}
          onKeyDown={conIntro(precio ? seguir : null)}
          maxLength={LIMITES_EVENTO.precio}
          placeholder="Ej. 150"
          aria-label="Precio (solo números)"
          autoComplete="off"
          enterKeyHint="next"
          autoFocus
        />
        <Limpiar visible={!!precio} />
        <ContadorCaracteres valor={precio} tope={LIMITES_EVENTO.precio} />
      </label>
      <Siguiente falta={precio ? null : "Falta el precio"} onSeguir={seguir} />
    </>
  );
}

type Mas = Pick<Respuestas, "quien" | "descripcion" | "enlace">;

/** Lo opcional, con los mismos controles del alta de siempre (Quién, Descripción y Enlace); «Listo» vuelve a «Revisa». */
export function PasoMas({ r, mios, ciudadContexto, errores, onCambio, onListo }: { r: Mas; mios: ArtistaResumen[]; ciudadContexto: Ciudad | null; errores: ErroresEvento; onCambio: (cambios: Partial<Mas>) => void; onListo: () => void }) {
  return (
    <>
      <SelectorQuien valor={r.quien} onCambio={(quien) => onCambio({ quien })} mios={mios} ciudadContexto={ciudadContexto?.nombre} />
      <Campo etiqueta="Descripción" name="descripcion" multilinea value={r.descripcion} onChange={(e) => onCambio({ descripcion: e.target.value })} maxLength={LIMITES_EVENTO.descripcion} error={errores.descripcion} mostrarContador />
      <Campo etiqueta="Enlace" name="enlace" value={r.enlace} onChange={(e) => onCambio({ enlace: e.target.value })} placeholder="Boletos, más información…" inputMode="url" autoCapitalize="none" autoComplete="off" error={errores.enlace} />
      <PiePaso>
        <Boton type="button" onClick={onListo}>
          Listo
        </Boton>
      </PiePaso>
    </>
  );
}
