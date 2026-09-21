# 29 — Aviso al salir de la plataforma (OL-105)

**Pedido del founder (2026-09-21):** «Cuando el usuario salga de la plataforma por medio de link, notificar que sale de la plataforma con un elemento emergente (puede ser bottom sheet con accionables de confirmación y checkbox de no volver a notificar) le alertamos que sale del sitio para los casos en donde se compren boletos o se pidan otros datos, que lo sepa explícitamente.»

**Veredicto en tres líneas:** el sitio tiene 4 familias de enlaces que sacan a otro dominio; solo dos de ellas (el enlace del evento y las redes/sitio de artistas y lugares) son el tipo de destino donde pueden pedir pago o datos — ahí propongo el aviso. Las otras dos (Cómo llegar, Compartir) ya son gestos que la persona reconoce como "otra app": ponerles aviso también le resta fuerza al aviso donde sí importa. Falta tu firma sobre las 5 decisiones de abajo antes de tocar código.

## 1. Inventario (medido en el código, nada tocado)

| # | Enlace | Dónde vive | Destino | ¿Nueva pestaña? |
|---|---|---|---|---|
| 1 | Enlace del evento ("boletos" / "más información") | [`src/app/eventos/[id]/page.tsx:344-348`](../../src/app/eventos/[id]/page.tsx) | `e.enlace`: URL libre que pega quien publica el evento (boletera, sitio del evento, una red social) | Sí, `target="_blank" rel="noopener noreferrer"` |
| 2 | Redes y sitio web del artista | [`src/app/artistas/[id]/page.tsx:268-273`](../../src/app/artistas/[id]/page.tsx) | Lista `redes` normalizada por [`src/lib/enlaces.ts`](../../src/lib/enlaces.ts): Instagram, Facebook, TikTok, YouTube, Vimeo, Spotify, SoundCloud, Bandcamp, Apple Music, WhatsApp (`wa.me`), X, Threads, Linktree, o "Sitio" (cualquier otro dominio) | Sí, `target="_blank" rel="noopener noreferrer"` |
| 3 | Redes y sitio web del lugar | [`src/app/lugares/[id]/page.tsx:247-252`](../../src/app/lugares/[id]/page.tsx) | Mismo mecanismo que el 2 | Sí, `target="_blank" rel="noopener noreferrer"` |
| 4 | "Cómo llegar" (texto) | [`eventos/[id]/page.tsx:329-333`](../../src/app/eventos/[id]/page.tsx) y [`lugares/[id]/page.tsx:239-242`](../../src/app/lugares/[id]/page.tsx) | Siempre `google.com/maps/dir/...` (`enlaceComoLlegar` en [`lib/eventos.ts:125`](../../src/lib/eventos.ts)) | Sí, `target="_blank" rel="noopener noreferrer"` |
| 5 | Mapa pequeño de la ficha (imagen, mismo destino que "Cómo llegar") | [`src/components/MapaFicha.tsx:21`](../../src/components/MapaFicha.tsx) | El mismo `href` del punto 4 | Sí, `target="_blank" rel="noopener noreferrer"` |
| 6 | Compartir | [`src/components/BotonCompartir.tsx`](../../src/components/BotonCompartir.tsx) | Hoja nativa del teléfono (`navigator.share`) si existe; si no, `window.open` a `wa.me/?text=...` con el texto ya armado | No es un `<a>`: `window.open` solo cuando no hay hoja nativa |
| 7 | "A mi calendario" | `<a href="/eventos/[id]/calendario">` en [`eventos/[id]/page.tsx:325-328`](../../src/app/eventos/[id]/page.tsx) | Ruta propia (`route.ts`) que sirve un archivo `.ics` para descargar — **no sale del dominio**, el teléfono lo abre en su calendario | No lleva `target="_blank"` |
| 8 | WhatsApp/teléfono directos (`wa.me`, `tel:`) | — | No existe ningún `tel:` en el código. El único `wa.me` fuera de una red registrada es el de Compartir (punto 6) | — |
| 9 | Enlaces dentro de descripciones | [`src/components/Desplegable.tsx`](../../src/components/Desplegable.tsx) | El texto se pinta tal cual (`<p>{texto}</p>`); no hay conversión de URL a enlace | No aplica — hoy no existen |
| 10 | Aviso de privacidad | [`src/app/privacidad/page.tsx:67`](../../src/app/privacidad/page.tsx) | Solo enlaza a `/reglas` (ruta propia) | No aplica — no hay enlaces externos ahí |
| 11 | "Ver versión actual en otra pestaña" (conflicto al guardar) | [`src/app/eventos/FormularioEvento.tsx:706`](../../src/app/eventos/FormularioEvento.tsx) | `/eventos/[id]` — dentro del mismo sitio | Sí, pero no sale del dominio |

