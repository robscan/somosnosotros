# 157 · Envío del correo a instituciones: guion, migración y ensayo (OL-122)

**Fecha:** 2026-09-22
**Rama:** `correo-instituciones-envio` (base `origin/main`, `307cb64`)
**Pieza:** OL-122, reservada por el gestor junto con la bitácora 157 y la migración `20260922190000_agendas_invitaciones.sql` (commit `f9333a4`).

## Qué pedía

La pieza «envío» de D1 (doc [31](../../../rediseno/31-agendas-por-correo.md)): el guion que manda el correo a las 46
instituciones con ficha, calcando el del CAPO (bitácora [056](056-invitacion-capo.md)), con el plan de envío que
decidió el founder (3 correos de comprobación técnica, luego el resto el mismo día, recordatorio único a los 12
días) y las dos variantes del mensaje (institución con enlace a su ficha; organismo con la lista de sus sedes).
**Nada se manda desde esta pieza:** el envío lo ordena el founder y lo corre el gestor.

## Qué se hizo

### 1. Módulo común `scripts/lib/correo-envio.ts`

`cargarEnv()`, `mandarCorreo()` y `enmascarar()` salen tal cual de `scripts/capo/invitar.ts` (sin cambiar una
línea de su cuerpo) y el guion del CAPO las importa y las reexporta: nada que importe de ahí cambia (sus 7
pruebas siguen pasando).

### 2. `scripts/instituciones/agendas.json` (sin correos)

46 filas: `lugarId`, `slug` (los que el gestor comprobó en producción el 2026-09-22), `nombre`, `variante`.
41 con `variante: "institucion"`; 5 con `variante: "organismo"` (las cinco que en la lista privada solo tienen el
correo de una persona): Museo de Sitio UASLP y Auditorio Rafael Nieto → `Difusión Cultural UASLP`; Casa de
Cultura del Barrio de Tlaxcala → `Secretaría de Cultura del Estado`; Teatro Carlos Amador → `DIF Estatal` y
Centro Cultural Palacio Municipal → `Dirección de Cultura Municipal (Ayuntamiento de San Luis Potosí)`, estas
dos con `sinCorreo: true` porque el doc 31 los deja «a confirmar por teléfono antes de escribir». Los tres de
comprobación técnica llevan `comprobacion: 1|2|3` (Hotmail, Gmail, dominio propio, en ese orden). Una prueba
unitaria lee el archivo real y comprueba que no contenga ningún «@».

Los correos viven fuera del repo, en `/Users/apple-1/somosnosotros-privado/agendas-correos.csv` (generado de
la lista privada de OL-107; formato `clave,correo,contesto`, donde `clave` es el `lugarId` o el nombre del
organismo; `contesto` vacío hasta que alguien conteste). La ruta se le da al guion en `AGENDAS_CORREOS_CSV`.

### 3. `scripts/instituciones/invitar-agendas.ts`

- `--ensayo` por defecto: no manda ni escribe; imprime el reparto con correos enmascarados y un ejemplo de
  cada variante. En ensayo borra `RESEND_API_KEY` del proceso por si acaso.
- `--enviar` solo manda con `--confirmo` explícito, un reparto explícito, `RESEND_API_KEY`, `AGENDAS_SAL`,
  `FIRMA_TELEFONO` y las llaves de Supabase; si falta cualquiera, se detiene sin mandar.
- Reparto: `--comprobacion` (los 3), `--resto` (las demás instituciones, en el orden de la lista),
  `--organismos` (un correo por organismo con sus sedes, aparte porque el doc 31 los deja para el final) y
  `--recordatorio` (quien no contestó según `contesto`, con primer envío hace 12 días o más y sin recordatorio).
- Un correo a la vez, pausa aleatoria de 60–120 s entre correos; cada envío se anota en
  `agendas_invitaciones_enviadas` **antes** del siguiente; si no se puede anotar, se detiene para no repetir.
- No repite: quita a quien ya recibió ese tipo (según la base, por hash) y, dentro de la misma tanda, a quien
  comparte buzón con alguien anterior (ver «Hallazgos»).
- `armarCorreo()` puro: texto y HTML de las dos variantes y del recordatorio, con el texto firmado del doc 31
  y la firma «Oscar Muñiz Blanco · Coordinación de agenda · Somos Nosotros · somosnosotros.org · {teléfono}»,
  con el teléfono de `FIRMA_TELEFONO`. Asunto A por defecto, `--asunto=B` para la variante en pregunta.
- Mismo remitente `CORREO_REMITENTE` y misma llamada a Resend que el CAPO.

### 4. Migración `supabase/migrations/20260922190000_agendas_invitaciones.sql` (solo añade; NO aplicada)

Tabla `agendas_invitaciones_enviadas` (`id`, `lugar_id` nulo, `organismo` nulo, `correo_hash` SHA-256 con sal
`AGENDAS_SAL` —nunca el correo en claro; un `check` exige 64 hex—, `tipo` en comprobacion/tanda/recordatorio,
`enviado_en`, `resend_id`), `unique (correo_hash, tipo)`, `check` de que haya lugar u organismo, RLS activa sin
políticas y permisos revocados a `anon` y `authenticated`: solo `service_role`. Banco
`supabase/tests/pg/agendas-invitaciones.test.mjs`: anon y authenticated no leen ni escriben (42501);
service_role sí; repetir el mismo tipo al mismo hash falla (23505); otro tipo entra; tipo inválido, sin destino
o correo en claro se rechazan (23514); sin políticas.

### 5. Pruebas

