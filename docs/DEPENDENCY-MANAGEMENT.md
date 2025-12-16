# Gestión de Dependencias

Este documento explica cómo mantener las dependencias del proyecto actualizadas de forma segura y automática.

## Opciones Disponibles

### 1. Renovate (Recomendado)

**Renovate** está configurado en `renovate.json` y es la opción recomendada para monorepos.

#### Configuración

Renovate está configurado para:
- ✅ Actualizar automáticamente patch y minor updates
- ✅ Agrupar actualizaciones relacionadas (TypeScript types, ESLint, testing packages)
- ✅ Requerir aprobación manual para major updates
- ✅ Ejecutarse cada lunes antes de las 6am (hora Argentina)
- ✅ Crear máximo 5 PRs concurrentes

#### Activar Renovate

1. Instalar la app Renovate en tu repositorio de GitHub:
   - Ve a https://github.com/apps/renovate
   - Click en "Install"
   - Selecciona tu repositorio

2. Renovate detectará automáticamente `renovate.json` y comenzará a crear PRs

#### Ver PRs de Renovate

Renovate creará PRs automáticamente con:
- Título: `chore(deps): update [package] to [version]`
- Labels: `dependencies`
- Descripción con changelog y breaking changes (si aplica)

### 2. Dependabot (Alternativa)

**Dependabot** está configurado en `.github/dependabot.yml` como alternativa.

#### Activar Dependabot

1. Ve a tu repositorio en GitHub
2. Settings > Security > Dependabot
3. Habilita "Dependabot version updates"
4. Si prefieres Dependabot sobre Renovate, elimina `renovate.json`

#### Diferencias con Renovate

- Dependabot crea más PRs individuales (menos agrupación)
- Renovate entiende mejor los monorepos y workspaces
- Renovate tiene mejor agrupación de actualizaciones relacionadas

### 3. Script Manual

Para actualizar dependencias manualmente, usa los scripts de npm:

```bash
# Ver qué dependencias están desactualizadas
pnpm deps:outdated

# Ver qué se actualizaría (dry-run)
pnpm deps:update:check

# Actualizar patch y minor automáticamente
pnpm deps:update

# Incluir major updates (requiere revisión manual)
pnpm deps:update:major
```

## Estrategia de Actualización

### Patch Updates (1.0.0 → 1.0.1)
- ✅ **Auto-merge**: Se actualizan automáticamente
- ✅ **Sin breaking changes**: Seguros de aplicar
- ✅ **Tests**: Se ejecutan automáticamente en CI

### Minor Updates (1.0.0 → 1.1.0)
- ✅ **Auto-merge para devDependencies**: Se actualizan automáticamente
- ⚠️ **Revisión manual para dependencies**: Requieren revisión
- ✅ **Tests**: Se ejecutan automáticamente en CI

### Major Updates (1.0.0 → 2.0.0)
- ❌ **Nunca auto-merge**: Requieren revisión manual
- ⚠️ **Breaking changes**: Pueden requerir cambios en el código
- 📝 **Changelog**: Revisar changelog antes de actualizar
- ✅ **Tests**: Ejecutar tests completos después de actualizar

## Proceso Recomendado

### Para Actualizaciones Automáticas (Renovate/Dependabot)

1. **Revisar PRs semanalmente**
   - Los lunes revisar PRs creados por Renovate/Dependabot
   - Verificar que los tests pasen en CI
   - Revisar changelogs de major updates

2. **Mergear PRs de patch/minor**
   - Si los tests pasan, mergear directamente
   - Si hay problemas, comentar en el PR

3. **Revisar major updates cuidadosamente**
   - Leer changelog completo
   - Verificar breaking changes
   - Probar localmente antes de mergear

### Para Actualizaciones Manuales

```bash
# 1. Ver qué está desactualizado
pnpm deps:outdated

# 2. Ver qué se actualizaría (sin hacer cambios)
pnpm deps:update:check

# 3. Actualizar patch y minor
pnpm deps:update

# 4. Ejecutar tests
pnpm test
pnpm typecheck

# 5. Si todo está bien, commitear
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): update dependencies"
```

## Dependencias Críticas

Estas dependencias requieren atención especial al actualizar:

### Backend
- **Express**: Major updates pueden tener breaking changes
- **Drizzle ORM**: Verificar cambios en API
- **Zod**: Major updates pueden cambiar validaciones
- **googleapis**: Verificar compatibilidad con Google APIs

### Frontend
- **Next.js**: Major updates pueden requerir migraciones
- **React**: Major updates pueden tener breaking changes
- **TypeScript**: Verificar compatibilidad de tipos

### Herramientas
- **Vitest**: Verificar cambios en configuración
- **Playwright**: Verificar cambios en tests E2E
- **ESLint**: Verificar cambios en reglas

## Troubleshooting

### Error: "Cannot read properties of undefined"
- Ejecutar `pnpm install` para sincronizar lockfile
- Verificar que todas las dependencias estén instaladas

### Conflictos en pnpm-lock.yaml
```bash
# Eliminar lockfile y reinstalar
rm pnpm-lock.yaml
pnpm install
```

### Tests fallan después de actualizar
1. Revisar changelog de la dependencia actualizada
2. Verificar breaking changes
3. Actualizar código según sea necesario
4. Si es muy complejo, considerar revertir la actualización

### Renovate/Dependabot no crea PRs
1. Verificar que la app esté instalada en GitHub
2. Verificar configuración en `renovate.json` o `.github/dependabot.yml`
3. Revisar logs en GitHub Actions o Renovate dashboard

## Referencias

- [Renovate Documentation](https://docs.renovatebot.com/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [pnpm Update Documentation](https://pnpm.io/cli/update)




