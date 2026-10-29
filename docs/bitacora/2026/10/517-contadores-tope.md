# 517 · OL-485 · Contadores sin sesión que no se puedan inflar (R2 del barrido de seguridad OL-482)

**Fecha:** 2026-10-29. **Rama:** `contadores-tope` (desde `origin/main` `abe09d68`). **Quién:** agente del Gestor de cambios VII (Opus 5.5, árbol aislado), sin subagentes.
**Manda:** el barrido de seguridad del 2026-10-29 (privado) y la recomendación que el founder aceptó: «tope por evento y hora, sin guardar direcciones IP ni nada que identifique a nadie».
**Estado:** hecho, con **una migración** (`20261029210000_contadores_tope.sql`, solo añade). Sin variables nuevas. No toqué producción, `.env` ni llaves. Espera revisión del gestor y el «publica» del founder.

Términos (una línea cada uno):
- **`Sec-Fetch-Site`:** una cabecera que pone el navegador (no la página) y dice de dónde sale la petición: `same-origin` si la hace una página de este mismo sitio.
- **Tope:** lo más que se cuenta de una cosa en una hora; lo de más se ignora en silencio.
- **Llave de servicio:** la llave del servidor de la app; la única que puede llamar a las funciones que cuentan.

## 1. Lo que pasaba

Tres rutas cuentan cosas sin pedir sesión: `POST /api/vista` (las visitas a la ficha de un evento, que alimentan Destacados), `POST /api/avisos/abierto` («Avisos abiertos» en Administración) y `POST /api/medir` (lo que se manda a Google Analytics). Las tres rechazaban una petición **con** `Sec-Fetch-Site` de otro sitio, pero dejaban pasar una **sin** la cabecera, y eso es justo lo que manda un programa como `curl`. En las vistas, además, cada petición sin cookie es «otra persona» (se le da una cookie nueva), así que **seis peticiones bastaban para poner un evento en Destacados** (la regla de OL-459: 6 vistas) y cien lo subían por encima de cualquier evento con «Voy» de verdad (cada vista suma 1 punto, cada «Voy» 20).

## 2. Qué cambia

### Mismo origen, obligatorio (las tres rutas)
- `src/lib/mismoSitio.ts` (`vieneDelSitio`): solo vale `Sec-Fetch-Site: same-origin`. Sin la cabecera, o con cualquier otro valor (`same-site`, `cross-site`, `none`), **403**.
- `none` no se acepta en ninguna: esas rutas nunca se abren escribiendo la dirección; siempre las llama la propia página con `fetch` (`ContarVista`, `AvisoAbierto`, `medirCliente`), que manda `same-origin`. `public/sw.js` no llama a ninguna de las tres (solo recibe avisos y abre la app al tocarlos).
- Quién manda la cabecera: Safari desde iOS 16.4, Chrome, Firefox y Edge desde hace años; la app del iPhone carga `https://somosnosotros.org` en su WebView y pide iOS 17.4 o más (`IPHONEOS_DEPLOYMENT_TARGET`), que la manda; la de Android es Chrome (TWA).

