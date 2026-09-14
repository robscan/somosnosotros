# Línea gráfica — tipografía y logotipo

**Decidido por el founder el 2026-09-14.** Comparación que respalda la decisión: [comparador-tipografia.html](comparador-tipografia.html) (siete letras condensadas sobre una pantalla de la app; publicada también en https://claude.ai/artifact/EkQYL15pfLJPUwPLSRz2YR).

## La letra

**Bricolage Grotesque** (Mathieu Triay, 2022–2023, licencia OFL, en Google Fonts). Una sola familia para toda la app: logotipo, títulos, texto, botones y campos.

- Variable, con tres ejes: peso `wght` 200–800, ancho `wdth` 75–100, tamaño óptico `opsz` 12–96. Sin itálicas.
- Se usa **condensada**: ancho 75 en logotipo y títulos, ancho 80 en texto corrido y campos (un poco más abierta para leer a 16–17 px).
- El tamaño óptico se deja en automático (`font-optical-sizing: auto`): a lo grande enseña las trampas de tinta y las curvas irregulares; en texto chico desaparecen y queda una letra limpia.
- Sustituye a la "fuente del sistema" decidida en la Fase 0.

Por qué esta y no otra: condensada, con toques humanos y artísticos a tamaño grande, y limpia a tamaño de lectura. Las descartadas y sus razones están en el comparador (Afacad Flux, Anek Latin, Asap Condensed, Mohave, Yanone Kaffeesatz, Big Shoulders; y fuera de la comparación Oswald, Roboto Condensed, Bebas, Truculenta, Homenaje, Acme, Fjalla One, Encode Sans Condensed, Fira Sans Condensed).

## El logotipo

- La composición es **SMSNSTRS**, siempre en mayúsculas, compuesta en Bricolage Grotesque: peso 800, ancho 75, interletrado −0.01em, interlineado 1. No es una imagen: es texto, para que se vea nítido en cualquier pantalla y respete el tamaño de texto del teléfono.
- Va **arriba a la izquierda** de la barra superior de las pantallas raíz (Agenda, Mapa), con el perfil a la derecha: es el estándar que la gente ya conoce (ley de Jakob; corrección del founder el 2026-09-14, antes decía "a la derecha"). En pantallas interiores, el regreso va a la izquierda y el logotipo al centro. A 21–22 px, en el color del texto (`--texto`), nunca en rojo. Es un enlace al inicio. No lleva icono ni palabra al lado.
- El nombre se escribe **Somos Nosotros** (dos palabras, mayúscula inicial) en cualquier texto que la gente lea: título de la pestaña, nombre de la app instalada, correos, avisos. El dominio (somosnosotros.org) y el repo siguen en minúsculas y pegados.
- Muestra grande del logotipo: SMSNSTRS a 56–84 px se usa en la pantalla de entrada y en cualquier pieza de presentación.

## Roles tipográficos

| Rol | Peso | Ancho | Tamaño | Notas |
|---|---|---|---|---|
| Logotipo SMSNSTRS | 800 | 75 | 21–22 px en barra | mayúsculas, interletrado −0.01em; a la izquierda en pantallas raíz, al centro en interiores |
| Título de pantalla, nombre de lugar o evento | 700 | 75 | 26–30 px | `text-wrap: balance` |
| Título de sección, título de tarjeta | 700 | 75 | 19–20 px | |
| Botón principal | 700 | 80 | 18 px | |
| Texto y campos | 400 | 80 | 17 px (mínimo 16 px: Safari no hace zoom) | |
| Detalle, ayuda, error | 400 | 80 | 15 px | |
| Etiqueta en mayúsculas (cuándo, "sobre el lugar") | 500 | 80 | 14 px | interletrado 0.04em |
| Números en listas y fechas | según rol | según rol | | `font-variant-numeric: tabular-nums` |

Una condensada se percibe más chica que la letra del sistema: la escala de `globals.css` sube un punto en cada paso (13→14, 14→15, 16→17, 17→18, 18→19, 24→26, 28→30). Los tamaños son propuesta; el founder firma en su iPhone.

## Cómo se integra (orden)

1. **Cargar la letra con `next/font/google`** en `src/app/layout.tsx`: `Bricolage_Grotesque` con `axes: ["opsz", "wdth"]`, `subsets: ["latin", "latin-ext"]`, `display: "swap"`, `variable: "--fuente-bricolage"`. Con esto el archivo se sirve desde somosnosotros.org, sin llamada a Google en cada visita y sin salto de diseño al cargar.
2. **Un solo punto de verdad en `globals.css`:** `--fuente: var(--fuente-bricolage), -apple-system, …`; tokens nuevos `--ancho-titulo: "wdth" 75` y `--ancho-texto: "wdth" 80` aplicados con `font-variation-settings`; `font-optical-sizing: auto`; nueva escala de letra.
3. **Componente `Logotipo`** (texto SMSNSTRS, enlace a `/`), colocado arriba a la izquierda de la barra en las pantallas raíz y al centro en las interiores (v1 lo puso a la derecha; se corrige con el PR del inicio). Revisar cada pantalla que hoy tenga barra: inicio, agenda, lugares, ficha de lugar, ficha de evento, perfil, admin.
4. **Nombre visible:** `title`, `applicationName` y `appleWebApp.title` pasan a "Somos Nosotros"; también `manifest.ts` y los correos o avisos que muestren el nombre.
5. **Revisar pesos:** donde hoy se usa `font-weight: 600` para títulos, pasar a 700 (la condensada a 600 se ve floja).
6. **Verificar:** `npm run lint && npm run typecheck && npm test`; build verde; capturas 390×844 de inicio, agenda, ficha de evento, formulario de evento y perfil; comprobar que ningún campo baja de 16 px; mirar el peso del archivo de fuente que genera `next/font` (debe quedar en un solo archivo variable con subconjunto latino).
7. **Cerrar:** bitácora de la sesión y `OPEN_LOOPS.md`. Un PR; el founder firma en su iPhone (Safari).

Fuera de este trabajo, para decidir después con el founder: iconos de la PWA con SMSNSTRS, pantalla de entrada con el logotipo grande, tipografía del mapa de Mapbox (usa la suya).
