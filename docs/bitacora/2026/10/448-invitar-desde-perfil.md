# 448 · «Invitar a tus amigxs» se muda de Ajustes a Mi perfil (OL-416)

**Fecha:** 2026-10-19. **Rama:** `invitar-desde-perfil`, desde `origin/main` (`ea0104df`), con `main` traído después hasta `4a581c47` (#534,
OL-418: la hora en «7:00 pm»). **Operador:** agente de la pieza (Claude) para el
Gestor VII, sin otros agentes. **Sin migración** y sin variables de entorno nuevas. **Estado:** lista para la revisión del gestor y el «publica»
del founder.

## El pedido

Founder, 19 de octubre: «Haz que el botón de invitar a tus amistades (cambia texto a invitar a tus amigos) que actualmente está en ajustes, ahora
se vea desde el perfil de un usuario». Más tarde, el mismo día: «amigxs y Somos Nosotrxs en toda la app». El texto del botón queda **«Invitar a
tus amigxs»**. La marca «Somos Nosotrxs» en toda la app es otra pieza: aquí no se toca (los «Somos Nosotros» siguen como estaban, también el
título de lo que se comparte). Plan del día en la bitácora [449](449-plan-de-trabajo-vii.md).

## Qué cambió

1. **Mi perfil lleva el renglón** (`src/app/perfil/page.tsx`): «Invitar a tus amigxs», debajo «Se comparte el enlace del sitio», el icono de
   compartir de `ui/Iconos` a la izquierda y el chevron a la derecha. Es el mismo renglón que había en Ajustes, con el mismo `BotonCompartir`,
   el mismo `TEXTO_INVITAR` (`lib/perfil`), el mismo enlace (`https://somosnosotros.org`) y el mismo título («Somos Nosotros»). Lo comparte la
   hoja del teléfono y, sin ella, WhatsApp, como antes.
2. **Dónde va:** bajo la cabecera del perfil propio (foto, nombre, colonia, sobre mí y, si falta algo, el aviso «Completar») y antes de «Mis
   artistas» y de los números Voy · Interesan · Sigo. A 390×844 queda a la vista al abrir, sin bajar (su caja empieza a 228 px del borde de
   arriba, con el aviso «Completar» encima).
3. **Maquetación plana, sin CSS nuevo:** el renglón es un `button` con las clases que ya existen `ui/Renglon` `ajuste` + `sola` (la fila de
   Ajustes sin tarjeta y sin aire a los lados, que ya pone la columna del perfil). Ninguna caja ni envoltorio de más, ni medidas en duro nuevas.
4. **`FichaPersona` recibe el renglón por una ranura nueva, `invitar`** (como ya hace con `misArtistas`), y solo lo pinta si la ficha es la mía
   (`mia`). La ficha de otra persona (`/personas/[id]`) nunca se lo pasa, y aunque se lo pasaran no lo pinta. Tampoco sale en la propia ficha
   vista «Así te ve la gente» (allí `mia` es falso).
5. **Ajustes ya no lo lleva** (`src/app/ajustes/page.tsx`): se quita el renglón y lo que solo él usaba (`BotonCompartir`, `IconoCompartir`,
   `TEXTO_INVITAR` y `ORIGEN`). El grupo «Somos Nosotros» sigue con Instalar la app, Administración (solo admin), Avisar al salir del sitio,
   Mover las portadas, Ayuda, Aviso de privacidad y Reglas de uso: no queda ningún hueco.
6. **Medición:** el renglón de Ajustes no medía nada (`BotonCompartir` solo mide las fichas de evento, lugar y artista; compartir la app lo mide
   el banner de Inicio con `que: "app"`, OL-388), y el de Mi perfil sigue igual. No se tocó `lib/medir`.

## La fila de acciones de la cabecera: por qué no va ahí

La cabecera del perfil ya tiene una fila de acciones con iconos (Ajustes y Compartir, redondos, junto al nombre). No sumé ahí la invitación:
sería un segundo icono de compartir al lado del de la ficha (uno comparte tu perfil y el otro la app, con el mismo dibujo) y el texto «Invitar a
tus amigxs», que es lo que pidió el founder, no se vería. Quedó como renglón con texto, justo debajo.

## Pruebas

