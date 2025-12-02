# Auditoría de Código Duplicado

**Fecha:** 2025-12-01

**Total de duplicaciones encontradas:** 275457

## Nota

Este es un análisis básico. Para análisis más avanzado, considerar usar herramientas como:
- [jscpd](https://github.com/kucherenko/jscpd) - Detector de código duplicado
- [PMD](https://pmd.github.io/) - Análisis estático de código
- [SonarQube](https://www.sonarqube.org/) - Plataforma de calidad de código

## Duplicaciones Encontradas

### apps\api\src\routes\aum\upload.ts (16034 duplicaciones)

**Duplicado con:** apps\api\src\routes\auth.ts

- Líneas en apps\api\src\routes\aum\upload.ts: 42-48
- Líneas en apps\api\src\routes\auth.ts: 10-16
- Similitud: 85.7%

```typescript

const router = Router();

// ==========================================================
// File Upload Configuration (using centralized utility)
// ==============================================...
```

---

**Duplicado con:** apps\api\src\routes\auth.ts

- Líneas en apps\api\src\routes\aum\upload.ts: 42-47
- Líneas en apps\api\src\routes\auth.ts: 12-17
- Similitud: 83.3%

```typescript

const router = Router();

// ==========================================================
// File Upload Configuration (using centralized utility)
// ==============================================...
```

---

**Duplicado con:** apps\api\src\routes\auth.ts

- Líneas en apps\api\src\routes\aum\upload.ts: 42-46
- Líneas en apps\api\src\routes\auth.ts: 136-140
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// File Upload Configuration (using centralized utility)
```

---

**Duplicado con:** apps\api\src\routes\auth.ts

- Líneas en apps\api\src\routes\aum\upload.ts: 43-48
- Líneas en apps\api\src\routes\auth.ts: 11-16
- Similitud: 83.3%

```typescript
const router = Router();

// ==========================================================
// File Upload Configuration (using centralized utility)
// ================================================...
```

---

**Duplicado con:** apps\api\src\routes\auth.ts

- Líneas en apps\api\src\routes\aum\upload.ts: 43-47
- Líneas en apps\api\src\routes\auth.ts: 13-17
- Similitud: 80.0%

```typescript
const router = Router();

// ==========================================================
// File Upload Configuration (using centralized utility)
// ================================================...
```

---

### apps\api\src\routes\capacitaciones.ts (14850 duplicaciones)

**Duplicado con:** apps\api\src\routes\career-plan.ts

- Líneas en apps\api\src\routes\capacitaciones.ts: 13-20
- Líneas en apps\api\src\routes\career-plan.ts: 9-16
- Similitud: 87.5%

```typescript
import { parseFechaDDMMYYYY } from '../utils/date-utils';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ========================...
```

---

**Duplicado con:** apps\api\src\routes\career-plan.ts

- Líneas en apps\api\src\routes\capacitaciones.ts: 14-20
- Líneas en apps\api\src\routes\career-plan.ts: 10-16
- Similitud: 100.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\career-plan.ts

- Líneas en apps\api\src\routes\capacitaciones.ts: 14-18
- Líneas en apps\api\src\routes\career-plan.ts: 12-16
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
```

---

**Duplicado con:** apps\api\src\routes\career-plan.ts

- Líneas en apps\api\src\routes\capacitaciones.ts: 14-20
- Líneas en apps\api\src\routes\career-plan.ts: 56-62
- Similitud: 85.7%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\career-plan.ts

- Líneas en apps\api\src\routes\capacitaciones.ts: 14-19
- Líneas en apps\api\src\routes\career-plan.ts: 58-63
- Similitud: 83.3%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================
```

---

### apps\api\src\routes\tags-legacy.ts (14292 duplicaciones)

**Duplicado con:** apps\api\src\routes\tasks.ts

- Líneas en apps\api\src\routes\tags-legacy.ts: 6-10
- Líneas en apps\api\src\routes\tasks.ts: 7-11
- Similitud: 80.0%

```typescript
import { canAccessContact, getUserAccessScope, buildContactAccessFilter } from '../auth/authorization';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { 
  uuidSch...
```

---

**Duplicado con:** apps\api\src\routes\tasks.ts

- Líneas en apps\api\src\routes\tags-legacy.ts: 7-11
- Líneas en apps\api\src\routes\tasks.ts: 8-12
- Similitud: 80.0%

```typescript
import { z } from 'zod';
import { validate } from '../utils/validation';
import { 
  uuidSchema,
  idParamSchema,
```

---

**Duplicado con:** apps\api\src\routes\tasks.ts

- Líneas en apps\api\src\routes\tags-legacy.ts: 15-23
- Líneas en apps\api\src\routes\tasks.ts: 15-23
- Similitud: 88.9%

```typescript

const router = Router();
const TAGS_RULES_ENABLED = process.env.TAGS_RULES_ENABLED === 'true';

// ==========================================================
// Schemas de validación
// =======...
```

---

**Duplicado con:** apps\api\src\routes\tasks.ts

- Líneas en apps\api\src\routes\tags-legacy.ts: 16-23
- Líneas en apps\api\src\routes\tasks.ts: 16-23
- Similitud: 87.5%

```typescript
const router = Router();
const TAGS_RULES_ENABLED = process.env.TAGS_RULES_ENABLED === 'true';

// ==========================================================
// Schemas de validación
// =========...
```

---

**Duplicado con:** apps\api\src\routes\tasks.ts

- Líneas en apps\api\src\routes\tags-legacy.ts: 17-23
- Líneas en apps\api\src\routes\tasks.ts: 16-22
- Similitud: 85.7%

```typescript
const TAGS_RULES_ENABLED = process.env.TAGS_RULES_ENABLED === 'true';

// ==========================================================
// Schemas de validación
// ===================================...
```

---

### apps\api\src\routes\metrics\contacts.ts (12253 duplicaciones)

**Duplicado con:** apps\api\src\routes\metrics\goals.ts

- Líneas en apps\api\src\routes\metrics\contacts.ts: 3-7
- Líneas en apps\api\src\routes\metrics\goals.ts: 3-7
- Similitud: 80.0%

```typescript
 * 
 * Handles pipeline contact metrics calculations
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
```

---

**Duplicado con:** apps\api\src\routes\metrics\goals.ts

- Líneas en apps\api\src\routes\metrics\contacts.ts: 11-25
- Líneas en apps\api\src\routes\metrics\goals.ts: 10-24
- Similitud: 93.3%

```typescript
import { getUserAccessScope, buildContactAccessFilter } from '../../auth/authorization';
import { z } from 'zod';
import { validate } from '../../utils/validation';

const router = Router();

// =====...
```

---

**Duplicado con:** apps\api\src\routes\metrics\goals.ts

- Líneas en apps\api\src\routes\metrics\contacts.ts: 12-25
- Líneas en apps\api\src\routes\metrics\goals.ts: 11-24
- Similitud: 100.0%

```typescript
import { z } from 'zod';
import { validate } from '../../utils/validation';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ======...
```

---

**Duplicado con:** apps\api\src\routes\metrics\goals.ts

- Líneas en apps\api\src\routes\metrics\contacts.ts: 13-25
- Líneas en apps\api\src\routes\metrics\goals.ts: 12-24
- Similitud: 100.0%

```typescript
import { validate } from '../../utils/validation';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ===============================...
```

---

**Duplicado con:** apps\api\src\routes\metrics\goals.ts

- Líneas en apps\api\src\routes\metrics\contacts.ts: 14-25
- Líneas en apps\api\src\routes\metrics\goals.ts: 13-24
- Similitud: 100.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const metricsQuerySche...
```

---

### apps\api\src\routes\benchmarks.ts (12037 duplicaciones)

**Duplicado con:** apps\api\src\routes\bloomberg.ts

- Líneas en apps\api\src\routes\benchmarks.ts: 12-19
- Líneas en apps\api\src\routes\bloomberg.ts: 19-26
- Similitud: 87.5%

```typescript
import { benchmarksCacheUtil, benchmarkComponentsCacheUtil, normalizeCacheKey } from '../utils/cache';

const router = Router();

// ==========================================================
// ...
```

---

**Duplicado con:** apps\api\src\routes\bloomberg.ts

- Líneas en apps\api\src\routes\benchmarks.ts: 13-19
- Líneas en apps\api\src\routes\bloomberg.ts: 20-26
- Similitud: 100.0%

```typescript

const router = Router();

// ==========================================================
// Benchmarks CRUD
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\bloomberg.ts

- Líneas en apps\api\src\routes\benchmarks.ts: 13-17
- Líneas en apps\api\src\routes\bloomberg.ts: 22-26
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Benchmarks CRUD
```

---

**Duplicado con:** apps\api\src\routes\bloomberg.ts

- Líneas en apps\api\src\routes\benchmarks.ts: 13-17
- Líneas en apps\api\src\routes\bloomberg.ts: 34-38
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Benchmarks CRUD
```

---

**Duplicado con:** apps\api\src\routes\bloomberg.ts

- Líneas en apps\api\src\routes\benchmarks.ts: 13-19
- Líneas en apps\api\src\routes\bloomberg.ts: 122-128
- Similitud: 85.7%

```typescript

const router = Router();

// ==========================================================
// Benchmarks CRUD
// ==========================================================

```

---

### apps\api\src\index.ts (11228 duplicaciones)

**Duplicado con:** apps\api\src\jobs\daily-valuation.ts

- Líneas en apps\api\src\index.ts: 50-54
- Líneas en apps\api\src\jobs\daily-valuation.ts: 58-62
- Similitud: 80.0%

```typescript

const isProduction = process.env.NODE_ENV === 'production';

// AI_DECISION: Optimizar nivel de logging en desarrollo para mejorar rendimiento
// Justificación: Logging 'debug' es muy verboso y a...
```

---

**Duplicado con:** apps\api\src\jobs\daily-valuation.ts

- Líneas en apps\api\src\index.ts: 51-55
- Líneas en apps\api\src\jobs\daily-valuation.ts: 57-61
- Similitud: 80.0%

```typescript
const isProduction = process.env.NODE_ENV === 'production';

// AI_DECISION: Optimizar nivel de logging en desarrollo para mejorar rendimiento
// Justificación: Logging 'debug' es muy verboso y agr...
```

---

**Duplicado con:** apps\api\src\jobs\daily-valuation.ts

- Líneas en apps\api\src\index.ts: 51-55
- Líneas en apps\api\src\jobs\daily-valuation.ts: 58-62
- Similitud: 80.0%

```typescript
const isProduction = process.env.NODE_ENV === 'production';

// AI_DECISION: Optimizar nivel de logging en desarrollo para mejorar rendimiento
// Justificación: Logging 'debug' es muy verboso y agr...
```

---

**Duplicado con:** apps\api\src\jobs\daily-valuation.ts

- Líneas en apps\api\src\index.ts: 52-56
- Líneas en apps\api\src\jobs\daily-valuation.ts: 58-62
- Similitud: 80.0%

```typescript

// AI_DECISION: Optimizar nivel de logging en desarrollo para mejorar rendimiento
// Justificación: Logging 'debug' es muy verboso y agrega overhead significativo en desarrollo
// Impacto: Reduce ...
```

---

**Duplicado con:** apps\api\src\jobs\daily-valuation.ts

- Líneas en apps\api\src\index.ts: 52-56
- Líneas en apps\api\src\jobs\daily-valuation.ts: 59-63
- Similitud: 80.0%

```typescript

// AI_DECISION: Optimizar nivel de logging en desarrollo para mejorar rendimiento
// Justificación: Logging 'debug' es muy verboso y agrega overhead significativo en desarrollo
// Impacto: Reduce ...
```

---

### apps\api\src\routes\notifications.ts (10739 duplicaciones)

**Duplicado con:** apps\api\src\routes\pipeline\board.ts

- Líneas en apps\api\src\routes\notifications.ts: 6-12
- Líneas en apps\api\src\routes\pipeline\board.ts: 14-20
- Similitud: 85.7%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\pipeline\board.ts

- Líneas en apps\api\src\routes\notifications.ts: 6-12
- Líneas en apps\api\src\routes\pipeline\board.ts: 16-22
- Similitud: 85.7%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\pipeline\board.ts

- Líneas en apps\api\src\routes\notifications.ts: 6-10
- Líneas en apps\api\src\routes\pipeline\board.ts: 18-22
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

**Duplicado con:** apps\api\src\routes\pipeline\board.ts

- Líneas en apps\api\src\routes\notifications.ts: 6-10
- Líneas en apps\api\src\routes\pipeline\board.ts: 27-31
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

**Duplicado con:** apps\api\src\routes\pipeline\board.ts

- Líneas en apps\api\src\routes\notifications.ts: 7-12
- Líneas en apps\api\src\routes\pipeline\board.ts: 15-20
- Similitud: 83.3%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

```

---

### apps\api\src\routes\broker-accounts.ts (10409 duplicaciones)

**Duplicado con:** apps\api\src\routes\capacitaciones.ts

- Líneas en apps\api\src\routes\broker-accounts.ts: 8-15
- Líneas en apps\api\src\routes\capacitaciones.ts: 13-20
- Similitud: 87.5%

```typescript
import { validate } from '../utils/validation';

const router = Router();

// ==========================================================
// Schemas de validación
// =============================...
```

---

**Duplicado con:** apps\api\src\routes\capacitaciones.ts

- Líneas en apps\api\src\routes\broker-accounts.ts: 9-15
- Líneas en apps\api\src\routes\capacitaciones.ts: 14-20
- Similitud: 100.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\capacitaciones.ts

- Líneas en apps\api\src\routes\broker-accounts.ts: 9-13
- Líneas en apps\api\src\routes\capacitaciones.ts: 16-20
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

**Duplicado con:** apps\api\src\routes\capacitaciones.ts

- Líneas en apps\api\src\routes\broker-accounts.ts: 9-13
- Líneas en apps\api\src\routes\capacitaciones.ts: 41-45
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

**Duplicado con:** apps\api\src\routes\capacitaciones.ts

- Líneas en apps\api\src\routes\broker-accounts.ts: 9-13
- Líneas en apps\api\src\routes\capacitaciones.ts: 149-153
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

### apps\api\src\routes\bloomberg.ts (8787 duplicaciones)

**Duplicado con:** apps\api\src\routes\broker-accounts.ts

- Líneas en apps\api\src\routes\bloomberg.ts: 19-26
- Líneas en apps\api\src\routes\broker-accounts.ts: 8-15
- Similitud: 87.5%

```typescript
import { logger } from '../utils/logger';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ========================================...
```

---

**Duplicado con:** apps\api\src\routes\broker-accounts.ts

- Líneas en apps\api\src\routes\bloomberg.ts: 20-26
- Líneas en apps\api\src\routes\broker-accounts.ts: 9-15
- Similitud: 100.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\broker-accounts.ts

- Líneas en apps\api\src\routes\bloomberg.ts: 20-24
- Líneas en apps\api\src\routes\broker-accounts.ts: 11-15
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
```

---

**Duplicado con:** apps\api\src\routes\broker-accounts.ts

- Líneas en apps\api\src\routes\bloomberg.ts: 21-26
- Líneas en apps\api\src\routes\broker-accounts.ts: 10-15
- Similitud: 100.0%

```typescript
const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\broker-accounts.ts

- Líneas en apps\api\src\routes\bloomberg.ts: 21-25
- Líneas en apps\api\src\routes\broker-accounts.ts: 11-15
- Similitud: 80.0%

```typescript
const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================
```

---

### apps\api\src\routes\teams-legacy.ts (8707 duplicaciones)

**Duplicado con:** apps\api\src\routes\users.ts

- Líneas en apps\api\src\routes\teams-legacy.ts: 22-26
- Líneas en apps\api\src\routes\users.ts: 170-174
- Similitud: 80.0%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================
```

---

**Duplicado con:** apps\api\src\routes\users.ts

- Líneas en apps\api\src\routes\teams-legacy.ts: 22-26
- Líneas en apps\api\src\routes\users.ts: 202-206
- Similitud: 80.0%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================
```

---

**Duplicado con:** apps\api\src\routes\users.ts

- Líneas en apps\api\src\routes\teams-legacy.ts: 22-26
- Líneas en apps\api\src\routes\users.ts: 234-238
- Similitud: 80.0%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================
```

---

**Duplicado con:** apps\api\src\routes\users.ts

- Líneas en apps\api\src\routes\teams-legacy.ts: 22-26
- Líneas en apps\api\src\routes\users.ts: 267-271
- Similitud: 80.0%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================
```

---

**Duplicado con:** apps\api\src\routes\users.ts

- Líneas en apps\api\src\routes\teams-legacy.ts: 22-26
- Líneas en apps\api\src\routes\users.ts: 316-320
- Similitud: 80.0%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================
```

---

### apps\api\src\routes\notes.ts (8118 duplicaciones)

**Duplicado con:** apps\api\src\routes\notifications.ts

- Líneas en apps\api\src\routes\notes.ts: 9-16
- Líneas en apps\api\src\routes\notifications.ts: 5-12
- Similitud: 87.5%

```typescript
import { uuidSchema, idParamSchema, paginationQuerySchema } from '../utils/common-schemas';

const router = Router();

// ==========================================================
// Schemas de valid...
```

---

**Duplicado con:** apps\api\src\routes\notifications.ts

- Líneas en apps\api\src\routes\notes.ts: 10-16
- Líneas en apps\api\src\routes\notifications.ts: 6-12
- Similitud: 100.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\notifications.ts

- Líneas en apps\api\src\routes\notes.ts: 10-14
- Líneas en apps\api\src\routes\notifications.ts: 8-12
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

**Duplicado con:** apps\api\src\routes\notifications.ts

- Líneas en apps\api\src\routes\notes.ts: 11-16
- Líneas en apps\api\src\routes\notifications.ts: 7-12
- Similitud: 100.0%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\notifications.ts

- Líneas en apps\api\src\routes\notes.ts: 11-15
- Líneas en apps\api\src\routes\notifications.ts: 8-12
- Similitud: 80.0%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================
```

---

### apps\api\src\routes\aum\rows.ts (7924 duplicaciones)

**Duplicado con:** apps\api\src\routes\aum\upload.ts

- Líneas en apps\api\src\routes\aum\rows.ts: 3-9
- Líneas en apps\api\src\routes\aum\upload.ts: 3-9
- Similitud: 85.7%

```typescript
 * 
 * AI_DECISION: Modularizar endpoints de rows en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
...
```

---

**Duplicado con:** apps\api\src\routes\aum\upload.ts

- Líneas en apps\api\src\routes\aum\rows.ts: 4-9
- Líneas en apps\api\src\routes\aum\upload.ts: 4-9
- Similitud: 83.3%

```typescript
 * AI_DECISION: Modularizar endpoints de rows en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */
...
```

---

**Duplicado con:** apps\api\src\routes\aum\upload.ts

- Líneas en apps\api\src\routes\aum\rows.ts: 5-9
- Líneas en apps\api\src\routes\aum\upload.ts: 5-9
- Similitud: 100.0%

```typescript
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

import { Router, type Request, type Response } from 'express';
```

---

**Duplicado con:** apps\api\src\routes\aum\upload.ts

- Líneas en apps\api\src\routes\aum\rows.ts: 6-10
- Líneas en apps\api\src\routes\aum\upload.ts: 6-10
- Similitud: 80.0%

```typescript
 * Impacto: Código más organizado y mantenible
 */

import { Router, type Request, type Response } from 'express';
import { db, aumImportRows, aumImportFiles, contacts, users, advisorAliases, aumM...
```

---

**Duplicado con:** apps\api\src\routes\aum\upload.ts

- Líneas en apps\api\src\routes\aum\rows.ts: 23-29
- Líneas en apps\api\src\routes\aum\upload.ts: 40-46
- Similitud: 85.7%

```typescript
  aumRowIdParamsSchema
} from '../../utils/aum-validation';

const router = Router();

// Simple in-memory cache for COUNT queries when no filters are active
// Cache key: JSON stringified filte...
```

---

### apps\api\src\routes\auth.ts (7329 duplicaciones)

**Duplicado con:** apps\api\src\routes\automations.ts

- Líneas en apps\api\src\routes\auth.ts: 10-16
- Líneas en apps\api\src\routes\automations.ts: 15-21
- Similitud: 85.7%

```typescript

const router = Router();

import { validate } from '../utils/validation';

// AI_DECISION: Login via identifier (email or username)
// Justificación: Permite autenticación flexible y más rápida...
```

---

**Duplicado con:** apps\api\src\routes\automations.ts

- Líneas en apps\api\src\routes\auth.ts: 11-16
- Líneas en apps\api\src\routes\automations.ts: 16-21
- Similitud: 83.3%

```typescript
const router = Router();

import { validate } from '../utils/validation';

// AI_DECISION: Login via identifier (email or username)
// Justificación: Permite autenticación flexible y más rápida p...
```

---

**Duplicado con:** apps\api\src\routes\automations.ts

- Líneas en apps\api\src\routes\auth.ts: 12-17
- Líneas en apps\api\src\routes\automations.ts: 15-20
- Similitud: 83.3%

```typescript

import { validate } from '../utils/validation';

// AI_DECISION: Login via identifier (email or username)
// Justificación: Permite autenticación flexible y más rápida por username
// Impacto: C...
```

---

**Duplicado con:** apps\api\src\routes\automations.ts

- Líneas en apps\api\src\routes\auth.ts: 12-16
- Líneas en apps\api\src\routes\automations.ts: 17-21
- Similitud: 80.0%

```typescript

import { validate } from '../utils/validation';

// AI_DECISION: Login via identifier (email or username)
// Justificación: Permite autenticación flexible y más rápida por username
```

---

**Duplicado con:** apps\api\src\routes\automations.ts

- Líneas en apps\api\src\routes\auth.ts: 12-16
- Líneas en apps\api\src\routes\automations.ts: 44-48
- Similitud: 80.0%

```typescript

import { validate } from '../utils/validation';

// AI_DECISION: Login via identifier (email or username)
// Justificación: Permite autenticación flexible y más rápida por username
```

---

### apps\api\src\routes\contacts\webhook.ts (7324 duplicaciones)

**Duplicado con:** apps\api\src\routes\health.ts

- Líneas en apps\api\src\routes\contacts\webhook.ts: 385-391
- Líneas en apps\api\src\routes\health.ts: 122-128
- Similitud: 85.7%

```typescript
      next(err);
    }
  }
);

export default router;

```

---

**Duplicado con:** apps\api\src\routes\health.ts

- Líneas en apps\api\src\routes\contacts\webhook.ts: 386-391
- Líneas en apps\api\src\routes\health.ts: 123-128
- Similitud: 100.0%

```typescript
    }
  }
);

export default router;

```

---

**Duplicado con:** apps\api\src\routes\instruments.ts

- Líneas en apps\api\src\routes\contacts\webhook.ts: 14-18
- Líneas en apps\api\src\routes\instruments.ts: 20-24
- Similitud: 80.0%

```typescript
import { z } from 'zod';

const router = Router();

// Rate limiter para webhooks (por usuario)
```

---

**Duplicado con:** apps\api\src\routes\instruments.ts

- Líneas en apps\api\src\routes\contacts\webhook.ts: 15-19
- Líneas en apps\api\src\routes\instruments.ts: 21-25
- Similitud: 80.0%

```typescript

const router = Router();

// Rate limiter para webhooks (por usuario)
const webhookRateLimiter = createUserRateLimiter({
```

---

**Duplicado con:** apps\api\src\routes\instruments.ts

- Líneas en apps\api\src\routes\contacts\webhook.ts: 22-26
- Líneas en apps\api\src\routes\instruments.ts: 25-29
- Similitud: 80.0%

```typescript
});

// ==========================================================
// Zod Validation Schemas
// ==========================================================
```

---

### apps\api\src\routes\tasks.ts (6923 duplicaciones)

**Duplicado con:** apps\api\src\routes\teams\schemas.ts

- Líneas en apps\api\src\routes\tasks.ts: 15-19
- Líneas en apps\api\src\routes\teams\schemas.ts: 7-11
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

**Duplicado con:** apps\api\src\routes\teams\schemas.ts

- Líneas en apps\api\src\routes\tasks.ts: 15-21
- Líneas en apps\api\src\routes\teams\schemas.ts: 18-24
- Similitud: 85.7%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\teams\schemas.ts

- Líneas en apps\api\src\routes\tasks.ts: 15-19
- Líneas en apps\api\src\routes\teams\schemas.ts: 20-24
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

**Duplicado con:** apps\api\src\routes\teams\schemas.ts

- Líneas en apps\api\src\routes\tasks.ts: 15-19
- Líneas en apps\api\src\routes\teams\schemas.ts: 37-41
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Schemas de validación
```

---

**Duplicado con:** apps\api\src\routes\teams\schemas.ts

- Líneas en apps\api\src\routes\tasks.ts: 16-21
- Líneas en apps\api\src\routes\teams\schemas.ts: 6-11
- Similitud: 83.3%

```typescript
const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

```

---

### apps\api\src\routes\portfolio.ts (6585 duplicaciones)

**Duplicado con:** apps\api\src\routes\settings-advisors.ts

- Líneas en apps\api\src\routes\portfolio.ts: 21-28
- Líneas en apps\api\src\routes\settings-advisors.ts: 8-15
- Similitud: 87.5%

```typescript
import { getPortfolioTemplateLines, getAssignmentWithAccessCheck } from '../services/portfolio-service';

const router = Router();

// ==========================================================
// Zod...
```

---

**Duplicado con:** apps\api\src\routes\settings-advisors.ts

- Líneas en apps\api\src\routes\portfolio.ts: 22-28
- Líneas en apps\api\src\routes\settings-advisors.ts: 9-15
- Similitud: 100.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\settings-advisors.ts

- Líneas en apps\api\src\routes\portfolio.ts: 22-26
- Líneas en apps\api\src\routes\settings-advisors.ts: 11-15
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
```

---

**Duplicado con:** apps\api\src\routes\settings-advisors.ts

- Líneas en apps\api\src\routes\portfolio.ts: 22-28
- Líneas en apps\api\src\routes\settings-advisors.ts: 27-33
- Similitud: 85.7%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\settings-advisors.ts

- Líneas en apps\api\src\routes\portfolio.ts: 22-27
- Líneas en apps\api\src\routes\settings-advisors.ts: 29-34
- Similitud: 83.3%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================
```

---

### apps\api\src\routes\pipeline\metrics.ts (5485 duplicaciones)

**Duplicado con:** apps\api\src\routes\pipeline\move.ts

- Líneas en apps\api\src\routes\pipeline\metrics.ts: 3-7
- Líneas en apps\api\src\routes\pipeline\move.ts: 3-7
- Similitud: 80.0%

```typescript
 * 
 * Handles pipeline metrics and export operations
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
```

---

**Duplicado con:** apps\api\src\routes\pipeline\move.ts

- Líneas en apps\api\src\routes\pipeline\metrics.ts: 16-22
- Líneas en apps\api\src\routes\pipeline\move.ts: 17-23
- Similitud: 85.7%

```typescript

const router = Router();

type PipelineStage = InferSelectModel<typeof pipelineStages>;

// ==========================================================
// Zod Validation Schemas
```

---

**Duplicado con:** apps\api\src\routes\pipeline\move.ts

- Líneas en apps\api\src\routes\pipeline\metrics.ts: 17-22
- Líneas en apps\api\src\routes\pipeline\move.ts: 18-23
- Similitud: 83.3%

```typescript
const router = Router();

type PipelineStage = InferSelectModel<typeof pipelineStages>;

// ==========================================================
// Zod Validation Schemas
```

---

**Duplicado con:** apps\api\src\routes\pipeline\move.ts

- Líneas en apps\api\src\routes\pipeline\metrics.ts: 18-24
- Líneas en apps\api\src\routes\pipeline\move.ts: 17-23
- Similitud: 85.7%

```typescript

type PipelineStage = InferSelectModel<typeof pipelineStages>;

// ==========================================================
// Zod Validation Schemas
// =============================================...
```

---

**Duplicado con:** apps\api\src\routes\pipeline\move.ts

- Líneas en apps\api\src\routes\pipeline\metrics.ts: 18-22
- Líneas en apps\api\src\routes\pipeline\move.ts: 19-23
- Similitud: 80.0%

```typescript

type PipelineStage = InferSelectModel<typeof pipelineStages>;

// ==========================================================
// Zod Validation Schemas
```

---

### apps\api\src\routes\analytics\comparison.ts (4744 duplicaciones)

**Duplicado con:** apps\api\src\routes\analytics\dashboard.ts

- Líneas en apps\api\src\routes\analytics\comparison.ts: 3-9
- Líneas en apps\api\src\routes\analytics\dashboard.ts: 3-9
- Similitud: 85.7%

```typescript
 * 
 * Handles portfolio/benchmark comparison operations
 */

import { Router, type Request, type Response } from 'express';
import { db } from '@cactus/db';
import { 
```

---

**Duplicado con:** apps\api\src\routes\analytics\dashboard.ts

- Líneas en apps\api\src\routes\analytics\comparison.ts: 4-9
- Líneas en apps\api\src\routes\analytics\dashboard.ts: 4-9
- Similitud: 83.3%

```typescript
 * Handles portfolio/benchmark comparison operations
 */

import { Router, type Request, type Response } from 'express';
import { db } from '@cactus/db';
import { 
```

---

**Duplicado con:** apps\api\src\routes\analytics\dashboard.ts

- Líneas en apps\api\src\routes\analytics\comparison.ts: 5-9
- Líneas en apps\api\src\routes\analytics\dashboard.ts: 5-9
- Similitud: 100.0%

```typescript
 */

import { Router, type Request, type Response } from 'express';
import { db } from '@cactus/db';
import { 
```

---

**Duplicado con:** apps\api\src\routes\analytics\dashboard.ts

- Líneas en apps\api\src\routes\analytics\comparison.ts: 6-10
- Líneas en apps\api\src\routes\analytics\dashboard.ts: 6-10
- Similitud: 80.0%

```typescript

import { Router, type Request, type Response } from 'express';
import { db } from '@cactus/db';
import { 
  portfolioTemplates,
```

---

**Duplicado con:** apps\api\src\routes\analytics\dashboard.ts

- Líneas en apps\api\src\routes\analytics\comparison.ts: 17-22
- Líneas en apps\api\src\routes\analytics\dashboard.ts: 22-27
- Similitud: 83.3%

```typescript
import { requireAuth, requireRole } from '../../auth/middlewares';
import { getPortfolioCompareTimeout } from '../../config/timeouts';

const router = Router();

// URL del microservicio Python
```

---

### apps\api\src\routes\instruments.ts (4671 duplicaciones)

**Duplicado con:** apps\api\src\routes\logs.ts

- Líneas en apps\api\src\routes\instruments.ts: 20-24
- Líneas en apps\api\src\routes\logs.ts: 3-7
- Similitud: 80.0%

```typescript
import { CircuitBreaker } from '../utils/circuit-breaker';

const router = Router();

// URL del microservicio Python
```

---

**Duplicado con:** apps\api\src\routes\logs.ts

- Líneas en apps\api\src\routes\instruments.ts: 21-25
- Líneas en apps\api\src\routes\logs.ts: 4-8
- Similitud: 80.0%

```typescript

const router = Router();

// URL del microservicio Python
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:3002';
```

---

**Duplicado con:** apps\api\src\routes\logs.ts

- Líneas en apps\api\src\routes\instruments.ts: 120-124
- Líneas en apps\api\src\routes\logs.ts: 88-92
- Similitud: 80.0%

```typescript
    }

    // AI_DECISION: Cache instrument search results
    // Justificación: Búsquedas frecuentes con resultados relativamente estables, cache reduce carga en servicio Python y BD
    // Impac...
```

---

**Duplicado con:** apps\api\src\routes\logs.ts

- Líneas en apps\api\src\routes\instruments.ts: 296-300
- Líneas en apps\api\src\routes\logs.ts: 132-136
- Similitud: 80.0%

```typescript
    });

  } catch (error) {
    req.log.error({ error, query: req.body.query }, 'Error searching instruments');
    
```

---

**Duplicado con:** apps\api\src\routes\logs.ts

- Líneas en apps\api\src\routes\instruments.ts: 432-436
- Líneas en apps\api\src\routes\logs.ts: 132-136
- Similitud: 80.0%

```typescript
    });

  } catch (error) {
    req.log.error({ error, symbol: req.params.symbol }, 'Error validating symbol');
    
```

---

### apps\api\src\routes\career-plan.ts (4539 duplicaciones)

**Duplicado con:** apps\api\src\routes\contacts\assignment.ts

- Líneas en apps\api\src\routes\career-plan.ts: 9-16
- Líneas en apps\api\src\routes\contacts\assignment.ts: 13-20
- Similitud: 87.5%

```typescript
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ============...
```

---

**Duplicado con:** apps\api\src\routes\contacts\assignment.ts

- Líneas en apps\api\src\routes\career-plan.ts: 10-16
- Líneas en apps\api\src\routes\contacts\assignment.ts: 14-20
- Similitud: 100.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

```

---

**Duplicado con:** apps\api\src\routes\contacts\assignment.ts

- Líneas en apps\api\src\routes\career-plan.ts: 10-14
- Líneas en apps\api\src\routes\contacts\assignment.ts: 16-20
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
```

---

**Duplicado con:** apps\api\src\routes\contacts\assignment.ts

- Líneas en apps\api\src\routes\career-plan.ts: 10-14
- Líneas en apps\api\src\routes\contacts\assignment.ts: 24-28
- Similitud: 80.0%

```typescript

const router = Router();

// ==========================================================
// Zod Validation Schemas
```

---

**Duplicado con:** apps\api\src\routes\contacts\assignment.ts

- Líneas en apps\api\src\routes\career-plan.ts: 11-16
- Líneas en apps\api\src\routes\contacts\assignment.ts: 15-20
- Similitud: 100.0%

```typescript
const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

```

---


*... y 275357 duplicaciones más*

## Recomendaciones

1. **Extraer código duplicado a funciones/componentes reutilizables**
2. **Crear utilidades compartidas en `utils/` o `lib/`**
3. **Usar composición en lugar de duplicación**
4. **Aplicar principio DRY (Don't Repeat Yourself)**

