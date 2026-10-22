# 473 · Un evento propuesto con un costo que no es cifra se publica «Por confirmar» (OL-441)

**Fecha:** 2026-10-21. **Rama:** `publicar-precio-por-confirmar`, desde `origin/main` (`cacfd6c5`). **Operador:** agente de la pieza (Claude)
para el Gestor VII, sin otros agentes. **Migración:** ninguna. **Variables de entorno:** ninguna. **Pantallas:** ninguna cambia de forma (solo
el texto de la línea de lo hecho en la bandeja), así que no hay capturas. **Estado:** lista para la revisión del gestor.

## El pedido

El founder, hoy: «Al aceptar una sugerencia de evento para San Luis "Altar vivo, instalación inmersiva" me dice que no se publicó: Ponle precio
o marca que es gratis. Pero no puedo hacer eso desde aquí, si no tiene precio que ponga por confirmar o que me lleve a la ficha para hacerlo».

**Causa** (la confirmó el gestor en producción): la propuesta trae `datos.precio = "Entrada con acceso al museo"` y clase `puntual`.
`publicarEvento` solo ponía «Por confirmar» donde el costo es opcional (`clase !== "puntual" || esActo || conExposicion`); en un evento suelto el
texto llegaba a `validarEvento` como precio, `extraerNumero` no encontraba cifra y salía «Pon el precio, o marca que es gratis». La acción devuelve
ese error **antes** de `aceptar_propuesta`, así que la propuesta del founder sigue «por revisar»: con esta pieza en producción, «Aceptar» otra vez
la publica.

## Qué cambió

**Una sola regla de costo** (`src/lib/costoDeAgenda.ts`, nuevo y puro): `costoDeAgenda(texto, opcional)` → `{ costo, precio, nota }`, en este
orden:

| La agenda dice | Queda | Nota al final de la descripción |
| --- | --- | --- |
| «Cooperación voluntaria», «Donativo», «Aportación voluntaria», «A voluntad» | Cooperación solidaria | solo si dice más («Donativo sugerido $50») |
| «$150», «150», «150 pesos», «$1,500» | $150 / $1500 | — |
| «$150 general, $100 niños», «Desde $150» | $150 (la primera cifra) | «Costo: $150 general, $100 niños.» |
| «Entrada libre», «Gratis», «Sin costo» | gratis | — |
| «Gratis con boleto», «Entrada libre, cupo limitado» | gratis | «Costo: Gratis con boleto.» |
| «Costo de recuperación» (o «cuota») sin cifra | Cooperación solidaria | — |
| «Por confirmar», «Por definir» | Por confirmar | — |
| **cualquier otro texto** («Entrada con acceso al museo», «Incluida en el boleto», «Consultar») | **Por confirmar, en cualquier clase** | «Costo: Entrada con acceso al museo.» |
| nada, en festival, exposición, taller o lo que cuelga de ellos | Por confirmar (como antes, OL-411) | — |
| nada, en un evento suelto | gratis (como antes: la agenda de Cultura calla el costo cuando es gratis) | — |

Un número cuenta como precio solo con «$» delante, «pesos» o «MXN» detrás, o solo en su trozo: antes cualquier número valía («Para mayores de
18 años» habría sido $18); ahora eso queda «Por confirmar» con su nota. Una cifra de más de 6 dígitos tampoco es precio. `conNotaDeCosto` pone la
nota al final de la descripción como frase propia («… Día de Muertos. Costo: Entrada con acceso al museo.»); si la descripción ya lo dice, no la
repite, y si no cabe en los 1000 caracteres se recorta la descripción, no la nota. Va en el mismo párrafo: `validarEvento` junta los saltos de línea.

**`precioDeAgenda`** (`src/lib/cargaEventos.ts`, lo que la rutina deja en `datos.precio`) usa la misma regla: «Gratis» y «Cooperación solidaria»
cuando es solo eso; lo demás, el texto de la agenda tal cual, para que al publicar la nota no se pierda (antes «Entrada libre, cupo limitado» se
guardaba como «Gratis» y se perdía el cupo). Leer otra vez lo que dejó la rutina da el mismo costo y la misma nota (probado).

**`publicarEvento`** (`src/lib/rutinas/publicarEvento.ts`): arma el formulario con la regla; si queda «Por confirmar» pasa `por_confirmar` y
`costoOpcional: true` a `validarEvento`, así que el precio ya no es nunca la razón para no publicar; cualquier otra razón de `validarEvento` se
sigue mostrando igual que antes (ese camino no cambió). **En un evento suelto «Por confirmar» se guarda escrito** en `precio`: ahí un precio vacío
se lee «Gratis» (`textoCosto`), que sería falso. Donde el costo es opcional (`costoOpcional` de la ficha: festival, exposición, taller, acto o
inauguración ligada) queda vacío, como lo firmado en OL-411. Devuelve `nota: "se publicó con costo por confirmar"` cuando la agenda dijo un costo
y quedó «Por confirmar».

**La línea de lo hecho** (`src/app/admin/ciudades/acciones.ts`, una línea): «Aceptar» devuelve esa nota y la bandeja, sin cambios, la lee como
«Aceptaste Altar vivo, instalación inmersiva · se publicó con costo por confirmar» (`textoDecidida`, probado).

