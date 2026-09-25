# 48 · Shell nativo del iPhone: barras del sistema (OL-202)

**OL-202 · Bitácora 231 · 2026-09-25.** Fase 1 de la adaptación del shell (barras) al envoltorio nativo de iOS
(OL-194, rama `app-ios-capacitor`, PR #234 sin unir). Founder: «necesito que hagamos pruebas para que verifiques
que el look no se rompe, usar navbar y toolbar nativos en la medida de lo posible, en general hacer la adaptación
de shell». Esta pieza es solo auditoría + documento + prototipo: **el código va en piezas aparte**, después de que
el founder firme esta propuesta.

## 0. Qué se auditó

Dos simuladores propios (`OL-202 iPhone 17 Pro` e `OL-202 iPhone SE`, iOS 26.3, creados con `xcrun simctl create`
para no tocar los de otro chat), compilando la app de la rama `app-ios-capacitor` en un árbol de trabajo aparte
(`git worktree add`, fuera del repo). Capturas reales con `xcrun simctl io screenshot` en
[`docs/rediseno/capturas-231/`](capturas-231/), descritas una por una en la bitácora
[231](../bitacora/2026/09/231-shell-ios.md). Recorrido: Inicio, Agenda, Lugares (mapa y lista), Artistas, ficha de
evento, de lugar y de artista, el portón de «Entrar» (Ajustes y el alta de evento piden sesión: sin credenciales,
se auditó ese portón en su lugar, como permite el encargo), una hoja de menú, la hoja «Compartir», la hoja
«Dónde» (ciudad), un enlace externo y el teclado abierto sobre un campo.

## 1. Los cinco problemas más visibles

| # | Qué se ve | Por qué importa | Captura |
|---|---|---|---|
| 1 | **Con el teclado abierto en «Entrar» (o cualquier alta/edición), la barra `Atrás · SMSNSTRS` sube hasta pegarse a la barra de estado**: el logotipo queda encimado con la hora y la muesca/isla dinámica. | Es el «se rompe» más fuerte del recorrido: una zona segura que dejó de respetarse en el momento exacto (formulario con teclado) en que más pantallas de alta se usan. | `13-teclado-barra-tapada-pro.png` |
| 2 | Esa misma familia de pantallas (`Entrar`, y las 8 páginas de alta/edición que comparten el mismo patrón: campo `.pagina` + `ui/Barra` con `volver`) arranca con un hueco vacío entre la barra de estado y la barra `Atrás`, más grande que en una ficha o un listado. | Se ve descuidado sin necesidad; nadie lo pidió así. | `12-entrar-doble-padding-pro.png` frente a `03-ficha-evento-pro.png` (sin hueco) |
| 3 | **El gesto de deslizar desde el borde izquierdo para volver no hace nada** (se probó desde el borde de verdad, dentro de la ficha de un evento). | Es el gesto que cualquiera trae aprendido de toda app de iOS; su ausencia se siente como «esto es una página web», justo lo que el founder quiere evitar. | Probado en vivo, sin captura (no hay nada que fotografiar: no pasa nada) |
| 4 | Mantener el dedo sobre un texto cualquiera (probado en el nombre de un lugar) saca el menú nativo de iOS «Copy · Look Up · Translate» sobre la selección azul. | Un menú de navegador encima de contenido de la app rompe la ilusión de app nativa en el peor momento (mientras se toca la pantalla). | `07-seleccion-texto-pro.png` |
| 5 | Un enlace externo (Instagram de un artista) sale primero por un aviso propio de la web («Vas a salir de Somos Nosotros») y, al continuar, abre **Safari completo** (no una hoja dentro de la app); Safari sí ofrece un botón «‹ Somos Nosotros» para volver. | No es necesariamente un defecto —es lo normal de un `<a target>` sin interceptar— pero es justo el tipo de salto que una app nativa evita con `SFSafariViewController`, y hay que decidir a propósito si se deja así. | `17-aviso-salir-pro.png` y `18-enlace-externo-safari-pro.png` |

Resto del recorrido, sin sorpresas: la cabecera pegajosa de Agenda/Lugares/Artistas respeta la muesca/isla
dinámica (`ui/Barra.module.css`, `.interior { padding: env(safe-area-inset-top) … }`); la nav inferior respeta el
indicador de inicio (`NavInferior.module.css`, `env(safe-area-inset-bottom)`); las transiciones entre pestañas
(fundido 200 ms, `app/template.tsx`) no mostraron doble barra; el mapa de Mapbox carga y se toca bien dentro del
`WKWebView`; los campos de formulario ya usan `font-size: max(16px, var(--letra-md))`
(`globals.css:118`) así que **no hay zoom automático de iOS al enfocarlos** (comprobado: el campo de correo en
`13-teclado-barra-tapada-pro.png` no zoomea, solo se tapa); la hoja «Compartir» y la hoja «Dónde» abren y cierran
limpias, con el fondo bloqueado y sin que la página de atrás se mueva (`ui/Hoja.tsx`). El cargador con el símbolo
SN pulsando (`ui/SimboloCargando`) no se pudo fotografiar: la red local del simulador es tan rápida que el
`Suspense` resuelve en el mismo fotograma; no es un hallazgo, es una limitación de esta prueba (mismo problema que
documentó OL-194 al no poder cortar la red del Mac sin afectar a otro chat). El iPhone SE (sin muesca, con botón
de inicio) se ve igual de bien: las tres franjas del shell no dependen de que haya isla dinámica.

## 2. Por qué pasa el problema 1 y 2 (para quien construya el arreglo)

`Barra.module.css` reparte la zona segura en dos sitios que no se hablan entre sí:

- `.pagina` (la clase genérica de `globals.css`, usada por 9 pantallas: `entrar`, `reglas`, `privacidad` y los 6
  formularios de editar/alta) mete `padding-top: calc(var(--espacio-5) + env(safe-area-inset-top))` **antes** de
  que se pinte la barra.
- `ui/Barra.module.css` (`.interior`) mete **otra vez** `padding: env(safe-area-inset-top) …` dentro de la propia
  barra, porque cuando la barra queda pegajosa (`position: sticky; top: 0`) necesita su propio colchón para no
  quedar bajo la muesca al llegar al tope.

Sin teclado, el resultado es un hueco más grande de lo normal (problema 2: colchón + colchón). Con el teclado
abierto, el `WKWebView` de Capacitor cambia cómo reporta el área visible (el mismo mecanismo que ya documentó
OL-194 en `Hoja.tsx` para seguir al `visualViewport`) y, en esta combinación concreta, el colchón de `.interior`
deja de aplicarse mientras la barra sigue pegajosa en el tope físico: de ahí el logotipo encimado con la hora. Las
fichas (`ui/Ficha.module.css`, `.pagina` propio, sin relleno arriba) no tienen este problema porque nunca duplican
el colchón: la barra es la única que lo pone. **Esto no es exclusivo del envoltorio nativo** —la misma duplicación
existe en la web instalada en el inicio del iPhone (PWA), porque ahí también hay zona segura real—, así que no es
"código de shell", es un arreglo chico de CSS que toca `globals.css` y/o `Barra.module.css`; se dejó fuera de esta
pieza (auditoría sin código) y se puede convertir en una pieza aparte, chica, en cuanto el founder la autorice
(ver spawn de la tarea al cierre del informe).

## 3. Qué pasa a nativo y qué se queda web

### 3.1 Barra de pestañas (UITabBar)

**Recomendación: pasar a nativo.** Es la barra que más tiempo está en pantalla y la que más se compara con
cualquier otra app del teléfono.

| | Hoy (web, `NavInferior.tsx`) | Propuesto (nativo) |
|---|---|---|
| Aspecto | Reconstruida en HTML/CSS: 4 destinos, píldora de color tras el icono activo | `UITabBarController` con el aspecto de iOS 26 (Liquid Glass) — el que ya trae el sistema, sin dibujarlo a mano |
| Iconos | SVG propios (`ui/Iconos.tsx`) | Los mismos cuatro glifos (casa, calendario, pin, estrella) como `UIImage(systemName:)` de SF Symbols, o los SVG propios importados como plantillas si el founder prefiere conservar el trazo exacto |
| «Vuelve a la última URL de la sección» | `sessionStorage` + `leerUrlSeccion` (`lib/memoriaPantalla.ts`) | **Se conserva tal cual**: la pestaña nativa no decide la URL, solo avisa «se tocó Lugares»; la web sigue siendo la que sabe a qué URL volver (ver el puente, sección 4) |
| «Tocar la pestaña activa sube arriba» | `router.replace` a la raíz + scroll a 0 (`aLaRaiz` en `NavInferior.tsx`) | Igual: la app nativa avisa «se tocó la pestaña ya activa» y la web decide (sube arriba, sin apilar historial) — es la misma regla, solo cambia quién dibuja el botón |

Riesgo real: la barra de pestañas nativa vive **fuera** del `WKWebView`, así que un cambio de sección por *link*
dentro de la web (no por tocar la pestaña) tiene que avisarle a la barra nativa cuál marcar activa — si no, se
puede ver una pestaña iluminada que no es la sección visible. Se resuelve con el mismo aviso descrito en la
sección 4 (web → nativo al cambiar de ruta).

### 3.2 Barra de navegación (`UINavigationBar`)

**Recomendación: NO pasar a nativo en esta fase — queda web.** Motivo, verificado en el código, no supuesto: el
"Atrás" de la app (`ui/Atras.tsx`, `useVolver`) no es un simple `history.back()` de navegador — decide, con una
**marca propia en el historial** (`lib/historial.ts`, `Navegacion.tsx`), si hay una pantalla de la app detrás o si
hay que ir a la pantalla madre (llegó por un enlace compartido). Un `UINavigationBar` nativo con su propio `‹
Volver` no tiene forma de preguntarle a esa marca antes de decidir: o replica toda esa lógica en Swift (duplicar
`hayPantallaAnterior`/`vuelveA` de `lib/historial.ts` en dos lenguajes, con el riesgo de que se desincronicen), o
dispara siempre `WKWebView.goBack()` sin más, que **no** es lo mismo (un `goBack()` ciego rompe justo la regla
"filtrar no es navegar": si la pantalla actual llegó reemplazando entradas de filtro, o si no hay entradas atrás
en el `WKWebView` porque la marca vive en `sessionStorage`, no en el `WKBackForwardList`). Alternativa que sí se
recomienda, sin esperar a resolver esto: el título de la pantalla (nombre del evento, del lugar, del artista) y el
botón de acción a la derecha (Compartir) **sí pueden pasar a una barra nativa simple algún día**, siempre que el
botón "Atrás" siga siendo el que ya existe hoy (el de `ui/Atras.tsx`, dibujado por la web, dentro del
`WKWebView`) — es decir: barra nativa con título y acción, pero sin su botón de regreso nativo. Se deja para una
segunda vuelta porque no es la pieza que más se nota (el patrón actual, `‹ Atrás · SMSNSTRS · ···`, ya se ve
limpio y no se reportó como "se siente web" en la auditoría).

### 3.3 Gesto de deslizar para volver

Hallazgo de la auditoría (problema 3): **no funciona hoy**. Comprobado en el código: `@capacitor/ios` no activa
`allowsBackForwardNavigationGestures` del `WKWebView` (no aparece en ningún archivo de
`node_modules/@capacitor/ios`, y Apple lo trae **apagado por omisión**). Encenderlo es una línea en
`MainViewController.swift` (`webView?.allowsBackForwardNavigationGestures = true`), pero por lo mismo que la
sección 3.2: ese gesto dispara el `WKBackForwardList` nativo, que no es la marca propia de `lib/historial.ts`.
Antes de encenderlo hay que decidir uno de dos caminos y probarlo a fondo (no adivinarlo aquí): (a) dejar que el
gesto dispare `goBack()` nativo y aceptar que en pantallas con historial de filtros se comporte distinto al botón
"Atrás" de la web, o (b) interceptar el gesto (como ya hace `EntrarSistemaPlugin.swift` con la navegación a
`/auth/apple`) y, en vez de dejarlo navegar, pedirle a la web que ejecute su propio `useVolver`. La opción (b) es
la coherente con "filtrar no es navegar" y con la memoria de pantalla, y es la que se recomienda, pero es trabajo
nuevo (no existe hoy un gancho de Capacitor para "intercepta el gesto y pregúntale a la web", solo para
navegaciones) — se detalla como pieza 3 en la sección 6.

### 3.4 Acciones de ficha (Voy, Seguir, Compartir)

**Recomendación: se quedan web.** Hoy son la barra pegajosa inferior (`ui/Ficha.module.css`, `.accionFija`) y los
círculos de 56 px (`.accionIcono`, canon del founder desde OL-163). Pasarlos a una `UIToolbar` nativa no suma
nada — ya son botones grandes, con icono, color de acción y estado marcado ("✓ Voy") — y sí se pierde: el estado
"Voy"/"Sigues" con nota (`small` dentro de `.seleccionado`, ficha de evento) y el reparto por intención (uno o dos
a la izquierda, tres o más repartidos o en carril, `lib/ficha.ts`) son reglas de producto finas que ya están
resueltas en CSS/React; reconstruirlas en `UIBarButtonItem` es más trabajo por el mismo resultado visual, con el
riesgo de desincronizar el estado (¿el corazón nativo sabe que ya se tocó "Voy" en la web?) sin necesidad.

### 3.5 Hojas (`UISheetPresentationController`)

**Recomendación: se quedan web**, con una excepción a vigilar. `ui/Hoja.tsx` ya resuelve, en CSS/JS, lo que
`UISheetPresentationController` da gratis (asa, altura media/completa, cerrar deslizando, respeto del
`visualViewport` con el teclado) — y lo resuelve bien: la auditoría no encontró ningún salto raro en la hoja
"Compartir" ni en la hoja "Dónde". Pasarlo a nativo obligaría a decidir su contenido (QR, campo con el enlace,
lista de ciudades) en Swift, duplicando lo que ya hace React. La excepción: si en el futuro una hoja necesita
gestos que el `WKWebView` no puede dar bien (por ejemplo, arrastrar para redimensionar con inercia nativa), esa
hoja puntual puede evaluarse aparte — hoy ninguna lo necesita.

### 3.6 Arreglos web-en-app (sin nada nativo)

Activados solo dentro de la app, nunca en la web normal del navegador — por el user-agent que ya manda Capacitor
(`appendUserAgent: "SomosNosotrosApp"`, `capacitor.config.ts`, comprobado en el código de OL-194) o, más simple y
sin depender de leer el user-agent en cada componente, una clase en `<html>` que ponga una vez el layout raíz al
arrancar (`document.documentElement.classList.add("app-nativa")` cuando `window.Capacitor?.isNativePlatform()`
sea verdadero — `Capacitor` ya viene disponible como global porque `@capacitor/core` está instalado):

| Arreglo | CSS | Por qué (evidencia de esta auditoría) |
|---|---|---|
| El hueco doble de `.pagina` + `Barra.interior` (problemas 1 y 2) | Quitar el `env(safe-area-inset-top)` de uno de los dos sitios | Es un arreglo de CSS puro, no de shell — se deja para una pieza aparte de código (spawn al cierre) |
| Selección de texto con menú nativo (problema 4) | `-webkit-touch-callout: none; -webkit-user-select: none;` en títulos, etiquetas y botones (no en campos de formulario, que sí deben poder seleccionarse) | `07-seleccion-texto-pro.png` |
| Resaltado gris nativo al tocar enlaces sueltos | `-webkit-tap-highlight-color: transparent` en `<a>` de texto corrido (`reglas de uso`, `aviso de privacidad`, enlaces de artículo) — ya está puesto en botones e iconos (17 sitios, comprobado en el código), falta en los enlaces de texto | No capturable en una imagen fija (es un destello); confirmado por inspección de código |
| Rebote del scroll y color de fondo | Ninguno necesario | `html, body { background: var(--fondo) }` ya cubre el fondo del rebote (comprobado en `globals.css:76-89`); el rebote en sí es el comportamiento nativo esperado de iOS, no hay que apagarlo |
| Zoom al enfocar campos | Ninguno necesario | Ya resuelto: `font-size: max(16px, …)` en campos (`globals.css:118`) |
| Enlaces externos (problema 5) | Ninguno — es una decisión de producto, no de CSS | Ver sección 3.7 |

### 3.7 Enlaces externos: ¿Safari completo o una hoja dentro de la app?

Esto no estaba en la lista original de 5 puntos pero salió de la auditoría (problema 5) y hay que decidirlo antes
de escribir código. Hoy: aviso propio de la web → Safari completo, con vuelta por el botón "‹ Somos Nosotros" que
pone el propio iOS. Es una experiencia correcta y ya "de app" (ese botón de vuelta es un regalo del sistema, no
hay que construirlo), pero se sale por completo de Somos Nosotros. La alternativa nativa —`SFSafariViewController`
o `ASWebAuthenticationSession`— abriría el enlace **encima** de la app sin salir de ella, al mismo estilo que ya
usa `EntrarSistemaPlugin.swift` para Apple/Google. Recomendación: **dejarlo como está por ahora** (no es una
barra, es una pieza mediana con riesgo propio: interceptar salidas a redes sociales, YouTube, etc. sin romper el
aviso "Vas a salir…" que ya existe) y anotarlo como pendiente para cuando el founder priorice pulir enlaces
externos; no bloquea nada de las barras.

## 4. El puente web ↔ nativo

No existe hoy (OL-194 no lo necesitó: solo intercepta *antes* de que la web decida algo, para Apple/Google). Para
la barra de pestañas nativa hace falta un canal en las dos direcciones, con el mecanismo real de Capacitor que ya
se usa en `EntrarSistemaPlugin.swift` — un plugin propio, sin paquete de npm, registrado a mano:

- **Un plugin nuevo, ej. `PantallaPlugin.swift`** (mismo patrón que `EntrarSistemaPlugin`: clase Swift que hereda
  de `CAPPlugin`, registrada en `MainViewController.capacitorDidLoad()` con `bridge?.registerPluginInstance(...)`,
  sin depender de `capacitor.config.json`).
- **Web → nativo, al cambiar de ruta** (un efecto en `app/template.tsx`, que ya sabe detectar cambios de sección):
  llama `Capacitor.Plugins.Pantalla.actualizar({ seccion, titulo, puedeVolver, acciones })` — un método
  `@objc func actualizar(_ call: CAPPluginCall)` en Swift que resuelve la llamada y usa esos datos para marcar la
  pestaña activa en el `UITabBarController` (y, si algún día se hace la barra de navegación nativa de la sección
  3.2, el título y los botones).
- **Nativo → web, al tocar una pestaña o (si se hace la sección 3.3) el gesto de volver**: el plugin llama
  `self.notifyListeners("pestanaTocada", data: ["seccion": "..."])` (el mismo mecanismo, `notifyListeners`, que
  trae `CAPPlugin.h` de serie); la web escucha una vez, cerca de `Navegacion.tsx`, con
  `Capacitor.Plugins.Pantalla.addListener("pestanaTocada", ({ seccion }) => { … })` y ejecuta exactamente la
  misma función que hoy ejecuta el tap en `NavInferior.tsx` (`aLaRaiz` si ya estás en esa sección,
  `router.push(ultimaValida(...))` si no) — **cero lógica nueva de navegación**, solo un disparador distinto para
  la que ya existe.

## 5. Riesgos

- **Doble barra durante la carga.** Si la pestaña nativa se pinta antes de que el `WKWebView` termine de
  hidratar, puede verse un instante la barra nativa activa en "Lugares" mientras la web todavía muestra "Inicio".
  Mitigación: el plugin no marca la pestaña hasta recibir el primer `actualizar()` de la web (arranca en el
  estado que ya traiga `capacitorDidLoad`, no antes).
- **Sincronía marca-viva.** Si la web navega por código (ej. `router.replace` tras cerrar sesión) sin pasar por un
  tap en la barra, tiene que acordarse de llamar `actualizar()` igual — si no, la pestaña nativa queda
  desincronizada. Se resuelve poniendo el aviso en `template.tsx` (donde ya vive la detección de cambio de
  sección) y no en `NavInferior.tsx` (que solo ve los taps).
- **El cargador SN y las transiciones de `template.tsx`.** El fundido de 200 ms entre secciones (`app/template.tsx`)
  y el símbolo pulsando (`CargandoRaiz`) son animaciones de la web, dentro del `WKWebView`; la barra de pestañas
  nativa vive fuera de ese lienzo y no se difumina con ella. No es necesariamente un problema (las apps nativas de
  verdad tampoco difuminan su `UITabBar` al cambiar de pestaña), pero hay que verlo en el simulador antes de
  darlo por bueno, no darlo por hecho.
- **Duplicar la lógica de "Atrás".** Ya explicado en 3.2/3.3: la tentación de resolver el gesto de deslizar con un
  `goBack()` nativo sin más rompería "filtrar no es navegar". Cualquier pieza que toque el gesto tiene que pasar
  por la marca de `lib/historial.ts`, nunca por el `WKBackForwardList` a secas.

## 6. Orden de piezas de código propuesto (para cuando el founder firme)

Cada una chica o mediana, cada una con su propia prueba en el simulador y, la que toque UI, con captura 390×844.

| # | Pieza | Tamaño | Qué prueba |
|---|---|---|---|
| 1 | El arreglo de CSS del hueco doble (sección 2) — no es shell, pero salió de esta auditoría | Chica | `/entrar` y las 8 pantallas de alta/edición sin hueco de más, con y sin teclado |
| 2 | `PantallaPlugin.swift` + el aviso `actualizar()` desde `app/template.tsx` (sin tocar todavía la barra visual) | Chica | La web manda el aviso en cada cambio de sección; se ve en el log de Xcode, sin UI nueva aún |
| 3 | `UITabBarController` como raíz de la app (reemplaza a `MainViewController` como root), con las 4 pestañas y su icono; escucha `pestanaTocada` y llama exactamente `aLaRaiz`/`ultimaValida` de hoy | Mediana | Tocar cada pestaña navega igual que hoy (memoria de pantalla intacta); tocar la activa sube arriba |
| 4 | Los arreglos CSS chicos de la sección 3.6 (`-webkit-touch-callout`, `-webkit-tap-highlight-color` en enlaces sueltos), activados por la clase en `<html>` | Chica | Mantener pulsado un texto ya no saca "Copy/Look Up"; los enlaces de "reglas de uso" no destellan gris |
| 5 | El gesto de deslizar para volver (sección 3.3, opción b: interceptar y preguntarle a la web) | Mediana | Deslizar desde el borde en una ficha vuelve exactamente a donde volvería el botón "Atrás" de hoy, incluida la vuelta a un filtro |

No entran en este orden (quedan para cuando el founder las priorice, no son parte de "adaptar el shell"): la
barra de navegación nativa con título/acción (3.2, sin resolver antes el problema de "Atrás"), el
`SFSafariViewController` para enlaces externos (3.7), ni nada de acciones de ficha en `UIToolbar` (3.4, no
recomendado).
