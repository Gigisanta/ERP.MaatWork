# Cactus CRM Design System

## Overview

This document defines the design system for Cactus CRM, providing a consistent, scalable foundation for UI development across the application.

## Color System

### Primary Color

**Green** is our primary brand color: `#22c55e` (equivalent to Tailwind `green-500`)

- **Primary**: `#22c55e` - Main brand color
- **Primary Hover**: `#16a34a` - Interactive states
- **Primary Active**: `#15803d` - Active/pressed states
- **Primary Light**: `#4ade80` - Subtle backgrounds
- **Primary Subtle**: `#dcfce7` - Lightest backgrounds

### Semantic Colors

- **Success**: `#22c55e` (same as primary green)
  - Used for: positive states, confirmations, successful actions
- **Error**: `#ef4444` (red)
  - Used for: errors, destructive actions, warnings
- **Warning**: `#f59e0b` (amber)
  - Used for: cautions, pending states
- **Info**: `#3b82f6` (blue)
  - Used for: informational content, links

### Neutral Colors

- **Background**: `#ffffff` - Page background
- **Surface**: `#f9fafb` - Card/container backgrounds
- **Border**: `#e5e7eb` - Borders and dividers
- **Text**: `#111827` - Primary text
- **Text Secondary**: `#6b7280` - Secondary text
- **Text Muted**: `#9ca3af` - Muted/hint text
- **Text Inverse**: `#ffffff` - Text on colored backgrounds

## Implementation

### CSS Custom Properties

All colors are defined as CSS custom properties in `apps/web/app/globals.css`:

```css
:root {
  --color-primary: #22c55e;
  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;
  /* ... more colors */
}
```

### Using Colors in Components

**Preferred Method**: Use Tailwind utility classes with semantic names

```tsx
// Primary buttons
className="bg-primary text-text-inverse hover:bg-primary-hover"

// Success states
className="bg-success-subtle text-success"

// Error states  
className="bg-error-subtle text-error"

// Text colors
className="text-text"          // Primary text
className="text-text-secondary" // Secondary text
className="text-text-muted"    // Muted text
```

**For Dynamic/Inline Styles**: Use CSS variables

```tsx
style={{ color: 'var(--color-primary)' }}
stroke="var(--color-chart-1)"
```

### Tailwind Configuration

Colors are configured in `apps/web/tailwind.config.js` and `packages/ui/src/tailwind-preset.ts` to reference CSS variables:

```javascript
colors: {
  primary: {
    DEFAULT: 'var(--color-primary)',
    hover: 'var(--color-primary-hover)',
    // ...
  },
  // ...
}
```

## Component Patterns

### Buttons

```tsx
import { Button } from '@cactus/ui';

// Primary (default)
<Button variant="primary">Click me</Button>

// Secondary
<Button variant="secondary">Cancel</Button>

// Outline
<Button variant="outline">Details</Button>

// Ghost
<Button variant="ghost">Skip</Button>

// Danger
<Button variant="danger">Delete</Button>
```

### Badges

```tsx
import { Badge } from '@cactus/ui';

// Default
<Badge variant="default">Neutral</Badge>

// Success
<Badge variant="success">Active</Badge>

// Error
<Badge variant="error">Failed</Badge>

// Warning
<Badge variant="warning">Pending</Badge>

// Brand
<Badge variant="brand">Featured</Badge>
```

### Cards

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@cactus/ui';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

## Consistency Guidelines

### ❌ Don't Use

- Hardcoded hex colors: `#22c55e`, `#ef4444`
- Tailwind color variants without semantic meaning: `text-green-600`, `bg-red-500`
- Inline styles with hardcoded colors
- Direct color references in logic (except for data visualization)

### ✅ Do Use

- Semantic Tailwind classes: `text-primary`, `bg-success-subtle`
- CSS variables for dynamic colors: `var(--color-primary)`
- Component variants for states
- Semantic color tokens for all UI elements

### Examples

**Good**:
```tsx
// Use semantic classes
<div className="bg-success-subtle text-success border-success">
  Success message
</div>

// Use CSS variables in charts/SVG
<Line stroke="var(--color-chart-1)" />
```

**Bad**:
```tsx
// Hardcoded colors
<div className="bg-green-50 text-green-700">
  Success message
</div>

// Direct hex values
<Line stroke="#3b82f6" />
```

## Migration Notes

### Converting Old Code

If you encounter old code using hardcoded colors:

1. **Replace Tailwind color classes** with semantic equivalents:
   - `text-green-600` → `text-primary`
   - `bg-red-50` → `bg-error-subtle`
   - `border-gray-200` → `border-border`

2. **Replace inline styles** with Tailwind classes or CSS variables:
   ```tsx
   // Before
   <div style={{ backgroundColor: '#dcfce7' }}>
   
   // After  
   <div className="bg-success-subtle">
   ```

3. **Update Chart colors** to use CSS variables:
   ```tsx
   // Before
   const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];
   
   // After
   const COLORS = [
     'var(--color-chart-1)',
     'var(--color-chart-2)', 
     'var(--color-chart-3)'
   ];
   ```

## Chart Colors

For data visualization (charts, graphs), use the predefined chart color palette:

- **Chart 1**: Blue (`var(--color-chart-1)`)
- **Chart 2**: Green (`var(--color-chart-2)`)
- **Chart 3**: Amber (`var(--color-chart-3)`)
- **Chart 4**: Red (`var(--color-chart-4)`)
- **Chart 5**: Purple (`var(--color-chart-5)`)
- **Chart 6**: Cyan (`var(--color-chart-6)`)

These ensure consistent coloring across all visualizations.

## Accessibility

### Color Contrast

All defined colors meet WCAG AA contrast requirements:
- Text on colored backgrounds: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: Clear visual feedback

### Best Practices

1. **Never rely solely on color** to convey information
2. **Use icons or text** in addition to color
3. **Test with color blindness simulators**
4. **Provide multiple visual cues** for important states

## Theming (Future)

The color system is built on CSS custom properties, making it ready for future theming support:

- **Dark mode**: Override `:root` colors in `[data-theme="dark"]`
- **Brand customization**: Change `--color-primary` for white-label options
- **High contrast mode**: Override colors for accessibility

## Questions?

For questions or suggestions about the design system, contact the development team or open an issue in the repository.

