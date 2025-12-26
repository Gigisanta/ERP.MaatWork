import React from 'react';

export type IconName =
  | 'Home'
  | 'Users'
  | 'BarChart3'
  | 'BarChart2'
  | 'Settings'
  | 'LogOut'
  | 'Menu'
  | 'X'
  | 'ChevronUp'
  | 'ChevronDown'
  | 'ChevronLeft'
  | 'ChevronRight'
  | 'User'
  | 'Info'
  | 'CheckCircle'
  | 'AlertCircle'
  | 'AlertTriangle'
  | 'XCircle'
  | 'WifiOff'
  | 'Loader'
  | 'chevron-up'
  | 'chevron-down'
  | 'x'
  | 'info'
  | 'check-circle'
  | 'alert-circle'
  | 'alert-triangle'
  | 'x-circle'
  | 'wifi-off'
  | 'loader'
  | 'refresh-cw'
  | 'edit'
  | 'more-vertical'
  | 'trash-2'
  | 'plus'
  | 'check'
  | 'search'
  | 'list'
  | 'grid'
  | 'download'
  | 'Book'
  | 'ExternalLink'
  | 'Contact'
  | 'Team'
  | 'GraduationCap'
  | 'TrendingUp'
  | 'Briefcase'
  | 'Shield'
  | 'UserPlus'
  | 'FileText'
  | 'Activity'
  | 'RefreshCw'
  | 'Clock'
  | 'eye'
  | 'eye-off'
  | 'Eye'
  | 'EyeOff'
  | 'Navigation'
  | 'Zap'
  | 'command'
  | 'Command'
  | 'calendar';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  // Mapeo básico de iconos a caracteres Unicode o símbolos
  const iconMap: Record<string, string> = {
    Home: '🏠',
    Users: '👥',
    BarChart3: '📊',
    BarChart2: '📈',
    Settings: '⚙️',
    LogOut: '🚪',
    Menu: '☰',
    X: '✕',
    ChevronUp: '▲',
    ChevronDown: '▼',
    ChevronLeft: '◀',
    ChevronRight: '▶',
    User: '👤',
    Info: 'ℹ️',
    CheckCircle: '✅',
    AlertCircle: '⚠️',
    AlertTriangle: '⚠️',
    XCircle: '❌',
    WifiOff: '📶',
    Loader: '⏳',
    'chevron-up': '▲',
    'chevron-down': '▼',
    x: '✕',
    info: 'ℹ️',
    'check-circle': '✅',
    'alert-circle': '⚠️',
    'alert-triangle': '⚠️',
    'x-circle': '❌',
    'wifi-off': '📶',
    loader: '⏳',
    'refresh-cw': '🔄',
    edit: '✏️',
    'more-vertical': '⋮',
    'trash-2': '🗑️',
    plus: '➕',
    check: '✓',
    search: '🔍',
    list: '☰',
    grid: '▦',
    download: '📥',
    Book: '📚',
    ExternalLink: '🔗',
    Contact: '👤',
    Team: '👨‍👩‍👧‍👦',
    GraduationCap: '🎓',
    TrendingUp: '📈',
    Briefcase: '💼',
    Shield: '🛡️',
    UserPlus: '👤+',
    FileText: '📝',
    Activity: '📊',
    RefreshCw: '🔄',
    Clock: '🕐',
    eye: '👁',
    'eye-off': '🙈',
    Eye: '👁',
    EyeOff: '🙈',
    Navigation: '🧭',
    Zap: '⚡',
    command: '⌘',
    Command: '⌘',
    calendar: '📅',
  };

  const iconChar = iconMap[name] || '?';

  return (
    <span
      className={className}
      style={{
        fontSize: size,
        display: 'inline-block',
        width: size,
        height: size,
        textAlign: 'center',
        lineHeight: 1,
      }}
    >
      {iconChar}
    </span>
  );
}
