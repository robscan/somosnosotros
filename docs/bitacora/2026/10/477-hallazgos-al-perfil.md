# 477 · Lo que descubren las rutinas sobre un artista llega a su perfil: «Reconocimientos y obra», su presentación, su año y «Completar ficha» (OL-445)

**Fecha:** 2026-10-22. **Rama:** `hallazgos-al-perfil`, desde `origin/main` (`bd6e6f7d`). **Operador:** agente de la pieza (Claude Opus 5.5) para
el Gestor VII, sin otros agentes. **Migración:** `20261022130000_artistas_hitos.sql` (solo añade). **Variables de entorno:** ninguna.
**Pantallas:** la ficha pública del artista (sección nueva plegada), la imagen de «Tu año» del artista (una línea), la «Presentación» en PDF (una
sección) y la ficha del Showcase (un grupo nuevo y dos textos). **Estado:** lista para la revisión del gestor.

## El pedido

Founder, 22 de octubre: «que lo que descubramos de artistas vaya para sus perfiles personales porfas que se use esa info para completar su
información y curriculum. Además de su año». Gobierno ya decidido: todo lo que escribe la rutina nace propuesta y solo se publica cuando una
persona de la administración lo acepta.

## Qué cambió

**1. El hito público (la base).** Tabla nueva `artistas_hitos`: una fila por evidencia **aceptada** del Showcase que no sea de «redes» (premio,
beca, obra, presentación, prensa), con lo que se puede decir en público: tipo, título, enlace, fuente, fecha. No lleva la señal, el estado, quién
la leyó ni quién la decidió; las notas y los puntajes del consejo siguen en sus tablas, solo de la administración. **No es una vista** sobre
`showcase_evidencias`: esa tabla sigue cerrada al público tal como la dejó OL-426. La mantiene **un disparador** en `showcase_evidencias`
(`showcase_evidencias_hito`, `security definer`): aceptar (desde la ficha del Showcase, desde el panel «Por aprobar» que vendrá, o añadirla a
mano, que nace aceptada) publica o corrige el hito; rechazar, deshacer (volver a propuesta) o cambiarla a «redes» lo retira; borrar la evidencia
lo borra (cascada). Así cualquier camino de aceptación futuro publica sin tocar código. **Lectura pública con la regla de la ficha**: la política
mira `artistas`, así que el hito de un artista oculto solo lo ven quien lo gestiona y la administración. **Nadie escribe hitos a mano**
(ni la administración ni el artista: sin permiso de escritura salvo la llave de servicio). **Relleno**: lo aceptado antes de hoy se publica al
aplicar la migración (ver decisiones).

**2. Las clases y el orden** (`src/lib/hitos.ts`, puro). Cada hito tiene una clase más fina que su tipo, por lo que dice su título: premio, beca,
residencia, selección oficial, disco (disco, álbum, EP, LP, vinilo; un sencillo no), libro (libro, poemario, novela, antología…), exposición,
obra publicada, presentación, prensa. En ese orden van dentro de cada año: **premios y becas primero, luego la obra, luego presentaciones y
prensa**. Por año, de lo más reciente a lo más viejo; sin fecha al final («Sin fecha»). El resumen en una frase: «2 premios · 1 beca · 1 obra
publicada · 2 presentaciones · 1 más» (hasta cuatro clases; tres en «Tu año», que es un renglón).

**3. El perfil público** (`src/app/artistas/[id]/SeccionHitos.tsx`, en la ficha bajo «Trayectoria», en su propio `<Suspense>`). «Reconocimientos
y obra», plegado como la Trayectoria (`ui/Plegado`): el renglón dice la frase de arriba; al abrir, por año, cada hito como renglón de dato
(`ui/Renglon`, piel `dato`) con su icono (estrella el premio, bandera beca/residencia/selección, nota el disco, libro, pincel la obra, boleto la
presentación, documento la prensa), su título, «Premio · cultura-estatal.example · 18 may» y el icono de enlace; **el renglón lleva a la fuente**
con `EnlaceExterno` (el aviso de salida de siempre). Sin hitos no existe. No es superficie nueva grande: es la pieza de la Trayectoria con otros
datos, por eso la construí en vez de dejarla como propuesta.

