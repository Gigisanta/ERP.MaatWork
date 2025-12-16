import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/styles/globals.css';
import { ThemeProvider } from '../src/hooks/useTheme';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: 'var(--color-bg-base)',
        },
        {
          name: 'dark',
          value: 'var(--color-bg-base)',
        },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'high-contrast', title: 'High Contrast', icon: 'contrast' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';

      return React.createElement(
        ThemeProvider,
        { defaultTheme: theme },
        React.createElement(
          'div',
          {
            'data-theme': theme,
            style: {
              minHeight: '100vh',
              padding: '1rem',
            },
          },
          React.createElement(Story)
        )
      );
    },
  ],
};

export default preview;
