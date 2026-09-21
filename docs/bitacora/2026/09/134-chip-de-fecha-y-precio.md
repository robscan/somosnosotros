# Operador 134 · OL-099 / A6: Chip de fecha y precio numérico

**Sesión:** 2026-09-21  
**Modelo:** Claude Haiku 4.5, esfuerzo bajo → medio (re-solicitado por hallazgos)  
**Rama:** `agenda-evento-arreglos-chicos`  
**Commits:** 68160ac (L6), 3c542f8 (L33)

## L6: Chip de fecha — estado vacío

**Problema medido:** El chip de fecha en la agenda, cuando no hay fecha elegida, mostraba "Hoy" pero listaba TODOS los eventos (no filtrados). Confuso: la etiqueta sugería filtrado, pero no lo había.

**Solución:** Cuando `fecha` está vacío, el chip muestra "Seleccionar" en lugar de "Hoy". El texto es claro sobre el estado: sin fecha elegida, sin filtrado.

**Archivos:** src/components/AgendaInicio.tsx  
**Prueba:** Captura visual (pendiente del gestor en dev server local)

---

## L33: Precio solo numérico

**Problema reportado:** Alguien pegó "www.ticketmaster.com.mx" en el campo de precio. Debe aceptar solo números.

**Solución (rediseño tras devolucion del gestor):**

1. **Extracción de número:** Nueva función `extraerNumero()` en eventos.ts.
   - De cartel: "$150" → "150", "$100 estudiantes" → "100"
   - De valores viejos: mantiene igual comportamiento
   - Si no hay número: vacío

2. **Guardado con "$":** El servidor recibe "150", extrae del cartel o del campo, valida y guarda "$150".
   - Ficha muestra "$150" como hoy
   - JSON-LD no cambia

3. **Pantalla (campo de entrada):**
   - `inputMode="numeric"` + `pattern="[0-9]*"` para teclado numérico
   - Filtrado en tiempo real: `onChange` quita caracteres no numéricos (pegar URL no mete nada)
   - Placeholder simplificado: "Ej. 150"
   - Al editar evento con "$150" guardado, muestra "150"

4. **Validación (servidor):**
   - Solo dígitos, 1-6 caracteres máximo
   - Si no es válido y el usuario escribió algo: "El precio debe ser solo números"
   - Eventos viejos con texto no numérico: al editar, se extrae número si hay, si no, campo vacío

5. **Cartel:** `cartelAFormulario()` extrae número automáticamente

**Archivos:**
- src/lib/eventos.ts: `extraerNumero()`, lógica de guardado con "$", validación
- src/app/eventos/FormularioEvento.tsx: importación, inicialización con extracción, campo numérico

**Pruebas:** `scripts/instituciones/instituciones.test.ts` pasa sin cambios (la extracción funciona servidor side)

**Resultado real:**
```
npm run lint && npm run typecheck && npm test
  lint: ✓ (1 warning no relacionado)
  typecheck: ✓
  test: 712 total, 705 pasaron, 7 fallaron (scripts/test-db.test.ts por falta de `pg`, esperado en worktrees)
```

**Build:** ✓ Sin errores

---

## Notas

- El gestor pidió re-hacer L33 con una lógica más compleja que respete datos viejos y el flujo del cartel.
- El esfuerzo cambió a medio por la complejidad.
- L6 fue aceptado tal cual, sin cambios.
- Documentos faltantes: creados en esta sesión.
