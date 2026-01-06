#!/bin/bash
# Script para diagnosticar por qué nginx no escucha en puerto 443
# Ejecuta en el servidor: chmod +x diagnosticar-nginx-443.sh && ./diagnosticar-nginx-443.sh

echo "=========================================="
echo "🔍 Diagnosticar Puerto 443 en Nginx"
echo "=========================================="
echo ""

echo "=== 1. Verificar Configuración de Nginx ==="
echo "Buscando bloques 'listen 443' en nginx.conf:"
sudo grep -n "listen.*443" /etc/nginx/nginx.conf
echo ""

echo "=== 2. Verificar Certificados SSL ==="
if [ -f "/etc/ssl/cloudflare/origin.crt" ]; then
    echo "✅ Certificado existe: /etc/ssl/cloudflare/origin.crt"
    sudo ls -la /etc/ssl/cloudflare/origin.crt
else
    echo "❌ Certificado NO existe"
fi
echo ""

if [ -f "/etc/ssl/cloudflare/origin.key" ]; then
    echo "✅ Clave privada existe: /etc/ssl/cloudflare/origin.key"
    sudo ls -la /etc/ssl/cloudflare/origin.key
else
    echo "❌ Clave privada NO existe"
fi
echo ""

echo "=== 3. Verificar Permisos de Certificados ==="
echo "Nginx necesita leer los certificados. Verificando permisos:"
sudo -u nginx test -r /etc/ssl/cloudflare/origin.crt && echo "✅ Nginx puede leer certificado" || echo "❌ Nginx NO puede leer certificado"
sudo -u nginx test -r /etc/ssl/cloudflare/origin.key && echo "✅ Nginx puede leer clave privada" || echo "❌ Nginx NO puede leer clave privada"
echo ""

echo "=== 4. Verificar Sintaxis Completa ==="
sudo nginx -t 2>&1
echo ""

echo "=== 5. Verificar Procesos de Nginx ==="
ps aux | grep nginx | grep -v grep
echo ""

echo "=== 6. Verificar Puertos Escuchando ==="
echo "Puerto 80:"
sudo ss -tulpn | grep :80
echo ""
echo "Puerto 443:"
sudo ss -tulpn | grep :443
echo ""

echo "=== 7. Verificar Últimos Errores ==="
echo "Últimas 20 líneas del error log:"
sudo tail -20 /var/log/nginx/error.log
echo ""

echo "=== 8. Verificar Configuración SSL ==="
echo "Buscando configuración SSL:"
sudo grep -A 5 "ssl_certificate" /etc/nginx/nginx.conf | head -10
echo ""

echo "=========================================="
echo "📋 Resumen"
echo "=========================================="
echo ""
echo "Si el puerto 443 no está escuchando, posibles causas:"
echo "1. Permisos de certificados (nginx no puede leerlos)"
echo "2. Error en configuración SSL (verificar con nginx -t)"
echo "3. Nginx necesita reinicio completo (no solo reload)"
echo ""
echo "Solución rápida:"
echo "  sudo chmod 644 /etc/ssl/cloudflare/origin.crt"
echo "  sudo chmod 600 /etc/ssl/cloudflare/origin.key"
echo "  sudo chown nginx:nginx /etc/ssl/cloudflare/origin.*"
echo "  sudo systemctl restart nginx"
echo ""
