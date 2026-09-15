# Pantallas restantes · lista de fricciones (v1, para corrección del founder)

**Fecha:** 2026-09-14 · **Pantallas:** Entrar (`/entrar`), Mi perfil (`/perfil`), perfil público (`/personas/[id]`), alta de lugar (`/lugares/nuevo`), alta de evento (`/eventos/nuevo`) · **Mirada:** capturas 390×844 en el servidor de desarrollo con un usuario desechable; el panel de administración no se miró (exige la cuenta del founder) y queda para después · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Base:** todo lo ya firmado (inicio, ficha de evento, Lugares, Artistas, enlaces): renglones con icono, renglones resueltos con "Cambiar", barra pegajosa, menú "···", hojas, tinta · **Quién decide:** el founder corrige, tacha y firma.

## Diagnóstico

Lo que falta son las pantallas de la persona (entrar, su perfil, cómo la ven) y las dos altas. Entrar tiene un final roto en el iPhone: el enlace del correo abre en Safari y no en la app instalada, y ofrece Google sin estar configurado. Mi perfil es dos cosas a la vez, un panel de actividad y un formulario de edición completo, con lo destructivo a la vista. El perfil público usa las tarjetas viejas. El alta de lugar quedó con el mapa y un desplegable nativo a la vista antes de escribir nada, cuando las otras dos altas ya resuelven "una cosa a la vez". El alta de evento es la referencia y solo pide dos ajustes.

## Resumen por severidad

| # | Pantalla | Fricción | Ley | Severidad | Propuesta en una línea |
|---|---|---|---|---|---|
| E1 | Entrar | El enlace del correo abre en Safari, no en la app instalada; en el iPhone la persona entra "en otro sitio" | Peak-End · Evidencia | Alta | Código de 8 dígitos en el correo y un campo aquí para teclearlo; el enlace sigue sirviendo |
| E2 | Entrar | "Continuar con Google" sin credenciales configuradas: promete y falla | Evidencia, nunca promesa | Alta | Solo aparece cuando Google está configurado |
| E3 | Entrar | No dice para qué entra la persona ni a dónde vuelve | Gradiente de meta · Evidencia | Media | Título con motivo: "Entra para decir que vas", "…para seguir a X", "…para publicar"; volver lleva al origen |
| E4 | Entrar | El campo no tiene foco al llegar; un toque de más | Fitts · UX invisible | Baja | Foco automático, teclado de correo, botón sobre el teclado |
| P1 | Mi perfil | Panel de actividad y formulario de edición completo en la misma pantalla; todo expuesto | Progressive disclosure · Hick | Alta | Perfil como ficha (foto, nombre, colonia, sobre mí); "Editar" abre una hoja con los campos |
| P2 | Mi perfil | Avisos como casilla larga de correo más un botón de teléfono con textos de sistema | UX invisible · Evidencia | Alta | Un renglón "Avisos" con el estado real ("Por correo y en el teléfono", "Sin avisos") y Cambiar → la hoja de avisos ya firmada |
| P3 | Mi perfil | Cerrar sesión como botón grande y Borrar mi cuenta como enlace a la vista | Progressive disclosure · Von Restorff | Media | Las dos detrás del menú "···", Borrar con su confirmación |
| P4 | Mi perfil | Correo como subtítulo; "Tu perfil público: lo que ven los demás" como enlace suelto | Evidencia · Hick | Media | Mi perfil ES la ficha pública con mis acciones encima; el correo va en la hoja de edición |
| P5 | Mi perfil | Voy a / Sigo con tarjetas viejas y vacíos sin salida | Similitud · Evidencia | Media | Renglones de agenda, lugares y artistas; vacíos con la acción ("Ver la agenda") |
| Q1 | Perfil público | Cabecera y listas con tarjetas viejas; sin la etiqueta de qué es cada cosa seguida | Similitud | Media | Misma ficha que Mi perfil sin acciones: renglones, "Sigue · 3", "Va a · 2" |
| Q2 | Perfil público | Sin sesión, nada dice cómo reconocerse (para qué existe la pantalla) | Evidencia | Baja | Un renglón al pie: "Publicado por / va a": ya cumple; no añadir nada |
| L1 | Alta de lugar | Mapa de 270 px y desplegable nativo "Elige uno" a la vista antes de escribir el nombre | Hick · UX invisible · Similitud | Alta | Renglones resueltos como en las otras altas: Nombre → "Dónde" (dirección y mini mapa al abrir, Estoy aquí) → "Tipo" (deducido; chips) |
| L2 | Alta de lugar | "Ubicación" pide tocar el mapa aunque el nombre ya la trajo; la dirección es un campo editable siempre | Evidencia · UX invisible | Media | Dónde resuelto muestra la dirección deducida; el mapa solo al abrir |
| L3 | Alta de lugar | "Agregar descripción, redes o foto" plegado: bien; al abrir, redes con seis campos | Hick | Media | Resuelto por [09](09-enlaces-flujo-y-estados.md): un solo campo de enlace |
| V1 | Alta de evento | "Dónde" abre con un desplegable nativo, un enlace y dos píldoras: tres caminos a la vista | Hick | Media | Con pocos lugares (≤6), chips con el nombre; con más, campo que sugiere como Quién; "Otro sitio" y "Reservado" como una sola píldora "Es en otro sitio…" que despliega |
| V2 | Alta de evento | "¿Tienes el cartel? Súbelo y llenamos todo" como texto suelto sobre "Qué" | Von Restorff · Fitts | Baja | Botón de icono (cámara) alineado a la derecha del título "Qué", mismo tamaño que los demás |

