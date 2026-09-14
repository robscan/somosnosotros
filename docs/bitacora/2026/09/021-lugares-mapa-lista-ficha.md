# 021 · Lugares: mapa primero, lista con vida y ficha de lugar (2026-09-14)

Rama `lugares-mapa-lista-ficha`. Implementa Lugares tal como lo aprobó el founder ([06-lugares-flujo-y-estados.md](../../../rediseno/06-lugares-flujo-y-estados.md) v1.1, prototipo https://claude.ai/artifact/9DpNFzQFhnNtTFsa9711Qm). Regla anotada en memoria: maquetación plana, sin sobreanidación, simple de mantener.

## Lugares (`/lugares`)

- **Mapa por defecto** (decisión 1), pestañas Mapa · Lista pegajosas. El mapa llena lo que queda hasta la navegación; la página no se desplaza.
- **Pins que dicen algo** (`Mapa`): lleno en tinta con eventos próximos, hueco sin ellos; el tocado crece desde la punta. Tocar un pin ya no navega: abre una **tarjeta flotante** (foto, nombre, tipo, "Próximo: hoy · 19:30", Ver); tocar el mapa la cierra. Mientras hay tarjeta se esconden el botón flotante y el de ubicación.
- **Botón de ubicación** abajo a la izquierda: pide permiso una vez, pone a la persona en el mapa (punto azul con halo) y centra; con la ubicación activa queda marcado y un segundo toque vuelve a centrar. La misma ubicación sirve a la lista ("Cerca de mí"); no se guarda.
- **Lista** (`ListaLugares`): renglones como los de la agenda (foto, nombre, pin con la calle sin código postal ni ciudad, calendario con "Próximo: …" o "Sin eventos próximos"); con eventos primero por fecha del próximo, luego alfabético; con ubicación, por distancia con "a 600 m". Búsqueda a partir de 8. Vacío con causa y "Registrar un lugar".
- **Acción flotante propia** (decisión 14): "Registrar lugar" con icono de pin con más (`Publicar que="lugar"`), distinta a simple vista de "+ Publicar".
- Datos: `conProximo` une lugares con su primer evento próximo; `ordenarLugares`, `calleCorta`, `textoProximo` en `lib/lugares.ts` con pruebas.

## Ficha de lugar (`/lugares/[id]`)

- Barra interior con regreso a Lugares, logotipo al centro y menú "···" (Reportar; autor: Editar, Borrar; admin: Ocultar).
- Portada en banda de 220 px (mismo `Cartel` de la ficha de evento); título con la etiqueta del tipo debajo; renglones con icono: dirección, "N personas lo siguen", "Próximo: …" con "ver" que baja a los eventos.
- Acciones de icono: Cómo llegar · Compartir · Instagram · Facebook · WhatsApp · Sitio (las que existan); tres por fila, con más se desplaza.
- Descripción en cuatro líneas con "más". "Próximos eventos · N" con los mismos renglones de la agenda agrupados por día (sin repetir el sitio), y "Publicar un evento aquí" al final; sin eventos, el vacío invita a publicar.
- **Barra pegajosa Seguir** (`Seguir`): lleno a lo ancho; con decisión, "✓ Sigues · Te avisamos por correo de sus eventos" (o en el teléfono, o ambos, o "Sin avisos; se cambia en Mi perfil") + "Dejar de seguir". Sin sesión lleva a entrar y se aplica al volver.
- **La hoja de avisos se reutiliza** (`ConsentimientoAvisos contexto="seguir"`): "Sigues X. ¿Te avisamos de sus eventos?" Por correo · En el teléfono · No, gracias; si ya se preguntó tras un Voy, no se repite. Al terminar, la barra lee el consentimiento nuevo.

## Lo compartido entre fichas (mantenimiento)

- `components/ui/Ficha.module.css`: página, renglones de dato, acciones de icono, autor, barra pegajosa (primaria, seleccionado, secundario), menú, recién publicado. Cada ficha conserva solo lo suyo en su módulo.
- Movidos a `components/`: `Cartel`, `Desplegable`, `BotonCompartir`, `ConsentimientoAvisos` (con su CSS), `RenglonEvento` (+ `Renglon.module.css`, que también usa la lista de lugares y la tarjeta del pin), `ui/MenuAcciones` (el "···" con hoja; la página arma los `<li>`). `MenuFicha` de evento desaparece. Iconos nuevos en `ui/Iconos`: pin con más, ubicación, ruta, compartir, redes, puntos, ok.

## Verificación (390×844, servidor local, base real, lugar y usuario desechables borrados)

- Mapa: dos pins de datos reales (mismo punto) más el de prueba lleno; tarjeta con foto y "Próximo: hoy · 19:40"; botón flotante "Registrar lugar".
- Lista: "2 lugares", Casa 1100 primero por su evento de hoy; chip "Cerca de mí".
- Ficha sin sesión (datos reales) y con sesión (lugar de prueba con portada, redes y descripción): Seguir → hoja de avisos → Por correo → "✓ Sigues · Te avisamos por correo de sus eventos" + Dejar de seguir; "1 persona lo sigue"; menú ··· con Editar, Reportar, Borrar el lugar.
- Ficha de evento sin cambios visibles tras mover lo compartido.
- Lint, typecheck, 63 pruebas y build en verde.
