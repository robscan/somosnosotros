type Operacion = { datos: string; id: string };

/** Un reintento del mismo formulario conserva su clave; cambiar datos inicia otra operacion. */
export function operacionEvento(fd: FormData, anterior: Operacion | null, nueva = () => crypto.randomUUID()): Operacion {
  const datos = JSON.stringify([...fd.entries()].filter(([k]) => k !== "operacion"));
  return anterior?.datos === datos ? anterior : { datos, id: nueva() };
}
