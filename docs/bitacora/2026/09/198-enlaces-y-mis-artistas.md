# 198 · Enlaces de la ficha más presionables y «Mis artistas» como tarjeta (OL-163)

**Fecha:** 2026-09-23 · **Rama:** `enlaces-y-mis-artistas`, desde `origin/main` · **OL:** OL-163 · **Modelo:** Sonnet 5, esfuerzo bajo. Sin council, workflows ni subagentes (costo).

## De dónde sale

El founder firmó el reparto de los círculos de enlaces de la ficha (entrada OL-163 en `docs/ops/OPEN_LOOPS.md`, 2026-09-23) con tres correcciones sobre el canon de círculo elevado que dejó OL-159 (bitácora 194): los círculos «se ven bien pero deben verse más presionables y claros» (más grandes, icono más grande, la sombra tal como está, «perfecta»); la línea horizontal bajo el título «Enlaces» «se ve horrible» y hay que quitarla, dejando 16 px hasta el carril como en el título de un carril de Inicio; y el reparto de los círculos según cuántos haya (uno a la izquierda, varios repartidos a todo el ancho, muchos en un carril deslizable con el siguiente asomando). Pidió el mismo canon en las tres fichas (artista, lugar, evento). Además, en Mi perfil, «Mis artistas» vuelve a la tarjeta blanca de antes de OL-159, sin su botón de compartir.

