# Auditoría de TODOs/FIXMEs/BUGs

**Fecha:** 2025-12-01

**Total encontrados:** 331

## Resumen por Prioridad

- **Críticos:** 227
- **Altos:** 1
- **Medios:** 103
- **Bajos:** 0

## Resumen por Tipo

- **TODO:** 104
- **FIXME:** 0
- **BUG:** 226
- **XXX:** 1
- **HACK:** 0

## 🔴 Críticos (227)

### apps\api\src\auth\authorization.ts:36

**Tipo:** BUG

```typescript
(`[Cache Hit] getUserAccessScope(${userId}, ${role})`);
```

---

### apps\api\src\auth\authorization.ts:43

**Tipo:** BUG

```typescript
(`[Cache Miss] getUserAccessScope(${userId}, ${role})`);
```

---

### apps\api\src\db-init.ts:40

**Tipo:** BUG

```typescript
({ host, port }, '✅ Database connection verified');
```

---

### apps\api\src\db-init.ts:93

**Tipo:** BUG

```typescript
({ migrationsFolder }, '🔄 Auto-migrate disabled; skipping migrations');
```

---

### apps\api\src\db-init.ts:116

**Tipo:** BUG

```typescript
('🔄 Checking for pending migrations...');
```

---

### apps\api\src\db-init.ts:124

**Tipo:** BUG

```typescript
('✅ Migrations check completed');
```

---

### apps\api\src\db-init.ts:202

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:205

**Tipo:** BUG

```typescript
'); // Menos logs en desarrollo
```

---

### apps\api\src\db-init.ts:206

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:222

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:243

**Tipo:** BUG

```typescript
({ status }, 'Task status already exists or error occurred');
```

---

### apps\api\src\db-init.ts:262

**Tipo:** BUG

```typescript
({ priority }, 'Priority already exists or error occurred');
```

---

### apps\api\src\db-init.ts:282

**Tipo:** BUG

```typescript
({ type }, 'Notification type already exists or error occurred');
```

---

### apps\api\src\db-init.ts:305

**Tipo:** BUG

```typescript
({ error }, 'Asset classes batch insert failed or already exist');
```

---

### apps\api\src\db-init.ts:309

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:349

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:350

**Tipo:** BUG

```typescript
('🚀 Starting SYSTEM-ESSENTIAL database initialization...');
```

---

### apps\api\src\db-init.ts:357

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:358

**Tipo:** BUG

```typescript
('Step 1/6: Verifying database connection...');
```

---

### apps\api\src\db-init.ts:363

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:364

**Tipo:** BUG

```typescript
('Step 2/6: Running migrations...');
```

---

### apps\api\src\db-init.ts:369

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:370

**Tipo:** BUG

```typescript
('Step 3/6: Seeding pipeline stages...');
```

---

### apps\api\src\db-init.ts:375

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:376

**Tipo:** BUG

```typescript
('Step 4/6: Seeding lookup tables...');
```

---

### apps\api\src\db-init.ts:381

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:382

**Tipo:** BUG

```typescript
('Step 5/6: Ensuring critical columns...');
```

---

### apps\api\src\db-init.ts:387

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:388

**Tipo:** BUG

```typescript
('Step 6/6: Seeding cactus team...');
```

---

### apps\api\src\db-init.ts:392

**Tipo:** BUG

```typescript
') {
```

---

### apps\api\src\db-init.ts:393

**Tipo:** BUG

```typescript
('✅ SYSTEM-ESSENTIAL database initialization completed successfully');
```

---

### apps\api\src\index.ts:54

**Tipo:** BUG

```typescript
' es muy verboso y agrega overhead significativo en desarrollo
```

---

### apps\api\src\index.ts:57

**Tipo:** BUG

```typescript
' para desarrollo
```

---

### apps\api\src\index.ts:255

**Tipo:** BUG

```typescript
ging
```

---

### apps\api\src\index.ts:297

**Tipo:** BUG

```typescript
({ err: error }, 'Failed to record metrics');
```

---

### apps\api\src\jobs\maintenance.ts:69

**Tipo:** BUG

```typescript
({ table: tableName }, 'Table does not exist, skipping');
```

---

