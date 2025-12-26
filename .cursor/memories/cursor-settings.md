# Memoria: Configuración de Cursor para Proyecto MAATWORK

## Propósito
Configuración recomendada de Cursor IDE y VS Code para optimizar el desarrollo en el monorepo MAATWORK con TypeScript strict mode y pnpm workspaces.

## Contexto
Usar esta memoria cuando:
- Configurar Cursor/VS Code por primera vez
- Optimizar settings para TypeScript strict mode
- Configurar terminal para monorepo con pnpm
- Troubleshooting de problemas de configuración

## Configuración de Terminal/Consola

### Settings Recomendados en Cursor

```json
{
  "terminal.integrated.commandTimeout": 30000,
  "terminal.integrated.autoReplies": {
    "npm install": "y",
    "pnpm install": "",
    "git push": "y"
  },
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "path": "powershell.exe",
      "args": ["-NoProfile"]
    }
  }
}
```

### Variables de Entorno Globales

```bash
# En el sistema o .env global
CI=true
NODE_ENV=development
NPM_CONFIG_LOGLEVEL=warn
PNPM_DISABLE_PROMPT=true
```

### Configuración de PowerShell

```powershell
# En el perfil de PowerShell ($PROFILE)
$env:CI = "true"
$env:NPM_CONFIG_LOGLEVEL = "warn"
Set-PSReadLineOption -PredictionSource None
```

## Configuración de TypeScript Strict Mode

### Settings para TypeScript

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.useLabelDetailsInCompletionEntries": true
}
```

### Settings para Editor

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Configuración para Monorepo (pnpm workspaces)

### Settings de Archivos

```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.turbo/**": true,
    "**/coverage/**": true
  },
  "files.exclude": {
    "**/.turbo": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true,
    "**/coverage": true
  }
}
```

### Configuración de Workspace

```json
{
  "typescript.preferences.useAliasesForRenames": false,
  "typescript.suggest.autoImports": true,
  "typescript.preferences.includePackageJsonAutoImports": "auto"
}
```

## Configuración del Proyecto MAATWORK

### package.json Scripts Optimizados

```json
{
  "scripts": {
    "dev": "turbo dev --parallel",
    "build": "turbo build --parallel --silent",
    "lint": "turbo lint --parallel",
    "test": "turbo test --parallel --passWithNoTests",
    "clean": "turbo clean && rimraf node_modules",
    "install:clean": "rimraf node_modules pnpm-lock.yaml && pnpm install"
  }
}
```

### Configuración de Turbo

```json
{
  "pipeline": {
    "dev": {
      "persistent": true,
      "cache": false
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

## Comandos de Diagnóstico

### Script de Verificación del Sistema

```bash
# Crear script: scripts/verify-system.js
#!/usr/bin/env node
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Verificar dependencias
const { execSync } = require('child_process');
try {
  console.log('pnpm version:', execSync('pnpm --version', { encoding: 'utf8' }).trim());
} catch (e) {
  console.error('pnpm not found');
}
```

### Comandos de Limpieza

```bash
# Limpiar cache de pnpm
pnpm store prune

# Limpiar cache de turbo
pnpm turbo clean

# Limpiar node_modules
rimraf node_modules
```

## Troubleshooting

### Si Cursor se Cuelga

1. **Cancelar comando**: Ctrl+C
2. **Verificar procesos**: `tasklist | findstr node` (Windows)
3. **Matar procesos colgados**: `taskkill /F /IM node.exe` (Windows)
4. **Reiniciar terminal**: Ctrl+Shift+P → "Terminal: Kill All Terminals"
5. **Reiniciar Cursor**: Si persiste el problema

### Comandos de Recuperación

```bash
# Verificar estado
git status
pnpm --version
node --version

# Reinstalar dependencias
pnpm install --frozen-lockfile

# Verificar build
pnpm build
```

## Referencias

- Reglas relacionadas: 
  - `.cursor/rules/00-core.mdc` (arquitectura general)
  - `.cursor/rules/01-typescript.mdc` (reglas TypeScript)
- Memorias relacionadas: 
  - `.cursor/memories/terminal-best-practices.md`
- Documentación: 
  - `docs/DEVELOPMENT.md`
  - `docs/ARCHITECTURE.md`

## Última Actualización

2025-01-16 - Agregada configuración TypeScript strict mode y monorepo
