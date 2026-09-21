# 125 — Barra inferior despegada: no se reproduce, aviso del founder

**OL-090.** Chat operador nuevo «Barra inferior despegada (OL-090)» (Sonnet 5, esfuerzo medio). Rama `nav-inferior-pegada` desde `origin/main` (`a29e887`, luego traído a `94e0e15` con `git merge`). Bug reportado por el founder el 2026-09-21: «el footer se despega del bottom en viewport», «derivado de estos últimos ajustes», visto en la app instalada del iPhone.

## Qué se hizo

Antes de tocar nada: aviso al Gestor de cambios II y espera de su visto bueno (regla del founder, 2026-09-17). Con su VoBo, lectura de `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md` y la fila propia en `docs/ops/ASIGNACIONES.md`.

Lectura del código sospechoso (`NavInferior`, `ui/Cabecera`, `TiraLetras`, `globals.css`, `layout.tsx`): ninguno usa `transform` sobre un antepasado de la barra (eso rompería `position: fixed` en WebKit), y `NavInferior` es `position: fixed; bottom: 0` directo, sin anidar. No se encontró una causa evidente solo leyendo.

**Reproducción, sin producción (solo lectura):** el árbol de trabajo no traía `.env`; se corrió `next dev` con un `.env.local` propio con las variables de Supabase y Mapbox en blanco, así `clienteServidor()` devuelve `null` y las pantallas raíz pintan su cascarón con listas vacías, sin red. Para probar scroll real se puso temporalmente en `src/app/page.tsx` y `src/app/lugares/page.tsx` una rama `if (!supabase)` con eventos y lugares inventados (revertida con `git checkout` antes de terminar; el árbol quedó limpio, confirmado con `git status`).

Probado en el simulador (`xcrun simctl`, sin capacidades nativas):
- **FLOWYA iPhone SE** (926414EF): no tiene área segura inferior (botón Home físico), así que no puede mostrar este bug — se cambió al 15 Pro.
- **FLOWYA iPhone 15 Pro** (E73372CB), con área segura y `home indicator`: Safari (pestaña) y la app instalada («Agregar a inicio», standalone). En Agenda (usa `ui/Barra`, sin `Cabecera`) y en Lugares en vista Lista (`ui/Cabecera` + `TiraLetras`, los dos sospechosos reales — Agenda no los usa).
- Gestos probados: bajar y subir la lista, volver arriba con el botón ↑ (scroll animado), saltar a una letra de la tira (compactado sin animar), abrir y cerrar el buscador (con teclado), mandar la app a segundo plano y reabrirla, rebote elástico al fondo de la lista.
- En ninguno de esos casos la barra se separó del borde inferior; siempre quedó pegada, con o sin el área segura.

**Aviso del founder a media prueba:** al preguntarle en qué pantalla y tras qué gesto lo vio (para no seguir a ciegas), contestó: **«Tal vez fue un error temporal porque ya no la veo en mi celular»**. No lo pudo reproducir de nuevo en su teléfono.

## Incidente durante la prueba (sin consecuencia)

El simulador FLOWYA iPhone 15 Pro ya traía, de una sesión anterior, accesos directos a `https://somosnosotros.org` (producción) y a `http://localhost:3000` (servidor de otro chat) en su pantalla de inicio — no se comprobó la pantalla antes de usarlo, como pide la memoria del proyecto. Se tocó por error el de producción y se vio una pantalla con datos reales (agenda con eventos y destacados de verdad); no se tocó ningún botón que escriba (Entrar, Publicar, Voy) y no se guardó nada. Se borró ese acceso directo del simulador para no repetir el error, y al terminar se borró también el propio (de prueba) y se apagaron los dos simuladores.

## Causa

**No se pudo medir una causa: el bug no se reprodujo en ningún intento, y el propio founder ya no lo ve en su teléfono.** Sin repetirse, no hay nada que arreglar a ciegas — arreglar sin causa medida habría sido lo contrario de lo que pide el encargo. Candidatos que quedan solo como hipótesis sin confirmar (si volviera a pasar, ayuda para el siguiente intento): un parpadeo de `100dvh`/`env(safe-area-inset-bottom)` al abrir o cerrar el teclado de verdad (en el simulador, con teclado físico conectado, no sale el teclado en pantalla — limitación conocida, bitácora previa), o un instante concreto de la app recién actualizada por el Service Worker.

## Verificación

No hay código que verificar: el árbol volvió a su estado de `94e0e15` (`git status` limpio). `npm run lint && npm run typecheck && npm test` no se corrieron por no haber cambios que probar (regla de pruebas focalizadas: documentación y una investigación sin diff no piden suite).

## Entrega

Commit local en `nav-inferior-pegada` con esta bitácora y la entrada propia en `OPEN_LOOPS.md`. Sin push, sin PR — no hay código. Mensaje consolidado al Gestor de cambios II con lo medido y la respuesta del founder.
