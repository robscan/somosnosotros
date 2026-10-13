import { notFound, redirect } from "next/navigation";
import { cargarTuAnio } from "@/lib/cargarTuAnio";
import { usuarioActual } from "@/lib/supabase/servidor";
import { hrefTuAnio, textoAlternativo, versionTuAnio, type SujetoTuAnio } from "@/lib/tuAnio";
import VistaTuAnio from "./VistaTuAnio";

/**
 * La pantalla de «Tu año» (OL-394) para las tres rutas: `/tu-anio` (la persona), `/artistas/<slug>/tu-anio` y `/lugares/<slug>/tu-anio`. Lee lo
 * mismo que la ruta de la imagen (`cargarTuAnio`, solo para quien gestiona): sin sesión, a Entrar; sin permiso o sin nada este año, 404. La
 * imagen se ve a 720 y se comparte a 1080; `v` cambia si cambia lo que dice.
 */
export default async function PantallaTuAnio({ que, id, ruta }: { que: SujetoTuAnio; id?: string; ruta: string }) {
  const datos = await cargarTuAnio(que, id);
  if (!datos) {
    if (!(await usuarioActual())) redirect(`/entrar?siguiente=${encodeURIComponent(ruta)}`);
    notFound();
  }
  const base = { que, id: datos.id, v: versionTuAnio(datos.resumen) };
  return (
    <VistaTuAnio
      titulo={datos.resumen.periodo.titulo}
      que={que}
      volver={datos.volver}
      imagen={hrefTuAnio({ ...base, ancho: 720 })}
      completa={hrefTuAnio({ ...base, ancho: 1080 })}
      descarga={hrefTuAnio({ ...base, ancho: 1080, descarga: true })}
      archivo={datos.archivo}
      alt={textoAlternativo(datos.resumen)}
    />
  );
}
