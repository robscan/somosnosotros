"use client";

import { useId, useState } from "react";
import { HojaHorario } from "@/app/lugares/Horario";
import SelectorQuien from "@/app/eventos/SelectorQuien";
import { PiePaso } from "@/components/PorPasos";
import Boton from "@/components/ui/Boton";
import Calendario from "@/components/ui/Calendario";
import Casilla from "@/components/ui/Casilla";
import { Chip } from "@/components/ui/Chip";
import ContadorCaracteres from "@/components/ui/ContadorCaracteres";
import Hoja from "@/components/ui/Hoja";
import { IconoBuscar, IconoCalendario, IconoEtiqueta, IconoMas, IconoOk, IconoPersonas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import Limpiar from "@/components/ui/Limpiar";
import Opcion from "@/components/ui/Opcion";
import SelectorDia from "@/components/ui/SelectorDia";
import SelectorHora from "@/components/ui/SelectorHora";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import type { ArtistaResumen } from "@/lib/artistas";
import { etiquetaHora } from "@/lib/calendario";
import { horariosDeTaller, rangoDelPeriodo, resumenTaller, textoProgramaRegistrado } from "@/lib/claseEvento";
import type { Ciudad } from "@/lib/ciudad";
import { CLASES, LIMITES_EVENTO, type Clase } from "@/lib/eventos";
import { diaConMesDe, diaLocal, rangoCorto } from "@/lib/fechas";
import { lineasHorario, type Franja } from "@/lib/horarioLugar";
import type { LugarResumen } from "@/lib/lugares";
import { normalizarNombre } from "@/lib/lugares";
import { finesDelDia, type HorarioDia } from "@/lib/sesionesEvento";
import type { FestivalElegible } from "./contextoClase";
import HorarioPorDia from "./HorarioPorDia";
import { HORAS_SUGERIDAS, actoListo, dondeResuelto, horariosDelTaller, nombreDelSitio, type Acto, type Inauguracion, type Padre, type Respuestas } from "./pasos";
import pasos from "./AltaEvento.module.css";
import styles from "./PasosClase.module.css";

/**
 * Los pasos y las hojas de cómo ocurre un evento (OL-321; doc 55 §2 y prototipo `exposicion-festival-taller.html`, casos 1 a 5): el paso del
 * tiempo de una exposición («¿Cuándo se puede visitar?»), de un taller («¿Qué días son las sesiones?») y de un festival (su programa, con la
 * hoja de cada acto), y las hojas que abre «Revisa»: «¿Cómo ocurre?», la inauguración y «Parte de un festival». Las comparten el alta y editar.
 */

/** «Siguiente», o lo que falta para poder seguir (como en los pasos de siempre). */
function Siguiente({ falta, texto = "Siguiente", onSeguir }: { falta: string | null; texto?: string; onSeguir: () => void }) {
  return (
    <PiePaso>
      <Boton type="button" aria-disabled={falta ? true : undefined} onClick={falta ? undefined : onSeguir}>
        {falta ?? texto}
      </Boton>
    </PiePaso>
  );
}

/** El horario como se dice en una línea («Ma–Do · 10:00 a.m.–6:00 p.m. · Cierra Lu»): el detalle de la casilla «Horario del lugar». */
export function horarioEnUnaLinea(franjas: readonly Franja[]): string {
  const { lineas, cierra } = lineasHorario(franjas);
  return [...lineas.map((l) => `${l.dias} · ${l.horas}`), cierra].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------- Exposición

type PropsVisita = {
  visita: Respuestas["visita"];
  zona: string;
  /** El horario del lugar elegido (vacío si no lo tiene o todavía no hay lugar). */
  horarioLugar: readonly Franja[];
  horario: Franja[] | null;
  onVisita: (visita: NonNullable<Respuestas["visita"]>) => void;
  onHorario: (horario: Franja[] | null) => void;
  onSeguir: () => void;
  /** Lo que dice el botón del pie con todo puesto: «Siguiente» en el alta; «Publicar exposición» desde la sugerencia de «Publicado» (OL-323, H2). */
  texto?: string;
};

/**
 * «¿Cuándo se puede visitar?» (caso 2): sustituye a «¿Qué día es?» y «¿A qué hora?» en una exposición. «Desde» y «Hasta» son dos chips que
 * dicen cuál se elige en el calendario de siempre (Hasta inclusivo; los días entre medio se pintan): el primer toque pone el primer día y pasa a
 * «Hasta»; un día anterior al primero lo mueve. Debajo, la casilla «Horario del lugar» (marcada si el lugar tiene horario, con su resumen): al
 * desmarcarla se abre la hoja de franjas del lugar (la misma pieza de OL-315) para el horario propio. Sin horario en ninguno, se publica con
 * «Horario por confirmar»: no se inventa.
 */
export function PasoVisita({ visita, zona, horarioLugar, horario, onVisita, onHorario, onSeguir, texto }: PropsVisita) {
  const [eligiendo, setEligiendo] = useState<"desde" | "hasta">(visita?.desde && !visita.hasta ? "hasta" : "desde");
  const [hoja, setHoja] = useState(false);
  const hoy = diaLocal(new Date(), zona);
  const ahora = new Date();
  const desde = visita?.desde ?? "";
  const hasta = visita?.hasta ?? "";
  function elegir(dia: string) {
    if (eligiendo === "desde" || !desde) {
      onVisita({ desde: dia, hasta: hasta && hasta >= dia ? hasta : null });
      setEligiendo("hasta");
    } else if (dia < desde) onVisita({ desde: dia, hasta: hasta || null });
    else onVisita({ desde, hasta: dia });
  }
  const conLugar = horarioLugar.length > 0;
  const propio = !!horario?.length;
  return (
    <>
      <div className={pasos.grupo} role="group" aria-label="Qué día se elige">
        <Chip activo={eligiendo === "desde"} onClick={() => setEligiendo("desde")}>
          Desde{desde ? ` · ${diaConMesDe(desde, ahora, zona)}` : ""}
        </Chip>
        <Chip activo={eligiendo === "hasta"} onClick={() => setEligiendo("hasta")}>
          Hasta{hasta ? ` · ${diaConMesDe(hasta, ahora, zona)}` : ""}
        </Chip>
      </div>
      <div className={styles.calendario}>
        <Calendario hoy={hoy} zona={zona} desde={desde} hasta={hasta || desde} pasadoPermitido={desde || undefined} permiteQuitar={false} onElegir={elegir} />
      </div>
      {desde && hasta && (
        <p className={pasos.aviso} role="status">
          {rangoCorto(desde, hasta, hoy)}
        </p>
      )}
      {conLugar && (
        <Casilla
          titulo="Horario del lugar"
          detalle={horarioEnUnaLinea(horarioLugar)}
          marcada={!propio}
          onCambio={(marcada) => (marcada ? onHorario(null) : setHoja(true))}
        />
      )}
      {propio && horario && (
        <ul className={renglon.renglones}>
          <li className={`${renglon.resuelto} ${renglon.sinClave} ${pasos.dato}`}>
            <IconoReloj width={20} height={20} />
            <b>
              Horario propio
              <small>{horarioEnUnaLinea(horario)}</small>
            </b>
            <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={() => setHoja(true)} aria-label="Cambiar el horario propio">
              Cambiar
            </Boton>
          </li>
        </ul>
      )}
      {!conLugar && !propio && <p className={pasos.aviso}>Si el lugar no tiene horario, puedes ponerlo en «Revisa» o publicar con «Horario por confirmar».</p>}
      <Siguiente falta={!desde ? "Falta desde cuándo" : !hasta ? "Falta hasta cuándo" : null} texto={texto} onSeguir={onSeguir} />
      {hoja && (
        <HojaHorario
          titulo="¿Qué días se puede visitar?"
          franjas={horario?.length ? horario : horarioLugar}
          onListo={(franjas) => {
            onHorario(franjas.length ? franjas : null);
            setHoja(false);
          }}
          onCerrar={() => setHoja(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- Taller

/** Las horas de inicio que se ofrecen para un taller (las del prototipo, caso 3: por la mañana y por la tarde). Por confirmar con datos. */
export const HORAS_TALLER = ["10:00", "11:00", "16:00", "17:00", "18:00"] as const;

type PropsSesiones = {
  r: Respuestas;
  zona: string;
  onCambiar: (cambios: Partial<Respuestas>) => void;
  onSeguir: () => void;
};

/**
 * «¿Qué días son las sesiones?» (caso 3): sustituye a «¿Qué día es?» en un taller o curso. Un toque por día en el calendario de siempre (otro
 * toque lo quita; el cartel los trae marcados si los lee); la hora de inicio y, si se quiere, la de fin, y la casilla «Misma hora todas las
 * sesiones» de OL-310/311: desmarcada, un renglón por sesión con su hoja (`HorarioPorDia`, ya construido). Se publica UN taller.
 */
export function PasoSesiones({ r, zona, onCambiar, onSeguir }: PropsSesiones) {
  const [hoja, setHoja] = useState<"inicio" | "fin" | null>(null);
  const idEmpieza = useId();
  const idTermina = useId();
  const hoy = diaLocal(new Date(), zona);
  const dias = [...r.sesionesDias].sort();
  const porSesion = !!r.sesiones;
  const fin = r.fin ?? "";
  function tocar(dia: string) {
    const nuevos = dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia].sort();
    // Con hora por sesión, la sesión nueva llega con la hora común y la quitada se va con la suya.
    const sesiones = r.sesiones && r.hora ? nuevos.map((d) => r.sesiones?.find((h) => h.dia === d) ?? { dia: d, hora: r.hora ?? "", fin }) : null;
    onCambiar({ sesionesDias: nuevos, sesiones: sesiones && sesiones.length >= 2 ? sesiones : null });
  }
  const propia = r.hora && !(HORAS_TALLER as readonly string[]).includes(r.hora) ? r.hora : null;
  const fines = r.hora ? finesDelDia(r.hora) : [];
  const horarios = horariosDelTaller(r);
  const cambiarDia = (dia: string, cambios: Partial<Pick<HorarioDia, "hora" | "fin">>) => onCambiar({ sesiones: r.sesiones?.map((h) => (h.dia === dia ? { ...h, ...cambios } : h)) ?? null });
  return (
    <>
      <div className={styles.calendario}>
        <Calendario hoy={hoy} zona={zona} desde={dias[0] ?? ""} hasta={dias[0] ?? ""} sueltos={dias} pasadoPermitido={dias[0]} permiteQuitar onElegir={tocar} />
      </div>
      <p className={pasos.aviso} role="status">
        {dias.length ? (horarios.length ? resumenTaller(horarios, hoy) : `${dias.length} ${dias.length === 1 ? "sesión" : "sesiones"}`) : "Toca cada día con sesión."}
      </p>
      {!porSesion && (
        <div className={pasos.grupo} role="group" aria-labelledby={idEmpieza}>
          <span id={idEmpieza}>¿A qué hora?</span>
          {HORAS_TALLER.map((hora) => (
            <Chip key={hora} activo={r.hora === hora} onClick={() => onCambiar({ hora, fin: r.fin && r.fin > hora ? r.fin : null })}>
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
      {!porSesion && r.hora && (
        <div className={`${pasos.grupo} ${pasos.aparece}`} role="group" aria-labelledby={idTermina}>
          <span id={idTermina}>Termina</span>
          {fines.map((f) => (
            <Chip key={f} activo={fin === f} onClick={() => onCambiar({ fin: f })}>
              {etiquetaHora(f)}
            </Chip>
          ))}
          <Chip activo={!!fin && !fines.includes(fin)} onClick={() => setHoja("fin")}>
            Otra hora
          </Chip>
          <Chip activo={!fin} onClick={() => onCambiar({ fin: "" })}>
            Sin hora de fin
          </Chip>
        </div>
      )}
      {dias.length >= 2 && r.hora && (
        <Casilla
          titulo="Misma hora todas las sesiones"
          detalle={porSesion ? "Cada sesión con su hora." : null}
          marcada={!porSesion}
          onCambio={(marcada) => onCambiar({ sesiones: marcada ? null : horariosDeTaller(dias, r.hora ?? "", fin) })}
        />
      )}
      {porSesion && r.sesiones && r.hora && <HorarioPorDia horarios={r.sesiones} comun={{ hora: r.hora, fin }} zona={zona} onCambio={cambiarDia} />}
      <Siguiente falta={!dias.length ? "Faltan las sesiones" : !r.hora ? "Falta la hora" : null} onSeguir={onSeguir} />
      {hoja === "inicio" && (
        <SelectorHora
          titulo="Empieza"
          hora={r.hora ?? ""}
          onElegir={(hora) => {
            onCambiar({ hora, fin: r.fin && r.fin > hora ? r.fin : null });
            setHoja(null);
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
      {hoja === "fin" && r.hora && (
        <SelectorHora
          titulo={`Termina (empieza ${etiquetaHora(r.hora)})`}
          hora={fin}
          despuesDe={r.hora}
          onElegir={(f) => {
            onCambiar({ fin: f });
            setHoja(null);
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- Festival

type PropsPrograma = {
  r: Respuestas;
  zona: string;
  lugares: LugarResumen[];
  mios: ArtistaResumen[];
  ciudadContexto: Ciudad | null;
  onCambiar: (cambios: Partial<Respuestas>) => void;
  /** «Sede · Cambiar» de un acto: el paso «Dónde» de siempre, que vuelve aquí. */
  onSede: (acto: Acto) => void;
  onSeguir: () => void;
};

/** Lo que dice un acto bajo su nombre: «vie 13 de nov · 6:00 p.m. · CC200 · Foro», o lo que le falta. */
export function detalleActo(a: Acto, lugares: readonly LugarResumen[], zona: string, ahora: Date = new Date()): string {
  const lugar = a.sitio.modo === "lugar" ? lugares.find((l) => l.id === a.sitio.lugarId) : undefined;
  const sede = dondeResuelto(a.sitio) ? nombreDelSitio(a.sitio, lugar) : a.sedeLeida ? `${a.sedeLeida} · confirmar la sede` : "Falta la sede";
  return [a.dia ? diaConMesDe(a.dia, ahora, zona) : "Falta el día", a.hora ? etiquetaHora(a.hora) : "Falta la hora", sede].join(" · ");
}

/**
 * El programa de un festival (caso 4; H6): «El cartel trae N eventos», cada acto en su renglón con su casilla (marcada se publica; desmarcada
 * queda como borrador del festival), su día, su hora y su sede. Tocar el renglón abre su hoja para corregirlo antes de publicar. «Agregar
 * actividad» suma uno a mano (también sirve para armar un festival sin cartel). «Revisar el festival» lleva a «Revisa» del marco.
 */
export function PasoPrograma({ r, zona, lugares, mios, ciudadContexto, onCambiar, onSede, onSeguir }: PropsPrograma) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const acto = r.actos.find((a) => a.clave === abierto);
  const leidos = r.actos.some((a) => a.leido);
  const cambiarActo = (clave: string, cambios: Partial<Acto>) => onCambiar({ actos: r.actos.map((a) => (a.clave === clave ? { ...a, ...cambios } : a)) });
  function agregar() {
    const clave = `nuevo-${r.actos.length}-${Date.now().toString(36)}`;
    onCambiar({ actos: [...r.actos, { clave, titulo: "", dia: "", hora: "", sitio: r.sitio, sedeLeida: "", quien: [], marcado: true, leido: false }] });
    setAbierto(clave);
  }
  const marcados = r.actos.filter((a) => a.marcado);
  const incompleto = marcados.find((a) => !actoListo(a));
  return (
    <>
      <p className={pasos.aviso}>
        {leidos ? (
          <>
            Se publican juntos como el programa de <b>{r.nombre || "el festival"}</b>. Toca uno para corregirlo; desmarca el que no quieras publicar aún.
          </>
        ) : (
          "Agrega cada actividad con su día, su hora y su sede: se publican juntas como el programa del festival."
        )}
      </p>
      {r.actos.length > 0 && (
        <ul className={styles.programa}>
          {r.actos.map((a) => (
            <li key={a.clave} className={styles.acto}>
              <button type="button" role="checkbox" aria-checked={a.marcado} className={styles.marca} onClick={() => cambiarActo(a.clave, { marcado: !a.marcado })} aria-label={`Publicar ${a.titulo || "la actividad"}`}>
                {a.marcado && <IconoOk width={16} height={16} strokeWidth={3} />}
              </button>
              <button type="button" className={styles.corregir} onClick={() => setAbierto(a.clave)}>
                <b>{a.titulo || "Actividad sin nombre"}</b>
                <small className={a.marcado && !actoListo(a) ? styles.falta : undefined}>{detalleActo(a, lugares, zona)}</small>
                <span>Corregir</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Boton type="button" variante="quieto" onClick={agregar}>
        <IconoMas width={20} height={20} />
        Agregar actividad
      </Boton>
      {marcados.length > 0 && <p className={pasos.aviso}>{`${textoProgramaRegistrado(marcados.length)}${r.actos.length > marcados.length ? ` · ${r.actos.length - marcados.length} sin publicar (borrador)` : ""}`}</p>}
      <Siguiente falta={!marcados.length ? "Falta una actividad" : incompleto ? `Completa «${incompleto.titulo || "la actividad sin nombre"}»` : null} texto="Revisar el festival" onSeguir={onSeguir} />
      {acto && (
        <HojaActo
          acto={acto}
          zona={zona}
          lugares={lugares}
          mios={mios}
          ciudadContexto={ciudadContexto}
          onCambio={(cambios) => cambiarActo(acto.clave, cambios)}
          onSede={() => {
            setAbierto(null);
            onSede(acto);
          }}
          onCerrar={() => setAbierto(null)}
        />
      )}
    </>
  );
}

type PropsActo = {
  acto: Acto;
  zona: string;
  lugares: LugarResumen[];
  mios: ArtistaResumen[];
  ciudadContexto: Ciudad | null;
  onCambio: (cambios: Partial<Acto>) => void;
  onSede: () => void;
  onCerrar: () => void;
};

/**
 * La hoja de un acto (lo que le faltaba al prototipo aceptado, bitácora 314): su nombre (con su ✕ y su contador), su día y su hora (las hojas de
 * siempre), su sede (el paso «Dónde» de siempre) y quién. «Listo» siempre a la vista.
 */
function HojaActo({ acto, zona, lugares, mios, ciudadContexto, onCambio, onSede, onCerrar }: PropsActo) {
  const [otra, setOtra] = useState<"dia" | "hora" | null>(null);
  const ahora = new Date();
  const lugar = acto.sitio.modo === "lugar" ? lugares.find((l) => l.id === acto.sitio.lugarId) : undefined;
  const sede = dondeResuelto(acto.sitio) ? nombreDelSitio(acto.sitio, lugar) : null;
  const titulo = acto.titulo.trim() || "Actividad nueva";
  return (
    <>
      <Hoja
        etiqueta={titulo}
        titulo={titulo}
        onCerrar={onCerrar}
        pie={
          <Boton type="button" onClick={onCerrar}>
            Listo
          </Boton>
        }
      >
        <label className={`${canon.campo} ${acto.titulo ? "" : canon.campoFalta}`}>
          <IconoEtiqueta width={20} height={20} />
          <input type="text" value={acto.titulo} onChange={(e) => onCambio({ titulo: e.target.value })} maxLength={LIMITES_EVENTO.titulo} placeholder="Nombre de la actividad" aria-label="Nombre de la actividad" autoComplete="off" enterKeyHint="done" />
          <Limpiar visible={!!acto.titulo} />
          <ContadorCaracteres valor={acto.titulo} tope={LIMITES_EVENTO.titulo} />
        </label>
        <ul className={renglon.renglones}>
          <RenglonHoja icono={<IconoCalendario width={20} height={20} />} clave="Día" valor={acto.dia ? diaConMesDe(acto.dia, ahora, zona) : null} falta="Falta el día" onAbrir={() => setOtra("dia")} />
          <RenglonHoja icono={<IconoReloj width={20} height={20} />} clave="Hora" valor={acto.hora ? etiquetaHora(acto.hora) : null} falta="Falta la hora" onAbrir={() => setOtra("hora")} />
          <RenglonHoja icono={<IconoPin width={20} height={20} />} clave="Sede" valor={sede} falta={acto.sedeLeida ? `${acto.sedeLeida} · confirmar` : "Falta la sede"} onAbrir={onSede} />
        </ul>
        <div className={styles.quien}>
          <span className={styles.rotulo}>
            <IconoPersonas width={18} height={18} /> Quién
          </span>
          <SelectorQuien valor={acto.quien} onCambio={(quien) => onCambio({ quien })} mios={mios} ciudadContexto={ciudadContexto?.nombre} />
        </div>
      </Hoja>
      {otra === "dia" && <SelectorDia titulo="¿Qué día es?" desde={acto.dia} hasta="" zona={zona} onListo={(desde) => (onCambio({ dia: desde }), setOtra(null))} onCerrar={() => setOtra(null)} />}
      {otra === "hora" && <SelectorHora titulo="Empieza" hora={acto.hora} onElegir={(hora) => (onCambio({ hora }), setOtra(null))} onCerrar={() => setOtra(null)} />}
    </>
  );
}

/** Un renglón resuelto dentro de una hoja: icono, el valor (o lo que falta, con la línea de por completar) y «Cambiar» / «Poner». */
function RenglonHoja({ icono, clave, valor, falta, onAbrir }: { icono: React.ReactNode; clave: string; valor: string | null; falta: string; onAbrir: () => void }) {
  const accion = valor ? "Cambiar" : "Poner";
  return (
    <li className={`${renglon.resuelto} ${renglon.sinClave} ${valor ? "" : renglon.pendiente} ${pasos.dato}`}>
      {icono}
      <small>{clave}</small>
      <b className={valor ? undefined : renglon.falta}>{valor ?? falta}</b>
      <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={onAbrir} aria-label={`${accion} ${clave.toLowerCase()}`}>
        {accion}
      </Boton>
    </li>
  );
}

// ---------------------------------------------------------------- Hojas de «Revisa»

/**
 * «¿Cómo ocurre?» (caso 5): las cuatro formas con su frase llana; la de ahora con su palomita. Cambiarla cambia solo el paso del tiempo: nombre,
 * dónde y quién se conservan. `fija`: un festival que ya tiene actividades sigue siendo festival (editar).
 */
export function HojaClase({ clase, fija, onElegir, onCerrar }: { clase: Clase; fija?: boolean; onElegir: (clase: Clase) => void; onCerrar: () => void }) {
  return (
    <Hoja etiqueta="Cómo ocurre" titulo="¿Cómo ocurre?" onCerrar={onCerrar}>
      <p className={pasos.aviso}>{fija ? "Un festival con actividades registradas sigue siendo festival." : "Cambia solo el paso de cuándo; nombre, dónde y quién se conservan."}</p>
      <div className={pasos.opciones}>
        {CLASES.map((c) => (
          <Opcion key={c.clase} icono={<IconoEtiqueta />} titulo={c.nombre} detalle={c.frase} elegida={c.clase === clase} disabled={fija && c.clase !== clase} onClick={() => onElegir(c.clase)} />
        ))}
      </div>
    </Hoja>
  );
}

/**
 * La inauguración de una exposición: un acto puntual aparte, con su día y su hora (no hereda el horario de visita). «Listo» la pone; con una
 * puesta, «Quitar la inauguración».
 */
export function HojaInauguracion({ inauguracion, zona, onListo, onCerrar }: { inauguracion: Inauguracion | null; zona: string; onListo: (i: Inauguracion | null) => void; onCerrar: () => void }) {
  const [dia, setDia] = useState(inauguracion?.dia ?? "");
  const [hora, setHora] = useState(inauguracion?.hora ?? "");
  const [otra, setOtra] = useState(false);
  const idHora = useId();
  const hoy = diaLocal(new Date(), zona);
  const propia = hora && !(HORAS_SUGERIDAS as readonly string[]).includes(hora) ? hora : null;
  return (
    <>
      <Hoja
        etiqueta="Inauguración"
        titulo="Inauguración"
        onCerrar={onCerrar}
        pie={
          <>
            <Boton type="button" aria-disabled={!dia || !hora ? true : undefined} onClick={!dia || !hora ? undefined : () => onListo({ dia, hora })}>
              {!dia ? "Falta el día" : !hora ? "Falta la hora" : "Listo"}
            </Boton>
            {inauguracion && (
              <Boton type="button" variante="texto" onClick={() => onListo(null)}>
                Quitar la inauguración
              </Boton>
            )}
          </>
        }
      >
        <p className={pasos.aviso}>Se publica como evento aparte, ligado a la exposición.</p>
        <Calendario hoy={hoy} zona={zona} desde={dia} hasta={dia} pasadoPermitido={inauguracion?.dia} permiteQuitar={false} onElegir={setDia} />
        <div className={pasos.grupo} role="group" aria-labelledby={idHora}>
          <span id={idHora}>Empieza</span>
          {HORAS_SUGERIDAS.map((h) => (
            <Chip key={h} activo={hora === h} onClick={() => setHora(h)}>
              {etiquetaHora(h)}
            </Chip>
          ))}
          <Chip onClick={() => setOtra(true)}>Otra hora</Chip>
          {propia && (
            <Chip activo onClick={() => setOtra(true)}>
              {etiquetaHora(propia)}
            </Chip>
          )}
        </div>
      </Hoja>
      {otra && <SelectorHora titulo="Empieza" hora={hora} onElegir={(h) => (setHora(h), setOtra(false))} onCerrar={() => setOtra(false)} />}
    </>
  );
}

/**
 * «Parte de un festival»: busca por nombre entre los festivales que se pueden elegir (la persona lo elige: nunca se liga por parecido) o crea uno
 * nuevo con solo el nombre (toma sus fechas del programa registrado). Solo salen los propios: uno ajeno sería una propuesta pendiente de quien
 * lo administra, que todavía no existe (por confirmar). Con uno puesto, «Quitar del festival».
 */
export function HojaFestival({ padre, festivales, onElegir, onCerrar }: { padre: Padre | null; festivales: readonly FestivalElegible[]; onElegir: (p: Padre | null) => void; onCerrar: () => void }) {
  const [q, setQ] = useState("");
  const texto = q.trim();
  const buscado = normalizarNombre(texto);
  const encontrados = festivales.filter((f) => !buscado || normalizarNombre(f.titulo).includes(buscado)).slice(0, 8);
  const igual = festivales.some((f) => normalizarNombre(f.titulo) === buscado);
  return (
    <Hoja
      etiqueta="Parte de un festival"
      titulo="Parte de un festival"
      onCerrar={onCerrar}
      pie={
        padre ? (
          <Boton type="button" variante="texto" onClick={() => onElegir(null)}>
            Quitar del festival
          </Boton>
        ) : undefined
      }
    >
      <label className={canon.campo}>
        <IconoBuscar width={20} height={20} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder="Nombre del festival" aria-label="Nombre del festival" autoComplete="off" enterKeyHint="search" />
        <Limpiar visible={!!q} />
      </label>
      <div className={pasos.opciones}>
        {encontrados.map((f) => (
          <Opcion key={f.id} icono={<IconoEtiqueta />} titulo={f.titulo} detalle={rangoDelPeriodo(f.inicio, f.fin, f.zona)} elegida={!!padre && "id" in padre && padre.id === f.id} onClick={() => onElegir({ id: f.id, titulo: f.titulo })} />
        ))}
        {texto && !igual && <Opcion icono={<IconoMas />} titulo={`Crear «${texto}»`} detalle="Festival nuevo, con solo el nombre: sus fechas salen de sus actividades." onClick={() => onElegir({ nuevo: texto })} />}
      </div>
      {!encontrados.length && !texto && <p className={pasos.aviso}>Escribe el nombre del festival. Aquí salen los que tú publicaste.</p>}
    </Hoja>
  );
}

/** El texto del renglón «Parte de un festival» con uno puesto. */
export const nombreDePadre = (p: Padre): string => ("id" in p ? p.titulo : p.nuevo);