### Tope por hora en la base, sin nada de nadie
- Tabla nueva `contadores_hora (ambito, clave, hora, n)`: qué se cuenta (`vista`, `aviso_abierto`, `medir`), de qué (el id del evento, el tipo de aviso o el nombre de la medición), la hora en punto y cuántas van. **Sin cuenta, cookie, IP, teléfono ni navegador.** Sin permisos para la llave pública; las filas de hace más de dos días se borran solas.
- `contador_tomar(ámbito, clave, tope)`: suma uno si todavía cabe y dice si cupo, de una sola vez (dos llamadas a la vez no pasan las dos del tope: lo prueba el banco con 12 conexiones a la vez y tope 5 → pasan 5).
- **Vistas** (`contar_vista_evento` y `contar_vista_evento_origen`, mismas firmas y permisos): una vista **sin cuenta** que sería nueva solo se guarda si el evento lleva menos de **30** vistas sin cuenta en la hora en curso. La de más no se guarda y la ruta responde igual, 204: quien la manda no se entera. Una vista repetida (mismo visitante, mismo día) no gasta el tope. **Las vistas con cuenta no tienen tope**: ya cuentan una por cuenta y día, e inflarlas exige crear cuentas. La vista que llega de un enlace de Instagram o Facebook comparte el mismo tope (una vista es una vista).
- **Avisos abiertos** (`avisos_contar_abierto`, misma firma): hasta **30 por tipo y hora**; si salieron más, hasta los avisos de ese tipo que llegaron a un teléfono en los dos últimos días (los mismos «mandados» de `panel_avisos`, sin la administración). No se pueden abrir más avisos de los que salieron.
- **Medición** (`medir_contar`, nueva): `POST /api/medir` pregunta a la base, después de responder, si el nombre cabe en **300 por hora**; si no, no lo manda a Google. Solo se pregunta cuando de verdad se mandaría (producción con sus variables), así la vista previa y lo local no gastan el contador. Si la base no contesta, se manda igual: medir no depende de la base, y una caída de la base no la provoca nadie desde fuera. (Vercel Analytics va directo del teléfono a Vercel y no pasa por aquí.)

## 3. Por qué 30 (y 300)

- **No hay datos por hora en ningún lado, a propósito:** `vistas_evento` guarda solo el día (OL-459), y no leí producción. En las pruebas del banco (OL-459), el evento más visto tiene 6 vistas en el día. Las vistas existen desde el 23 de octubre.
- **30 por evento y hora es 5 veces el umbral de Destacados (6)**: un evento que de verdad interesa entra igual, con la primera media docena de visitas. Pasar de 30 visitantes **nuevos y sin cuenta** a la **misma** ficha en **una** hora es lo que traería una historia de Instagram muy compartida; si pasa, el evento ya está en la tira con creces y lo único que se pierde es orden entre los más vistos (y el conteo de `vistas_por_origen` de esa hora). Las vistas con cuenta siguen contando todas.
- **Lo que gana:** cien peticiones falsas en una hora ya no valen 100 puntos sino 30; dos «Voy» de verdad (40) siguen delante. Lo prueba el banco.
- **300 por nombre de medición y hora:** la medición es de toda la app, no de un evento, y el nombre que más se repite («busqueda») lo hacen muchas personas a la vez; 300 es diez veces el tope de una ficha. Si Google Analytics muestra horas reales cerca de 300 en algún nombre, se sube (pregunta abajo).

## 4. Lo que no protege (dicho claro)

- La cabecera la puede escribir a mano un programa (`curl -H 'sec-fetch-site: same-origin'` entra: 204). Contra eso está el tope, no la cabecera. La cabecera sí cierra que otra página haga que el navegador de alguien cuente sin que lo sepa, y saca de en medio los programas que ni la escriben.
- Con el tope, alguien decidido puede sumar hasta 30 vistas por hora a un evento (720 al día); eso basta para meterlo a la tira por «vistas» (6), aunque ya no para pasar por encima de lo que tiene «Voy». La administración puede quitarlo, como siempre. Si hiciera falta más, las opciones son del founder (pregunta abajo).

## 5. ¿Y un navegador raro que no mande la cabecera?

Un Safari de iPhone anterior a iOS 16.4 (marzo de 2023) o un navegador muy viejo **no manda `Sec-Fetch-Site`**: sus visitas no se cuentan, sus avisos abiertos tampoco y su medición no llega a Google. **No se rompe nada en la pantalla**: las tres llamadas son de «mandar y olvidar» (`fetch(...).catch(() => {})`, nadie espera la respuesta), así que esa persona usa la app igual. La app del iPhone pide iOS 17.4 o más, así que la de la tienda siempre la manda.

## 6. Cómo se probó

