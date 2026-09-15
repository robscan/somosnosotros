# 025 · Pantallas restantes: fricciones, decisiones y prototipo v1 (2026-09-14)

Sin rama (documentos y prototipo; nada commiteado hasta que el founder lo pida). El founder pidió avanzar con "las ventanas que nos faltan" tras Artistas y enlaces. Mismo método: fricciones → decisiones → prototipo navegable → firma → PR.

## Qué se miró

Capturas 390×844 en el servidor de desarrollo con un usuario desechable (borrado al final): Entrar (con y sin `siguiente`), Mi perfil (arriba y abajo), perfil público, alta de lugar y alta de evento. El panel de administración no se miró: exige la cuenta del founder.

## Qué se hizo

- **Fricciones** ([10-restantes-fricciones.md](../../../rediseno/10-restantes-fricciones.md)), dieciséis con "Tu decisión". Las de peso: el enlace mágico abre en Safari y no en la app instalada (E1); Google se ofrece sin estar configurado (E2); Mi perfil es panel y formulario a la vez, con lo destructivo a la vista (P1–P3); el alta de lugar enseña el mapa y un desplegable nativo antes de escribir nada (L1).
- **Decisiones** ([11-restantes-flujo-y-estados.md](../../../rediseno/11-restantes-flujo-y-estados.md)), doce: Entrar con motivo en el título y código de 8 dígitos (el enlace sigue vivo; Google solo si hay credenciales); una sola ficha de persona para `/perfil` y `/personas/[id]` con Editar en hoja, renglón de Avisos con estado y menú ··· (salir, borrar); alta de lugar con renglones resueltos (Dónde, Tipo deducido); en el alta de evento, chips de lugares y el cartel como botón de icono.
- **Prototipo** ([prototipos/restantes.html](../../../rediseno/prototipos/restantes.html), publicado en https://claude.ai/artifact/P8Rxff38ujtfucDgDENuRE): Entrar (correo → código con teclado numérico dibujado y el botón sobre el teclado), Mi perfil, persona ajena y alta de lugar; utilería con motivo, Google, perfil incompleto, vacíos y sugerencia elegida.

## Mirado en pantalla (estudio del prototipo)

Entrar con "Entra para decir que vas" y el botón sobre el teclado; tras mandar, "Te mandamos un código a ro…@gmail.com" con ocho casillas; Mi perfil con foto, nombre, colonia, Editar, "Avisos · Por correo · Cambiar", "Voy a · 2" y "Sigo · 2" con renglones (lugar cuadrado, artista redondo); persona ajena sin acciones; alta de lugar con Dónde abierto (Estoy aquí, mapa, dirección) y sugerencias al escribir "casa". **No mirado:** el estado L1 (Dónde resuelto tras elegir una sugerencia; se fuerza desde la utilería), la hoja de edición y la hoja de avisos del perfil.

## Precondición para el PR de Entrar

En Supabase → Authentication → Email Templates → Magic Link, añadir el código `{{ .Token }}` al cuerpo (junto al enlace). Sin eso, el correo no trae el código y la pantalla nueva no puede pedirlo. Lo hace el founder.

## Qué sigue

1. El founder corrige 10, recorre el prototipo en el iPhone y firma.
2. Cuatro PR: Entrar; ficha de persona (perfil y personas); alta de lugar; ajustes del alta de evento.
