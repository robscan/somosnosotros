# 476 · La cadena de pasos que Vercel corta (508), «Buscar carteles» y las agendas en HTML que salían vacías (OL-444)

**Fecha:** 2026-10-22. **Rama:** `rutinas-cadena-carteles`, desde `origin/main` (`bd6e6f7d`). **Operador:** agente de la pieza (Claude Opus 5.5)
para el Gestor VII, sin otros agentes. **Migración:** `20261022120000_rutinas_latido_carteles.sql` (solo añade). **Variables de entorno:**
ninguna nueva. **Estado:** lista para la revisión del gestor; el latido se enciende solo al aplicar la migración (ver «Al aplicar»).

## El pedido

Tres partes, las dos primeras del encargo y la tercera añadida a media pieza por el gestor:

1. **La cadena cortada.** Los registros de Vercel del 22 de octubre: «rutinas: no se pudo pedir el paso (respondió 508); lo retoma Ciudades o
   el cron». Arreglarlo de raíz, con una prueba que reproduzca el 508.
2. **«Buscar carteles»**, founder, textual: «Haz una rutina para eventos sin cartel. Que se detone con un botón y que vaya a buscar en las
   redes del lugar si ya salió el cartel.»
3. **Agendas de Ciudad de México sin nada** (hallazgo del gestor en producción): dos corridas de «Buscar agendas y eventos» terminaron con
   `agendas_leidas: 8`, 2,56 USD y 0 propuestos y 0 descartados en todas las fuentes; Oaxaca dio 18. Que lo leído sin eventos quede dicho
   por fuente («leída sin eventos: <url>») y buscar la causa con HTML de ejemplo; una página que solo trae enlaces a fichas, que siga hasta 5.

## 1 · La cadena cortada: el siguiente paso lo pide Supabase, no la función

**Causa.** Cada paso pedía el siguiente llamando a su propia ruta (`after()` → `encadenar()` → `POST /api/rutinas/correr`). Vercel ve una
función que se llama a sí misma en cadena y, a la tercera o cuarta vuelta, la corta con **508 «Loop Detected»**. El reintento de OL-429 no
servía (el 508 se repite) y la corrida quedaba «corriendo» hasta que alguien abría Ciudades o llegaba el cron diario.

**La prueba que lo reproduce** (`cadena.test.ts`): la red falsa hace lo que Vercel, una petición que sale de dentro de una tarea de `after()`
recibe 508. Con la cadena de antes (cada paso pide el siguiente por la red), las respuestas son `[202, 508]` y la corrida se queda
«corriendo» en «2 de 3 fuentes», igual que en producción.

**El arreglo:**

- **Ningún paso vuelve a llamar a la ruta** (`src/lib/rutinas/atender.ts`). La misma función da otro paso mientras quepa el más largo (200 s
  de agendas antes de los 297 s que le quedan; 12 como mucho por llamada, por si un paso vuelve enseguida una y otra vez). `encadenar` ya no
  existe; la ruta (`route.ts`) pasa `pasoMaximoMs`.
- **El latido de Supabase** (migración): `rutinas_latido()` cuenta las corridas vivas, es decir las pendientes y las «corriendo» que nadie
  trabaja (`resumen.ocupada_hasta` vencido, vacío o ilegible). Si no hay ninguna, no llama a nada. Si las hay, hace una llamada con `pg_net`
  por corrida libre (tres como mucho) a `/api/rutinas/correr`, con el secreto de Vault. `pg_cron` la corre cada minuto (`rutinas-latido`),
  pero solo si la extensión está (en producción lo está, por los avisos; en el banco de pruebas solo queda la función). Es el mismo patrón
  de los avisos (OL-086, bitácoras 113 y 120):
  - **El secreto:** `avisos_cron_secret` de Vault, que es el CRON_SECRET de Vercel. Si un día se quiere uno propio, `rutinas_cron_secret`
    manda.
  - **La dirección:** `rutinas_url` si está; si no, sale de `avisos_url` cambiando `/api/avisos-pendientes` por `/api/rutinas/correr`.
  - **Una dirección que no sea `https://…/api/rutinas/correr`** no recibe el secreto.
  - **Sin Vault, sin pg_net, sin dirección o sin secreto**, no llama a nada y no falla.
  - **Permisos:** las tres funciones nuevas no se dejan correr por anon, authenticated ni service_role.
