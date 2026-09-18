# 109 - Guardado atomico del evento

Fecha: 2026-09-18. OL-075. Rama: `codex/evento-atomico`.
Reservada migracion `20260918110000_evento_atomico.sql`, despues de push validado.

En construccion: guardar datos publicos, sitio reservado, nuevos artistas y
relaciones en una sola funcion SQL con SECURITY INVOKER. Cualquier fallo revierte
todo. Sin service_role para guardar en nombre de una persona. RLS y triggers de
propiedad siguen vigentes. La funcion no acepta cambiar autor ni visibilidad.

37 migraciones y 140 comprobaciones PostgreSQL aprobadas (25 nuevas): fallo de
direccion, artista ausente y fallo provocado en la ultima insercion revierten
todo, incluso artistas creados durante el intento. Otra cuenta no edita; la
direccion privada no se expone; autor/visibilidad no se toman del JSON.
Cinco pruebas nuevas de acciones aprobadas, incluyendo ausencia de avisos y
redireccion ante fallo y revalidacion de fichas anteriores. Typecheck aprobado.
Pendiente revision independiente y prueba completa antes de integrar/publicar.
