# Auditoría de Archivos y Funciones Largos

**Fecha:** 2025-12-02

**Total de issues encontrados:** 149

## Límites Aplicados

- **Archivos:** Máximo 300 líneas
- **Funciones:** Máximo 50 líneas
- **Clases:** Máximo 100 líneas

## Resumen por Tipo

- **Archivos largos:** 67
- **Funciones largas:** 70
- **Clases largas:** 12

## Archivos con Issues (102 archivos)

### packages\db\src\schema.ts

**Archivo completo** - 1759 líneas

Archivo tiene 1759 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\teams-legacy.ts

**Archivo completo** - 1661 líneas

Archivo tiene 1661 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### packages\db\src\seed-full.ts

**Archivo completo** - 1552 líneas

Archivo tiene 1552 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función seedUsers** (líneas 206-298) - 93 líneas

Función seedUsers tiene 93 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedTeams** (líneas 306-388) - 83 líneas

Función seedTeams tiene 83 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedContacts** (líneas 397-556) - 160 líneas

Función seedContacts tiene 160 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedTags** (líneas 564-673) - 110 líneas

Función seedTags tiene 110 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedNotes** (líneas 758-820) - 63 líneas

Función seedNotes tiene 63 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedBrokerData** (líneas 950-1084) - 135 líneas

Función seedBrokerData tiene 135 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedActivityEvents** (líneas 1186-1286) - 101 líneas

Función seedActivityEvents tiene 101 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedCapacitaciones** (líneas 1291-1360) - 70 líneas

Función seedCapacitaciones tiene 70 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedSegments** (líneas 1368-1450) - 83 líneas

Función seedSegments tiene 83 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\contacts\page.tsx

**Archivo completo** - 1226 líneas

Archivo tiene 1226 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\tags-legacy.ts

**Archivo completo** - 1216 líneas

Archivo tiene 1216 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\lib\debug-console.ts

**Archivo completo** - 1069 líneas

Archivo tiene 1069 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función initDebugConsole** (líneas 1014-1068) - 55 líneas

Función initDebugConsole tiene 55 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\profile\page.tsx

**Archivo completo** - 984 líneas

Archivo tiene 984 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\portfolio.ts

**Archivo completo** - 914 líneas

Archivo tiene 914 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\aum\rows.ts

**Archivo completo** - 900 líneas

Archivo tiene 900 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función rows** (líneas 386-441) - 56 líneas

Función rows tiene 56 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\routes\instruments.ts

**Archivo completo** - 861 líneas

Archivo tiene 861 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\aum\upload.ts

**Archivo completo** - 851 líneas

Archivo tiene 851 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\benchmarks.ts

**Archivo completo** - 825 líneas

Archivo tiene 825 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\services\aumUpsert.ts

**Archivo completo** - 808 líneas

Archivo tiene 808 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función findExistingRow** (líneas 119-291) - 173 líneas

Función findExistingRow tiene 173 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función updateExistingRow** (líneas 309-423) - 115 líneas

Función updateExistingRow tiene 115 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función upsertAumRows** (líneas 471-552) - 82 líneas

Función upsertAumRows tiene 82 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función upsertSingleMonthlySnapshot** (líneas 625-702) - 78 líneas

Función upsertSingleMonthlySnapshot tiene 78 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función upsertAumMonthlySnapshots** (líneas 713-806) - 94 líneas

Función upsertAumMonthlySnapshots tiene 94 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\routes\tasks.ts

**Archivo completo** - 800 líneas

Archivo tiene 800 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\scripts\verify-aum-import.ts

**Archivo completo** - 763 líneas

Archivo tiene 763 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función verifyImport** (líneas 250-547) - 298 líneas

Función verifyImport tiene 298 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\routes\metrics\contacts.ts

**Archivo completo** - 661 líneas

Archivo tiene 661 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función calculateMonthlyMetrics** (líneas 202-575) - 374 líneas

Función calculateMonthlyMetrics tiene 374 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\contacts\new\page.tsx

**Archivo completo** - 604 líneas

Archivo tiene 604 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función handleSubmit** (líneas 119-203) - 85 líneas

Función handleSubmit tiene 85 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\lib\api-hooks.ts

**Archivo completo** - 602 líneas

Archivo tiene 602 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\jobs\daily-valuation.ts

**Archivo completo** - 599 líneas

Archivo tiene 599 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Clase DailyValuationJob** (líneas 52-523) - 472 líneas

Clase DailyValuationJob tiene 472 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

**Función runPriceBackfillJob** (líneas 532-598) - 67 líneas

Función runPriceBackfillJob tiene 67 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\csv-aum-updater.ts

