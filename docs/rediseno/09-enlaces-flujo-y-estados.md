# Enlaces y redes · fricción, flujo y decisiones (v1)

**Fecha:** 2026-09-14 · **Pantallas:** alta y edición de artista y de lugar ("Más detalles"), ficha de artista y de lugar (fila de acciones) · **Origen:** pregunta del founder tras firmar Artistas: "habrá cineastas que usen Vimeo, músicos que usen SoundCloud… ¿cómo hacemos que los campos se agreguen sobre demanda? Aparece una gran lista de redes que podría no usar" · **Carta:** [PRINCIPIOS_UX.md](../PRINCIPIOS_UX.md) · **Quién firma:** el founder (aprobó la propuesta: "sí, voy").

## Fricción

| # | Pantalla | Fricción | Ley | Severidad | Propuesta en una línea |
|---|---|---|---|---|---|
| F1 | Alta y edición | Seis campos fijos de redes, casi nadie llena más de dos y siempre falta una (Vimeo, SoundCloud, Bandcamp, TikTok) | Hick · UX invisible | Alta | Un solo campo: pegas el enlace y el sistema reconoce la red; "Otro enlace" tras el primero |

## Flujo

```mermaid
flowchart LR
  A[Campo: enlace, @usuario o WhatsApp] --> B{Se reconoce}
  B -- red conocida --> C[Ficha con icono y nombre de la red]
  B -- dominio cualquiera --> D[Ficha "Sitio" con el dominio]
  B -- no es nada --> E[Aviso en línea: no parece un enlace]
  C --> F[Otro enlace]
  D --> F
```

## Estados

| ID | Estado | Qué ve la persona | Qué puede hacer |
|---|---|---|---|
| E0 | Sin enlaces | Campo "Enlace, @usuario o WhatsApp" con ayuda: "Pégalo y reconocemos la red: Instagram, YouTube, Vimeo…" | Pegar y Añadir (o Enter, o salir del campo) |
| E1 | Con enlaces | Lista con icono, nombre de la red y el enlace corto; ✕ en cada uno; campo "Otro enlace" | Quitar; añadir |
| E2 | No reconocido | "No parece un enlace, un @usuario ni un teléfono." bajo el campo; no se añade | Corregir |
| E3 | Repetido | "Ese ya está." | Seguir |
| E4 | Lleno (8) | El campo desaparece; solo la lista | Quitar alguno |
| E5 | Ficha | Un botón de icono por enlace: Instagram, YouTube, Vimeo… o el genérico con el dominio ("casa1100.mx") | Abrir |

## Decisiones de interacción

1. **La persona no elige la red**: pega y el sistema la reconoce por el dominio. Reconocidas: Instagram, Facebook, TikTok, YouTube, Vimeo, Spotify, SoundCloud, Bandcamp, Apple Music, WhatsApp, X, Threads, Linktree. Cualquier otro dominio es "Sitio" y su etiqueta es el dominio. *UX invisible, Hick.* (F1)
2. **Atajos que la gente escribe**: "@usuario" es Instagram (lo habitual en la ciudad); un número de diez dígitos (o con +52) es WhatsApp y se convierte en enlace wa.me. Lo que no parece nada se rechaza con aviso en línea, no se guarda basura. *Postel (acepta formatos varios, guarda normalizado), Evidencia.*
3. **Un solo campo y "Otro enlace"**: sin lista de campos; tras el primero, el campo cambia de etiqueta. Máximo ocho. *Progressive disclosure.*
4. **Añadir sin botón obligado**: Enter o salir del campo también añaden; el botón Añadir queda para el pulgar. *Fitts, el gesto gana.*
5. **La ficha enseña un botón por enlace** con el icono de la red y su nombre, o el icono genérico y el dominio. Compartir sigue primero. *Similitud con lo firmado en Lugares y Artistas.*
6. **Sin migración**: `redes` ya era JSON; pasa de objeto por red fija a lista ordenada de enlaces con su red, y las fichas viejas se convierten al leerlas. Aplica a lugares y artistas por igual.

**Excepciones declaradas:** ninguna.

## Qué sigue

1. Implementado en el mismo día (bitácora [024](../bitacora/2026/09/024-enlaces-reconocidos.md)); PR.
2. Firma del founder en el iPhone.
