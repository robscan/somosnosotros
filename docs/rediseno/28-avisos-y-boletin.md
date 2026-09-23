# 28 · Avisos y correos a artistas y usuarios, con boletín quincenal

**OL-138 · bitácora 173 · 2026-09-23.** Solo textos y criterios, **para firma del founder**. No se enciende nada, no hay código de la app. Cubre L42, L43, L44 y el comentario del 2026-09-23: «Crear boletín de correo de eventos quincenal que contenga varios eventos, solo eventos sobresalientes y de lugares seguidos por el usuario. Solo a usuarios con actividad reciente. Eliminar avisos por cada evento al correo; para ese tipo de avisos dejar push y las notificaciones dentro de la app.»

Maqueta del boletín: [prototipos/boletin-quincenal.html](prototipos/boletin-quincenal.html) (captura 390×844 en [capturas-173](capturas-173/)). Los eventos y nombres de la maqueta son inventados.

## 1. Lo que ya se manda hoy

Remitente de todo lo automático: `Somos Nosotros <avisos@somosnosotros.org>` (`src/lib/correo.ts`, se puede cambiar con la variable `CORREO_REMITENTE`). Los correos salen por Resend; cada uno lleva baja de un toque y el aviso de privacidad. Un rebote o una queja de spam apaga el correo de esa persona sola (`src/app/api/resend/route.ts`).

| Aviso | Quién lo recibe | Canales hoy | Qué lo dispara | Dónde está |
|---|---|---|---|---|
| **Nuevo evento** | Quien sigue el lugar o un artista del evento (no el autor) | Correo y push | Al publicar o cambiar un evento: `avisos_evento_trigger` → `avisos_encolar` | Textos: `src/lib/comunidad.ts` (`correoNuevoEvento`) y `src/lib/avisos.ts` (`contenidoPush`). Cola y destinatarios: `supabase/migrations/20260918140000_avisos_fiables.sql`. Envío: `src/lib/avisosWorker.ts` |
| **Cambió la fecha o el lugar** | Quien dijo «Voy» | Correo y push | Al guardar un evento con otra fecha u otro lugar (mismo disparador) | Igual; `correoCambioEvento` |
| **Recordatorio** | Quien dijo «Voy», 24 h antes | Correo y push | Cron diario `/api/recordatorios` → `avisos_recordatorios` | Igual; `correoRecordatorio` |
| **Aviso al administrador** | Cuentas admin | Solo push, agrupado | Pedir o reclamar ficha, reportes, altas y registros (OL-115) | `contenidoPushAdmin` en `src/lib/avisos.ts` |
| Código para entrar | Quien entra | Correo | Pedir código en Entrar | Lo manda Supabase Auth; su texto no está en el repo |
| Invitación al CAPO y a instituciones | Artistas del catálogo e instituciones | Correo, en tandas | Guiones del founder | `scripts/capo/invitar.ts`, `scripts/instituciones/invitar-agendas.ts` |

Dentro de la app ya existe **Novedades** (`src/app/novedades`): nuevo en lo que sigues, cambios en lo que vas, hoy vas y quién más va.

**No existe hoy:** correo de bienvenida, correo o push al artista que recibe el control de su ficha, ni aviso al artista cuando lo siguen, lo etiquetan o van a su evento. Tampoco hay ningún boletín.

## 2. Textos para firma

Voz: español llano, corto, sin exclamaciones. Remitente de todos: `Somos Nosotros <avisos@somosnosotros.org>`. Los textos entre llaves se llenan con datos reales. Sin nombre, el saludo es «Hola,».

### L42 · Bienvenida (correo, una sola vez)

Se manda **una vez**, en la hora siguiente al primer ingreso confirmado, a toda cuenta nueva aunque no haya pedido avisos (es un correo único, no una suscripción). No se manda si el correo es un alias que rebota.

- **Asunto:** `Ya estás en Somos Nosotros`
- **Cuerpo:**

> Hola {nombre},
>
> Ya estás dentro. Somos Nosotros es la agenda y el directorio de la cultura de San Luis Potosí, hechos por su gente.
>
> Tres cosas que puedes hacer hoy:
> · Ver qué hay esta semana y tocar «Voy» para que otras personas sepan que irás.
> · Seguir lugares y artistas para enterarte de lo nuevo.
> · Publicar un evento, un lugar o tu ficha de artista.
>
> [Abrir Somos Nosotros]
>
> Cada dos semanas puedes recibir un boletín con lo más sobresaliente y lo de los lugares que sigues. Se activa en Ajustes → Avisos.
>
> Recibes este correo una sola vez, porque acabas de crear tu cuenta. Aviso de privacidad.

