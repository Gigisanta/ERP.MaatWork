# Plan de Implementación Detallado - Sistema Notion CRM con SSO Automático

## 1. Análisis del Estado Actual

### 1.1 Sistema Existente
Basándome en el análisis del código actual, el sistema ya cuenta con:
- ✅ Página NotionCRM básica (`src/pages/NotionCRM.tsx`)
- ✅ Servicio Notion (`src/services/notionService.ts`)
- ✅ API routes (`api/routes/notion.ts`)
- ✅ Tabla `notion_pages_map` en Supabase
- ✅ Tipos TypeScript (`src/types/notion.ts`)
- ✅ Configuración básica de OAuth

### 1.2 Mejoras Requeridas
- 🔄 **SSO Automático**: Implementar autenticación transparente
- 🔄 **Sincronización Bidireccional**: Datos entre CactusDashboard y Notion
- 🔄 **Gestión Avanzada de Tokens**: Renovación automática y seguridad
- 🔄 **Resolución de Conflictos**: Interface para manejar conflictos de datos
- 🔄 **Monitoreo y Métricas**: Dashboard de estado y performance
- 🔄 **Seguridad Mejorada**: Encriptación y auditoría

## 2. Roadmap de Implementación

### Fase 1: Fundación y Seguridad (Semanas 1-2)

#### Semana 1: Migración de Base de Datos

**Día 1-2: Actualizar Esquema de Base de Datos**

1. **Crear nueva migración**:
```bash
# Crear archivo de migración
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_upgrade_notion_sso_system.sql
```

2. **Contenido de la migración**:
```sql
-- Migración: Actualizar sistema Notion para SSO avanzado
-- Fecha: 2024-01-XX
-- Descripción: Agregar campos para tokens OAuth, sincronización y auditoría

-- Actualizar tabla existente notion_pages_map
ALTER TABLE notion_pages_map ADD COLUMN IF NOT EXISTS encrypted_refresh_token TEXT;
ALTER TABLE notion_pages_map ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE notion_pages_map ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE notion_pages_map ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true;
ALTER TABLE notion_pages_map ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Crear tabla para workspaces
CREATE TABLE IF NOT EXISTS notion_workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notion_workspace_id TEXT UNIQUE NOT NULL,
    workspace_name TEXT NOT NULL,
    workspace_icon TEXT,
    workspace_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla para logs de sincronización
CREATE TABLE IF NOT EXISTS notion_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('contacts', 'tasks', 'notes', 'full')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    sync_metadata JSONB DEFAULT '{}'::jsonb,
    synced_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Crear tabla para conflictos
CREATE TABLE IF NOT EXISTS notion_conflicts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_log_id UUID NOT NULL REFERENCES notion_sync_logs(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'task', 'note')),
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('duplicate', 'modified', 'deleted')),
    local_data JSONB NOT NULL,
    remote_data JSONB NOT NULL,
    resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved_local', 'resolved_remote', 'resolved_merge')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Índices optimizados
CREATE INDEX IF NOT EXISTS idx_notion_pages_map_workspace_id ON notion_pages_map(notion_workspace_id);
CREATE INDEX IF NOT EXISTS idx_notion_pages_map_sync_enabled ON notion_pages_map(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX IF NOT EXISTS idx_notion_sync_logs_user_status ON notion_sync_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notion_conflicts_resolution ON notion_conflicts(resolution_status) WHERE resolution_status = 'pending';

-- Políticas RLS para nuevas tablas
ALTER TABLE notion_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync logs" ON notion_sync_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own conflicts" ON notion_conflicts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notion_sync_logs nsl 
            WHERE nsl.id = sync_log_id AND nsl.user_id = auth.uid()
        )
    );

-- Permisos
GRANT SELECT ON notion_workspaces TO authenticated;
GRANT SELECT, INSERT ON notion_sync_logs TO authenticated;
GRANT SELECT, UPDATE ON notion_conflicts TO authenticated;
```

**Día 3-4: Servicio de Encriptación**

