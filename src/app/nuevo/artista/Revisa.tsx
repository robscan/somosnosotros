"use client";

import Link from "next/link";
import { PiePaso } from "@/components/PorPasos";
import Boton from "@/components/ui/Boton";
import Casilla from "@/components/ui/Casilla";
import { IconoBandera, IconoEtiqueta, IconoMas, IconoPersona, IconoPersonas } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import { etiquetaArtista, etiquetaDisciplina, etiquetaTipoArtista, hrefArtista, type ArtistaResumen, type ErroresArtista } from "@/lib/artistas";
import { Dato, turno } from "../evento/Revisa";
import { resumenMas, type Paso, type Respuestas } from "./pasos";
import evento from "../evento/AltaEvento.module.css";
import styles from "./AltaArtista.module.css";

type Props = {
  r: Respuestas;
  errores: ErroresArtista;
  /** El error que no es de un dato («No se pudo guardar»), encima del botón. */
  general?: string;
  /** La ficha que ya tiene ese nombre en esa ciudad (lo que se ve en el directorio o lo que contestó el servidor): no se publica otra. */
  repetido: ArtistaResumen | null;
  enviando: boolean;
  /** Lo que falta todavía, dicho en el botón; null si ya se puede publicar. */
  falta: string | null;
  /** El formulario escondido que publica (el botón va en el pie, fuera de él). */
  formulario: string;
  onAbrir: (paso: Paso) => void;
  /** Solista, grupo o colectivo: abre su hoja. */
  onEs: () => void;
  onCiudad: () => void;
  onSoy: (soy: boolean) => void;
};

/** «Soy yo» si es solista; «Es mi grupo» si es grupo o colectivo; las dos mientras no se sepa. */
export function textoSoy(tipo: Respuestas["tipo"]): string {
  return tipo === "solista" ? "Soy yo" : tipo ? "Es mi grupo" : "Soy yo / es mi grupo";
}

/**
 * «Revisa» del alta de artista (prototipo firmado, casos 5 a 7): el nombre como título y cada dato en su renglón sin etiqueta a la vista
 * (OL-297): qué hace con su subcategoría (icono de etiqueta; «Cambiar» vuelve a «¿Qué hace?»), solista, grupo o colectivo (si el nombre no
 * lo dijo, el renglón está por completar y el botón lo dice: nunca «Solista» por omisión; abre una hoja de tres opciones), la ciudad (la de
 * contexto, cambiable) y la casilla «Soy yo» / «Es mi grupo» con su consecuencia a la vista; lo opcional, «Foto, portada, redes o
 * descripción», punteado. Los errores del servidor salen junto a su dato; si ya hay una ficha con ese nombre en esa ciudad, se dice con su
 * enlace y no se publica otra. Entra de abajo para arriba como «Revisa» del evento.
 */
export default function Revisa({ r, errores, general, repetido, enviando, falta, formulario, onAbrir, onEs, onCiudad, onSoy }: Props) {
  const hace = r.disciplina ? `${etiquetaDisciplina(r.disciplina)}${r.detalle ? ` · ${r.detalle}` : ""}` : null;
  return (
    <>
      <h2 className={`${evento.titulo} ${evento.sube}`} style={turno(0)} tabIndex={-1}>
        {r.nombre}
      </h2>
      {errores.nombre && (
        <p className={canon.error} role="alert">
          {errores.nombre}
        </p>
      )}
      {repetido && (
        <p className={canon.existe} role="alert">
          <IconoPersonas width={20} height={20} />
          <span>
            <b>Ya tiene ficha en {r.ciudad}:</b>{" "}
            <Link href={hrefArtista(repetido)} replace>
              {repetido.nombre}
            </Link>{" "}
            · {etiquetaArtista(repetido)}. Ábrela y, si es tuya, dilo ahí.
          </span>
        </p>
      )}
      <ul className={`${renglon.renglones} ${evento.fija}`}>
        <Dato icono={<IconoEtiqueta width={20} height={20} />} clave="Qué hace" orden={1} valor={hace} falta="Falta la disciplina" error={errores.disciplina ?? errores.detalle} onAbrir={() => onAbrir("hace")} />
        <Dato
          icono={r.tipo === "solista" ? <IconoPersona width={20} height={20} /> : <IconoPersonas width={20} height={20} />}
          clave="Es"
          orden={2}
          valor={r.tipo ? etiquetaTipoArtista(r.tipo) : null}
          falta="Falta si es solista o grupo"
          error={errores.tipo}
          onAbrir={onEs}
        />
        <Dato icono={<IconoBandera width={20} height={20} />} clave="Ciudad" orden={3} valor={r.ciudad || null} falta="Falta la ciudad" onAbrir={onCiudad} />
        <li className={`${styles.soy} ${evento.sube}`} style={turno(4)}>
          <Casilla titulo={textoSoy(r.tipo)} detalle="Podrás editar la ficha y publicar sus fechas" marcada={r.soy} onCambio={onSoy} />
        </li>
        <Dato
          icono={<IconoMas width={20} height={20} />}
          clave="Foto, portada, redes o descripción"
          orden={5}
          valor={resumenMas(r)}
          falta="Foto, portada, redes o descripción"
          opcional
          error={errores.foto ?? errores.portada ?? errores.descripcion ?? errores.enlaces}
          onAbrir={() => onAbrir("mas")}
        />
      </ul>
      <PiePaso>
        {general && !repetido && (
          <p className="aviso-error" role="alert">
            {general}
          </p>
        )}
        <Boton type={falta ? "button" : "submit"} form={formulario} disabled={enviando} aria-busy={enviando || undefined} aria-disabled={falta ? true : undefined}>
          {enviando ? "Publicando…" : (falta ?? "Publicar artista")}
        </Boton>
      </PiePaso>
    </>
  );
}
