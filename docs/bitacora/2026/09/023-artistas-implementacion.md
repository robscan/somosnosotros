# 023 · Artistas: directorio, ficha, alta, Quién en el evento y "Es mi nombre" (2026-09-14)

Rama `artistas`. Implementa lo firmado por el founder en [08-artistas-flujo-y-estados.md](../../../rediseno/08-artistas-flujo-y-estados.md) (prototipo https://claude.ai/artifact/9X7FNomaYjb2CFsGPhWvjZ). Continúa la [022](022-artistas-fricciones-decisiones-prototipo.md).

## Base de datos (migración 0010, aplicada a producción con copia previa de todas las tablas en JSON)

- `artistas` (nombre, disciplina con `por_completar`, detalle "en una palabra", tipo solista/grupo/colectivo, descripción, foto, redes, ciudad, autor, visible). Trigger que impide dos artistas con el mismo nombre normalizado en la misma ciudad (decisión 5). RPC `artistas_con_nombre` para sugerir mientras se escribe.
- `artistas_cuentas`: cuentas ligadas a un artista ("Soy yo / es mi grupo" o el admin al atender "Quiero editarlo yo"). `gestiona_artista()` (autor, ligado o admin) manda en las políticas de edición.
- `eventos_artistas`: quién se presenta en cada evento, con orden. Escribe quien gestiona el evento.
- `seguimientos`: llave propia, `lugar_id` ya puede ser nulo, nueva `artista_id`; exactamente uno de los dos; únicos por persona y lugar, y por persona y artista.
- `reportes`: tipo `artista`; motivos `es_mio` y `retirar`.
- Fotos: carpeta `artistas/<mi id>/…`.

## Pantallas

- **Artistas** (`/artistas`, `ListaArtistas`): renglones con foto redonda, "Son huasteco · Grupo" con icono por disciplina, "Próximo: hoy · 19:00 · Casa 1100" o "Sin fechas próximas"; con fechas primero, luego alfabético; búsqueda a partir de 8 con "Nadie se llama «x». ¿Lo registras?"; vacío con causa; botón flotante "Registrar artista" con estrella con más.
- **Ficha** (`/artistas/[id]`): foto en banda, nombre y etiqueta, "N personas lo siguen", próxima fecha con dónde y "ver", Compartir y redes (Instagram, Facebook, YouTube, Spotify, WhatsApp, sitio), descripción plegada, "Se presenta en · N" por día con el sitio en cada renglón, "Publicar una fecha de X" (alta con Quién resuelto), "Registrado por". Barra pegajosa **Seguir** (componente `Seguir` ahora compartido con la ficha de lugar) con la hoja de avisos en versión "sus fechas". Menú ···: Editar (autor, ligado o admin), Ocultar (admin), Reportar, **Es mi nombre** (se despliega en el menú: "Quiero editarlo yo" / "Quiero que se quite" → reporte; termina con "Listo. El administrador lo revisa y te escribe a …"), Borrar (autor o admin). Sin sesión, "Es mi nombre" pasa por Entrar y vuelve con la pregunta abierta.
- **Alta y edición** (`FormularioArtista`): Nombre con foco; si ya existe uno igual, "Ya está registrado: X · … ¿Es este?" con "Sí, es este" y "No, es otro"; renglones resueltos "Qué hace" (chips y "en una palabra") y "Es" (deducido del nombre: "Trío", "Los", "Compañía" → Grupo; "Colectivo" → Colectivo); foto opcional; interruptor "Soy yo / es mi grupo"; "Más detalles" con redes y descripción; borrador local.
- **Quién en el alta de evento** (`SelectorQuien`): cuarto renglón, opcional, "Añadir quién se presenta"; sugerencias a partir de dos letras (los míos primero, marcados "· tú"); "Crear a «…»" cuando no coincide exacto: el artista viaja con el nombre y se crea al publicar (sin huérfanos si se abandona el alta). Si mi cuenta está ligada a un solo artista, Quién ya viene resuelto. La lectura del cartel también saca los nombres. Al editar o duplicar, se conserva.
- **Ficha de evento**: renglón de estrella "Con Los Vecinos y Trío Xochitl", cada nombre enlaza.
- **Agenda, avisos y perfil**: "Siguiendo" incluye los eventos de los artistas que sigo; el aviso de evento nuevo llega también a quienes siguen a alguno de sus artistas (una vez por persona); Mi perfil y el perfil público listan los artistas seguidos.
- **Administración**: los reportes de artista llevan "Pasar la ficha a esta cuenta" (liga la cuenta, cambia el autor: quien la registró deja de editarla) y "Ocultar"; sección "Últimos artistas".

## Verificación (390×844, servidor de desarrollo, base real, dos usuarios desechables borrados al final)

- `/artistas` vacío (A0) con "Registrar un artista"; alta con "Trío Prueba": "Es · Grupo · por el nombre"; interruptor activado; publicado → ficha con "Publicado. Ya está en Artistas." y Completar.
- Seguir → hoja "Sigues a Trío Prueba. ¿Te avisamos de sus fechas?" → No, gracias → "✓ Sigues · Sin avisos; se cambia en Mi perfil" + Dejar de seguir; "1 persona lo sigue".
- "Publicar una fecha de Trío Prueba" → alta de evento con "Quién · Trío Prueba · tú"; abierto, ficha con ✕; al escribir "Dueto Nuevo", "Crear a «Dueto Nuevo» · solo con el nombre"; publicado en Casa 1100 → ficha de evento "Con Trío Prueba y Dueto Nuevo".
- `/artistas` con dos artistas: Dueto Nuevo ("Ficha por completar") y Trío Prueba, ambos "Próximo: hoy · 19:00 · Casa 1100".
- Segundo usuario en la ficha de Dueto Nuevo: ··· → Es mi nombre → "¿Qué quieres hacer con Dueto Nuevo?" → Quiero editarlo yo → "Listo. El administrador lo revisa y te escribe a pr…@example.com". El reporte quedó en la base con tipo `artista` y motivo `es_mio` (comprobado con el cliente de servicio antes de borrarlo). El panel de administración no se miró en pantalla (exige la cuenta del founder); su acción es una inserción en `artistas_cuentas` más el cambio de autor.
- No mirado en pantalla: edición de artista, "Quiero que se quite", lectura de cartel con nombres, avisos por correo a seguidores de artistas.
- **Revisión de estructura y maquetación** (regla del founder): se quitaron dos envoltorios sin función (el `div` de "Más detalles" en el alta y los `span` de cada nombre en "Con …"); medido en el navegador: ficha de artista 41 nodos, profundidad 5, cero `div`/`span` sin clase con un solo hijo; lista de artistas 55 nodos con dos artistas, profundidad 8 (la misma que los renglones de la agenda). "Es mi nombre" pasó de hoja apilada sobre el menú a bloque desplegado dentro del menú, como Reportar y Borrar.
- Lint, typecheck, **73 pruebas** (10 nuevas de `lib/artistas`, 2 casos nuevos de redes y cartel) y build en verde.

## Decisiones tomadas al implementar (para que el founder las vea)

- **"Pasar la ficha a esta cuenta" transfiere**: además de ligar la cuenta, el autor pasa a ser quien reclamó; quien la registró deja de poder editarla y "Registrado por" cambia. Respuesta a la pregunta del founder sobre un usuario que registra varios artistas: cada uno reclama desde su ficha y el admin decide.
- YouTube y Spotify entraron a las redes compartidas: también aparecen en la edición de lugares.
- El artista creado desde Quién queda con disciplina "por completar"; la ficha lo dice y ofrece Completar al autor.