## 2. Las cinco decisiones (con mi recomendación)

### a) ¿A cuáles enlaces aplica?

**Recomiendo que aplique a los puntos 1, 2 y 3**: el enlace del evento y las redes/sitio de artistas y lugares. Son los que llevan a un tercero donde puede haber una compra (boletera) o un formulario con datos (contacto, registro).

**No aplicaría** a los puntos 4/5 (Cómo llegar — el icono de ruta y el mapa ya dicen "voy a Mapas"), 6 (Compartir — es la hoja del propio teléfono) ni 7 (calendario — ni siquiera sale del dominio). Ponerle aviso a todo le resta fuerza al aviso donde sí importa.

**Un caso a decidir tú:** el WhatsApp de un artista o lugar (punto 2/3, cuando alguien lo registró como su red) hoy se ve y se abre exactamente igual que un sitio web o Instagram — con la misma fila de "Redes". Por eso lo trato igual que el resto de las redes (con aviso), a diferencia del WhatsApp de Compartir (que es un gesto distinto, la hoja de compartir). Dímelo si lo quieres tratar distinto.

### b) ¿Qué dice la hoja?

Mínimo texto, sin tono de alarma:

- Título: **"Vas a salir de Somos Nosotros"**
- Dominio real, legible, en tarjeta aparte: **"`boletia.com`"** (o el dominio que sea) — se calcula de la URL real, nunca del texto del botón. *(Corrección del gestor, 2026-09-21: el prototipo firmado decía "Vas a boletia.com" debajo del título "Vas a salir de Somos Nosotros" — dos "Vas a" seguidos. Se quitó el segundo; el título ya lo dice.)*
- Una línea: **"Ahí puede que te pidan un pago o tus datos."**
- Botón primario (`ui/Boton`, variante principal): **"Continuar"** (abre el enlace).
- Salida clara para quedarse (`ui/Boton`, variante secundario): **"Quedarme aquí"** (cierra la hoja).
- Casilla: **"No volver a avisarme"**.

### c) "No volver a avisar"

Se guarda en el teléfono, no en la cuenta: `localStorage`, clave `sn-sin-aviso-salida` (booleano), con `try/catch` para modo privado (si falla, el aviso simplemente se sigue mostrando). No hace falta migración ni tabla.

**Dónde se reactiva:** propongo un renglón nuevo en Ajustes, junto a los demás de privacidad/avisos: **"Avisar al salir del sitio"** con una palanca (on por default; off si la persona marcó la casilla). Se revisa junto con los renglones de Ajustes que ya existen — te lo muestro en el prototipo.

### d) Seguridad (parte del pedido: "cuidar el riesgo")

- El enlace real ya lleva `rel="noopener noreferrer"` en el código de hoy (los 5 puntos con `target="_blank"`) — la nueva pieza lo conserva.
- Solo se ofrece continuar si el esquema es `http`/`https` (nunca `javascript:` ni otro esquema raro que alguien haya logrado meter en un campo de enlace).
- El dominio que se muestra sale de `new URL(href).hostname`, nunca del texto del botón ni de lo que puso la persona que publicó.
- Nada de redirección propia ni de contar el clic: el `href` de la hoja es el mismo `href` que ya tenía el enlace original.

### e) Accesibilidad y robustez

- Sigue siendo un `<a href="...">` de verdad (nunca un `<button>` que solo dispara JavaScript): sin JavaScript, el enlace navega directo — el aviso es una mejora, no un requisito para que el enlace funcione.
- Clic central, "abrir en pestaña nueva" del menú contextual, y Cmd/Ctrl+clic siguen funcionando: el interceptor de clic revisa los modificadores y el botón del ratón; si hay alguno, no hace nada y deja que el navegador siga su curso normal (sin mostrar la hoja).
- La hoja reutiliza `ui/Hoja` (atrapa el foco, cierra con Escape y tocando fuera).
- Cerrar la hoja no toca el historial — no hace falta "Atrás" para salir de ella (regla "filtrar no es navegar").

## 3. Qué falta

1. Tu firma sobre las decisiones a-e (o los cambios que pidas).
2. Con la firma, aviso al gestor con tus palabras y empiezo el código: un componente `ui/EnlaceExterno` reutilizable + la hoja, sustituyendo los 3 puntos del inventario que decidamos, y el renglón nuevo en Ajustes.

Prototipo: [`prototipos/aviso-al-salir.html`](prototipos/aviso-al-salir.html) (390×844, toca los tres botones de arriba para ver los tres enlaces del inventario con la hoja, y el renglón de Ajustes abajo).