**Archivo completo** - 584 líneas

Archivo tiene 584 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función loadAumCsv** (líneas 111-171) - 61 líneas

Función loadAumCsv tiene 61 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función loadClusterReport** (líneas 176-231) - 56 líneas

Función loadClusterReport tiene 56 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\routes\capacitaciones.ts

**Archivo completo** - 547 líneas

Archivo tiene 547 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\plandecarrera\page.tsx

**Archivo completo** - 542 líneas

Archivo tiene 542 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\index.ts

**Archivo completo** - 523 líneas

Archivo tiene 523 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\teams\[id]\page.tsx

**Archivo completo** - 516 líneas

Archivo tiene 516 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\users.ts

**Archivo completo** - 498 líneas

Archivo tiene 498 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\auth.ts

**Archivo completo** - 458 líneas

Archivo tiene 458 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\contacts\get.ts

**Archivo completo** - 449 líneas

Archivo tiene 449 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\services\aumMatcher.ts

**Archivo completo** - 448 líneas

Archivo tiene 448 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\notifications.ts

**Archivo completo** - 446 líneas

Archivo tiene 446 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\utils\db-logger.ts

**Archivo completo** - 442 líneas

Archivo tiene 442 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función createDrizzleLogger** (líneas 241-293) - 53 líneas

Función createDrizzleLogger tiene 53 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función updateAggregatedMetrics** (líneas 357-414) - 58 líneas

Función updateAggregatedMetrics tiene 58 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\db-init.ts

**Archivo completo** - 440 líneas

Archivo tiene 440 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función runMigrations** (líneas 86-185) - 100 líneas

Función runMigrations tiene 100 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedLookupTables** (líneas 215-312) - 98 líneas

Función seedLookupTables tiene 98 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función initializeDatabase** (líneas 342-411) - 70 líneas

Función initializeDatabase tiene 70 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\cache.ts

**Archivo completo** - 439 líneas

Archivo tiene 439 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función createCacheWrapper** (líneas 100-155) - 56 líneas

Función createCacheWrapper tiene 56 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función getCacheHealth** (líneas 375-438) - 64 líneas

Función getCacheHealth tiene 64 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\components\PortfolioComparator.tsx

**Archivo completo** - 437 líneas

Archivo tiene 437 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\contacts\list.ts

**Archivo completo** - 420 líneas

Archivo tiene 420 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\utils\file-upload.ts

**Archivo completo** - 419 líneas

Archivo tiene 419 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\lib\api-client.ts

**Archivo completo** - 418 líneas

Archivo tiene 418 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Clase ApiClient** (líneas 25-409) - 385 líneas

Clase ApiClient tiene 385 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### apps\api\src\services\aumParser.ts

**Archivo completo** - 416 líneas

Archivo tiene 416 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función parseExcelFile** (líneas 57-141) - 85 líneas

Función parseExcelFile tiene 85 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función parseCsvFile** (líneas 146-213) - 68 líneas

Función parseCsvFile tiene 68 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\pipeline\PipelineBoardClient.tsx

**Archivo completo** - 414 líneas

Archivo tiene 414 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\utils\aum-columns\column-mapper.ts

**Archivo completo** - 412 líneas

Archivo tiene 412 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función mapAumColumns** (líneas 33-406) - 374 líneas

Función mapAumColumns tiene 374 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\batch-loading.ts

**Archivo completo** - 399 líneas

Archivo tiene 399 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función batchLoadContactTags** (líneas 34-85) - 52 líneas

Función batchLoadContactTags tiene 52 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\teams\components\TeamsClient.tsx

**Archivo completo** - 393 líneas

Archivo tiene 393 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\contacts\webhook.ts

**Archivo completo** - 392 líneas

Archivo tiene 392 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\notes.ts

**Archivo completo** - 387 líneas

Archivo tiene 387 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\components\PerformanceChart.tsx

**Archivo completo** - 373 líneas

Archivo tiene 373 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\contacts\metrics\MetricsView.tsx

**Archivo completo** - 368 líneas

Archivo tiene 368 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\portfolios\components\BenchmarksSection.tsx

**Archivo completo** - 368 líneas

Archivo tiene 368 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\admin\users\page.tsx

**Archivo completo** - 367 líneas

Archivo tiene 367 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\contacts\update.ts

**Archivo completo** - 363 líneas

Archivo tiene 363 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\capacitaciones\CapacitacionesList.tsx

**Archivo completo** - 363 líneas

Archivo tiene 363 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\lib\logger.ts

**Archivo completo** - 362 líneas

Archivo tiene 362 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Clase ClientLogger** (líneas 70-355) - 286 líneas

