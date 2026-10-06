import { ciudadParaPunto, type Ciudad } from "@/lib/ciudad";
import type { ModoSitio, OtroSitio } from "@/lib/eventos";

/**
 * Dónde es, tal como lo leen `crearEvento` y `actualizarEvento`: campos escondidos (la hoja «¿Dónde es?» vive fuera del formulario).
 * Lo comparten editar (`FormularioEvento`) y el alta por pasos (`/nuevo/evento`, OL-300).
 * La ciudad del sitio es la del pin: la de Mapbox o, sin ella, la de contexto si el pin cae cerca; sin ninguna, el servidor no publica (OL-299).
 */
export default function CamposSitio({ modo, lugarId, otro, ciudadContexto = null }: { modo: ModoSitio; lugarId: string; otro: OtroSitio; ciudadContexto?: Ciudad | null }) {
  const punto = modo === "reservado" ? otro.privadoPunto : modo === "otro" ? otro.sitioPunto : null;
  const ciudad = punto ? ciudadParaPunto(punto, otro.ciudad, ciudadContexto) : otro.ciudad;
  return (
    <>
      <input type="hidden" name="modo_sitio" value={modo} />
      <input type="hidden" name="lugar_id" value={modo === "lugar" ? lugarId : ""} />
      <input type="hidden" name="sitio_texto" value={modo === "lugar" ? "" : otro.sitioTexto} />
      <input type="hidden" name="sitio_direccion" value={modo === "otro" ? otro.direccion ?? "" : ""} />
      <input type="hidden" name="sitio_pin_pendiente" value={modo !== "lugar" && otro.pinPendiente ? "si" : "no"} />
      <input type="hidden" name="sitio_lat" value={modo === "otro" && otro.sitioPunto ? otro.sitioPunto.lat : ""} />
      <input type="hidden" name="sitio_lng" value={modo === "otro" && otro.sitioPunto ? otro.sitioPunto.lng : ""} />
      <input type="hidden" name="direccion_privada" value={modo === "reservado" ? otro.direccionPrivada : ""} />
      <input type="hidden" name="privado_lat" value={modo === "reservado" && otro.privadoPunto ? otro.privadoPunto.lat : ""} />
      <input type="hidden" name="privado_lng" value={modo === "reservado" && otro.privadoPunto ? otro.privadoPunto.lng : ""} />
      <input type="hidden" name="revelar_horas" value={otro.revelarHoras} />
      <input type="hidden" name="indicaciones" value={modo === "reservado" ? otro.indicaciones : ""} />
      <input type="hidden" name="ciudad" value={modo === "lugar" ? "" : (ciudad ?? "")} />
    </>
  );
}
