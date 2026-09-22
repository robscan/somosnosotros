# 31 · Agendas de las instituciones por correo

**Fecha:** 2026-09-21 · **Pieza:** OL-107 (D1) · **Rama:** `agendas-por-correo` (PR [#131](https://github.com/robscan/somosnosotros/pull/131), unido a `main`) y su continuación `agendas-por-correo-2` · Solo documentos, nada de código.

## Qué pidió el founder

De su lista de comentarios (L38, anexo de `docs/ops/COLA_DE_PIEZAS.md`): «Investiga los correos de todas las instituciones artísticas que tenemos en el catálogo. Prepara mensaje de correo presentando proyecto y solicitando que se envíe la agenda mensual, los flyers son suficientes, para poderlos dar de alta en la plataforma. Crea y envía correo masivo pero como con artistas, por lotes.»

Esta pieza entrega la investigación y los borradores. **Nada se manda sin que el founder firme el texto y la lista**, igual que se hizo con la invitación del CAPO (bitácora [056](../bitacora/2026/09/056-invitacion-capo.md)).

## Decisiones del founder tras la primera entrega (2026-09-21, en el chat del gestor)

1. **Buzones compartidos:** un correo por organismo (SECULT, UASLP, municipios), nombrando sus sedes y pidiendo que lo reenvíen o que den el contacto de cada una — solo para las sedes que de verdad no tengan correo propio.
2. **Segunda pasada de investigación** antes de escribirle a nadie, buscando mejor correo para las sedes que en la primera pasada quedaron con un buzón compartido asumido. Hecha: ver "La lista de correos" abajo — casi todas resultaron tener correo propio.
3. **Texto:** aprobado con dos cambios — el mensaje lleva el enlace a la ficha de la institución en la plataforma, y firma con una persona: **Oscar Muñiz Blanco · Coordinación de agenda · Somos Nosotros · somosnosotros.org · {teléfono}** (el teléfono real no va en este repositorio público; solo como marcador aquí, se pone al armar el envío).
4. **Dos variantes del mensaje:** una para institución con correo propio (como antes) y otra para organismo, que nombra varias sedes en lista corta y pide reenvío o contacto.
5. **Ritmo:** el founder quiere mandarlo todo el mismo día, con 3 correos de comprobación técnica primero.

## A quién se escribe

De las **47 instituciones** del catálogo (bitácora [032](../bitacora/2026/09/032-instituciones-y-agendas.md), lista completa en [`scripts/instituciones/lugares.json`](../../scripts/instituciones/lugares.json)), el gestor confirmó contra producción (solo lectura) que **46 siguen de alta y visibles**; la Alianza Francesa de San Luis Potosí **no tiene ficha en producción hoy** (ni con un nombre parecido) — se saca del envío y queda aparte para que el founder decida si se da de alta primero. Las 46 son: 11 museos estatales y municipales, el Museo Regional Potosino (INAH), 5 escuelas estatales, 2 dependencias de la UASLP con varias sedes (Caja Real, MUNI, Museo de Sitio, CC200, Auditorio Rafael Nieto, Departamento de Arte y Cultura, Biblioteca Universitaria), el IPBA, el CEART, la Cineteca Alameda, 3 casas de cultura de barrio, 2 centros culturales más, 2 teatros más, un teatro del IMSS, un teatro independiente, 2 sedes en Soledad de Graciano Sánchez, el Centro Cultural Alemán, 3 bibliotecas y archivos, y 2 galerías.

No se investigaron instituciones fuera del catálogo: si en el camino aparece alguna que falte (por ejemplo alguna reportada por el founder o encontrada en una agenda ajena), se propone por separado, con la misma regla de "solo lugares, no negocios" (`docs/DEFINICION.md`).

## Qué se les pide

Un solo llamado, sin trámite: que manden **su agenda o cartelera del mes**, en el formato que ya tengan — cartel, PDF, enlace a su página o red social. No se les pide que llenen ningún formulario ni que se registren: basta con contestar el correo. El mensaje dice de dónde salió su ficha (el catálogo de instituciones culturales investigado en septiembre) y da una salida clara para quien no quiera que le sigan escribiendo.

## A qué buzón contestan

Al mismo correo remitente que ya usa la plataforma para las invitaciones del CAPO (`CORREO_REMITENTE` en Vercel/Resend, nunca en este repo). Las respuestas llegan a esa bandeja; no se abre un buzón nuevo para esta pieza.

## Cómo entra lo que manden a la app

Seguridad primero, igual que con la lectura de carteles (OL-092) y la captura de agendas del grafo cultural (doc [24](24-grafo-cultural.md), sección "candados"):

1. Alguien del equipo (el founder o quien él delegue) recibe el correo con el cartel, PDF o enlace y lo sube a "Registrar evento" como si fuera un cartel cualquiera — la misma pantalla que ya lee carteles con IA.
2. La IA propone los datos (título, fecha, hora, lugar, quién participa); **una persona confirma antes de publicar**, exactamente como hoy: nada se publica solo porque la IA lo leyó.
3. El lugar ya existe en el catálogo (son las 47 instituciones), así que ese paso no hace falta — el evento se liga directo a su ficha.
4. No hay carga automática por correo en esta pieza: es la misma persona que ya publica quien sube cada cartel recibido, a mano, cuando tenga tiempo. Automatizar esa entrada (leer el buzón, proponer eventos solo, etc.) sería una pieza aparte, con su propio candado de gasto — no se construye aquí.

## Plan de envío (decisión del founder: todo el mismo día)

Con 42 correos propios y 3–4 de organismo, el lote es chico (unos 44–45) y cabe en una sola jornada — el founder prefiere mandarlo todo de una vez, no en tandas de varios días como el CAPO (que eran 476 destinatarios). El riesgo no es el volumen, es que caiga en spam o que un solo error de plantilla se repita 45 veces sin que nadie lo note a tiempo.

1. **3 correos de comprobación técnica**, primero: uno a un dominio Hotmail/Outlook (por ejemplo el Museo Nacional de la Máscara), uno a un Gmail (por ejemplo ACHE Galería) y uno a un dominio propio (por ejemplo el Museo Leonora Carrington o la UASLP). Se revisa que lleguen (no a spam), que el enlace a la ficha abra y que el nombre y el asunto salgan bien.
2. **Si los 3 llegan bien:** el resto de la tanda ese mismo día, espaciados unos minutos entre correo y correo (no todos en el mismo segundo) — mismo cuidado que ya usa `scripts/capo/invitar.ts` al mandar uno por uno y anotar cada envío antes del siguiente.
3. **Recordatorio único:** a los 12 días, un solo recordatorio corto a quien no contestó — no una cadena. Quien contestó "no me escriban más" no vuelve a recibir nada, y quien ya mandó su agenda tampoco.

### Qué haría falta para reutilizar el envío del CAPO (sin construirlo todavía)

`scripts/capo/invitar.ts` (bitácora [056](../bitacora/2026/09/056-invitacion-capo.md)) ya resuelve lo difícil: `cargarEnv()` para las llaves sin imprimirlas, `mandarCorreo()` con Resend (mismo remitente `CORREO_REMITENTE`), `enmascarar()` para los informes y el patrón `--ensayo` por defecto / `--enviar` explícito. Para esta pieza, en vez de leer una tabla de Supabase (`contactos_importados`), la lista de 47 instituciones con su correo es fija y corta — no hace falta una consulta, basta un archivo de datos (JSON, como `scripts/instituciones/lugares.json`) con institución, correo, tipo (individual u organismo) y el `id` de su ficha. Haría falta:

- Un archivo `scripts/instituciones/agendas.json` (o similar) con las 47 filas y sus 3–4 agrupaciones por organismo — se arma con la lista de este operador más los `id` que dé el gestor.
- Una función que arme el cuerpo con la variante correcta (institución con enlace a su ficha, u organismo con lista de sedes) — mismo patrón que `armarCorreo()`.
- Una tabla nueva, del mismo tipo que `invitaciones_enviadas`, para no repetir un envío si el script se corre dos veces (por ejemplo `agendas_invitaciones_enviadas`: institución u organismo, correo, tipo, enviado_en, resend_id) — con su migración, sin aplicar hasta que el founder apruebe el texto final.
- Reutilizar `mandarCorreo()` tal cual (es puro y ya está separado del resto del script).

No se construye en esta pieza (era solo investigación y documentos); queda listo para que el founder o el gestor decidan cuándo pasar a código, una vez firmado el texto y con los `id` de las fichas.

## Qué se mide

- Tandas mandadas y pendientes (como la bitácora 056 lleva el conteo del CAPO).
- Respuestas: cuántas mandan agenda, cuántas piden más información, cuántas dicen "no me escriban más", cuántas no contestan.
- De las agendas recibidas: cuántos eventos propuestos por la IA se confirman tal cual, cuántos se corrigen a mano y cuántos se descartan (mismo criterio que ya se sigue en la carga de instituciones: solo fecha, hora y año comprobados).
- Si una institución deja de contestar tras el recordatorio, no se le vuelve a escribir hasta el mes siguiente.

## El enlace a la ficha en el mensaje

La ruta real de la ficha de un lugar es `https://somosnosotros.org/lugares/<id>` (revisado en [`src/app/lugares/[id]/page.tsx`](../../src/app/lugares/%5Bid%5D/page.tsx): el segmento se valida con `esUuid` de `src/lib/formulario`, no es un slug con el nombre — es el `id` de la fila en la tabla `lugares`, un UUID). Para poner el enlace de cada institución en el mensaje hace falta el `id` de producción de sus 47 filas en `lugares`; ese dato no está en `scripts/instituciones/lugares.json` (el script lo dedujo al importar, no lo guardó). **Pedido al gestor:** una consulta de solo lectura, dentro de `begin…rollback`, que devuelva únicamente `id` y `nombre` de las filas de `lugares` cuyo nombre coincida con las 47 de la lista — sin ningún dato de personas. Con esa tabla se arma `https://somosnosotros.org/lugares/{id}` por institución en el mensaje final.

## Fuentes ya conocidas (para no repetir investigación cada mes)

`docs/ops/AGENDAS_CULTURALES.md` ya tiene, por institución, dónde publica su agenda cada mes (PDF de la Secretaría de Cultura del Estado, boletines, Facebook, sitios propios) — el correo es un canal más, no sustituye esas fuentes que ya se leen sin pedir nada.

## La lista de correos

Investigada institución por institución (primera pasada) y luego sede por sede para las que compartían un buzón asumido (segunda pasada, pedida por el founder), de fuentes públicas oficiales: el sitio propio de cada institución, su ficha en el Sistema de Información Cultural (sic.cultura.gob.mx, el directorio federal — cada ficha trae correo y teléfono propios de esa sede exacta, no uno genérico), la página de Facebook de la sede en su sección "Información", y convocatorias o boletines oficiales recientes. **No entra a este repositorio** porque es público: vive en el scratchpad del operador (con la URL exacta y la fecha de consulta de cada correo, y ahora también el `id` de producción y el enlace a su ficha) y se entregó al gestor de cambios con su ruta.

- **46 de 46** instituciones con ficha en producción tienen un correo propuesto, cada uno con su fuente, su URL exacta y la fecha de consulta. (La Alianza Francesa, la 47ª del catálogo, no tiene ficha en producción hoy — ver "A quién se escribe" — así que se queda fuera de este envío.)
- **41** verificados: correo propio de esa sede, tomado de su sitio, su ficha SIC o su Facebook — ya no de un hub asumido.
- **5** quedaron con el único correo público que se encontró siendo el de una persona con nombre, no de un área o institución — **anotados aparte, sin usar hasta que el founder decida:** Museo de Sitio UASLP, Casa de Cultura del Barrio de Tlaxcala, Teatro Carlos Amador (parece administrado por el DIF Estatal, no por la Secretaría de Cultura — a confirmar), Auditorio Rafael Nieto y Centro Cultural Palacio Municipal.
- Ningún correo personal se usó a propósito; los 5 de arriba son la excepción que se reporta, no se manda.

Con la segunda pasada, el "buzón compartido entre muchas sedes" que se suponía en la primera casi no existe: de las 5 que quedaron sin correo propio confiable, solo 2 (Museo de Sitio y Auditorio Rafael Nieto) comparten organismo (UASLP), así que el correo "por organismo" de la decisión 1 del founder aplica a un grupo chico, no a un lote grande:

| Organismo | Correo general | Sedes que le tocarían |
|---|---|---|
| UASLP — Secretaría de Difusión Cultural | el buzón general de Difusión Cultural (en la lista fuera del repo) | Museo de Sitio, Auditorio Rafael Nieto |
| Secretaría de Cultura del Estado | el buzón de contacto de la Secretaría (en la lista fuera del repo) | Casa de Cultura del Barrio de Tlaxcala |
| DIF Estatal o Ayuntamiento (a confirmar por teléfono antes de escribir) | — | Teatro Carlos Amador, Centro Cultural Palacio Municipal |

Con esto: **41 correos individuales** (uno por institución, con su propia ficha) más **2–3 correos por organismo** para las 5 sedes sin correo propio confiable — unos 43–44 correos en total, no 23–25 como se estimó antes de la segunda pasada (esa cifra suponía que la mayoría de las sedes iban a compartir buzón; no fue el caso). En la lista fuera del repo hay una tabla de **orden de envío**: primero los 3 correos de comprobación técnica (elegidos entre instituciones donde un fallo no cuesta nada — no las que ya tienen agenda del mes pendiente de captura), luego el resto.

## Borrador del mensaje

### Variante institución (correo propio, 41 de 46)

**Asunto (variante A):** `{Nombre de la institución}, súmate a la agenda de Somos Nosotros`
**Asunto (variante B):** `¿Nos mandas tu agenda de este mes?`

**Cuerpo:**

> Hola,
>
> Somos Nosotros es un directorio sin fines de lucro de centros culturales y agenda de eventos de San Luis Potosí, para que la gente local se conozca. {Nombre de la institución} ya tiene su ficha en la plataforma, tomada de la investigación de instituciones culturales que hicimos en septiembre: {enlace a la ficha}
>
> Nos ayudaría muchísimo que nos manden su **agenda o cartelera de este mes** — no hace falta que la preparen: con los mismos carteles, el PDF o el enlace que ya tengan nos basta. Nosotros nos encargamos de subir los eventos a la plataforma.
>
> Pueden contestar este correo con lo que tengan, cuando puedan.
>
> Si prefieren que no les volvamos a escribir, contesten con "no me escriban más" y no les mandamos nada más.
>
> Gracias,
> Oscar Muñiz Blanco
> Coordinación de agenda · Somos Nosotros
> somosnosotros.org · {teléfono}

**Recordatorio único (a los 12 días, solo a quien no contestó):**

> Hola de nuevo,
>
> Les escribimos hace unos días para pedirles la agenda de {nombre de la institución} y sumarla a Somos Nosotros. Si ya nos la mandaron por otro medio, ignoren este correo. Si no, nos sirve lo que tengan a la mano — cartel, PDF o un enlace.
>
> Si prefieren que no les volvamos a escribir, contesten con "no me escriban más".
>
> Gracias,
> Oscar Muñiz Blanco
> Coordinación de agenda · Somos Nosotros
> somosnosotros.org · {teléfono}

### Variante organismo (3–4 correos, para las sedes de la tabla de arriba)

**Asunto:** `Somos Nosotros — agendas de {nombre del organismo} en San Luis Potosí`

**Cuerpo:**

> Hola,
>
> Somos Nosotros es un directorio sin fines de lucro de centros culturales y agenda de eventos de San Luis Potosí, para que la gente local se conozca. Ya tenemos fichas de {lista corta de sedes, por ejemplo "el Museo de Sitio y el Auditorio Rafael Nieto"} en la plataforma, tomadas de la investigación de instituciones culturales que hicimos en septiembre.
>
> Nos ayudaría muchísimo que nos ayuden a conseguir su **agenda o cartelera de este mes** — con los carteles, el PDF o el enlace que ya tengan nos basta. Si tienen un correo de contacto directo de cada sede, también nos sirve muchísimo para escribirles a ellas directamente el próximo mes.
>
> ¿Nos pueden reenviar esto a quien corresponda, o darnos el contacto de cada sede?
>
> Si prefieren que no les volvamos a escribir, contesten con "no me escriban más".
>
> Gracias,
> Oscar Muñiz Blanco
> Coordinación de agenda · Somos Nosotros
> somosnosotros.org · {teléfono}

**Recordatorio único:** mismo patrón que la variante institución, adaptado a la lista de sedes.

## Reglas duras de esta pieza (recordatorio)

- Nada se envía desde este chat: el texto y la lista los firma el founder.
- Ningún secreto en git; la lista de correos vive fuera del repo.
- Producción no se tocó: la lista de instituciones salió de `scripts/instituciones/lugares.json` y de la bitácora 032, no de una consulta a la base.
