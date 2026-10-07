"use client";

import type { CSSProperties, ReactNode } from "react";
import { PiePaso } from "@/components/PorPasos";
import Boton from "@/components/ui/Boton";
import { IconoBoleto, IconoCamara, IconoPersonas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { unirNombres, type ArtistaResumen } from "@/lib/artistas";
import { COOPERACION_SOLIDARIA, type ErroresEvento } from "@/lib/eventos";
import { HORARIOS_POR_DIA, cuandoVariosDias, diaLocal, formatearCuando, localAIso, rangoCorto, yaPaso } from "@/lib/fechas";
import type { LugarResumen } from "@/lib/lugares";
import { NOMBRE_RESERVADO, dondeResuelto, finDe, inicioDe, nombreDelSitio, type Paso, type Respuestas } from "./pasos";
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
};

/** Lo que dice el botón del pie, publicando o guardando. */
const BOTON = { publicar: ["Publicar", "Publicando…"], editar: ["Guardar cambios", "Guardando…"] } as const;

/** La nota de «Dónde» de un sitio reservado que ya no tiene su dirección (se retiró por privacidad, siete días después del evento). */
export const DIRECCION_RETIRADA = "La dirección ya no está disponible por privacidad. Si reprogramas el evento, añade una nueva.";

/**
 * «Revisa» (prototipo firmado, bitácora 323): el nombre como título y cada dato en su renglón sin etiqueta a la vista (OL-297: el icono y
 * el valor dicen qué es; la clave queda para el lector de pantalla). Tocar un renglón abre solo su pregunta y, al contestarla, se vuelve
 * aquí. Lo que falta lo dice el propio valor, con la línea de «por completar». Lo opcional es un enlace quieto que no compite con
 * «Publicar». Los errores del servidor salen junto a su dato, como en el alta de siempre. Con cartel, la cabeza lleva su miniatura y el
 * sello «Leído del cartel» (OL-302); los datos leídos y los contestados se ven iguales.
 *
 * Al editar (OL-319) es la pantalla de entrada, con todo el evento puesto: el botón dice «Guardar cambios», bajo el nombre van «Cambiar
 * nombre» y, con cartel, «Cambiar cartel» (sin cartel, un renglón opcional «Cartel · Agregar») y lo opcional que ya tiene algo dice «Cambiar…» en
 * vez de «Agregar…».
 */
export default function Revisa({ r, zona, lugar, mios, cartel, errores, general, enviando, falta, formulario, onAbrir, editar }: Props) {
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
  // Con cartel entra la cabeza entera (la foto, el sello y el nombre, como una pieza); sin él, el nombre. Al editar, el nombre lleva
  // «Cambiar nombre» debajo (en el alta se cambia con Atrás); sin la palabra, «Cambiar» a secas no diría si es el nombre o el cartel.
  const titulo = (
    <>
      <h2 className={cartel ? styles.titulo : `${styles.titulo} ${styles.sube}`} style={cartel ? undefined : turno(0)} tabIndex={-1}>
        {r.nombre}
      </h2>
      {editar && (
        <Boton type="button" variante="texto" alto="control" ancho="contenido" className={cartel ? styles.cambiarNombre : `${styles.cambiarNombre} ${styles.sube}`} style={cartel ? undefined : turno(0)} onClick={() => onAbrir("nombre")}>
          Cambiar nombre
        </Boton>
      )}
    </>
  );
  // Los renglones entran del 1 al último; «Agregar…» tras ellos (Quién solo está si hay artistas; al editar sin cartel, el renglón del cartel).
  const conQuien = r.quien.length > 0;
  const renglones = 3 + (conQuien ? 1 : 0) + (editar && !cartel ? 1 : 0);
  const [boton, ocupado] = BOTON[editar ? "editar" : "publicar"];
  // Al editar, lo opcional que ya tiene algo se cambia, no se agrega.
  const conExtras = !!(editar && (conQuien || r.descripcion.trim() || r.enlace.trim()));
  return (
    <>
      {cartel ? (
        <CabezaCartel
          foto={cartel.url}
          leido={cartel.leido}
          className={styles.sube}
          style={turno(0)}
          onCambiar={editar?.onCartel}
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
        <Dato
          icono={<IconoReloj width={20} height={20} />}
          clave="Cuándo"
          orden={1}
          valor={cuando}
          falta={r.dias ? "Falta la hora" : "Falta el día y la hora"}
          error={errores.inicio ?? errores.fin ?? errores.sesiones}
          nota={inicio && yaPaso(inicioDe(r), new Date(), zona) ? "Esa hora ya pasó." : undefined}
          onAbrir={() => onAbrir(r.dias && (!cuando || r.sesiones) ? "hora" : "dia")}
        />
        <Dato
          icono={<IconoPin width={20} height={20} />}
          clave="Dónde"
          orden={2}
          valor={dondeResuelto(r.sitio) ? nombreDelSitio(r.sitio, lugar) : null}
          detalle={r.sitio.modo === "reservado" && nombreDelSitio(r.sitio, lugar) !== NOMBRE_RESERVADO ? "Sitio reservado" : undefined}
          falta="Falta el lugar"
          error={errores.lugar_id ?? errores.sitio_texto ?? errores.sitio_direccion ?? errores.direccion_privada}
          nota={r.sitio.modo === "reservado" && r.sitio.otro.direccionRetirada ? DIRECCION_RETIRADA : undefined}
          onAbrir={() => onAbrir("donde")}
        />
        <Dato icono={<IconoBoleto width={20} height={20} />} clave="Cuánto" orden={3} valor={cuanto} falta="Falta el precio" error={errores.precio} onAbrir={() => onAbrir("cuanto")} />
        {conQuien && (
          <Dato
            icono={<IconoPersonas width={20} height={20} />}
            clave="Quién"
            orden={4}
            valor={unirNombres(r.quien.map((q) => (q.id && mios.some((m) => m.id === q.id) ? `${q.nombre} · tú` : q.nombre)))}
            onAbrir={() => onAbrir("mas")}
          />
        )}
        {/* Al editar un evento sin cartel: ponerle uno (con la cabeza, si ya lo tiene, se cambia o se quita). */}
        {editar && !cartel && <Dato icono={<IconoCamara width={20} height={20} />} clave="Cartel" orden={renglones} valor={null} falta="Cartel" opcional onAbrir={editar.onCartel} />}
      </ul>
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
export function Dato({ icono, clave, orden, valor, detalle, falta, opcional, error, nota, onAbrir }: { icono: ReactNode; clave: string; orden: number; valor: ReactNode; detalle?: string; falta?: string; opcional?: boolean; error?: string; nota?: string; onAbrir: () => void }) {
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
      <Boton type="button" variante="texto" alto="control" ancho="contenido" onClick={onAbrir} aria-label={`${accion} ${clave.toLowerCase()}`}>
        {accion}
      </Boton>
      {(error ?? nota) && (
        <p className={renglon.nota} role={error ? "alert" : undefined}>
          {error ?? nota}
        </p>
      )}
    </li>
  );
}
