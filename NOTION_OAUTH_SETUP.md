# Configuración OAuth de Notion

Esta guía te ayudará a configurar la integración OAuth con Notion para el sistema CRM.

## Paso 1: Crear una Integración en Notion

1. Ve a [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Haz clic en "+ New integration"
3. Completa los campos:
   - **Name**: CactusDashboard CRM
   - **Logo**: (opcional) Sube un logo para tu aplicación
   - **Associated workspace**: Selecciona el workspace donde quieres usar el CRM

## Paso 2: Configurar Capacidades

En la sección "Capabilities", asegúrate de habilitar:
- ✅ **Read content**
- ✅ **Update content** 
- ✅ **Insert content**
- ✅ **Read user information** (para OAuth)

## Paso 3: Configurar OAuth

1. En la sección "OAuth Domain & URIs":
   - **Redirect URIs**: Agrega `http://localhost:5173/notion-crm/callback`
   - Para producción, también agrega tu dominio: `https://tudominio.com/notion-crm/callback`

2. En "Distribution":
   - Selecciona **Public** si quieres que otros usuarios puedan usar tu integración
   - O **Private** si solo la usarás tú

## Paso 4: Obtener Credenciales

Después de crear la integración:

1. **Client ID**: Lo encontrarás en la sección "Basic Information"
2. **Client Secret**: Haz clic en "Show" en la sección "OAuth Domain & URIs"

## Paso 5: Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y actualiza las siguientes variables:

```env
# Notion OAuth Configuration
NOTION_CLIENT_ID=tu_client_id_aqui
NOTION_CLIENT_SECRET=tu_client_secret_aqui
NOTION_REDIRECT_URI=http://localhost:5173/notion-crm/callback
VITE_NOTION_REDIRECT_URI=http://localhost:5173/notion-crm/callback
```

## Paso 6: Verificar la Configuración

1. Reinicia el servidor de desarrollo
2. Ve a la página NotionCRM en tu aplicación
3. Haz clic en "Conectar con Notion"
4. Deberías ser redirigido a Notion para autorizar la aplicación

## Solución de Problemas

### Error: "Invalid redirect_uri"
- Verifica que la URI de redirección en Notion coincida exactamente con la configurada en tu `.env`
- Asegúrate de no tener espacios extra o caracteres especiales

### Error: "Invalid client_id"
- Verifica que el Client ID esté correctamente copiado desde Notion
- Asegúrate de que no haya espacios al inicio o final

### Error: "Access denied"
- Verifica que la integración tenga los permisos correctos
- Asegúrate de que el workspace esté correctamente asociado

## Seguridad

⚠️ **Importante**: 
- Nunca compartas tu `NOTION_CLIENT_SECRET`
- No subas el archivo `.env` a repositorios públicos
- Usa variables de entorno diferentes para desarrollo y producción

## Producción

Para desplegar en producción:

1. Actualiza la Redirect URI en Notion con tu dominio de producción
2. Configura las variables de entorno en tu servidor
3. Asegúrate de usar HTTPS en producción

---

¿Necesitas ayuda? Revisa la [documentación oficial de Notion](https://developers.notion.com/docs/authorization) o contacta al equipo de desarrollo.