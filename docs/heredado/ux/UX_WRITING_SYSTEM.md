> **HEREDADO** de `flowya-ios/product-definition/FLOWYA_UX_WRITING_SYSTEM.md` @ `b19c676` · **Modo: ADAPTAR** · Estado: **SIN RE-VALIDAR** — vale para somosnosotros hasta que el primer OL que lo invoque lo confirme o lo enmiende. Nota de herencia: microcopy, errores, estados vacíos, anti-manipulación; la voz se reescribe en español para una comunidad local. Los nombres "Flowya"/"FLOWYA" y las referencias a Passport/viajero/iOS-only se leen como legado; nada de este archivo es ley nueva por sí mismo (ver `docs/ESTRATEGIA_DE_HERENCIA.md`).

# FLOWYA UX Writing System

**Estado:** CANONICO / UXW
**Fecha:** 2026-04-27

---

## 1. Proposito

UX Writing en FLOWYA no es decorar texto. Es reducir incertidumbre, proteger confianza, sostener emocion y evitar manipulacion.

La voz de FLOWYA debe sentirse clara, humana y cuidadosa. No debe sonar como agencia de viajes agresiva, juego adictivo, app de reviews ni asistente que presume saber mas que el usuario.

---

## 2. Voz y tono

### Voz base

- clara;
- calida;
- sobria;
- exploratoria;
- segura sin ser autoritaria;
- emocional sin exagerar.

### Tono por contexto

| Contexto | Tono |
|---|---|
| Explore | curioso, breve, contextual |
| GeoSheet | orientador, confiable, decision-friendly |
| SpotSheet | concreto, sensorial cuando haya dato |
| Flow | practico, calmado, accionable |
| Passport | reflexivo, celebratorio sin comparacion |
| Account | directo, transparente |
| Error | tranquilo, honesto, accionable |
| Paywall | claro sobre valor, sin presion |

---

## 3. Principios UXW

- Claridad antes que encanto.
- Brevedad sin perder contexto.
- Accion siguiente visible.
- No culpar al usuario.
- No crear urgencia falsa.
- No prometer certeza si hay incertidumbre.
- Distinguir dato, sugerencia y accion.
- Decir que se guarda, que se comparte y que queda privado.
- Preparar i18n desde el inicio.

---

## 4. Palabras y patrones

### Usar

- "Guardar"
- "Agregar a Flow"
- "Ver lugares"
- "Ver zonas"
- "Continuar"
- "Intentar de nuevo"
- "Editar"
- "Quitar"
- "Privado"
- "Compartible"
- "Actualizado"
- "Fuente"

### Evitar

- "Ultima oportunidad"
- "No te lo pierdas"
- "Te estas quedando atras"
- "Completa para ser mejor viajero"
- "Obligatorio" salvo legal/permiso real
- "Gratis" si hay letra chica
- "Recomendado por IA" sin explicacion
- "Seguro" si no hay certeza

---

## 5. Microcopy por superficie

### Search

- Placeholder debe nombrar alcance real.
- Si Search solo cubre geo/spots, no prometer flows/memories.
- No usar "Crear" desde texto libre sin seleccion explicita.
- Si no hay resultado, ofrecer siguiente accion segura.

### GeoSheet

- Ayudar a decidir si vale la pena.
- No saturar con datos.
- Mostrar fuente/frescura en datos sensibles.
- Separar "que saber" de "que hacer".

### SpotSheet

- Explicar lugar puntual y permitir accion.
- No usar placeholders tipo "Sin descripcion" si el contrato dice ocultar.
- Acciones explicitas: guardar, visitar, agregar a Flow, subir fotos.

### Flow

- IA sugiere, usuario decide.
- No persistir cambios sin confirmacion clara.
- Copy de ejecucion debe ser breve y accionable.

### Passport

- Celebrar identidad viajera sin comparacion ni presion.
- No rankings por defecto.
- No shame por paises/lugares faltantes.
- Share debe aclarar que incluye.

### Account / Membership

- Dar control y explicar valor.
- Paywall debe decir que se desbloquea y por que ayuda.
- No ocultar privacidad, exportacion o soporte tras paywall.
- No usar urgencia falsa.

---

## 6. Errores

Todo error debe responder:

1. Que paso?
2. Que puede hacer el usuario?
3. Se perdio algo?

Plantilla:

```text
No pudimos guardar esto.
Tu informacion sigue en pantalla. Intenta de nuevo.
```

Reglas:

- No decir "algo salio mal" como unica informacion.
- No culpar conexion del usuario sin evidencia.
- No mostrar codigos tecnicos salvo modo debug/dev.

---

## 7. Empty states

Un empty state debe:

- explicar estado;
- ofrecer accion;
- no sonar triste ni juzgar.

Ejemplos:

- "Aun no tienes lugares guardados."
- "Explora el mapa o busca una ciudad para empezar."
- "Cuando completes un Flow, aparecera aqui."

Evitar:

- "No hay nada aqui"
- "Todavia no has hecho nada"
- "Empieza ya para no quedarte atras"

---

## 8. Paywalls

Reglas:

- Valor antes que bloqueo.
- Sin FOMO.
- Sin culpa.
- Sin esconder seguridad, privacidad o datos criticos.
- Mostrar alternativa gratuita si existe.
- Explicar si el usuario conserva sus datos al cancelar.

Plantilla:

```text
Desbloquea {capacidad}.
Te ayuda a {beneficio real}.
Incluido en {plan}.
```

---

## 9. i18n

Reglas:

- Evitar frases demasiado largas en botones.
- Preparar labels para expansion de texto.
- No concatenar strings con variables si afecta idioma.
- Search debe tolerar alias e idiomas, pero UI debe usar locale centralizado.

---

## 10. Checklist UXW por PR

```md
## UX Writing
- JTBD del copy:
- Tono por contexto:
- Accion siguiente clara:
- Error/empty/loading revisado:
- Paywall revisado:
- Anti-manipulacion revisada:
- Privacidad/fuente/frescura revisada:
- i18n/listo para localizacion:
```
