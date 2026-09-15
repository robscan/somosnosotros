# 042 · Alta de artista con el canon y Editar perfil en pantalla completa

**Fecha:** 2026-09-15 (noche) · **Base:** [15-formularios-canon-flujo-y-estados.md](../../../rediseno/15-formularios-canon-flujo-y-estados.md) firmado · **PRs:** #48 (alta de artista) y #49 (Editar perfil).

## Qué se hizo
- **El canon en un solo módulo.** Las clases del alta de lugar (campo con icono, renglones resueltos, salidas por intención, cuerpo con chips y entrada, botón que dice qué falta) pasan a `src/components/ui/FormularioCanon.module.css` y las usan lugar, artista y perfil. El módulo de lugar se queda con lo suyo (sugerencias de Mapbox, portada, parecidos). Sin CSS repetido, como pidió el founder ("optimiza y limpia").
- **Alta de artista (PR E).** Campo con la estrella; Qué hace y Es deducidos del nombre (`deducirDisciplina` nuevo: ballet → danza, compañía de teatro → teatro, taller de gráfica → artes visuales; sin pista, música; "ballet" cuenta como grupo); Foto con la cámara como acción y la foto puesta en el sitio del icono; Soy yo / es mi grupo con interruptor cuyo valor dice qué da; Más (redes, descripción) escondido sin desmontar. Iconos nuevos: cámara, candado, casa, texto.
- **Editar perfil (PR F).** Fuera la hoja: `/ajustes/editar` en pantalla completa, con Atrás a Ajustes. Foto, Nombre, Colonia y Sobre ti como renglones que se abren de uno en uno con el campo dentro y foco; Entras con como renglón con candado. Guardar se enciende cuando hay un cambio, dice "falta el nombre" si se vació, y al guardar vuelve a Ajustes con la ficha releída. "Completar" en la ficha propia lleva ahí.

## Una corrección al doc firmado
El doc 15 decía en A1 "Si es otro con el mismo nombre, sigue". La base no admite dos artistas con el mismo nombre (decisión 5 de 08, disparador `artista_sin_duplicado`), así que ese "sigue" fallaría. El aviso dice "Ábrelo y, si es tuyo, dilo ahí" y el botón "ya está registrado". Anotado en 15.

## Evidencia
- `npm run lint && npm run typecheck && npm test` en verde (135 pruebas, con la nueva de `deducirDisciplina`).
- Alta de artista en 390×844 con usuario desechable: deducción Danza · Grupo, interruptor, Más, publicación, y el aviso de nombre repetido con el botón apagado.
- Editar perfil con el mismo usuario: Colonia abierta con foco, Guardar encendido al cambiar, guardado en la base y vuelta a Ajustes. El panel del navegador estaba oculto al final, así que la captura de Editar perfil queda para el iPhone del founder.

## Queda
- PR D (alta de evento con el canon), para otra sesión por decisión del founder.
