# 442 · El costo que no se fija: «Dejar por confirmar» en festival, exposición y taller, y la ficha dice «Por confirmar» (OL-411)

**Fecha:** 2026-10-14. **Rama:** `costo-opcional`, base `origin/main` (`55b678b4`). **Operador:** agente de la pieza (Gestor VI), sin otros agentes. **Sin migración, sin tablas ni variables de entorno nuevas.**
**Estado:** lista para la revisión del gestor y el «publica» del founder.

## El pedido y la firma

Founder, 14 de octubre (bitácora 440): «hay varios creados sin especificar costo, esto es realista sobre todo pensando en festivales en diferentes foros con diferentes precios, entonces debe haber alternativa para no indicar costo en estos elementos festivales, galerías y talleres.»

Firma del prototipo (OL-409), la tarde del 14: «F Bloque como Agenda · S La hora de cada función, en su día · E Grupo «Para visitar», sin Voy · **C Se puede dejar vacío** · **K «Por confirmar»** · U En curso «Hasta el …», por venir «Del … al …»». Esta pieza es **C y K**; F, S, E y U son de OL-410 (otro operador, en paralelo): no toqué fichas de lugar ni de artista, Buscar, Tus planes, `agenda.ts`, `cargarAgenda.ts`, `fechas.ts`, `ocurrencias.ts`, `BloqueFestival` ni `EventosPorDia`.

## Cómo se guardaba (y por qué no bastaba con leer el vacío distinto)

Solo hay una columna, `eventos.precio` (texto libre, «Vacío = gratis» desde la migración base). «Gratis» se guardaba **vacío**; «Cooperación solidaria» y «$150», como texto. Así, en producción un `precio` vacío puede ser dos cosas: alguien eligió Gratis en el alta (el costo era obligatorio) o un alta de datos sin precio conocido (lo que vio el founder en festivales y expos). No se pueden distinguir sin mirar fila por fila (y leer producción desde aquí está bloqueado).

## La regla (sin migración)

1. **Dónde el costo es opcional** (`costoOpcional` en `src/lib/eventos.ts`): un **festival**, una **exposición**, un **taller** y lo que cuelga de ellos: un **acto de festival** (`evento_padre_id`, hereda el costo del marco) y la **inauguración** de una exposición (la base le copia el costo de la exposición). Un **evento suelto** sigue con costo obligatorio.
2. **Cómo se lee un `precio` vacío** (`textoCosto`): en un evento suelto, «Gratis» (como siempre: el costo era obligatorio, así que vacío es que se eligió Gratis); donde el costo es opcional, **«Por confirmar»**. Por eso los festivales, expos y talleres ya guardados sin precio dicen «Por confirmar» sin migración.
3. **«Gratis» elegido donde el costo es opcional se guarda escrito**, `precio = 'Gratis'` (constante `GRATIS`, como `COOPERACION_SOLIDARIA` en OL-140): ahí el vacío ya significa «por confirmar». En un evento suelto, Gratis sigue guardándose vacío (la prueba «Gratis sigue siendo null» de `eventos.test.ts` no cambia, ni los scripts de instituciones).
4. **«Gratis» solo cuando quien publicó eligió Gratis**: en la ficha, Revisa, la descripción para compartir, el JSON-LD (`isAccessibleForFree` solo si se sabe, `sabidoGratis`) y el cartel.

**Consecuencia que el founder debe conocer:** una exposición, un taller, un festival o un acto de festival **ya guardado** en el que alguien sí eligió «Gratis» (se guardó vacío) ahora dice «Por confirmar». No hay forma de saber cuáles fueron sin mirar. Se arregla editándolo: «Cuánto» → «Gratis» (ahora se guarda escrito y ya no se pierde). Es el error en la dirección segura: no inventa que algo es gratis.

## C · El paso «Cuánto» (decisión de diseño)