## Detalle por fricción

### E1 · Código de 8 dígitos
**Qué se ve.** Tras "Mandarme el enlace": "Revisa tu correo. Mandamos un enlace… Ábrelo desde este mismo teléfono". En el iPhone con la app instalada, el enlace abre Safari: la persona queda dentro en Safari y fuera en la app.
**Propuesta.** El correo trae el código de 8 dígitos y el enlace. La pantalla pasa a "Te mandamos un código a ro…@gmail.com" con un campo de ocho casillas (teclado numérico, se pega solo desde el correo del iPhone) y "Entrar"; debajo, "¿No llega? Reenviar" y "Usar otro correo". El enlace del correo sigue funcionando para quien lo prefiera. Exige poner `{{ .Token }}` en la plantilla de correo de Supabase (lo hace el founder; se anota como precondición). *Peak-End (el final de entrar es estar dentro donde estabas), Evidencia (se dice a qué correo se mandó).*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### E2 · Google solo si existe
**Propuesta.** El botón aparece solo cuando el servidor tiene las credenciales de Google; hoy no, así que Entrar queda con un solo camino. *Evidencia, nunca promesa; Hick.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### E3 · Entrar con motivo
**Propuesta.** El título cambia según de dónde viene: "Entra para decir que vas" (desde Voy), "Entra para seguir a Los Vecinos" (desde Seguir), "Entra para publicar" (desde Publicar), "Entrar" a secas desde la barra. El regreso de la barra vuelve a esa pantalla, no a la agenda. Al entrar, la acción se aplica sola (ya funciona así). *Gradiente de meta, Evidencia.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### E4 · Foco y teclado
**Propuesta.** El campo tiene el foco al llegar; teclado de correo; el botón principal viaja sobre el teclado. *Fitts, UX invisible.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### P1 · Mi perfil como ficha
**Qué se ve.** Título, correo, "Voy a" vacío, "Sigo" vacío, enlace al perfil público, avatar con "Poner una foto", Nombre, Colonia, Sobre mí, texto de avisos, casilla, Guardar, Cerrar sesión, Borrar mi cuenta: doce cosas.
**Propuesta.** Barra interior (← Agenda · SMSNSTRS · ···). Foto redonda grande (tocar la cambia), nombre, colonia y "sobre mí" si los hay; si faltan, un renglón "Completa tu perfil" con "Editar". "Editar" (botón bajo la cabecera y en el menú) abre una hoja con Nombre, Colonia, Sobre mí y Guardar; nada más. *Progressive disclosure (capa b), Hick, Similitud con las fichas.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### P2 · Avisos como renglón de estado
**Propuesta.** Un renglón con icono de campana: "Avisos · Por correo y en el teléfono" / "Por correo" / "En el teléfono" / "Sin avisos", con "Cambiar" que abre la hoja de avisos ya firmada (Por correo · En el teléfono · Quitar). Si el teléfono exige instalar la app, la hoja "Instala Somos Nosotros" ya existente. Nada de textos de navegador en la pantalla. *UX invisible, Evidencia.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### P3 · Salir y borrar detrás del menú
**Propuesta.** Menú "···": Editar · Avisos · Cerrar sesión · Borrar mi cuenta (con la confirmación de dos pasos que ya existe). *Progressive disclosure, lo destructivo detrás de una capa.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### P4 · Una sola ficha de persona
**Propuesta.** `/perfil` y `/personas/[id]` son la misma ficha: la mía trae Editar, Avisos y el menú; la ajena, nada de eso. El correo solo se ve en la hoja de edición ("Entras con ro…@gmail.com"). Desaparece el enlace "lo que ven los demás": lo que veo es lo que ven, menos mis botones. *Evidencia, Hick.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### P5 · Voy a y Sigo con renglones
**Propuesta.** "Voy a · 2" con los renglones de la agenda agrupados por día; "Sigo · 3" con renglones de lugar (cuadrado) y artista (redondo) con su etiqueta. Vacíos con salida: "Todavía no vas a nada. Ver la agenda" / "Todavía no sigues nada. Ver lugares · Ver artistas". *Similitud, Evidencia.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### Q1 · Perfil público igual
**Propuesta.** Misma ficha sin acciones. "Va a · N" y "Sigue · N". *Similitud.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### L1 y L2 · Alta de lugar una cosa a la vez
**Qué se ve.** Nombre, luego un mapa de 270 px con "Estoy aquí", Dirección, Tipo (desplegable), y "+ Agregar…".
**Propuesta.** Nombre con foco y sugerencias de Mapbox (ya existe). Al elegir una sugerencia o al tocar "Estoy aquí", el renglón "Dónde" queda resuelto con la dirección; al abrirlo, el mapa con el pin y el campo de dirección. Si nada lo resolvió, "Dónde" está abierto con el mapa y "Estoy aquí". "Tipo" resuelto con lo deducido del nombre ("Casa de cultura · por el nombre"); al abrir, chips. "+ Más detalles: descripción, redes, foto" con el selector de enlaces. Publicar lugar. *UX invisible, Hick, Similitud con las altas de evento y artista.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### V1 · Dónde en el alta de evento
**Propuesta.** Con seis lugares o menos, chips con el nombre de cada lugar (uno a un toque); con más, un campo que sugiere como Quién. Debajo, una sola píldora "Es en otro sitio…" que al tocarla muestra las dos opciones (público / reservado). *Hick, Similitud con Quién.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

