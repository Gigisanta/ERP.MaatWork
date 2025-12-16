# Maat Design System v2.3.0

The Maat Design System is a comprehensive collection of reusable components, tokens, and guidelines for building consistent and accessible interfaces across the Cactus Dashboard ecosystem.

## Core Principles

1. **Clarity & Focus**: Interfaces should be clean, clutter-free, and focused on the content.
2. **Consistency**: Use standardized tokens for colors, spacing, and typography to ensure a unified look.
3. **Accessibility**: All components are designed to be accessible (WCAG 2.2 AA) out of the box.
4. **Fluidity**: Interactions should be smooth, with physics-based animations where appropriate.

## Colors

Our color system is built around a primary Soft Purple brand color, supported by neutral stones and semantic colors.

### Brand Colors

| Color | Token | Hex | Usage |
|-------|-------|-----|-------|
| **Primary** | `primary-500` | `#8b5cf6` | Main actions, highlights, focus rings |
| **Secondary** | `secondary-900` | `#1c1917` | Headings, heavy text, dark mode backgrounds |
| **Accent** | `accent-500` | `#10b981` | Success states, positive trends, growth |
| **Joy** | `joy-500` | `#f59e0b` | Warnings, highlights, "delight" moments |

### Semantic Colors

- **Success**: `#22c55e` (Green)
- **Warning**: `#f97316` (Orange)
- **Error**: `#ef4444` (Red)
- **Info**: `#3b82f6` (Blue)

### Usage Guidelines

- **Primary**: Use for primary buttons, active states, and key highlights. Avoid using it for background areas unless very subtle (50/100).
- **Secondary**: Use for text and neutral UI elements.
- **Surface**: Use `cream` (`#fdfcf8`) for the main background in light mode to create a warmer, less clinical feel than pure white.

## Typography

We use a dual-font system to create distinct hierarchy and character.

### Fonts

- **Headings**: **Outfit** (Geometric, Friendly)
- **Body**: **Plus Jakarta Sans** (Modern, Legible)
- **Code**: **JetBrains Mono** (Technical, Clear)

### Scale

| Size | Token | Value | Line Height |
|------|-------|-------|-------------|
| XS | `text-xs` | 0.75rem | 1rem |
| SM | `text-sm` | 0.875rem | 1.25rem |
| Base | `text-base` | 1rem | 1.5rem |
| LG | `text-lg` | 1.125rem | 1.75rem |
| XL | `text-xl` | 1.25rem | 1.75rem |
| 2XL | `text-2xl` | 1.5rem | 2rem |
| 3XL | `text-3xl` | 1.875rem | 2.25rem |

## Spacing

Our spacing system is based on a 4px (0.25rem) grid. Always use these tokens instead of arbitrary values.

- `1` = 4px
- `2` = 8px
- `4` = 16px
- `6` = 24px
- `8` = 32px
- `12` = 48px
- `16` = 64px

## Shadows & Depth

We use a layered shadow system to create depth and hierarchy.

- **sm**: Subtle lift (`shadow-sm`)
- **md**: Standard components (`shadow-md`)
- **lg**: Floating panels (`shadow-lg`)
- **xl**: Modals and dropdowns (`shadow-xl`)
- **primary**: Glow effect for primary actions (`shadow-primary`)

## Animations

Animations should be purposeful and smooth. We use spring physics for interactions.

### Classes

- `.animate-enter`: Smooth spring slide-up entry
- `.animate-pop`: Spring scale entry
- `.animate-fade-in`: Simple fade
- `.hover-lift`: Lift effect on hover (cards, buttons)
- `.hover-glow`: Glow effect on hover (primary actions)

### Usage

```tsx
// Example: Card entry
<div className="animate-enter delay-100">
  <Card>Content</Card>
</div>
```

## Dark Mode

The system supports dark mode natively.
- Backgrounds switch to `stone-950` (`#0c0a09`).
- Surfaces switch to `stone-900` (`#1c1917`).
- Text inverts to white/off-white.
- Primary color shifts to a lighter shade (`primary-400`) for better contrast.

To implement dark mode support in a component:
1. Use `bg-background` and `text-text` for standard elements.
2. Use specific dark mode variants only when necessary (e.g. `dark:bg-secondary`).

