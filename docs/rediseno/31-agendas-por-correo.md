# 31 · Agendas de las instituciones por correo

**Fecha:** 2026-09-21 · **Pieza:** OL-107 (D1) · **Rama:** `agendas-por-correo` · Solo documentos, nada de código.

## Qué pidió el founder

De su lista de comentarios (L38, anexo de `docs/ops/COLA_DE_PIEZAS.md`): «Investiga los correos de todas las instituciones artísticas que tenemos en el catálogo. Prepara mensaje de correo presentando proyecto y solicitando que se envíe la agenda mensual, los flyers son suficientes, para poderlos dar de alta en la plataforma. Crea y envía correo masivo pero como con artistas, por lotes.»

Esta pieza entrega la investigación y los borradores. **Nada se manda sin que el founder firme el texto y la lista**, igual que se hizo con la invitación del CAPO (bitácora [056](../bitacora/2026/09/056-invitacion-capo.md)).

## A quién se escribe

Las **47 instituciones** del catálogo que ya están de alta en la plataforma (bitácora [032](../bitacora/2026/09/032-instituciones-y-agendas.md), lista completa en [`scripts/instituciones/lugares.json`](../../scripts/instituciones/lugares.json)): 11 museos estatales y municipales, el Museo Regional Potosino (INAH), 5 escuelas estatales, 2 dependencias de la UASLP con varias sedes (Caja Real, MUNI, Museo de Sitio, CC200, Auditorio Rafael Nieto, Departamento de Arte y Cultura, Biblioteca Universitaria), el IPBA, el CEART, la Cineteca Alameda, 3 casas de cultura de barrio, 2 centros culturales más, 2 teatros más, un teatro del IMSS, un teatro independiente, 2 sedes en Soledad de Graciano Sánchez, la Alianza Francesa, el Centro Cultural Alemán, 3 bibliotecas y archivos, y 2 galerías.

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

## Plan de tandas

Mismo patrón que la invitación del CAPO (bitácora 056): tandas chicas, no un envío masivo de una sola vez.

- **Tanda de prueba (5):** una por cada tipo de fuente (un museo estatal, la UASLP, una casa de cultura de barrio, una institución con sitio propio como el CEART, una galería independiente), para ver qué tasa de respuesta y qué formato de agenda mandan antes de escribirle a las 47.
- **Tandas siguientes (10–12 por semana):** el resto, agrupando por quien administra varias sedes (ver "Advertencia" abajo) para no mandar copias casi iguales al mismo buzón el mismo día.
- **Recordatorio único:** a los 12 días de la primera tanda, un solo recordatorio corto a quien no contestó — no una cadena. Quien contestó "no me escriban más" no vuelve a recibir nada, y quien ya mandó su agenda tampoco.

## Qué se mide

- Tandas mandadas y pendientes (como la bitácora 056 lleva el conteo del CAPO).
- Respuestas: cuántas mandan agenda, cuántas piden más información, cuántas dicen "no me escriban más", cuántas no contestan.
- De las agendas recibidas: cuántos eventos propuestos por la IA se confirman tal cual, cuántos se corrigen a mano y cuántos se descartan (mismo criterio que ya se sigue en la carga de instituciones: solo fecha, hora y año comprobados).
- Si una institución deja de contestar tras el recordatorio, no se le vuelve a escribir hasta el mes siguiente.

## Fuentes ya conocidas (para no repetir investigación cada mes)

`docs/ops/AGENDAS_CULTURALES.md` ya tiene, por institución, dónde publica su agenda cada mes (PDF de la Secretaría de Cultura del Estado, boletines, Facebook, sitios propios) — el correo es un canal más, no sustituye esas fuentes que ya se leen sin pedir nada.

## La lista de correos

Investigada institución por institución, de fuentes públicas oficiales (sitio propio, ficha del Sistema de Información Cultural sic.cultura.gob.mx, o la página de contacto de la Secretaría de Cultura del Estado o de los municipios). **No entra a este repositorio** porque es público: vive en el scratchpad del operador y se entregó al gestor de cambios con su ruta.

- **47 de 47** instituciones tienen un correo propuesto.
- **19** con correo propio, verificado en su sitio o ficha.
- **27** comparten el correo de quien las administra: 17 con la Secretaría de Cultura del Estado, 7 con la UASLP (varias sedes cada uno), 2 con el municipio de Soledad de Graciano Sánchez, 1 con el Ayuntamiento de San Luis Potosí.
- **1** marcado a verificar antes de usarse (el del Ayuntamiento tiene forma de alias personal, no institucional).
- Ningún correo personal se usó a propósito.

Antes de mandar nada, el founder y el gestor deciden cómo tratar los correos compartidos (una invitación por hub pidiendo que la reenvíen, o una por institución con su nombre en el asunto, como se hizo con el CAPO) — está anotado en la entrega al gestor.

## Borrador del mensaje

**Asunto (variante A):** `{Nombre de la institución}, súmate a la agenda de Somos Nosotros`
**Asunto (variante B):** `¿Nos mandas tu agenda de este mes?`

**Cuerpo:**

> Hola,
>
> Somos Nosotros es un directorio sin fines de lucro de centros culturales y agenda de eventos de San Luis Potosí, para que la gente local se conozca. {Nombre de la institución} ya tiene su ficha en la plataforma, tomada de la investigación de instituciones culturales que hicimos en septiembre.
>
> Nos ayudaría muchísimo que nos manden su **agenda o cartelera de este mes** — no hace falta que la preparen: con los mismos carteles, el PDF o el enlace que ya tengan nos basta. Nosotros nos encargamos de subir los eventos a la plataforma.
>
> Pueden contestar este correo con lo que tengan, cuando puedan.
>
> Si prefieren que no les volvamos a escribir, contesten con "no me escriban más" y no les mandamos nada más.
>
> Gracias,
> Somos Nosotros
> somosnosotros.org

**Recordatorio único (a los 12 días, solo a quien no contestó):**

> Hola de nuevo,
>
> Les escribimos hace unos días para pedirles la agenda de {nombre de la institución} y sumarla a Somos Nosotros. Si ya nos la mandaron por otro medio, ignoren este correo. Si no, nos sirve lo que tengan a la mano — cartel, PDF o un enlace.
>
> Si prefieren que no les volvamos a escribir, contesten con "no me escriban más".
>
> Gracias,
> Somos Nosotros

## Reglas duras de esta pieza (recordatorio)

- Nada se envía desde este chat: el texto y la lista los firma el founder.
- Ningún secreto en git; la lista de correos vive fuera del repo.
- Producción no se tocó: la lista de instituciones salió de `scripts/instituciones/lugares.json` y de la bitácora 032, no de una consulta a la base.