- `src/app/perfil/invitar.test.ts` (7, nuevo): se llaman las páginas y se recorre el árbol sin pintar. Mi perfil lo lleva una vez, con
  `TEXTO_INVITAR`, el enlace del sitio y el texto «Invitar a tus amigxs» / «Se comparte el enlace del sitio»; va después del nombre y de «sobre
  mí» y antes de la actividad; con «Mis artistas», antes de ellos; la ficha de otra persona no lo lleva (ni se le pasa); la propia ficha «Así te
  ve la gente» tampoco; `FichaPersona` con `mia` falso no lo pinta aunque se lo pasen; Ajustes no lleva ningún `BotonCompartir` ni «Invita»,
  «amistades» o «amigxs», con cuenta normal y de administración, y su grupo «Somos Nosotros» sigue. Con el código de antes fallan las tres que
  lo buscan en Mi perfil y en Ajustes.
- Ninguna prueba existente citaba el renglón de Ajustes: no hubo que cambiar otras.

## Verificación (árbol sin `.env`, con `main` en `4a581c47` ya traído)

- lint: 0 errores, 1 aviso que ya estaba en `main` (`VisorImagen.componentes.test.mjs`, `page` sin usar).
- typecheck: limpio.
- test: 230 archivos, **4 046 pruebas** en verde.
- inventario: sin novedades (334 medidas en duro aceptadas, ninguna nueva).
- medir: 41 pantallas × 4 anchos. Falló solo el presupuesto de **s05-perfil**, que subió por el renglón: de 99/99/101/101 a **104/104/106/106**
  nodos (el botón, sus dos iconos, el título y la línea de abajo); la profundidad no cambia (11). **s04-ajustes** bajó de 98/98/130/119 a
  **92/92/124/113** (el `li` y sus cinco). Las dos líneas de `medidas.aceptadas.json` se ajustaron a mano; con ellas, `medir` de esas pantallas
  queda sin novedades. Con la letra al doble (`--letra=2`), Mi perfil sin novedades.

## Capturas (`docs/rediseno/capturas-448/`, 390×844 a 2×, sin comprimir)

Con `scripts/ops/auditoria-ui/capturar-invitar-perfil.mjs` (nuevo, mismo patrón que `capturar-persona-publicado.mjs`): respaldo local de datos
inventados, `next build` + `next start` con el reloj fijo (lun 19 oct, 10:00) y ya con la hora de OL-418 («7:30–9:30 pm»), Chrome de la Mac, sesión de Ana (la cuenta de prueba del
respaldo). La hoja de compartir del teléfono se imitó para anotar lo que recibe.

- `01-mi-perfil-invitar`: Mi perfil de Ana. Bajo la cabecera (con el engrane y compartir arriba a la derecha) y el aviso «Completar», el renglón
  con el icono de compartir, «Invitar a tus amigxs», «Se comparte el enlace del sitio» y el chevron; debajo, Voy · Interesan · Sigo. Su caja: 350
  × 59 px desde y = 228; el centro del renglón es el propio botón (`elementFromPoint`); sin desplazamiento a lo ancho. Tocado con el ratón en su
  centro, la hoja recibió: título «Somos Nosotros», el texto de `TEXTO_INVITAR` y `https://somosnosotros.org`.
- `02-ajustes-sin-invitar`: Ajustes, bajado hasta «Somos Nosotros»: Instalar la app, Avisar al salir del sitio, Mover las portadas, Ayuda, Aviso
  de privacidad y Reglas de uso. Ningún «Invita…» en la pantalla.
- `03-ficha-de-otra-persona-sin-invitar`: la ficha de Marcos vista por Ana: cabecera con su botón de compartir y, debajo, Va a · Sigue · Van a lo
  mismo. Sin renglón de invitar.
- `04-asi-te-ve-la-gente-sin-invitar`: la ficha de Ana vista «como la ve la gente»: tampoco lo lleva.

## Por confirmar (founder)

- **Dónde quedó:** como renglón bajo la cabecera de Mi perfil (y bajo «Completar» cuando sale), antes de «Mis artistas» y de Voy · Interesan ·
  Sigo; no como un tercer botón redondo junto a Ajustes y Compartir (ver arriba). Si lo prefieres más abajo (por ejemplo junto a «Así te ve la
  gente») o en otro estilo, es mover una línea.
- **La línea de abajo «Se comparte el enlace del sitio»** se quedó como en Ajustes: distingue esta invitación (la app) del botón de compartir de
  arriba (tu perfil). Si sobra, se quita.
- **No se mide**, igual que en Ajustes. Si quieres contarlo como «compartir la app» (lo que ya mide el banner de Inicio), es sumar la medida en
  este botón; no se distinguiría del banner, porque la lista de lo que se mide no admite un tercer dato.
- Lo que se comparte sigue titulado «Somos Nosotros»: cambiarlo a «Somos Nosotrxs» va con la pieza de la marca.
