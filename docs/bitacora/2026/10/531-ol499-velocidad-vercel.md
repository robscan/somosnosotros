# 531 · OL-499 · Medición de velocidad de Vercel (Speed Insights) y el adelanto del renglón de Instagram

**Fecha:** 2026-10-31. **Rama:** `velocidad-vercel` (desde `origin/main` `dbb53fba`).
**Quién:** operador del Gestor de cambios VII (agente en árbol aislado, sin subagentes, council ni workflows). **Sin migraciones ni variables de
entorno nuevas.** **Estado:** listo para revisar; falta activar Speed Insights en el proyecto de Vercel (ver «Lo que falta») y la prueba del founder.

> Palabras que se repiten (cada una en una línea):
> - **Speed Insights**: la medición de Vercel de cuánto tarda cada pantalla en cargar en los teléfonos reales (primer pintado, el elemento más
>   grande, cuánto tarda en responder al toque), anónima y sin cookies.
> - **`beforeSend`**: la función que ve cada medición antes de salir del teléfono y decide qué se manda (o nada).
> - **Adelanto** (prefetch): lo que Next pide en segundo plano cuando un enlace aparece en pantalla, para que el toque sea inmediato.

## El pedido

El founder aceptó el 2026-10-31 dos recomendaciones del acta del council de OL-497 (`docs/council/COUNCIL_carga-rendimiento_2026-10-31.md`,
M2/M3) y de la bitácora 530: medir lo que tarda cada pantalla en los teléfonos reales con la medición anónima de Vercel, y volver a adelantar la
pantalla de Instagram desde la portada de Administración (en OL-498 se midió que el adelanto solo trae la forma gris de la pantalla, no su
lectura cara: sin él, la espera de Instagram tardaba 0,6 s en aparecer al tocar en vez de 0,04 s).

## 1 · Speed Insights

- **Versión:** `@vercel/speed-insights@2.0.0` (la última estable, del 2026-03-10; las 2.0.1 y 2.1.0 son `canary`). `npm install` la rechazaba
  por un conflicto de sus dependencias opcionales (SvelteKit pide un Vite que no es el de Vitest; ninguna se instala), así que se instaló con
  `--legacy-peer-deps`. Comprobado en una carpeta aparte con solo `package.json` y `package-lock.json`: `npm ci` y `npm install` **sin**
  la bandera instalan bien y no cambian el lockfile (lo que hará Vercel). En el lockfile solo entra el paquete.
- **`src/components/VelocidadVercel.tsx`** (nuevo): monta `SpeedInsights` de `@vercel/speed-insights/next` con `beforeSend =
  antesDeEnviarVelocidad`. Qué manda cada caso:

  | Caso | Se manda (`url` · `route`) |
  | --- | --- |
  | Administración, mire quien mire (`/admin/personas/<id>`, `/admin/instagram?pestana=…`) | sus dos primeros tramos: `…/admin/personas` · `/admin/personas` (sin ids ni consulta) |
  | Fuera de Administración con la marca de admin o sin rol resuelto (`sinMedirEnPantalla()`) | nada (null) |
  | Página pública, rol «otro» (`/agenda?cuanto=gratis&q=rosa`) | la limpieza de `limpiarUrlAnalitica`: `…/agenda?cuanto=gratis` · `/agenda` |
  | Ficha pública (`/lugares/<slug>`, `/eventos/<slug>/cartel`) | su sección: `…/lugares` · `/lugares/[ficha]` (la ruta dice que es una ficha, para no mezclarla con el listado) |
  | Ruta privada, rol «otro» (`/entrar?siguiente=…`, `/invitacion/<código>`) | su primer tramo: `…/entrar` · `/entrar` (`limpiarUrlEvento`, la regla de las acciones) |
  | Una URL que no se puede leer | nada |

  Sin cookies ni identificación: el componente no lee ni manda nada de la sesión; la marca del rol solo decide si se manda.
- **La `route` se sustituye siempre por la nuestra.** La librería calcula la ruta con los parámetros de Next y, si no los reconoce, manda la ruta
  tal cual: con un slug con acentos (`/lugares/caf%C3%A9-…`, el parámetro llega decodificado y no coincide) saldría el slug. Prueba con ese caso.
- **En `layout.tsx`**, junto a `TituloInstalada`, **fuera de `MarcaAdmin`**: se monta para toda la gente desde el primer HTML y la
  administración también se mide. `SpeedInsights` de `/next` trae su propio `Suspense` (lee `useSearchParams`), así que no hace falta otro.
  `AnalyticsVercel` no se tocó: las vistas y acciones siguen sin medirse para la administración.
- **Prueba unitaria** `src/components/VelocidadVercel.test.ts` (6): le pasa un `beforeSend`; Administración con rol admin, otro y sin resolver
  (dos tramos, también con la barra codificada `%2f`); `sinMedirEnPantalla` (admin y sin resolver fuera de Administración: nada); rol «otro» en
  páginas, filtros y fichas (con el slug con acentos); rutas privadas al primer tramo; una URL rota.