- **Se sigue preguntando en todas las clases** (el alta no se lo salta): las tres opciones de siempre (Gratis, Cooperación, Tiene precio). En festival, exposición, taller o acto de festival, el pie lleva **«Dejar por confirmar»**, quieto (gris, subrayado), como «Seguir sin especificar» del alta de artista (OL-316): una salida que no compite con las tres respuestas. Tocarla sigue a «Revisa» y la ficha dirá «Por confirmar».
- **Por qué «Dejar por confirmar»** y no «Siguiente», «Lo digo después» o «Sin definir»: (1) el botón dice lo que pasa y con la misma palabra que verá la gente en la ficha («Por confirmar»): canon del botón que dice qué falta o qué hace; (2) «Siguiente» con nada elegido parece un salto de algo obligatorio, y al reabrir el paso desde «Revisa» no serviría para *quitar* un costo puesto; «Dejar por confirmar» sí (desde «Revisa», quita el que hubiera); (3) quieta y no primaria, para que la gente que sabe el precio lo ponga.
- **La ayuda bajo las opciones de la captura 13 del prototipo** («Se puede dejar vacío: la ficha dirá «Por confirmar».») **no se puso**: con el botón que ya dice «Dejar por confirmar» repetiría lo mismo (regla del founder: menos texto de ayuda). Si el founder la quiere, es una línea.
- **«Tiene precio» sin escribir:** donde el costo es opcional el pie dice «Siguiente» solo cuando hay un número, y «Dejar por confirmar» siempre debajo; vacío no dice «Falta el precio». En un evento suelto, igual que antes («Falta el precio», apagado).
- **Por dentro:** «Dejar por confirmar» es una respuesta (`Costo = … | "por_confirmar"`), no la ausencia de respuesta: así el alta sigue pasando por «Cuánto» y `faltan` la acepta solo donde el costo es opcional; si en «Revisa» la clase cambia a evento, vuelve a faltar («Falta el precio»).
- **Festival:** el costo del marco se copia a cada acto **tal cual**: elegido, el mismo en todos (lo normal: «entrada libre a todo»; cada acto se cambia después en su ficha); **vacío, vacío**, y cada acto dice «Por confirmar» (antes cada acto heredaba un vacío que se leía «Gratis»). En el alta del festival no hay costo por acto (sería una pregunta por acto; queda fuera).

## K · «Por confirmar» donde antes se inventaba «Gratis»

- **Ficha del evento** (`eventos/[id]/page.tsx`): el KPI «Costo» de los cuatro bloques (exposición, festival, taller y evento suelto o acto) usa `textoCosto`. La inauguración cuenta como opcional (la ficha ya consulta qué exposición inaugura).
- **Descripción para compartir** (metadatos): con costo por confirmar no dice nada del costo («· Por confirmar» en una vista previa de WhatsApp no se entiende).
- **JSON-LD:** `isAccessibleForFree` solo si se sabe que es gratis.
- **Revisa:** «Por confirmar» como valor resuelto, con «Cambiar».
- **Cartel / flyer** (`lib/carteles`): sin precio donde el costo es opcional, **nada** (antes «Entrada libre»). Decisión: un cartel es para anunciar; «Por confirmar» en un flyer no ayuda a nadie y «Entrada libre» sería inventarlo. Las seis plantillas ya aceptaban el precio vacío (`etiqueta`/`texto` devuelven un bloque vacío).
- **Tarjetas y renglones:** siguen sin decir nada de un costo vacío ni del «Gratis» que ahora se guarda escrito (`costoEnLista`); lo demás («$150», «Cooperación solidaria», un «Entrada libre» escrito a mano) se dice como antes.
- **Duplicar y editar** (`arranque.ts`, `alEditar.ts`): un vacío en una clase opcional entra como «por confirmar», nunca como gratis; un «Gratis»/«Entrada libre» escrito entra como gratis (antes se volvía a preguntar).

## Archivo por archivo

- `src/lib/eventos.ts`: `COSTO_OPCIONAL`, `costoOpcional`, `GRATIS`, `POR_CONFIRMAR`, `textoCosto`, `sabidoGratis`, `costoEnLista`; `validarEvento` lee `por_confirmar` (solo vale con la opción `costoOpcional`; si no, el error de siempre «Pon el precio, o marca que es gratis.») y guarda «Gratis» escrito con esa opción.
- `src/app/eventos/acciones.ts`: el campo `por_confirmar`; `costoOpcional` al crear (por la clase y el festival que llegan), al editar (lo que llega o, sin campo `clase`, lo guardado) y en cada acto del festival.
- `src/app/nuevo/evento/pasos.ts`: `Costo` con `por_confirmar`, `costoOpcionalEn`, `faltan`, la tarjeta de «Publicado».
- `src/app/nuevo/evento/PasosEvento.tsx` (`PasoCuanto`), `Preguntas.tsx`, `Revisa.tsx`, `CamposEvento.tsx` (campo escondido `por_confirmar`), `arranque.ts`, `alEditar.ts`, `page.tsx` (al duplicar se lee también la clase y el festival).
- `src/app/eventos/[id]/page.tsx`: KPI, descripción, JSON-LD.
- `src/components/RenglonEvento.tsx`: `costoEnLista`.
- `src/lib/carteles/datos.ts` y `cargar.ts`: `textoPrecio(precio, opcional)`, `EventoCartel.costoOpcional`, `TextosCartel.precio` admite null.
- Pruebas: `lib/eventos.test.ts` (la regla, el texto, el JSON-LD, las listas y `validarEvento`), `nuevo/evento/pasos.test.ts` (qué falta por clase, el alta de una exposición pasa por «Cuánto» y «Dejar por confirmar» lleva a «Revisa», la clase que vuelve a evento, la tarjeta), `arranque.test.ts` y `clase.test.ts` (duplicar y editar), `eventos/clase.acciones.test.ts` (servidor: festival sin costo, marco y actos vacíos; exposición, taller y acto vacíos o «Gratis» escrito; evento suelto rechazado; editar), `carteles/datos.test.ts`; de componentes (Chrome): tres en `AltaEvento` (exposición con «Dejar por confirmar» y lo que se publica; «Tiene precio» vacío no falta y, a 390×508, el campo enfocado con «Siguiente» y «Dejar por confirmar» enteros y sin nada encima; evento suelto sin la salida) y uno en `ClasesEvento` (festival leído del cartel sin costo, hasta publicar).

