"use client";

import Link from "next/link";
import { PiePaso } from "@/components/PorPasos";
import Boton from "@/components/ui/Boton";
import { IconoBandera, IconoEtiqueta, IconoMas, IconoPin, IconoReloj } from "@/components/ui/Iconos";
import canon from "@/components/ui/FormularioCanon.module.css";
import renglon from "@/components/ui/Renglon.module.css";
import TextoHorario from "@/app/lugares/TextoHorario";
import { etiquetaLugar, etiquetaTipo, hrefLugar, type ErroresLugar, type LugarResumen } from "@/lib/lugares";
import { Dato, turno } from "../evento/Revisa";
import { resumenMas, type Paso, type Respuestas } from "./pasos";
import type { AlElegir } from "./PasosLugar";
import evento from "../evento/AltaEvento.module.css";
import styles from "./AltaLugar.module.css";

type Props = {
  r: Respuestas;
  /** La ciudad con que se publica (la del mapa, la de contexto cercana o la elegida a mano); null si falta. */
  ciudad: string | null;
  /** La ciudad la tuvo que decir la persona: su renglón se ve (con «Cambiar», o pendiente si aún falta). */
  pedirCiudad: boolean;
  errores: ErroresLugar;
  /** El error que no es de un dato («No se pudo guardar el lugar»), encima del botón. */
  general?: string;
  /** Lugares parecidos a menos de 150 m que encontró el servidor al publicar: «¿Es este?» antes de publicar otro. */
  parecidos?: LugarResumen[];
  enviando: boolean;
  /** Lo que falta todavía, dicho en el botón; null si ya se puede publicar. */
  falta: string | null;
  /** El formulario escondido que publica (el botón va en el pie, fuera de él). */
  formulario: string;
  onAbrir: (paso: Paso) => void;
  onHorario: () => void;
  onCiudad: () => void;
  /** «No, es otro: publicar de todos modos». */
  onConfirmar: () => void;
  /** Viniendo de un sitio (OL-366): elegir uno de los parecidos le liga sus eventos antes de abrir su ficha. */
  alElegir?: AlElegir;
};

/**
 * «Revisa» del alta de lugar (prototipo firmado, caso 1 a 4): el nombre como título y cada dato en su renglón sin etiqueta a la vista (OL-297):
 * la dirección («Cambiar» vuelve al mapa), el tipo («Cambiar» vuelve a la lista), la ciudad solo si hubo que pedirla, el horario (opcional,
 * abre su hoja: días arriba y horas debajo, ya estructurado) y «Foto, descripción o redes» (opcional). Los errores del servidor salen junto a
 * su dato; si el servidor encontró uno parecido cerca, «¿Es este?» con su ficha y «No, es otro: publicar de todos modos», como en el formulario
 * de siempre. Entra de abajo para arriba como «Revisa» del evento.
 */
export default function Revisa({ r, ciudad, pedirCiudad, errores, general, parecidos, enviando, falta, formulario, onAbrir, onHorario, onCiudad, onConfirmar, alElegir }: Props) {
  const tipo = r.tipo ? etiquetaLugar({ tipo: r.tipo, detalle: r.detalle.trim() || null }) : null;
  const mas = resumenMas(r);
  const renglones = pedirCiudad ? 5 : 4;
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
      <ul className={`${renglon.renglones} ${evento.fija}`}>
        <Dato icono={<IconoPin width={20} height={20} />} clave="Dónde" orden={1} valor={r.sitio ? r.sitio.direccion || "Pin en el mapa" : null} falta="Falta la ubicación" error={errores.ubicacion ?? errores.direccion ?? (pedirCiudad ? undefined : errores.ciudad)} onAbrir={() => onAbrir("mapa")} />
        <Dato icono={<IconoEtiqueta width={20} height={20} />} clave="Tipo" orden={2} valor={tipo} falta="Falta el tipo" error={errores.tipo ?? errores.detalle} onAbrir={() => onAbrir("tipo")} />
        {pedirCiudad && <Dato icono={<IconoBandera width={20} height={20} />} clave="Ciudad" orden={3} valor={ciudad} falta="Falta la ciudad" error={errores.ciudad} onAbrir={onCiudad} />}
        <Dato icono={<IconoReloj width={20} height={20} />} clave="Horario" orden={renglones - 1} valor={r.horario.length ? <TextoHorario franjas={r.horario} /> : null} falta="Horario" opcional error={errores.horario} onAbrir={onHorario} />
        <Dato icono={<IconoMas width={20} height={20} />} clave="Foto, descripción o redes" orden={renglones} valor={mas} falta="Foto, descripción o redes" opcional error={errores.descripcion ?? errores.enlaces ?? errores.portada} onAbrir={() => onAbrir("mas")} />
      </ul>
      {parecidos && parecidos.length > 0 && (
        <div className={styles.parecidos} role="alert">
          <p>
            <b>¿Es este?</b> Ya hay un lugar con ese nombre muy cerca:
          </p>
          <ul>
            {parecidos.map((p) => (
              <li key={p.id}>
                <Link href={hrefLugar(p)} replace onClick={alElegir && ((e) => alElegir(e, p))}>
                  {[p.nombre, etiquetaTipo(p.tipo), p.direccion].filter(Boolean).join(" · ")}
                </Link>
              </li>
            ))}
          </ul>
          <Boton type="button" variante="secundario" onClick={onConfirmar}>
            No, es otro: publicar de todos modos
          </Boton>
        </div>
      )}
      <PiePaso>
        {general && (
          <p className="aviso-error" role="alert">
            {general}
          </p>
        )}
        <Boton type={falta ? "button" : "submit"} form={formulario} disabled={enviando} aria-busy={enviando || undefined} aria-disabled={falta ? true : undefined}>
          {enviando ? "Publicando…" : (falta ?? "Publicar lugar")}
        </Boton>
      </PiePaso>
    </>
  );
}
