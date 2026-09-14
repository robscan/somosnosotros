# 017 · Rediseño del inicio: prototipo v1 → v2.2 (2026-09-14)

Sin rama (documentos y prototipo; nada commiteado, por indicación del founder). Continúa la [015](015-council-rediseno-y-deuda-tecnica.md) y la [016](016-linea-grafica-bricolage.md).

## Qué se hizo

- El founder aceptó la lista de fricciones del inicio ([01-inicio-fricciones.md](../../../rediseno/01-inicio-fricciones.md)).
- Se escribió el flujo, la tabla de estados y las decisiones de interacción numeradas ([02-inicio-flujo-y-estados.md](../../../rediseno/02-inicio-flujo-y-estados.md)) y se construyó el prototipo navegable ([prototipos/inicio.html](../../../rediseno/prototipos/inicio.html)), publicado para el iPhone en https://claude.ai/artifact/1mnzPWWiZLrHKRnLJ9Gjq6. Catorce versiones en una sesión, cada una por una corrección del founder.

## Decisiones del founder en esta sesión (todas en el documento de decisiones)

1. Shell: logotipo a la izquierda, perfil a la derecha (Jakob); "Entrar" como acción primaria; con sesión, solo el avatar. La barra se desplaza con el contenido.
2. Barra de navegación inferior: Agenda · Lugares · Artistas ("Lugares", no "Mapa": el mapa es una vista de la sección).
3. Cabecera pegajosa con chips de fecha (campo nativo del teléfono) y ubicación (solo estados con eventos activos); títulos de grupo pegajosos al recorrer sus renglones (referencia: Resident Advisor).
4. Filtros como pestañas de texto con línea indicadora, unidas al contenido: Todos · Cercanos · Siguiendo · Nuevos.
5. Renglón de evento: foto a la izquierda; iconos de hora, lugar, asistentes y costo.
6. Zona de contenido en un tono distinto al de la cabecera.
7. Avisos con consentimiento por canal tras el primer "Voy": "¿Te recordamos ese día?" Por correo · En el teléfono · No, gracias; hoja "Instala Somos Nosotros" con el verbo instalar, el texto literal del iPhone, el resultado y el paso de aceptar los avisos. El correo también se pregunta: un correo no pedido se marca como spam y bloquea la entrega del dominio. Queda como OL-008.

## Errores corregidos en el camino

- Un pseudoelemento tapaba el botón Entrar (v1.6); se quitó y la hoja de estilos se reescribió ordenada en diez bloques con alturas como tokens.

## Qué sigue

Firma del founder sobre la v2.2 y PR de implementación del inicio (ver OPEN_LOOPS).
