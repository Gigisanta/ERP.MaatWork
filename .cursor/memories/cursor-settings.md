# Memoria: Configuración de Cursor para Proyecto CACTUS

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

## Configuración del Proyecto CACTUS

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
2. **Verificar procesos**: `tasklist | findstr node`
3. **Matar procesos colgados**: `taskkill /F /IM node.exe`
4. **Reiniciar terminal**: Ctrl+Shift+P → "Terminal: Kill All Terminals"
5. **Reiniciar Cursor**: Si persiste

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

## Configuración de Desarrollo

### VS Code/Cursor Settings
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.turbo/**": true
  }
}
```






