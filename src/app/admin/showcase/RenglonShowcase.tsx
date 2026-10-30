import Link from "next/link";
import { IconoChevronDerecha, IconoDestello } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { lineaShowcase } from "@/lib/portadaAdmin";
import { cargarResumenShowcase } from "./consultas";

/**
 * El renglón «Showcase» de la portada de Administración, en el grupo Difusión (OL-494, variante C firmada del prototipo OL-493: presentar
 * artistas a foros, gestores, becas y mecenas es dar a conocer, como Instagram). Con el destello y «Artistas para presentar a foros · 16
 * candidatos · 2 invitados». Lee sus dos cifras aparte: si fallan, el renglón sigue y solo dice qué es.
 */
export default async function RenglonShowcase() {
  const r = await cargarResumenShowcase();
  return (
    <li>
      <Link href="/admin/showcase" className={renglon.ajuste}>
        <IconoDestello width={20} height={20} />
        <b>Showcase</b>
        <small>{lineaShowcase(r)}</small>
        <span>
          <IconoChevronDerecha />
        </span>
      </Link>
    </li>
  );
}
