# 🎨 Sistema de Diseño - Cactus Dashboard

Guía del sistema de colores y estilos del proyecto.

## 🌈 Paleta de Colores

### Colores Principales (Cactus)

```css
--cactus-50:  #f7f5f0   /* Fondos muy claros */
--cactus-100: #ede8d9   /* Fondos claros */
--cactus-200: #ddd1b3   /* Bordes suaves */
--cactus-300: #c8b584   /* Elementos secundarios */
--cactus-400: #b59a5e   /* Elementos activos */
--cactus-500: #a68547   /* Color principal */
--cactus-600: #8f6f3c   /* Hover states */
--cactus-700: #775a32   /* Texto sobre fondos claros */
--cactus-800: #644a2d   /* Texto principal */
--cactus-900: #553f29   /* Texto muy oscuro */
```

### Colores Semánticos

#### Success (Verde)
```css
--success-100: #dcf2dc
--success-400: #5cb85c
--success-500: #3d8b3d
```

#### Warning (Amarillo)
```css
--warning-100: #fef3c7
--warning-400: #fbbf24
--warning-500: #f59e0b
```

#### Error (Rojo/Terracota)
```css
--error-100: #fee2e2
--error-400: #f87171
--error-500: #dc6545
```

#### Info (Azul)
```css
--info-100: #dbeafe
--info-400: #60a5fa
--info-500: #3b82f6
```

### Colores Neutros
```css
--neutral-50:  #fafaf9
--neutral-100: #f5f5f4
--neutral-200: #e7e5e4
--neutral-300: #d6d3d1
--neutral-500: #78716c
--neutral-700: #44403c
--neutral-900: #1c1917
```

## 🎯 Uso de Colores por Componente

### Estados de Contactos CRM

```typescript
// src/utils/statusColors.ts
export const getContactStatusColor = (status: string) => {
  const colors = {
    'Prospecto': 'bg-cactus-100 text-cactus-800',
    'Cliente': 'bg-success-400 text-white',
    'Inactivo': 'bg-error-400 text-white',
    'En Negociación': 'bg-warning-400 text-white'
  };
  return colors[status] || 'bg-neutral-200 text-neutral-800';
};
```

### Prioridades de Tareas

```typescript
export const getPriorityColor = (priority: string) => {
  const colors = {
    'low': 'bg-success-400',
    'medium': 'bg-warning-400',
    'high': 'bg-error-400',
    'urgent': 'bg-error-500'
  };
  return colors[priority] || 'bg-neutral-400';
};
```

### Estados de Tareas

```typescript
export const getTaskStatusColor = (status: string) => {
  const colors = {
    'todo': 'bg-neutral-100 text-neutral-800',
    'in_progress': 'bg-info-100 text-info-800',
    'completed': 'bg-success-100 text-success-800',
    'cancelled': 'bg-error-100 text-error-800'
  };
  return colors[status];
};
```

## 🔤 Tipografía

### Fuentes
- **Principal**: System UI (SF Pro, Segoe UI, etc.)
- **Monospace**: Menlo, Monaco, Courier New

### Tamaños
```css
text-xs:   0.75rem  /* 12px */
text-sm:   0.875rem /* 14px */
text-base: 1rem     /* 16px */
text-lg:   1.125rem /* 18px */
text-xl:   1.25rem  /* 20px */
text-2xl:  1.5rem   /* 24px */
text-3xl:  1.875rem /* 30px */
```

### Pesos
```css
font-normal:    400
font-medium:    500
font-semibold:  600
font-bold:      700
```

## 📏 Espaciado

```css
space-1:  0.25rem  /* 4px */
space-2:  0.5rem   /* 8px */
space-3:  0.75rem  /* 12px */
space-4:  1rem     /* 16px */
space-6:  1.5rem   /* 24px */
space-8:  2rem     /* 32px */
space-12: 3rem     /* 48px */
```

## 🎨 Componentes

### Botones

```tsx
// Primario
<button className="bg-cactus-600 hover:bg-cactus-700 text-white px-4 py-2 rounded-lg">
  Acción Principal
</button>

// Secundario
<button className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 px-4 py-2 rounded-lg">
  Acción Secundaria
</button>

// Success
<button className="bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded-lg">
  Guardar
</button>

// Error
<button className="bg-error-500 hover:bg-error-600 text-white px-4 py-2 rounded-lg">
  Eliminar
</button>
```

### Cards

```tsx
<div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
  {/* Contenido */}
</div>
```

### Badges

```tsx
// Status badge
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cactus-100 text-cactus-800">
  Activo
</span>
```

### Inputs

```tsx
<input 
  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
  type="text"
/>
```

## 🌓 Modo Oscuro (Futuro)

Preparado para implementar modo oscuro con:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: var(--neutral-900);
    --foreground: var(--neutral-50);
    /* ... */
  }
}
```

## ♿ Accesibilidad

### Contraste
- Texto sobre fondo claro: mínimo 4.5:1
- Texto grande: mínimo 3:1
- Elementos UI: mínimo 3:1

### Focus States
Todos los elementos interactivos tienen focus visible:
```css
focus:ring-2 focus:ring-cactus-500 focus:ring-offset-2
```

## 📱 Responsive

### Breakpoints
```css
sm:  640px   /* Small devices */
md:  768px   /* Medium devices */
lg:  1024px  /* Large devices */
xl:  1280px  /* Extra large */
2xl: 1536px  /* 2X Extra large */
```

### Mobile First
Todos los estilos son mobile-first:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* ... */}
</div>
```

## 🎭 Animaciones

```css
/* Transiciones suaves */
transition-colors duration-200
transition-all duration-300

/* Hover elevación */
hover:shadow-lg transition-shadow

/* Fade in */
animate-fade-in
```

---

**Última actualización:** Octubre 2025  
**Versión:** 1.0.0

