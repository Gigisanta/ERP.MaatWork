'use client';

import React from 'react';
import { Select, Text, Stack } from '@maatwork/ui';
import { useTheme } from '../../components/ThemeProviderWrapper';

/**
 * Sección de selector de tema en el perfil
 * Permite elegir entre modo claro, oscuro o automático (sigue preferencia del sistema)
 */
export function ThemeSelectorSection() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
    { value: 'system', label: 'Automático' },
  ];

  const handleThemeChange = (value: string) => {
    setTheme(value as 'light' | 'dark' | 'system');
  };

  const getHelperText = () => {
    switch (theme) {
      case 'light':
        return 'La interfaz siempre usará el modo claro';
      case 'dark':
        return 'La interfaz siempre usará el modo oscuro';
      case 'system':
        return 'La interfaz seguirá la preferencia de tu sistema operativo';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-1">
      <Text weight="medium" size="xs" color="secondary">
        Tema de la interfaz
      </Text>
      <Select
        items={themeOptions}
        value={theme}
        onValueChange={handleThemeChange}
        label=""
        helperText={getHelperText()}
        className="w-full"
      />
    </div>
  );
}
