# Prompt para investigar agendas en redes sociales desde Chrome

**Fecha:** 2026-09-15 · Pedido por el founder: los museos y foros anuncian sus eventos en Facebook e Instagram, que no se leen sin sesión. Con la extensión de Claude en Chrome (sesión del founder abierta) se pueden recorrer las cuentas y sacar los eventos con su cartel. Complementa a [AGENDAS_CULTURALES.md](AGENDAS_CULTURALES.md).

## Cómo se usa

1. Abrir Chrome con la sesión de Facebook e Instagram iniciada y la extensión de Claude activa.
2. Pegar el prompt de abajo. Se puede acotar a una tanda de cuentas (5 o 6 por corrida) cambiando la lista.
3. El resultado es un JSON con el formato de `scripts/instituciones/eventos.json` más un campo `imagen` (URL directa del cartel) e `imagen_pagina` (la publicación). Guardarlo como `scripts/instituciones/eventos-redes-AAAA-MM.json`.
4. Cargar en dos pasos, el mismo día (las URLs de imagen de Facebook e Instagram caducan en horas):
   ```bash
   node scripts/instituciones/correr.mjs importar-eventos scripts/instituciones/eventos-redes-2026-10.json --autor <id del admin> --simular
   ```
   ```bash
   node scripts/fotos/correr.mjs eventos scripts/instituciones/eventos-redes-2026-10.json --autor <id del admin>
   ```
   (el segundo baja cada cartel y lo sube a nuestro espacio de fotos; empareja por título).

## Prompt

```
Eres mi asistente para llenar la agenda cultural de San Luis Potosí en somosnosotros.org. Recorre las cuentas de abajo (yo ya tengo la sesión abierta) y saca todos los eventos ANUNCIADOS PARA LOS PRÓXIMOS 45 DÍAS a partir de hoy. No inventes nada: si un dato no está en la publicación, déjalo vacío.

Para cada cuenta: abre el perfil, revisa las últimas 15 publicaciones y las historias destacadas de "Agenda" o "Cartelera" si existen. Abre cada publicación que anuncie un evento con fecha y lee el texto completo (y el texto del cartel si es imagen).

Por cada evento devuélveme UN objeto JSON con estos campos:
- "titulo": corto y claro, sin mayúsculas sostenidas ni emojis.
- "lugar": el nombre exacto de la sede si es una de las de la lista de sedes de abajo; si no, déjalo vacío y pon "sitio" con el nombre que dicen ellos (por ejemplo "Plaza de Armas").
- "fecha": AAAA-MM-DD. "hora": HH:MM en 24 h. "hora_fin": HH:MM o vacío.
- "precio": "Gratis" o el texto del costo tal cual ("$150", "$100 general, $80 estudiantes").
- "descripcion": dos o tres frases con lo que es, quién participa y para quién; sin hashtags.
- "enlace": la URL de boletos o de más información si la dan; si no, la URL de la publicación.
- "artistas": lista con los nombres de quienes se presentan (grupos, compañías, solistas), tal como los escriben.
- "imagen": la URL directa de la imagen del cartel (clic derecho → copiar dirección de la imagen, o la del <img> más grande de la publicación).
- "imagen_pagina": la URL de la publicación.
- "fuente": el nombre de la cuenta.

Si un evento tiene varias funciones, un objeto por función. Si la misma publicación anuncia un ciclo ("todos los jueves de octubre"), un objeto por fecha. Si no estás seguro del año, usa el que haga la fecha futura y más cercana.

Al terminar, dame: (1) el JSON completo como un solo arreglo, (2) una lista corta de cuentas que no pudiste leer o que no tenían eventos, (3) dudas concretas (fechas ambiguas, sedes que no reconociste).

Cuentas que revisar (Instagram = IG, Facebook = FB):
- Teatro de la Paz: IG @teatrodelapazslp
- Orquesta Sinfónica de San Luis Potosí: FB Orquesta Sinfónica de San Luis Potosí
- Centro de las Artes de San Luis Potosí Centenario (CEART): FB @centrodelasartesslp · IG @ceartslp
- Instituto Potosino de Bellas Artes (IPBA): FB @InstitutoPotosinodeBellasArtes
- Museo del Ferrocarril Jesús García Corona: FB @museodelferrocarrilslp
- Museo Laberinto de las Ciencias y las Artes: FB e IG @museolaberinto
- Museo Nacional de la Máscara: FB e IG @museonacionaldelamascara
- Museo Leonora Carrington: FB e IG @museoleonoracarrington
- Museo Regional Potosino (INAH): FB Museo Regional Potosino
- Museo Federico Silva Escultura Contemporánea: FB Museo Federico Silva
- Museo Francisco Cossío: FB e IG @museofranciscocossio
- Museo de Arte Contemporáneo (MAC): FB e IG @macslp
- Casa de Cultura del Barrio de San Miguelito, de San Sebastián y de Tlaxcala: FB de cada una
- Cineteca Alameda: FB e IG @cinetecaalameda
- Cultura Municipal (Ayuntamiento de San Luis Potosí): FB @slpculturampal
- Secretaría de Cultura de San Luis Potosí: FB e IG @culturaslp
- UASLP Arte y Cultura (Caja Real, CC200, MUNI, Auditorio Rafael Nieto): FB Cultura UASLP
- Alianza Francesa de San Luis Potosí: FB e IG @afslp
- Teatro El Rinoceronte Enamorado: FB e IG @elrinoceronteenamorado
- La Carrilla, La Guarida del Coyote, Vértika, ARTERIA, Aurora Co-Lab, Laboratorio Centro Histórico: IG de cada uno

Sedes registradas (usa el nombre exacto en "lugar"): Teatro de la Paz · Centro de las Artes de San Luis Potosí Centenario (CEART) · Instituto Potosino de Bellas Artes (IPBA) · Museo del Ferrocarril Jesús García Corona · Museo Laberinto de las Ciencias y las Artes · Museo Nacional de la Máscara · Museo Leonora Carrington · Museo Regional Potosino · Museo Federico Silva Escultura Contemporánea · Museo Francisco Cossío · Museo de Arte Contemporáneo (MAC) · Casa de Cultura del Barrio de San Miguelito · Casa de Cultura del Barrio de San Sebastián · Casa de Cultura del Barrio de Tlaxcala · Cineteca Alameda · Casa del Poeta Ramón López Velarde · Biblioteca Central del Estado · Centro Cultural Universitario Caja Real · Centro Cultural Universitario Bicentenario (CC200) · MUNI Museo Universitario UASLP · Alianza Francesa de San Luis Potosí · Teatro El Rinoceronte Enamorado · Teatro del IMSS San Luis Potosí. La lista completa está en scripts/instituciones/lugares.json.
```

## Notas

- Los nombres de cuenta con `@` son los conocidos al 2026-09-15; si uno no existe, buscar la institución por nombre dentro de la red.
- Los foros comerciales (Estación Wadley, Multiforo Sónica, Búnker 57) no entran al directorio (decisión del founder), pero sus eventos sí pueden ir con `sitio` y sin `lugar`.
- Las imágenes de Facebook e Instagram son de cada institución: se usan como cartel del evento que ellas mismas anuncian, con el enlace a la publicación de origen.
