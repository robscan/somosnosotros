"use client";

import { usePathname } from "next/navigation";
import { contenidoLetreroAppStore } from "@/lib/letreroAppStore";

/**
 * La etiqueta del letrero de Apple en Safari (OL-474, `lib/letreroAppStore`). Va en el layout raíz, fuera de todo `<Suspense>`: es parte del
 * primer HTML y React 19 la sube al `<head>`, donde Safari la busca. Al navegar dentro del sitio el layout no se vuelve a pintar, pero este
 * componente sí (lee la ruta): el `app-argument` sigue a la página que se está viendo. En Administración, entrar y la API no pinta nada.
 */
export default function LetreroAppStore() {
  const contenido = contenidoLetreroAppStore(usePathname() ?? "/");
  return contenido ? <meta name="apple-itunes-app" content={contenido} /> : null;
}
