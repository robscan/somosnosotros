"use client";

import { useState } from "react";
import type { ArtistaSeguido, LugarSeguido } from "@/app/personas/consultas";
import RenglonArtista from "./RenglonArtista";
import RenglonLugar from "./RenglonLugar";
import { Chip, Chips, Cuenta } from "./ui/Chip";
import Grupo from "./ui/Grupo";
import type { EstadoBotonRenglon } from "./ui/BotonRenglon";

/** A partir de cuántos seguidos aparecen los chips para filtrar (misma regla que las listas de Lugares y Artistas). */
export const UMBRAL_CHIPS_SEGUIDOS = 12;
type Filtro = "todo" | "lugares" | "artistas";

/** Los gestos de quien mira sobre un tipo de renglón (useSeguirEnLista): su botón "Seguir"/"Sigues". */
export type GestosSeguir = { boton: (id: string, nombre: string) => EstadoBotonRenglon };

type Props = {
  lugares: LugarSeguido[];
  artistas: ArtistaSeguido[];
  /** Con chips o con subtítulos: se decide al abrir, para que no cambie mientras se quitan renglones. */
  conChips: boolean;
  /** Sin gestos, los renglones solo abren la ficha. */
  lugar?: GestosSeguir;
  artista?: GestosSeguir;
};

/**
 * Lo que sigue una persona: lugares (foto cuadrada) y artistas (redonda) en grupos con su título pegado (`ui/Grupo`), como los
 * días de "Va a". Con muchos seguidos, chips para ver solo lugares o solo artistas (pedido del founder, 2026-09-15). Los
 * renglones son los de las listas de Lugares y Artistas, con el botón "Sigues" de quien mira (OL-057, OL-104).
 */
export default function ListaSeguidos({ lugares, artistas, conChips, lugar, artista }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const total = lugares.length + artistas.length;
  const verLugares = filtro !== "artistas" && lugares.length > 0;
  const verArtistas = filtro !== "lugares" && artistas.length > 0;
  return (
    <>
      {conChips && (
        <Chips ariaLabel="Qué ver">
          <Chip activo={filtro === "todo"} onClick={() => setFiltro("todo")}>
            Todo
            <Cuenta n={total} />
          </Chip>
          <Chip activo={filtro === "lugares"} onClick={() => setFiltro("lugares")}>
            Lugares
            <Cuenta n={lugares.length} />
          </Chip>
          <Chip activo={filtro === "artistas"} onClick={() => setFiltro("artistas")}>
            Artistas
            <Cuenta n={artistas.length} />
          </Chip>
        </Chips>
      )}
      {verLugares && (
        <Grupo titulo={conChips ? undefined : "Lugares"} cuenta={lugares.length}>
          {lugares.map((l) => (
            <RenglonLugar key={l.id} lugar={l} boton={lugar?.boton(l.id, l.nombre)} />
          ))}
        </Grupo>
      )}
      {verArtistas && (
        <Grupo titulo={conChips ? undefined : "Artistas"} cuenta={artistas.length}>
          {artistas.map((a) => (
            <RenglonArtista key={a.id} artista={a} boton={artista?.boton(a.id, a.nombre)} />
          ))}
        </Grupo>
      )}
    </>
  );
}
