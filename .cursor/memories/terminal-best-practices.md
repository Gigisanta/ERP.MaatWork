# Memoria: Mejores Prácticas para Terminal en Cursor

## Reglas para Evitar Cuelgues

### 1. Comandos Siempre No-Interactivos
```bash
# ✅ SIEMPRE usar estos flags
npm install --yes --silent
pnpm install --frozen-lockfile
docker compose up -d
git commit -m "mensaje" --no-verify
```

### 2. Timeouts Explícitos
- Comandos de instalación: máximo 2 minutos
- Comandos de build: máximo 5 minutos  
- Comandos de test: máximo 3 minutos
- Si excede, cancelar y investigar

### 3. Background para Procesos Largos
```bash
# Para servidores de desarrollo
pnpm dev  # usar is_background: true
docker compose up  # usar is_background: true
```

### 4. Verificación de Estado
Antes de ejecutar comandos complejos:
1. Verificar que Node.js esté funcionando: `node --version`
2. Verificar que pnpm esté disponible: `pnpm --version`
3. Verificar que Docker esté corriendo: `docker ps`

### 5. Comandos de Diagnóstico Rápido
```bash
# Verificar estado del proyecto
pnpm --version
node --version
docker ps
git status
```

### 6. Manejo de Errores
- Si un comando falla, NO reintentar inmediatamente
- Leer el error completo antes de la siguiente acción
- Verificar logs específicos del comando

### 7. Comandos Específicos del Proyecto CACTUS
```bash
# Seguros (no interactivos)
pnpm install
pnpm build
pnpm lint
pnpm test
docker compose up -d
pnpm db:generate
pnpm db:migrate

# Requieren cuidado
pnpm dev  # usar background
pnpm publish  # puede requerir input
```

### 8. Patrones de Comandos Problemáticos
❌ **EVITAR**:
- Comandos sin flags de no-interacción
- Comandos que piden confirmación
- `npm install` sin `--yes`
- Comandos que abren editores
- Procesos que no terminan naturalmente

✅ **PREFERIR**:
- Comandos con flags explícitos
- Versiones que no requieren input
- Comandos con timeouts claros
- Procesos que terminan con exit code






