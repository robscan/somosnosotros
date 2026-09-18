# 23 · "Nuevos": lo recién publicado, arriba

**Estado:** **pendiente de firma del founder.** **Prototipo:** [`prototipos/nuevos-por-publicacion.html`](prototipos/nuevos-por-publicacion.html) (publicado para el iPhone en https://claude.ai/artifact/9uSskNENJyzdyxQRHwzUsM) · **OL:** OL-068 · **Bitácora:** [099](../bitacora/2026/09/099-nuevos-por-publicacion.md) · **Pantalla:** `/` (Agenda › pestaña Nuevos) · **Mirada:** producción en el navegador a 390×844 el 2026-09-17, más una prueba que reproduce el caso · **Base:** decisión 15 de [02-inicio-flujo-y-estados.md](02-inicio-flujo-y-estados.md)

## Lo que pidió el founder

2026-09-17:

> «cuestiona la manera como se organizan eventos "Nuevos" en agenda, se acaba de publicar uno hoy y el comportamiento esperado es verlo en la sima de la lista por ser el mas reciente»

## Tiene razón, y ya estaba decidido así

La decisión 15 del 2026-09-14, suya, dice literalmente: «**Nuevos** muestra lo agregado en los últimos 7 días, **lo más reciente primero**». La pantalla no lo cumple. No es un cambio de opinión: es un defecto contra lo firmado.

**Lo que pasa.** `filtrarAgenda` sí ordena Nuevos por fecha de publicación, de lo más reciente hacia atrás. Pero la pantalla ([AgendaInicio.tsx:130](../../src/components/AgendaInicio.tsx)) llama a `agruparPorDia` sin pedirle que respete ese orden, y `agruparPorDia` vuelve a ordenar por la hora del evento. **Ese orden se tira entero: hoy es código que no hace nada.**

Y hay un segundo candado, más de fondo: `agruparPorDia` siempre ordena los grupos por día del evento, de hoy hacia adelante. Aunque se respetara el orden dentro de cada día, un evento publicado hoy que sucede en tres semanas cae en el penúltimo encabezado. Reproducido con cuatro eventos: el publicado hoy salió **el cuarto de cuatro**.

**Lo que se ve en producción hoy.** Medido en el teléfono, a 390×844:

| | Eventos | Encabezados de día | Último encabezado |
|---|---|---|---|
| **Todos** | 96 | 29 + Destacados | dom 6 de dic |
| **Nuevos** | 88 | 29 | dom 6 de dic |

**Nuevos muestra el 92% de Todos, en el mismo orden y con los mismos encabezados.** La pestaña no distingue nada: es Todos con ocho eventos menos. Lo recién publicado no está arriba; está repartido entre 29 encabezados que llegan hasta diciembre.

## El error de fondo: dos ejes mezclados

La pestaña **selecciona** por fecha de publicación y **se organiza** por fecha del evento. Son dos ejes distintos y el segundo anula al primero. «Lo más reciente primero» y «agrupado por día del evento» no pueden ser verdad a la vez.

La pregunta que alguien trae a Nuevos es *«¿qué se publicó desde la última vez que entré?»*. Esa pregunta se contesta en el eje de la publicación. La app ya lo hace bien en otra pantalla: `/novedades` agrupa «Hoy · Ayer · Esta semana · Hace más» por cuándo pasó la cosa ([novedades.ts](../../src/lib/novedades.ts), decisión 1 de [13](13-novedades-perfil-alta-flujo-y-estados.md)). Lo que falta en Nuevos ya está escrito y probado a quince metros.

**Un detalle que decide el tamaño del cambio:** el renglón de evento solo muestra la **hora** («19:00»), nunca el día. El día vive únicamente en el encabezado del grupo. Si Nuevos deja de agrupar por día del evento, el renglón tiene que decir el día, o un evento de octubre se leería igual que uno de esta noche.

## Las tres formas de resolverlo

| | Qué es | A favor | En contra |
|---|---|---|---|
| **A · Una sola lista** | Lo último publicado arriba, hacia atrás, sin encabezados de día del evento | La más fiel a «en la cima»; el orden es una sola regla, sin excepciones | 88 renglones seguidos sin un solo asidero: un muro. Nada dice «esto se publicó hoy» |
| **B · Por día de publicación** *(recomendada)* | Grupos «Publicado hoy · Ayer · Esta semana», y dentro, lo más reciente primero. El patrón de `/novedades` | Cumple la decisión 15 al pie; los encabezados dicen por qué algo está ahí; reutiliza `tituloDia`, ya probado; la app dice «Hoy/Ayer/Esta semana» de una sola manera | Dos pestañas de la misma lista ordenan por ejes distintos. Exige que el renglón muestre el día del evento |
| **C · El arreglo mínimo** | Dejar los grupos por día del evento y solo ordenar dentro de cada día por publicación | Una línea de código; nada más se mueve | **No resuelve lo que pidió.** Su evento de noviembre seguiría en el encabezado de noviembre. Y Nuevos seguiría siendo Todos |

**Recomiendo B.** C se descarta sola: no cumple el pedido. Entre A y B, las dos ponen lo recién publicado arriba, pero A lo hace a costa de dejar la lista sin ninguna referencia — y en esta app los encabezados de día son lo que hace legible una agenda de 88 renglones. B da la misma cima y además dice en voz alta lo que la pestaña promete: esto es de hoy, esto de ayer, esto de esta semana.

Con B, dos cosas que van juntas y no son opcionales:

1. **El renglón de Nuevos muestra el día del evento** («jue 8 de oct · 19:00»), **solo en esta pestaña**. Sin eso, B miente sobre cuándo es el evento. El mismo renglón lo usan la agenda, la ficha de un lugar, la de un artista y las pestañas del perfil: si el día se añadiera sin más, aparecería en las cinco listas, y en la ficha de un lugar o de un artista el día ya lo dice su propio encabezado. Por eso el día se le pasa al renglón desde Nuevos y las demás listas se quedan como están.
2. **Los encabezados dicen «Publicado hoy», «Publicado ayer», «Esta semana»**, no «Hoy» a secas. En `/novedades` no hay ambigüedad porque no hay otro eje; en la agenda, «Hoy» ya significa «el evento es hoy» dos pestañas más a la izquierda. Si le parece mucho texto, la alternativa es «Hoy» con el día del evento en cada renglón haciendo la distinción.

## Una pregunta que dejo abierta, porque es suya

Arreglar el orden hace que su evento salga arriba. No hace que la pestaña se sienta distinta de Todos: seguirá trayendo 88 de 96 eventos, porque las agendas institucionales se cargaron todas dentro de la misma semana. El umbral son 7 días fijos (`esNuevo`).

Tres salidas, para cuando lo quiera ver: dejarlo en 7 días y aceptar que la pestaña es ancha; bajarlo a 48 horas y que sea de verdad lo recién llegado; o «desde la última vez que entraste», que es más invisible y que la app ya sabe calcular (`novedades_vistas_en`, decisión 1 de [13](13-novedades-perfil-alta-flujo-y-estados.md)). **No lo toco sin que usted lo diga.**

## Qué no cambia

Todos, Cercanos y Siguiendo se quedan exactamente como están. El chip de fecha, la búsqueda y la memoria de pantalla siguen funcionando dentro de Nuevos. Sin migración: la fecha de publicación ya viaja con cada evento.

## Lo que firmó el founder (2026-09-17)

> «tomo tu recomendación y de acuerdo en mostrar nuevos desde la ultima vez que entraste, pero con un tome máximo de 7 días. No olvides empty state que además invite a subir eventos.»

Tomó **B** y, de paso, contestó la pregunta que quedaba abierta y añadió una cosa. Tres decisiones firmes:

1. **B · grupos por día de publicación**, lo más reciente arriba, con el día del evento en el renglón de esta pestaña y los encabezados diciendo «Publicado hoy / Publicado ayer / Esta semana».
2. **El umbral es tu última visita, con tope de 7 días.** El corte es el más reciente de los dos: cuándo miraste Nuevos por última vez, o hace 7 días. Si volviste ayer, ves lo de ayer para acá; si no entras en un mes, ves una semana, no un mes.
3. **El vacío invita a publicar.** Deja de ser «Nada nuevo esta semana.» a secas. Sustituye al estado P4 de [02-inicio-flujo-y-estados.md](02-inicio-flujo-y-estados.md), que queda actualizado.

### Cómo se sabe cuándo fue tu última visita

No existe esa marca. Hay dos parecidas y ninguna sirve tal cual: `novedades_vistas_en` es cuándo abrió `/novedades` (mueve el punto de la campana), y pegarle la agenda haría que abrir Novedades vaciara la pestaña Nuevos — dos cosas distintas con una sola marca; y `marcar_visto` guarda solo el día, en una tabla que solo lee la administración.

**Se guarda en el teléfono**, con el patrón que ya usa [`VistoHoy.tsx`](../../src/components/VistoHoy.tsx) (una clave propia en `localStorage`, cada acceso entre `try`/`catch`, y si no se puede leer no pasa nada): el filtro de la agenda ya corre en el teléfono, así que no hace falta tocar el servidor ni pedir cuenta — y hoy la mayoría entra sin cuenta. Lo que cuesta: la marca no viaja entre teléfonos y se pierde al limpiar los datos del navegador; en los dos casos se cae al tope de 7 días, que es el comportamiento de hoy. Sin migración.

**La marca avanza solo al mirar la pestaña Nuevos**, no al entrar a la agenda. Si avanzara en cada visita, quien entra dos veces al día vería «nada nuevo» casi siempre y la pestaña no serviría de nada. Y el corte **se congela mientras esa pantalla vive**: salir a la ficha de un evento y volver con la memoria de pantalla (decisión 17) tiene que reponer la misma lista, no una vacía.

### El vacío, por causa y con salida

Dos textos, según haya marca o no, los dos con el botón **Publicar evento**:

| Cuándo | Qué dice |
|---|---|
| Ya miró Nuevos antes | «Ya viste lo que se publicó. Si sabes de un evento, publícalo y la ciudad lo verá aquí.» |
| Primera vez, o sin marca en el teléfono | «Nada nuevo esta semana. Si sabes de un evento, publícalo y la ciudad lo verá aquí.» |

Usa `VacioConAccion`, el mismo componente de los vacíos de Cercanos y Siguiendo: un botón en el cuerpo del vacío, donde está la mirada.

**Corrección de lo que escribí antes, después de mirar la pantalla construida:** dije que este botón convive con el flotante «Publicar evento» igual que «Usar mi ubicación» y «Entrar». No es el mismo caso, y se ve en cuanto se mira. Esos dos hacen algo **distinto** del flotante; este hace **lo mismo**, con el mismo texto y el mismo icono. En la pantalla quedan dos botones «Publicar evento» a la vez, uno arriba y el flotante abajo, con 600 px de vacío entre ellos. Y `Publicar.tsx` dice de sí mismo que es «la única acción de las pantallas raíz». Queda anotado para que lo decida el founder: o el vacío invita solo con palabras y la acción es el botón flotante que ya está en la zona del pulgar, o se acepta la repetición. Se construyó **con** el botón, que es lo que él aprobó al elegir el texto; quitarlo es una línea.

**Con este umbral, el vacío deja de ser la excepción y pasa a ser lo que más se verá**: quien entra a diario y ya miró Nuevos lo encontrará vacío casi siempre. Es la consecuencia de lo que él pidió, y la razón por la que ese estado tenía que dejar de ser una frase muerta. *Evidencia (el vacío dice su causa), Zeigarnik (deja algo por hacer), UX invisible (nada que configurar).*

### Cuatro condiciones que salieron de la revisión de gestión de cambios

1. **Sin cuenta, la invitación lleva a Entrar y vuelve al alta.** Publicar exige cuenta: [`/eventos/nuevo`](../../src/app/eventos/nuevo/page.tsx) redirige a `/entrar?siguiente=…` cuando no hay sesión. El botón del vacío usa el patrón que ya está en [`ListaLugares.tsx:49`](../../src/components/ListaLugares.tsx) (`conSesion ? "/eventos/nuevo" : "/entrar?siguiente=/eventos/nuevo"`), que ahorra el salto intermedio. En la agenda ya se sabe si hay sesión sin añadir nada: `seguidos === null` significa sin cuenta.
2. **El vacío no aparece mientras falta leer la marca.** La lista de eventos no tiene estado de carga dentro de la pantalla (llega resuelta del servidor, y la espera la cubre `loading.tsx`), pero **la marca sí**: `localStorage` solo se puede leer en el teléfono, después de montar. Si se pintara el vacío antes de leerla, aparecería un «ya viste todo» en falso, o la lista daría un salto al acortarse. Hasta que la marca esté leída, Nuevos no pinta vacío.
3. **El tope de 7 días se aplica siempre**, también cuando la marca es más vieja, esté rota o venga de un reloj mal puesto (una marca en el futuro se trata como si no hubiera marca).
4. **El día del evento, solo donde hace falta.** En las fichas de lugar y de artista el encabezado ya dice el día; ahí el renglón no cambia.

### Lo que se prueba

Además de la prueba que hoy falta (`filtrarAgenda` junto con `agruparPorDia`, que es donde se perdía el orden, y que tiene que fallar antes del arreglo): el umbral sin marca, con marca de ayer, con marca de hace un mes (gana el tope de 7 días) y con marca en el futuro; el vacío en sus dos textos, con y sin sesión; y que **Todos y Cercanos no cambian**.

Y una prueba propia para el momento en que la marca todavía no se ha leído, que es donde más fácil se rompe esto: mientras falta leerla, Nuevos **no** pinta el vacío y **no** acorta la lista — ni un «ya estás al día» falso, ni un salto de la lista al encogerse cuando la marca llega.

## Los textos, elegidos por el founder (2026-09-17)

**El vacío**, la versión corta: la causa en una línea y la invitación en tres palabras, con el botón **Publicar evento** debajo.

| Cuándo | Qué dice |
|---|---|
| Ya miró Nuevos antes | «Ya estás al día.» · «¿Sabes de un evento? Publícalo.» |
| Primera vez, o sin marca en el teléfono | «Nada nuevo esta semana.» · «¿Sabes de un evento? Publícalo.» |

Sustituye al estado P4 de [02-inicio-flujo-y-estados.md](02-inicio-flujo-y-estados.md) («Nada nuevo esta semana.», salida: cambiar de pestaña), que se actualiza al construir junto con la decisión 15.

**Los encabezados.** Pidió «Lo mas nuevo, Publicado ayer, etc», así que el primer grupo no lleva fecha y los demás sí:

```
Lo más nuevo · 2
Publicado ayer
Esta semana · 3
```

Es mejor que «Publicado hoy», y no solo por no repetir la palabra tres veces: con el umbral por última visita, el primer grupo **no siempre es de hoy** — si no entró en tres días, lo primero que ve puede ser de anteayer. «Lo más nuevo» no promete un día que la lista no siempre cumple; «Publicado hoy» sí lo prometería.

Con el tope de 7 días, los grupos posibles son exactamente esos tres: el cuarto de `/novedades` («Hace más») no puede salir nunca aquí, porque nada más viejo que una semana entra a la pestaña.
