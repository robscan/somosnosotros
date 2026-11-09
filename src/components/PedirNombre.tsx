import { faltaNombre } from "@/lib/perfil";
import IrAPonerNombre from "./IrAPonerNombre";
import { usuarioDeLaBarra } from "./usuarioDeLaBarra";

/**
 * En el layout (OL-512): si la cuenta con sesión no tiene nombre, monta `IrAPonerNombre`, que la lleva una vez por sesión a ponerlo. Sin sesión
 * o con nombre, nada. La misma lectura de la sesión que la barra y la navegación (`usuarioDeLaBarra`).
 */
export default async function PedirNombre() {
  const actual = await usuarioDeLaBarra();
  if (!actual || !faltaNombre(actual.perfil.nombre)) return null;
  return <IrAPonerNombre />;
}