`scripts/instituciones/invitar-agendas.test.ts` (23): lectura del CSV, casado de filas y contactos, reparto,
las dos variantes y el recordatorio (enlace por slug, firma con el teléfono de la variable, escape HTML),
hash (64 hex, normaliza mayúsculas y espacios, cambia con la sal, no calcula sin sal), omisiones por envío
previo y por buzón repetido, recordatorio a los 12 días, argumentos y el archivo real `agendas.json`.

## Evidencia

- `npm run lint`: 0 errores (una advertencia previa en `docs/diseno/logotipo/iconos-sn.mjs`, ajena).
- `npm run typecheck`: verde. `npm test`: 77 archivos, **916 pruebas** en verde. `npm run build`: verde.
- `TEST_DATABASE_URL=postgresql://apple-1@127.0.0.1:5432/sn_control npm run test:db`: **55 migraciones, 816
  comprobaciones, 0 fallaron** (Postgres 17 local, base creada y borrada en la corrida).
- Sin capturas: no hay pantalla.

## Ensayo (llaves en blanco, sin `RESEND_API_KEY`, sin Supabase, sal solo del ensayo)

```
AGENDAS_CORREOS_CSV=<ruta privada> RESEND_API_KEY= NEXT_PUBLIC_SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= \
AGENDAS_SAL=<sal de ensayo> FIRMA_TELEFONO= npx tsx scripts/instituciones/invitar-agendas.ts --ensayo
```

Salida (recortada a 3 filas por reparto; correos enmascarados por el propio guion):

```
Ensayo: no se manda nada ni se escribe en la base.
Sin llaves de Supabase: no se comprueban envíos previos (todo cuenta como pendiente).
Sin FIRMA_TELEFONO: la firma sale con el marcador {teléfono}.

46 filas en agendas.json · 43 contactos en el CSV · 43 destinos con correo · 2 sin correo
  (sin correo) Teatro Carlos Amador — DIF Estatal: sin correo de área confirmado
  (sin correo) Centro Cultural Palacio Municipal — Dirección de Cultura Municipal (Ayuntamiento de San Luis Potosí): sin correo de área confirmado

--comprobacion: 3 correos
- Museo Nacional de la Máscara · mu…@hotmail.com
- ACHE Galería · ga…@gmail.com
- Museo Leonora Carrington · di…@leonoracarringtonmuseo.org

--resto: 36 correos
- Museo Laberinto de las Ciencias y las Artes · in…@museolaberinto.com
- Museo Regional Potosino (INAH) · di…@inah.gob.mx
- Museo Federico Silva Escultura Contemporánea · co…@gmail.com
  …
  (omitido) Centro Cultural Julián Carrillo · co…@gmail.com — mismo buzón que Museo del Ferrocarril Jesús García Corona en esta tanda
  (omitido) Galería José Jayme · co…@gmail.com — mismo buzón que Museo del Ferrocarril Jesús García Corona en esta tanda

--organismos: 2 correos
- Difusión Cultural UASLP · di…@uaslp.mx · sedes: Museo de Sitio UASLP y Auditorio Rafael Nieto
- Secretaría de Cultura del Estado · of…@hotmail.com · sedes: Casa de Cultura del Barrio de Tlaxcala

--recordatorio: 0 correos

--- Ejemplo variante institución: Museo Nacional de la Máscara · mu…@hotmail.com ---
Asunto: Museo Nacional de la Máscara, súmate a la agenda de Somos Nosotros
Hola,

Somos Nosotros es un directorio sin fines de lucro … ya tiene su ficha en la plataforma …:
https://somosnosotros.org/lugares/museo-nacional-de-la-mascara
…
Gracias,
Oscar Muñiz Blanco
Coordinación de agenda · Somos Nosotros
somosnosotros.org · {teléfono}
```

**No se mandó ningún correo.** Total del plan: 3 + 36 + 2 = 41 correos (más 2 omitidos por buzón repetido y 2
sedes sin correo de área).

## Hallazgos para el gestor y el founder

1. **Tres instituciones comparten el buzón de contacto de la Secretaría de Cultura** (Museo del Ferrocarril,
   Centro Cultural Julián Carrillo y Galería José Jayme). Con la regla pedida («no se repite un envío del mismo
   tipo al mismo hash») solo sale el primero y los otros dos quedan omitidos y avisados. Si el founder prefiere
   que reciban tres correos con tres fichas, o uno solo que nombre las tres, hay que decidirlo antes del envío.
2. **Asunto del recordatorio:** el doc 31 no lo fija; el guion usa «Recordatorio: la agenda de {nombre} en
   Somos Nosotros» (organismo: «Recordatorio: agendas de {organismo} en Somos Nosotros»). Cambiar es una línea.
3. **`--organismos` va aparte de `--resto`** porque el doc 31 los deja «al final, después de ver cómo respondió
   el resto». Teatro Carlos Amador y Centro Cultural Palacio Municipal no salen hasta confirmar su organismo
   por teléfono: basta quitar `sinCorreo` y añadir la fila del organismo al CSV privado.
4. **Variables nuevas para el envío real** (en `.env` del gestor, nunca en el repo): `AGENDAS_CORREOS_CSV`,
   `AGENDAS_SAL` (cualquier cadena larga; si cambia, la base deja de reconocer los envíos previos) y
   `FIRMA_TELEFONO`.

## Queda

- Firma del founder sobre texto final, variante de asunto (A o B) y la decisión del hallazgo 1.
- El gestor aplica la migración y corre `--enviar --confirmo --comprobacion`, revisa que lleguen, y luego
  `--resto`; `--organismos` cuando el founder lo diga; `--recordatorio` a los 12 días.
- Limpiar del ensayo: nada (el guion no escribe).

## Firma

Pendiente del founder.
