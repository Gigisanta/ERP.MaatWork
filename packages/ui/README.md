# @cactus/ui - Design System

A modern, accessible React component library built with Tailwind CSS, Radix Primitives, and design tokens.

## Features

- 🎨 **Themable**: Light, dark, and high-contrast themes with CSS variables
- ♿ **Accessible**: WCAG 2.2 AA compliant with keyboard navigation and screen reader support
- 📱 **Responsive**: Mobile-first design with consistent spacing and typography
- 🎯 **TypeScript**: Full type safety with comprehensive prop interfaces
- 🌳 **Tree-shakable**: Import only the components you need
- 🧪 **Tested**: Unit tests with RTL and jest-axe

## Installation

```bash
# In your monorepo workspace
pnpm add @cactus/ui
```

## Quick Start

### 1. Configure Tailwind CSS

```javascript
// tailwind.config.js
const { uiPreset } = require('@cactus/ui/tailwind-preset');

module.exports = {
  presets: [uiPreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};
```

### 2. Import Styles

```tsx
// app/layout.tsx or _app.tsx
import '@cactus/ui/styles';
```

### 3. Add Theme Provider

```tsx
import { ThemeProvider } from '@cactus/ui';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <YourApp />
    </ThemeProvider>
  );
}
```

### 4. Use Components

```tsx
import { Button, Input, Card, Header } from '@cactus/ui';

function MyPage() {
  return (
    <div>
      <Header 
        logo={<span>My App</span>}
        navItems={[
          { label: 'Home', href: '/', icon: 'home' },
          { label: 'About', href: '/about', icon: 'info' }
        ]}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <Input label="Name" placeholder="Enter your name" />
          <Button>Submit</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Components

### Primitives

- **Box**: Polymorphic container component
- **Stack**: Flexbox layout with gap and alignment
- **Grid**: CSS Grid layout system
- **Text**: Typography with size, weight, and color variants
- **Heading**: Semantic headings with consistent styling
- **VisuallyHidden**: Screen reader only content
- **FocusRing**: Focus management wrapper

### Navigation

- **Header**: App header with logo, navigation, and user menu
- **Nav**: Horizontal and vertical navigation
- **Sidebar**: Collapsible sidebar navigation
- **Breadcrumbs**: Breadcrumb navigation
- **Tabs**: Tabbed interface with multiple variants
- **Pagination**: Page navigation with ellipsis support

### Input Components

- **Button**: Multiple variants (primary, secondary, ghost, danger, outline)
- **Input**: Text input with label, helper text, and error states
- **Select**: Dropdown selection with Radix primitives
- **Checkbox**: Checkbox input with label integration
- **Switch**: Toggle switch component

### Feedback Components

- **Card**: Container with header, content, and footer slots
- **EmptyState**: Empty state with icon, title, description, and action
- **Badge**: Status and category indicators

### Icons

- **Icon**: Wrapper around Lucide React icons with consistent sizing

## Theming

### Theme Provider

```tsx
import { ThemeProvider } from '@cactus/ui';

<ThemeProvider defaultTheme="light">
  <App />
</ThemeProvider>
```

### Available Themes

- `light`: Default light theme
- `dark`: Dark theme with inverted colors
- `high-contrast`: High contrast theme for accessibility

### CSS Variables

The design system uses CSS variables for theming:

```css
:root {
  --color-text-primary: oklch(20% 0.02 240);
  --color-bg-base: oklch(98% 0.01 240);
  --color-brand-primary: oklch(60% 0.15 140);
  /* ... */
}
```

### Custom Themes

You can create custom themes by overriding CSS variables:

```css
[data-theme="custom"] {
  --color-brand-primary: oklch(70% 0.20 180);
  --color-brand-hover: oklch(65% 0.18 180);
}
```

## Design Tokens

### Colors (OKLCH)

- **Neutral**: 50-900 scale for text and backgrounds
- **Cactus**: Brand colors in 50-900 scale
- **Semantic**: Success, warning, error colors
- **Text**: Primary, secondary, muted, inverse
- **Background**: Base, surface, elevated, inverse

### Typography

- **Font Family**: Inter (sans), JetBrains Mono (mono)
- **Font Size**: xs (0.75rem) to 6xl (3.75rem)
- **Font Weight**: thin (100) to black (900)
- **Line Height**: none (1) to loose (2)

### Spacing

- **Scale**: 0 to 64 (0 to 16rem)
- **Base unit**: 0.25rem (4px)

### Radius

- **Scale**: none, sm, md, lg, xl, 2xl, full

## Accessibility

All components follow WCAG 2.2 AA guidelines:

- **Keyboard Navigation**: Full keyboard support with visible focus indicators
- **Screen Readers**: Proper ARIA labels, roles, and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Logical tab order and focus trapping in modals

### Testing

```bash
# Run tests (including a11y)
pnpm test
```

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build package
pnpm build
```

### Component docs
La documentación de componentes se mantiene inline (JSDoc) y en README de la app.

### Testing

- **Jest + RTL**: Unit tests with React Testing Library
- **jest-axe**: Accessibility testing
 

## Performance

- **Tree-shaking**: Import only needed components
- **CSS Variables**: Runtime theme switching without JS
- **Lazy Loading**: Dynamic imports for large components
- **Bundle Size**: Core components < 6KB gzipped

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+
- **CSS**: OKLCH colors with RGB fallbacks
- **JavaScript**: ES2020+ features

## Contributing

1. Follow the existing code patterns
2. Add tests for new components
3. Update Storybook stories
4. Ensure accessibility compliance
5. Update documentation

## License

MIT





