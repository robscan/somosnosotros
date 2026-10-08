"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { HojaHorario } from "@/app/lugares/Horario";
import TextoHorario from "@/app/lugares/TextoHorario";
import { PiePaso } from "@/components/PorPasos";
import Boton from "@/components/ui/Boton";
import { IconoBoleto, IconoCalendario, IconoEstrella, IconoEtiqueta, IconoPersonas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { unirNombres, type ArtistaResumen } from "@/lib/artistas";
import { etiquetaHora } from "@/lib/calendario";
import { SIN_FOTO } from "@/lib/imagen";
import { COOPERACION_SOLIDARIA, nombreDeClase, type Clase, type ErroresEvento } from "@/lib/eventos";
import type { Franja } from "@/lib/horarioLugar";
import { HORARIOS_POR_DIA, cuandoVariosDias, diaConMesDe, diaLocal, formatearCuando, localAIso, rangoCorto, yaPaso } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import type { FestivalElegible } from "./contextoClase";
import { NOMBRE_RESERVADO, actosMarcados, dondeResuelto, finDe, inicioDe, nombreDelSitio, resumenPrograma, type Paso, type Respuestas } from "./pasos";
import { textoSesiones } from "./clasePorPasos";
import { HojaClase, HojaFestival, HojaInauguracion, nombreDePadre } from "./PasosClase";
import { CabezaCartel } from "./PasoCartel";
import type { CartelSubido } from "./useLeerCartel";
import styles from "./AltaEvento.module.css";

/** El turno de un elemento en la entrada de «Revisa» (`.sube` en el CSS): 0 es el primero y cada uno entra 50 ms después del anterior. */
export const turno = (orden: number) => ({ "--orden": orden }) as CSSProperties;

type Props = {
  r: Respuestas;
  zona: string;
  /** El lugar registrado elegido, si es en uno. */
  lugar: LugarResumen | undefined;
  mios: ArtistaResumen[];
  /** El cartel que se subió, si se subió uno: va arriba, con «Leído del cartel» si de él salieron datos. */
  cartel?: CartelSubido | null;
  errores: ErroresEvento;
  /** El error que no es de un dato («No se pudo publicar el evento completo»), encima del botón como en el alta de siempre. */
  general?: string;
  enviando: boolean;
  /** Lo que falta todavía, dicho en el botón; null si ya se puede publicar. */
  falta: string | null;
  /** El formulario escondido que publica (el botón va en el pie, fuera de él). */
  formulario: string;
  onAbrir: (paso: Paso) => void;
  /** Editar un evento ya publicado (OL-319): el botón dice «Guardar cambios», el cartel se cambia o se pone desde aquí (`onCartel`) y,
   *  si el evento cambió mientras se editaba, el error lleva el enlace a la versión de ahora (`conflicto`). */
  editar?: { onCartel: () => void; conflicto?: string };
  /** Cómo ocurre (OL-321): lo que cambian los renglones nuevos (la clase, el horario propio, la inauguración, el festival). */
  onCambiar?: (cambios: Partial<Respuestas>) => void;
  /** Elegir otra clase en «¿Cómo ocurre?»: lleva a su paso del tiempo si le falta, o se queda aquí. */
  onClase?: (clase: Clase) => void;
  /** El horario del lugar elegido: el de una exposición si no tiene uno propio. */
  horarioLugar?: readonly Franja[];
  /** Los festivales que se pueden elegir en «Parte de un festival». */
  festivales?: readonly FestivalElegible[];
  /** Las sedes de un festival en una línea («CC200 y Cineteca Alameda»). */
  sedes?: string;
  /** Editar un festival que ya existe: su programa se ve, no se cambia aquí (cada acto se edita en su ficha), y sigue siendo festival. */
  festivalGuardado?: { actos: number; resumen: string };
};

/** Lo que dice el botón del pie, publicando o guardando. */
const BOTON = { publicar: ["Publicar", "Publicando…"], editar: ["Guardar cambios", "Guardando…"] } as const;

/** Lo que dice el botón al publicar según la clase (prototipo, caso 1 a 4): «Publicar exposición», «Publicar el festival y 3 eventos». */
function botonDeClase(r: Respuestas): string {
  if (r.clase === "exposicion") return "Publicar exposición";
  if (r.clase === "taller") return "Publicar taller";
  if (r.clase === "festival") {
    const n = actosMarcados(r).length;
    return `Publicar el festival y ${n} ${n === 1 ? "evento" : "eventos"}`;
  }
  return "Publicar";
}

/** La nota de «Dónde» de un sitio reservado que ya no tiene su dirección (se retiró por privacidad, siete días después del evento). */
export const DIRECCION_RETIRADA = "La dirección ya no está disponible por privacidad. Si reprogramas el evento, añade una nueva.";

/**
 * «Revisa» (prototipo firmado, bitácora 323): el nombre como título y cada dato en su renglón sin etiqueta a la vista (OL-297: el icono y
 * el valor dicen qué es; la clave queda para el lector de pantalla). Tocar un renglón abre solo su pregunta y, al contestarla, se vuelve
 * aquí. Lo que falta lo dice el propio valor, con la línea de «por completar». Lo opcional es un enlace quieto que no compite con
 * «Publicar». Los errores del servidor salen junto a su dato, como en el alta de siempre. Con cartel, la cabeza lleva su miniatura y el
 * sello «Leído del cartel» (OL-302); los datos leídos y los contestados se ven iguales.
 *
 * Al editar (OL-319) es la pantalla de entrada, con todo el evento puesto: el botón dice «Guardar cambios», la cabeza va siempre con su
 * miniatura (el cartel, o el símbolo SN si no tiene) y dos lápices sin letreros, uno sobre la miniatura y otro junto al nombre (OL-349), y lo
 * opcional que ya tiene algo dice «Cambiar…» en vez de «Agregar…».
 */
export default function Revisa({ r, zona, lugar, mios, cartel, errores, general, enviando, falta, formulario, onAbrir, editar, onCambiar, onClase, horarioLugar = [], festivales = [], sedes, festivalGuardado }: Props) {
  const [hoja, setHoja] = useState<"clase" | "horario" | "inauguracion" | "festival" | null>(null);
  const cambiar = (cambios: Partial<Respuestas>) => {
    onCambiar?.(cambios);
    setHoja(null);
  };
  const inicio = localAIso(inicioDe(r), zona);
  const ahora = new Date();
  const finLocal = finDe(r);
  const fin = finLocal ? localAIso(finLocal, zona) : null;
  // En varios días las horas van en su propio `span` sin saltos de línea: un renglón angosto parte entre los días y las horas, nunca dentro de ellas.
  // Con horario por día (OL-311) no hay un horario que decir: «horarios por día».
  const varios = r.sesiones && r.dias?.hasta ? { dias: rangoCorto(r.dias.desde, r.dias.hasta, diaLocal(ahora, zona)), horas: HORARIOS_POR_DIA } : inicio && finLocal !== null ? cuandoVariosDias(inicio, fin, ahora, zona) : null;
  // En un día, igual: las horas («17:00–19:00») van juntas tras el último « · ».
  const unDia = inicio && finLocal !== null && !varios ? formatearCuando(inicio, fin, ahora, zona) : "";
  const corte = unDia.lastIndexOf(" · ");
  const partes = varios ? varios : corte > 0 ? { dias: unDia.slice(0, corte), horas: unDia.slice(corte + 3) } : null;
  const cuando = !inicio || finLocal === null ? null : partes ? (
    <>
      {partes.dias} · <span className={styles.hora}>{partes.horas}</span>
    </>
  ) : (
    unDia
  );
  const cuanto = r.costo === "gratis" ? "Gratis" : r.costo === "cooperacion" ? COOPERACION_SOLIDARIA : r.costo === "precio" && r.precio ? `$${r.precio}` : null;
  const extras = errores.descripcion ?? errores.enlace ?? errores.imagen;
  // Con cartel, o al editar, entra la cabeza entera (la miniatura, el sello y el nombre, como una pieza); en el alta sin cartel, el nombre.
  // Al editar, la cabeza lleva los lápices del cartel y del nombre (en el alta el nombre se cambia con Atrás); sin cartel, la miniatura es el
  // símbolo SN y su lápiz pone uno.
  const cabeza = !!(cartel || editar);
  const titulo = (
    <h2 className={cabeza ? styles.titulo : `${styles.titulo} ${styles.sube}`} style={cabeza ? undefined : turno(0)} tabIndex={-1}>
      {r.nombre}
    </h2>
  );
  // Los renglones entran del 1 al último; «Agregar…» tras ellos (Quién solo está si hay artistas).
  // Cómo ocurre (OL-321) suma su renglón arriba, el horario y la inauguración de una exposición y «Parte de un festival» (todo menos un festival).
  const conQuien = r.quien.length > 0;
  const expo = r.clase === "exposicion";
  const festival = r.clase === "festival";
  const conInauguracion = expo && r.sitio.modo !== "reservado";
  let turnoSiguiente = 0;
  const orden = () => ++turnoSiguiente;
  const renglones = 1 + 3 + (expo ? 1 : 0) + (conInauguracion ? 1 : 0) + (conQuien ? 1 : 0) + (festival ? 0 : 1);
  const [boton, ocupado] = editar ? BOTON.editar : [botonDeClase(r), BOTON.publicar[1]];
  const hoy = diaLocal(ahora, zona);
  const cuandoClase = expo
    ? { valor: r.visita?.desde && r.visita.hasta ? rangoCorto(r.visita.desde, r.visita.hasta, hoy) : null, falta: "Falta cuándo se puede visitar", paso: "visita" as const }
    : r.clase === "taller"
      ? { valor: textoSesiones(r, hoy), falta: "Faltan las sesiones", paso: "sesiones" as const }
      : festival
        ? { valor: festivalGuardado ? festivalGuardado.resumen : resumenPrograma(r, hoy), falta: "Falta una actividad", paso: "programa" as const }
        : null;
  // El horario de una exposición: el propio, el del lugar o «por confirmar». Con lugar con horario, «Cambiar» lleva al paso de la visita (allí
  // está la casilla «Horario del lugar»); sin él, abre la hoja de franjas.
  const horarioPropio = !!r.horario?.length;
  const horarioValor = horarioPropio && r.horario ? (
    <>
      Horario propio
      <small>
        <TextoHorario franjas={r.horario} />
      </small>
    </>
  ) : horarioLugar.length ? (
    <>
      Horario del lugar
      <small>
        <TextoHorario franjas={horarioLugar} />
      </small>
    </>
  ) : null;
  // Al editar, lo opcional que ya tiene algo se cambia, no se agrega.
  const conExtras = !!(editar && (conQuien || r.descripcion.trim() || r.enlace.trim()));
  return (
    <>
      {cabeza ? (
        <CabezaCartel
          foto={cartel?.url ?? SIN_FOTO}
          leido={!!cartel?.leido}
          className={styles.sube}
          style={turno(0)}
          editar={editar && { onCartel: editar.onCartel, onNombre: () => onAbrir("nombre") }}
        >
          {titulo}
        </CabezaCartel>
      ) : (
        titulo
      )}
      {errores.titulo && (
        <p className={canon.error} role="alert">
          {errores.titulo}
        </p>
      )}
      <ul className={`${renglon.renglones} ${styles.fija}`}>
        {/* Cómo ocurre (OL-321; doc 55 §2): la propuso el cartel o el título y se confirma aquí; «Cambiar» abre «¿Cómo ocurre?». */}
        <Dato icono={<IconoEtiqueta width={20} height={20} />} clave="Cómo ocurre" orden={orden()} valor={nombreDeClase(r.clase)} onAbrir={() => setHoja("clase")} />
        {cuandoClase ? (
          <Dato
            icono={<IconoCalendario width={20} height={20} />}
            clave="Cuándo"
            orden={orden()}
            valor={cuandoClase.valor}
            falta={cuandoClase.falta}
            error={errores.inicio ?? errores.fin ?? errores.sesiones}
            onAbrir={festivalGuardado ? undefined : () => onAbrir(cuandoClase.paso)}
          />
        ) : (
          <Dato
            icono={<IconoReloj width={20} height={20} />}
            clave="Cuándo"
            orden={orden()}
            valor={cuando}
            falta={r.dias ? "Falta la hora" : "Falta el día y la hora"}
            error={errores.inicio ?? errores.fin ?? errores.sesiones}
            nota={inicio && yaPaso(inicioDe(r), new Date(), zona) ? "Esa hora ya pasó." : undefined}
            onAbrir={() => onAbrir(r.dias && (!cuando || r.sesiones) ? "hora" : "dia")}
          />
        )}
        {expo && (
          <Dato
            icono={<IconoReloj width={20} height={20} />}
            clave="Horario"
            orden={orden()}
            valor={horarioValor}
            falta="Horario por confirmar"
            opcional
            error={errores.horario}
            onAbrir={() => (horarioLugar.length ? onAbrir("visita") : setHoja("horario"))}
          />
        )}
        {conInauguracion && (
          <Dato
            icono={<IconoEstrella width={20} height={20} />}
            clave="Inauguración"
            orden={orden()}
            valor={r.inauguracion ? `Inauguración · ${diaConMesDe(r.inauguracion.dia, ahora, zona)} · ${etiquetaHora(r.inauguracion.hora)}` : null}
            falta="Inauguración"
            opcional
            onAbrir={() => setHoja("inauguracion")}
          />
        )}
        {festival ? (
          !festivalGuardado && <Dato icono={<IconoPin width={20} height={20} />} clave="Sedes" orden={orden()} valor={sedes ? `Sedes: ${sedes}` : null} detalle={sedes ? "Por actividad" : undefined} falta="Las sedes, por actividad" onAbrir={festivalGuardado ? undefined : () => onAbrir("programa")} />
        ) : (
          <Dato
            icono={<IconoPin width={20} height={20} />}
            clave="Dónde"
            orden={orden()}
            valor={dondeResuelto(r.sitio) ? nombreDelSitio(r.sitio, lugar) : null}
            detalle={r.sitio.modo === "reservado" && nombreDelSitio(r.sitio, lugar) !== NOMBRE_RESERVADO ? "Sitio reservado" : undefined}
            falta="Falta el lugar"
            error={errores.lugar_id ?? errores.sitio_texto ?? errores.sitio_direccion ?? errores.direccion_privada}
            nota={r.sitio.modo === "reservado" && r.sitio.otro.direccionRetirada ? DIRECCION_RETIRADA : undefined}
            onAbrir={() => onAbrir("donde")}
          />
        )}
        <Dato icono={<IconoBoleto width={20} height={20} />} clave="Cuánto" orden={orden()} valor={cuanto} falta="Falta el precio" error={errores.precio} onAbrir={() => onAbrir("cuanto")} />
        {conQuien && (
          <Dato
            icono={<IconoPersonas width={20} height={20} />}
            clave="Quién"
            orden={orden()}
            valor={unirNombres(r.quien.map((q) => (q.id && mios.some((m) => m.id === q.id) ? `${q.nombre} · tú` : q.nombre)))}
            onAbrir={() => onAbrir("mas")}
          />
        )}
        {/* «Parte de un festival» (doc 55 §2): busca un festival propio por nombre o crea uno con solo el nombre. */}
        {!festival && <Dato icono={<IconoEtiqueta width={20} height={20} />} clave="Festival" orden={orden()} valor={r.padre ? `Parte de ${nombreDePadre(r.padre)}` : null} detalle={r.padre && "nuevo" in r.padre ? "Festival nuevo" : undefined} falta="Parte de un festival" opcional onAbrir={() => setHoja("festival")} />}
      </ul>
      {hoja === "clase" && (
        <HojaClase
          clase={r.clase}
          fija={!!festivalGuardado && festivalGuardado.actos > 0}
          onElegir={(clase) => {
            setHoja(null);
            if (clase !== r.clase) onClase?.(clase);
          }}
          onCerrar={() => setHoja(null)}
        />
      )}
      {hoja === "horario" && <HojaHorario titulo="¿Qué días se puede visitar?" franjas={r.horario ?? []} onListo={(franjas) => cambiar({ horario: franjas.length ? franjas : null })} onCerrar={() => setHoja(null)} />}
      {hoja === "inauguracion" && <HojaInauguracion inauguracion={r.inauguracion} zona={zona} onListo={(inauguracion) => cambiar({ inauguracion })} onCerrar={() => setHoja(null)} />}
      {hoja === "festival" && <HojaFestival padre={r.padre} festivales={festivales} onElegir={(padre) => cambiar({ padre })} onCerrar={() => setHoja(null)} />}
      <Boton type="button" variante="quieto" className={styles.sube} style={turno(renglones + 1)} onClick={() => onAbrir("mas")}>
        {conExtras ? "Cambiar artistas, descripción o enlace" : "Agregar artistas, descripción o enlace"}
      </Boton>
      {extras && (
        <p className={canon.error} role="alert">
          {extras}
        </p>
      )}
      <PiePaso>
        {general && (
          <p className="aviso-error" role="alert">
            {general}
            {editar?.conflicto && (
              <>
                {" "}
                <a href={editar.conflicto} target="_blank" rel="noopener noreferrer">
                  Ver versión actual en otra pestaña
                </a>
              </>
            )}
          </p>
        )}
        <Boton type={falta ? "button" : "submit"} form={formulario} disabled={enviando} aria-busy={enviando || undefined} aria-disabled={falta ? true : undefined}>
          {enviando ? ocupado : (falta ?? boton)}
        </Boton>
      </PiePaso>
    </>
  );
}

/** Un dato de «Revisa»: el renglón resuelto sin clave a la vista (`ui/Renglon`); todo él abre su pregunta («Cambiar», o «Poner» si falta).
 *  `detalle` va en letra suave bajo el valor («Sitio reservado»); `orden` es su turno en la entrada. Lo usa también «Revisa» del alta de lugar
 *  (OL-315): un dato `opcional` sin valor es el renglón punteado fino que dice «Agregar» (el horario, la foto), no uno por completar. */
export function Dato({ icono, clave, orden, valor, detalle, falta, opcional, error, nota, onAbrir }: { icono: ReactNode; clave: string; orden: number; valor: ReactNode; detalle?: string; falta?: string; opcional?: boolean; error?: string; nota?: string; /** Sin él, el renglón solo se lee (el programa de un festival guardado: cada acto se edita en su ficha). */ onAbrir?: () => void }) {
  const accion = valor ? "Cambiar" : opcional ? "Agregar" : "Poner";
  const estado = valor ? "" : opcional ? renglon.opcional : renglon.pendiente;
  return (
    <li className={`${renglon.resuelto} ${renglon.sinClave} ${estado} ${styles.dato} ${styles.sube}`} style={turno(orden)}>
      {icono}
      <small>{clave}</small>
      <b className={valor ? undefined : renglon.falta}>
        {valor ?? falta}
        {valor && detalle && <small>{detalle}</small>}
      </b>
      {onAbrir && (
        <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={onAbrir} aria-label={`${accion} ${clave.toLowerCase()}`}>
          {accion}
        </Boton>
      )}
      {(error ?? nota) && (
        <p className={renglon.nota} role={error ? "alert" : undefined}>
          {error ?? nota}
        </p>
      )}
    </li>
  );
}
