import CamposSitio from "@/app/eventos/CamposSitio";
import type { Ciudad } from "@/lib/ciudad";
import { sesionesParaEnviar } from "@/lib/sesionesEvento";
import { finDe, inicioDe, type Respuestas } from "./pasos";

/**
 * Lo que viaja al servidor desde un flujo por pasos de evento, escondido: los mismos campos que leen `crearEvento` (el alta) y
 * `actualizarEvento` (editar, OL-319). Lo pintan dentro de su formulario escondido el alta y editar; es también lo que mira la guardia de
 * salida para saber si algo cambió. `imagen` es el cartel (vacío, sin cartel).
 */
export default function CamposEvento({ r, ciudadContexto, imagen }: { r: Respuestas; ciudadContexto: Ciudad | null; imagen: string | null }) {
  return (
    <>
      <input type="hidden" name="titulo" value={r.nombre} />
      <input type="hidden" name="inicio" value={inicioDe(r)} />
      <input type="hidden" name="fin" value={finDe(r) ?? ""} />
      {/* Solo con la casilla «Mismo horario todos los días» desmarcada: una sesión por día; sin ella el evento se guarda como siempre. */}
      {r.sesiones && <input type="hidden" name="sesiones" value={sesionesParaEnviar(r.sesiones)} />}
      <CamposSitio modo={r.sitio.modo} lugarId={r.sitio.lugarId} otro={r.sitio.otro} ciudadContexto={ciudadContexto} />
      <input type="hidden" name="gratis" value={r.costo === "gratis" ? "si" : "no"} />
      <input type="hidden" name="cooperacion" value={r.costo === "cooperacion" ? "si" : "no"} />
      <input type="hidden" name="precio" value={r.costo === "precio" ? r.precio : ""} />
      <input type="hidden" name="quien" value={JSON.stringify(r.quien)} />
      <input type="hidden" name="descripcion" value={r.descripcion} />
      <input type="hidden" name="enlace" value={r.enlace} />
      <input type="hidden" name="imagen" value={imagen ?? ""} />
    </>
  );
}