Clase ClientLogger tiene 286 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### apps\web\app\contacts\metrics\MetricsCharts.tsx

**Archivo completo** - 359 líneas

Archivo tiene 359 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\analytics\dashboard.ts

**Archivo completo** - 348 líneas

Archivo tiene 348 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\components\AssetSearcher.tsx

**Archivo completo** - 348 líneas

Archivo tiene 348 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función handleDirectSymbol** (líneas 170-244) - 75 líneas

Función handleDirectSymbol tiene 75 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\routes\attachments.ts

**Archivo completo** - 346 líneas

Archivo tiene 346 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\pipeline\metrics.ts

**Archivo completo** - 342 líneas

Archivo tiene 342 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\jobs\maintenance.ts

**Archivo completo** - 341 líneas

Archivo tiene 341 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función createFuturePartitions** (líneas 97-153) - 57 líneas

Función createFuturePartitions tiene 57 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función runWeeklyMaintenance** (líneas 165-267) - 103 líneas

Función runWeeklyMaintenance tiene 103 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\routes\analytics\comparison.ts

**Archivo completo** - 333 líneas

Archivo tiene 333 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\app\contacts\[id]\page.tsx

**Archivo completo** - 333 líneas

Archivo tiene 333 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función getContactData** (líneas 49-106) - 58 líneas

Función getContactData tiene 58 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\contacts\[id]\TasksSection.tsx

**Archivo completo** - 333 líneas

Archivo tiene 333 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\routes\broker-accounts.ts

**Archivo completo** - 332 líneas

Archivo tiene 332 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\auth\authorization.ts

**Archivo completo** - 329 líneas

Archivo tiene 329 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función getUserAccessScope** (líneas 28-108) - 81 líneas

Función getUserAccessScope tiene 81 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\routes\yields.ts

**Archivo completo** - 327 líneas

Archivo tiene 327 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\jobs\scheduler.ts

**Archivo completo** - 317 líneas

Archivo tiene 317 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Clase JobScheduler** (líneas 22-302) - 281 líneas

Clase JobScheduler tiene 281 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### apps\web\app\analytics\page.tsx

**Archivo completo** - 310 líneas

Archivo tiene 310 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\web\lib\api\aum.ts

**Archivo completo** - 306 líneas

Archivo tiene 306 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### apps\api\src\utils\aum-columns\column-validator.ts

**Archivo completo** - 305 líneas

Archivo tiene 305 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

**Función safeToNumber** (líneas 70-191) - 122 líneas

Función safeToNumber tiene 122 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función validateColumnMapping** (líneas 216-299) - 84 líneas

Función validateColumnMapping tiene 84 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### packages\ui\src\components\feedback\DataTable.tsx

**Archivo completo** - 303 líneas

Archivo tiene 303 líneas (límite: 300). Considerar dividir en módulos más pequeños.

---

### packages\db\src\seed-benchmarks.ts

**Función seedBenchmarks** (líneas 11-242) - 232 líneas

Función seedBenchmarks tiene 232 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\jobs\monitor-query-performance.ts

**Clase MonitorQueryPerformanceJob** (líneas 29-233) - 205 líneas

Clase MonitorQueryPerformanceJob tiene 205 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### apps\api\src\jobs\query-performance-alerts.ts

**Clase QueryPerformanceAlertsJob** (líneas 26-224) - 199 líneas

Clase QueryPerformanceAlertsJob tiene 199 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### packages\db\scripts\partition-broker-transactions.ts

**Función partitionBrokerTransactions** (líneas 25-218) - 194 líneas

Función partitionBrokerTransactions tiene 194 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\circuit-breaker.ts

**Clase CircuitBreaker** (líneas 54-227) - 174 líneas

Clase CircuitBreaker tiene 174 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### apps\api\src\utils\http-client.ts

**Clase HttpClient** (líneas 33-198) - 166 líneas

Clase HttpClient tiene 166 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### apps\api\src\jobs\weekly-performance-report.ts

**Clase WeeklyPerformanceReportJob** (líneas 33-184) - 152 líneas

Clase WeeklyPerformanceReportJob tiene 152 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### apps\web\app\portfolios\[id]\hooks\usePortfolioLineActions.ts

**Función usePortfolioLineActions** (líneas 38-186) - 149 líneas

Función usePortfolioLineActions tiene 149 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\scripts\verify-contacts-assignment.ts

**Función verifyContactsAssignment** (líneas 29-155) - 127 líneas

Función verifyContactsAssignment tiene 127 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\contacts\hooks\useContactActions.ts

**Función useContactActions** (líneas 10-130) - 121 líneas

Función useContactActions tiene 121 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\rate-limiter.ts