1. **Crear servicio de encriptación**:
```bash
mkdir -p src/services/security
touch src/services/security/encryptionService.ts
```

2. **Implementar encriptación**:
```typescript
// src/services/security/encryptionService.ts
import CryptoJS from 'crypto-js';

class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationRounds = 100000;

  private getEncryptionKey(userId: string): string {
    const baseKey = process.env.ENCRYPTION_KEY || '';
    return CryptoJS.PBKDF2(baseKey + userId, 'cactus-salt', {
      keySize: 256/32,
      iterations: this.keyDerivationRounds
    }).toString();
  }

  encrypt(data: string, userId: string): string {
    const key = this.getEncryptionKey(userId);
    const encrypted = CryptoJS.AES.encrypt(data, key).toString();
    return encrypted;
  }

  decrypt(encryptedData: string, userId: string): string {
    const key = this.getEncryptionKey(userId);
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
}

export const encryptionService = new EncryptionService();
```

**Día 5: Actualizar Variables de Entorno**

1. **Actualizar `.env.example`**:
```bash
# Notion OAuth Configuration
NOTION_CLIENT_ID="your_notion_client_id"
NOTION_CLIENT_SECRET="your_notion_client_secret"
NOTION_REDIRECT_URI="https://your-domain.vercel.app/api/notion/oauth/callback"
NOTION_WEBHOOK_SECRET="your_webhook_secret"

# Encryption
ENCRYPTION_KEY="generate_32_character_random_key_here"

# Redis (opcional para cache)
REDIS_URL="redis://localhost:6379"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

2. **Generar clave de encriptación**:
```bash
# Generar clave segura de 32 caracteres
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Semana 2: Servicios Core

**Día 1-3: Actualizar Servicio Notion**

1. **Mejorar `src/services/notionService.ts`**:
```typescript
// Agregar métodos para SSO y sincronización
class NotionService {
  // ... código existente ...

  /**
   * Generar URL de SSO automático
   */
  async generateSSOUrl(userId: string): Promise<string | null> {
    try {
      const config = await this.getUserNotionConfig(userId);
      if (!config?.encrypted_access_token) {
        return null;
      }

      // Verificar si el token está vigente
      if (config.token_expires_at && new Date(config.token_expires_at) <= new Date()) {
        // Intentar renovar token
        const renewed = await this.refreshUserToken(userId);
        if (!renewed) {
          return null;
        }
      }

      // Generar URL con token embebido (método seguro)
      return this.buildSecureNotionUrl(config.notion_page_url, userId);
    } catch (error) {
      console.error('[NotionService] Error generating SSO URL:', error);
      return null;
    }
  }

  /**
   * Renovar token de acceso
   */
  private async refreshUserToken(userId: string): Promise<boolean> {
    try {
      const config = await this.getUserNotionConfig(userId);
      if (!config?.encrypted_refresh_token) {
        return false;
      }

      const refreshToken = encryptionService.decrypt(config.encrypted_refresh_token, userId);
      
      // Llamar a API de Notion para renovar token
      const response = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.NOTION_CLIENT_ID,
          client_secret: process.env.NOTION_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();
      
      // Actualizar tokens en base de datos
      await this.updateUserTokens(userId, tokenData);
      
      return true;
    } catch (error) {
      console.error('[NotionService] Error refreshing token:', error);
      return false;
    }
  }

  /**
   * Sincronizar contactos a Notion
   */
  async syncContactsToNotion(userId: string, contactIds: string[]): Promise<SyncResult> {
    const syncLog = await this.createSyncLog(userId, 'contacts', { contactIds });
    
    try {
      const config = await this.getUserNotionConfig(userId);
      if (!config?.encrypted_access_token) {
        throw new Error('No Notion access token found');
      }

      const accessToken = encryptionService.decrypt(config.encrypted_access_token, userId);
      const notion = new Client({ auth: accessToken });

      // Obtener contactos de CactusDashboard
      const contacts = await this.getContactsForSync(contactIds);
      
      let syncedCount = 0;
      let failedCount = 0;
      const errors: any[] = [];

      for (const contact of contacts) {
        try {
          await this.syncContactToNotion(notion, contact, config.notion_page_id);
          syncedCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            contact_id: contact.id,
            error: error.message,
            code: 'SYNC_ERROR'
          });
        }
      }

      await this.updateSyncLog(syncLog.id, {
        status: failedCount === 0 ? 'completed' : 'completed_with_errors',
        synced_count: syncedCount,
        failed_count: failedCount,
        errors,
        completed_at: new Date().toISOString()
      });

      return {
        sync_id: syncLog.id,
        status: failedCount === 0 ? 'completed' : 'completed_with_errors',
        synced_count: syncedCount,
        failed_count: failedCount,
        errors
      };
    } catch (error) {
      await this.updateSyncLog(syncLog.id, {
        status: 'failed',
        errors: [{ error: error.message, code: 'SYNC_FAILED' }],
        completed_at: new Date().toISOString()
      });
      throw error;
    }
  }
}
```