### L43 · Te dieron el control de tu ficha (correo y push)

Se manda a la cuenta que queda ligada a la ficha (cuando el administrador atiende «Quiero editarlo yo» o confirma «Soy yo / es mi grupo»). Una vez por ficha.

- **Correo · asunto:** `Ya puedes editar la ficha de {artista}`
- **Correo · cuerpo:**

> Hola {nombre},
>
> Listo: ahora tú controlas la ficha de {artista} en Somos Nosotros. Puedes cambiar la foto, el texto y los enlaces, y ver cuántas personas la siguen.
>
> [Editar mi ficha]
>
> Si no pediste esto, entra a Somos Nosotros y usa «Reportar» en la ficha. Lo revisamos.
>
> Recibes este correo porque se ligó una ficha a tu cuenta. Aviso de privacidad.

- **Push · título:** `Tu ficha ya es tuya`
- **Push · cuerpo:** `Ya controlas la ficha de {artista}. Tócala para editarla.` (abre la edición de la ficha)

### L44 · Avisos al artista (push y dentro de la app, sin correo)

Solo llegan a cuentas que controlan la ficha. Nunca dicen quién es la persona: ni nombre ni foto, aunque su perfil sea público. Para no llenar el teléfono, cada tipo se agrupa: como mucho **un push por ficha y por día** (el de eventos, uno por evento y por día).

| Cuándo | Push · título | Push · cuerpo | Abre |
|---|---|---|---|
| Lo siguen (una persona) | `Alguien sigue a {artista}` | `Ya son {n} personas.` | La ficha |
| Lo siguen (varias en el día) | `{k} personas nuevas siguen a {artista}` | `Ya son {n}.` | La ficha |
| Lo etiquetan en un evento | `Te etiquetaron en un evento` | `{evento} · {cuando} · {lugar}` | El evento |
| Va a ir alguien (primera vez) | `Alguien va a tu evento` | `{evento}: ya va 1 persona.` | El evento |
| Van varias (5, 10, 25, 50…) | `{evento}: ya van {n}` | `{cuando} · {lugar}` | El evento |

Dentro de la app, los mismos tres avisos aparecen en Novedades de la cuenta con el mismo texto.

### Boletín quincenal (correo)

- **Remitente:** `Somos Nosotros <avisos@somosnosotros.org>`
- **Asunto:** `Quincena cultural: {n} eventos para ti ({del 24 sep al 7 oct})`
- **Texto previo (lo que se lee en la bandeja):** `Lo más sobresaliente y lo de los lugares que sigues.`
- **Cuerpo:**

> Hola {nombre},
>
> Esto es lo que viene del {24 de septiembre} al {7 de octubre}.
>
> **Lo más sobresaliente**
> {título} · {cuando} · {lugar} · Van {n}
> (hasta 5 renglones)
>
> **En lugares que sigues**
> {título} · {cuando} · {lugar}
> (hasta 5 renglones)
>
> [Ver toda la agenda]
>
> Recibes este boletín cada dos semanas porque pediste avisos por correo. Dejar de recibirlo (un toque, sin entrar). Aviso de privacidad.

Cada renglón enlaza al evento. Un evento sale una sola vez aunque cumpla las dos secciones (queda en la primera). Los avisos por cada evento (nuevo, cambio, recordatorio) siguen por push y dentro de la app.

## 3. Criterios propuestos (medibles)

### Evento sobresaliente

Un evento entra al boletín como sobresaliente si **todo** esto se cumple:

1. Es visible, empieza entre el día del envío y 14 días después, y su lugar es visible y no privado.
2. Cumple una de dos: **(a)** el administrador lo destacó y no lo quitó, o **(b)** tiene 3 o más «Voy» de personas que no son administración.

Es exactamente la regla que ya usa la tira de destacados de la app (`tira_destacados`, umbral 3), así que lo que se ve en la agenda y lo que llega al correo coincide.

### Lugares que sigue la persona