### apps\api\src\jobs\maintenance.ts:108

**Tipo:** BUG

```typescript
('Partitioning functions not available, skipping partition creation');
```

---

### apps\api\src\jobs\maintenance.ts:135

**Tipo:** BUG

```typescript
({ table: table.name }, 'Table is not partitioned, skipping');
```

---

### apps\api\src\jobs\maintenance.ts:236

**Tipo:** BUG

```typescript
({ index: indexName }, 'Index does not exist, skipping');
```

---

### apps\api\src\jobs\scheduler.ts:180

**Tipo:** BUG

```typescript
('Partitioning functions not available, skipping partition creation');
```

---

### apps\api\src\jobs\scheduler.ts:207

**Tipo:** BUG

```typescript
({ table: table.name }, 'Table is not partitioned, skipping');
```

---

### apps\api\src\jobs\weekly-performance-report.ts:157

**Tipo:** BUG

```typescript
('No se encontró reporte de semana anterior');
```

---

### apps\api\src\middleware\cache.ts:45

**Tipo:** BUG

```typescript
({ cacheKey }, 'Cache hit');
```

---

### apps\api\src\middleware\cache.ts:103

**Tipo:** BUG

```typescript
({ key }, 'Cache key invalidated');
```

---

### apps\api\src\routes\analytics\dashboard.ts:48

**Tipo:** BUG

```typescript
({ cacheKey }, 'Dashboard KPIs served from cache');
```

---

### apps\api\src\routes\benchmarks.ts:40

**Tipo:** BUG

```typescript
({ cacheKey }, 'benchmarks served from cache');
```

---

### apps\api\src\routes\contacts\webhook.ts:245

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\instruments.ts:128

**Tipo:** BUG

```typescript
({ query, cacheKey }, 'instrument search served from cache');
```

---

### apps\api\src\routes\logs.ts:10

**Tipo:** BUG

```typescript
', 'info', 'warn', 'error']),
```

---

### apps\api\src\routes\logs.ts:106

**Tipo:** BUG

```typescript
':
```

---

### apps\api\src\routes\logs.ts:107

**Tipo:** BUG

```typescript
(logData, `[CLIENT] ${logEntry.message}`);
```

---

### apps\api\src\routes\metrics\contacts.ts:184

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\metrics\contacts.ts:207

**Tipo:** BUG

```typescript
({ month, year, monthStart, monthEnd }, 'Calculating monthly metrics');
```

---

### apps\api\src\routes\metrics\contacts.ts:245

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\metrics\contacts.ts:269

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\metrics\contacts.ts:291

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\metrics\contacts.ts:316

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\metrics\contacts.ts:367

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\metrics\contacts.ts:375

**Tipo:** BUG

```typescript
({ month, year, clientContactsCount: 0 }, 'No client contacts found for business line closures');
```

---

### apps\api\src\routes\metrics\contacts.ts:543

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\pipeline\metrics.ts:81

**Tipo:** BUG

```typescript
({ cacheKey }, 'Pipeline metrics served from cache');
```

---

### apps\api\src\routes\pipeline\move.ts:199

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\routes\pipeline\stages.ts:62

**Tipo:** BUG

```typescript
({ cacheKey }, 'pipeline stages served from cache');
```

---

### apps\api\src\services\aumParser.ts:125

**Tipo:** BUG

```typescript
ging
```

---

### apps\api\src\services\aumParser.ts:129

**Tipo:** BUG

```typescript
({ count: detectedColumns.length }, 'Excel columns detected');
```

---

### apps\api\src\services\aumParser.ts:197

**Tipo:** BUG

```typescript
ging
```

---

### apps\api\src\services\aumParser.ts:201

**Tipo:** BUG

```typescript
({ count: detectedColumns.length }, 'CSV columns detected');
```

---

### apps\api\src\services\aumParser.ts:268

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\services\aumUpsert.ts:533

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\services\aumUpsert.ts:789

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\utils\aum-columns\column-mapper.ts:42

**Tipo:** BUG

```typescript
ging, no todas las normalizaciones
```

---

### apps\api\src\utils\aum-columns\column-mapper.ts:45

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\utils\aum-columns\column-mapper.ts:227

**Tipo:** BUG