## Verificación

- `npm run lint`: 0 errores (1 aviso que ya estaba: `page` sin usar en `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: correcto.
- `npm test`: **220 archivos, 3 924 pruebas**, en verde.
- `npm run test:componentes`: **615 de 615** (incluidas las 4 nuevas).
- `npm run inventario`: sin novedades.
- `npm run medir`: **40 pantallas × 4 anchos, sin novedades** (143 s): «Por confirmar» cabe en el KPI de `s24-ficha-exposicion` y `s25-ficha-festival` a 320; `medidas.aceptadas.json` sin tocar.
- El teclado: el iPhone con su teclado se probó como lo prueba `medir` (área visible de 390×508, campo enfocado, botones del pie enteros y sin nada encima: prueba de componentes y capturas 03 y 04); no en el simulador.

## Capturas (`docs/rediseno/capturas-442/`, Chrome real, 390×844 a 2×, sin comprimir)

Respaldo local (datos inventados), `next build` + `next start` con el reloj fijo de la medición (miércoles 7 de octubre de 2026, 10:00), sesión inventada, **sin `.env` en el árbol**.

1. `01-festival-cuanto.png`: alta del «Festival de las Linternas» (armado a mano: una actividad el viernes 9 a las 8:00 p.m. en el Teatro de la Paz) en «¿Cuánto cuesta?» sin elegir: Gratis, Cooperación y Tiene precio, y al pie, quieto, «Dejar por confirmar».
2. `02-festival-revisa-por-confirmar.png`: «Revisa» tras «Dejar por confirmar»: Festival · Programa registrado: 1 actividad · Sedes: Teatro de la Paz · **Por confirmar** (con el boleto y «Cambiar»); el botón dice «Publicar el festival y 1 evento» (no falta nada).
3. `03-festival-precio-teclado-vacio.png` (390×508, el área que deja el teclado): «Tiene precio» con el campo vacío y enfocado; el pie solo lleva «Dejar por confirmar», a la vista. No dice «Falta el precio».
4. `04-festival-precio-teclado-escrito.png` (390×508): con «80» escrito y la ✕ para limpiar: «Siguiente» morado y debajo «Dejar por confirmar», los dos sobre el teclado.
5. `05-evento-cuanto-obligatorio.png`: «Lectura en voz alta» (evento suelto) en «¿Cuánto cuesta?»: las tres opciones y ningún pie: el costo sigue siendo obligatorio.
6. `06-ficha-expo-por-confirmar.png`: la exposición «Un mundo para mí» (guardada sin precio): banda oscura con HASTA dom 8 nov · **COSTO Por confirmar** · HOY 10:00–18:00; cabe en su KPI.
7. `07-ficha-festival-por-confirmar.png`: «KOWAIFEST: festival de cultura japonesa» (sin precio): ACTOS 0 · **COSTO Por confirmar** · SEDES 1.
8. `08-ficha-evento-gratis.png`: control: «Master Class - 9° Festival de Cine UASLP», evento suelto sin precio: COSTO **Gratis**, como siempre.

## Lo que queda fuera y dudas para el founder

1. **Los ya guardados que sí eran gratis.** Expos, talleres, festivales y actos de festival con precio vacío dicen ahora «Por confirmar», también los que alguien publicó eligiendo «Gratis». ¿Se revisan a mano los de producción (el gestor puede listar los que tienen precio vacío por clase) o se dejan para que cada quien los corrija al editar?
2. **El filtro «Gratis» de Agenda/Buscar** (`lib/agenda.ts`, de OL-410) sigue contando un precio vacío como gratis, así que una exposición «Por confirmar» sale con el filtro «Gratis». Arreglarlo pide tocar `agenda.ts` (la clase del evento en `claseDeCosto` o una cuarta clase «Por confirmar» en el filtro): queda para después de OL-410.
3. **La ayuda bajo las opciones** de la captura 13 no se puso (ver arriba). ¿La quiere?
4. **Costo por acto en el alta del festival:** hoy el del festival se copia a todos; cada acto se cambia en su ficha. Si conviene preguntarlo por acto en el programa, es otra pieza.
5. **Editar una inauguración** guardada sin precio pide elegir el costo (al editar no se sabe que es inauguración; su ficha sí dice «Por confirmar»). Raro; anotado.
