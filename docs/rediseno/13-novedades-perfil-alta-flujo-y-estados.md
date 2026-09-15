# Novedades, perfil y alta de lugar · flujo, estados y decisiones (v1.2)

**Fecha:** 2026-09-15 · **Base:** [12-novedades-perfil-alta-fricciones.md](12-novedades-perfil-alta-fricciones.md) (v1, pendiente de la corrección del founder) · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Prototipo navegable:** [prototipos/novedades-perfil-alta.html](prototipos/novedades-perfil-alta.html) (publicado para el iPhone en https://claude.ai/artifact/5GDgjLVpsy3h26TgsnYEaN) · **Quién firma:** el founder.

## Novedades

```mermaid
flowchart TD
  A[Agenda: campana con punto] --> N[Novedades: por día]
  N -- toca un renglón --> F[Ficha del evento]
  N -- teléfono apagado --> H[Hoja de avisos de Ajustes]
```

| ID | Estado | Qué ve la persona | Qué puede hacer |
|---|---|---|---|
| N0 | Hay novedades | Hoy · Ayer · Esta semana; renglones con icono por causa; punto en lo no visto; el punto de la campana se apaga al entrar | Tocar un renglón |
| N1 | Nada nuevo | "Nada nuevo desde el lunes. Sigues 3 lugares y 2 artistas." y lo último que hubo | Volver |
| N2 | No sigue nada | "Todavía no sigues nada… Ver lugares · Ver artistas" | Ir a seguir |
| N3 | Sin sesión | No hay campana; la ruta responde con la invitación a entrar | Entrar |
| N4 | Teléfono apagado | Al pie: "Esto también te llega por correo. En el teléfono aún no: actívalo" | Activar |

1. **Novedades se calcula, no se administra**: nuevos de las últimas dos semanas en lo que sigue, cambios en lo que va, hoy vas, y (si el founder lo firma) quién más va. Una sola fecha guardada por persona (`novedades_vistas_en`) decide el punto de la campana y el punto por renglón. *UX invisible, Evidencia.* (N0)
2. **Campana solo con sesión**, con punto y sin número. *Hick, Evidencia.* (N0, N3)
3. **Cuatro vacíos por causa** (N1 a N4), cada uno con su salida. *Evidencia.*
4. **El aviso del teléfono aparece solo cuando está apagado** y desaparece al activarlo. *UX invisible.* (N4)

## Mi perfil, Ajustes y perfil ajeno

```mermaid
flowchart TD
  A[Avatar de la barra] --> P[Mi perfil: la ficha, con Ajustes y Compartir bajo el nombre]
  P -- engrane --> S[Ajustes: Tu ficha · Avisos · Cuenta · Somos Nosotros · Borrar]
  S -- Editar --> E[Hoja Editar, ya firmada]
  Q[Nombre en quién va] --> R[Persona: la ficha; Van a lo mismo si hay]
```

| ID | Estado | Qué ve la persona | Qué puede hacer |
|---|---|---|---|
| P0 | Mi perfil | Ficha idéntica a la ajena: Compartir arriba a la derecha junto al nombre; Ajustes (engrane) bajo la colonia; resumen en números que hace de pestañas (Voy a · Sigo) y la lista de la pestaña | Ir a Ajustes, compartir, cambiar de pestaña |
| P1 | Incompleto | Aviso "Falta tu colonia y una línea sobre ti" con Completar (lleva a Ajustes · Editar) | Completar |
| S0 | Ajustes | Cuatro grupos en tarjetas: Tu ficha (Editar · Perfil) · Avisos (Por correo · En el teléfono, interruptores en la fila) · Cuenta (Entras con · Cerrar sesión) · Somos Nosotros (Invitar · Administración · Privacidad · Reglas); Borrar mi cuenta suelto al final, en rojo | Tocar una fila; los interruptores guardan al tocar |
| R0 | Persona | Ficha con Compartir junto al nombre; resumen en números (Va a · Sigue) como pestañas | Tocar renglones, cambiar de pestaña |
| R1 | Coincidencias | Tercer número "Van a lo mismo · N" en el resumen (con sesión y si hay), con su lista al tocarlo | Tocar |

5. **Mi perfil es la ficha**: Compartir arriba a la derecha junto al nombre (en la mía y en la ajena); lo único distinto de la ajena son el engrane de Ajustes bajo la colonia (donde estaba Editar) y el aviso de completar. **El resumen en números es la pestaña** (corrección del founder, v1.2): Va a · Sigue (· Van a lo mismo) con su cifra grande; tocar uno muestra su lista; un solo control para leer y para navegar. Editar, Avisos, Perfil reservado, Invitar, Cerrar sesión, Borrar y Administración viven en Ajustes; el menú ··· desaparece de Mi perfil. Iconos convencionales con nombre en tooltip y aria-label. *Hick, Progressive disclosure, Jakob, intención.* (P0, S0)
6. **Ajustes son grupos en tarjetas** con rótulo y aire entre ellos; dentro, filas con el mismo dibujo (icono, etiqueta, detalle, acción); los interruptores de avisos van en la fila y guardan al tocar; lo destructivo suelto al final y en rojo, con la confirmación de dos pasos que ya existe. *Región común, proximidad, conectividad uniforme, Von Restorff.* (S0)
7. **"Van a lo mismo"** lo calcula el sistema y solo aparece, como tercer número del resumen, con sesión y si hay coincidencias. Por decidir. *UX invisible, Peak-End.* (R1)

## Alta de lugar

```mermaid
flowchart TD
  L0[Nombre con foco] -- sugerencia de lugar --> L2[Dónde y Tipo resueltos]
  L0 -- sugerencia de dirección --> L3[Dónde resuelto; el nombre se queda]
  L0 -- Estoy aquí o toca Dónde --> H[Hoja Dónde está: dirección, mapa grande, pin, Listo]
  H --> L3
  L2 --> PUB[Publicar lugar]
  L3 --> PUB
  L4[Ya existe cerca] --> PUB
```

| ID | Estado | Qué ve la persona | Qué puede hacer |
|---|---|---|---|
| L0 | Llega | Campo de nombre con lupa y foco; "Dónde · Falta" con dos iconos: Estoy aquí y Buscar; "Tipo · Por el nombre"; "Más · Descripción, redes, foto"; Publicar dice "falta el nombre" | Escribir; Estoy aquí; Buscar |
| L1 | Escribió | Sugerencias: lugares con nombre (nombre, categoría, dirección) y direcciones ("workshop · Usar la dirección …"); Publicar sobre el teclado dice "falta dónde está" | Elegir |
| L2 | Lugar elegido | Dónde resuelto "Av. Carranza 850 · Lo trajo el nombre · a 400 m de ti"; Tipo resuelto por Mapbox; Publicar activo | Publicar; Cambiar |
| L3 | Dirección elegida o pin puesto | Dónde resuelto "Dirección elegida · el pin está en esa calle"; el nombre escrito se queda; Tipo por el nombre | Publicar; Cambiar |
| L4 | Ya existe cerca | "Ya está registrado: … Si es otro con el mismo nombre, sigue adelante" | Abrir el existente; publicar |
| H | Hoja Dónde está | Campo de dirección con lupa (con foco si se entró por Buscar), mapa grande con el punto azul, el pin y el botón de ubicación del mapa de Lugares, dirección deducida, Listo | Mover el pin; ubicarse; Listo |

8. **Una cosa a la vez con renglones resueltos**, como el alta de evento (decisión 10 de [11](11-restantes-flujo-y-estados.md)); no se pagina (fricción L5). *Hick, Gradiente de meta, Similitud.* (L0 a L3)
9. **Una dirección ubica, no nombra** (ya en producción): las direcciones se ven distintas en la lista y nunca sustituyen el nombre escrito. *Evidencia, Postel.* (L1, L3)
10. **Dónde pendiente ofrece dos salidas por intención**: Estoy aquí (acabo de descubrir el lugar: pone el pin sin abrir nada) y Buscar (sé dónde está: abre la hoja con el campo de dirección enfocado). **El mapa vive en la hoja "Dónde está"**, a toda la pantalla, con el mismo botón de ubicación del mapa de Lugares; la dirección se deduce del pin. Sin frases de ayuda: el valor del renglón dice el estado y los iconos llevan tooltip. *Intención, Fitts, UX invisible, Similitud.* (L0, H)
12. **Tipo "Otro" admite decir qué es** (campo opcional "¿Qué es? Ej. taller de cerámica"): se guarda como detalle y sirve para ir formando tipos nuevos sin obligar a nadie. *Postel, UX invisible.* (L2, L3)
11. **Publicar dice qué falta** cuando está deshabilitado ("falta el nombre", "falta dónde está") y viaja sobre el teclado mientras se escribe. *Evidencia, Fitts.* (L0, L1)

**Excepciones declaradas:** ninguna.

**Maquetación del prototipo v2 (revisión pedida por el founder):** barras y franjas como hijos directos de `main.pantalla`, sin envoltorios ni estilos en línea; medido en el navegador: Agenda 63 nodos, Novedades 60, Mi perfil 65, Ajustes 80, Registrar lugar 51; profundidad máxima 6 (contando los trazos de los iconos); cero `div`/`span` sin clase con un solo hijo.

## Qué sigue

1. El founder corrige 12, recorre el prototipo y firma.
2. PR A: Novedades (ruta, campana, fecha de visto). PR B: Ajustes y Mi perfil solo actividad (mueve lo ya hecho). PR C: alta de lugar con renglones resueltos y la hoja del mapa (cierra el PR 3 de OL-010).