- **Un 508 ya no cuenta como fallo** (`disparar.ts`): no se reintenta y el registro dice «Vercel cortó la cadena (508); lo retoma el latido
  de Supabase». La hoja «Correr» y el rescate de Ciudades siguen disparando un paso (una sola petición, no una cadena).
- **El cron de Vercel sigue diario** (`0 12 * * *`, decisión del 21 de septiembre); `vercel.json` no cambia.

## 2 · «Buscar carteles»

**Pantalla** (capturas-476). En el panel de la ciudad, al final, una tarjeta **«Carteles»**: su número son los eventos próximos sin cartel,
debajo dice «eventos próximos sin cartel», luego la última búsqueda (con la píldora de Corridas) y el botón **«Buscar carteles»**. La hoja es
la de los otros botones: qué hace, sus fuentes, el tope **2,00 USD por omisión** («Se estima entre 0,50 y 2 USD») y el crédito. No es el
siguiente paso de una ciudad recién abierta: nunca va en violeta (`BOTONES` sigue siendo de tres; el panel usa `BOTONES_PANEL`).

**Rutina** (`src/lib/rutinas/carteles.ts`, tipo de corrida `carteles`, registrada en el motor con pasos de hasta 120 s):

- **Qué toma.** El primer paso es gratis: lee los eventos próximos de la ciudad sin `imagen` (visibles, sin borrador ni cancelados, que no
  han terminado; hasta 120, los más próximos primero) y los agrupa por lugar, o por sitio si el evento no tiene ficha de lugar.
- **Qué no busca.** Un lugar con Instagram o Facebook y sin sitio, cuyos eventos tampoco traen página, no se puede leer desde el servidor.
  Queda en `resumen.solo_redes` (lugar, sus redes y cuántos eventos) y en `avisos` («12 eventos de lugares solo con Instagram o Facebook: se
  revisan a mano»), para la rutina de redes desde el Chrome del founder. Un lugar sin ninguna red sí se busca: prensa y agendas.
- **Cómo busca.** Cada paso hace una llamada a la API para un lugar, con hasta 4 eventos: búsqueda web (3) y lectura web (3), con
  `instagram.com` y `facebook.com` bloqueados. Se le pasan el sitio del lugar, la página de cada evento y sus redes (solo para reconocer el
  nombre). La entrega va por una herramienta estricta, `proponer_carteles`, con `evento_id` como enum de los pedidos.
- **Qué se comprueba antes de proponer.** Que el evento sea de los pedidos. Que la página haya salido en lo que buscó o leyó, o que sea el
  sitio del lugar o la página del evento. Que la imagen no se haya rechazado antes para ese evento. Y que **la imagen se baje y sea un JPEG,
  PNG o WebP que se deja leer** (`imagenWeb.ts`: https al 443 de un dominio con nombre, sin IP, localhost ni nombres internos; redirecciones a
  mano, tres como mucho; tope de bytes y de tiempo; `imagenAdmitida` de OL-329, nunca SVG).
- **Qué propone.** Una propuesta de tipo `cartel` con `datos = { evento_id, titulo, inicio, lugar, imagen, pagina, url, ciudad, leida }` y
  `fuente` «Sitio del lugar», «Página del evento» o «Búsqueda web».
- **Qué cuenta.** `descartados`: sin_cartel, imagen_no_sirve, pagina_no_vista, rechazado_antes, ya_propuesto (un evento con un cartel por
  revisar o aceptado no se repite) y de_mas.
- **Lo demás.** El tope y la falta de llave, como las otras rutinas.

**Bandeja.** Tarjeta con el icono de cartel: «Cartel · propuesto por la rutina», el título del evento, cuándo y dónde, **«ver el cartel»**
(abre la imagen; solo http(s)), la fuente y cuándo se leyó. Lo hecho se lee «Aceptaste el cartel de «…»».

**Aceptar** (`aceptarCartel.ts`, desde `aceptarPropuesta`). Primero se pone el cartel en el evento:

1. Se baja otra vez la imagen.
2. Se prepara como un cartel que sube una persona: derecho, 2000 de lado como mucho, JPEG en el tope de 5 MB.
3. Se sube con la llave de servicio a `lugares/<quien acepta>/evento-<uuid>.jpg` del bucket `fotos`, la ruta de los carteles de evento de
   `subirFoto`.
4. Se pone en `eventos.imagen` con `colores_cartel`, solo si el evento sigue sin cartel. Si otro se lo puso a la vez, no se pisa y se borra
   el archivo que sobra.