**Día 4-5: Actualizar API Routes**

1. **Mejorar `api/routes/notion.ts`**:
```typescript
// Agregar endpoints para SSO y sincronización

// Endpoint para generar URL de SSO
router.get('/sso-url', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const ssoUrl = await notionService.generateSSOUrl(userId);
    
    if (!ssoUrl) {
      return res.status(404).json({ 
        error: 'No valid Notion configuration found',
        requires_setup: true 
      });
    }

    res.json({ sso_url: ssoUrl });
  } catch (error) {
    console.error('Error generating SSO URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para sincronización de contactos
router.post('/sync/contacts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { contact_ids, sync_mode = 'incremental' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!contact_ids || !Array.isArray(contact_ids)) {
      return res.status(400).json({ error: 'contact_ids array is required' });
    }

    const result = await notionService.syncContactsToNotion(userId, contact_ids);
    res.json(result);
  } catch (error) {
    console.error('Error syncing contacts:', error);
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
});

// Endpoint para webhooks de Notion
router.post('/webhooks/notion', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['notion-webhook-signature'] as string;
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verificar firma del webhook
    const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Procesar evento de Notion
    await notionService.handleWebhookEvent(req.body);
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing Notion webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

### Fase 2: Frontend y UX (Semanas 3-4)

#### Semana 3: Componentes React

**Día 1-2: Actualizar Página NotionCRM**

1. **Mejorar `src/pages/NotionCRM.tsx`**:
```typescript
// Agregar funcionalidad de SSO automático
const NotionCRM: React.FC = () => {
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);
  const [isLoadingSSO, setIsLoadingSSO] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Intentar obtener URL de SSO al cargar
  useEffect(() => {
    const initializeSSO = async () => {
      try {
        setIsLoadingSSO(true);
        const response = await notionService.getSSOUrl();
        
        if (response.sso_url) {
          setSsoUrl(response.sso_url);
        } else if (response.requires_setup) {
          // Mostrar configuración OAuth
          setShowOAuthSetup(true);
        }
      } catch (error) {
        console.error('Error initializing SSO:', error);
        // Fallback a URL estática
        setSsoUrl(fallbackUrl);
      } finally {
        setIsLoadingSSO(false);
      }
    };

    initializeSSO();
  }, []);

  // Función para sincronizar contactos
  const handleSyncContacts = async () => {
    try {
      setSyncStatus('syncing');
      const contactIds = await getSelectedContactIds();
      
      const result = await notionService.syncContacts(contactIds);
      
      if (result.status === 'completed') {
        setSyncStatus('success');
        showNotification('Contactos sincronizados exitosamente');
      } else {
        setSyncStatus('partial');
        showNotification(`Sincronización parcial: ${result.synced_count} exitosos, ${result.failed_count} fallidos`);
      }
    } catch (error) {
      setSyncStatus('error');
      showNotification('Error en la sincronización', 'error');
    }
  };

  if (isLoadingSSO) {
    return <LoadingSpinner message="Configurando acceso a Notion..." />;
  }

  return (
    <div className="notion-crm-container">
      {/* Header con controles */}
      <NotionCRMHeader 
        onSync={handleSyncContacts}
        syncStatus={syncStatus}
        onRefresh={() => window.location.reload()}
      />
      
      {/* Contenido principal */}
      {ssoUrl ? (
        <NotionEmbeddedViewer url={ssoUrl} />
      ) : (
        <NotionSetupCard onSetupComplete={(url) => setSsoUrl(url)} />
      )}
      
      {/* Status bar */}
      <NotionStatusBar syncStatus={syncStatus} lastSync={lastSyncTime} />
    </div>
  );
};
```

**Día 3-4: Componentes de Sincronización**

1. **Crear `src/components/notion/SyncDashboard.tsx`**:
```typescript
interface SyncDashboardProps {
  userId: string;
}

