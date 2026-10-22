import { IconoDisciplina } from "@/components/RenglonArtista";
import { IconoPin } from "@/components/ui/Iconos";
import type { Disciplina } from "@/lib/artistas";
import type { FichaAdministrada } from "@/lib/asignarFichas";

/** El icono de la meta de una ficha (OL-447): el pin de un lugar o el de la disciplina de un artista, como en «Lo que publicó». */
export default function IconoFicha({ f }: { f: Pick<FichaAdministrada, "tipo" | "clase"> }) {
  return f.tipo === "lugar" ? <IconoPin width={15} height={15} /> : <IconoDisciplina disciplina={f.clase as Disciplina} />;
}
