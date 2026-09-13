/** Solo rutas internas ("/perfil"): evita que un enlace externo secuestre la redirección tras entrar. */
export function rutaSegura(valor: string | null | undefined, porDefecto = "/"): string {
  if (!valor) return porDefecto;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return porDefecto;
  return valor;
}
