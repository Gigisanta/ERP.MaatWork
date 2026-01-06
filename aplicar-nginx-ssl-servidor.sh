#!/bin/bash
# Script para aplicar configuración SSL en nginx
# Ejecuta en el servidor: chmod +x aplicar-nginx-ssl-servidor.sh && ./aplicar-nginx-ssl-servidor.sh

echo "=========================================="
echo "🔧 Aplicar Configuración SSL en Nginx"
echo "=========================================="
echo ""

# Verificar certificados
echo "=== Verificando Certificados ==="
if [ -f "/etc/ssl/cloudflare/origin.crt" ] && [ -f "/etc/ssl/cloudflare/origin.key" ]; then
    echo "✅ Certificado encontrado: /etc/ssl/cloudflare/origin.crt"
    echo "✅ Clave privada encontrada: /etc/ssl/cloudflare/origin.key"
else
    echo "❌ Certificados no encontrados"
    exit 1
fi
echo ""

# Verificar que nginx.conf existe en home
echo "=== Verificando nginx.conf ==="
if [ -f "$HOME/nginx.conf" ]; then
    echo "✅ nginx.conf encontrado en $HOME/nginx.conf"
else
    echo "❌ nginx.conf no encontrado en $HOME/"
    echo "   Sube el archivo primero: scp infrastructure/mvp/nginx.conf ec2-user@56.125.148.180:/home/ec2-user/"
    exit 1
fi
echo ""

# Hacer backup
echo "=== Haciendo Backup ==="
BACKUP_FILE="/etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp /etc/nginx/nginx.conf "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo "✅ Backup creado: $BACKUP_FILE"
else
    echo "❌ Error al crear backup"
    exit 1
fi
echo ""

# Copiar nueva configuración
echo "=== Aplicando Nueva Configuración ==="
sudo cp "$HOME/nginx.conf" /etc/nginx/nginx.conf
if [ $? -eq 0 ]; then
    echo "✅ Configuración copiada"
else
    echo "❌ Error al copiar configuración"
    exit 1
fi
echo ""

# Verificar sintaxis
echo "=== Verificando Sintaxis de Nginx ==="
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "✅ Configuración válida"
else
    echo "❌ Error en configuración:"
    sudo nginx -t 2>&1 | grep -i error
    echo ""
    echo "Restaurando backup..."
    sudo cp "$BACKUP_FILE" /etc/nginx/nginx.conf
    exit 1
fi
echo ""

# Recargar nginx
echo "=== Recargando Nginx ==="
if sudo systemctl reload nginx 2>/dev/null; then
    echo "✅ Nginx recargado exitosamente"
else
    echo "⚠️  Reload falló, intentando restart..."
    sudo systemctl restart nginx
    if [ $? -eq 0 ]; then
        echo "✅ Nginx reiniciado exitosamente"
    else
        echo "❌ Error al reiniciar nginx"
        exit 1
    fi
fi
echo ""

# Verificar estado
echo "=== Verificando Estado ==="
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx está corriendo"
else
    echo "❌ Nginx NO está corriendo"
    exit 1
fi
echo ""

# Verificar puerto 443
echo "=== Verificando Puerto 443 ==="
PORT_443=$(sudo ss -tulpn | grep :443)
if [ -n "$PORT_443" ]; then
    echo "✅ Puerto 443 está escuchando:"
    echo "$PORT_443"
else
    echo "⚠️  Puerto 443 NO está escuchando"
    echo "   Verifica logs: sudo tail -50 /var/log/nginx/error.log"
fi
echo ""

echo "=========================================="
echo "✅ Configuración Aplicada"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Probar desde tu PC:"
echo "   Invoke-WebRequest -Uri 'https://maat.work/health' -Method Head"
echo ""
echo "2. Verificar logs si hay problemas:"
echo "   sudo tail -f /var/log/nginx/error.log"
echo ""
