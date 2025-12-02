# Auditoría de Imports

**Fecha:** 2025-12-01

**Total de issues encontrados:** 5

## Resumen por Tipo

- **Wildcard imports (import *):** 0
- **Barrel exports problemáticos:** 5
- **Imports no usados:** 0
- **Imports duplicados:** 0

## ⚠️ Barrel Exports con Muchos Imports

Estos archivos importan muchos componentes de una vez:

- **apps\web\app\assets\[symbol]\page.tsx:17**: import { Button, Card, CardContent, CardHeader, CardTitle, Heading, Text, Stack, Tabs, TabsList, Tab...
- **apps\web\app\components\bloomberg\AssetSnapshot.tsx:12**: import { Card, CardContent, CardHeader, CardTitle, Text, Heading, Stack, Badge, Spinner, Alert, Butt...
- **apps\web\app\components\bloomberg\MacroPanel.tsx:12**: import { Card, CardContent, CardHeader, CardTitle, Select, Spinner, Alert, Text, Stack, Heading, Tab...
- **apps\web\app\components\bloomberg\PortfolioPerformanceMetrics.tsx:12**: import { Card, CardContent, CardHeader, CardTitle, DataTable, Text, Stack, Spinner, Alert, Badge, Se...
- **apps\web\app\contacts\[id]\PrioritiesConcernsSection.tsx:3**: import { Card, CardHeader, CardTitle, CardContent, Text, Button, Input, Modal, ModalHeader, ModalCon...

## Recomendaciones

1. **Evitar 'import *'** - Usar imports específicos para mejor tree-shaking
2. **Dividir imports grandes** - Si hay más de 10 imports de una fuente, considerar dividirlos
3. **Usar imports específicos de @cactus/ui** - Ya implementado correctamente ✅
4. **Verificar imports no usados** - Usar herramientas como ESLint para detectarlos

