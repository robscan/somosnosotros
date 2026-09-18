# 23 · El tope de lecturas de cartel

**Estado:** **firmada por el founder el 2026-09-17** («perfecto, acepto tus propuestas»). **Prototipo:** [`prototipos/tope-de-lecturas.html`](prototipos/tope-de-lecturas.html) · **OL:** OL-067 · **Bitácora:** [098](../bitacora/2026/09/098-tope-de-lecturas.md)

## Lo que pidió el founder

2026-09-17, al ver funcionando la tarjeta del cartel (doc [22](22-cartel-aparte.md)):

> «aquí se me ocurre una regla, limitar la cantidad de subidas para no rebasar demasiado el gasto de ia […] y luego decirle que se llegó al limite, pero si necesita subir más, que puede volverse promotor de la plataforma y obtener mas subidas diarias. Las subidas serán ilimitadas siempre para admins.»

Y al rato, después de discutirlo:

> «olvida lo de promotor, no crearemos nuevo rol, solo limitemos subidas por mes. Cuando se les terminen activemos una notificación que les dé la oportunidad de enviar una notificación al panel de admin para pedir mas capacidad y el admin sepa que ellos quieren más. El contacto y la manera como se resuelve queda del lado del admin.»

## Lo primero, con números: esto no ahorra dinero

Leer un cartel es lo único de la app que cuesta dinero por uso: una llamada a Claude Opus 5 con la imagen. A los precios de hoy ($5 por millón de tokens de entrada, $25 de salida) y con la foto ya reducida a 1600 px (`lib/imagen.ts`), **una lectura cuesta entre 2 y 3 centavos de dólar**. El founder llegó al mismo número por su cuenta.

Con 85 eventos en producción, **sin ningún tope el gasto del mes serían unos pocos dólares**. Así que el tope **no es un ahorro: es un fusible** contra un accidente — alguien subiendo cuarenta fotos, un reintento en bucle, una prueba que se va de las manos. Eso manda en todo el diseño: el número tiene que ser lo bastante alto para que nadie real lo tope, porque frenar a quien publica de verdad cuesta más que los centavos que ahorra.

**Y no cubre lo de fuera.** El tope limita lo que gasta la app. El freno de mano es el tope de gasto de la cuenta de Anthropic, que solo puede poner el founder y que a esta fecha **no está puesto**.

## Lo decidido

| | |
|---|---|
| **Cuánto** | **20 lecturas al mes** por cuenta registrada. Cubre a un centro cultural que carga su programa del mes (8-12 carteles) con margen para los que salgan mal. Peor caso: 50 centavos de dólar por persona y mes. |
| **Por mes, no por día** | Un tope diario de 1-3 rompía justo al que carga su programa de una sentada, que es quien más nos importa. |
| **Cuándo se renueva** | El día 1 de cada mes. Se explica en una frase: «se renuevan el 1 de octubre». |
| **Las fallidas cuentan** | Una lectura que falla cuesta lo mismo. Con 20 al mes, un par de fallos no le arruinan el mes a nadie. |
| **Admin sin tope** | Comprobado en el banco de pruebas, no solo en la pantalla. |
| **Sin rol nuevo** | El founder descartó su propia idea del «promotor». |
| **Al acabarse** | Un aviso con **una sola salida**: pedir más capacidad. Llega al panel de administración. El contacto y cómo se resuelve, fuera de la app. |

## Dónde vive cada cosa (y por qué)

**El tope de cada quien: en su propia tabla, no en `perfiles`.** La primera idea era una columna en el perfil protegida con un trigger, como se protegió `rol`. Se descartó por dos razones: `perfiles` **se lee sin sesión** (`"perfiles: lectura pública" … using (true)`, `base.sql:123`) — y la cabecera de `panel_administracion.sql:8-9` ya dejó escrito que por eso nada nuevo va ahí — así que el cupo ampliado de cada quien sería público; y porque una columna en una tabla que la propia cuenta puede actualizar es una vía de escalada que hay que tapar. Con **`topes_de_lectura`**, que solo lee y escribe la administración, **la vía no existe**: no hay candado que romper porque no hay puerta. Sin fila propia, rige el tope por defecto; la tabla solo guarda las excepciones.

