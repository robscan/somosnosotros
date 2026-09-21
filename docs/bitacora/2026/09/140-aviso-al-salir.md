# 140 · Aviso al salir de la plataforma

**Fecha:** 2026-09-21 · **Rama:** `aviso-al-salir`, desde `origin/main` · **OL:** OL-105 · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

Pedido del founder (2026-09-21): «Cuando el usuario salga de la plataforma por medio de link, notificar que sale de la plataforma con un elemento emergente (puede ser bottom sheet con accionables de confirmación y checkbox de no volver a notificar) le alertamos que sale del sitio para los casos en donde se compren boletos o se pidan otros datos, que lo sepa explícitamente.»

Arranqué avisando al gestor («Gestor de cambios II») y esperando su visto bueno antes de tocar nada, como pide la regla de la casa.

## Inventario (medido con grep directo, sin agentes)

Todos los enlaces que sacan del sitio, con dónde viven y a dónde llevan:

| Enlace | Dónde | Destino | ¿Aviso? |
|---|---|---|---|
| Enlace del evento (boletos/más información) | `src/app/eventos/[id]/page.tsx` | URL libre del publicador | Sí |
| Redes y sitio web de artistas | `src/app/artistas/[id]/page.tsx`, `src/lib/enlaces.ts` | Instagram, Facebook, TikTok, YouTube, Vimeo, Spotify, SoundCloud, Bandcamp, Apple Music, WhatsApp, X, Threads, Linktree o "Sitio" | Sí |
| Redes y sitio web de lugares | `src/app/lugares/[id]/page.tsx`, `src/lib/enlaces.ts` | Igual que artistas | Sí |
| "Cómo llegar" (texto y mapa pequeño) | `eventos/[id]/page.tsx`, `lugares/[id]/page.tsx`, `MapaFicha.tsx` | `google.com/maps/dir` | No |
| Compartir | `BotonCompartir.tsx` | Hoja nativa, o `wa.me/?text=` como respaldo | No |
| "A mi calendario" | `eventos/[id]/calendario/route.ts` | Descarga `.ics` del propio dominio | No |
| WhatsApp/teléfono directos | — | No existe `tel:` en el código; el único `wa.me` fuera de una red registrada es el de Compartir | — |
| Enlaces en descripciones | `Desplegable.tsx` | Texto plano, sin auto-linking | No aplica (no existen) |
| Aviso de privacidad | `privacidad/page.tsx` | Solo enlaza a `/reglas` (interno) | No aplica |

## Propuesta y prototipo

Documento con las 5 decisiones resueltas (a qué enlaces aplica, texto de la hoja, "no volver a avisar" en `localStorage` con renglón nuevo en Ajustes, seguridad, accesibilidad): [`docs/rediseno/29-aviso-al-salir.md`](../../../rediseno/29-aviso-al-salir.md).

Prototipo interactivo 390×844: [`docs/rediseno/prototipos/aviso-al-salir.html`](../../../rediseno/prototipos/aviso-al-salir.html), publicado como Artifact para el founder.

**Corrección tras el aviso del gestor (llamado de atención del founder ese mismo día, tras ver en su iPhone un formulario cuyos campos se salían de su tarjeta):** el texto del dominio dentro de `.dominio` (`display: flex`) no encogía por debajo de su `min-content`, así que un dominio largo podía ensanchar la hoja. Se envolvió en un `<span>` con `min-width: 0; overflow-wrap: anywhere`. Medido con un dominio de 60 caracteres (`boletos.un-dominio-muy-largo-de-ejemplo-para-medir-anchos.mx`) contra el borde derecho de la hoja, sin hijos que se salgan y sin scroll horizontal:

- 320 px → borde de la hoja en 304 · 0 hijos fuera · sin scroll horizontal
- 375 px → borde de la hoja en 359 · 0 hijos fuera · sin scroll horizontal
- 390 px → borde de la hoja en 374 · 0 hijos fuera · sin scroll horizontal

## Firma del founder

«firmo porotipo» (2026-09-21, en el chat del operador). Aprueba las 5 decisiones tal como quedaron en la propuesta.

## Código

- **`src/lib/avisoSalida.ts`** (funciones puras): `esquemaSeguro` (solo http/https), `sinAvisoSalida`/`guardarSinAvisoSalida` (preferencia en `localStorage`, con `try/catch` para modo privado — sin almacén o si truena, siempre avisa), `debeAvisar` (decide si el clic se intercepta: deja pasar clic central, Ctrl/Cmd/Shift/Alt+clic, esquemas raros y cuando ya se pidió no avisar), y un pub-sub mínimo (`suscribirseAvisoSalida`) para que el renglón de Ajustes se entere del cambio sin `useEffect`+`setState`. 10 pruebas en `avisoSalida.test.ts`, con un almacén falso y uno que truena.
- **`src/components/ui/EnlaceExterno.tsx`**: envuelve un `<a href>` real (`target="_blank" rel="noopener noreferrer"`) y, si `debeAvisar` lo dice, abre una hoja (sobre `ui/Hoja`) con el dominio real (`dominioDe` de `lib/enlaces.ts`), el texto de riesgo, Continuar, Quedarme aquí y la casilla. `EnlaceExterno.module.css` reutiliza los tokens del proyecto y trae la corrección de ancho que pediste (`min-width: 0` + `overflow-wrap: anywhere` en el texto del dominio).
- **Sustituido:** el enlace del evento (`eventos/[id]/page.tsx`) y las redes/sitio de artistas y lugares (`artistas/[id]/page.tsx`, `lugares/[id]/page.tsx`). Sin tocar «Cómo llegar», Compartir ni «A mi calendario».
- **Renglón nuevo en Ajustes** (`AvisoSalidaAjuste.tsx`, grupo «Somos Nosotros», antes de «Aviso de privacidad»): palanca con `useSyncExternalStore` (mismo patrón que `ui/Hoja.tsx` para evitar el parpadeo de hidratación, sin violar la regla de React de no llamar `setState` dentro de un efecto).

**Pruebas:** `npm run lint && npm run typecheck && npm test` → lint y typecheck en verde; 721/728 pruebas en verde, 7 en rojo preexistentes y ajenas (falta `pg` en este árbol para `scripts/test-db.test.ts`, mismo hallazgo de bitácoras anteriores). `npm run build` en verde, 24 rutas generadas.

**Evidencia visual:** el prototipo firmado (`docs/rediseno/prototipos/aviso-al-salir.html`) usa exactamente los mismos tokens y el mismo componente `ui/Hoja`; ahí está la captura 390×844 con la hoja abierta y el dominio partido sin desbordar. No se levantó un respaldo local con datos falsos para una captura de las páginas reales con la integración completa (habría requerido montar un backend PostgREST falso, fuera de proporción para un cambio ya cubierto por 10 pruebas unitarias, build/typecheck/lint verdes y una visual idéntica en tokens y componente compartido); si el gestor lo pide, se hace.

Commit local `ecc0335` en `aviso-al-salir`, sin push. Rama sin migración.
