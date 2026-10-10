import CamposSitio, { valoresSitio } from "@/app/eventos/CamposSitio";
import type { Paleta } from "@/lib/coloresCartel";
import type { Ciudad } from "@/lib/ciudad";
import { combinarFechaHora } from "@/lib/fechas";
import { horarioParaEnviar } from "@/lib/horarioLugar";
import { sesionesParaEnviar } from "@/lib/sesionesEvento";
import { actosMarcados, finDe, inicioDe, sesionesDe, type Respuestas } from "./pasos";

/**
 * Lo que viaja al servidor desde un flujo por pasos de evento, escondido: los mismos campos que leen `crearEvento` (el alta) y
 * `actualizarEvento` (editar, OL-319). Lo pintan dentro de su formulario escondido el alta y editar; es también lo que mira la guardia de
 * salida para saber si algo cambió. `imagen` es el cartel (vacío, sin cartel).
 *
 * Cómo ocurre (OL-321): `clase` siempre; la exposición manda su horario propio (`horario`, vacío con «Horario del lugar») y su inauguración; un
 * taller de varias sesiones, sus `sesiones` (días sueltos); lo que no es festival, el festival del que es parte (`padre` o `padre_nuevo`); un
 * festival, su programa (`actos`, cada uno con su inicio, su sede y si se publica).
 */
export default function CamposEvento({ r, ciudadContexto, imagen, colores = null }: { r: Respuestas; ciudadContexto: Ciudad | null; imagen: string | null; colores?: Paleta | null }) {
  const sesiones = sesionesDe(r);
  return (
    <>
      <input type="hidden" name="titulo" value={r.nombre} />
      <input type="hidden" name="clase" value={r.clase} />
      <input type="hidden" name="inicio" value={inicioDe(r)} />
      <input type="hidden" name="fin" value={finDe(r) ?? ""} />
      {/* Con la casilla «Mismo horario todos los días» desmarcada, o un taller de varias sesiones: una sesión por día. */}
      {sesiones && <input type="hidden" name="sesiones" value={sesionesParaEnviar(sesiones)} />}
      {r.clase === "exposicion" && <input type="hidden" name="horario" value={r.horario ? horarioParaEnviar(r.horario) : ""} />}
      {r.clase === "exposicion" && r.inauguracion && <input type="hidden" name="inauguracion" value={JSON.stringify(r.inauguracion)} />}
      {r.clase !== "festival" && r.padre && ("id" in r.padre ? <input type="hidden" name="padre" value={r.padre.id} /> : <input type="hidden" name="padre_nuevo" value={r.padre.nuevo} />)}
      {r.clase === "festival" && (
        <input
          type="hidden"
          name="actos"
          value={JSON.stringify(
            r.actos.map((a) => ({
              titulo: a.titulo,
              inicio: a.dia && a.hora ? combinarFechaHora(a.dia, a.hora) : "",
              fin: "",
              sitio: valoresSitio({ ...a.sitio, ciudadContexto }),
              quien: a.quien,
              marcado: actosMarcados({ actos: [a] }).length === 1,
            })),
          )}
        />
      )}
      <CamposSitio modo={r.sitio.modo} lugarId={r.sitio.lugarId} otro={r.sitio.otro} ciudadContexto={ciudadContexto} />
      <input type="hidden" name="gratis" value={r.costo === "gratis" ? "si" : "no"} />
      <input type="hidden" name="cooperacion" value={r.costo === "cooperacion" ? "si" : "no"} />
      <input type="hidden" name="precio" value={r.costo === "precio" ? r.precio : ""} />
      <input type="hidden" name="quien" value={JSON.stringify(r.quien)} />
      <input type="hidden" name="descripcion" value={r.descripcion} />
      <input type="hidden" name="enlace" value={r.enlace} />
      <input type="hidden" name="imagen" value={imagen ?? ""} />
      {/* Los colores del cartel recién subido (OL-360); sin cartel nuevo, nada. */}
      {imagen && colores && <input type="hidden" name="colores_cartel" value={JSON.stringify(colores)} />}
    </>
  );
}
