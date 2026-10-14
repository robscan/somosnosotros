# 440 · Prototipo: festivales, exposiciones y talleres en las fichas, y el costo que no se fija (OL-409)

**Fecha:** 2026-10-14. **Rama:** `festivales-propuestas`, base `origin/main` (`aa2909cf`). **Operador:** Gestor VI (Fable 5.1), con un agente de solo lectura para el inventario. **Solo documentación.**
**Estado:** espera la firma del founder.

## El pedido

Founder, 14 de octubre, con dos capturas de la ficha de Cinema 7B en su iPhone: «revisa como se presentan los festivales en las fichas de lugar, pienso que se puede resolver como en agenda, un grupo hecho con una linea… además en la imagen que te presento aparece un festival que sigue activo pero la fecha de el lugar ya pasó (Cinema)». Y después: «En general revisa como se está resolviendo festivales, galerías y talleres, descubre si hay una mejor manera de mostrar a los usuarios estas cosas. Adicional: En la ficha de estos elementos, hay varios creados sin especificar costo, esto es realista sobre todo pensando en festivales en diferentes foros con diferentes precios, entonces debe haber alternativa para no indicar costo en estos elementos festivales, galerías y talleres.»

## Lo que encontró la revisión (inventario de solo lectura, 14 de octubre)

- **Las consultas no son las mismas.** Agenda e Inicio leen clase, festival (`evento_padre_id`), sesiones y horario (`src/lib/cargarAgenda.ts`). La ficha del lugar (`src/app/lugares/[id]/CuerpoLugar.tsx`), la del artista (`src/app/artistas/[id]/page.tsx`), Buscar y Tus planes no traen esas columnas: pintan todo como puntual. De ahí lo que vio el founder: el marco de CINEMA bajo «mar 29 de sep» (su primer acto, ya pasado) y sus funciones repetidas sueltas; «Del 12 al 15 de oct · 20:00–19:00» en Spider-Man (la hora del primer día pegada a la del último, `fechas.ts` `cuandoVariosDias`); la expo con «Voy» y «00:00».
- **Catorce incoherencias** entre superficies, entre ellas: «Hasta el …» en Inicio y «Del … al …» en la ficha para el mismo festival en curso; «Sesión n de N» en «Ahora» para cualquier evento de varios días; Buscar sin «Taller» en la ceja; el programa de la ficha del festival sin clase ni sesiones; el doc 55 §3 desactualizado tras OL-346, OL-347 y OL-381.
- **El costo es obligatorio en todas las clases** (paso «Cuánto»: Gratis · Cooperación · Tiene precio; `pasos.ts` exige el precio también en el festival y lo copia a cada acto). Un texto como «taquilla» no se puede guardar. Vacío se muestra como «Gratis» en la ficha y en Revisa, nada en tarjetas y renglones, «Entrada libre» en el cartel.

## La página

`docs/rediseno/prototipos/festivales-propuestas.html`: la ficha de Cinema 7B a la izquierda (datos de la captura del founder; los horarios que no vi están inventados y marcados en el código) y a la derecha, con tres botones, la ficha del festival «Cartelera de Cinema 7B», el paso «Cuánto» del alta y la ficha de una expo. Preajustes **Hoy** y **Propuesta**; seis ejercicios; medidor (renglones, festivales bajo fecha pasada, horas imposibles, «Gratis» dicho sin saberlo).

| Ejercicio | Opciones | Propuesta |
|---|---|---|
| **F** · el festival en la ficha del lugar y del artista | renglón por su inicio (hoy) · bloque como Agenda · solo el marco con «N funciones aquí» | **bloque como Agenda**: la línea del festival y sus funciones aquí debajo, colocado por la siguiente función; sin funciones por venir, al Historial |
| **S** · funciones y sesiones por día | primer inicio–último fin (hoy) · la hora de cada función en su día · «horarios por día» | **la hora de cada función**, en su día (el reparto por día de Agenda) |
| **E** · la exposición en las fichas | como un evento (hoy) · grupo «Para visitar» sin Voy · renglón «Hasta el …» sin Voy | **grupo «Para visitar»** arriba, con «Abre 17:00–22:00 · hasta el …», sin Voy |
| **C** · el costo en el alta de festival, expo y taller | obligatorio (hoy) · cuarta opción «Varía» · se puede dejar vacío | **«Varía»**: «Según la función» en festival y taller, «Consulta en el lugar» en expo; el marco de un festival no pide costo, lo tiene cada acto |
| **K** · el KPI «Costo» sin dato | «Gratis» (hoy) · «Por confirmar» · sin el KPI | **«Por confirmar»**: un costo vacío nunca se vuelve «Gratis» |
| **U** · el cuándo del festival y la expo | cada superficie lo suyo (hoy) · en curso «Hasta el …», por venir «Del … al …» | **una regla** en todas las superficies |

Medidor con «Hoy»: 11 renglones, 2 festivales bajo fecha pasada, 2 horas imposibles, 1 «Gratis» inventado. Con la propuesta: 14 renglones (cada función con su hora), 0, 0, 0.

## Capturas (`docs/rediseno/capturas-440/`, Chrome real, 390×844 a 2×)

- `01-hoy-ficha-lugar.png`: lo de hoy: CINEMA bajo «mar 29 de sep», la expo bajo «lun 5 de oct» con «00:00» y Voy, el marco de la cartelera y sus funciones sueltas, «17:30–19:20».
- `02-hoy-ficha-festival.png`, `03-hoy-alta-cuanto.png`, `04-hoy-ficha-expo.png`: la ficha del festival con «Gratis» en el KPI, el paso «Cuánto» obligatorio («Falta el precio») y la ficha de la expo con «Gratis».
- `05-propuesta-ficha-lugar.png`: «Para visitar» arriba con la expo; «Hoy» con el bloque de la cartelera (7 funciones aquí) y cada función con su hora y su costo; CINEMA en su bloque el 16.
- `06-propuesta-ficha-festival.png`: KPI «Costo · Según función», programa por día con la hora de cada función.
- `07-propuesta-alta-cuanto-varia.png`: la cuarta opción «Varía» marcada como nueva, con su explicación.
- `08-propuesta-ficha-expo.png`: «Costo · Consulta en el lugar», «Hoy · Abre 17:00».
- `09-F-solo-el-marco.png`, `10-S-horarios-por-dia.png`, `11-E-renglon-hasta-el.png`, `12-K-sin-kpi.png`, `13-C-opcional.png`: las alternativas de cada ejercicio.
- `14-pagina-entera.png`: la página con la hoja (1280 px).

## Cómo se haría (si se firma)

- Una sola consulta de eventos para todas las listas (fichas de lugar y artista, Buscar, Tus planes), la de Agenda, y las mismas piezas (`BloqueFestival`, el reparto por día, «Para visitar»). Sin tablas ni migración.
- El bloque de festival en las fichas se coloca por su siguiente función ahí; en el Historial, el marco cuenta una vez.
- «Varía» en el paso «Cuánto» (solo festival, expo y taller): se guarda como texto como hoy «Cooperación solidaria» (sin migración) o con un valor propio si conviene al filtro «Cuánto»; el marco de un festival deja de pedir costo y su KPI dice «Según función».
- «Por confirmar» donde hoy se inventa «Gratis» (ficha, Revisa, metadatos, cartel «Entrada libre» solo si eligió Gratis).
- Una regla para el cuándo de festival y expo en todas las superficies; el doc 55 §3 al día.
