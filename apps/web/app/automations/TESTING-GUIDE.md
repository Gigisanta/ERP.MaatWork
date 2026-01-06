# Guía de Testing - Sistema de Automatizaciones de Email

## Cambios Implementados

### 1. Bug de Persistencia (CORREGIDO ✅)

**Problema:** La configuración guardada no persistía al recargar la página porque un `useEffect` sobrescribía el campo `senderEmail`.

**Solución:** 
- Eliminado el `useEffect` secundario que sobrescribía `senderEmail`
- Movida la lógica de establecer email por defecto al bloque catch del 404
- Ahora solo establece el email del usuario cuando es una configuración NUEVA (404)

**Archivos modificados:**
- `apps/web/app/automations/components/EmailAutomationCard.tsx`

### 2. Editor WYSIWYG con Upload de Imágenes (IMPLEMENTADO ✅)

**Nuevo componente:** `RichTextEditor`
- Editor basado en TipTap (moderno, extensible)
- Barra de herramientas con: negrita, cursiva, tachado, listas, enlaces, imágenes
- Upload de imágenes con validación (max 5MB, solo imágenes)
- Soporte para drag & drop de variables `{contact.firstName}`, etc.

**Backend:**
- Nuevo endpoint: `POST /v1/uploads/images`
- Validación de tipo MIME y extensión
- Almacenamiento en `uploads/email-images/`
- Rate limiting aplicado (mismo preset que otros uploads)
- Archivos servidos estáticamente en `/uploads/`

**Archivos creados:**
- `apps/web/app/components/editors/RichTextEditor.tsx`
- `apps/web/app/components/editors/RichTextEditor.css`
- `apps/api/src/routes/uploads/images.ts`
- `apps/api/src/routes/uploads/index.ts`
- `apps/api/uploads/email-images/.gitkeep`
- `apps/api/uploads/.gitignore`

**Archivos modificados:**
- `apps/web/app/automations/components/EmailAutomationCard.tsx`
- `apps/api/src/index.ts`

---

## Testing Manual

### Test 1: Persistencia de Configuración

**Objetivo:** Verificar que la configuración guardada se mantiene después de recargar.

**Pasos:**
1. Ir a http://localhost:3000/automations
2. Abrir la tarjeta "Email Segunda Reunión"
3. Modificar:
   - Subject: "Confirmación de tu segunda reunión con nosotros"
   - Body: Escribir texto con formato (negrita, listas, etc.)
   - Habilitar la automatización (checkbox)
4. Clic en "Guardar Configuración"
5. Esperar mensaje de éxito
6. **Recargar la página (F5)**
7. Verificar que:
   - ✅ El subject mantiene el texto guardado
   - ✅ El body mantiene el contenido y formato
   - ✅ El checkbox de "Habilitar" mantiene su estado
   - ✅ El email de envío NO se sobrescribe

**Resultado esperado:** Todos los campos mantienen sus valores guardados.

---

### Test 2: Editor WYSIWYG - Formato de Texto

**Objetivo:** Verificar que el editor permite formatear texto correctamente.

**Pasos:**
1. En el campo "Contenido", escribir: "Hola Juan, bienvenido a Cactus"
2. Seleccionar "Juan" y hacer clic en el botón **B** (negrita)
3. Seleccionar "Cactus" y hacer clic en el botón **I** (cursiva)
4. Presionar Enter y crear una lista:
   - Clic en el botón de lista con viñetas (•)
   - Escribir: "Beneficio 1"
   - Enter
   - Escribir: "Beneficio 2"
5. Guardar configuración
6. Recargar página

**Resultado esperado:**
- ✅ "Juan" aparece en negrita
- ✅ "Cactus" aparece en cursiva
- ✅ La lista se mantiene con viñetas
- ✅ El HTML generado es limpio (sin estilos inline innecesarios)

---

### Test 3: Upload de Imágenes

**Objetivo:** Verificar que se pueden subir y mostrar imágenes en el editor.

**Pasos:**
1. En el editor, clic en el botón 🖼️ (Insertar imagen)
2. Seleccionar una imagen de prueba (< 5MB, formato jpg/png/gif/webp)
3. Esperar a que se suba (icono cambia a ⏳ durante upload)
4. Verificar que la imagen aparece en el editor
5. Guardar configuración
6. Recargar página
7. Verificar que la imagen sigue visible

**Resultado esperado:**
- ✅ Upload exitoso sin errores
- ✅ Imagen visible en el editor
- ✅ Imagen persiste después de recargar
- ✅ URL de la imagen es absoluta (incluye dominio)

**Validaciones a probar:**
- ❌ Archivo > 5MB → debe mostrar error
- ❌ Archivo no-imagen (ej: PDF) → debe mostrar error

---

### Test 4: Drag & Drop de Variables

**Objetivo:** Verificar que las variables se pueden arrastrar al editor.

