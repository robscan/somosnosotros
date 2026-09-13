# 004 · Fase 2, lugares (2026-09-13)

Rama `fase-2-lugares`. Alta y edición de lugares desde el teléfono, mapa con pins, panel inferior con tres alturas y lista con búsqueda, ficha, anti-duplicados, ocultar por el admin.

## Qué quedó

- **Migración `20260913200000_lugares.sql`**: `normalizar_nombre()` (minúsculas, sin acentos, solo letras y números; misma regla que en el cliente), `distancia_m()` (haversine, sin PostGIS), `lugares_parecidos(nombre, lat, lng, excluir)` (visibles, mismo nombre normalizado, a menos de 150 m); políticas del bucket `fotos` ampliadas a `lugares/<id>/…`.
- **Mapa** (`Mapa.tsx`, único renderer): modo `ver` (pantalla completa, pins rojos que llevan a la ficha; `?lugar=id` centra en uno) y modo `elegir` (recuadro de 280 px con un pin que se arrastra o se coloca tocando; vuela a la dirección elegida). Callback guardado en una ref actualizada por efecto (regla `react-hooks/refs`).
- **Panel inferior** (`Sheet.tsx`, ~100 líneas propias, sin dependencia): peek (solo cabecera) · medium (50 %) · expanded (pantalla menos 56 px). Arrastre desde asa/cabecera con pointer events, snap por 25 % del tramo o velocidad > 0.5 px/ms, solo a estados vecinos, 300 ms `cubic-bezier(0.4,0,0.2,1)`, tap en el asa cicla peek→medium→expanded→medium, el cuerpo solo scrollea fuera de peek (contrato heredado `BOTTOM_SHEET.md`). Abre en medium si hay lugares, en peek si no.
- **Lista** (`ListaLugares.tsx`): buscador por nombre/dirección sin acentos, botón "+ Registrar un lugar" (manda a entrar si no hay sesión), conteo, tarjetas con miniatura; vacíos dichos ("Aún no hay lugares. Registra el primero." / "Ningún lugar se llama así.").
- **`/lugares/nuevo` y `/lugares/[id]/editar`** (`FormularioLugar.tsx`): nombre, tipo (6 opciones del plan), dirección con autocompletado de Mapbox Geocoding v6 (350 ms tras dejar de escribir, una búsqueda por texto, país MX, español, cercanía al centro), pin ajustable, descripción (600), redes (Instagram, Facebook, WhatsApp, sitio; `enlaceRed()` arma el enlace desde usuario/número), portada a Storage (5 MB). Antes de publicar, `lugares_parecidos`: si hay, muestra **"¿Es este?"** con enlaces y "No, es otro: publicar de todos modos". Editar: autor o admin.
- **Ficha `/lugares/[id]`**: portada, nombre, tipo, dirección, "Cómo llegar" (Google Maps, universal), descripción, redes como chips, "Publicado por …" (o "una cuenta borrada"), Editar (autor/admin), Ocultar del mapa / Volver a mostrar (admin). Aviso cuando está oculto.
- **Inicio**: carga los lugares visibles en el servidor y los pasa al mapa y al panel. Cabecera con conteo "· N lugares".
- Helpers puros con pruebas: `lugares.ts` (tipos, normalizar, filtrar, enlaces, validar), `geocodificar.ts` (URL, interpretación v6, mínimo 3 letras). 23 pruebas en total.

## Tropiezos

- Geocoding v6 no acepta el tipo `poi` (422 `VALIDATION_ERROR`); se quitó. Los tipos válidos son country, region, postcode, district, place, locality, neighborhood, street, block, address, secondary_address.
- Mapbox ubicó "Villerías 2" en el CP 78397 (otra colonia) antes que en el centro (78000): la calidad del geocodificador varía; por eso el pin se ajusta con el dedo y la dirección elegida se muestra completa para que la persona la revise.
- En reposo el panel asomaba el borde del buscador; peek = cabecera + 4 px.

## Prueba contra la base real (usuario desechable admin, borrado al final; 390×844)

- Alta: nombre, tipo, dirección con 5 sugerencias, pin colocado (lat/lng en campos ocultos), publicar → ficha con "Cómo llegar" y "Editar".
- Inicio: panel a media altura con "San Luis Potosí · 1 lugar", buscador, botón de registrar y la tarjeta.
- Duplicado: "TEATRO DE LA PAZ" en la misma dirección → "¿Es este?" con enlace al existente. En la base: 1 parecido a 55 m, 0 a 300 m.
- Admin: "Ocultar del mapa" → aviso de oculto; un cliente anónimo ya no lo ve ni en la lista ni en `lugares_parecidos`; alta anónima bloqueada por RLS. "Volver a mostrar" lo regresa.

## Prueba de la fase

10 lugares reales cargados desde el teléfono, cada uno en menos de un minuto. La lista la gestiona el founder.