- **Banco de la base** (`supabase/tests/pg/contadores-tope.test.mjs`, en una transacción que se deshace): 100 vistas sin cuenta del mismo evento en la misma hora → cuentan y se guardan 30; la repetida no cuenta ni gasta el tope; otro evento tiene su tope; con cuenta no hay tope; la de una red comparte el tope y la ya guardada sigue anotando su red; **Destacados: el inflado entra por vistas con 31 puntos y dos «Voy» (40) siguen delante**; la hora siguiente vuelve a empezar y lo de hace más de dos días se borra; entradas raras no cuentan; avisos: 40 abiertos sin mandados → 30, con 45 mandados (y 5 a la administración, que no suman) → 45; medición: 310 → 300; permisos: ni la llave pública ni una cuenta pueden llamar a las funciones ni leer o escribir la tabla; las cinco funciones son `security definer` con `search_path` vacío y solo para la llave de servicio; 12 llamadas a la vez con tope 5 → 5. **Control negativo:** con el tope de vistas a 1 000 y el de medición a 100 000, fallan 9 comprobaciones (entre ellas la de Destacados); con 30 y 300, todas en verde.
- **Pruebas de las rutas** (`route.test.ts` de las tres): sin la cabecera y con `same-site`, `none`, `cross-site` o vacía → 403 y nada a la base; medir: pasado el tope no se manda a Google, si la base falla o no hay llave se manda igual, fuera de producción no se pregunta a la base.
- **En el navegador** (`scripts/ops/auditoria-ui/probar-contadores-tope.mjs`, Chrome real con playwright-core, app compilada contra el respaldo local con datos y llave de servicio inventados): la ficha de un evento abierta sin sesión manda **un** aviso a `/api/vista`, Chrome pone `Sec-Fetch-Site: same-origin` (leído de la red), la ruta responde 204 y la app llama **una vez** a `contar_vista_evento`. Después `curl` sin la cabecera a las tres rutas → **403**, y con otra página como origen → 403; ninguna llega a la base. `curl` que escribe la cabecera a mano → 204 (lo para el tope).
- Captura: [`capturas-517/01-ficha-390.png`](../../../rediseno/capturas-517/01-ficha-390.png), 390×844 a 2×: la ficha del «Concierto de la Orquesta Sinfónica de San Luis Potosí» del respaldo, igual que siempre (esta pieza no cambia nada en pantalla): cartel, fecha «mié 7 oct · 6:00 pm», «Gratis», «Van 0», Compartir · A mi calendario · Cómo llegar, «Dónde» con el Templo de San Francisco y «Me interesa» · «Voy» abajo. Es la pantalla en la que se contó la vista de arriba.

## 7. Archivos

- `supabase/migrations/20261029210000_contadores_tope.sql` (nueva, solo añade).
- `supabase/tests/pg/contadores-tope.test.mjs` (nueva).
- `src/lib/mismoSitio.ts` (nuevo).
- `src/app/api/vista/route.ts`, `src/app/api/avisos/abierto/route.ts`, `src/app/api/medir/route.ts` y sus `route.test.ts`.
- `scripts/ops/auditoria-ui/probar-contadores-tope.mjs` (nuevo).
- `docs/rediseno/capturas-517/01-ficha-390.png`, este documento y `docs/ops/OPEN_LOOPS.md`.

## 8. Preguntas al founder

1. **¿30 vistas sin cuenta por evento y hora te parece bien?** Con él, alguien decidido todavía puede meter un evento a Destacados por «vistas» (6), aunque ya no ponerlo por encima de los que tienen «Voy». Si quieres cerrarlo del todo, hay dos caminos: subir el umbral de «vistas» (por ejemplo a 15) o que solo cuenten para Destacados las vistas con cuenta (las sin cuenta seguirían sirviendo para saber de qué red llega la gente).
2. **¿300 por hora para cada nombre de la medición?** Si en Google Analytics ves alguna hora con más de 300 de un mismo evento (lo más probable, «busqueda»), dímelo y se sube.
3. **Navegadores viejos:** un iPhone con iOS anterior a 16.4 deja de contar visitas y avisos abiertos (sin romper nada). ¿Te parece bien así?
