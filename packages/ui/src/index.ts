'use client';

// AI_DECISION: Replace barrel exports with specific exports for tree-shaking
// Justificación: Next.js cannot tree-shake unused components with export * syntax
// Impacto: First Load JS reduction ~30-50KB by eliminating unused UI components

// Utils
export { cn } from './utils/cn.js';

// Icons - specific export
export { Icon, type IconName, type IconProps } from './components/Icon.js';

// Primitives - specific exports
export { Stack, type StackProps } from './primitives/Stack.js';
export { Text, type TextProps } from './primitives/Text.js';
export { Heading, type HeadingProps } from './primitives/Heading.js';
export { Box, type BoxProps } from './primitives/Box.js';
export { Grid, GridItem, type GridProps, type GridItemProps } from './primitives/Grid.js';
export { VisuallyHidden, type VisuallyHiddenProps } from './primitives/VisuallyHidden.js';
export { FocusRing, type FocusRingProps } from './primitives/FocusRing.js';

// Basic components - specific exports
export { Input, type InputProps } from './components/forms/Input.js';
export { Label, type LabelProps } from './components/forms/Label.js';
export { Button, type ButtonProps } from './components/nav/Button.js';
export { Checkbox } from './components/forms/Checkbox.js';
export { Select, type SelectProps, type SelectItem } from './components/forms/Select.js';
export { Badge, type BadgeProps } from './components/feedback/Badge.js';
export { Switch, type SwitchProps } from './components/forms/Switch.js';

// Navigation components - specific exports
export { Header, type HeaderProps, type NavItem, type User } from './components/nav/Header.js';
export { Nav, type NavProps } from './components/nav/Nav.js';
export {
  Sidebar,
  type SidebarProps,
  type SidebarSection,
  type SidebarItem,
} from './components/nav/Sidebar.js';
export { Pagination, type PaginationProps } from './components/nav/Pagination.js';
export {
  Breadcrumbs,
  type BreadcrumbsProps,
  type BreadcrumbItem,
} from './components/nav/Breadcrumbs.js';
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsProps,
  type TabItem,
} from './components/nav/Tabs.js';
export {
  PageContainer,
  PageHeader,
  PageContent,
  PageSection,
  type PageContainerProps,
} from './components/nav/PageContainer.js';
export { PageTransition, type PageTransitionProps } from './components/nav/PageTransition.js';

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
  type CardFooterProps,
} from './components/feedback/Card.js';
export {
  Alert,
  AlertTitle,
  AlertDescription,
  type AlertProps,
} from './components/feedback/Alert.js';
export { DataTable, type DataTableProps, type Column } from './components/feedback/DataTable.js';
export {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  type DropdownMenuProps,
} from './components/feedback/DropdownMenu.js';
export { EmptyState, type EmptyStateProps } from './components/feedback/EmptyState.js';
export {
  Modal,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  ModalContent,
  type ModalProps,
} from './components/feedback/Modal.js';
export {
  Spinner,
  LoadingOverlay,
  type SpinnerProps,
  type LoadingOverlayProps,
} from './components/feedback/Spinner.js';
export {
  Toast,
  ToastAction,
  ToastClose,
  type ToastProps,
  type ToastVariant,
} from './components/feedback/Toast.js';
export { Tooltip, type TooltipProps } from './components/feedback/Tooltip.js';
export { Drawer, type DrawerProps } from './components/feedback/Drawer.js';
export { ConfirmDialog, type ConfirmDialogProps } from './components/feedback/ConfirmDialog.js';
export {
  Skeleton,
  SkeletonGroup,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
  SkeletonAvatar,
  SkeletonGrid,
  SkeletonPageHeader,
  type SkeletonProps,
  type SkeletonVariant,
  type SkeletonGroupProps,
  type SkeletonCardProps,
  type SkeletonTableProps,
  type SkeletonTextProps,
} from './components/feedback/Skeleton.js';
export { Skeleton as SkeletonLoader } from './components/feedback/Skeleton.js';
export {
  ProgressBar,
  ProgressBarWithStatus,
  CircularProgress,
  type ProgressBarProps,
  type ProgressBarVariant,
  type ProgressBarSize,
  type ProgressBarWithStatusProps,
  type CircularProgressProps,
} from './components/feedback/ProgressBar.js';
export {
  ErrorState,
  InlineErrorState,
  type ErrorStateProps,
  type ErrorStateVariant,
  type ErrorStateSize,
  type InlineErrorStateProps,
} from './components/feedback/ErrorState.js';
export {
  AnimatedList,
  AnimatedItem,
  type AnimatedListProps,
  type AnimatedItemProps,
} from './components/feedback/AnimatedList.js';

// Theme Provider - specific export (Client Component)
export { ThemeProvider, useTheme } from './hooks/useTheme.js';

// Exportar estilos
import './styles/index.css';

// Design tokens & responsive utils
export { breakpoints, type Breakpoint, type ResponsiveProp } from './tokens/breakpoints.js';
export { buildResponsiveClasses } from './utils/responsive.js';
