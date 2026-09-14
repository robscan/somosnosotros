import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "No está · Somos Nosotros" };

/** Un enlace que ya no lleva a nada (evento o lugar borrado, dirección mal escrita). Se dice y se vuelve a la agenda. */
export default function NoEncontrado() {
  return (
    <main className="pagina">
      <h1 className="titulo">Esto ya no está</h1>
      <p className="subtitulo">Puede que lo hayan borrado o que el enlace esté incompleto.</p>
      <Link href="/" className="enlace-volver">
        ← Ver la agenda
      </Link>
    </main>
  );
}
