# 092 · Icono y región común para el texto de Entrar (OL-061)

**Fecha:** 2026-09-17 · **Rama:** `entrar-texto-con-icono`, desde `main` (1d7f93f, con OL-061/PR #90 ya adentro) · **Ajuste de la misma pieza.**

## Qué pidió el founder

Sobre el texto de la 091 ("Entras sin contraseña y sin rastreo ni publicidad…"): centrarlo, agregarle un icono arriba como en la composición del estado vacío al borrar un evento, usar región común y cuidar mejor los espacios.

Se avisó al chat de gestión de cambios y se esperaron sus instrucciones antes de tocar archivos. Reservó la misma OL-061, bitácora nueva 092, rama `entrar-texto-con-icono`, con condiciones:
- icono `IconoEscudo` (el mismo de "Aviso de privacidad" en Ajustes) — enseñar la captura al founder por si prefiere `IconoCandado`;
- maquetación plana: un solo contenedor con grid, icono arriba y texto debajo, sin envoltorios anidados, con los tokens del proyecto;
- la caja no puede parecer tocable (sin sombra ni borde de botón) y va más cerca de lo que explica que del título;
- los tres botones siguen a la vista sin desplazar, con capturas a 390×844 y 375×667, en los dos casos (con Apple/Google y solo correo), con la misma composición para que la idea no tenga dos estilos;
- solo `FormularioEntrar.tsx` y su `.module.css` (no tocar `page.tsx`, que trae el `noindex` de la rama `seo-indexar` en revisión).

## Qué se hizo

- **`FormularioEntrar.tsx`:** el texto de los dos casos (con Apple/Google, y solo correo) pasa de un `<p className="subtitulo">` suelto a un único `<div className={styles.explicacion}>` con `IconoEscudo` (28×28, `aria-hidden` ya viene por defecto en el set de iconos) arriba y el texto en un `<p>` debajo — mismo componente en los dos casos, sin envoltorios extra.
- **`FormularioEntrar.module.css`:** `.explicacion` en grid, centrado, con `background: var(--fondo-suave)` y `border-radius: var(--radio)` (la misma región común que ya usaba `.enviado` en esta pantalla) y sin sombra ni borde. Los márgenes son a propósito asimétricos: `var(--espacio-5)` arriba (más aire hacia el título) y `var(--espacio-3)` abajo (más cerca de los botones o del campo de correo, que es lo que explica); `.opciones` bajó su margen superior de `--espacio-4` a `--espacio-3` para que el hueco hacia los botones sea consistente con ese `--espacio-3`.
- Sin componentes nuevos compartidos, sin migración.

## Verificado

Lint, tipos, 319 pruebas (sin cambios de lógica) y build en verde. Con la skill `front-visual` (mirar antes y después): a 390×844 y 375×667, con un servidor local que imita `/auth/v1/settings` (sin tocar producción):
- con Apple y Google encendidos: los tres botones y el enlace legal a la vista sin desplazar, en los dos tamaños;
- solo correo (Apple y Google apagados, el caso real de este árbol sin `.env.local`): la misma caja, con el campo de correo debajo sin encimarse;
- en los dos casos la caja no compite visualmente con los botones (sin sombra, fondo apenas distinto del blanco) y queda más pegada a ellos que al título.

Capturas en el scratchpad de la sesión (no se suben al repo; se le muestran al founder para que firme el icono y la composición). Commit local, sin push.

## Pendiente

Que el founder confirme el icono (`IconoEscudo` vs `IconoCandado`) y firme mirándolo en su iPhone (Safari), como con cualquier pieza de UI.
