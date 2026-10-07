import { MARCA_ADMIN } from "@/lib/medir";
import { usuarioDeLaBarra } from "./usuarioDeLaBarra";

/**
 * Para que medir deje fuera a la administración también en el teléfono (OL-325): solo si quien mira es admin, una marca escondida que
 * `medirCliente` y Google Analytics buscan antes de mandar nada. No dice quién es ni trae ningún dato más. Usa la misma lectura de la
 * sesión que la barra (`usuarioDeLaBarra`, una por petición): no suma consultas.
 */
export default async function MarcaAdmin() {
  const actual = await usuarioDeLaBarra();
  if (actual?.perfil.rol !== "admin") return null;
  return <i hidden {...{ [MARCA_ADMIN]: "" }} />;
}