**Lo que le queda a cada quien:** una función `security definer` que devuelve **solo lo de quien llama**, con `revoke execute … from public, anon`. El mismo patrón que el founder firmó en el doc 21.

**El conteo: en el servidor**, dentro de `leerCartelAccion`, antes de llamar al modelo, junto a la comprobación que ya existe de que la imagen es nuestra. En el cliente se salta en diez segundos.

**Las filas de lecturas no guardan nada del cartel**: solo quién y cuándo. Ni la imagen, ni lo que decía, ni si salió bien — para decidir una petición basta con cuántas leyó y cuántas publicó. Una fila por lectura y no un contador, porque al llegar la petición el admin necesita distinguir «leyó 20 y publicó 18» de «leyó 20 y publicó 0». Las lee solo la administración; nadie inserta desde el cliente.

**La petición: un motivo más en `reportes`,** no una tabla nueva. `reportes` ya sirve para reportes *y* reclamos, y ya tiene el camino entero hecho (`panel_pendientes()` → `Pendientes.tsx` → `decidirPendiente()`), más el contador de Ajustes. La petición es `tipo: 'perfil'`, `objeto_id` = el propio, `motivo: 'mas_lecturas'`. Hereda el vocabulario del doc 19 y el panel no cambia de forma. **Una pendiente por cuenta** (índice único parcial donde `not atendido`), para que nadie pueda llenar el panel.

Dos guardas que salieron de la revisión: el `check` de `motivo` **se amplía, no se quita**; y como la política de insert de `reportes` solo exige `creado_por = auth.uid()`, para este motivo se exige además **`objeto_id = auth.uid()`** — si no, alguien podría pedir capacidad apuntando al perfil de otra persona.

## Las pantallas (lo que necesita firma)

Todo lo demás es servidor. Lo que se ve es esto, y son tres estados nuevos de la tarjeta del cartel (que ya tiene cuatro: llega, leyendo, leído, falló) más una tarjeta en el panel.

1. **Quedan pocas.** A partir de 3 restantes, la tarjeta de siempre cambia su línea de detalle por «Te quedan 3 lecturas este mes». Antes de eso no se dice nada: quien tiene 17 no necesita saberlo. Así nadie se topa con el final de sorpresa.
2. **Se acabaron.** La tarjeta cambia de tono y dice «Se acabaron tus lecturas del mes» · «Se renuevan el 1 de octubre», con una sola salida: **Pedir más**. En este estado la tarjeta **deja de abrir la cámara**: es un botón, no una etiqueta con un campo de archivo dentro. El formulario sigue debajo, así que llenar a mano nunca se bloquea.
3. **Ya pedida.** «Ya pedimos más para ti» · «Te escribimos en cuanto lo revisemos». Sin acción: no se puede pedir cuarenta veces.
4. **En el panel**, dentro de «Pendiente», con el dibujo del doc 19 (una tarjeta, una decisión): quién pide, su ficha como enlace, **cuántas leyó y cuántas publicó ese mes** —el dato con el que se decide— y cuándo. Acción: **Dar más**. Reverso: **Dejarlo así**.

## Los tres números, firmados

El founder aceptó las tres propuestas tal cual:

1. **«Dar más» sube esa cuenta a 100 lecturas al mes.** Generoso de verdad (2,50 dólares al mes en el peor caso) y sigue siendo un número. Se descartó que el admin escriba la cifra: sería una decisión más por tarjeta y rompe el «una tarjeta, una decisión» del doc 19. Si alguien necesita más de 100, ya hay conversación abierta con el admin.
2. **El aviso de «quedan pocas» aparece a partir de 3 restantes.** Antes no se dice nada: quien tiene 17 no necesita saberlo.
3. **20 al mes** es el tope por defecto. Se valoró 10 (llegan más peticiones y te enteras antes de quién publica en serio) y se descartó: en dinero da igual, y 20 no frena a nadie real.

## Nota de código

`accionDe()` (`src/lib/panel.ts:338`) devuelve `null` cuando `tipo === "perfil"`, porque hoy una persona reportada solo se puede cerrar. El motivo nuevo necesita su caso **antes** de esa salida, o la tarjeta llegará sin el botón de «Dar más».