- **El aviso de privacidad** (`src/app/privacidad/page.tsx`). La frase «A la administración no se le mide» no está en `docs/`: vive en el aviso
  público. Ahí: «A la administración no se le miden páginas ni acciones. Con Vercel Speed Insights medimos además cuánto tarda en cargar cada
  pantalla, también sin cookies y sin identificar a nadie; esa medida sí incluye a la administración.» (Pregunta 1.)

### Cómo se comprobó el guion

Guion de la sesión (no en el repo; carpeta temporal): el respaldo local con datos inventados en un puerto fijo, `next build` y `next start` en un
puerto libre contra él, Chrome real (playwright-core) a 390×844 con el reloj fijo del respaldo, sin sesión en `/` y con la cuenta de
administración del respaldo en `/admin`.

- **El HTML del servidor no lleva la etiqueta**: Speed Insights la añade en el teléfono al montarse (igual que Analytics). El HTML de `/` y de
  `/admin` sí carga el trozo de JavaScript que la lleva (1 de 21 y 1 de 19 trozos contienen `/_vercel/speed-insights/script.js`).
- **Ya en la página**, el `<head>` tiene `<script src="/_vercel/speed-insights/script.js" data-sdkn="@vercel/speed-insights/next"
  data-sdkv="2.0.0">` en `/` (ruta `/`, marca «otro», junto al de Analytics) y en `/admin` (ruta `/admin`, marca «admin», **sin** el de
  Analytics).
- **Consola**: en las dos, solo el 404 del guion (`/_vercel/…` solo existe en Vercel; con Speed Insights sin activar en el proyecto pasará lo
  mismo en producción) y el aviso de la librería «Failed to load script»; en `/`, el mismo 404 de Analytics que ya estaba. Ningún error de la
  app. Con el reloj del navegador sin fijar salía además el error #418 de React (el texto de la hora del servidor, fijo al 7 de octubre, no
  coincide con el del navegador): es del montaje de la prueba, desaparece con el reloj fijo.

## 2 · El adelanto de Instagram

`PortadaAdmin.tsx`: fuera `prefetch={false}` del renglón de Instagram y la prop `prefetch` de `RenglonPortada` (nadie más la usaba); el
comentario dice ahora que todos se adelantan y por qué (medido en OL-498: el adelanto de una pantalla dinámica solo trae su espera,
`loading.tsx`, no su lectura cara). Ninguna prueba afirmaba lo contrario. Comprobado con el mismo guion: al desplazar hasta el renglón de
Instagram, Next pide `/admin/instagram` como adelanto (`Next-Router-Prefetch`), junto a Corridas, Grafo y Obras colectivas. Nada visible cambia:
sin capturas nuevas.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npm run lint` | 0 errores (2 avisos de antes, en archivos que no toqué) |
| `npm run typecheck` | bien |
| `npm test` | 320 archivos, 5 148 pruebas, todas bien (6 nuevas) |
| `npm run inventario` | sin novedades |
| `npm run medir` (320, 390, 820 y 1 280) | 63 pantallas, sin novedades (s45 portada de Administración y s46–s49 Instagram, iguales) |
| `npm run test:componentes` | 802 pruebas, todas bien (ningún componente tocado tiene prueba de componentes; se corrió igual) |
| `npm run build` | bien |
| Guion de la sesión (`/` y `/admin` en Chrome) | el guion de Speed Insights en las dos; consola sin errores de la app; adelanto de Instagram |

## Lo que falta

- **Activar Speed Insights en el proyecto de Vercel** (pestaña «Speed Insights» → «Enable»): sin eso, `/_vercel/speed-insights/script.js` no
  existe y no se mide nada (como hoy). No lo toqué: es un ajuste de la cuenta. Conviene mirar al activarlo si el plan de la cuenta tiene un
  cupo de mediciones al mes y cuánto se gasta la primera semana (no lo verifiqué).
- **La prueba del founder**: abrir Administración en su iPhone (la app instalada) unos días y mirar en Vercel → Speed Insights las rutas
  `/admin` y `/admin/instagram`.

## Preguntas al founder

1. **El aviso de privacidad** decía «A la administración no se le mide», y ahora la velocidad de carga sí se mide también en Administración. Lo
   cambié a «A la administración no se le miden páginas ni acciones» y añadí la frase de Speed Insights. ¿Te sirve así?
2. **Fuera de Administración, a la administración no se le mide la velocidad** (cuando miras Agenda o una ficha con tu cuenta, no cuenta),
   para que los números de las pantallas públicas sean de la gente. El encargo pedía no medir con `sinMedirEnPantalla()` y a la vez medir
   Administración; como esa marca dice «admin» justo en Administración, lo apliqué solo fuera de ella. ¿Quieres que también cuenten tus visitas
   a las pantallas públicas?