Leído: `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-163 en `docs/ops/OPEN_LOOPS.md`, la bitácora [194](194-perfil-artista-correcciones.md) (de dónde sale el canon actual), y el código de partida: `src/components/ui/Ficha.module.css`, `src/app/artistas/[id]/page.tsx`, `src/app/lugares/[id]/page.tsx`, `src/app/eventos/[id]/page.tsx`, `src/app/perfil/MisArtistas.tsx` y su CSS, y el commit `4e27d63` (tarjeta original de «Mis artistas»).

## Qué se hizo

### 1. Círculos de 56 px con icono más grande; la sombra, intacta

`src/components/ui/Ficha.module.css`, `.accionIcono`: el círculo pasa de `var(--toque)` (48 px) a 56 px fijos; se agregó `.accionIcono svg { width: 26px; height: 26px; }` para que el icono crezca con el círculo sin tocar cada icono uno por uno (los `<Icono*>` siguen con su tamaño por defecto de 24 px como atributo HTML; la regla de CSS lo sobreescribe). `box-shadow: var(--sombra)` no se tocó: es el mismo token, sin cambiar su valor ni su declaración.

### 2. Reparto de los círculos, en CSS puro con una función pura para decidir la clase

`src/lib/ficha.ts` (nuevo): `cabenRepartidas(cantidad)` — pura, sin medir el DOM — dice si una cantidad de círculos cabe repartida a todo el ancho (hasta `MAXIMO_ACCIONES_REPARTIDAS` = 4, el número que el founder fijó viendo cuatro círculos de 56 px a 390 px con espacio de sobra) o si necesita el carril deslizable. Probada en `src/lib/ficha.test.ts` (2 pruebas: caben hasta el máximo, no caben más).

`Ficha.module.css` suma dos clases que se combinan con `.acciones` según esa función:
- `.accionesRepartidas { justify-content: space-between; }` — con un solo círculo lo deja a la izquierda (el comportamiento por defecto de flex, sin necesitar una clase aparte); con dos o más, el espacio sobrante se reparte igual entre ellos.
- `.accionesCarril { gap: 20px; }` — mismo `overflow-x: auto` que ya tenía `.acciones`; el gap fijo de 20 px es el pedido por el founder. El siguiente círculo asoma por el borde solo por aritmética (el ancho de los círculos con su gap no es múltiplo exacto del ancho visible), el mismo efecto que ya usa el carril de Destacados — no hizo falta ningún padding especial.

Aplicado en los tres `page.tsx` que comparten `Ficha.module.css`:
- `artistas/[id]/page.tsx`: `cabenRepartidas(redesConEnlace.length)`.
- `lugares/[id]/page.tsx`: `cabenRepartidas(2 + redes.length)` (2 = «Cómo llegar» + «Compartir», siempre presentes, más las redes).
- `eventos/[id]/page.tsx`: siempre 3 acciones fijas (Compartir, A mi calendario, Cómo llegar) — caben siempre, así que usa `.accionesRepartidas` directo, sin llamar a la función con un número constante.

### 3. Título «Enlaces»: sin línea, 16 px hasta el carril

El título compartía `FichaLista.module.css` (`.lista h2`), pensado para listas largas que se recorren (pegajoso, con línea de separación) — no para un carril corto. Se le dio una sección propia en `Ficha.module.css`: `.seccionEnlaces` (el envoltorio) y `.seccionEnlaces h2` (sin `border-bottom`, `margin-bottom: var(--espacio-4)` = 16 px, el mismo espacio que usa `Destacados.module.css` entre el título de un carril y el carril en Inicio). `artistas/[id]/page.tsx` cambió `className={styles.lista}` por `className={ficha.seccionEnlaces}` en esa sección; nada más de esa página cambió (el título sigue diciendo «Enlaces», solo si hay enlaces).

### 4. «Mis artistas»: de vuelta a la tarjeta blanca, sin compartir

`src/app/perfil/MisArtistas.tsx` deja el renglón simple que puso OL-159 (causaba que se perdiera el `Ver mi ficha de artista` claro; el founder lo quiso de vuelta) y recupera la tarjeta de `4e27d63`: avatar de 52 px (foto o inicial sobre fondo gris), nombre en negrita, disciplina debajo y el botón «Ver mi ficha de artista» — quitando **solo** el botón de compartir (ya vive junto al avatar de la ficha desde OL-159, así que no hace falta aquí) para que el nombre y la disciplina tengan más aire. `etiquetaVerMiFicha` (borrada en OL-159 al no tener más uso) se repuso en `src/lib/artistas.ts`, con su prueba en `src/lib/artistas.test.ts`: con un solo artista dice «Ver mi ficha de artista»; con varios, «Ver ficha» (el nombre de la tarjeta ya distingue cuál es cuál).

`MisArtistas.module.css`: mismo grid `"foto nombre boton"` de `4e27d63`, sin la columna de compartir. La disciplina (`.nombre small`) ahora puede usar hasta dos líneas con puntos suspensivos si no cabe (`-webkit-line-clamp: 2`), en vez de cortarse a una sola línea — el espacio que liberó quitar el botón de compartir se usa para eso, no para agrandar nada más.

## Pruebas

`src/lib/ficha.test.ts` (nuevo, 2 pruebas) y `src/lib/artistas.test.ts` (1 prueba repuesta, 3 aserciones). `npm run lint && npm run typecheck && npm test && npm run build`: verdes. **1124 pruebas**, todas pasan (0 rotas); el único aviso de lint es el preexistente y ajeno de `docs/diseno/logotipo/iconos-sn.mjs`.

## Verificación

Sin `node_modules` al empezar: `npm ci` primero (`package.json` y el lock quedaron intactos, sin tocarlos). Sin Supabase configurado en este árbol de trabajo: un arnés temporal (`src/app/arnes198-temporal/`, datos inventados — Ana Reyes, Trío Cantera — con los componentes reales: `Ficha.module.css`, `EnlaceExterno`, `IconoRed`, `Cartel`, `MisArtistas`) sirvió las capturas y **se borró antes de comitear** (no aparece en `git status`, verificado arriba en este mismo documento de trabajo).

Con `next build && next start` (puerto 4198) y Chrome real (`playwright-core`, instalado solo en el scratchpad de la sesión, nunca en el repo), medido con `getBoundingClientRect()`/`getComputedStyle()`:

| | 1 enlace | 3 enlaces | 6 enlaces |
|---|---|---|---|
| Línea bajo «Enlaces» | ninguna | ninguna | ninguna |
| Título → carril | 16 px | 16 px | 16 px |
| Círculo | 56×56 px | 56×56 px | 56×56 px |
| Icono | 26 px | 26 px | 26 px |
| Sombra | `0 2px 12px rgba(0,0,0,.08)` (= `--sombra`, sin cambios) | igual | igual |
| `justify-content` | `space-between` | `space-between` | `normal` (carril) |
| `gap` | 16px (el de `.acciones`) | 16px | 20px (fijo, pedido) |
| `overflow-x` | `auto` (sin desbordar) | `auto` (sin desbordar) | `auto`, con scroll |

`document.fonts.check('700 20px "Bricolage Grotesque"')` = `true`.

### Capturas reales (`docs/rediseno/capturas-198/`), 390×844, abiertas y descritas

- **`01-ficha-un-enlace.png`:** el título «Enlaces» sin línea debajo, 16 px de aire, y un solo círculo de 56 px (Instagram, icono violeta más grande que antes) a la izquierda, con su letrero — no se estira ni se centra.
- **`02-ficha-tres-enlaces.png`:** tres círculos (Instagram, Facebook, TikTok) repartidos a todo el ancho con el mismo espacio entre ellos — el primero pegado a la izquierda, el último cerca del borde derecho, sin que sobre espacio muerto.
- **`03-ficha-seis-enlaces-carril.png`:** cuatro círculos completos (Instagram, Facebook, TikTok, YouTube) y un quinto (Vimeo) cortado por el borde derecho de la pantalla — el carril deslizable, con el espacio fijo de 20 px y el siguiente círculo asomando para que se note que hay más.
- **`04-mi-perfil-dos-artistas.png`:** de arriba a abajo, las tres variantes de Enlaces de la ficha de Ana Reyes (para comparar los tres repartos en la misma captura) y, tras el separador «Mi perfil», la sección «MIS ARTISTAS» con dos tarjetas blancas: Ana Reyes (avatar gris con «A», «Son huasteco tradicional de la huasteca potosina · Solista» en dos líneas con el corte de `line-clamp`, botón violeta «Ver ficha») y Trío Cantera (avatar «T», «Música · Grupo» en una línea, mismo botón «Ver ficha» — dice «Ver ficha» y no «Ver mi ficha de artista» porque hay dos artistas ligados, tal como `etiquetaVerMiFicha` lo decidía en `4e27d63`). Sin botón de compartir en ninguna de las dos tarjetas.

## Límites

- El número que reparte o manda al carril (4) es fijo, no una medida en vivo del ancho disponible: es simple y cubre el caso que el founder señaló (390 px); una pantalla mucho más ancha (tablet, `--columna` de 600 px) podría tener sitio de sobra para un quinto círculo repartido y aun así ir al carril. No se amplió a una medida real del contenedor (`ResizeObserver` o similar) porque no se pidió y hubiera sido JavaScript donde el founder pidió CSS si se podía.
- Sin segunda prueba del founder en su iPhone todavía: pendiente, como en toda pieza de esta fase.
- La rama se abrió desde `origin/main` recién traído (`git fetch` antes del primer commit); sin push ni PR en esta entrega.

## Archivos

`src/components/ui/Ficha.module.css`, `src/app/artistas/[id]/page.tsx`, `src/app/lugares/[id]/page.tsx`, `src/app/eventos/[id]/page.tsx`, `src/lib/ficha.ts` (nuevo), `src/lib/ficha.test.ts` (nuevo), `src/lib/artistas.ts`, `src/lib/artistas.test.ts`, `src/app/perfil/MisArtistas.tsx`, `src/app/perfil/MisArtistas.module.css`, `docs/rediseno/capturas-198/` (4 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
