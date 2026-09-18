# 098 · El tope de lecturas de cartel

**Fecha:** 2026-09-17 · **Rama:** `tope-de-lecturas` · **OL:** OL-067 · **PR:** pendiente · **Migración:** `20260917160000_tope_de_lecturas.sql`

## Lo primero, y que quede escrito: esto no ahorra dinero

Leer un cartel es lo único de la app que cuesta dinero por uso. Con los precios de hoy ($5 por millón de tokens de entrada, $25 de salida) y la foto ya reducida a 1600 px, **una lectura cuesta entre 2 y 3 centavos de dólar**; el founder llegó al mismo número por su cuenta. Con 85 eventos en producción, **sin ningún tope el mes serían unos pocos dólares**.

Así que el tope **es un fusible contra un accidente** —alguien subiendo cuarenta fotos, un reintento en bucle—, no un ahorro. Eso mandó en todo el diseño: el número tiene que ser lo bastante alto para que nadie real lo tope, porque frenar a quien publica de verdad cuesta más que los centavos que ahorra.

**Y no cubre lo de fuera.** Esto limita lo que gasta la app. El freno de mano es el tope de gasto de la cuenta de Anthropic, que solo puede poner el founder y que a esta fecha **no está puesto**. Se le dijo con esas palabras.

## Lo que pidió y firmó el founder

Pidió limitar las subidas y, al acabarse, ofrecer «volverse promotor de la plataforma». Al discutirlo **descartó su propia idea**: «olvida lo de promotor, no crearemos nuevo rol, solo limitemos subidas por mes. Cuando se les terminen activemos una notificación que les dé la oportunidad de enviar una notificación al panel de admin para pedir mas capacidad […] El contacto y la manera como se resuelve queda del lado del admin.» Y firmó los tres números con un «perfecto, acepto tus propuestas»: **20 al mes**, aviso **a partir de 3** restantes, y **«Dar más» sube a 100**.

También se le hizo ver, y lo aceptó, que un tope **diario** de 1-3 rompía justo al centro cultural que carga su programa del mes de una sentada, que es quien más nos importa. Por eso es mensual.

## Dónde vive cada cosa, y por qué

**El tope de cada quien: tabla propia, no una columna en `perfiles`.** Gestión de cambios pidió protegerlo con un trigger, como `rol`. Se propuso algo mejor y lo aceptó: `perfiles` **se lee sin sesión** (`"perfiles: lectura pública" … using (true)`), y la cabecera de la migración del panel ya dejaba escrito que por eso nada nuevo va ahí. Con una columna, el cupo ampliado de cada quien sería público y seguiría existiendo la vía de escalada, solo que tapada. Con `topes_de_lectura`, que solo lee la administración, **la vía no existe**: no hay candado que romper porque no hay puerta. Sin fila propia, rige el tope base.

**El conteo, en el servidor y en un solo paso.** `apartar_lectura_de_cartel()` comprueba y anota a la vez, dentro de `leerCartelAccion`, antes de llamar al modelo. En dos pasos, dos toques seguidos pasarían los dos; en el cliente se saltaría en diez segundos.

**Las filas de lecturas no guardan nada del cartel:** quién y cuándo. Ni la imagen ni lo que decía. Una fila por lectura y no un contador, porque al llegar la petición el admin necesita distinguir «leyó 20 y publicó 18» de «leyó 20 y publicó 0».

**La petición: un motivo más en `reportes`,** no una tabla nueva. Ya tenía hecho el camino de «Pendiente» (tarjeta, decisión, contador). Dos guardas que puso gestión de cambios: el `check` de `motivo` **se amplía, no se abre**, y como la política de insert solo exigía `creado_por = auth.uid()`, para este motivo se exige además **`objeto_id = auth.uid()`** — si no, se podía pedir capacidad apuntando al perfil de otra persona. Más un índice único parcial: **una petición sin atender por cuenta**.

## Lo que se vio al mirar la pantalla (disciplina front-visual)

La tarjeta del panel funcionaba a la primera, pero mirándola salieron tres cosas que el código no delataba:

1. **El icono era una bandera de reporte.** Pedir cupo no es denunciar a nadie. Ahora lleva el icono del cartel.
2. **El nombre salía dos veces**, una como ficha («Casa de la Cultura · Persona») y otra como quien pide. En una petición de cupo la ficha *es* la persona: se quita la línea de ficha.
3. **Al cerrarla sin dar más decía «Reclamo cerrado; la ficha sigue igual»**, que no es lo que pasó. Ahora dice «Petición cerrada; su cupo sigue igual».

## Verificado

- **Banco de la migración** (`supabase/tests/tope_de_lecturas.mjs`): 34 migraciones aplicadas y **27 comprobaciones en verde**, con control negativo de cada guarda — una cuenta normal no lee las lecturas de nadie, ni los topes, ni inserta lecturas a mano, ni se sube el tope, ni se da más a sí misma (y, como contraprueba, la administración sí puede); no se puede pedir dos veces sin que la atiendan ni pedir para el perfil de otra persona; el cupo se acaba a las 20, lo del mes pasado no cuenta y la administración no se topa con 50 encima.
  **`npm test` no corre estos bancos** (`vitest.config.ts` solo mira `src/**` y `scripts/**`). Se corren a mano:
  ```
  npm install --prefix /tmp/pglite @electric-sql/pglite@0.5.8
  PGLITE=/tmp/pglite node supabase/tests/tope_de_lecturas.mjs
  ```
- `npm run lint` (solo el aviso viejo de `iconos-sn.mjs`), `npm run typecheck`, **353 pruebas en 39 archivos**, `npm run build` en verde.
- **Simulador FLOWYA iPhone SE (iOS 26.3), con el dedo**, contra el respaldo local: los tres estados de la tarjeta (quedan 3 · se acabaron · ya pedida), el toque en «Pedir más» con la escritura comprobada (`tipo: perfil`, `objeto_id` el propio, `motivo: mas_lecturas`), y la tarjeta del panel con sus dos decisiones.

## Lo que falta

Que gestión de cambios revise y aplique la migración, y la firma del founder en su iPhone. Después, `topes-de-campos` (OL-065, bitácora 096).
