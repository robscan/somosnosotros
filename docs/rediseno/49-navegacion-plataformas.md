# 49 · Navegación y shell que se adapten a web, iOS y Android (OL-207)

**Fecha:** 2026-09-25 · **Solo documento y prototipo, sin código de la app** · Prototipo interactivo:
[`prototipos/navegacion-plataformas.html`](prototipos/navegacion-plataformas.html) · Capturas:
[`capturas-236/`](capturas-236/) · Bitácora: [236](../bitacora/2026/09/236-navegacion-plataformas.md).

## 0. El pedido, con las palabras del founder

OPEN_LOOPS, OL-207: *"algo estamos haciendo mal si necesitamos pedirle que aprenda algo nuevo no? Cuestiona la
manera como funciona botón atrás, cuestiona la arquitectura/navegación… ¿se puede hacer de otra manera de modo
que llevarlo a iOS y Android no implique nuevos aprendizajes?… el botón de back dice "atrás" y no creo que sea
necesario, me gusta más el canon de iOS que usa botones de acción solo con un icono… los tamaños de accionables
del header son más pequeños que el canon de iOS… hay que revisar contra Android"*.

El gestor de cambios ya adelantó un diagnóstico y el founder lo aceptó ("bien, escríbelo y dale al proto"). Este
documento lo desarrolla, lo contrasta línea por línea con el código de hoy (corrigiendo lo que el código
desmiente) y lo deja listo para que el founder decida antes de que entre código. Decisión vigente, ya tomada en
OL-202 (PR #237): *"si solo vamos a poder reemplazar algunos de los elementos para que usen componentes nativos
no veo el sentido… prefiero dejar el look como está ahora y rediseñar fuerte después"*. Esta pieza no toca el
aspecto — prepara el terreno para cuando el founder autorice ese rediseño fuerte.

## 1. Diagnóstico: lo mal puesto no es la regla, es dónde vive

**La afirmación central, contrastada con el código: sí es cierta.** "Filtrar no es navegar" —un chip, una
pestaña, "Ver más" o la ciudad cambian la vista sin apilar una pantalla nueva— **es exactamente el patrón nativo**
de las tres plataformas: un control segmentado o una pestaña interna de iOS no mete nada en la pila de
navegación; un `TabRow`/chip de Android tampoco; solo entrar a un detalle empuja una pantalla nueva. La regla no
está mal pensada. Lo que está mal puesto es **dónde vive la corrección**:

- El historial del navegador se escribe **incompleto**: cada `pushState`/`replaceState` de Next.js sale sin saber
  si la pantalla es un detalle o un reemplazo salvo que el componente ya haya decidido pasar `replace` (`Link
  replace`, `router.replace`) caso por caso. Cuando algo se les olvida marcar así, apila.
- El botón "Atrás" (`src/components/ui/Atras.tsx:28-46`, `useVolver`) **corrige** esa incompletitud al tocarlo: lee
  una marca propia escrita aparte (`src/lib/historial.ts`) que cuenta "cuántas pantallas de la app hay detrás" y,
  si no hay ninguna, va a la pantalla madre en vez de confiar en el historial del navegador.
- Esa marca **solo la lee el código de la web**. Cualquier Atrás que no pase por `useVolver` —el gesto de deslizar
  del iPhone, el botón físico/gesto de Android, la flecha de Safari, el `WKBackForwardList` nativo— no la conoce y
  se equivoca: por eso hubo que escribir `apps/ios/ios/App/App/GestoAtrasPlugin.swift` (comentario, líneas 9-13:
  *"ese gesto dispara el `WKBackForwardList` nativo de iOS…, que no conoce la marca propia del historial de la
  app"*) para **interceptar** el gesto del sistema y reemplazarlo con la función de la web. Es un parche
  necesario hoy, pero confirma el diagnóstico: si el historial se escribiera bien desde el origen, ese plugin no
  haría falta — cualquier Atrás nativo ya vería un historial que dice la verdad.

**Principio para la arquitectura nueva:** escribir el historial bien desde el principio (una pantalla declara si
apila, reemplaza o es una tarea sin rastro) para que *cualquier* Atrás —botón propio, gesto de iPhone, botón de
Android, flecha del navegador— sea la misma operación primitiva: **vuelve a la entrada anterior**, sin marca
propia, sin plugin que la intercepte.

### 1.1 Lo que el código de hoy ya hace bien (y no hay que reinventar)

- `src/components/ui/Chip.tsx:30` (`ChipEnlace`): `replace` fijo — corregido en OL-050/077
  (`docs/bitacora/2026/09/077-filtrar-no-es-navegar.md`).
- `src/lib/memoriaPantalla.ts` + `src/components/MemoriaPantalla.tsx` (`useMemoriaPantalla`): pestaña, filtro,
  búsqueda y la última URL de cada sección se guardan en `sessionStorage`, no en el historial. Esto es correcto y
  se conserva tal cual en la propuesta (sección 3.3).
- `src/components/ui/Salto.tsx`: el "ver" de las fichas no toca el historial en absoluto (ni apila ni reemplaza) —
  es un movimiento de cuarto tipo, dentro de la misma pantalla, que ni siquiera necesita "vista reemplaza"; se
  menciona en la sección 3.1 pero no entra en la tabla de movimientos porque no navega.

### 1.2 Lo que el código de hoy hace a medias (el síntoma que dispara esta pieza)

- `src/components/NavInferior.tsx:60`: `<Link ... replace={activo} .../>` — **solo la pestaña ya activa
  reemplaza**; cambiar de sección (Inicio → Agenda, Agenda → Lugares…) es un `Link` normal y **apila** una entrada.
  Es el ejemplo más visible de "la regla vive donde no debería": la barra inferior no debería poder apilar nunca,
  y hoy sí puede, según de qué pestaña se venga.
- `src/components/ui/Atras.tsx` + `src/lib/historial.ts`: la marca propia (`LLAVE_MARCA`, `LLAVE_DESDE`) es, en sí
  misma, la evidencia de que el historial nativo no basta — es un historial paralelo que vive en el `state` de
  cada entrada, y que solo el código propio sabe leer.

## 2. Arquitectura propuesta: tres movimientos que cada pantalla declara

La idea del gestor —tres movimientos— nombra en código lo que las plataformas ya hacen de fábrica. La tabla
siguiente es el inventario de la propuesta: qué significa cada movimiento y su equivalente nativo exacto.

| Movimiento | Qué es | Web (hoy/propuesto) | iOS (UIKit/SwiftUI) | Android (Material 3) |
|---|---|---|---|---|
| **Detalle apila** | Se entra a algo nuevo que, al volver, debe seguir ahí para retomarlo (una ficha, un formulario de edición, un ajuste). | `history.pushState` (`router.push`/`Link` sin `replace`) | `UINavigationController.pushViewController` (`NavigationStack` → `.navigationDestination`) | `NavHostController.navigate()` (Jetpack Navigation), entra en el *back stack* |
| **Vista reemplaza** | Cambia lo que se ve en la misma pantalla: un filtro, un chip, una pestaña interna, "Ver más", la ciudad. No es un lugar nuevo al que "volver": es la misma pantalla con otro estado. | `history.replaceState` (`router.replace`/`Link replace`, ya hace `ChipEnlace`) | `UISegmentedControl` / `TabView` interno, o simplemente estado de SwiftUI (`@State`) — nunca un `push` | Un `Chip`/`TabRow` de Material cambia estado local o navega con `popUpTo(id) { inclusive = true }` para no dejar rastro |
| **Tarea modal** | Algo que se empieza y se termina o se cancela (altas, ediciones, "Entrar"): al terminar no debe quedar rastro en el historial. | Pantalla con ✕ (`ui/Cerrar.tsx`) que hoy también manipula el historial "a mano" (`useTerminar`, reemplaza o vuelve con `router.back()` y relee) | `.sheet` modal o `UIModalPresentationStyle.formSheet`, con su propio `NavigationStack` interno; al cerrar, `dismiss()` — nunca deja entradas en la pila del padre | `NavHostController` con un grafo anidado presentado como *full-screen dialog*, o `BottomSheetScaffold`; al terminar, `popBackStack()` hasta antes de entrar |

**Lo que cambia con la propuesta no es la regla (ya es correcta) sino que las tres queden declaradas de una vez
por cada pantalla, no reconstruidas caso por caso con `replace` sueltos y una marca propia que las corrige después.**

### 2.1 Inventario: cada pantalla de `src/app`, clasificada

Recorrido de las 34 rutas con `page.tsx` que hoy usan `ui/Barra` (`grep -rl "<Barra" src/app`), más las cuatro
raíz de la barra inferior y las pantallas fuera del canon. "Cumple hoy" quiere decir: el código ya marca el
movimiento correcto (push cuando corresponde apilar, `replace` cuando corresponde reemplazar) **sin ayuda de la
marca propia** — la marca propia existe precisamente porque, aun cumpliendo, nada garantiza que un Atrás ajeno lo
respete.

| Pantalla | Movimiento | Cumple hoy con push/replace correcto | Nota |
|---|---|---|---|
| `/` Inicio, `/agenda` Agenda, `/lugares` Lugares, `/artistas` Artistas | Raíz (barra inferior) | **No** — apila al cambiar de sección (`NavInferior.tsx:60`) | Es el caso 1.2 |
| `eventos/[id]`, `lugares/[id]`, `artistas/[id]`, `personas/[id]` | Detalle apila | Sí | Barra `volver` |
| `admin`, `admin/[seccion]`, `admin/personas`, `admin/personas/[id]`, `admin/obras-colectivas`, `admin/obras-colectivas/[id]` | Detalle apila | Sí | Anidan varios niveles; cada uno es un push más |
| `ajustes`, `ajustes/editar`, `ajustes/bloqueados`, `perfil` | Detalle apila | Sí | |
| `artistas/[id]/editar`, `eventos/[id]/editar`, `lugares/[id]/editar` | Detalle apila (edición sobre la ficha) | Sí, pero al **terminar** usa `useTerminar` (`ui/Atras.tsx:61-86`) — vuelve con el historial si se vino de la ficha, si no reemplaza | La lógica de "a dónde vuelvo" está en código de aplicación, no en la navegación; ver sección 2.3 |
| `artistas/[id]/novedades/nueva`, `artistas/[id]/novedades/[novedadId]/editar` | Detalle apila | Sí | |
| `entrar`, `ayuda`, `novedades`, `privacidad`, `reglas` | Detalle apila | Sí | |
| `artistas/nuevo`, `eventos/nuevo`, `lugares/nuevo` | **Tarea modal** | A medias: usan `ui/Cerrar` (✕) pero siguen siendo una URL empujada como cualquier detalle; "terminar" (publicar) reemplaza (`redirect()` reemplazando, bitácora 083 revisión PR#87 punto 2) | Hoy simulan "modal" con una ✕ sobre una pantalla normal — es justo el caso que un `sheet`/`full-screen dialog` nativo resuelve de fábrica |
| Chips de filtro (Lugares tipo, Artistas disciplina/ciudad, Personas admin) | Vista reemplaza | Sí (`ChipEnlace`, `Chip.tsx:30`) | |
| "Ver más" (Personas, Artistas, listas del panel) | Vista reemplaza | Sí (bitácora 077) | |
| Pestañas internas (`ui/Pestanas`, `VistaLugares` mapa/lista, `PestanasPersona`) | Vista reemplaza | Sí, mismo patrón `replace` | |
| Hoja de ciudad (`Ciudad`) | Vista reemplaza | Sí | Es una hoja (modal visual) pero su elección reemplaza la URL, no apila |
| "ver" en fichas (`ui/Salto`) | *(cuarto caso: ni apila ni reemplaza — no navega)* | Sí, no toca el historial | Scroll con foco, sin URL nueva |
| `borrado` (cuenta borrada) | Raíz-huérfana (barra sin volver, llega por acción de servidor) | N/A — no es alcanzable por navegación normal | Caso de borde, no de shell |
| `artistas/[id]/letrero` | Pantalla imprimible aparte (`BarraLetrero` propia) | N/A | Fuera del canon de tres movimientos: no es "navegación", es una salida (imprimir) |
| `obra/[id]/pared`, `obra/[id]/mando` | Experiencia inmersiva propia (mural colaborativo en vivo) | N/A | Shell propio (Pincel), fuera de esta pieza |

**Total dentro del canon de tres movimientos:** 27 pantallas de `page.tsx` con `Barra`, más 4 raíces y las
variantes de estado (chips, pestañas, "Ver más", hoja de ciudad) dentro de ellas. **De ese total, una sola cosa
no cumple hoy la regla que debería**: el cambio de sección en la barra inferior. Todo lo demás ya está bien
escrito — el problema no es que sobren pantallas rotas, es que la corrección de esa única pieza (y de cualquier
excepción futura) hoy depende de acordarse de poner `replace`, y de que la marca propia la tape si alguien se
olvida. La propuesta (sección 2.2-2.4) elimina esa dependencia.

### 2.2 Pila armada al llegar (generalizar `reponerPantallaAnterior`)

Hoy `src/lib/historial.ts:205-212` (`reponerPantallaAnterior`) ya resuelve un caso de "llegar sin nada detrás":
la vuelta de entrar con Apple/Google. Reescribe la entrada de destino para que la pantalla de origen quede debajo
y el destino se apile encima — así Atrás (o el gesto) no salen del sitio, vuelven a donde estaba la persona.

**Propuesta:** generalizar ese mismo mecanismo a *cualquier* llegada a una pantalla de detalle sin nada detrás
(enlace compartido, notificación push, accesos directos): si se abre `eventos/123` de la nada, la app arma la
pila **antes** de que la persona la vea — pantalla madre (Agenda) debajo, ficha encima — para que el primer Atrás
(cualquiera: botón, gesto, físico) haga lo esperado sin ninguna regla especial ni pantalla madre "de repuesto".

**Alcance: solo en la app instalada y en la de tienda, nunca en Safari.** La razón está documentada en la memoria
del proyecto ("Atrás de Safari"): en iPhone, el botón Atrás de Safari **retrocede al documento anterior**, no a
la entrada de historial — ninguna entrada añadida con `pushState` se interpone (a diferencia de Chromium, donde
si lo hace). Armar una pila con `pushState` en Safari no cambiaría nada para su propio botón (seguiría saltando
directo al documento anterior, que es el que trajo el enlace, no la pantalla madre armada), y sí complicaría el
historial para nada. **En Safari el comportamiento de hoy se queda como está**: sin pantalla anterior, Atrás va a
la pantalla madre reemplazando (lo que ya hace `useVolver`).

### 2.3 Barra inferior: reemplaza, no apila; cada sección recuerda su última pantalla

- Tocar una sección de la barra inferior **siempre reemplaza** la entrada actual (nunca apila), sea la sección
  activa o no. Esto es lo único que corrige código: `NavInferior.tsx:60` deja de condicionar `replace` a
  `activo`.
- Cada sección sigue recordando su última URL vista (`leerUrlSeccion`/`guardarUrlSeccion`,
  `src/lib/memoriaPantalla.ts:66-81`) — **se conserva tal cual**, es la pieza que ya hace bien "las pestañas del
  teléfono" (comentario de `NavInferior.tsx:21-29`).
- **Atrás nunca cruza de sección.** Es el comportamiento de iOS: la barra de pestañas mantiene una pila
  *independiente* por pestaña (`UITabBarController` con un `UINavigationController` por pestaña); Atrás dentro de
  una pestaña nunca te saca a otra.
- **Diferencia documentada con Android:** el patrón de Jetpack Navigation con `BottomNavigationView`
  (`developer.android.com/guide/navigation/principles`) hace que el sistema Back navegue por el historial interno
  de la pestaña activa, y solo al llegar a su raíz, el Back de esa pestaña sale de la app — **no** hay, en la
  documentación vigente que se pudo consultar, una regla explícita de "vuelve primero a Inicio y solo entonces
  sale" para *cualquier* pestaña (esa es la fama que tiene el patrón, y muchas apps de Android sí lo hacen a mano,
  pero no lo encontré como regla escrita en la documentación actual de Material 3 o Jetpack Navigation que pude
  leer). Lo que sí dice la guía "Understanding navigation" de Material Design (`m2.material.io/design/navigation/
  understanding-navigation.html`, confirmado por búsqueda): *"el botón Atrás no navega entre las vistas de la
  barra de navegación inferior… navega por el historial interno de la app"* — es decir, la recomendación vigente
  **coincide con iOS**: Atrás no cruza de sección. **Propuesta:** implementar igual en las tres plataformas (Atrás
  nunca cruza de sección); si el founder prueba con gente de Android y encuentra que esperan "vuelve a Inicio
  primero", se ajusta con evidencia (regla del proyecto: "reglas abiertas, no leyes" — se cambia con evidencia de
  uso, no por adivinar).
- **Costo honesto:** en la web solo se recuerda la última pantalla de cada sección (una URL), no su pila completa
  de detalles. Volver a Lugares tras ver tres fichas seguidas no repone las tres, solo la última pantalla vista de
  Lugares — exactamente el comportamiento de hoy, que no cambia. Un `UINavigationController`/`NavHostController`
  nativo sí podría conservar la pila completa de cada pestaña en memoria; queda fuera de esta pieza (no es shell,
  es motor de navegación completo, candidato solo si algún día hay app 100% nativa).

### 2.4 Atrás sin lógica

Con el historial escrito bien desde el origen (2.1-2.3), Atrás deja de necesitar decidir nada:

- **Se retira** la marca propia del historial (`src/lib/historial.ts`: `LLAVE_MARCA`, `LLAVE_DESDE`,
  `leerMarca`, `conMarca`, `marcaAlApilar`, `marcaAlReemplazar`, `hayPantallaAnterior`, `vuelveA`) — deja de hacer
  falta preguntar "¿hay algo detrás?": si lo hay, la pila lo tiene; si no, ya se armó en 2.2.
- **Se retira** `apps/ios/ios/App/App/GestoAtrasPlugin.swift` y su intercepción del `.backForward` — el gesto de
  deslizar puede disparar el `WKBackForwardList` nativo sin miedo, porque ese historial ya dice la verdad.
- **El botón de Android** funciona con el comportamiento por omisión de Capacitor (`onBackPressed` navega el
  `WebView`), sin plugin propio.
- **Qué se conserva tal cual:** la memoria de pantalla (`src/lib/memoriaPantalla.ts`, `MemoriaScroll.tsx`,
  `useMemoriaPantalla`) — pestaña, filtro, búsqueda y scroll no son "navegación", son estado de UI, y ya viven
  fuera del historial, en `sessionStorage`. Esta pieza no la toca.
- **La vuelta de entrar con Apple/Google** (`APUNTE_VUELTA`, `leerVuelta`, OL-069) tampoco es la marca de
  navegación — es un caso aparte (la única salida real del sitio) y se conserva; lo que cambia es que, al volver,
  la pila ya armada (2.2) hace innecesario reescribir el historial a mano como hoy (`reponerPantallaAnterior`
  pasa a ser un caso más del mecanismo general, no un parche propio de OL-069).

## 3. Riesgos y casos borde

| Caso | Qué pasa con la propuesta | Mitigación |
|---|---|---|
| **Recarga de la pantalla madre armada.** Next.js recarga entera una entrada marcada como ajena (`_N`, ver `historial.ts:188-194`, comentario sobre `AJENA_A_NEXT`). Si la pila armada usa el mismo truco, volver a la pantalla madre recarga toda la página en vez de navegar suave. | Igual que hoy con la vuelta de Apple/Google: se acepta la recarga (ya documentado como límite en `reponerPantallaAnterior`, comentario líneas 197-202) — es preferible a que Atrás salga de la app. | Ninguna nueva: es el mismo trade-off que ya existe y ya se probó (bitácora 083, "Carga completa: Reglas → Aviso de privacidad → Atrás → Reglas"). |
| **Entrar con Apple/Google** desde una pantalla sin nada detrás (enlace compartido → "Entrar" → proveedor → vuelta). | La pila armada (2.2) pone la pantalla madre antes de "Entrar"; la vuelta del proveedor apila "Entrar" otra vez encima — mismo mecanismo, un nivel más. | Probar explícito este encadenado en la pieza de código (no solo el caso simple). |
| **Guardia de salida** (algo sin publicar: `src/lib/guardiaSalida.ts`). | Sigue funcionando igual: cualquier Atrás (nativo o propio) debe poder preguntarle a la guardia antes de irse. Si Atrás pasa a ser "sin lógica" (2.4), la guardia deja de vivir dentro de `useVolver` y pasa a un listener de `popstate`/gesto nativo que puede **cancelar** la navegación y volver a apilar la entrada (un patrón más delicado que hoy: hoy `pedirSalida` intercepta antes de llamar a `router.back()`; con un Atrás nativo sin intervención, hay que cancelar una navegación que el sistema ya empezó). | Es la pieza de mayor riesgo técnico de todo el rediseño (ver sección 5.1, tamaño "grande"): probar a fondo cancelar un `popstate` y un `.backForward` de WKWebView sin dejar el historial inconsistente, antes de retirar el guardián actual. |
| **Abrir en pestaña nueva en escritorio** (Cmd/Ctrl+clic). | Ya lo filtra `useVolver` (`Atras.tsx:43`, `e.metaKey`, etc.) — se conserva: nunca hay "Atrás" nativo que interceptar en una pestaña nueva, el navegador manda. | Ninguna nueva. |
| **Chrome de Android como navegador** (no app instalada). | A diferencia de Safari en iPhone, Chrome de Android **sí respeta las entradas de `pushState`** al usar su botón Atrás — el riesgo de "Atrás de Safari" (2.2) no aplica aquí. | La pila armada (2.2) puede activarse también en Chrome de Android sin el problema que tiene en Safari; verificarlo en la pieza de código, no darlo por hecho solo porque "es Chromium". |
| **PWA instalada en Android** (Add to Home Screen). | Usa el motor de Chrome (Chromium/WebView), con el mismo comportamiento de `pushState` que Chrome normal — la pila armada funciona igual que en la app instalada de iOS. El botón Atrás del sistema en Android, dentro de una PWA en modo standalone, navega el historial de la propia PWA (no sale a otra app) mientras haya historial que recorrer. | Probar en un dispositivo o emulador Android real antes de dar por bueno "funciona igual que Chrome": el modo standalone puede tener matices (por ejemplo, cuándo el sistema decide cerrar la PWA en vez de seguir retrocediendo). |
| **Volver a la sección con una ficha abierta** (Lugares → ficha → cambiar a Agenda por la barra inferior → volver a Lugares por la barra). | Con "la barra siempre reemplaza" (2.3), la entrada de la ficha se pierde del historial al cambiar de sección — es lo mismo que pasa hoy si se toca la pestaña ya activa, extendido a cualquier cambio de sección. Volver a Lugares por la barra inferior repone su **última URL recordada** (memoria de pantalla), no la ficha. | Es el "costo honesto" ya declarado en 2.3: memoria de pantalla sí recuerda la última pantalla de la sección, pero no la ficha que quedó abierta a medio camino. Si el founder prueba y la gente extraña la ficha, es candidato a "reglas abiertas, no leyes" (traer evidencia, no adivinar). |

## 4. Shell: botones, tamaños y qué cambia por plataforma

### 4.1 Medidas oficiales (con fuente)

Se buscaron las cifras en las guías vigentes; donde la página no se pudo leer directamente (sitios que renderizan
con JavaScript), se cita la cifra tal como aparece corroborada por más de una búsqueda, y se dice qué no se pudo
verificar de primera mano.

| Medida | iOS (Apple HIG) | Android (Material Design 3) |
|---|---|---|
| Área mínima de toque | **44 × 44 pt** — HIG, página "Layout": *"maintain a minimum tappable area of 44pt x 44pt"* ([developer.apple.com/design/human-interface-guidelines/foundations/layout](https://developer.apple.com/design/human-interface-guidelines/foundations/layout/)); HIG "Buttons": *"controles de al menos 44×44 pt"* ([…/buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)) | **48 × 48 dp** — Material 3, "Accessible design / Designing structure" ([m3.material.io/foundations/designing/structure](https://m3.material.io/foundations/designing/structure)) y guía de accesibilidad de Android ([support.google.com/accessibility/android/answer/7101858](https://support.google.com/accessibility/android/answer/7101858)) |
| Barra superior (título/acciones) | **44 pt** de alto (la navigation bar estándar; documentado de forma consistente en múltiples fuentes derivadas de HIG, no se logró renderizar la página viva de Apple para citarla directo — no se inventa el número, se toma de la referencia técnica más repetida y estable desde iOS 7) | **64 dp** — Material 3, "Top app bar", specs ([m3.material.io/components/app-bars/specs](https://m3.material.io/components/app-bars/specs)) |
| Barra inferior (pestañas) | **49 pt** en vertical sin zona segura (83 pt con el indicador de inicio del iPhone X en adelante) — cifra corroborada por varias fuentes técnicas sobre `UITabBar`; no se logró renderizar la página viva de la HIG para citarla directo | Material 3 no publica una sola cifra de alto para "Navigation bar" en la página que se pudo indexar; se deja pendiente confirmar en la pieza de código con la librería exacta (`androidx.compose.material3.NavigationBar`) en vez de inventar un número |
| **Hoy en el código** | `--alto-barra: 56px` (`globals.css:35`), `Atras`/`Cerrar` a `40px` (`Atras.module.css:7`, `Cerrar.module.css:6`) | — |

**Lo que esto confirma del pedido del founder:** *"los tamaños de accionables del header son más pequeños que el
canon de iOS"* es verificable en el código — 40 px es menor que los 44 pt mínimos de HIG. La propuesta corrige a
**48**, que cumple los dos cánones a la vez (44 pt de iOS y 48 dp de Android) en vez de necesitar dos tamaños
distintos por plataforma.

### 4.2 Propuesta de shell

- **Un solo componente de botón de barra** (atrás, ✕, campana, "···", agregar), 48×48 de área de toque, icono de
  24, sin texto ni píldora — corrige el pedido explícito: *"me gusta más el canon de iOS que usa botones de
  acción solo con un icono"*. Hoy `ui/Atras.tsx` es una píldora con texto ("Atrás") de 40 px; `ui/Cerrar.tsx` ya es
  un círculo solo-icono de 40 px, más cerca del canon — la propuesta lleva el primero al patrón del segundo, y
  sube ambos a 48.
- **Los pocos dibujos que cambian por plataforma:** el chevron `‹` (iOS) frente a la flecha `←` (Android/web); los
  tres puntos horizontales `···` (iOS, ya es `IconoPuntos`, `Iconos.tsx:184-190`) frente al menú vertical `⋮`
  (Android). Todo lo demás del set de iconos (`IconoCerrar`, `IconoMas`, `IconoCampana`, `IconoChevronIzquierda`)
  se conserva.
- **Logotipo solo en pantallas raíz** (arriba a la izquierda, como hoy en `Barra.module.css` `.raiz`); las
  interiores llevan el título de la sección o la sección de la ficha (nombre del evento/lugar/artista), o nada si
  no aporta — hoy el logotipo va al centro también en interiores (`Barra.tsx:33`), lo que el founder señaló como
  "tamaños/patrón distinto al canon de iOS", donde el centro de la barra de navegación es el título de la
  pantalla, no la marca.
- **Variables y clase por plataforma.** Una clase (`plataforma-web`, `plataforma-ios`, `plataforma-android`) en
  `<html>` (mismo patrón que ya usa `app-nativa`, `src/lib/appNativa.ts`) y variables CSS que cambian con ella:
  `--alto-barra` (44pt web/iOS ≈ 44px, 64px Android), `--toque-boton-barra` (48px en las tres, ya que 48 cumple
  ambos cánones). Web sin envoltorio nativo puede quedarse con el valor de iOS (44) o el propio — a decidir con
  el founder cuando se firme esta pieza; no es una decisión de este documento.
- **Acción principal ("+"):** el botón flotante ("Registrar artista", `src/components/Publicar.tsx`) es un patrón
  de Android (Material `FloatingActionButton`), no de iOS. Propuesta: un botón "+" en la barra superior de cada
  sección raíz (Agenda, Lugares, Artistas), a la derecha, junto a la sesión — es donde iOS pone la acción
  principal de una pantalla raíz (`UIBarButtonItem` a la derecha del `UINavigationBar`). En Android puede
  conservarse como FAB (es su propio canon) o unificarse con el mismo "+" de barra — a decidir con el founder;
  este documento dejta ambas opciones documentadas.
- **Barra inferior neutra.** El activo se distingue solo por color (`--primario`), sin la píldora de fondo que
  hoy pinta `.activo .icono` (`NavInferior.module.css:35-38`) salvo en la variante Android, donde esa píldora **es**
  el canon de Material 3 (`NavigationBar` con `indicator`). En iOS 26 (Liquid Glass), la barra flotante de
  cristal es del sistema — no se dibuja a mano, se reserva para cuando exista shell nativo real; hasta entonces
  la web puede aproximar el efecto con un fondo translúcido, sin comprometerse a más.
- **Se quedan igual:** hojas (`ui/Hoja.tsx`), chips y confirmaciones — el doc 48 (`docs/rediseno/48-shell-ios.md`,
  §3.5) ya recomendó no tocarlas, y esta pieza no encontró motivo para cambiar esa recomendación.
- **Respetar el tamaño de letra del sistema:** ya ocurre (`--letra-*` en `rem`, `globals.css:52-59`, comentario
  explícito "si la persona agranda el texto… todo crece con él") — no es un cambio, es una confirmación de que el
  shell propuesto no debe romperlo.

### 4.3 Qué NO cambia (para que quede explícito)

- El aspecto general, colores, tipografía (Bricolage Grotesque condensada), tarjetas, chips — decisión vigente del
  founder (OL-202): el look se queda hasta el rediseño fuerte.
- Las acciones de ficha (Voy, Seguir, Compartir): siguen siendo web, como recomendó el doc 48 §3.4.
- Las hojas (`ui/Hoja.tsx`): siguen siendo web, doc 48 §3.5.
- La memoria de pantalla y el canon de formularios (alta de lugar v2): sin cambios, esta pieza es de navegación y
  barra, no de formularios.

## 5. Orden de piezas y tamaño

Navegación primero (es invisible para quien usa la app, pero simplifica el código de verdad — retira una marca
propia y un plugin nativo); shell (botones y variables) después, porque depende de que el título de la pantalla
ya esté disponible de forma consistente una vez resuelta la navegación.

| # | Pieza | Tamaño | Qué prueba (evidencia esperada) |
|---|---|---|---|
| 1 | Barra inferior siempre reemplaza (`NavInferior.tsx`) | **Chica** | Cambiar de sección nunca crece el historial (contar entradas antes/después); memoria de pantalla intacta |
| 2 | Pila armada al llegar sin nada detrás, generalizando `reponerPantallaAnterior` (solo app instalada/tienda) | **Mediana** | Enlace compartido a una ficha, dentro de la app instalada: Atrás va a la sección madre en un toque; en Safari, sin cambios (verificar con capturas de ambos) |
| 3 | Retirar la marca propia del historial y `GestoAtrasPlugin.swift`; Atrás pasa a ser `history.back()`/gesto nativo sin intervención | **Grande** (por la guardia de salida, riesgo más delicado de todo el documento — sección 3) | Los 8+ escenarios que ya probó la bitácora 083 (enlace directo, "Ver más", "ver", pestaña activa, gesto de atrás, carga completa, ✕, entrar con código) deben seguir pasando con el mecanismo nuevo, en los tres canales: botón propio, gesto de iPhone, botón/gesto de Android |
| 4 | Un solo componente de botón de barra (48×48, icono 24, sin texto) | **Chica** | Captura 390×844 de Atrás y Cerrar antes/después; medir con el inspector que el área de toque es 48 |
| 5 | Logotipo solo en raíz; título de sección/ficha en interiores | **Chica** | Recorrido de las 27 pantallas del inventario (sección 2.1): ninguna interior muestra el logotipo al centro |
| 6 | Variables por plataforma (`plataforma-web/ios/android` en `<html>`) y los dibujos que cambian (`‹`/`←`, `···`/`⋮`) | **Mediana** (toca `globals.css`, `Iconos.tsx` y el guion de detección, con pruebas en las tres plataformas) | Captura del mismo shell en web, en el simulador de iOS y en un emulador/dispositivo Android, lado a lado |
| 7 | "+" en la barra de cada sección raíz, en vez del botón flotante (o unificación con el FAB en Android, según decida el founder) | **Mediana** (cambia una interacción muy usada: publicar) | Publicar un evento/lugar/artista desde el "+" nuevo, en las tres plataformas |
| 8 | Barra inferior neutra con variante Android (píldora solo ahí) | **Chica** | Captura comparando activo/inactivo en las tres plataformas |

Piezas 1-3 (navegación) deberían ir antes que 4-8 (shell): retirar la marca propia simplifica el código que las
piezas de shell van a tocar (menos ramas condicionales en `Atras.tsx`/`Cerrar.tsx`). No se estima aquí el trabajo
de la barra de navegación nativa de verdad (`UINavigationBar`/`AppBar` de Compose) — el doc 48 §3.2 ya recomendó
no ir ahí todavía, y esta pieza no encontró motivo para cambiar esa recomendación mientras Atrás no sea "sin
lógica" (pieza 3): un `UINavigationBar` con su propio botón de regreso volvería a duplicar la decisión de "a
dónde vuelvo", el mismo problema que esta pieza entera busca eliminar.

## 6. Referencias

- Código: `src/lib/historial.ts`, `src/components/ui/Atras.tsx`, `src/components/Navegacion.tsx`,
  `src/components/NavInferior.tsx`, `src/lib/memoriaPantalla.ts`, `src/components/ui/Barra.tsx`
  (+ `.module.css`), `src/components/ui/Cerrar.tsx` (+ `.module.css`), `src/components/Sesion.module.css`,
  `src/components/ui/Chip.tsx`, `src/components/ui/Salto.tsx`, `src/lib/gestoAtras.ts`,
  `apps/ios/ios/App/App/GestoAtrasPlugin.swift`, `src/app/globals.css`.
- Bitácoras: [077 · Filtrar no es navegar (OL-050)](../bitacora/2026/09/077-filtrar-no-es-navegar.md), [083 · Atrás
  coherente (OL-055)](../bitacora/2026/09/083-atras-coherente.md), [234 · App de iPhone: cuatro arreglos
  (OL-205)](../bitacora/2026/09/234-app-ios-arreglos.md).
- Auditoría previa: `docs/rediseno/48-shell-ios.md` (rama `shell-ios`, no unida — OL-202).
- Fuentes externas citadas en la sección 4.1: Apple Human Interface Guidelines (Layout, Buttons) y Material
  Design 3 (Designing structure, Top app bar specs), enlaces en la tabla; Android Developers, "Principles of
  navigation" ([developer.android.com/guide/navigation/principles](https://developer.android.com/guide/navigation/principles))
  y Material Design, "Understanding navigation" ([m2.material.io/design/navigation/understanding-navigation.html](https://m2.material.io/design/navigation/understanding-navigation.html)),
  citados en la sección 2.3.
