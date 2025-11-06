// AI_DECISION: Replace barrel exports with specific exports for tree-shaking
// Justificación: Next.js cannot tree-shake unused components with export * syntax
// Impacto: First Load JS reduction ~30-50KB by eliminating unused UI components

// Icons - specific export
export { default as Icon, type IconName } from './components/Icon';

// Primitives - specific exports
export { Stack, type StackProps } from './primitives/Stack';
export { Text, type TextProps } from './primitives/Text';
export { Heading, type HeadingProps } from './primitives/Heading';
export { Box, type BoxProps } from './primitives/Box';
export { Grid, GridItem, type GridProps, type GridItemProps } from './primitives/Grid';
export { VisuallyHidden, type VisuallyHiddenProps } from './primitives/VisuallyHidden';
export { FocusRing, type FocusRingProps } from './primitives/FocusRing';

// Basic components - specific exports
export { default as Input, type InputProps } from './components/forms/Input';
export { default as Label } from './components/forms/Label';
export { default as Button } from './components/nav/Button';
export { Checkbox } from './components/forms/Checkbox';
export { Select, type SelectProps, type SelectItem } from './components/forms/Select';
export { Badge, type BadgeProps } from './components/feedback/Badge';
export { Switch, type SwitchProps } from './components/forms/Switch';

// Navigation components - specific exports
export { Header, type HeaderProps, type NavItem, type User } from './components/nav/Header';
export { Nav, type NavProps } from './components/nav/Nav';
export { Sidebar, type SidebarProps, type SidebarSection, type SidebarItem } from './components/nav/Sidebar';
export { Pagination, type PaginationProps } from './components/nav/Pagination';
export { Breadcrumbs, type BreadcrumbsProps, type BreadcrumbItem } from './components/nav/Breadcrumbs';
export { Tabs, TabsList, TabsTrigger, TabsContent, type TabsProps, type TabItem } from './components/nav/Tabs';

// Feedback components - specific exports
export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
  type CardFooterProps
} from './components/feedback/Card';
export { Alert, AlertTitle, AlertDescription, type AlertProps } from './components/feedback/Alert';
export { DataTable, type DataTableProps, type Column } from './components/feedback/DataTable';
export { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, type DropdownMenuProps } from './components/feedback/DropdownMenu';
export { default as EmptyState, type EmptyStateProps } from './components/feedback/EmptyState';
export { Modal, ModalHeader, ModalFooter, ModalTitle, ModalDescription, ModalContent, type ModalProps } from './components/feedback/Modal';
export { Spinner, LoadingOverlay, type SpinnerProps, type LoadingOverlayProps } from './components/feedback/Spinner';
export { Toast, ToastAction, ToastClose, type ToastProps } from './components/feedback/Toast';
export { Tooltip, type TooltipProps } from './components/feedback/Tooltip';
export { Drawer, type DrawerProps } from './components/feedback/Drawer';

// Theme Provider - specific export (Client Component)
export { ThemeProvider, useTheme } from './hooks/useTheme';

// Exportar estilos
import './styles/index.css';

// Design tokens & responsive utils
export { breakpoints, type Breakpoint, type ResponsiveProp } from './tokens/breakpoints';
export { buildResponsiveClasses } from './utils/responsive';