**Pasos:**
1. Localizar los badges de variables: "Nombre Cliente", "Nombre Completo", etc.
2. Arrastrar "Nombre Cliente" al editor (drag & drop)
3. Verificar que se inserta `{contact.firstName}` en el texto
4. Repetir con otras variables
5. Guardar configuración

**Resultado esperado:**
- ✅ Variables se insertan correctamente en formato `{variable}`
- ✅ Se pueden arrastrar al subject (input) y al body (editor)
- ✅ Las variables se mantienen después de guardar

---

### Test 5: Envío de Email Real (E2E)

**Objetivo:** Verificar que los emails se envían correctamente con el HTML generado.

**Pre-requisitos:**
- Cuenta de Google conectada en `/profile`
- Configuración de automatización guardada y habilitada

**Pasos:**
1. Crear un contacto de prueba con email válido
2. Asignar el contacto a la etapa "Prospecto"
3. Cambiar la etapa del contacto a "Segunda reunion"
4. Verificar en el log del backend (terminal de API) que se disparó la automatización
5. Revisar el email recibido en la bandeja del contacto

**Resultado esperado:**
- ✅ Email recibido en la bandeja del contacto
- ✅ Subject correcto
- ✅ Variables reemplazadas correctamente (ej: `{contact.firstName}` → "Juan")
- ✅ Formato HTML se ve correctamente (negrita, cursiva, listas)
- ✅ Imágenes se muestran correctamente (si se incluyeron)

**Logs a verificar:**
```bash
# En terminal de API (puerto 3001)
# Buscar líneas como:
INFO: Checking automations { triggerType: 'pipeline_stage_change', ... }
INFO: Automation executed successfully { automationId: '...', contactId: '...' }
```

---

## Troubleshooting

### Problema: "No se recibió ninguna imagen"

**Causa:** El backend no está recibiendo el FormData correctamente.

**Solución:**
- Verificar que el endpoint `/v1/uploads/images` está registrado en `apps/api/src/index.ts`
- Verificar que multer está instalado: `cd apps/api && pnpm list multer`

### Problema: Imagen no se muestra en el email

**Causa:** URL relativa en lugar de absoluta.

**Solución:**
- Verificar que `handleImageUpload` en `EmailAutomationCard.tsx` convierte URLs relativas a absolutas
- En producción, asegurar que `window.location.origin` apunta al dominio correcto

### Problema: Editor no carga (spinner infinito)

**Causa:** Dependencias de TipTap no instaladas correctamente.

**Solución:**
```bash
cd apps/web
pnpm install
```

### Problema: Configuración no persiste

**Causa:** El bug de persistencia no se corrigió correctamente.

**Solución:**
- Verificar que el `useEffect` secundario fue eliminado
- Verificar que la lógica de establecer `senderEmail` está dentro del catch del 404

---

## Checklist de Verificación

Antes de considerar la funcionalidad completa, verificar:

- [x] Typecheck pasa sin errores (`pnpm typecheck`)
- [x] Backend compila sin errores
- [x] Frontend compila sin errores
- [x] Seed de automations ejecutado (`pnpm -F @maatwork/db seed:automations`)
- [ ] Test 1: Persistencia ✅
- [ ] Test 2: Formato de texto ✅
- [ ] Test 3: Upload de imágenes ✅
- [ ] Test 4: Drag & drop de variables ✅
- [ ] Test 5: Envío de email real ✅

---

## Próximos Pasos (Futuro)

### Mejoras Opcionales

1. **Compresión de imágenes:**
   - Usar `sharp` en backend para comprimir imágenes antes de guardar
   - Reducir tamaño de archivos automáticamente

2. **Vista previa del email:**
   - Botón "Vista previa" que muestra cómo se verá el email
   - Modal con el HTML renderizado

3. **Templates predefinidos:**
   - Galería de templates de email pre-diseñados
   - Usuarios pueden seleccionar un template base

4. **Migración a S3/Cloudinary:**
   - Cuando escale, migrar uploads a cloud storage
   - Mantener misma API, solo cambiar storage backend

5. **Historial de versiones:**
   - Guardar versiones anteriores de configuraciones
   - Permitir rollback a versión anterior

---

## Notas Técnicas

### Seguridad

- ✅ Solo usuarios autenticados pueden subir imágenes
- ✅ Validación de tipo MIME y extensión
- ✅ Límite de tamaño de archivo (5MB)
- ✅ Rate limiting aplicado a uploads
- ✅ Nombres de archivo sanitizados (UUID)

### Performance

- ✅ Editor TipTap es lazy-loaded (solo carga cuando se usa)
- ✅ Imágenes servidas estáticamente por Express (rápido)
- ⚠️ Considerar CDN para imágenes en producción

### Compatibilidad

- ✅ HTML generado es compatible con Gmail API
- ✅ Imágenes con URLs absolutas funcionan en emails
- ✅ Funciona en todos los navegadores modernos

---

## Referencias

- [TipTap Documentation](https://tiptap.dev/)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Gmail API - Send Email](https://developers.google.com/gmail/api/guides/sending)



