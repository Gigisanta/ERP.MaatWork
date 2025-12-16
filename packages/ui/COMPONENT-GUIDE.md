# Component Guide

This guide details the usage of core UI components in the Maat Design System.

## Button

Buttons are the primary interactive elements.

### Variants

- **Primary**: Main call to action. Use sparingly (one per section).
- **Secondary**: Alternative actions. Dark/neutral background.
- **Outline**: Low emphasis actions. Border only.
- **Ghost**: Lowest emphasis. Transparent background.
- **Destructive**: Destructive actions (delete, remove). Red.

```tsx
<Button variant="primary">Save Changes</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="outline">Learn More</Button>
<Button variant="ghost" icon="trash">Delete</Button>
```

### Sizes

- `sm`: Compact UI
- `md`: Default
- `lg`: Hero sections

## Card

Cards containerize content and actions.

### Usage

```tsx
<Card variant="outlined" animated>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here.
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Props

- `animated`: Adds a hover lift and glow effect. Recommended for clickable cards.
- `variant`: `outlined` (default), `elevated` (shadow only), `glass` (translucent).

## Input

Standard text input fields.

```tsx
<Input 
  label="Email Address" 
  placeholder="you@example.com" 
  type="email" 
  error={errors.email}
/>
```

- Handles focus states automatically with brand ring.
- Supports `error` state with shake animation.
- Supports icons (`leftIcon`, `rightIcon`).

## Modal

Dialogs for focused tasks.

```tsx
<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)} 
  title="Edit Profile"
>
  <ModalContent>
    Form content...
  </ModalContent>
  <ModalFooter>
    <Button onClick={() => setIsOpen(false)}>Close</Button>
  </ModalFooter>
</Modal>
```

- Background backdrop blur included.
- `animate-enter` included by default.

## Badge

Status indicators.

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="primary">New</Badge>
```

## Best Practices

1. **Composition**: Compose simple components to build complex UIs.
2. **Spacing**: Use `Stack` or Flexbox/Grid with standard gap tokens (`gap-4`, `gap-6`).
3. **Feedback**: Always provide feedback for interactions (loading states, success toasts).
4. **Error Handling**: Use `Input` error props and `Alert` components for validation feedback.