const SyncDashboard: React.FC<SyncDashboardProps> = ({ userId }) => {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSyncData();
  }, [userId]);

  const loadSyncData = async () => {
    try {
      setIsLoading(true);
      const [logsResponse, conflictsResponse] = await Promise.all([
        notionService.getSyncLogs(userId),
        notionService.getConflicts(userId)
      ]);
      
      setSyncLogs(logsResponse.data);
      setConflicts(conflictsResponse.data);
    } catch (error) {
      console.error('Error loading sync data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sync-dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs de sincronización */}
        <SyncLogsPanel logs={syncLogs} onRefresh={loadSyncData} />
        
        {/* Conflictos pendientes */}
        <ConflictsPanel 
          conflicts={conflicts} 
          onResolve={handleConflictResolution}
        />
      </div>
      
      {/* Métricas en tiempo real */}
      <SyncMetrics userId={userId} />
    </div>
  );
};
```

**Día 5: Componentes de Configuración**

1. **Crear `src/components/notion/NotionSetup.tsx`**:
```typescript
const NotionSetup: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [setupStep, setSetupStep] = useState<'intro' | 'oauth' | 'workspace' | 'complete'>('intro');

  const handleStartOAuth = async () => {
    try {
      setIsConnecting(true);
      setSetupStep('oauth');
      
      // Redirigir a OAuth
      const oauthUrl = await notionService.getOAuthUrl();
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Error starting OAuth:', error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="notion-setup">
      <SetupStepper currentStep={setupStep} />
      
      {setupStep === 'intro' && (
        <IntroStep onNext={handleStartOAuth} isLoading={isConnecting} />
      )}
      
      {setupStep === 'workspace' && (
        <WorkspaceSelectionStep onComplete={() => setSetupStep('complete')} />
      )}
      
      {setupStep === 'complete' && (
        <CompletionStep onFinish={() => window.location.reload()} />
      )}
    </div>
  );
};
```

#### Semana 4: Integración y Testing

**Día 1-2: Integración de Componentes**

1. **Actualizar rutas en `src/App.tsx`**:
```typescript
// Agregar rutas para Notion
<Route path="/notion-crm" element={<NotionCRM />} />
<Route path="/notion-crm/setup" element={<NotionSetup />} />
<Route path="/notion-crm/sync" element={<NotionSyncDashboard />} />
```

2. **Actualizar sidebar para incluir nuevas opciones**:
```typescript
// En src/components/Sidebar.tsx
const notionItems = [
  { icon: Book, label: 'Notion CRM', path: '/notion-crm' },
  { icon: RefreshCw, label: 'Sincronización', path: '/notion-crm/sync' },
  { icon: Settings, label: 'Configuración', path: '/notion-crm/setup' }
];
```

**Día 3-4: Testing y Debugging**

1. **Crear tests unitarios**:
```bash
mkdir -p src/__tests__/notion
touch src/__tests__/notion/notionService.test.ts
touch src/__tests__/notion/encryptionService.test.ts
```

2. **Tests de integración**:
```typescript
// src/__tests__/notion/notionService.test.ts
describe('NotionService', () => {
  test('should generate SSO URL for authenticated user', async () => {
    const mockUserId = 'test-user-id';
    const ssoUrl = await notionService.generateSSOUrl(mockUserId);
    expect(ssoUrl).toBeTruthy();
  });

  test('should handle token refresh gracefully', async () => {
    // Test token refresh logic
  });

  test('should sync contacts successfully', async () => {
    // Test contact synchronization
  });
});
```

**Día 5: Optimización y Performance**

1. **Implementar lazy loading**:
```typescript
// Lazy load de componentes pesados
const NotionCRM = lazy(() => import('../pages/NotionCRM'));
const NotionSyncDashboard = lazy(() => import('../components/notion/SyncDashboard'));
```

2. **Optimizar queries de base de datos**:
```sql
-- Agregar índices adicionales si es necesario
CREATE INDEX IF NOT EXISTS idx_notion_pages_map_last_sync 
ON notion_pages_map(last_sync_at DESC) 
WHERE sync_enabled = true;
```

### Fase 3: Sincronización Avanzada (Semanas 5-6)

#### Semana 5: Motor de Sincronización

**Día 1-3: Implementar Sincronización Bidireccional**

1. **Crear `src/services/syncEngine.ts`**:
```typescript
class SyncEngine {
  async syncToNotion(userId: string, entityType: string, entityIds: string[]) {
    // Implementar lógica de sincronización hacia Notion
  }

  async syncFromNotion(userId: string, notionPageId: string) {
    // Implementar lógica de sincronización desde Notion
  }

  async detectConflicts(localData: any, remoteData: any): Promise<Conflict[]> {
    // Detectar conflictos entre datos locales y remotos
  }

  async resolveConflict(conflictId: string, resolution: ConflictResolution) {
    // Resolver conflictos según la estrategia elegida
  }
}
```

**Día 4-5: Webhooks de Notion**

1. **Implementar manejo de webhooks**:
```typescript
// En api/routes/notion.ts
const handleNotionWebhook = async (event: NotionWebhookEvent) => {
  switch (event.type) {
    case 'page.updated':
      await syncEngine.handlePageUpdate(event);
      break;
    case 'database.updated':
      await syncEngine.handleDatabaseUpdate(event);
      break;
    default:
      console.log('Unhandled webhook event:', event.type);
  }
};
```

#### Semana 6: Resolución de Conflictos

**Día 1-3: Interface de Conflictos**

1. **Crear componente de resolución**:
```typescript
const ConflictResolutionModal: React.FC<ConflictResolutionProps> = ({ conflict, onResolve }) => {
  return (
    <Modal>
      <div className="conflict-resolution">
        <ConflictDiff localData={conflict.local_data} remoteData={conflict.remote_data} />
        <ResolutionOptions onSelect={onResolve} />
      </div>
    </Modal>
  );
};
```

**Día 4-5: Testing de Sincronización**

1. **Tests end-to-end**:
```typescript
describe('Notion Sync E2E', () => {
  test('should sync contacts and handle conflicts', async () => {
    // Test completo de sincronización
  });
});
```

### Fase 4: Monitoreo y Producción (Semanas 7-8)

#### Semana 7: Dashboard de Monitoreo

**Día 1-3: Métricas y Analytics**

1. **Implementar métricas**:
```typescript
class MetricsService {
  async trackSyncOperation(userId: string, operation: string, duration: number) {
    // Registrar métricas de operaciones
  }

  async getSyncMetrics(userId: string, timeRange: string) {
    // Obtener métricas de sincronización
  }
}
```

**Día 4-5: Alertas y Notificaciones**

1. **Sistema de alertas**:
```typescript
class AlertService {
  async checkSyncHealth() {
    // Verificar salud del sistema de sincronización
  }

  async sendAlert(type: AlertType, message: string, severity: AlertSeverity) {
    // Enviar alertas a administradores
  }
}
```

#### Semana 8: Deployment y Documentación

**Día 1-2: Configuración de Producción**

1. **Variables de entorno de producción**:
```bash
# En Vercel/producción
NOTION_CLIENT_ID=prod_client_id
NOTION_CLIENT_SECRET=prod_client_secret
ENCRYPTION_KEY=prod_encryption_key_32_chars
NOTION_WEBHOOK_SECRET=prod_webhook_secret
```

2. **Configurar webhooks en Notion**:
- Crear integración en Notion
- Configurar webhook URL: `https://tu-dominio.com/api/notion/webhooks/notion`
- Configurar eventos: page updates, database updates

**Día 3-4: Testing en Producción**

1. **Smoke tests**:
```bash
# Verificar endpoints críticos
curl -X GET "https://tu-dominio.com/api/notion/me" -H "Authorization: Bearer $TOKEN"
```

2. **Monitoreo de performance**:
- Configurar alertas de latencia
- Monitorear tasa de errores
- Verificar uso de memoria y CPU

**Día 5: Documentación Final**

1. **Documentación de usuario**:
```markdown
# Guía de Usuario - Notion CRM

## Configuración Inicial
1. Navegar a "Notion CRM" en el sidebar
2. Hacer clic en "Conectar con Notion"
3. Autorizar permisos en Notion
4. Seleccionar workspace y página

## Sincronización
1. Seleccionar contactos en CRM
2. Hacer clic en "Sincronizar con Notion"
3. Monitorear progreso en dashboard
```

2. **Documentación técnica**:
```markdown
# Documentación Técnica - Notion Integration

## Arquitectura
- Frontend: React + TypeScript
- Backend: Express + Supabase
- Autenticación: OAuth 2.0 con PKCE
- Sincronización: Bidireccional con detección de conflictos

## Mantenimiento
- Rotación de claves de encriptación: cada 90 días
- Limpieza de logs: retención de 30 días
- Monitoreo de tokens: alertas 24h antes de expiración
```

## 3. Checklist de Implementación

### Preparación
- [ ] Crear aplicación OAuth en Notion
- [ ] Configurar variables de entorno
- [ ] Generar clave de encriptación
- [ ] Configurar Redis (opcional)

### Base de Datos
- [ ] Ejecutar migración de actualización
- [ ] Verificar políticas RLS
- [ ] Crear índices optimizados
- [ ] Configurar backups

### Backend
- [ ] Actualizar servicio Notion
- [ ] Implementar encriptación
- [ ] Agregar endpoints de sincronización
- [ ] Configurar webhooks
- [ ] Implementar rate limiting

### Frontend
- [ ] Actualizar página NotionCRM
- [ ] Crear componentes de configuración
- [ ] Implementar dashboard de sincronización
- [ ] Agregar resolución de conflictos
- [ ] Optimizar performance

### Testing
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests end-to-end
- [ ] Testing de seguridad
- [ ] Performance testing

### Producción
- [ ] Configurar monitoreo
- [ ] Implementar alertas
- [ ] Documentar procesos
- [ ] Capacitar usuarios
- [ ] Plan de rollback

## 4. Consideraciones de Seguridad

### Tokens OAuth
- Encriptación AES-256 con claves por usuario
- Rotación automática antes de expiración
- Revocación inmediata en caso de compromiso

### Datos Sensibles
- Políticas RLS estrictas en Supabase
- Auditoría completa de accesos
- Encriptación en tránsito y reposo

### Rate Limiting
- Límites por usuario y endpoint
- Protección contra ataques DDoS
- Throttling inteligente

## 5. Métricas de Éxito

### Técnicas
- Tiempo de respuesta SSO < 2 segundos
- Tasa de éxito de sincronización > 99%
- Disponibilidad del servicio > 99.9%

### Negocio
- Adopción de usuarios > 80%
- Reducción de tiempo de gestión CRM > 30%
- Satisfacción de usuario (NPS) > 8/10

### Seguridad
- Cero incidentes de seguridad
- 100% de tokens encriptados
- Auditoría completa de accesos

Este plan de implementación proporciona una hoja de ruta detallada para actualizar el sistema actual de Notion CRM con capacidades avanzadas de SSO automático y sincronización bidireccional, manteniendo los más altos estándares de seguridad y experiencia de usuario.