```typescript
ging
```

---

### apps\api\src\utils\aum-columns\column-mapper.ts:332

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\utils\cache.ts:94

**Tipo:** BUG

```typescript
('[Redis] Set failed, using NodeCache only:', err instanceof Error ? err.message : String(err));
```

---

### apps\api\src\utils\db-logger.ts:98

**Tipo:** BUG

```typescript
ging de performance issues
```

---

### apps\api\src\utils\db-logger.ts:182

**Tipo:** BUG

```typescript
(metrics, 'DB query completed');
```

---

### apps\api\src\utils\db-transactions.ts:5

**Tipo:** BUG

```typescript
ging
```

---

### apps\api\src\utils\logger.ts:15

**Tipo:** BUG

```typescript
')
```

---

### apps\api\src\utils\pipeline-stages.ts:126

**Tipo:** BUG

```typescript
({ stageName: stage.name }, 'Updated pipeline stage');
```

---

### apps\api\src\utils\query-analysis.ts:47

**Tipo:** BUG

```typescript
ging y optimización proactiva de queries lentas
```

---

### apps\api\src\utils\webhook-client.ts:48

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\utils\webhook-client.ts:70

**Tipo:** BUG

```typescript
({
```

---

### apps\api\src\__tests__\helpers\mock-auth.ts:29

**Tipo:** BUG

```typescript
vi.fn(),
```

---

### apps\api\src\__tests__\helpers\test-server.ts:163

**Tipo:** BUG

```typescript
() => {},
```

---

### apps\web\app\admin\aum\rows\components\AumVirtualTable.tsx:42

**Tipo:** BUG

```typescript
s de renderizado cuando las filas cambian o se reordenan
```

---

### apps\web\app\admin\aum\rows\components\AumVirtualTable.tsx:43

**Tipo:** BUG

```typescript
s visuales
```

---

### apps\web\app\admin\aum\rows\hooks\useAumFileUpload.ts:51

**Tipo:** BUG

```typescript
('AUM file processing retry attempt', {
```

---

### apps\web\app\admin\aum\rows\hooks\useAumFileUpload.ts:66

**Tipo:** BUG

```typescript
('AUM file processing retry scheduled', {
```

---

### apps\web\app\admin\aum\rows\hooks\useUrlSync.ts:6

**Tipo:** BUG

```typescript
s de sincronización
```

---

### apps\web\app\auth\AuthContext.tsx:49

**Tipo:** BUG

```typescript
('Verificando sesión con cookie');
```

---

### apps\web\app\auth\AuthContext.tsx:56

**Tipo:** BUG

```typescript
('Respuesta de /auth/me recibida', { status: r.status });
```

---

### apps\web\app\components\DebugConsole.tsx:6

**Tipo:** BUG

```typescript
Console solo en desarrollo
```

---

### apps\web\app\components\DebugConsole.tsx:7

**Tipo:** TODO

```typescript
s los errores de consola y los muestra en un panel flotante
```

---

### apps\web\app\components\DebugConsole.tsx:9

**Tipo:** BUG

```typescript
Console() {
```

---

### apps\web\app\components\DebugConsole.tsx:17

**Tipo:** BUG

```typescript
Console && typeof (window.debugConsole as { getLogs?: () => unknown[] }).getLogs === 'function') {
```

---

### apps\web\app\components\DebugConsole.tsx:22

**Tipo:** BUG

```typescript
= async () => {
```

---

### apps\web\app\components\DebugConsole.tsx:24

**Tipo:** BUG

```typescript
Console && typeof (window.debugConsole as { getLogs?: () => unknown[] }).getLogs === 'function') {
```

---

### apps\web\app\components\DebugConsole.tsx:29

**Tipo:** BUG

```typescript
Console } = await import('../../lib/debug-console');
```

---

### apps\web\app\components\DebugConsole.tsx:30

**Tipo:** BUG

```typescript
Console();
```

---

### apps\web\app\components\DebugConsole.tsx:32

**Tipo:** BUG

```typescript
Console:', err);
```

---

### apps\web\app\components\DebugConsole.tsx:35

**Tipo:** BUG

```typescript
Console) {
```

---

### apps\web\app\components\DebugConsole.tsx:39

