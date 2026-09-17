# 091 · Texto explicativo en Entrar: sin contraseñas, sin rastreo (OL-061)

**Fecha:** 2026-09-17 · **Rama:** `entrar-sin-contrasenas`, desde `main` (cd98722) · **Pieza de copy, sin migración.**

## Qué pidió el founder

Al entrar la persona solo ve los tres botones (Apple, Google, correo) sin explicación. Pidió un texto que no exagere pero deje claro, para todos: no guardamos contraseñas, no seguimos a nadie, respetamos la privacidad, y por eso se usan esas formas de entrar.

Se avisó al chat de gestión de cambios y se esperaron sus instrucciones antes de tocar archivos. Números reservados: bitácora 091, OL-061, rama `entrar-sin-contrasenas`.

## Condiciones de gestión de cambios

El aviso de privacidad ya está firmado; el texto no puede prometer nada que el aviso no diga:
- usar las palabras del aviso — "sin contraseña" y "Sin rastreo ni publicidad" (`src/app/privacidad/page.tsx`);
- no decir "no seguimos personas" (confunde con el botón Seguir de lugares y artistas, y el panel sí guarda el último día que cada cuenta abrió la app);
- no insinuar que Apple o Google es más privado (llegan correo, nombre y, con Google, foto — ya dicho en el aviso);
- no decir "no compartimos tus datos" (el aviso nombra a Supabase, Vercel, Resend, Mapbox y Anthropic);
- no repetir el texto que ya existe para cuando solo hay correo.

Tres redacciones al founder (Evidencia, no promesa); eligió la B.

## Qué se hizo

- **`FormularioEntrar.tsx`:** con Apple y Google encendidos, un subtítulo antes de los tres botones: *"Entras sin contraseña y sin rastreo ni publicidad — por eso estas opciones."* (clase global `subtitulo`, la misma que ya usaba el caso de solo correo).
- El texto de solo-correo se funde con la misma idea para no repetirla: de *"Sin contraseñas: te mandamos un código a tu correo."* a **"Sin contraseña ni rastreo: te mandamos un código a tu correo."**
- **`FormularioEntrar.module.css`:** comentario actualizado (el margen entre los tres botones ya no "encabeza" el título directamente; el subtítulo va en medio, con el margen que trae de forma global y colapsa con el de `.opciones`).
- Sin componentes nuevos, sin migración, sin dependencias.

## Verificado

Lint, tipos y build en verde; 319 pruebas (sin tocar lógica, ninguna nueva). A 390×844, con un servidor local que imita `/auth/v1/settings` (sin tocar producción):
- con Apple y Google encendidos: los tres botones con el subtítulo nuevo arriba, sin recortes ni texto pegado a los bordes;
- con Apple y Google apagados (sin `.env.local`, caso real de este árbol): el subtítulo fundido con "código a tu correo";
- tras abrir "Continuar con tu correo" (los tres visibles): el campo de correo queda debajo sin encimarse con el subtítulo ni duplicarlo.

Capturas en el scratchpad de la sesión (no se suben al repo). Commit local, sin push.

## Pendiente

Firma del founder en su iPhone (Safari), como con cualquier pieza de UI.