**4. La «Presentación» en PDF** (`src/lib/documentos.ts`, `bloquesHitos`; `cargarDocumento.ts` los lee). Sección «Reconocimientos y obra · 2
premios · …» **tras la Reseña y antes de la Trayectoria** (es lo primero que lee quien programa), por año, con los bloques que ya dibuja la
plantilla (`rotulo`, `anio`, `fila`): a la izquierda qué es («Premio», «Disco»), el título y, en gris, la fuente y el día. La plantilla no cambió.
En el PDF el enlace no se toca (es imagen): la fuente va escrita; en pantalla (el perfil) va enlazada. Un artista con hitos y sin fechas pasadas
también tiene presentación desde la ruta (`/api/documento`); el botón, ver «lo que no se hizo».

**5. «Tu año»** (`src/lib/tuAnio.ts`, `cargarTuAnio.ts`, la plantilla `carteles/plantillas/tuAnio.tsx`). El del artista cuenta sus hitos **con
fecha de este año** en una línea con la forma de «lo más»: «Reconocimientos y obra: **1 premio · 1 beca · 1 obra publicada · 3 más**», antes de
«Con quien más». Para que todo siga cabiendo en 1080×1350 sin tocar la composición firmada, con esa línea el número protagonista empieza en 360
en vez de 440 y «lo más» se acerca (16 en vez de 48). El texto alternativo la dice. Sin hitos del año, el resumen ni siquiera lleva la clave (su
versión y su imagen siguen iguales a las de antes). La persona y el lugar no cambian.

**6. «Completar ficha»** en la ficha del Showcase (`src/lib/completarFicha.ts` puro; `CompletarFicha.tsx`; acciones `completarFicha` y
`descartarSugerencia`). **Cómo se ve:** un grupo nuevo bajo «Por revisar», con su cuenta en violeta y una nota («Lo que trajeron las rutinas y su
ficha no tiene. Completar no cambia lo que ya puso nadie.»), y una tarjeta por dato con la piel de «Por revisar»: arriba «Sobre · falta en su
ficha» (o Disciplina, Qué hace, Enlace) con su icono; el valor (el texto entre comillas; la red como enlace, «Spotify», con la dirección en la
línea de abajo); «De: Propuesta aceptada · Catálogo de bandas del estado» enlazado a la fuente; Descartar a la izquierda, Completar a la derecha.
Al decidir queda la línea de lo hecho («Completaste sobre · ya está en su perfil»; «Descartaste Instagram» con Deshacer). **De dónde sale:** la
propuesta de artista aceptada de la que nació la ficha (`propuestas.datos`: disciplina, detalle, redes y `obra`, la frase que la rutina leyó de
la fuente y no se usaba) y las evidencias de obra aceptadas cuyo enlace es la página del artista en una plataforma (Spotify, Apple Music, Deezer
y Tidal con `/artist/`; el subdominio de Bandcamp; SoundCloud, Mixcloud y Audiomack por su primer tramo; un canal de YouTube). Instagram y Facebook
**no** salen de una evidencia (el enlace de un premio suele ser del festival). **Reglas:** solo lo que falta (disciplina «por completar», qué
hace vacío, sin «Sobre», una red que no tiene; de una red que ya tiene, nada; con 8 enlaces, ningún enlace más); aceptar **vuelve a leer todo en
el servidor** (la pantalla solo manda la clave), escribe solo ese campo y exige que la ficha no haya cambiado desde la lectura (`actualizado_en`);
**con la ficha reclamada no cambia nada**: la nota dice «Su ficha está reclamada: desde aquí no se cambia nada. Sugiéreselo a quien la lleva.» y
cada tarjeta «No se cambia: ficha reclamada», solo con Descartar. Lo descartado no vuelve (`showcase_candidatos.completar_descartadas`, columna
nueva). Al completar se vuelve a leer su ficha pública.

**7. Lo que dice la administración.** «Por revisar»: «Lo que trajo la rutina. Lo que aceptas cuenta para la rúbrica y se publica en su
perfil.» y, al aceptar, «Aceptaste … · ya está en su perfil» (no en redes). La ⓘ: la tercera regla de gobierno pasa de «Nada se publica sobre un
artista sin su consentimiento: ninguna ficha pública lee el showcase» a «Lo que aceptas (premios, becas, obra, presentaciones y prensa) se
publica en su perfil como «Reconocimientos y obra»; lo propuesto, lo rechazado, los puntajes y las notas nunca salen de aquí.»; la entrada de
Evidencias dice también que se publica en su perfil, su presentación y su año, y que rechazar o deshacer la retira. Aceptar y añadir evidencia
vuelven a leer la ficha pública del artista.

## Decisiones por confirmar (gestor o founder)

1. **Relleno de lo ya aceptado.** La migración publica lo aceptado antes de hoy (hoy unas pocas, más lo que se acepte de las 26+ propuestas y las
   34 investigaciones en curso). Se aceptó cuando la regla era «nada se publica»; el pedido del founder lo cubre, pero si prefiere que solo cuente
   lo aceptado desde hoy, se quita el `insert … select` del final de la migración antes de aplicarla.
