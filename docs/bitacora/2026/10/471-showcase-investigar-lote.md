# 471 · «Investigar» a varios desde la lista del Showcase (OL-439)

**Fecha:** 2026-10-21. **Rama:** `showcase-investigar-lote`, desde `origin/main` (`cacfd6c5`). **Operador:** agente de la pieza (Claude Opus 5.5) para el
Gestor VII, sin otros agentes. **Migración:** ninguna (la orden vive en `rutinas_corridas.parametros.lote`). **Variables de entorno:** ninguna.
**Estado:** lista para la revisión del gestor.

## El pedido

El founder quiere «saber si podemos correr investigación también desde algún botón para showcase»: hoy «Investigar» (OL-430) solo existe en la
ficha de cada artista. El gestor encargó detonarlo desde la lista para varios a la vez: a quiénes, el tope por artista y el total antes de
confirmar; cómo va mientras corre, en la lista y en cada tarjeta; cuántas evidencias deja por revisar cada uno; y un límite de 60 por orden.

## Qué cambió

**El renglón «Investigar» de la lista** (`InvestigarLote.tsx`, nuevo). Es el mismo renglón de la ficha (icono de lupa, «Investigar», una línea y el
chevrón; la misma barra), entre la línea de cifras y las tarjetas, en las dos vistas. Lo que dice:

- sin orden reciente: a cuántos propone, «4 candidatos por investigar» (si nadie, lo que hace: «Prensa, premios, festivales y obra publicada»);
- con una orden en curso: «Investigando a 4 · 2 terminados · 0,90 USD» (y «· 1 no se pudo» si alguna falló) con su barra, el promedio del avance
  de cada corrida (por empezar 0, corriendo lo que diga su resumen, acabada 1);
- con la orden acabada: «4 investigados hoy · 6 evidencias por revisar · 1,61 USD» (o «todo revisado»), mientras deje algo por revisar o el día
  que acabó; después vuelve a proponer.

**La hoja «Investigar a varios».** Dice qué hace (cuatro búsquedas por artista, sin redes; lo que encuentre llega a «Por revisar» de su ficha y
nada cuenta hasta aceptarlo); si hay una orden en curso, «Ahora: Investigando a 4 · …». **A quiénes**, dos opciones como las de las hojas de Estado
y Orden:

- **Candidatos por investigar** (por omisión): los marcados —con fila en `showcase_candidatos` y estado candidato o revisado— sin una
  investigación en curso ni terminada en los últimos 30 días; una que falló o se canceló se puede repetir. «4 artistas · candidatos o revisados,
  sin investigar en 30 días». No mira el filtro de la lista (lo que pidió el gestor).
- **Los que se ven en la lista**: lo filtrado ahora (búsqueda, disciplina y estado), sin descartados y sin los investigados en 30 días, y dice
  cuántos quedan fuera: «1 artista con este filtro · sin 2 investigados en 30 días».

Luego el **tope por artista** (1,00 USD, con su ✕; «Cada uno cuesta unos 0,40 USD (entre 0,20 y 0,60). Al llegar al tope se detiene y guarda lo
encontrado.») y el **total**: «4 artistas · hasta 4,00 USD · crédito 192,29», que sigue al tope mientras se escribe. El botón dice a cuántos:
«Investigar a los 4» (o «Investigar a 1 artista»). Nada apagado:

- **más de 60**: «Son 692: elige hasta 60 o filtra por disciplina.», sin tope ni total, y el botón principal es «Filtrar por disciplina», que
  cierra la hoja y deja los chips de disciplina a la vista y con el foco;
- **nadie**: «Nadie por investigar con esta opción.» y solo «Cerrar»;
- **pasa del crédito** (tope × artistas > lo que queda): «Pasa del crédito que queda (192,29 USD): baja el tope o elige a menos.», con el foco en
  el tope, y no se manda;
- un tope que no vale lo dice el campo (lo mismo que la ficha) y no se manda.

