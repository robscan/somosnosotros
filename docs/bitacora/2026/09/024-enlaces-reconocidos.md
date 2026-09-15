# 024 · Enlaces y redes sin elegir la red (2026-09-14)

Rama `enlaces`. Responde a la pregunta del founder tras probar Artistas en producción: los cineastas usan Vimeo, los músicos SoundCloud; seis campos fijos de redes eran una lista que casi nadie llena y siempre corta. Diseño en [09-enlaces-flujo-y-estados.md](../../../rediseno/09-enlaces-flujo-y-estados.md); aprobado por el founder ("sí, voy") antes de escribir código.

## Qué cambia

- **Un solo campo** en "Más detalles" de artistas y lugares: la persona pega un enlace, un `@usuario` o un teléfono y el sistema reconoce la red por el dominio (`lib/enlaces.ts`): Instagram, Facebook, TikTok, YouTube, Vimeo, Spotify, SoundCloud, Bandcamp, Apple Music, WhatsApp, X, Threads, Linktree; cualquier otro dominio es "Sitio" con el dominio de etiqueta. `@usuario` es Instagram; diez dígitos (o +52) es WhatsApp y se guarda como wa.me. Lo que no es nada se rechaza en línea ("No parece un enlace, un @usuario ni un teléfono."), no se guarda basura.
- **`SelectorEnlaces`**: los reconocidos en una lista con icono, nombre de la red, enlace corto y ✕; debajo, "Otro enlace" con Añadir (también Enter o salir del campo). Máximo ocho. Viaja como JSON en un campo oculto y el servidor vuelve a reconocer cada uno.
- **Fichas**: un botón por enlace con `IconoRed` (icono por red, genérico para sitios) y la etiqueta de la red o el dominio. Compartir sigue primero.
- **Sin migración**: `redes` ya era JSON. Pasa de objeto por red fija a lista `[{ red, url }]`; `normalizarRedes` convierte las fichas viejas al leerlas (Casa 1100 y Laboratorio siguen mostrando sus redes). Desaparecen `REDES`, `enlaceRed` y `enlacesRedes` de `lib/lugares.ts` y `REDES_ARTISTA` de `lib/artistas.ts`; los errores por red pasan a un solo `enlaces`.
- Iconos nuevos: TikTok, Vimeo, SoundCloud, Bandcamp, Apple Music, X, Threads, Linktree y el genérico de enlace.

## Verificación (390×844, servidor de desarrollo, base real, usuario desechable borrado al final)

- Alta de artista "Cineastas Prueba" → Más detalles → `vimeo.com/cineastasprueba`, `@cineastasslp` y `444 123 4567` se reconocen como Vimeo, Instagram y WhatsApp con su icono; `hola` se rechaza con el aviso en línea y no se añade.
- Publicado: la ficha muestra Compartir · Vimeo · Instagram (WhatsApp en la fila desplazable) con los enlaces `vimeo.com/cineastasprueba`, `instagram.com/cineastasslp`, `wa.me/524441234567`; en la base quedó `[{red, url}]`.
- Revisión de maquetación: el selector es un grid con la lista, la etiqueta, la fila campo+botón y el aviso como hijos directos; la ficha queda en 53 nodos, profundidad 5 (el único `div` sin clase es el del aviso "Publicado", patrón heredado de Lugares). Se quitó la etiqueta duplicada ("Redes y contacto" + "Enlace…") que salió en la primera pasada.
- No mirado en pantalla: la edición de un lugar con redes viejas (cubierta por la prueba de `normalizarRedes`), Enter para añadir (el navegador de prueba no lo disparó; el botón y salir del campo sí).
- Lint, typecheck, 77 pruebas (11 nuevas de `lib/enlaces`) y build en verde.