### V2 · El cartel como botón de icono
**Propuesta.** Junto a la etiqueta "Qué", a la derecha, un botón de icono de cámara "Leer cartel"; al elegir la imagen, todo se llena como hoy. *Von Restorff, Fitts.*
**Tu decisión:** ☐ de acuerdo ☐ cambia: ______

## Niveles de atención

| Nivel | Entrar | Mi perfil / persona | Alta de lugar |
|---|---|---|---|
| 1 · Lo que importa | Para qué entro y el campo | Foto, nombre, qué sigue, a qué va | Nombre |
| 2 · Lo accionable | Mandar el código / teclearlo | Editar; Avisos (solo la mía) | Dónde y Tipo resueltos; Publicar |
| 3 · Prueba social | — | Sigue · N, Va a · N | ¿Es este? (ya existe) |
| 4 · Lo demás | Reenviar, otro correo, enlace | Menú ··· (salir, borrar) | Más detalles |

## Qué sigue

1. Tú corriges la lista y firmas.
2. Decisiones numeradas ([11](11-restantes-flujo-y-estados.md)) y prototipo navegable de Entrar, Mi perfil y alta de lugar.
3. PR por pantalla: Entrar (con la plantilla de correo), Perfil y persona, alta de lugar, ajustes del alta de evento.
