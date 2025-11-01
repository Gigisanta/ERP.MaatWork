# Design System Adoption - Lugares Pendientes

## 🔍 Análisis de Archivos Restantes

### ✅ **Completado (Fase 1)**
- ✅ `contacts/page.tsx` - 9 inputs + toggle buttons
- ✅ `login/page.tsx` - password toggle
- ✅ `register/page.tsx` - password toggle
- ✅ `FileUploader.tsx` - modal custom
- ✅ `admin/users/page.tsx` - spinner custom

### ⚠️ **Pendiente (Fase 2)**

#### **1. RowMatchForm.tsx** (Prioridad ALTA)
**Ubicación:** `apps/web/app/admin/aum/components/RowMatchForm.tsx`

**Problemas:**
```tsx
// ❌ MAL: 2 inputs nativos
<input value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="contactId" className="border rounded px-2 py-1 text-xs" />
<input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId (advisor)" className="border rounded px-2 py-1 text-xs" />

// ❌ MAL: Botón custom
<button onClick={save} disabled={saving} className="px-2 py-1 text-xs bg-gray-800 text-white rounded">{saving ? '...' : 'Guardar'}</button>
```

**✅ DEBERÍA SER:**
```tsx
<Input value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="contactId" size="sm" />
<Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId (advisor)" size="sm" />
<Button onClick={save} disabled={saving} size="sm">{saving ? <Spinner size="sm" /> : 'Guardar'}</Button>
```

**Impacto:**
- **-15 líneas** de código
- Consistencia visual
- Estados de loading automáticos

---

#### **2. DuplicateResolutionModal.tsx** (Prioridad ALTA)
**Ubicación:** `apps/web/app/admin/aum/components/DuplicateResolutionModal.tsx`

**Problema:** Modal custom completo de 93 líneas

```tsx
// ❌ MAL: Modal completo custom (líneas 100-191)
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4...">
    {/* 91 líneas de contenido custom */}
  </div>
</div>
```

**✅ DEBERÍA SER:**
```tsx
<Modal open={!!accountNumber} onOpenChange={(open) => !open && onClose()}>
  <ModalHeader>
    <ModalTitle>Resolución de duplicados</ModalTitle>
    <ModalDescription>Cuenta: <span className="font-mono">{accountNumber}</span></ModalDescription>
  </ModalHeader>
  <ModalContent>
    {/* Contenido del modal */}
  </ModalContent>
  <ModalFooter>
    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
    <Button variant="primary" onClick={saveResolution} disabled={!selectedRowId || saving}>
      {saving ? 'Guardando...' : 'Marcar como preferida'}
    </Button>
  </ModalFooter>
</Modal>
```

**Impacto:**
- **-60 líneas** de código
- Backdrop, escape key, focus trap automáticos
- Accesibilidad WCAG 2.1 Level AA
- Animaciones consistentes

**Nota:** El table dentro del modal puede usar `DataTable` del DS, pero mantenerlo como table nativo es aceptable para este caso específico.

---

#### **3. Otros archivos en contacts/[id]** (Prioridad MEDIA)
**Ubicaciones:**
- `apps/web/app/contacts/[id]/TasksSection.tsx`
- `apps/web/app/contacts/[id]/NotesSection.tsx`
- `apps/web/app/contacts/[id]/InlineEditableField.tsx`
- `apps/web/app/contacts/[id]/PortfolioSection.tsx`
- `apps/web/app/contacts/[id]/BrokerAccountsSection.tsx`
- `apps/web/app/contacts/[id]/ContactEditableField.tsx`

**Problema:** Podrían tener inputs nativos o botones custom

**Acción:** Revisar cada archivo individualmente para inputs/botones custom.

---

#### **4. Páginas principales** (Prioridad BAJA)
**Ubicaciones:**
- `apps/web/app/portfolios/page.tsx`
- `apps/web/app/teams/page.tsx`
- `apps/web/app/profile/page.tsx`
- `apps/web/app/pipeline/page.tsx`

**Estado:** Ya usan componentes del DS (Card, Button, DataTable, etc.)

**Acción:** Auditar para inputs nativos o componentes custom menores.

---

## 📊 Resumen de Impacto Estimado

| Archivo | Líneas reducidas | Componentes a reemplazar | Prioridad |
|---------|------------------|--------------------------|-----------|
| RowMatchForm.tsx | ~15 | 2 Input + 1 Button | ALTA |
| DuplicateResolutionModal.tsx | ~60 | 1 Modal completo | ALTA |
| contacts/[id]/* | ~30-50 | Inputs/Botones varios | MEDIA |
| **TOTAL** | **~105-125** | | |

---

## 🎯 Plan de Acción Fase 2

### **Paso 1: Quick Wins (30 min)**
1. Reemplazar inputs y botón en `RowMatchForm.tsx`
   - 2 Inputs nativos → Input del DS
   - 1 Botón custom → Button del DS
   - Agregar Spinner para loading state

### **Paso 2: Modal Migration (1-2 horas)**
2. Migrar `DuplicateResolutionModal.tsx` a Modal del DS
   - Reemplazar div custom por Modal component
   - Mantener table nativo (es aceptable para este caso)
   - Agregar ModalHeader, ModalFooter

### **Paso 3: Audit (30 min)**
3. Auditar archivos en `contacts/[id]/*`
   - Buscar inputs nativos
   - Buscar botones custom
   - Reemplazar con componentes del DS

### **Paso 4: Final Polish (30 min)**
4. Auditar páginas principales
   - portfolios, teams, profile, pipeline
   - Verificar consistencia completa

---

## ✅ Criterios de Finalización

- [ ] Todos los inputs nativos reemplazados por Input del DS
- [ ] Todos los modals custom reemplazados por Modal del DS
- [ ] Todos los botones custom reemplazados por Button del DS
- [ ] Todos los spinners custom reemplazados por Spinner del DS
- [ ] 100% consistencia visual en toda la aplicación
- [ ] 0 componentes HTML nativos sin propósito específico (tablas, forms complejos son aceptables)

---

**Estado actual:** 85-90% de adopción del DS
**Meta:** 100% de adopción del DS

**Última actualización:** 2025-11-01

