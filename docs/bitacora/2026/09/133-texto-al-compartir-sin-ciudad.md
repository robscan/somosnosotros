# 133 · El texto al compartir ya no nombra la ciudad

**Fecha:** 2026-09-21 · **OL:** OL-098 · **Rama:** `compartir-sin-ciudad` · **PR:** #117 · Operador en Haiku 4.5; esta bitácora la escribió el gestor al integrar, porque el operador no la dejó.

## Pedido del founder

«actualmente al compartir el sitio dice este texto: Agenda cultural y directorio de lugares de San Luis Potosí. Gratis, sin cuenta para mirar […] quisiera omitir el San Luis potosí para promover el crecimiento organico que ya comenzamos a hacer con ciudad de méxico.»

## Qué se cambió

- Frase nueva, elegida por el founder entre tres opciones en el chat del operador (contestó «2»): «Agenda y directorio de la cultura local. Mira qué hay, conoce a la gente. Gratis, sin cuenta para mirar:».
- Dónde: `TEXTO_INVITAR` en `src/lib/perfil.ts`; descripción general, Open Graph y Twitter en `src/app/layout.tsx` (es lo que se ve al pegar el enlace en WhatsApp o redes); `description` en `src/app/manifest.ts`.
- A petición del gestor en la revisión: los dos textos de compartir un perfil (`textoCompartirPersona`) también salen sin ciudad, porque los eventos de una persona ya pueden ser de otra ciudad. Pruebas de `perfil.test.ts` actualizadas.
- No se tocó lo que nombra la ciudad con razón: fichas, títulos por ciudad, selector de ciudad, DEFINICION.

## Verificación

Tipos en verde; 705 pruebas pasan (las 7 de `scripts/test-db.test.ts` fallan solo en carpetas locales sin el paquete `pg`; en CI pasan). Sin migración, sin cambio de pantalla más allá del texto.

## Nota

WhatsApp y otras apps guardan un tiempo la vista previa vieja de un enlace: el texto nuevo puede tardar en verse al pegar somosnosotros.org.
