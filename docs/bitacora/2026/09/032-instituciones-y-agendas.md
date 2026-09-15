# 032 · Instituciones culturales y agendas

**Fecha:** 2026-09-14 · **Ramas:** `instituciones-y-tipos` → [PR #32](https://github.com/robscan/somosnosotros/pull/32) y `eventos-pasados-ocultos` → [PR #33](https://github.com/robscan/somosnosotros/pull/33), fusionados y desplegados el mismo día · **Pieza:** OL-016

## Qué pidió el founder
Investigar centros culturales de San Luis Potosí que no estuvieran en la base (museos, casas de cultura, escuelas de arte y otras instituciones), darlos de alta primero, luego localizar sus agendas y proponer eventos para la agenda.

## Cómo se investigó
Seis búsquedas en paralelo: museos; casas de cultura, centros culturales y teatros; escuelas de arte; galerías, bibliotecas y espacios independientes (más los 5 lugares del CAPO sin dirección); agenda del Estado; agenda municipal, universitaria e independiente. Reglas: solo lugares con evidencia de 2025 o 2026, dirección con calle y número, descripciones con redacción propia, sin fotos, y eventos solo con fecha, hora y año 2026 comprobados. A media investigación se agotó el cupo de 200 búsquedas web de la sesión (lo comparten los subagentes); lo demás se sacó leyendo páginas directas.

Punto de partida: 14 lugares (13 del CAPO) y 0 eventos. Encontrado: 101 registros de lugares (con repetidos entre búsquedas) y 64 eventos candidatos.

## Lo que entró: 48 lugares, en producción
Curado a mano. Quedó fuera lo cerrado o sin evidencia reciente (Ecomuseo en remodelación, Teatro Alarcón, Museo de Tauromaquia…), lo repetido entre búsquedas (Caja Real, Mariano Jiménez, Raúl Gamboa, Casa del Poeta), lo que vive dentro de otro recinto (Teatro Polivalente y escuela del Centro de las Artes, Galería Sótano del Teatro de la Paz, librería del FCE) y lo que no tiene dirección.

- **Museos (15):** Laberinto, Nacional de la Máscara, Regional Potosino (INAH), Federico Silva, Leonora Carrington, Francisco Cossío (la antigua Casa de la Cultura), del Virreinato, Casa Museo Manuel José Othón, MAC, del Ferrocarril, Casa Museo Mariano Jiménez, Caja Real y MUNI (UASLP), Museo de Sitio UASLP, Casa Doña María Pons.
- **Escuelas (8):** IPBA; escuelas estatales de Danza, Música, Teatro y Artes Plásticas; Iniciación Musical Julián Carrillo; Arte y Cultura UASLP; Academia Andalucía · Mancha Gitana.
- **Teatros, casas de cultura y centros (17):** Teatro de la Paz, Centro de las Artes, Cineteca Alameda, casas de cultura de Tlaxcala, San Sebastián y San Miguelito, Centro Cultural Julián Carrillo, Centro de Difusión Cultural Raúl Gamboa, Teatro Carlos Amador, CC200, Auditorio Rafael Nieto, Centro Cultural Palacio Municipal, Teatro del IMSS, Teatro El Rinoceronte Enamorado, Casa del Poeta Ramón López Velarde y, en Soledad, el Teatro Doroteo Arango y la Casa de la Cultura.
- **Otros (8):** Alianza Francesa, Centro Cultural Alemán, Biblioteca Central del Estado, Biblioteca Pública Nereo Rodríguez Barragán, Biblioteca Pública Universitaria, Archivo Histórico del Estado, Galería José Jayme, ACHE Galería.

Cómo entran: publicados por la cuenta admin del founder, como Laboratorio Centro Histórico (un lugar sin autor y sin origen dice "Publicado por una cuenta borrada"); sin `origen` y sin foto. Tipos con la lista de hoy, sin migración: museo → Galería (como ya lo deduce el alta desde Mapbox, `lib/buscarLugares · deducirTipo`), teatro y cine → Foro, centro cultural → Casa de cultura, escuela → Otro (el IPBA, que da talleres a todo público, como Casa de cultura). Toda la base (59) por tipo: Casa de cultura 16, Galería 15, Otro 13, Foro 10, Biblioteca 3, Colectivo 2.

## Scripts (`scripts/instituciones/`)
- `instituciones.ts`: funciones puras (tipo por categoría, nombres que coinciden, caja de la ciudad, calle y número, elección del pin, formulario de evento, lugar por nombre); 17 pruebas en `instituciones.test.ts`.
- `importar.ts`: da de alta lugares con la validación del formulario (`validarLugar`); salta los nombres que ya existen; `--simular`.
- `importar-eventos.ts`: carga eventos con `validarEvento`; salta lo pasado y lo repetido (mismo título a la misma hora); liga artistas solo con nombre exacto y el informe dice con quién; no manda avisos; `--simular`.
- `entorno.ts` (argumentos, `.env`, informe) y `correr.mjs` (compila con esbuild dentro de `node_modules/.cache` para encontrar `@supabase/supabase-js` sin ensuciar git).
- El pin: Mapbox por nombre (la puerta del edificio) contra Mapbox por dirección. Si discrepan, desempatan las coordenadas de la fuente (fichas del SIC) o que el lugar hallado por nombre tenga la calle y el número investigados; una dirección que Mapbox interpola nunca le gana a una ficha oficial. Lo pidieron el MAC (su dirección caía a 4,5 km), el Teatro Doroteo Arango (1,7 km) y la Casa de Cultura de San Miguelito (411 m). Las coordenadas del SIC coincidieron a unos 50 m con los puntos por nombre en todos los museos.

## Eventos: propuesta (cargada después, ver abajo)
`scripts/instituciones/eventos.json`: 35 eventos (48 funciones) del 17 de septiembre al 6 de diciembre, de fuentes oficiales: Agenda Cultural de septiembre 2026 de la Secretaría de Cultura, programa de Fotovisión 31 (IPBA), cartelera Escenarios IMSS-Cultura y boletines de la Secretaría. Simulación: los 48 encuentran su sede; ninguno se liga a un artista del CAPO. Fuera a propósito: conciertos de Songkick (hora de puertas), tributo a Metallica (precio de agregador), sedes sin dirección (La Casa de las Bóvedas) y lo de año dudoso (Xantolo "sábado 25 de octubre" y Estupendulo Fest eran de 2025).

Dónde publica cada institución y la rutina de cada mes: [AGENDAS_CULTURALES.md](../../../ops/AGENDAS_CULTURALES.md).

## Visto al revisar
- Durante este chat alguien borró de la base VAGO GALERÍA, el Taller de expresión artística INTEGRAME DOWN y Ático Espacio Escénico Independiente. No fue este trabajo (solo se insertó) y la base no guarda quién. Si se repite la importación del CAPO, volverían.
- Pendientes del CAPO: CM Produzioni (Sensea) no es potosina y no se da de alta; la Carpa Medel es itinerante (sus funciones irían como evento en otro sitio, por ejemplo el Jardín de Tlaxcala); Casa-estudio 1864, Gallery 337 y BajoCeiba no tienen dirección pública.

## Evidencia
Lint del proyecto, 119 pruebas (19 archivos) y typecheck en verde. Informes de cada alta con el pin y cómo se eligió. Producción a 390×844: `/lugares?vista=lista` dice "59 lugares" y enseña las fichas nuevas. Con la emulación de teléfono del navegador integrado el mapa no terminó de pintar (en consola, solo los 404 conocidos de la fuente del estilo); a tamaño de escritorio sí, con los puntos y nombres nuevos (CC200, ACHE Galería, Teatro El Rinoceronte Enamorado, Centro de las Artes, Teatro Doroteo Arango…). Falta mirarlo en el iPhone. Sin `next build`: el cambio no toca la app y `.next` lo usa el servidor de desarrollo de otra sesión.

## Después: lo que decidió el founder
Respuesta del founder: "los negocios no entran! tomo tus recomendaciones".
- **Los negocios no entran al directorio:** Estación Wadley, Multiforo Sónica, Búnker 57, Deppa, Doppler, Kaffee Kunst y Carezza quedan fuera. Por la misma regla se ocultó (no se borró) la Academia Andalucía · Mancha Gitana, academia privada que había entrado con las escuelas; no tenía eventos ni seguidores. La regla quedó en [DEFINICION.md](../../../DEFINICION.md) y en la guía de agendas. Quedan 47 lugares visibles de esta investigación.
- **Teatro de la Ciudad del Tangamanga:** fuera, como se recomendó.
- **Tipos Museo y Escuela, en producción:** `TIPOS` suma los dos (chips en el orden Casa de cultura · Museo · Foro · Galería · Escuela · Colectivo · Biblioteca · Otro); `deducirTipo` los reconoce antes que centro cultural y teatro ("Escuela Estatal de Teatro" es escuela); el importador los usa. Orden seguido para no romper la app publicada: (1) migración `20260914120000_tipos_museo_escuela.sql`, que solo amplía la lista de la base; (2) [PR #32](https://github.com/robscan/somosnosotros/pull/32), con CI en verde (lint, typecheck, pruebas y build), fusionado por orden del founder («dale a los dos pendientes, ahora»); (3) con el despliegue de Vercel en verde, migración `20260914130000_museos_y_escuelas.sql`: 13 museos y 7 escuelas (el IPBA incluido) cambian de tipo. Lugares visibles por tipo: Casa de cultura 15, Museo 13, Foro 10, Escuela 7, Otro 6, Biblioteca 3, Galería 2, Colectivo 2 (58). En producción a 390×844: la lista de Lugares dice «58 lugares» con el chip Museo, `?tipo=museo` da «13 lugares» y la ficha del Museo Nacional de la Máscara dice «Museo».
- **Carga de los eventos:** el primer intento lo bloqueó el sistema de permisos de la sesión (escritura en producción) y no se buscó otra vía. Con la confirmación explícita del founder («intenta de nuevo con eventos») se cargaron **48 funciones de 35 eventos**, del 17 de septiembre al 6 de diciembre: todas visibles y del admin, 43 en lugares registrados y 5 en otro sitio (templo y plaza de San Sebastián, Palacio Monumental), 43 gratis y 5 con costo, sin ligas a artistas y sin avisos. En producción, a 390×844, la agenda de inicio ya abre con «jue 17 de sep · 3» y «vie 18 de sep · 5».

## Pendiente
- La Agenda Cultural de octubre de la Secretaría: el 14 de septiembre su PDF aún no existía (sale entre el 30 de septiembre y el 5 de octubre).

## Eventos que ya pasaron: se ocultan
Pregunta del founder: «¿Qué pasa cuando los eventos ya sucedieron? ¿Los borramos?». No se borran: se perderían sus «Voy» y los artistas ligados, y los enlaces compartidos no llevarían a nada. Las listas ya los esconden 3 h después de empezar. Decisión del founder: «si evento es pasado mejor ocultarlo».

En producción ([PR #33](https://github.com/robscan/somosnosotros/pull/33)): `eventoPaso` en `lib/fechas` (un evento pasó cuando terminó o, sin hora de fin, 3 h después de empezar). La ficha de un evento pasado responde como la de uno oculto: el público ve «Esto ya no está», con el texto nuevo «Puede que ya haya pasado…», y su autor y el administrador la siguen viendo con el aviso «Este evento ya pasó» para poder duplicarlo. La vista previa al compartir no lo anuncia y su archivo de calendario da 404. Lint, typecheck y 122 pruebas en verde; CI y despliegue de Vercel en verde. Mirado a 390×844 en el servidor local: la ficha de un evento futuro no cambia y un enlace que ya no lleva a nada muestra la página con el texto nuevo (responde 200 y no 404, como ya pasaba con eventos borrados). La ficha de un evento pasado no se pudo mirar: la base no tiene ninguno.

Las listas (agenda de inicio, Lugares, ficha de lugar, Artistas, ficha de artista, Mi perfil y perfil público) usan la misma regla con `filtroSinPasar` en la consulta, por decisión del founder («adelante y cerremos»). Antes cortaban 3 h después de empezar aunque el evento tuviera hora de fin: el «Sábado de puertas abiertas» del Museo Federico Silva, de 11:00 a 18:00, salía de la agenda a las 14:00. Probado contra la base, solo lectura: simulando el sábado 26 a las 15:00, la consulta da los mismos 21 eventos que la regla en JS (la regla vieja daba 20). A 390×844, en local y después en producción, la agenda de inicio sale igual que antes y un enlace que ya no lleva a nada muestra el texto nuevo; en local también la lista de Lugares y la ficha del Teatro del IMSS.