**La acción** (`acciones.ts`). `investigarVarios(ids, tope)`: hasta 60 ids válidos (sin repetir), el tope de siempre (`leerTope`), solo la
administración; vuelve a mirar la base y deja fuera a los **descartados** y a quien ya tiene una investigación **en curso** (los cuenta en
`omitidas`). La creación es una **función compartida** con «Investigar» de la ficha (`crearInvestigaciones`, sin duplicar lógica): lee las
corridas en curso de cualquier rutina, salta a los artistas que ya tienen una, inserta las demás **en un solo insert** (`tipo = 'showcase'`, sin
ciudad, su tope, `creado_por`, `parametros: { artista_id, lote }`; la de la ficha, sin `lote`) y pide el primer paso **una sola vez y solo si la
cadena del motor no está viva** (si otra corrida avanza, el motor llegará a las nuevas: pendientes primero, una por llamada). La de la ficha dice
como antes «Ya hay una investigación en curso de este artista.».

**Cada tarjeta** (`VistaCandidatos.tsx`): bajo la píldora de actividad, una línea con la lupa: «Investigando · 2 de 4 búsquedas» (y «· 1 evidencia
por revisar» si ya trajo algo: cada búsqueda deja lo suyo), «Investigando · por empezar», «Investigado hoy · 3 evidencias por revisar»,
«Investigado el 3 oct · todo revisado», «Investigado hoy · sin evidencias nuevas», «No se pudo investigar hoy» o, sin investigación, solo
«1 evidencia por revisar» si las hay. **Con algo por revisar va en el violeta de las acciones** (icono incluido): es a quién entrar. La tabla no
cambia.

**La recarga suave.** Mientras alguna investigación está en curso, la lista se vuelve a leer (`router.refresh()`, sin apilar historial) cada
20 s si la pantalla está a la vista y la hoja cerrada, y al volver a la pantalla. Sin nada en curso no se recarga.

**Cuando la cadena se para** (`rescate.ts`, sin tocarlo). En una orden de 26, las que esperan su turno cumplen la regla de «varada» de
`rescate.ts` (pendiente hace más de 2 minutos): rescatarlas una por una, como hacen Ciudades y Corridas, abriría hasta tres cadenas paralelas por
cada carga de la pantalla. En el Showcase la regla es otra (`cadenaParada`, en `src/lib/showcase.ts`, sobre `corridasVaradas`): si hay corridas
en curso de cualquier rutina y **todas** están varadas, se pide **un** paso después de responder; mientras una avance, se trabaje o se haya pedido
hace menos de 2 minutos, nada. La usan la lista (`cargarInvestigaciones`) y la ficha (`cargarInvestigacion`, que antes rescataba su corrida sola).

**Lo que leen** (`consultas.ts`). `cargarInvestigaciones`: las corridas `showcase` de los últimos 90 días (con su artista y su lote), las evidencias
de la rutina por revisar contadas por artista, las corridas en curso (para el rescate) y el crédito; si falla, la lista sigue sin el renglón ni
las líneas. El crédito sale de una función compartida con la ficha (`cargarCredito`). `Candidato` lleva `marcado` (tiene fila en el showcase).

**Ayuda y manual** (`ayuda.ts`): entrada «Investigar a varios» en el bloque «Estado y evidencias» del manual.

**Lo que no toqué:** `src/lib/rutinas/motor.ts`, `src/lib/rutinas/showcase.ts`, `src/lib/rutinas/rescate.ts`, `src/app/admin/ciudades/*` (OL-438
trabaja ahí) ni `src/lib/propuestas.ts`. Sin migración.

## Decisiones por confirmar (founder o gestor)

1. **«Marcados» = con fila en `showcase_candidatos`** y estado candidato o revisado. Una fila también nace al fijar un puntaje o escribir notas de
   un candidato implícito: ese artista entra a «Candidatos por investigar». No pude contar los 26 de producción (sin leerla): si no son filas del
   showcase, la opción por omisión dirá otro número.
2. **Un renglón, no un botón de contorno**: el mismo de la ficha (firmado en OL-425), arriba, que además lleva la línea de la orden y su barra. Si se
   prefiere el botón junto a «Exportar para el consejo», la hoja no cambia.