**Tipo:** BUG

```typescript
-console-logs') || '[]');
```

---

### apps\web\app\components\DebugConsole.tsx:44

**Tipo:** BUG

```typescript
-console-logs') || '[]',
```

---

### apps\web\app\components\DebugConsole.tsx:45

**Tipo:** BUG

```typescript
-console-logs'),
```

---

### apps\web\app\components\DebugConsole.tsx:48

**Tipo:** BUG

```typescript
Console', {
```

---

### apps\web\app\components\DebugConsole.tsx:55

**Tipo:** BUG

```typescript
typeof fallback }).$debug = fallback;
```

---

### apps\web\app\components\DebugConsole.tsx:62

**Tipo:** BUG

```typescript
();
```

---

### apps\web\app\components\DebugConsoleInline.tsx:4

**Tipo:** BUG

```typescript
ging que se puede pegar directamente en la consola
```

---

### apps\web\app\components\DebugConsoleInline.tsx:5

**Tipo:** BUG

```typescript
-console esté cargado
```

---

### apps\web\app\components\DebugConsoleInline.tsx:10

**Tipo:** BUG

```typescript
HelperScript = `
```

---

### apps\web\app\components\DebugConsoleInline.tsx:15

**Tipo:** BUG

```typescript
Logs() {
```

---

### apps\web\app\components\DebugConsoleInline.tsx:17

**Tipo:** BUG

```typescript
-console-logs');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:26

**Tipo:** BUG

```typescript
Helper = {
```

---

### apps\web\app\components\DebugConsoleInline.tsx:27

**Tipo:** BUG

```typescript
Logs(),
```

---

### apps\web\app\components\DebugConsoleInline.tsx:28

**Tipo:** BUG

```typescript
Logs,
```

---

### apps\web\app\components\DebugConsoleInline.tsx:31

**Tipo:** BUG

```typescript
-console-logs') || '[]';
```

---

### apps\web\app\components\DebugConsoleInline.tsx:37

**Tipo:** BUG

```typescript
-console-logs');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:39

**Tipo:** BUG

```typescript
Helper.logs = [];
```

---

### apps\web\app\components\DebugConsoleInline.tsx:42

**Tipo:** BUG

```typescript
Logs();
```

---

### apps\web\app\components\DebugConsoleInline.tsx:48

**Tipo:** BUG

```typescript
Logs();
```

---

### apps\web\app\components\DebugConsoleInline.tsx:60

**Tipo:** BUG

```typescript
Logs();
```

---

### apps\web\app\components\DebugConsoleInline.tsx:71

**Tipo:** BUG

```typescript
Console) {
```

---

### apps\web\app\components\DebugConsoleInline.tsx:72

**Tipo:** BUG

```typescript
Console', {
```

---

### apps\web\app\components\DebugConsoleInline.tsx:73

**Tipo:** BUG

```typescript
Helper,
```

---

### apps\web\app\components\DebugConsoleInline.tsx:80

**Tipo:** BUG

```typescript

```

---

### apps\web\app\components\DebugConsoleInline.tsx:81

**Tipo:** BUG

```typescript
) {
```

---

### apps\web\app\components\DebugConsoleInline.tsx:82

**Tipo:** BUG

```typescript
', {
```

---

### apps\web\app\components\DebugConsoleInline.tsx:83

**Tipo:** BUG

```typescript
Helper,
```

---

### apps\web\app\components\DebugConsoleInline.tsx:91

**Tipo:** BUG

```typescript
Helper disponible', 'color: #10b981; font-weight: bold; font-size: 14px;');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:93

**Tipo:** BUG

```typescript
Console.getLogs() - Todos los logs');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:94

**Tipo:** BUG

```typescript
Console.showErrors() - Solo errores (tabla)');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:95

**Tipo:** BUG

```typescript
Console.showLatest(10) - Últimos N logs');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:96

**Tipo:** BUG

```typescript
Console.findInLogs("texto") - Buscar en logs');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:97

**Tipo:** BUG

```typescript
Console.exportLogs() - Exportar como JSON');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:98

**Tipo:** BUG

```typescript
Console.clearLogs() - Limpiar logs');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:99

**Tipo:** BUG

```typescript
.getLogs() - Atajo alternativo');
```

---

### apps\web\app\components\DebugConsoleInline.tsx:101

**Tipo:** BUG

```typescript
Helper;
```

---

### apps\web\app\components\DebugConsoleInline.tsx:108

**Tipo:** BUG

```typescript
HelperScript);
```

---

### apps\web\app\components\DebugConsoleInline.tsx:110

**Tipo:** BUG

```typescript
Helper:', error);
```

---

### apps\web\app\contacts\page.tsx:486

**Tipo:** BUG

```typescript
('Iniciando exportación CSV', {
```

---

### apps\web\app\contacts\[id]\tags\[tagId]\TagDetailsForm.tsx:129

**Tipo:** BUG

```typescript
('handleSubmit llamado', toLogContext({ contactId, tagId, hasErrors: Object.keys(errors).length > 0 }));
```

---

### apps\web\app\contacts\[id]\tags\[tagId]\TagDetailsForm.tsx:169

**Tipo:** BUG

```typescript
('Enviando datos de contact tag', toLogContext({ contactId, tagId, payload }));
```

---

### apps\web\app\layout.tsx:7

**Tipo:** BUG

```typescript
Console from './components/DebugConsole';
```

---

### apps\web\app\layout.tsx:33

**Tipo:** BUG

```typescript
Console />
```

---

### apps\web\app\teams\page.tsx:22

**Tipo:** BUG

```typescript
ging
```

---

### apps\web\app\teams\page.tsx:24

**Tipo:** BUG

```typescript
ging de problemas de autenticación
```

---

### apps\web\app\teams\page.tsx:35

**Tipo:** BUG

```typescript
ging
```

---

### apps\web\app\teams\page.tsx:37

**Tipo:** BUG

```typescript
ging de problemas de autenticación
```

---

### apps\web\app\teams\page.tsx:50

**Tipo:** BUG

```typescript
ging
```

---

### apps\web\app\teams\page.tsx:52

**Tipo:** BUG

```typescript
ging de problemas de permisos
```

---

### apps\web\lib\api\aum-validation.ts:6

**Tipo:** BUG

```typescript
ging, mensajes de error claros
```

---

### apps\web\lib\api\aum.ts:60

**Tipo:** BUG

```typescript
ging
```

---

### apps\web\lib\api-error.ts:6

**Tipo:** BUG

```typescript
ging y manejo de errores
```

---

### apps\web\lib\api-hooks.ts:382

**Tipo:** BUG

```typescript
logging para entender la estructura de respuesta
```

---

### apps\web\lib\api-hooks.ts:437

**Tipo:** BUG

```typescript
ging
```

---

### apps\web\lib\config.ts:32

**Tipo:** BUG

```typescript
process.env.NEXT_PUBLIC_DEBUG === 'true'
```

---

### apps\web\lib\console-helpers.ts:7

**Tipo:** BUG

```typescript
Console si no existe
```

---

### apps\web\lib\console-helpers.ts:8

**Tipo:** BUG

```typescript
HelperScript = `
```

---

### apps\web\lib\console-helpers.ts:12

**Tipo:** BUG

```typescript
Console ya existe
```

---

### apps\web\lib\console-helpers.ts:13

**Tipo:** BUG

```typescript
Console && typeof window.debugConsole.getLogs === 'function') {
```

---

### apps\web\lib\console-helpers.ts:14

**Tipo:** BUG

```typescript
Console ya está disponible', 'color: #10b981; font-weight: bold;');
```

---

### apps\web\lib\console-helpers.ts:15

**Tipo:** BUG

```typescript
Console.getLogs()');
```

---

### apps\web\lib\console-helpers.ts:16

**Tipo:** BUG

```typescript
Console;
```

---

### apps\web\lib\console-helpers.ts:20

**Tipo:** BUG

```typescript
Console no está disponible, intentando cargar desde localStorage...', 'color: #f59e0b;');
```

---

### apps\web\lib\console-helpers.ts:23

**Tipo:** BUG

```typescript
-console-logs');
```

---

### apps\web\lib\console-helpers.ts:29

**Tipo:** BUG

```typescript
Helper = {
```

---

### apps\web\lib\console-helpers.ts:34

**Tipo:** BUG

```typescript
-console-logs');
```

---

### apps\web\lib\console-helpers.ts:55

**Tipo:** BUG

```typescript
Console', {
```

---

### apps\web\lib\console-helpers.ts:56

**Tipo:** BUG

```typescript
Helper,
```

---

### apps\web\lib\console-helpers.ts:62

**Tipo:** BUG

```typescript
= debugHelper;
```

---

### apps\web\lib\console-helpers.ts:64

**Tipo:** BUG

```typescript
Helper creado desde localStorage', 'color: #10b981; font-weight: bold;');
```

---

### apps\web\lib\console-helpers.ts:66

**Tipo:** BUG

```typescript
Console.getLogs() - Todos los logs');
```

---

### apps\web\lib\console-helpers.ts:67

**Tipo:** BUG

```typescript
Console.showErrors() - Solo errores (tabla)');
```

---

### apps\web\lib\console-helpers.ts:68

**Tipo:** BUG

```typescript
Console.showLatest(10) - Últimos 10 logs');
```

---

### apps\web\lib\console-helpers.ts:69

**Tipo:** BUG

```typescript
Console.exportLogs() - Exportar como JSON');
```

---

### apps\web\lib\console-helpers.ts:71

**Tipo:** BUG

```typescript
Helper;
```

---

### apps\web\lib\console-helpers.ts:74

**Tipo:** BUG

```typescript
Console');
```

---

### apps\web\lib\console-helpers.ts:84

**Tipo:** BUG

```typescript
HelperScript };
```

---

### apps\web\lib\console-helpers.ts:93

**Tipo:** BUG

```typescript
HelperScript);
```

---

### apps\web\lib\debug-console.ts:2

**Tipo:** BUG

```typescript
ging optimizada para capturar y reportar errores de consola
```

---

### apps\web\lib\debug-console.ts:49

**Tipo:** BUG

```typescript
Console {
```

---

### apps\web\lib\debug-console.ts:51

**Tipo:** BUG

```typescript
ging
```

---

### apps\web\lib\debug-console.ts:85

**Tipo:** BUG

```typescript
Panel();
```

---

### apps\web\lib\debug-console.ts:91

**Tipo:** BUG

```typescript
-console-logs');
```

---

### apps\web\lib\debug-console.ts:108

**Tipo:** BUG

```typescript
-console-logs', JSON.stringify(logsToSave));
```

---

### apps\web\lib\debug-console.ts:119

**Tipo:** BUG

```typescript
Console eliminando errores falsos
```

---

### apps\web\lib\debug-console.ts:144

**Tipo:** BUG

```typescript
Console eliminando errores falsos
```

---

### apps\web\lib\debug-console.ts:177

**Tipo:** BUG

```typescript
Console eliminando errores falsos
```

---

### apps\web\lib\debug-console.ts:315

**Tipo:** BUG

```typescript
Console');
```

---

### apps\web\lib\debug-console.ts:340

**Tipo:** BUG

```typescript
Panel() {
```

---

### apps\web\lib\debug-console.ts:346

**Tipo:** BUG

```typescript
-console-button';
```

---

### apps\web\lib\debug-console.ts:382

**Tipo:** BUG

```typescript
-console-badge';
```

---

### apps\web\lib\debug-console.ts:404

**Tipo:** BUG

```typescript
-console-panel';
```

---

### apps\web\lib\debug-console.ts:426

**Tipo:** BUG

```typescript
-console-header';
```

---

### apps\web\lib\debug-console.ts:443

**Tipo:** BUG

```typescript
Console';
```

---

### apps\web\lib\debug-console.ts:447

**Tipo:** BUG

```typescript
-stats';
```

---

### apps\web\lib\debug-console.ts:583

**Tipo:** BUG

```typescript
-content';
```

---

### apps\web\lib\debug-console.ts:688

**Tipo:** BUG

```typescript
-stats');
```

---

### apps\web\lib\debug-console.ts:724

**Tipo:** BUG

```typescript
-log-item';
```

---

### apps\web\lib\debug-console.ts:1002

**Tipo:** BUG

```typescript
Console, type ErrorLog };
```

---

### apps\web\lib\debug-console.ts:1008

**Tipo:** BUG

```typescript
Console() {
```

---

### apps\web\lib\debug-console.ts:1012

**Tipo:** BUG

```typescript
Console && typeof (window.debugConsole as DebugConsole).getLogs === 'function') {
```

---

### apps\web\lib\debug-console.ts:1013

**Tipo:** BUG

```typescript
Console as DebugConsole;
```

---

### apps\web\lib\debug-console.ts:1017

**Tipo:** BUG

```typescript
Console = new DebugConsole();
```

---

### apps\web\lib\debug-console.ts:1020

**Tipo:** BUG

```typescript
Console', {
```

---

### apps\web\lib\debug-console.ts:1021

**Tipo:** BUG

```typescript
Console,
```

---

### apps\web\lib\debug-console.ts:1028

**Tipo:** BUG

```typescript
DebugConsole }).$debug = debugConsole;
```

---

### apps\web\lib\debug-console.ts:1034

**Tipo:** BUG

```typescript
Console activado', 'color: #ef4444; font-weight: bold; font-size: 14px;');
```

---

### apps\web\lib\debug-console.ts:1035

**Tipo:** BUG

```typescript
Console o window.$debug para acceder a los métodos:', 'color: #6b7280;');
```

---

### apps\web\lib\debug-console.ts:1036

**Tipo:** BUG

```typescript
Console.getLogs() - Obtener todos los logs');
```

---

### apps\web\lib\debug-console.ts:1037

**Tipo:** BUG

```typescript
Console.exportLogs() - Exportar logs como JSON');
```

---

### apps\web\lib\debug-console.ts:1038

**Tipo:** BUG

```typescript
Console.clearLogs() - Limpiar logs');
```

---

### apps\web\lib\debug-console.ts:1039

**Tipo:** BUG

```typescript
.getLogs() - Atajo (alternativa)');
```

---

### apps\web\lib\debug-console.ts:1042

**Tipo:** BUG

```typescript
Console;
```

---

### apps\web\lib\debug-console.ts:1044

**Tipo:** BUG

```typescript
Console:', error);
```

---

### apps\web\lib\debug-console.ts:1053

**Tipo:** BUG

```typescript
Console', {
```

---

### apps\web\lib\logger.ts:7

**Tipo:** BUG

```typescript
' | 'info' | 'warn' | 'error';
```

---

### apps\web\lib\logger.ts:222

**Tipo:** BUG

```typescript
generan demasiado ruido en consola durante desarrollo
```

---

### apps\web\lib\logger.ts:238

**Tipo:** BUG

```typescript
se pueden habilitar con flag de entorno si es necesario
```

---

### apps\web\lib\logger.ts:248

**Tipo:** BUG

```typescript
' && verboseLogs) {
```

---

### apps\web\lib\logger.ts:249

**Tipo:** BUG

```typescript
si está habilitado explícitamente
```

---

### apps\web\lib\logger.ts:250

**Tipo:** BUG

```typescript
(`${prefix} ${message}`, Object.keys(logContext).length > 0 ? logContext : undefined);
```

---

### apps\web\lib\logger.ts:255

**Tipo:** BUG

```typescript
se omiten en consola (pero se pueden enviar al backend si es necesario)
```

---

### apps\web\lib\logger.ts:259

**Tipo:** BUG

```typescript
- información detallada para desarrollo
```

---

### apps\web\lib\logger.ts:261

**Tipo:** BUG

```typescript
(message: string, context?: Record<string, LogContextValue>): void {
```

---

### apps\web\lib\logger.ts:262

**Tipo:** BUG

```typescript
', message, context);
```

---

## 🟠 Altos (1)

- **apps\api\src\routes\contacts\crud.ts:380** (XXX): explícitamente

## 🟡 Medios (103)

*Ver reporte completo para detalles*

## Recomendaciones

1. **Resolver TODOs críticos primero** - Estos pueden indicar bugs o problemas de seguridad
2. **Revisar FIXMEs** - Indican código que necesita corrección
3. **Documentar o resolver XXX/HACK** - Código temporal que debe ser refactorizado
4. **Eliminar TODOs obsoletos** - Si el TODO ya fue resuelto o ya no aplica

