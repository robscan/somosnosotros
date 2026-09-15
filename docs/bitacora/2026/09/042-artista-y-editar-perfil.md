# 042 · Alta de artista, Editar perfil y alta de evento con el canon

**Fecha:** 2026-09-15 (noche) · **Base:** [15-formularios-canon-flujo-y-estados.md](../../../rediseno/15-formularios-canon-flujo-y-estados.md) firmado · **PRs:** #48 (alta de artista), #49 (Editar perfil) y #50 (alta de evento).

## Qué se hizo
- **El canon en un solo módulo.** Las clases del alta de lugar (campo con icono, renglones resueltos, salidas por intención, cuerpo con chips y entrada, botón que dice qué falta) pasan a `src/components/ui/FormularioCanon.module.css` y las usan lugar, artista y perfil. El módulo de lugar se queda con lo suyo (sugerencias de Mapbox, portada, parecidos). Sin CSS repetido, como pidió el founder ("optimiza y limpia").
- **Alta de artista (PR E).** Campo con la estrella; Qué hace y Es deducidos del nombre (`deducirDisciplina` nuevo: ballet → danza, compañía de teatro → teatro, taller de gráfica → artes visuales; sin pista, música; "ballet" cuenta como grupo); Foto con la cámara como acción y la foto puesta en el sitio del icono; Soy yo / es mi grupo con interruptor cuyo valor dice qué da; Más (redes, descripción) escondido sin desmontar. Iconos nuevos: cámara, candado, casa, texto.
- **Editar perfil (PR F).** Fuera la hoja: `/ajustes/editar` en pantalla completa, con Atrás a Ajustes. Foto, Nombre, Colonia y Sobre ti como renglones que se abren de uno en uno con el campo dentro y foco; Entras con como renglón con candado. Guardar se enciende cuando hay un cambio, dice "falta el nombre" si se vació, y al guardar vuelve a Ajustes con la ficha releída. "Completar" en la ficha propia lleva ahí.

- **Alta de evento (PR D).** El founder pidió que fuera también esta noche. Un campo arriba con la cámara dentro (leer el cartel llena todo; sin frase); renglones Cuándo (hoy · 19:00, con Empieza y Termina al abrir), Dónde, Quién, Cuánto (gratis; chips y precio al abrir) y Más; el botón dice "falta el nombre" o "falta dónde". Dónde con una sola salida: la lupa abre la hoja "Dónde es" con los lugares registrados (foto, tipo, calle) que se filtran al escribir, "Es en otro sitio" (nombre, pin con Estoy aquí, interruptor de reservado con dirección exacta, cuándo se revela e indicaciones) y "Registrar un lugar nuevo". Como la hoja se pinta fuera del formulario, todo viaja en campos escondidos. Desaparecen el desplegable nativo, el enlace y las píldoras; `ui/Seccion` ya no lo usaba nadie y se borró.

## Una corrección al doc firmado
El doc 15 decía en A1 "Si es otro con el mismo nombre, sigue". La base no admite dos artistas con el mismo nombre (decisión 5 de 08, disparador `artista_sin_duplicado`), así que ese "sigue" fallaría. El aviso dice "Ábrelo y, si es tuyo, dilo ahí" y el botón "ya está registrado". Anotado en 15.

## Evidencia
- `npm run lint && npm run typecheck && npm test` en verde (135 pruebas, con la nueva de `deducirDisciplina`).
- Alta de artista en 390×844 con usuario desechable: deducción Danza · Grupo, interruptor, Más, publicación, y el aviso de nombre repetido con el botón apagado.
- Alta de evento en 390×844 con otro usuario desechable: pantalla al llegar igual al prototipo, hoja con los 58 lugares y su filtro ("arte" deja 7), otro sitio reservado con dirección, Dónde resuelto, publicación con la ficha correcta y la edición cargando todos los valores. Evento y usuario borrados.
- Editar perfil con el mismo usuario: Colonia abierta con foco, Guardar encendido al cambiar, guardado en la base y vuelta a Ajustes. El panel del navegador estaba oculto al final, así que la captura de Editar perfil queda para el iPhone del founder.

## Queda
- Nada de los formularios: los tres están en producción. La firma en el iPhone del founder.