2. **El artista no puede ocultar un hito suyo.** Hoy solo la administración lo retira (rechazando o deshaciendo la evidencia). Con la ficha
   reclamada, quizá el artista debería poder ocultar uno desde Editar (una columna `oculto` y su permiso): pieza aparte si el founder lo quiere.
3. **«Presentaciones fuera de San Luis».** La evidencia no guarda dónde fue, así que la frase dice «2 presentaciones», no «fuera de San Luis». La
   rutina ya busca sobre todo fuera de su ciudad; si se quiere la precisión, la rutina tendría que guardar la ciudad (toca `src/lib/rutinas/*`,
   fuera de esta pieza).
4. **Dónde va en el PDF:** tras la Reseña. Si el founder la prefiere tras la Trayectoria, es mover una línea.
5. **«Sobre» desde `datos.obra`.** La frase de la rutina está escrita en tercera persona sobre su obra; sirve de «Sobre» mientras el artista no
   escriba el suyo, pero el founder puede preferir no proponerla.

## Evidencia (árbol sin `.env`; nunca producción)

- `npm run lint`: 0 errores (1 aviso viejo en `VisorImagen.componentes.test.mjs`, no de esta pieza). `npm run typecheck`: limpio.
- `npm test`: **271 archivos, 4 537 pruebas, 0 fallaron**. Nuevas: `src/lib/hitos.test.ts` (clases, orden por año con premios primero, sin fecha
  al final, resumen con su tope, detalle; el PDF suma la sección tras la reseña; «Tu año» cuenta solo los del año y la persona no),
  `src/lib/completarFicha.test.ts` (solo lo que falta; nada de lo que ya tiene; 8 enlaces; descartadas; páginas de plataforma; aceptar nunca
  pisa; reclamada no cambia), `src/app/admin/showcase/completar.test.ts` (la acción relee y escribe solo el campo, con `actualizado_en`; reclamada
  no escribe; sin permiso no escribe; descartar y deshacer; aceptar una evidencia revalida `/artistas/<slug>`) y un caso más en
  `src/lib/carteles/tuAnio.test.ts` (el peor caso con la línea de hitos: nombre a dos renglones, tres cifras, dos secundarios y «lo más»: nada
  fuera del lienzo ni encimado). `src/app/artistas/[id]/page.test.ts`: cuatro límites de `<Suspense>` (antes tres).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **105 migraciones, 2 267 pruebas, 0 fallaron**. Banco nuevo
  `supabase/tests/pg/artistas-hitos.test.mjs`: lo propuesto no se ve; aceptar publica y un visitante solo ve lo aceptado, nunca una de redes; el
  hito no tiene señal, estado ni quién; la evidencia sigue cerrada al visitante; corregir corrige; rechazar, deshacer y pasar a redes retiran;
  aceptar dos veces deja uno; añadida a mano se publica; borrar la evidencia borra el hito; los hitos de un artista oculto no se ven en público
  (la administración sí); nadie escribe, cambia ni borra hitos a mano, ni la administración; el disparador no se llama desde fuera; las
  descartadas solo las ve la administración, hasta 200. Limpia sus filas al final (el banco del Showcase cuenta todas las de sus tablas).
- `npm run test:componentes`: **703 pruebas, 0 fallaron**, con el nuevo `src/app/admin/showcase/[artista]/CompletarFicha.componentes.test.mjs`
  (Chrome real, toques reales): las tarjetas (solo lo que falta, el valor, de dónde sale, los enlaces), Completar y Descartar con su línea y
  Deshacer, el error en su tarjeta, la ficha reclamada sin Completar, y «Por revisar» que dice que se publica.
- `npm run inventario`: sin novedades. `npm run medir`: 52 pantallas × 4 anchos, sin novedades (el fixture no tiene hitos: ninguna pantalla
  medida cambia).
- La app compilada contra el respaldo local (`scripts/ops/auditoria-ui/capturar-hitos-al-perfil.mjs`, nuevo; Chrome real, 390×844 a 2×,
  toques reales; los hitos y las propuestas aceptadas se siembran en memoria en el arranque, el fixture no cambia): sin errores de página ni de
  consola, sin desborde horizontal (ancho 390 = ventana).

### Capturas (`docs/rediseno/capturas-477/`, abiertas y revisadas)

