# 168 · Icono de Administración: llave inglesa en los dos accesos (OL-133)

**Fecha:** 2026-09-22 · **Rama:** `icono-admin-herramientas`, desde `origin/main` (`41d8ada`) · **OL:** OL-133 · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

Decisión del founder, literal: «cambia el icono de administración, no había visto que estamos usando el mismo de aviso de privacidad y en configuración de perfil seguimos usando el otro. busca uno que represente tools o herramientas. pero usalo en los dos entry points». Los dos accesos a Administración usaban iconos distintos entre sí y uno de ellos (el escudo) coincidía con el de privacidad, sin relación con la sección a la que llevan.

## Qué se hizo

- `src/components/ui/Iconos.tsx`: `IconoHerramientas` nueva (llave inglesa, un solo trazo continuo, mismo estilo que el resto — `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth={1.8}`, extremos redondeados; sin primitivas pegadas).
- `src/components/Sesion.tsx`: la cabecera (enlace a `/admin`) pasa de `IconoEscudo` a `IconoHerramientas`.
- `src/app/ajustes/page.tsx`: la fila «Administración» pasa de `IconoTablero` a `IconoHerramientas`.
- `IconoTablero` quedó sin ningún uso (confirmado con `grep`) y se borró de `Iconos.tsx`.
- **Sin tocar:** `IconoEscudo` se queda en la fila «Perfil» de Ajustes (privacidad) y en `admin/personas/[id]/RolPersona.tsx` (rol de la persona) — ninguno de los dos es un acceso a Administración.

## Verificación

`npm run lint` (1 warning preexistente, sin errores), `npm run typecheck` (verde), `npm test` (1016 pruebas, 80 archivos, verde), `npm run build` (verde).

### Capturas reales (`docs/rediseno/capturas-168/`)

`next build && next start` contra el mismo respaldo local ad-hoc de la bitácora 151 (scratchpad, sin commitear), Chrome real por `playwright-core`, viewport 390×844 a `deviceScaleFactor: 2`. `document.fonts.check('16px "Bricolage Grotesque"')` → `true` en las dos.

- `01-cabecera-herramientas.png`: cabecera de la agenda con sesión de administrador — llave inglesa entre la campana y el avatar, en vez del escudo.
- `02-ajustes-herramientas.png`: sección «Somos nosotros» de Ajustes — fila «Administración» con la misma llave inglesa, alineada con el texto (el renglón hereda el arreglo de OL-116).

## Qué falta

Nada de código. Commit local en `icono-admin-herramientas`, sin push.
