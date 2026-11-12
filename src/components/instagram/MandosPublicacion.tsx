"use client";

import CampoLargo from "@/components/ui/CampoLargo";
import Casilla from "@/components/ui/Casilla";
import { Chip, Chips } from "@/components/ui/Chip";
import hoja from "@/components/ui/Hoja.module.css";
import { IconoPin } from "@/components/ui/Iconos";
import admin from "@/app/admin/admin.module.css";
import { lineaDelCarrusel } from "@/lib/instagram/semanaDeFicha";
import { TOPE_CARACTERES } from "@/lib/instagram/texto";
import propia from "./HojaInstagram.module.css";

/**
 * Los mandos de una publicación de la semana de Instagram que se puede cambiar antes de salir (OL-479, firmados en el prototipo de OL-477), sacados de
 * la hoja de un día (`HojaDia`) para usarlos también en «Publicar en Instagram» de la ficha de un artista o de un lugar (OL-515: «reutilizando la
 * hoja», los mismos mandos y no una copia): a quién se etiqueta (chips con ✕ y «Volver a etiquetar»), la ubicación, el texto con su contador (y
 * «Volver al texto del sistema» si se cambió) y «También en Facebook». En una historia (9:16) no hay texto ni etiquetas que decidir: la nota.
 */
export default function MandosPublicacion({
  historia = false,
  etiquetas,
  todas,
  hayQuitadas,
  onQuitar,
  onVolverAEtiquetar,
  leyenda,
  sinEtiquetas,
  ubicacion,
  idCampo,
  texto,
  onTexto,
  cambiado = false,
  onTextoDelSistema,
  editable = true,
  facebook,
}: {
  historia?: boolean;
  /** Las cuentas que se etiquetan ahora (sin las quitadas). */
  etiquetas: string[];
  /** Todas las que se podrían etiquetar. */
  todas: string[];
  hayQuitadas: boolean;
  onQuitar: (cuenta: string) => void;
  onVolverAEtiquetar: () => void;
  /** Lo que dice arriba de los chips: «Se etiqueta en la foto y se menciona en el texto:». */
  leyenda: string;
  /** La nota cuando no hay nadie a quien etiquetar (un lugar sin Instagram); null, nada. */
  sinEtiquetas: string | null;
  /** «Ubicación: San Luis Potosí» o «Sin ubicación: …». */
  ubicacion: string;
  idCampo: string;
  texto: string;
  onTexto: (texto: string) => void;
  /** El texto ya no es el que arma el sistema: se ofrece volver a él. */
  cambiado?: boolean;
  onTextoDelSistema?: () => void;
  editable?: boolean;
  /** «También en Facebook»; null si no se ofrece (ya salió). */
  facebook: { marcada: boolean; onCambio: (si: boolean) => void; disabled?: boolean } | null;
}) {
  return (
    <>
      {historia ? (
        <p className={hoja.nota}>La historia sale con la publicación y dura 24 horas: no lleva texto.</p>
      ) : (
        <>
          {todas.length > 0 ? (
            <>
              <p className={`${hoja.nota} ${propia.linea}`}>
                {etiquetas.length ? leyenda : "Sin etiquetas."}
                {hayQuitadas && (
                  <>
                    {" "}
                    <button type="button" className={admin.enlace} onClick={onVolverAEtiquetar}>
                      Volver a etiquetar
                    </button>
                  </>
                )}
              </p>
              {etiquetas.length > 0 && (
                <Chips ariaLabel="Etiquetas en la foto" envuelve>
                  {etiquetas.map((u) => (
                    <Chip key={u} variante="quitar" onClick={() => onQuitar(u)}>
                      {`@${u}`}
                    </Chip>
                  ))}
                </Chips>
              )}
            </>
          ) : sinEtiquetas ? (
            <p className={`${hoja.nota} ${propia.linea}`}>{sinEtiquetas}</p>
          ) : null}
          <p className={`${hoja.nota} ${propia.ubicacion}`}>
            <IconoPin width={16} height={16} />
            <span>{ubicacion}</span>
          </p>
          <CampoLargo id={idCampo} name="texto" etiqueta="Texto de la publicación" value={texto} onChange={(e) => onTexto(e.target.value)} maxLength={TOPE_CARACTERES} mostrarContador contadorSiempre disabled={!editable} />
          {cambiado && editable && onTextoDelSistema && (
            <p className={hoja.nota}>
              <button type="button" className={admin.enlace} onClick={onTextoDelSistema}>
                Volver al texto del sistema
              </button>
            </p>
          )}
        </>
      )}
      {facebook && <Casilla titulo="También en Facebook" detalle="En la página Somos Nosotrxs, con el enlace a su ficha." marcada={facebook.marcada} disabled={facebook.disabled} onCambio={facebook.onCambio} />}
    </>
  );
}

/** «Publicación 4:5» / «Historia 9:16»: qué se mira en la vista previa de una ficha (la publicación lleva su historia). */
export function ChipsFormato({ formato, onFormato }: { formato: "4x5" | "9x16"; onFormato: (f: "4x5" | "9x16") => void }) {
  return (
    <Chips ariaLabel="Formato">
      <Chip activo={formato === "4x5"} onClick={() => onFormato("4x5")}>
        Publicación 4:5
      </Chip>
      <Chip activo={formato === "9x16"} onClick={() => onFormato("9x16")}>
        Historia 9:16
      </Chip>
    </Chips>
  );
}

/**
 * OL-516: el carrusel de una ficha con eventos esa semana, en las dos hojas (la del día de la semana y la de «Publicar en Instagram» de la ficha):
 * «Sale con 3 imágenes: su tarjeta y sus 2 eventos de esta semana.» y todas las imágenes en su orden, en la misma tira del carrusel de la hoja de
 * un evento (`HojaInstagram`, OL-464), sin mover ni quitar: salen las que dice la ficha. En una historia, la nota de que lleva la tarjeta sola.
 */
export function TiraDeFicha({ historia = false, titulos, eventos, imagenDe }: { historia?: boolean; titulos: string[]; eventos: number; imagenDe: (n: number) => string }) {
  const linea = lineaDelCarrusel(titulos.length, eventos);
  if (!linea) return null;
  if (historia) return <p className={`${hoja.nota} ${propia.linea}`}>La historia lleva solo su tarjeta.</p>;
  return (
    <>
      <p className={`${hoja.nota} ${propia.linea}`}>{linea}</p>
      <ol className={propia.tira} aria-label="Imágenes del carrusel">
        {titulos.map((t, n) => (
          <li key={`${n}-${t}`} className={propia.lamina}>
            {/* eslint-disable-next-line @next/next/no-img-element -- la miniatura la dibuja el servidor a 240 de ancho, ya JPEG */}
            <img className={propia.miniatura} src={imagenDe(n)} alt={`${n + 1}: ${n === 0 ? `su tarjeta (${t})` : t}`} width={240} height={300} loading="lazy" />
          </li>
        ))}
      </ol>
    </>
  );
}