- `01-perfil-reconocimientos-plegado.png`: la ficha de Feleal bajo «Publicar una fecha»: «Trayectoria · 3 fechas · 1 cancelado · 2 lugares» y,
  debajo, «Reconocimientos y obra» plegado con «2 premios · 1 beca · 1 obra publicada · 2 presentaciones · 1 más» y su caret; luego Novedades.
- `02-perfil-reconocimientos-abierto.png`: abierto con un toque: «2026» con el premio (estrella), la beca (bandera), el sencillo (Obra, pincel),
  dos presentaciones (boleto) y la entrevista (Prensa, documento), y «2025» con la mención; cada uno con «Tipo · dominio · día» y el icono de
  enlace a la derecha; títulos en el gris de lo pasado, como la Trayectoria.
- `03-perfil-hito-aviso-salida.png`: tocar el premio abre el aviso de salida «Vas a salir de Somos Nosotrxs · cultura-estatal.example» con
  Continuar y Quedarme aquí.
- `04-perfil-trayectoria-botones.png`: la Trayectoria abierta termina con «Tu año» y «Presentación» como siempre; debajo, «Reconocimientos y obra».
- `05-tu-anio-con-hitos.png`: la vista previa de «Tu 2026» de Feleal: «3 fechas en 2 lugares», 2 lugares · 4 fueron, la línea
  «Reconocimientos y obra: 1 premio · 1 beca · 1 obra publicada · 3 más» y «Con quien más: Abril Merlot · 2 veces»; el pie con el SN y el dominio.
- `06-tu-anio-imagen-1080.jpg`: la imagen a 1080×1350 (la que se comparte): todo dentro del lienzo, el número a 360.
- `07-presentacion-pdf-pagina-1.png`: la página 1 del PDF (carta, `pdftoppm` a 110 ppp): la cabecera, «RECONOCIMIENTOS Y OBRA · 2 PREMIOS · 1
  BECA · 1 OBRA PUBLICADA · 2 PRESENTACIONES · 1 MÁS» en violeta, 2026 y 2025 con «Premio», «Beca», «Obra», «Presentación», «Prensa» a la
  izquierda y la fuente y el día en gris; luego «TRAYECTORIA · 3 FECHAS · 1 CANCELADO · 2 LUGARES». (Sin reseña: Feleal no tiene descripción ni
  redes en el respaldo.)
- `08-showcase-completar-ficha.png`: la ficha del Showcase de 0Backside0 (sin reclamar): «COMPLETAR FICHA 4», la nota y las tarjetas de «Sobre»
  (el texto entre comillas) y de Spotify (el nombre de la red como enlace, la dirección abajo) con «De: Propuesta aceptada · Catálogo de bandas
  del estado»; Descartar · Completar.
- `09-showcase-completar-hecho.png`: tras tocar Completar en «Sobre» y Descartar en Instagram: «Completaste sobre · ya está en su perfil»,
  «Descartaste Instagram · Deshacer» y la cuenta en 2; la de Bandcamp dice «De: Evidencia aceptada · Segundo disco en Bandcamp».
- `10-showcase-aceptar-se-publica.png`: la ficha de Feleal: «POR REVISAR 1», la nota nueva y, tras tocar Aceptar, «Aceptaste Mención en un
  concurso estatal de acordeón, 2025 · ya está en su perfil» con Deshacer; debajo, «Completar ficha» con la nota de reclamada.
- `11-showcase-completar-reclamada.png`: la ficha reclamada: cada tarjeta solo con Descartar y «No se cambia: ficha reclamada».

## Lo que no se hizo

- **El botón de la «Presentación» para un artista con hitos y sin fechas pasadas.** El PDF ya sale por su ruta, pero el botón vive en la
  Trayectoria, que sin fechas pasadas no existe. Ponerlo en «Reconocimientos y obra» es cambiar dónde va un botón firmado («O junto a "Tu año"»):
  lo decide el founder.
- **«Tu año» sin fechas.** Sigue saliendo solo con alguna fecha pasada del año; un artista con dos premios y ninguna fecha no tiene imagen.
- **El panel «Por aprobar»**: no existe aún; cuando llegue, publicará solo con aceptar (lo hace el disparador).
- **La ficha pública del Showcase** (otro agente prepara su prototipo): no se tocó más que «Por revisar», «Completar ficha» y la ⓘ.
- `src/lib/rutinas/*`, `src/app/api/rutinas/*`, `src/app/admin/ciudades/*`, `src/components/inicio/*` y `src/lib/ahora.ts`: sin tocar.
- `scripts/ops/auditoria-ui/README.md` no lista el script de capturas nuevo (lo dice su cabecera), para no chocar con otras piezas.
