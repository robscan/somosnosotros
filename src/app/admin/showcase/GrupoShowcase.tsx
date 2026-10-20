import Link from "next/link";
import { IconoChevronDerecha, IconoDestello } from "@/components/ui/Iconos";
import renglon from "@/components/ui/Renglon.module.css";
import { cargarResumenShowcase } from "./consultas";
import admin from "../admin.module.css";

/**
 * El grupo «Showcase» de la portada de Administración (OL-426; lo firmado en OL-425): al nivel de Grafo cultural, con el destello y «686
 * candidatos · 7 invitados». Lee sus dos cifras aparte: si fallan, el renglón sigue y solo falta su detalle.
 */
export default async function GrupoShowcase() {
  const r = await cargarResumenShowcase();
  return (
    <>
      <h2 className={admin.grupo}>Showcase</h2>
      <ul className={renglon.tarjeta}>
        <li>
          <Link href="/admin/showcase" className={admin.fila}>
            <IconoDestello width={20} height={20} />
            <b>Showcase</b>
            {r && <small>{`${r.candidatos} ${r.candidatos === 1 ? "candidato" : "candidatos"} · ${r.invitados} ${r.invitados === 1 ? "invitado" : "invitados"}`}</small>}
            <span className={admin.total}>
              <IconoChevronDerecha />
            </span>
          </Link>
        </li>
      </ul>
    </>
  );
}