Cualquier evento que cumple el punto 1 y es de un lugar (o de un artista) que esa persona sigue, sea o no sobresaliente. **Esto es una lectura del comentario del founder; decide él:** «solo eventos sobresalientes y de lugares seguidos» puede entenderse como *o* (lo que propongo, dos secciones) o como *y* (solo sobresalientes que además sean de lugares seguidos). Con *y*, casi nadie recibiría boletín con 3 o más eventos hoy, porque hay pocas personas y pocos eventos con 3 «Voy».

### Cuánto trae

Hasta 8 eventos en total (el mismo tope de la tira), máximo 5 por sección. Se descartan los eventos donde la persona ya dijo «Voy» (ya tiene su recordatorio). **Si le tocan menos de 3, ese día no se le manda boletín** (no se manda un correo vacío).

### Usuario con actividad reciente

Persona con correo confirmado, boletín activado (hoy la palanca «Por correo», ver §4) y que en los **últimos 45 días** hizo al menos una de estas cosas: entró a la app, dijo «Voy», siguió algo o publicó. Cuarenta y cinco días son tres quincenas: quien no ha vuelto en ese tiempo deja de recibirlo y vuelve a recibirlo el día que regresa. Los correos que rebotan o se quejan ya se apagan solos. *Por comprobar al construir:* que cada una de esas acciones guarde su fecha; la de entrar viene de la cuenta de acceso.

### Día y hora

**Cada dos semanas, jueves a las 9:00 (hora de San Luis Potosí).** El jueves da margen para planear el fin de semana y la mañana es cuando se abre el correo. Se manda con el cron de Vercel, con el motor de avisos que ya existe (cola, reintentos, baja). El primer envío sería el primer jueves después de la firma y de una prueba con cuentas del equipo. Cuando haya más ciudades, cada una usa su zona horaria.

## 4. Qué se apaga y qué queda

| Aviso | Correo | Push | Dentro de la app |
|---|---|---|---|
| Nuevo evento (lo que sigues) | **Se apaga** | Queda | Queda (Novedades) |
| Cambió la fecha o el lugar | **Se apaga** | Queda | Queda |
| Recordatorio (24 h antes) | **Se apaga** | Queda | Queda |
| Aviso al administrador | Nunca hubo | Queda | Queda |
| Boletín quincenal | **Nuevo** | No | No |
| Bienvenida, control de ficha | Nuevo, una vez | Solo la ficha | — |
| Avisos al artista (L44) | Nunca | Nuevo | Nuevo |

Consecuencias que el founder debe conocer antes de firmar:

- **Quien solo tiene correo y no push** dejaría de enterarse del cambio de fecha o de lugar de un evento al que dijo «Voy». Propuesta: dejar el correo de «cambió la fecha o el lugar» **solo** para quien dijo «Voy» y no tiene push activo. Es una excepción al comentario del founder; si no la quiere, se apaga también y esas personas quedan sin ese aviso (se ve en Novedades al abrir la app).
- **La palanca «Por correo» de Ajustes** pasa a decir «Boletín cada dos semanas». Quien ya la tenía activada empezaría a recibirlo; se le avisa en el primer boletín con una línea. Si el founder prefiere pedir permiso de nuevo, se pregunta con un toque al abrir la app, y solo llega a quienes contestan que sí.
- **Los correos ya encolados** al apagar el envío por evento se terminan de vaciar antes del cambio; el cron diario de recordatorios sigue corriendo para el push.

## 5. Para construir después de la firma

(Nada de esto se hace ahora.) Un tipo nuevo de trabajo «boletín» con su propia tabla, que solo añade; el envío reutiliza el motor de `avisosWorker`; un guion de ensayo que imprime a quién le tocaría y con qué asunto, sin mandar, como el de la invitación al CAPO; y una prueba con cuentas del equipo antes del primer envío real. Los avisos de L43 y L44 se disparan desde donde hoy se liga la cuenta a la ficha (`artistas_cuentas`), se sigue un artista y se etiqueta un artista en un evento.

## Para firma

Lo que necesito que el founder diga: **(1)** los textos de la §2, uno por uno o en bloque; **(2)** «sobresaliente» como *destacado o 3 o más «Voy»*; **(3)** *o* o *y* entre sobresalientes y lugares seguidos; **(4)** 45 días de actividad reciente; **(5)** jueves a las 9:00 cada dos semanas; **(6)** la excepción del cambio de fecha para quien solo tiene correo; **(7)** si quien ya tenía «Por correo» activo pasa al boletín solo o se le vuelve a preguntar.
