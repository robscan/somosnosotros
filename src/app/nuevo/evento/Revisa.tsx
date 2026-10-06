"use client";

import type { CSSProperties, ReactNode } from "react";
import { PiePaso } from "@/components/PorPasos";
import Boton from "@/components/ui/Boton";
import { IconoBoleto, IconoPersonas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
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
const turno = (orden: number) => ({ "--orden": orden }) as CSSProperties;

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
};

/**
 * «Revisa» (prototipo firmado, bitácora 323): el nombre como título y cada dato en su renglón sin etiqueta a la vista (OL-297: el icono y
 * el valor dicen qué es; la clave queda para el lector de pantalla). Tocar un renglón abre solo su pregunta y, al contestarla, se vuelve
 * aquí. Lo que falta lo dice el propio valor, con la línea de «por completar». Lo opcional es un enlace quieto que no compite con
 * «Publicar». Los errores del servidor salen junto a su dato, como en el alta de siempre. Con cartel, la cabeza lleva su miniatura y el
 * sello «Leído del cartel» (OL-302); los datos leídos y los contestados se ven iguales.
 */
export default function Revisa({ r, zona, lugar, mios, cartel, errores, general, enviando, falta, formulario, onAbrir }: Props) {
  const inicio = localAIso(inicioDe(r), zona);
  const ahora = new Date();
  const finLocal = finDe(r);
  const fin = finLocal ? localAIso(finLocal, zona) : null;
  // En varios días las horas van en su propio `span` sin saltos de línea: un renglón angosto parte entre los días y las horas, nunca dentro de ellas.
  // Con horario por día (OL-311) no hay un horario que decir: «horarios por día».
  const varios = r.sesiones && r.dias?.hasta ? { dias: rangoCorto(r.dias.desde, r.dias.hasta, diaLocal(ahora, zona)), horas: HORARIOS_POR_DIA } : inicio && finLocal !== null ? cuandoVariosDias(inicio, fin, ahora, zona) : null;
  const cuando = !inicio || finLocal === null ? null : varios ? (
    <>
      {varios.dias} · <span className={styles.hora}>{varios.horas}</span>
    </>
  ) : (
    formatearCuando(inicio, fin, ahora, zona)
  );
  const cuanto = r.costo === "gratis" ? "Gratis" : r.costo === "cooperacion" ? COOPERACION_SOLIDARIA : r.costo === "precio" && r.precio ? `$${r.precio}` : null;
  const extras = errores.descripcion ?? errores.enlace ?? errores.imagen;
  // Con cartel entra la cabeza entera (la foto, el sello y el nombre, como una pieza); sin él, el nombre.
  const titulo = (
    <h2 className={cartel ? styles.titulo : `${styles.titulo} ${styles.sube}`} style={cartel ? undefined : turno(0)} tabIndex={-1}>
      {r.nombre}
    </h2>
  );
  // Los renglones entran del 1 al último; «Agregar…» tras ellos (Quién solo está si hay artistas).
  const renglones = r.quien.length > 0 ? 4 : 3;
  return (
    <>
      {cartel ? (
        <CabezaCartel foto={cartel.url} leido={cartel.leido} className={styles.sube} style={turno(0)}>
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
          onAbrir={() => onAbrir("donde")}
        />
        <Dato icono={<IconoBoleto width={20} height={20} />} clave="Cuánto" orden={3} valor={cuanto} falta="Falta el precio" error={errores.precio} onAbrir={() => onAbrir("cuanto")} />
        {r.quien.length > 0 && (
          <Dato
            icono={<IconoPersonas width={20} height={20} />}
            clave="Quién"
            orden={4}
            valor={unirNombres(r.quien.map((q) => (q.id && mios.some((m) => m.id === q.id) ? `${q.nombre} · tú` : q.nombre)))}
            onAbrir={() => onAbrir("mas")}
          />
        )}
      </ul>
      <Boton type="button" variante="quieto" className={styles.sube} style={turno(renglones + 1)} onClick={() => onAbrir("mas")}>
        Agregar artistas, descripción o enlace
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
          </p>
        )}
        <Boton type={falta ? "button" : "submit"} form={formulario} disabled={enviando} aria-busy={enviando || undefined} aria-disabled={falta ? true : undefined}>
          {enviando ? "Publicando…" : (falta ?? "Publicar")}
        </Boton>
      </PiePaso>
    </>
  );
}

/** Un dato de «Revisa»: el renglón resuelto sin clave a la vista (`ui/Renglon`); todo él abre su pregunta («Cambiar», o «Poner» si falta).
 *  `detalle` va en letra suave bajo el valor («Sitio reservado»); `orden` es su turno en la entrada. */
function Dato({ icono, clave, orden, valor, detalle, falta, error, nota, onAbrir }: { icono: ReactNode; clave: string; orden: number; valor: ReactNode; detalle?: string; falta?: string; error?: string; nota?: string; onAbrir: () => void }) {
  const accion = valor ? "Cambiar" : "Poner";
  return (
    <li className={`${renglon.resuelto} ${renglon.sinClave} ${valor ? "" : renglon.pendiente} ${styles.dato} ${styles.sube}`} style={turno(orden)}>
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
