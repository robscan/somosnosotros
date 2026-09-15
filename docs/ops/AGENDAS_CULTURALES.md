# Agendas culturales de San Luis Potosí: dónde se publican

**Fecha:** 2026-09-14 · Sale de la investigación de instituciones y agendas (bitácora [032](../bitacora/2026/09/032-instituciones-y-agendas.md)). Sirve para llenar la agenda cada mes sin buscar de cero.

## La fuente que más rinde

- **Agenda Cultural mensual de la Secretaría de Cultura del Estado** (PDF): https://cultura.slp.gob.mx/agenda-cultural/ — sale entre el último día del mes anterior y el día 5 (la de septiembre 2026 salió el 2). Trae día, hora, sede y costo del Teatro de la Paz, el IPBA, los museos Federico Silva, Francisco Cossío y del Ferrocarril, las casas de cultura de barrio, la Casa del Poeta, la Biblioteca Central y el Centro de las Artes. Son imágenes: hay que leerla página por página. La de octubre no estaba publicada el 14 de septiembre.
- **Boletines de la Secretaría de Cultura**: https://cultura.slp.gob.mx/noticias/ — una o dos semanas antes de cada evento; se replican en slp.gob.mx/noticias y en Acontecer San Luis (acontecersanluis.wordpress.com).
- **Cartelera Escenarios IMSS-Cultura** (Teatro del IMSS): https://escenariosimsscultura.inba.gob.mx/programacion?teatro=15 — cada función con día y hora; entrada libre.

## Por institución

| Institución | Dónde publica | ¿Se lee sin sesión? |
|---|---|---|
| Teatro de la Paz | Agenda de la Secretaría; Instagram @teatrodelapazslp. Las rentas privadas salen en boleteras (Superboletos, Arema, Ticketmaster) | En parte |
| Orquesta Sinfónica de San Luis Potosí | Facebook oficial; cada concierto se anuncia por boletín una semana antes, sin calendario de temporada | No |
| Centro de las Artes (CEART) | ceartsanluis.mx y Facebook @centrodelasartesslp; también en la agenda de la Secretaría | En parte |
| IPBA y Centro de Difusión Cultural Raúl Gamboa | Facebook @InstitutoPotosinodeBellasArtes (su calendario web no carga); también en la agenda de la Secretaría | En parte |
| Fotovisión 31 (IPBA) | Programa en PDF: https://institutopotosinodebellasartes.com/festival-fotografico-fotovision/ (24 sep – 12 nov 2026) | Sí |
| Museo Federico Silva | Agenda y boletines de la Secretaría (su web no se actualiza desde 2022) | Sí |
| Museo Francisco Cossío (antigua Casa de la Cultura) | museofranciscocossio.org y agenda de la Secretaría | Sí |
| Museo del Ferrocarril | Facebook @museodelferrocarrilslp y agenda de la Secretaría | En parte |
| Museo Laberinto | Facebook e Instagram (museolaberinto.com da error de certificado) | No |
| Museo Nacional de la Máscara, Museo Leonora Carrington | Facebook e Instagram | No |
| Museo Regional Potosino (INAH) | Solo Facebook; no entra en la agenda de la Secretaría | No |
| Casas de cultura de San Miguelito, San Sebastián y Tlaxcala | Facebook de cada una; su programa sale en la agenda de la Secretaría | En parte |
| Casa del Poeta Ramón López Velarde, Biblioteca Central del Estado | Agenda y boletines de la Secretaría | Sí |
| Cineteca Alameda | cinetecaalameda.com.mx (cartelera atrasada); los especiales, por boletín | En parte |
| Cultura Municipal (Ayuntamiento de San Luis Potosí) | Facebook @slpculturampal; su micrositio solo trae 2025 | No |
| Soledad de Graciano Sánchez | municipiosoledad.gob.mx (boletines diarios) y Revista Punto de Vista | Sí |
| UASLP (Caja Real, CC200, MUNI, Auditorio Rafael Nieto) | https://wp.uaslp.mx/noticias/arteycultura/ (boletín pocos días antes) y Facebook de cada sede | En parte |
| Alianza Francesa | https://alianzafrancesa.org.mx/san-luis-potosi/agenda/ | Sí |
| Teatro El Rinoceronte Enamorado | https://www.elrino.mx/ (cartelera por temporada) | Sí |
| ACHE Galería | https://www.achegaleria.com/ (exposiciones, sin horario) | Sí |
| Foros independientes (La Carrilla, La Guarida del Coyote, Vértika, ARTERIA, Aurora Co-Lab, Laboratorio Centro Histórico) | Solo Instagram o Facebook | No |
| Foros de conciertos (Estación Wadley, Multiforo Sónica, Búnker 57, Deppa, Doppler). Son negocios: no entran al directorio (decisión del founder, 2026-09-14) | Songkick y boleteras (Passline, Ticketmania, Boletia) | En parte |

## Festivales por seguir (sin horario publicado al 14 sep 2026)

- **Primer Festival del Danzón de Soledad:** 25 y 26 de septiembre, Plaza Principal y Casa de la Cultura de Soledad.
- **COSMOS Festival Alienígena:** 2 al 4 de octubre, Planetario del Parque Tangamanga I (dato de San Luis Way; confirmar).
- **Festival de Cine UASLP:** 5 al 9 de octubre, CC200.
- **Xantolo en tu Ciudad (Secretaría de Cultura):** en 2025 fue a fines de octubre; 2026 sin anunciar.
- **Festival Internacional de Cine de San Luis Potosí (XIV):** 27 y 28 de noviembre, sedes por anunciar.
- **Letras en San Luis (municipal):** en 2025 fue del 24 al 28 de noviembre; 2026 sin anunciar.
- **Festival de Jazz Jorge Martínez Zapata:** fue en septiembre de 2025; sin anuncio de 2026.

## Trampas conocidas

- Los agregadores (San Luis Way y parecidos) mezclan ediciones pasadas: el "Estupendulo Fest del 3 de octubre" y el desfile de Xantolo "sábado 25 de octubre" eran de 2025. El año se confirma en la fuente oficial.
- En Songkick la hora es la de apertura de puertas, no la de inicio.
- El Sol de San Luis, Código San Luis, CultivArte y LíderLife bloquean la lectura automática; Facebook e Instagram no se leen sin sesión.

## Cada mes

1. Del día 1 al 5: abrir la Agenda Cultural de la Secretaría y pasar lo del mes a `scripts/instituciones/eventos.json` (formato en `scripts/instituciones/instituciones.ts · EventoPropuesto`).
2. Revisar la cartelera IMSS-Cultura y los programas de festivales en curso.
3. Simular y cargar: `node scripts/instituciones/correr.mjs importar-eventos scripts/instituciones/eventos.json --autor <id del admin> --simular`, y sin `--simular` cuando el informe esté bien (se salta lo que ya está).
