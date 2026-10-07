import { ciudadParaPunto, type Ciudad } from "@/lib/ciudad";
import type { ModoSitio, OtroSitio } from "@/lib/eventos";

type Sitio = { modo: ModoSitio; lugarId: string; otro: OtroSitio; ciudadContexto?: Ciudad | null };

/**
 * Dónde es, como valores de los campos que leen `crearEvento` y `actualizarEvento` (los nombres son los de `leer` en `acciones.ts`). Los pinta
 * `CamposSitio` como campos escondidos y, para cada acto de un programa (OL-321), viajan dentro del campo `actos`: un solo lugar decide cómo se
 * manda un sitio. La ciudad del sitio es la del pin: la de Mapbox o, sin ella, la de contexto si el pin cae cerca; sin ninguna, el servidor no
 * publica (OL-299).
 */
export function valoresSitio({ modo, lugarId, otro, ciudadContexto = null }: Sitio): Record<string, string> {
  const punto = modo === "reservado" ? otro.privadoPunto : modo === "otro" ? otro.sitioPunto : null;
  const ciudad = punto ? ciudadParaPunto(punto, otro.ciudad, ciudadContexto) : otro.ciudad;
  return {
    modo_sitio: modo,
    lugar_id: modo === "lugar" ? lugarId : "",
    sitio_texto: modo === "lugar" ? "" : otro.sitioTexto,
    sitio_direccion: modo === "otro" ? (otro.direccion ?? "") : "",
    sitio_pin_pendiente: modo !== "lugar" && otro.pinPendiente ? "si" : "no",
    sitio_lat: modo === "otro" && otro.sitioPunto ? String(otro.sitioPunto.lat) : "",
    sitio_lng: modo === "otro" && otro.sitioPunto ? String(otro.sitioPunto.lng) : "",
    direccion_privada: modo === "reservado" ? otro.direccionPrivada : "",
    privado_lat: modo === "reservado" && otro.privadoPunto ? String(otro.privadoPunto.lat) : "",
    privado_lng: modo === "reservado" && otro.privadoPunto ? String(otro.privadoPunto.lng) : "",
    revelar_horas: String(otro.revelarHoras),
    indicaciones: modo === "reservado" ? otro.indicaciones : "",
    ciudad: modo === "lugar" ? "" : (ciudad ?? ""),
  };
}

/**
 * Dónde es, tal como lo leen `crearEvento` y `actualizarEvento`: campos escondidos (la hoja «¿Dónde es?» vive fuera del formulario).
 * Lo pintan los flujos por pasos de evento, el alta (`/nuevo/evento`, OL-300) y editar (OL-319), dentro de `CamposEvento`.
 */
export default function CamposSitio(props: Sitio) {
  return (
    <>
      {Object.entries(valoresSitio(props)).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}