3. **«Los que se ven» también salta a los investigados en 30 días** (y lo dice), no solo a los descartados: para no pagar dos veces lo mismo.
4. **Hasta 60 cabe** («elige hasta 60» en vez de «menos de 60»).
5. **El crédito frena por el tope**, no por el costo estimado: 26 × 1,00 = 26,00 contra lo que queda.
6. **La orden acabada se dice** mientras deje evidencias por revisar o el día que acabó.
7. **El primer paso solo si la cadena no está viva** (en la ficha también): evita una segunda cadena en paralelo; si en ese mismo instante la cadena
   acabara, la orden espera al rescate de la lista (unos 2 minutos con la lista abierta) o al cron.
8. **Ninguna orden se puede detener desde aquí**: las pendientes se cancelan una por una en Corridas.

## Riesgo para el gestor: Ciudades y Corridas abren cadenas paralelas durante una orden

`pedirPasoSiHayVaradas` (Ciudades, el panel de cada ciudad y Corridas) usa `rescatarVaradas`, que pide un paso por cada corrida varada, hasta tres
por carga. Durante una orden, las pendientes de más de 2 minutos cuentan como varadas: **cada carga de Ciudades o Corridas abre hasta tres cadenas
más** y la orden corre en paralelo. No cuesta de más (cada corrida tiene su tope y dos cadenas nunca corren la misma), pero si la API se satura,
la búsqueda de ese turno se pierde («La API está saturada»: el tema se consume y la corrida sigue) y ese artista puede terminar «sin evidencias
nuevas». Propuesta para después de OL-438, en `rescate.ts`: que `rescatarVaradas` pida un solo paso y solo si `cadenaParada` (todas varadas),
que es lo que ya hace el Showcase. Mientras tanto, durante la primera orden conviene no recargar Ciudades ni Corridas.

## Cómo corre una orden (para leer la línea)

El motor toma primero las pendientes: las 26 empiezan antes de que alguna acabe (primera búsqueda de cada una, luego la segunda…). **La barra
avanza desde el principio, pero «terminados» se queda en 0 buena parte del tiempo** y luego sube de golpe; las evidencias sí llegan desde la
primera búsqueda y las tarjetas lo dicen. Unos 104 pasos para 26 (cuatro búsquedas cada uno, 30 a 60 s por paso): entre una y dos horas. La recarga
de 20 s lee la lista entera de Supabase (unas doce consultas) solo con la pantalla a la vista.

## Evidencia

