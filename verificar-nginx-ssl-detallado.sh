#!/bin/bash
# Script para verificar por qué nginx no escucha en 443
# Ejecuta en el servidor: chmod +x verificar-nginx-ssl-detallado.sh && ./verificar-nginx-ssl-detallado.sh

echo "=========================================="
echo "🔍 Verificación Detallada: Nginx SSL"
echo "=========================================="
echo ""

echo "=== 1. Verificar Módulo SSL ==="
nginx -V 2>&1 | grep -o with-http_ssl_module && echo "✅ Módulo SSL habilitado" || echo "❌ Módulo SSL NO habilitado"
echo ""

echo "=== 2. Verificar Configuración SSL en nginx.conf ==="
echo "Buscando ssl_certificate:"
sudo grep -n "ssl_certificate" /etc/nginx/nginx.conf
echo ""

echo "Buscando listen 443:"
sudo grep -n "listen.*443" /etc/nginx/nginx.conf
echo ""

echo "=== 3. Verificar Estructura de Bloques Server ==="
echo "Bloques server encontrados:"
sudo grep -n "^[[:space:]]*server[[:space:]]*{" /etc/nginx/nginx.conf
echo ""

echo "=== 4. Verificar Certificados ==="
if [ -f "/etc/ssl/cloudflare/origin.crt" ]; then
    echo "✅ Certificado existe"
    sudo openssl x509 -in /etc/ssl/cloudflare/origin.crt -text -noout 2>/dev/null | head -5 || echo "⚠️  Error al leer certificado"
else
    echo "❌ Certificado NO existe"
fi
echo ""

if [ -f "/etc/ssl/cloudflare/origin.key" ]; then
    echo "✅ Clave privada existe"
    sudo openssl rsa -in /etc/ssl/cloudflare/origin.key -check -noout 2>/dev/null && echo "✅ Clave privada válida" || echo "⚠️  Error al leer clave privada"
else
    echo "❌ Clave privada NO existe"
fi
echo ""

echo "=== 5. Verificar Sintaxis Completa ==="
sudo nginx -t 2>&1
echo ""

echo "=== 6. Verificar Estado de Nginx ==="
sudo systemctl status nginx --no-pager | head -15
echo ""

echo "=== 7. Verificar Procesos de Nginx ==="
ps aux | grep nginx | grep -v grep
echo ""

echo "=== 8. Verificar Puertos ==="
echo "Puerto 80:"
sudo ss -tulpn | grep :80
echo ""
echo "Puerto 443:"
sudo ss -tulpn | grep :443 || echo "❌ Puerto 443 NO está escuchando"
echo ""

echo "=== 9. Verificar Últimos Errores (con más detalle) ==="
sudo journalctl -u nginx -n 50 --no-pager | grep -i error
echo ""

echo "=== 10. Probar Iniciar Nginx Manualmente ==="
echo "Deteniendo nginx..."
sudo systemctl stop nginx
sleep 2

echo "Iniciando nginx en modo debug..."
sudo nginx -t -c /etc/nginx/nginx.conf 2>&1
echo ""

echo "Intentando iniciar nginx manualmente para ver errores:"
sudo nginx -c /etc/nginx/nginx.conf 2>&1 &
sleep 2

echo "Verificando puerto 443 después de inicio manual:"
sudo ss -tulpn | grep :443 || echo "❌ Aún no escucha en 443"

echo "Deteniendo nginx manual..."
sudo pkill nginx
sleep 1

echo "Iniciando nginx normalmente..."
sudo systemctl start nginx
echo ""

echo "=========================================="
echo "📋 Resumen"
echo "=========================================="
echo ""
echo "Si el puerto 443 aún no escucha después de todo esto:"
echo "1. Verifica que el bloque 'server' con 'listen 443' está dentro de 'http'"
echo "2. Verifica que no hay conflictos con otros bloques server"
echo "3. Verifica que los certificados son válidos"
echo ""