Si algo falla, no se acepta y la tarjeta lo dice en una frase («Ese evento ya tiene cartel: recházala como duplicado.», «La imagen ya no se
pudo bajar de esa página. Recházala.»). Después se marca con la sesión (`aceptar_propuesta`, que no cambia: como un evento, no crea ficha)
y se liga a su evento (`ficha_id`): «Ver ficha» lleva al evento. Cambiar la imagen no avisa a nadie: los avisos de cambio son de cuándo y
dónde.

## 3 · Las agendas en HTML que salían vacías

**Lo que se sabe.** `proponer` cuenta cada evento que descarta. **0 propuestos y 0 descartados** en las 8 agendas quiere decir que el modelo
entregó listas vacías las 8 veces y nadie lo dijo. La agenda en HTML se leía pidiéndole a la API que la abriera (lectura web, 30 000 tokens,
acotada a su sitio). Ese camino falla en silencio con las carteleras de CDMX:

- **Listados largos:** la lectura web corta en su tope de tokens.
- **Páginas que solo enlazan a la ficha de cada evento:** mexicoescultura.com por estado es así.
- **Páginas que se arman con JavaScript:** la lectura web no lo ejecuta.
- **Sitios que no se dejan abrir:** la API devuelve un error de lectura que no se miraba.

Desde aquí no se puede ver cuál fue en producción: no se lee producción ni se gasta en la API real.

**El arreglo** (`src/lib/rutinas/paginaAgenda.ts` y `leerHtml` en `agendas.ts`). Una agenda en HTML se baja primero desde el servidor,
gratis (15 s, solo HTML, 3 MB):

- **Con texto.** Se le da al modelo **el texto de la página por partes**: unos 40 000 caracteres por llamada, cortados en un salto de
  renglón, 4 partes como mucho, cada una en su paso y sin lectura web. Va con los datos de eventos `application/ld+json` que muchas
  carteleras traen. Es más barato y completo que la lectura web. Un listado de más de 4 partes lo avisa.
- **Solo enlaces a fichas** (hay fichas del mismo sitio y el texto casi no dice horas). Se le pide abrir **hasta 5 fichas** con la lectura
  web, acotada al sitio y con las direcciones en el encargo. Las categorías, la paginación y los enlaces a otros sitios no cuentan.
- **Se arma con JavaScript** (menos de 400 caracteres y ninguna ficha). **No se paga la lectura.** Queda «Leída sin eventos: <url> (la página
  se arma con JavaScript o no trae texto)» y no cuenta como leída.
- **El servidor no la pudo bajar.** La abre la API como antes.

**Lo que queda dicho.** Toda agenda en HTML que se lee y no trae eventos deja «Leída sin eventos: <url>» en `resumen.avisos`, con el porqué
si se sabe: «la lectura web no la abrió» (la API devolvió un error de lectura, que `claude.ts` ahora cuenta como `lecturasFallidas`) o «sus
fichas no traían eventos de estas fechas». Lo mismo una página índice que la API leyó sin traer eventos ni agendas. `resumen.avisos`
guarda 12 (antes 8). Los PDF siguen igual: una semana sin eventos en un PDF es normal y no se avisa.

## Decisiones por confirmar

1. **El latido se enciende con la migración** si existe pg_cron (en producción, sí), con el secreto y la dirección que ya están en Vault
   para los avisos. Si se prefiere encenderlo a mano, como los avisos en la 120, basta `select cron.unschedule('rutinas-latido');` al aplicar
   y programarlo después.
2. **Cada minuto, solo con corridas vivas**: sin ellas, el latido es un `select count(*)` sin red. Deja una fila por minuto en
   `cron.job_run_details`, como el de los avisos cada 5.
3. **Ya no hay cadena por la red:** una corrida avanza dentro de la misma función mientras quepa el paso más largo y, si no, al minuto
   siguiente. Una de lugares (pasos de unos 40 s) da unos 3 pasos por llamada.
4. **Propuesta de tipo `cartel`** (no `datos` dentro de un evento propuesto): la bandeja, «Aceptar todas» y los motivos funcionan igual. Pide
   ampliar el `check` de `propuestas.tipo`, lo mismo que el de `rutinas_corridas.tipo`.
5. **Un lugar sin ninguna red sí se busca** (prensa, agendas); solo se aparta el que tiene Instagram o Facebook y nada más.
6. **`solo_redes` guarda el nombre del lugar y sus redes** (fichas públicas, no personas) para que el gestor los pase a la rutina de redes.
   Nunca nombres de personas.
