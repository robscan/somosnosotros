export type CampoFlyer = "titulo" | "cuando" | "cuanto" | "descripcion" | "enlace" | "quien" | "donde" | "imagen";

/** Incluso borrar o volver al mismo valor es un gesto: comparar valores no basta. */
export function crearGestosFlyer(iniciales: CampoFlyer[] = []) {
  const versiones = new Map<CampoFlyer, number>(iniciales.map(c => [c, 1]));
  return {
    tocar(campo: CampoFlyer) {
      const version = (versiones.get(campo) ?? 0) + 1;
      versiones.set(campo, version);
      return version;
    },
    puedeCompletar: (campo: CampoFlyer) => !versiones.has(campo),
    vigente: (campo: CampoFlyer, version: number) => versiones.get(campo) === version,
  };
}
