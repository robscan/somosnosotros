import { Fragment, type JSX, type SVGProps } from "react";
import EnlaceExterno from "@/components/ui/EnlaceExterno";
import { IconoBandera, IconoBoleto, IconoDocumento, IconoEnlace, IconoEstrella, IconoLibro, IconoNota, IconoPincel } from "@/components/ui/Iconos";
import Plegado from "@/components/ui/Plegado";
import renglon from "@/components/ui/Renglon.module.css";
import { cargarHitos } from "@/lib/cargarHitos";
import { claseHito, detalleHito, etiquetaHito, hitosPorAnio, resumenHitos, TITULO_HITOS, type ClaseHito } from "@/lib/hitos";

type P = SVGProps<SVGSVGElement>;
/** El icono de cada clase: la estrella el premio, la bandera lo que se gana por convocatoria, la nota el disco, el libro el libro… */
const ICONO: Record<ClaseHito, (p: P) => JSX.Element> = {
  premio: IconoEstrella,
  beca: IconoBandera,
  residencia: IconoBandera,
  seleccion: IconoBandera,
  disco: IconoNota,
  libro: IconoLibro,
  exposicion: IconoPincel,
  obra: IconoPincel,
  presentacion: IconoBoleto,
  prensa: IconoDocumento,
};

/**
 * «Reconocimientos y obra» (OL-445): los hitos públicos del artista —lo que la administración aceptó de lo que descubren las rutinas—, plegados
 * como la «Trayectoria» (`ui/Plegado`): su renglón dice cuánto hay («2 premios · 1 disco · 5 presentaciones») y, al abrir, van por año (premios
 * y becas primero), cada uno con qué es, su título, la fuente y el día, y lleva a la fuente (`EnlaceExterno`: avisa antes de salir). Sin hitos,
 * no existe. Consulta aparte (va en `<Suspense>`).
 */
export default async function SeccionHitos({ artistaId }: { artistaId: string }) {
  const hitos = await cargarHitos(artistaId);
  if (!hitos.length) return null;
  return (
    <Plegado id="reconocimientos" titulo={TITULO_HITOS} cuenta={resumenHitos(hitos) ?? ""}>
      {hitosPorAnio(hitos).map((g) => (
        <Fragment key={g.titulo}>
          <h3>{g.titulo}</h3>
          <ul aria-label={`${TITULO_HITOS} · ${g.titulo}`}>
            {g.hitos.map((h) => {
              const Icono = ICONO[claseHito(h)];
              return (
                <li key={h.id}>
                  <EnlaceExterno href={h.url} className={renglon.dato}>
                    <Icono width={20} height={20} />
                    <b>{h.titulo}</b>
                    <small>
                      {etiquetaHito(h)} · {detalleHito(h)}
                    </small>
                    <IconoEnlace />
                  </EnlaceExterno>
                </li>
              );
            })}
          </ul>
        </Fragment>
      ))}
    </Plegado>
  );
}
