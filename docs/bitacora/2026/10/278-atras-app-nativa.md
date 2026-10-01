# 278 · Atrás muerto en la app de iPhone tras entrar con Apple (OL-250)

**Fecha:** 2026-10-01 · **Rama:** `atras-app-nativa`, desde `origin/main` (`9e7cf703`, con #288 ya publicado) · **OL:** OL-250 · **PR:** #289 contra `main` (sin unir) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows.

## Lo que vio el founder

En la app de TestFlight: desde una ficha de evento tocó «Voy» sin cuenta, entró con su Apple ID, volvió al evento con «Voy» activo y la flecha Atrás no hizo nada; tocó el lugar del evento, la ficha del lugar abrió, y ahí Atrás tampoco: «tuve que cerrar y matar la app».

## Causa (medida en la app nativa del simulador)

Reproducido con la app compilada sin firmar apuntando a la web local (respaldo inventado) y con el plugin de trabajo cargando la vuelta (`/auth/app-regreso`) en el WKWebView como lo hace de verdad `EntrarSistemaPlugin` (el Swift de trabajo no se commitea). Historial paso a paso, antes de tocar nada (`history.length`, marca `somosnosotros`):

| Paso | URL | largo | marca |
|---|---|---|---|
| Agenda | `/agenda` | 2 | 1 |
| Ficha del evento | `/eventos/charla…` | 3 | 2 (desde `/agenda`) |
| «Voy» sin cuenta → Entrar | `/entrar?siguiente=…` | 4 | 3 |
| Apple simulado, vuelta cargada a mano | `/eventos/charla…` | **5** | **1** |
| Atrás (botón) | `/eventos/charla…` | 5 | 1: sin efecto |

Dos hechos juntos:

1. **El envoltorio cancela todo retroceso que cruza de un documento a otro.** `GestoAtrasPlugin.swift` (`shouldOverrideLoad`) cancela cualquier navegación `backForward` y solo avisa a la web («la web decide»). La vuelta de Apple la carga el plugin con `webView.load`: es un documento nuevo (de hecho dos: la dirección con `?accion=voy` y la limpia, a la que la ficha se redirige con una carga completa), y todas las entradas de antes —Agenda, la ficha, Entrar— son de documentos anteriores.
2. **La marca de la entrada dice «hay pantalla detrás» (marca 1)**: el WKWebView entrega a la carga el referente de la pantalla anterior, así que `marcaDeLlegada` cuenta 1. Atrás llama `router.back()` → `history.back()` cruza al documento de Entrar → el plugin lo cancela → no pasa nada. Cada Atrás igual. El rebobinado de #288 tampoco ayuda aquí: `history.go(-n)` cruza documentos igual y se cancela (y gasta el apunte de vuelta).

Lo del lugar: dentro de ese documento la navegación hacia adelante sí funciona (el lugar abre); lo que muere es todo Atrás que cruce hacia atrás de la primera entrada del documento, y una recarga completa cualquiera lo reproduce en cualquier pantalla. No pude reproducir exactamente «Atrás sin efecto desde el lugar» (en mi corrida el lugar, por la marca, sí volvía a la ficha: su historial sería distinto); el arreglo cubre ambas pantallas por la misma regla.

¿Existía antes de #288? En lo esencial sí: `marcaDeLlegada` y `router.back()` no cambiaron con #288; #288 solo añadió el rebobinado, inútil aquí. El camino nativo no se había probado nunca con Atrás tras entrar.

## Qué cambió (solo web: no hace falta compilación nueva de la app)

- `src/lib/historial.ts`: `hayPantallaAnterior(marca, largo, base)` y `vuelveA(..., base)` reciben la **base del documento** (solo en la app): la marca de la entrada con la que cargó. Atrás solo retrocede con el historial hasta entradas de marca mayor (las que el propio documento apiló, que son del mismo documento); de ahí hacia atrás no hay historial al que volver. `aterrizarEnApp` hace el resto al cargar cada documento en la app: no rebobina (nada que deshacer, no hay páginas del proveedor en el historial) y, si es la vuelta de Entrar, deja anotada como `somosnosotrosDesde` la pantalla que debe quedar detrás del destino (`previa`), que Entrar apuntó. Esa previa pasa a la segunda carga (la redirección de la ficha a su dirección limpia) por `sn_previa`, de un solo uso y 30 s de vigencia. En la app no hay estado de «rebobinando»; en el navegador sigue caducando solo (60 s).
- La entrada de Entrar lleva ahora también `somosnosotrosAntes` (la pantalla de detrás de la de origen, p. ej. Agenda detrás de la ficha) para poder apuntar la previa.
- `src/components/Navegacion.tsx`: detecta la app por el user-agent (`esAppNativa`), no rebobina en ella y fija la base; `destinoSinHistorial()`.
- `src/components/ui/Atras.tsx` (`useVolver`): sin historial al que volver va a la pantalla de la que se vino si se sabe (`destinoSinHistorial()`) y si no a la madre (`href`), como siempre. Cubre el botón, la ✕ y el gesto del borde (comparten la función).
- `src/app/entrar/FormularioEntrar.tsx`: el apunte lleva `previa`.
- Respaldo local: `/auth/v1/verify` devuelve la sesión (para probar `/auth/app-regreso`).

Safari y Chrome no cambian (sin base, la decisión es la de siempre y el rebobinado sigue igual).

## Después (misma corrida, app nativa)

Capturas en `docs/rediseno/capturas-278/`: `antes-1-evento-atras-sin-efecto.png` (evento con «Vas» tras volver; Atrás no responde), `despues-1-evento-tras-entrar.png`, `despues-2-lugar.png`, `despues-3-atras-desde-lugar-evento.png` y `despues-4-atras-desde-evento-agenda.png`.

| Paso | URL | largo | marca |
|---|---|---|---|
| Vuelta cargada a mano | `/eventos/charla…` | 5 | 1, desde `/agenda` |
| Abrir el lugar | `/lugares/casa-de-cultura…` | 6 | 2 |
| Atrás | `/eventos/charla…` | 6 | 1 |
| Atrás | `/agenda` | 6 | 1 |

## Pruebas

- `src/lib/historial.test.ts`: 8 casos nuevos (la entrada de Entrar apunta la de antes; Voy desde una ficha sin rebobinar, con el lugar abierto después y Atrás a Agenda; el «+»; sin saber de dónde se vino, madre; sin apunte o caducado; la segunda carga por la dirección limpia; la base solo en la app; una recarga cuenta como documento nuevo).
- `src/app/entrar/Entrar.componentes.test.mjs`: caso nuevo «la app de iPhone, vuelta cargada a mano sin páginas de proveedor» (user-agent de la app, cancela retrocesos entre documentos con la API de navegación y cuenta los cruces). Falla sin el arreglo (comprobado forzando `enApp = false`) y pasa con él.
- `npm run lint` (una advertencia que ya existía en `VisorImagen.componentes.test.mjs`), `typecheck`, `npm test` (1684), `inventario`, `test:componentes` (204) y `medir` (24 pantallas × 4 anchos, sin novedades): verdes.

## Límites

- Apple real solo lo valida el founder en TestFlight: el simulador usó una vuelta simulada con la misma URL y el mismo camino de carga; la `ASWebAuthenticationSession` no se ejercitó.
- Si la web se abre en frío justo en Entrar (enlace compartido) no hay de dónde venir y Atrás va a la madre (Inicio para una ficha de evento).
- No se tocó Swift ni la configuración de la app: la corrección viaja con la web.
