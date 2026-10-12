# 409 · El título corto de un acto salta el nombre de su festival aunque el festival se llame «CINEMA: …» (OL-378)

**Fecha:** 2026-10-12. **Rama:** `titulo-corto-festival`, base `origin/main` (`152ea11a`). **Operador:** Claude (agente del gestor VI). **Sin migración.**
**Estado:** pruebas en verde; falta la revisión del gestor y el «publica» del founder.

## Lo que reportó el founder

Pruebas de usuario con su iPhone (2026-10-12): en Destacados, la tarjeta del acto «CINEMA: El atractivo de la resistencia, concierto y charla de MOTUS NEU jazz» decía «Cinema» en vez del título.

## Por qué pasaba

`CarrilAgenda` sí pasaba el nombre del festival (`nombreDeFestival(agenda.eventos)`), pero en producción el festival se llama «CINEMA: XV Festival de Cine México-Alemania». `tituloCorto` comparaba lo que va antes de los dos puntos del acto («CINEMA») con el nombre **entero** del festival; no coincidía, así que no lo saltaba y devolvía «CINEMA», que `comoOracion` volvía «Cinema» (lo comprobó el gestor con los datos de producción; en esta pieza no se leyó producción).

## Qué cambió

1. **`src/lib/tituloCorto.ts`.** El prefijo cuenta como «nombre del festival» si coincide con su nombre entero **o con su propio título corto** (`tituloCorto(festival)`, «CINEMA»). Y, solo cuando se conoce el festival, un prefijo hecho de partes separadas por coma que son todas festival o tipo también se salta («CINEMA, clausura: …»). El resto de la regla no cambia: los tipos, la coma seguida de minúscula, y si lo que sigue empieza con minúscula se queda el prefijo («Verbena, Ritmo y Sabor: verbena musical» → «Verbena, Ritmo y Sabor»). Sin festival, nada cambia.
2. **`src/components/inicio/CarrilTusPlanes.tsx` + `src/app/page.tsx` + `src/app/personas/consultas.ts`.** «Tus planes» no pasaba el festival y, además, `cargarPersona` no traía `evento_padre_id`, así que no había cómo saber de qué festival es un acto. Ahora la consulta trae esa columna (una columna más en el `select` de asistencias, sin migración) y el carril recibe también `agendaPromise`: el nombre se busca con `nombreDeFestival` entre los eventos de la agenda de la ciudad y los planes de la persona (por si el festival también es uno de ellos). Si la agenda no se pudo leer (`cargarAgenda` lanza), «Tus planes» sale igual, sin saltar el festival, como antes: no depende de que la agenda cargue.
3. **`src/lib/tituloCorto.test.ts`.** Pruebas con los títulos reales (abajo). Las de antes siguen igual.

## Con los títulos reales

| Título del acto | Festival | Antes | Ahora |
|---|---|---|---|
| CINEMA: El atractivo de la resistencia, concierto y charla de MOTUS NEU jazz | CINEMA: XV Festival de Cine México-Alemania | CINEMA → «Cinema» | **El atractivo de la resistencia** |
| CINEMA, clausura: Metrópolis con banda sonora en vivo de Jo Beyer | el mismo | CINEMA, clausura | **Metrópolis con banda sonora en vivo de Jo Beyer** (en la tarjeta, en dos líneas como mucho, cortado en palabra entera) |
| Inauguración: DESIERTO: Observación y Espacio. | con o sin festival | DESIERTO | DESIERTO (igual) |
| CINEMA: El atractivo de la resistencia | sin festival, u otro festival | CINEMA | CINEMA (igual) |

**Decisión sobre «CINEMA, clausura: …»:** hoy salía «CINEMA, clausura», que no es el título del acto; lo cambié para que salte festival y tipo y quede «Metrópolis con banda sonora en vivo de Jo Beyer». La palabra «clausura» no se ve en la tarjeta (la ceja solo dice la clase o el día); el título entero sigue en el nombre accesible, en la ficha y en la historia. **Por confirmar** con el founder si quiere que «Clausura» se note en la tarjeta.

## Los demás carriles y la búsqueda

- **Destacados / Seleccionados, Esta semana, Festivales y expos, Nuevos** (`CarrilAgenda`) y **Más adelante** (`CarrilMasAdelante`): ya pasaban `nombreDeFestival(agenda.eventos)`; con el arreglo de `tituloCorto` quedan bien sin tocarlos.
- **Tus planes:** arreglado (punto 2). Límite: un acto de un festival de **otra ciudad** cuyo marco la persona no marcó no tiene el nombre a mano (la agenda es la de la ciudad que se ve) y se queda con el título corto de antes. Cubrirlo pide leer los marcos aparte o unirlos en la consulta de la persona; no lo hice por ser un caso raro y otra lectura. **Por confirmar** si hace falta.
- Las tarjetas que «Tus planes» suma en el cliente desde otras filas (`tarjetasTusPlanes`, recuerdo de la visita) ya traen su `corto` calculado en su carril: salen bien.
- **Búsqueda** (`src/app/accionesBuscar.ts`): no pasa el festival y **no hace falta**: sus resultados se pintan como renglón con el título entero (`BuscarPantalla`, `Renglon titulo={e.titulo}`); el `corto` de la tarjeta no se usa ahí.
- `TarjetaEvento` cae en `tituloCorto(t.titulo)` sin festival solo si la tarjeta no trae `corto`; todas las de evento lo traen desde `tarjetaEvento`.

## Verificación

- `npm run lint`: 0 errores (1 aviso que ya estaba, en `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: verde (antes hizo falta `npm ci` en el árbol de trabajo: faltaba `satori`).
- `npx vitest run src/lib/tituloCorto.test.ts src/lib/destacados.test.ts src/lib/tarjetaInicio.test.ts`: 3 archivos, 76 pruebas en verde.
- `npm test`: 197 archivos, 3585 pruebas en verde.
- **Sin captura 390×844:** es lógica pura y la evidencia son las pruebas con los títulos reales; no se levantó Inicio con un festival inventado en el respaldo local. Queda para la vista previa de la rama en el iPhone del founder.