**«Por confirmar» escrito no sale en renglones ni carteles**, como lo vacío (canon de OL-411: «las tarjetas y los renglones no lo dicen»):
`costoEnLista` (`src/lib/eventos.ts`) y `textoPrecio` del cartel (`src/lib/carteles/datos.ts`) lo callan; la ficha lo dice (`textoCosto` lo
muestra tal cual) y `sabidoGratis` no lo toma por gratis.

## Decisiones por confirmar

1. **«Por confirmar» escrito en `precio` de un evento suelto.** Sin él la ficha diría «Gratis». Efectos: el filtro «Con costo» de Agenda lo
   incluye (`claseDeCosto` → costo; la agenda decía algo que suena a costo); al editar el evento, el paso «Cuánto» vuelve a preguntar
   (`costoDeEvento` → sin respuesta), así que cualquier edición pide poner el precio o «Gratis». Es justo lo que pidió el founder («que me lleve
   a la ficha para hacerlo»), pero hasta entonces el evento se ve.
2. **«Gratis con boleto» es gratis**, con «Costo: Gratis con boleto.» en la descripción. La otra lectura («gratis si ya pagaste el boleto del
   museo») sería «Por confirmar».
3. **Lo voluntario con cifra** («Donativo sugerido $50», «Cooperación voluntaria $50») es cooperación con nota; **la cuota de recuperación con
   cifra** («Cuota de recuperación $80») es precio ($80) con nota; sin cifra, cooperación (como pidió el gestor).
4. **La línea de lo hecho solo lo dice cuando la agenda dijo un costo.** Un festival o taller sin texto de costo queda «Por confirmar» como antes
   y sin línea; un festival aceptado conserva su línea de actos (`notaDeFestival`) sin añadir la del costo.
5. **Toqué `src/app/admin/ciudades/acciones.ts` (una línea) y `acciones.aceptar.test.ts` (un caso)** aunque el encargo vedaba la carpeta: el punto
   3 del encargo solo se cumple ahí. Ningún PR abierto (#556 a #559) toca esos dos archivos (comprobado con `gh pr view --json files`). La bandeja
   (`Bandeja.tsx`, que toca #558) no se tocó. También una línea en `src/lib/carteles/datos.ts` (fuera de la lista del encargo, ver arriba).
6. **La regla vive en `src/lib/costoDeAgenda.ts`, no dentro de `cargaEventos.ts`:** cambiar el import de `./eventos` en la línea 2 chocaba con el
   import que #559 añade en la línea 1 (probado con `git merge-file`: 1 choque). Con el módulo aparte, `cargaEventos.ts` solo gana una línea de
   import (la 5) y el cuerpo de `precioDeAgenda`; la fusión de prueba con `origin/ligar-artistas` sale sin choques.

## Evidencia

- Pruebas nuevas: `src/lib/costoDeAgenda.test.ts` (9: los seis costos de las agendas en las dos clases, cifras, gratis, cooperación, sin texto,
  que nada de lo que manda la regla al formulario falle en `validarEvento`, `precioDeAgenda` y su relectura, `conNotaDeCosto` con tope);
  `src/lib/rutinas/publicarEvento.test.ts` (5 con la base falsa: **el caso del founder** —«Altar vivo, instalación inmersiva», clase puntual,
  «Entrada con acceso al museo»— se publica con `precio: "Por confirmar"`, la descripción termina con «Costo: Entrada con acceso al museo.», se
  inserta y se liga a su propuesta; taller y acto de festival quedan vacíos con la misma nota; los demás costos; sin texto como antes; ningún texto
  de costo deja sin publicar en puntual, taller ni festival); `acciones.aceptar.test.ts` (la línea dice «se publicó con costo por confirmar»);
  una línea en `eventos.test.ts` y otra en `carteles/datos.test.ts`.
- `npm run lint`: 0 errores (1 aviso viejo en `VisorImagen.componentes.test.mjs`, no de esta pieza). `npm run typecheck`: en verde.
- `npm test`: 266 archivos, 4 368 pruebas, 0 fallos.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 103 migraciones, 2 225 comprobaciones, 0 fallaron.
- `npm run inventario`: sin novedades. `npm run medir`: 52 pantallas × 4 anchos, sin novedades.
- `npm run test:componentes`: 686 pruebas, 0 fallos.
- Fusión de prueba de `src/lib/cargaEventos.ts` con `origin/ligar-artistas` (#559): sin choques.

## Lo que queda fuera

- **El importador de la Mac** (`scripts/instituciones/importar-eventos.ts`, que toca #559) sigue validando el precio de su JSON como antes: un
  «Entrada con acceso al museo» escrito a mano ahí sigue frenando. Usar la regla ahí es una pieza aparte, después de unir #559.
- **La propuesta del founder** no se tocó (nunca producción): sigue por revisar y se publica al aceptarla otra vez con esta pieza en producción.
- La bandeja no cambia de forma; el filtro «Con costo» de Agenda no se ajustó para «Por confirmar» (ver decisión 1).

## Archivos

`src/lib/costoDeAgenda.ts` (nuevo), `src/lib/costoDeAgenda.test.ts` (nuevo), `src/lib/cargaEventos.ts`, `src/lib/rutinas/publicarEvento.ts`,
`src/lib/rutinas/publicarEvento.test.ts`, `src/app/admin/ciudades/acciones.ts`, `src/app/admin/ciudades/acciones.aceptar.test.ts`,
`src/lib/eventos.ts`, `src/lib/eventos.test.ts`, `src/lib/carteles/datos.ts`, `src/lib/carteles/datos.test.ts`, esta bitácora y
`docs/ops/OPEN_LOOPS.md`.
