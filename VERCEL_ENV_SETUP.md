# Variables de Entorno para Vercel - CRM Cactus Dashboard

## Variables Requeridas para Producción

Configura las siguientes variables de entorno en el panel de Vercel:

### 1. Configuración de Supabase
```
VITE_SUPABASE_URL=https://pphrkrtjxwjvxokcwhjz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8
```

### 2. Configuración de Entorno
```
NODE_ENV=production
```

## Instrucciones de Configuración

1. **Accede al Panel de Vercel:**
   - Ve a tu proyecto en vercel.com
   - Navega a Settings > Environment Variables

2. **Agrega cada variable:**
   - Nombre: `VITE_SUPABASE_URL`
   - Valor: `https://pphrkrtjxwjvxokcwhjz.supabase.co`
   - Entornos: Production, Preview, Development

   - Nombre: `VITE_SUPABASE_ANON_KEY`
   - Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8`
   - Entornos: Production, Preview, Development

   - Nombre: `NODE_ENV`
   - Valor: `production`
   - Entornos: Production

3. **Redeploy el proyecto** después de configurar las variables

## Verificación

Después del despliegue, verifica que:
- ✅ La autenticación funciona correctamente
- ✅ Los contactos se cargan desde Supabase
- ✅ Las métricas en tiempo real se actualizan
- ✅ El sistema de etiquetas persiste
- ✅ Las notas se guardan correctamente

## Notas de Seguridad

- Las claves ANON de Supabase son seguras para uso público
- RLS (Row Level Security) está habilitado en todas las tablas
- Los headers de seguridad están configurados en vercel.json
- Todas las validaciones de datos están implementadas

## Troubleshooting

Si encuentras problemas:
1. Verifica que todas las variables estén configuradas
2. Revisa los logs de Vercel en el panel de funciones
3. Confirma que Supabase esté accesible desde el dominio de producción
4. Verifica que las políticas RLS permitan acceso a usuarios autenticados