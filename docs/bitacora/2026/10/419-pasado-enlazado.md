# 419 · Lo pasado se enlaza y se ve pasado («Quién fue»), y se mide compartir la app (OL-388)

**Fecha:** 2026-10-12. **Rama:** `pasado-enlazado`, desde `origin/main` (`d5cc52cc`). **Operador:** Claude (agente del gestor VI). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder y verlo en su iPhone.

## El encargo

Founder (2026-10-12, 13:10): «Pon enlace a objetos del pasado para que se vea quién fue, pero claramente que sean pasados y no se perciban activos. Agrega tags para medir compartidas, copiar sí cuenta como compartir.»

Sustituye a lo decidido esa misma mañana en OL-380 (bitácora 411): no enlazar lo ligado que ya pasó porque su ficha decía «Esto ya no está». Desde OL-383 (bitácora 414) esa ficha existe en pasado, así que ahora sí se enlaza.

## Lo que cambió

- **`src/lib/ligado.ts`: `renglonLigado(l, ahora, cierre?)`** ya no decide si se enlaza: devuelve `{ pasado, cuando }` y siempre se enlaza.
  - Lo que viene: su fecha, como siempre («viernes 9 de octubre · 20:00»).
  - Lo que pasó: «Fue el viernes 9 de octubre · 20:00».
  - Con `cierre` («Cerró» para una exposición, «Terminó» para un festival) y un fin, el día en que acabó: «Cerró el domingo 29 de noviembre».
  - Pasado sigue siendo la regla de siempre (`eventoPaso`).
- **La ficha (`src/app/eventos/[id]/page.tsx`): un solo renglón para lo ligado, `RenglonLigado`.** Siempre es un enlace a su ficha con el chevrón. Si ya pasó, se ve pasado:
  - «YA PASÓ» chico encima del título, como la ceja de las tarjetas de Inicio (12 px, 700, mayúsculas, gris);
  - el título en el gris del texto suave;
  - la fecha en pasado;
  - el icono y el chevrón ya iban en gris.

  Se aplica en tres sitios:
  - la inauguración de una expo: «Inauguración · Fue el …»;
  - la expo que inauguró un acto: «Inauguró {título} · Exposición · Cerró el …» (si sigue abierta, «Inaugura {título} · Exposición», como siempre);
  - el festival del que es parte un acto, cuando ya terminó: «Parte de {festival} · Festival · Terminó el …». OL-380 lo dejó fuera por ser pieza del gestor; ahora el encargo lo pide.
- **`ficha.module.css`, sección 4:** `a.ligadoPasado` es la misma rejilla del renglón con una fila `ceja` arriba (áreas, sin envoltorio). El `a` delante sube la especificidad: `ui/Renglon` se carga después y su `.dato` pisaba las áreas (en la primera captura, «YA PASÓ» caía abajo a la derecha).
- **«Quién fue» en la ficha en pasado:**
  - El número «Fueron N» vuelve a bajar a su sección (`salto="quien-va"`). Con 0 no se pinta: la banda queda con dos números.
  - `QuienVaDiferido` pinta `QuienVa` con `pasado`:
    - título y nombre de la sección «Quién fue»;
    - el resumen en pasado: «Fueron 2: Ana y Marcos», «Fue Ana» (`resumenAsistentes` con un cuarto argumento);
    - «A N personas les interesó.»;
    - nada de «Sé la primera persona».
  - Si nadie dijo «Voy», no hay sección. Mientras llega, en pasado no hay esqueleto: así no aparece y desaparece una sección que quizá no existe.
  - Siguen igual que en OL-383: sin «Voy» / «Me interesa», sin «A mi calendario», sin «Cómo llegar»; solo «Compartir».
- **Medir compartir la app (`src/lib/medir.ts`):** el evento `compartir` gana la opción `que: "app"` en la lista cerrada. `BannerCompartir` mide:
  - `{ que: "app", medio: "hoja" }` cuando la hoja del teléfono se abrió y no se canceló;
  - `{ que: "app", medio: "copiado" }` cuando se copió el enlace. Copiar cuenta como compartir: el banner se va en los dos casos.

  Si la hoja se cancela (`AbortError`), no se mide. `fichaDeEnlace` (los botones de las fichas) sigue sin medir la raíz: su tipo ya no incluye «app».