- `npm run lint`: 0 errores (un aviso que ya estaba, en `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: sin errores.
- `npm test`: **4 367 unitarias**, 0 fallaron (14 nuevas: 9 en `src/lib/showcase.test.ts` —la selección (candidatos sin investigación reciente,
  los que se ven, descartados fuera), «investigado hace poco», el límite de 60, el total, la línea de la orden en curso y acabada, la línea de la
  tarjeta, `cadenaParada`, `marcado`— y 5 en `acciones.test.ts` —una corrida por artista con el mismo lote, descartados y en curso fuera, sin paso
  si la cadena vive y con paso si se paró, hasta 60, nadie, tope, sin ser admin—; la de la ficha, ajustada al insert en lista).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **2 232 pruebas**, 0 fallaron (banco nuevo
  `supabase/tests/pg/investigar-lote.test.mjs`, sin migración: 60 corridas `showcase` sin ciudad pendientes a la vez de un solo insert, la orden
  por su lote, los descartados de la orden y una cuenta cualquiera que no crea ni ve órdenes).
- `npm run inventario`: sin novedades.
- `npm run medir`: sin novedades con tres presupuestos del Showcase anotados a mano: s36 (lista) 283 → 294 (el renglón y la línea de Feleal),
  s37 (tabla) 232 → 240 (el renglón), s39 (manual) 79 → 83 (la entrada nueva). Profundidad igual.
- `npm run test:componentes`: **692 de 692** (6 nuevas en `Candidatos.componentes.test.mjs`, Chrome real con clics: el renglón propone y la hoja
  manda los ids y el tope tras limpiar el campo con su ✕; «Los que se ven» con filtro y una orden en curso; pasar del crédito, el tope de más de 50
  y el fallo del servidor; más de 60 con «Filtrar por disciplina» y el foco en los chips; la orden en curso con su barra, las líneas de las
  tarjetas en violeta y la recarga de 20 s —no con la hoja abierta, sí al volver a la pantalla, sin apilar historial—; sin investigaciones leídas
  no hay renglón y sin nada en curso no se recarga). **Control negativo:** con la recarga a 25 s la prueba falla («expected 1, actual 0»).
- **La app compilada contra el respaldo local** (`scripts/ops/auditoria-ui/capturar-investigar-lote.mjs`, nuevo; Chrome real, 390×844 a 2×,
  toques reales): el renglón dice «4 candidatos por investigar»; «Investigar a los 4» crea en el respaldo las cuatro corridas pendientes de una
  orden; un puerto de control hace de motor y **la lista se vuelve a leer sola a los 20 s** («Investigando a 4 · 2 terminados · 0,90 USD»,
  barra 63); al terminar, «4 investigados hoy · 6 evidencias por revisar · 1,61 USD». Ancho 390, sin errores de página ni de consola.

### Capturas (`docs/rediseno/capturas-471/`, 390×844 a 2×, abiertas y revisadas)

- `01-lista-renglon-investigar.png`: la lista sin filtro; bajo «7 candidatos · 2 invitados · 1 confirmado · 2 pasan al consejo con 5 de 8», el
  renglón «Investigar · 4 candidatos por investigar» con su chevrón; la tarjeta de Feleal con «2 evidencias por revisar» en violeta, con la lupa,
  bajo «Publica cada semana».
- `02-hoja-investigar-a-varios.png`: la hoja con qué hace, «A quiénes» con «Candidatos por investigar» elegido (paloma y violeta: «4 artistas ·
  candidatos o revisados, sin investigar en 30 días») y «Los que se ven en la lista» («7 artistas de la lista»), el tope «1,00» con su ✕ y su
  ayuda, el total «4 artistas · hasta 4,00 USD · crédito 192,29» y el pie «Cancelar» · «Investigar a los 4».
- `03-hoja-los-que-se-ven.png`: lo mismo con «Los que se ven en la lista» elegido: «7 artistas · hasta 7,00 USD · crédito 192,29» e «Investigar
  a los 7».
- `04-lista-investigando.png`: tras confirmar y un avance del motor, con «Estado: Candidato» («3 de 7 candidatos»): el renglón «Investigando a 4 ·
  2 terminados · 0,90 USD» con la barra a 63 %; la tarjeta de Abril Merlot con «Investigando · 2 de 4 búsquedas · 1 evidencia por revisar» en
  violeta.
- `05-lista-evidencias-por-revisar.png`: la orden acabada: «4 investigados hoy · 6 evidencias por revisar · 1,61 USD» (en dos renglones) y Abril
  Merlot con «Investigado hoy · 1 evidencia por revisar» en violeta.

## Lo que dejé fuera

- **Detener una orden** desde la lista (hoy, una por una en Corridas).
- **La columna de la investigación en la tabla** (13 columnas ya; la tarjeta lo dice).
- **El aviso en «Pendiente» de la portada** con las evidencias por revisar (pide `src/app/admin/page.tsx`, como ya anotó OL-430).
- **El rescate de Ciudades y Corridas** (`rescate.ts`, compartido con OL-438): ver el riesgo de arriba.
- **Una pantalla de `npm run medir` con la hoja abierta y el teclado**: la hoja es la de siempre (`ui/Hoja` con `ui/Campo`, como la de la ficha,
  que tampoco se mide); no la probé en el simulador.
- `scripts/ops/auditoria-ui/README.md` no lista el script de capturas nuevo (lo dice su cabecera), para no chocar con otras piezas.

## Qué hace el gestor en la primera orden real

Abrir `/admin/showcase`, comprobar que el renglón dice «26 candidatos por investigar» (si dice otro número, ver la decisión 1), tocarlo y dejar
«Candidatos por investigar» con **tope 1,00**: la hoja dirá «26 artistas · hasta 26,00 USD · crédito …»; el costo real esperado es de unos
**10 USD** (0,39 por artista). Confirmar «Investigar a los 26» y dejar la lista abierta (o volver de vez en cuando): la barra avanza desde el
principio y «terminados» sube al final. No recargar Ciudades ni Corridas mientras corre (riesgo de arriba). Al acabar, entrar a las tarjetas en
violeta y revisar «Por revisar» de cada ficha.
