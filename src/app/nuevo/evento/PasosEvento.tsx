"use client";

import { useId, useState } from "react";
import { PiePaso } from "@/components/PorPasos";
import SelectorQuien from "@/app/eventos/SelectorQuien";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { Chip } from "@/components/ui/Chip";
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
import { partirLocal } from "@/lib/cuandoEvento";
import { LIMITES_EVENTO, type ErroresEvento } from "@/lib/eventos";
import { diaLargo, diaLocal } from "@/lib/fechas";
import { DURACIONES, HORAS_SUGERIDAS, diasSugeridos, etiquetaDuracion, finConHora, finesSugeridos, type Costo, type Dias, type Respuestas } from "./pasos";
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

export function PasoNombre({ nombre, onCambio, onSeguir }: { nombre: string; onCambio: (nombre: string) => void; onSeguir: () => void }) {
  const listo = !!nombre.trim();
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
      {calendario && <SelectorDia titulo="¿Qué día es?" desde={dias?.desde ?? ""} hasta={dias?.hasta ?? ""} zona={zona} onListo={(desde, hasta) => onElegir({ desde, hasta })} onCerrar={() => setCalendario(false)} />}
    </>
  );
}

/**
 * Primero cuándo empieza; al elegirlo aparece cuánto dura (1, 2 o 3 horas, «Otra hora» o «Sin hora de fin»), con el fin ya calculado
 * desde el inicio: puede caer en el día siguiente («empieza 10:00 p.m., dura 3 horas, termina 1:00 a.m.»). Elegir el fin avanza. En
 * un evento de varios días «cuánto dura» no tiene sentido (un festival no dura «2 horas»): ahí se sigue preguntando a qué hora termina
 * el último día, y «Sin hora de fin» es que acaba con él.
 */
export function PasoHora({ r, zona, onInicio, onFin }: { r: Respuestas; zona: string; onInicio: (hora: string) => void; onFin: (fin: string) => void }) {
  const [hoja, setHoja] = useState<"inicio" | "fin" | null>(null);
  const idEmpieza = useId();
  const idTermina = useId();
  const propia = r.hora && !(HORAS_SUGERIDAS as readonly string[]).includes(r.hora) ? r.hora : null;
  const sinFin = finConHora(r, "");
  const varios = !!r.dias?.hasta;
  // Con un fin puesto en un evento de un día, se dice a qué hora termina y si ya es el día siguiente (la hora de «Otra hora» no se ve
  // en ningún chip).
  const fin = r.fin && r.dias && !varios ? partirLocal(r.fin) : null;
  // Un fin que no es ninguno de los sugeridos ni «Sin hora de fin» vino de la hoja: el chip «Otra hora» queda marcado (como en «Empieza»).
  const sugeridos = finesSugeridos(r, zona);
  return (
    <>
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
      {r.hora && (
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