- **Aviso de privacidad:** no cambia. Dice en general que se miden «acciones sin nombre, como que se publicó un evento o que alguien dijo «Voy»», y compartir la app es una de ellas. No lista cada evento ni manda nada nuevo (ni la dirección ni a quién).

## Pruebas

- `src/lib/ligado.test.ts` (5):
  - pasado → «Fue el …» y `pasado: true`;
  - futuro → la fecha de siempre;
  - el borde de las 3 h;
  - el fin manda;
  - `cierre` con y sin fin.
- `src/app/eventos/[id]/page.test.ts`:
  - **«lo ligado que ya pasó se enlaza y se ve pasado (OL-388, sustituye a OL-380)» (4):**
    - la expo enlaza la inauguración pasada con «Fue el viernes 7 de enero de 2000 · 20:00»;
    - la que viene sigue igual;
    - el acto enlaza la expo cerrada («Inauguró Expo cerrada», «Exposición · Cerró el lunes 31 de enero de 2000») y la abierta como siempre;
    - «Parte de» enlaza el festival terminado («Festival · Terminó el lunes 3 de enero de 2000»).
  - **«Quién fue» en la ficha en pasado (OL-388) (3):**
    - con dos «Voy», el `Kpi` «Fueron 2» con salto a `quien-va` y `QuienVa` en pasado; se pinta a HTML con «Quién fue», «Fueron 2: Ana y Luis» y sin «Quién va» ni «primera persona»;
    - con nadie, ni el número ni la sección, y el límite de `Suspense` sin esqueleto;
    - nada activo: sin `Asistencia` ni calendario, sin «Cómo llegar»; con «Compartir».
  - La de OL-257/OL-383 («en pasado no lleva Quién va») se ajustó: ahora lleva `QuienVaDiferido` en pasado, y sin nadie devuelve nada.
- `src/lib/medir.test.ts` (+2): `compartir` con «app» por hoja y copiado; nada fuera de la lista (una dirección, «instagram», una persona, un dato de menos).
- `src/lib/comunidad.test.ts` (+1): el resumen en pasado.
- `src/components/inicio/BannerCompartir.componentes.test.mjs` (los 5 de siempre, ampliados). El paquete se arma con `NEXT_PUBLIC_VERCEL_ENV=preview` y `NEXT_PUBLIC_MEDIR_DEPURAR=1`, así que `medirCliente` escribe en consola lo que mandaría y la prueba lo lee. Copiar → `compartir {app, copiado}`; hoja compartida → `{app, hoja}`; hoja cancelada → nada. En verde con el Chrome de la Mac.
- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (202 archivos, 3661 pruebas), `npm run inventario` (sin novedades: 342 medidas en duro, las mismas), `npm run build` y `npm run medir` (38 pantallas, sin novedades), en verde.

## Medición: el presupuesto de la expo sube 1

`s24-ficha-exposicion` mide **87 nodos (120 desde 820)**; el presupuesto era 86 (119). En el respaldo, la inauguración de «Ecos de papel» ya pasó. Con OL-380 era un `li` sin enlace; ahora es `li` > `a` con la ceja «Ya pasó» y el chevrón. En `main` medía 84; la diferencia ya estaba anotada en la 418. Se anotó a mano en `medidas.aceptadas.json` (87, 87, 120, 120). No se usó `--aceptar` porque reescribe todas las pantallas. No hay pantalla medida de una ficha en pasado: «Quién fue» no cambia ningún otro presupuesto.

## Capturas (390×844 a 2×, `docs/rediseno/capturas-419/`)

La app compilada (`next build` + `next start`) contra una copia del respaldo local (`scripts/ops/auditoria-ui/respaldo-local`) en el scratchpad de la sesión. Esa copia no tiene `imagenes.json`, así que no hay ni una imagen de fuera. Se le hicieron tres cambios, solo en el scratchpad:

- «Ecos de papel» y su inauguración (jueves 8 de octubre, 19:00) visibles, como las vería un visitante;
- dos «Voy» (Ana y Marcos) en la inauguración;
- una «Charla de grabado: papel y tinta» del sábado 10, ya pasada y sin nadie.

