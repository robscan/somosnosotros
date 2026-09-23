# 174 · Texto al salir de la app, sin generalizar (OL-139, E7)

**Fecha:** 2026-09-23 · **OL:** OL-139 · **Rama:** `texto-al-salir` desde `origin/main` (`22d6d2e`) · **Commit:** uno (local; el gestor sube y abre el PR). Esfuerzo bajo. Sin migración. Sin council ni subagentes.

## Lo que dijo el founder (literal)

«Cuando usuario sale de app decimos que puede que te pidan dinero o tus datos. No podríamos generalizar. ¿Podemos poner otro texto?»

Hoy la hoja de `src/components/ui/EnlaceExterno.tsx` («Vas a salir de Somos Nosotros» + el dominio) dice «Ahí puede que te pidan un pago o tus datos.» (OL-105, doc rediseno/29). Afirma algo que no sabemos de cada sitio.

## Tres textos para elegir

Los tres dicen lo único cierto —que sale de Somos Nosotros hacia un sitio ajeno— sin afirmar qué le pedirán. Español llano, una línea, bajo el dominio.

1. **«Ese sitio no es de Somos Nosotros: tiene sus propias reglas.»** — neutro y único para boletos, redes y sitios. Es el que va en el código.
2. **Según a dónde va** (haría falta que cada ficha diga el motivo al enlace: `motivo="boletos" | "redes" | "sitio"`): «Ahí venden los boletos de este evento.» / «Son las redes de este perfil.» / «Es el sitio propio de este lugar.» — más útil, un poco más de código.
3. **«Se abre fuera de la app, en otra página.»** — el mínimo: solo el hecho.

Si el founder prefiere la 2 o la 3, es cambiar una línea (la 2, además, una propiedad en los tres usos: eventos, lugares y artistas).

## Cambio

`src/components/ui/EnlaceExterno.tsx`: la línea explicativa pasa a la opción 1 y el comentario del componente deja de decir «donde pueden pedir pago o datos». El título, el dominio, «Continuar», «Quedarme aquí» y «No volver a avisarme» no cambian. No hay prueba del componente (la lógica de cuándo avisar vive en `src/lib/avisoSalida.ts` y sus pruebas no tocan el texto). El doc `docs/rediseno/29-aviso-al-salir.md` cita el texto viejo como decisión de OL-105; se deja como historia (esta bitácora es la decisión nueva).

## Verificación

- `npm run typecheck` ✓ · `npm run lint` 0 errores (1 aviso previo en `docs/diseno/logotipo/iconos-sn.mjs`) · `npm test` ✓ (sin cambios en el conteo) · `npm run build` ✓.
- Captura real (Chrome real vía playwright-core desde el scratchpad de la sesión; `package.json` y lock intactos; sin `.env` real, solo un respaldo local mínimo que responde la ficha de un lugar inventado con dos redes), 390×844, Bricolage cargada:
  - `docs/rediseno/capturas-174/01-hoja-al-salir-390x844.png`: la ficha «Centro de prueba» al fondo y, encima, la hoja «Vas a salir de Somos Nosotros» con el dominio `instagram.com` (icono de enlace), la línea nueva «Ese sitio no es de Somos Nosotros: tiene sus propias reglas.», los botones «Continuar» y «Quedarme aquí» y la casilla «No volver a avisarme».

## Archivos

`src/components/ui/EnlaceExterno.tsx`, `docs/rediseno/capturas-174/01-hoja-al-salir-390x844.png`, esta bitácora y `docs/ops/OPEN_LOOPS.md`.