7. **La tarjeta «Carteles» va al final del panel**, después de Consultas y Gasto. Así no se mueve la rejilla firmada de tres en tres; a
   1048 o más queda sola en su renglón.
8. **La imagen no se muestra en la bandeja** (solo el enlace «ver el cartel»): mostrar una imagen ajena en Administración pediría bajarla o
   abrir la política de imágenes. Si el founder la quiere ver ahí, es otra pieza con su prototipo.
9. **Agendas en HTML: texto propio en vez de lectura web.** Cambia también las agendas de San Luis y Oaxaca que son HTML, y debería costar
   menos (40 000 caracteres son unos 12 000 tokens frente a 30 000 de la lectura). Hay que confirmarlo con la primera corrida real de CDMX.

## Evidencia (árbol sin `.env`, sin red real)

- `npm run lint` (0 errores; el aviso viejo de `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test`: **273 archivos, 4 539
  pruebas, todas bien**. Las nuevas o cambiadas:
  - `cadena.test.ts`, 5:
    - reproduce el 508 de producción;
    - con el arreglo, una sola petición y la corrida termina;
    - el latido retoma lo que no cabe;
    - una petición perdida se rescata;
    - el motor no pierde corridas.
  - `atender.test.ts`, 5: pasos dentro de la misma función, el tope de 12 y `?esperar=1` con un solo paso.
  - `disparar.test.ts`: un 508 no se reintenta ni es fallo.
  - `carteles.test.ts`, 9:
    - qué eventos toma (fuera: con cartel, pasados, de otra ciudad, cancelados, ocultos y borradores);
    - lo solo-Instagram aparte con su aviso;
    - lo que se le pide a la API (enum de ids, Instagram y Facebook bloqueados);
    - dos propuestas con su contrato exacto y sus descartes por motivo;
    - no repite;
    - el tope sin llamar;
    - sin llave;
    - sin eventos, gratis;
    - agrupar y partir;
    - la hoja y la tarjeta de la bandeja.
  - `aceptarCartel.test.ts`, 4, con Storage falso:
    - sube un JPEG de 2000 de lado a la ruta de los carteles y lo pone en el evento con sus colores;
    - los cinco «no»;
    - la carrera que no pisa y borra lo que sobra;
    - Storage que falla.
  - `imagenWeb.test.ts`, 4: direcciones internas, redirecciones, SVG y tope.
  - `acciones.cartel.test.ts`, 2: poner, luego marcar y ligar; si no se pudo poner, no se acepta.
  - `agendasHtml.test.ts`, 5, con HTML de ejemplo de las tres formas y una API falsa:
    - el listado largo va en 2 partes con su texto;
    - la de enlaces abre 5 fichas;
    - la de JavaScript no llama;
    - lo vacío queda dicho;
    - 3 propuestas.
  - `agendas.test.ts`: la agenda HTML de la UASLP ahora también se intenta bajar desde el servidor.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **105 migraciones, 2 273 comprobaciones, 0 fallaron**. El banco
  nuevo `rutinas-latido-carteles.test.mjs` trae pg_net y Vault de mentira, creados dentro de la transacción. Prueba que:
  - nadie más corre el latido;
  - sin corridas vivas no llama;
  - sin Vault ni pg_net no llama ni falla;
  - con Vault vacío no llama;
  - una pendiente hace una llamada a la ruta del motor con el secreto de los avisos;
  - lo ocupado no cuenta, y sí cuentan lo vencido, lo vacío y lo ilegible;
  - cinco vivas hacen tres llamadas;
  - `rutinas_url` manda;
  - una dirección ajena no recibe nada;
  - los tipos nuevos se aceptan y uno inventado sigue fuera;
  - aceptar un cartel y ligarlo con la llave de servicio funciona;
  - `panel_ciudades` los cuenta.
- `npm run inventario`: sin novedades.
- `npm run medir`: 52 pantallas × 4 anchos, **sin novedades**, tras anotar los presupuestos (`--aceptar`). Solo cambian s35a (de 62 a 69
  nodos a 390) y s35b (de 86 a 93), por la tarjeta nueva. Con el teclado, el tope de la hoja a la vista y «Cancelar» · «Correr» sobre él.
- `npm run test:componentes`: **698 de 698**.

## Capturas (390×844 a 2×, respaldo local, Chrome real, toques por coordenadas)

`scripts/ops/auditoria-ui/capturar-carteles.mjs` arranca el respaldo de siempre con una corrida de carteles terminada y sus dos propuestas
añadidas en memoria (el fixture no cambia, así `medir` ve lo mismo), compila la app contra él y recorre todo con toques reales. Las cinco,
abiertas y miradas en grande antes y después de comprimirlas, sin errores de página ni desplazamiento a lo ancho:

- `01-panel-tarjeta-carteles.png`: el panel de San Luis abajo. Artistas, Consultas y Gasto como siempre; al final, la tarjeta «Carteles» con
  su icono, el número 2, «eventos próximos sin cartel», bajo la raya «Terminada · Hoy, 9:23 am · 2 propuestos · 0,31 USD» y el botón
  «Buscar carteles» en blanco (no violeta).
- `02-hoja-buscar-carteles.png`: la hoja «Buscar carteles en San Luis Potosí». Dice qué hace y que Instagram y Facebook se revisan a mano;
  «Fuentes, en este orden» con sus dos renglones; el tope «2,00» con su ✕; «Se estima entre 0,50 y 2 USD…» con el crédito; «Cancelar» y
  «Correr» abajo.
- `03-panel-carteles-pendiente.png`: tras «Correr», la tarjeta «Carteles» con «Pendiente · Espera su turno · tope 2,00 USD» y «Cancelar la
  búsqueda».
- `04-bandeja-carteles.png`: la bandeja de San Luis, bloque «Buscar carteles · Hoy, 9:20 am · 2 propuestos» con «Aceptar las 2». En
  «Búsqueda web» y «Sitio del lugar», una tarjeta cada una con el icono de cartel, «Cartel · propuesto por la rutina», el título del evento,
  «24 oct, 8:00 pm · Foro del Patio · ver el cartel · fuente: forodelpatio.example · leída el 22 oct», y Rechazar y Aceptar.
- `05-rechazar-cartel.png`: la hoja «¿Por qué la rechazas?» con «El cartel de «Noche de jazz en el patio». La rutina aprende…» y los
  cuatro motivos.

## Lo que no se hizo

- **Ninguna llamada real** a la API, a Storage ni a producción: la primera corrida real es del gestor. La llave de la API está bloqueada hoy
  por el límite de gasto de la consola.
- **No se sabe cuál de las cuatro causas** vació las agendas de CDMX en producción. El arreglo cubre las cuatro y deja el porqué en
  `avisos`; la siguiente corrida de CDMX lo dirá.
- **Una página que se arma con JavaScript no se lee:** haría falta un navegador en el servidor, y eso es otra pieza.
- **Un dominio que resuelve a una IP interna** (DNS rebinding) no se descarta al bajar una imagen: solo se miran el nombre y el esquema. El
  riesgo es bajo en Vercel; si se quiere cerrar, hay que resolver el nombre antes de pedir.
- **Los carteles de Instagram** siguen siendo de la rutina de redes desde el Chrome del founder: `solo_redes` le da la lista.

## Al aplicar (gestor)

1. Unir la rama y aplicar `20261022120000_rutinas_latido_carteles.sql`. Comprobar `select jobname, schedule, active from cron.job where
   jobname = 'rutinas-latido';` (cada minuto, activo).
2. **Vault:** si `avisos_url` es la dirección estable de los avisos (`https://somosnosotros.org/api/avisos-pendientes`), no hace falta nada.
   Si no, `select vault.create_secret('https://somosnosotros.org/api/rutinas/correr', 'rutinas_url');`. El secreto es `avisos_cron_secret`
   (el mismo CRON_SECRET). No registrar valores.
3. **Primera prueba del latido:** crear una corrida con «Buscar carteles» en San Luis (tope 2,00). En `net._http_response` y en los registros
   de Vercel deben verse las llamadas cada minuto mientras corre y ninguna después. Ya no debe aparecer «respondió 508».
4. **Primera corrida real de carteles:** San Luis, tope 2,00. Mirar:
   - `resumen.solo_redes` y `avisos`;
   - que las propuestas abran con «ver el cartel»;
   - aceptar una: el evento con su cartel en Storage y sus colores.
5. **CDMX:** volver a correr «Buscar agendas y eventos» con el tope de siempre y leer `resumen.avisos` («Leída sin eventos: …» con su porqué)
   y `por_fuente`.