Sin `.env.local`: las variables (URL del respaldo, llave y token inventados) se pasaron al compilar y al arrancar. Todo lo que no es `127.0.0.1` se cortó en el navegador. **Ni una lectura a producción.** Capturas con playwright-core y el Chrome de la Mac, toques por coordenadas. Abiertas una por una.

- `01-expo-inauguracion-pasada-enlazada.png`: la ficha de «Ecos de papel» como visitante, bajo «Horario», el renglón con la estrella, «YA PASÓ» chico, «Inauguración» en gris, «Fue el jueves 8 de octubre · 19:00» y el chevrón.
  - Medido: enlace a `/eventos/inauguracion-ecos-de-papel`; ceja, título y chevrón en `rgb(92, 92, 92)` (texto suave); ceja de 12 px; renglón de 74 px (59 sin la ceja).
  - Al tocarlo se abre la ficha del acto, «Inauguración: Ecos de papel · Ya pasó · Somos Nosotros», y no «Esto ya no está».
- `02-acto-pasado-fueron-2.png`: la ficha del acto en pasado. Lleva el chip «YA PASÓ», los números «FUE · 19:00 / jue 8 oct», «COSTO / Gratis» y «FUERON / 2», solo «Compartir» y «Inaugura Ecos de papel · Exposición» (la expo sigue abierta: renglón normal). En la página no aparecen «Voy», «Me interesa», «A mi calendario», «Cómo llegar» ni «Quién va».
- `03-acto-pasado-quien-fue.png`: tras tocar «Fueron» (baja a la sección) y el resumen, «Quién fue» con «Fueron 2: Ana y Marcos» abierto: Ana Rentería y Marcos Ledesma, cada una a su perfil. Al final, «Publicado por».
- `04-acto-pasado-sin-nadie.png`: «Charla de grabado: papel y tinta» en pasado. La banda tiene dos números («FUE · 18:00 / sáb 10 oct» y «COSTO / Gratis»), sin «Fueron». Solo «Compartir», «Dónde» y «Sobre el evento». Medido: sin «Fueron», sin «Quién fue» ni «Quién va» y sin `#quien-va`.
- `05a-banner-antes.png`: Inicio con la sesión inventada de Ana, tercera visita. Tras Destacados, el banner «¿Te gusta Somos Nosotrxs?».
- `05-banner-enlace-copiado.png`: sin hoja de compartir (escritorio), tras tocar «Compartir». El banner se fue y abajo sale el aviso «Enlace copiado».
  - Medido: se copió `https://somosnosotros.org` y el teléfono guarda `compartido: true`.
  - La app compilada con `NEXT_PUBLIC_MEDIR_DEPURAR=1` escribió `[medir] compartir {"que":"app","medio":"copiado"}`: fuera de producción no se manda nada.

## Por confirmar

1. **La ceja «YA PASÓ» encima del título** hace el renglón más alto: 74 px contra 59. La puse porque el encargo la pedía «si cabe sin ruido» y cabe en la misma rejilla. Sin ella, el pasado lo dicen el título en gris y «Fue el …»; quitarla es borrar el `<i>`.
2. **«Cerró el domingo 29 de noviembre» / «Terminó el …»** van sin hora: es el día en que acabó, no un horario. La inauguración sí lleva hora («Fue el … · 20:00»), como en la 411.
3. **«Fueron N» se esconde con 0** y la banda queda con dos números. Mientras llega el conteo, el esqueleto del tercer número sale y luego desaparece si es 0: un salto chico, solo en la ficha en pasado.
4. **«Quién fue» cuenta quienes dijeron «Voy»**, no quienes fueron de verdad. Es lo mismo que el «Fueron» de la 414.
5. **«A N personas les interesó.»** bajo el resumen, en pasado. Lo decidí yo.
6. **El autor y la administración** siguen viendo la ficha viva (con su aviso «Este evento ya pasó…») y no «Quién fue». Así venía de OL-383.
7. **«Gracias por compartir»** sigue contando como compartir aunque la hoja no diga si de verdad se envió: se da por hecho al no cancelarla. La medición dice «hoja» en ese caso.

## No se tocó

El programa del festival y «Ya pasó» (OL-383), las fichas de lugar y artista, los botones de compartir de las fichas (siguen midiendo evento, lugar y artista como antes) y el aviso de privacidad.