**Clase RateLimiter** (líneas 37-154) - 118 líneas

Clase RateLimiter tiene 118 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### apps\web\lib\api-error.ts

**Clase ApiError** (líneas 9-120) - 112 líneas

Clase ApiError tiene 112 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### packages\db\src\seed-all.ts

**Función seedPipelineStages** (líneas 24-124) - 101 líneas

Función seedPipelineStages tiene 101 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función seedLookupTables** (líneas 129-239) - 111 líneas

Función seedLookupTables tiene 111 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\jobs\refresh-materialized-views.ts

**Clase RefreshMaterializedViewsJob** (líneas 18-123) - 106 líneas

Clase RefreshMaterializedViewsJob tiene 106 líneas (límite: 100). Considerar dividir en clases más pequeñas o extraer métodos.

---

### packages\db\src\seed-pipeline-stages.ts

**Función seedPipelineStages** (líneas 17-117) - 101 líneas

Función seedPipelineStages tiene 101 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\admin\aum\components\FileUploader.tsx

**Función handleUpload** (líneas 108-202) - 95 líneas

Función handleUpload tiene 95 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\contacts\[id]\tags\[tagId]\TagDetailsForm.tsx

**Función handleSubmit** (líneas 125-210) - 86 líneas

Función handleSubmit tiene 86 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\middleware.ts

**Función middleware** (líneas 26-107) - 82 líneas

Función middleware tiene 82 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\admin\aum\rows\hooks\useAumRowsState.ts

**Función useAumRowsState** (líneas 42-121) - 80 líneas

Función useAumRowsState tiene 80 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\lib\utils\webhook-export.ts

**Función sendContactsToWebhook** (líneas 34-113) - 80 líneas

Función sendContactsToWebhook tiene 80 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\__tests__\helpers\test-db.ts

**Función cleanupTestDatabase** (líneas 66-142) - 77 líneas

Función cleanupTestDatabase tiene 77 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\components\bloomberg\PortfolioPerformanceMetrics.tsx

**Función fetchPerformance** (líneas 45-117) - 73 líneas

Función fetchPerformance tiene 73 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### packages\db\src\seed.ts

**Función seed** (líneas 10-81) - 72 líneas

Función seed tiene 72 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\lib\utils\csv-export.ts

**Función exportContactsToCSV** (líneas 123-191) - 69 líneas

Función exportContactsToCSV tiene 69 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\query-analyzer.ts

**Función analyzeQueries** (líneas 29-96) - 68 líneas

Función analyzeQueries tiene 68 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función generateTextReport** (líneas 101-153) - 53 líneas

Función generateTextReport tiene 53 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\auth\useRequireAuth.ts

**Función useRequireAuth** (líneas 9-74) - 66 líneas

Función useRequireAuth tiene 66 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\aum-columns\column-pattern-matcher.ts

**Función findColumnByPatterns** (líneas 20-83) - 64 líneas

Función findColumnByPatterns tiene 64 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\explain-analyzer.ts

**Función analyzeTableForIndexes** (líneas 208-266) - 59 líneas

Función analyzeTableForIndexes tiene 59 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\query-analysis.ts

**Función explainAnalyze** (líneas 58-116) - 59 líneas

Función explainAnalyze tiene 59 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

**Función formatPlanAsText** (líneas 139-190) - 52 líneas

Función formatPlanAsText tiene 52 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\register\page.tsx

**Función handleSubmit** (líneas 71-128) - 58 líneas

Función handleSubmit tiene 58 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\auth\middlewares.ts

**Función requireAuth** (líneas 7-63) - 57 líneas

Función requireAuth tiene 57 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\utils\pipeline-stages.ts

**Función ensureDefaultPipelineStages** (líneas 99-155) - 57 líneas

Función ensureDefaultPipelineStages tiene 57 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\api\src\scripts\assign-unassigned-contacts.ts

**Función assignUnassignedContacts** (líneas 19-71) - 53 líneas

Función assignUnassignedContacts tiene 53 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\portfolios\[id]\hooks\usePortfolioData.ts

**Función usePortfolioData** (líneas 12-64) - 53 líneas

Función usePortfolioData tiene 53 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

### apps\web\app\components\bloomberg\OHLCVChart.tsx

**Función fetchData** (líneas 56-106) - 51 líneas

Función fetchData tiene 51 líneas (límite: 50). Considerar extraer lógica a funciones más pequeñas.

---

## Recomendaciones

1. **Dividir archivos largos en módulos especializados**
2. **Extraer lógica de funciones largas a funciones auxiliares**
3. **Dividir clases grandes en clases más pequeñas o usar composición**
4. **Aplicar principios SOLID y DRY**

