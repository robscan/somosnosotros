# 022 · Artistas: fricciones, decisiones y prototipo v1 (2026-09-14)

Sin rama (documentos y prototipo; nada commiteado hasta que el founder lo pida). Continúa OL-006 con el método por pantalla que se usó en el inicio, la ficha de evento y Lugares: fricciones → decisiones numeradas → prototipo navegable → firma → PR. Parte de la decisión del founder: directorio de artistas desde ya, no el campo de texto "quién se presenta" que recomendó el consejo (bitácora [015](015-council-rediseno-y-deuda-tecnica.md)).

## Qué se hizo

- **Lista de fricciones** ([07-artistas-fricciones.md](../../../rediseno/07-artistas-fricciones.md)), doce, con "Tu decisión" en cada una. Diagnóstico: la pestaña es un texto que promete; un evento no dice quién se presenta, así que una ficha de artista no tendría con qué llenarse. Propuesta de fondo: la forma de Lugares (lista con vida, ficha con Seguir, acción flotante propia) y un renglón "Quién" en el alta de evento que sugiere y crea sin salir del alta.
- **Flujo, estados y decisiones** ([08-artistas-flujo-y-estados.md](../../../rediseno/08-artistas-flujo-y-estados.md)): 23 estados con ID, 15 decisiones con su ley, ninguna excepción declarada, y el modelo de datos para el PR (`artistas`, `artistas_cuentas`, `eventos_artistas`, `seguimientos.artista_id`, reportes `es_mio` y `retirar`).
- **Prototipo navegable** ([prototipos/artistas.html](../../../rediseno/prototipos/artistas.html), publicado en https://claude.ai/artifact/9X7FNomaYjb2CFsGPhWvjZ): cuatro pantallas (lista con búsqueda, ficha, alta de artista, alta de evento con Quién), hojas de avisos, menú ··· y "Es mi nombre", utilería con los estados forzables (S1, A0, F2, F3, F4, F5, Q3, avisos preguntados).

## Lo que resuelve de lo que dejó pendiente el consejo

- **Quién puede crear y editar:** cualquier persona con sesión registra; edita quien lo registró, quien está ligado a la ficha ("Soy yo / es mi grupo") y el administrador.
- **Vía de retiro o reclamo de un nombre:** "Es mi nombre" en el menú ··· → "Quiero editarlo yo" o "Quiero que se quite" → reporte al administrador con la cuenta que lo pidió; la hoja termina con "Listo. El administrador lo revisa y te escribe a ro…@gmail.com" (evidencia, no promesa). En el panel, "Pasar la ficha a esta cuenta" u "Ocultar".
- **Disciplina y contacto:** disciplina como lista cerrada (Música · Teatro · Danza · Artes visuales · Letras · Cine · Otro) más un campo corto libre ("son huasteco"); sin teléfono ni correo público: las redes son las mismas que en lugares más YouTube y Spotify.
- **Duplicados:** un artista es un artista: mismo nombre sin acentos ni mayúsculas → "Ya está registrado. ¿Es este?" en el alta y en Quién.

## Mirado en pantalla (390×844 dentro del estudio del prototipo)

- Lista: ocho artistas, foto redonda, disciplina · tipo, "Próximo: hoy · 19:30 · Casa Ocho Ventanas"; se corrigió un salto de línea torpe en el renglón largo (la fila de datos pasa a texto corrido con el icono en línea).
- Alta con "Trío" escrito: "Es · Grupo · por el nombre" deducido; Qué hace resuelto en Música con Cambiar; foto opcional; interruptor "Soy yo / es mi grupo".
- Alta de evento con "tr" en Quién: sugerencias Compañía Trasluz y Trío Xochitl y "Crear a «tr»" al final.
- Ficha arriba (banda, nombre, "Son huasteco · Grupo", 12 personas lo siguen, próximo con lugar y "ver", acciones Compartir · Instagram · YouTube…, descripción con "más", Seguir pegado abajo) y abajo ("Se presenta en · 3" por día con lugar, "Publicar una fecha de Los Vecinos").
- Menú ··· → "Es mi nombre" (sin sesión pasa por Entrar) → hoja con las dos opciones → "Listo. El administrador lo revisa…".
- **No mirados en esta sesión** (mismos componentes ya firmados en Lugares): la barra "✓ Sigues" con Dejar de seguir, la hoja de avisos, y los vacíos A0, F3, F4 y el duplicado N2 (se fuerzan desde la utilería).

## Qué sigue

1. El founder corrige la lista 07 (tacha, cambia), recorre el prototipo en el iPhone y firma.
2. PR de implementación con migración, cuatro pantallas, renglón Quién, renglón en la ficha de evento y "Es mi nombre" en el panel del administrador; captura 390×844 y firma en el iPhone.
