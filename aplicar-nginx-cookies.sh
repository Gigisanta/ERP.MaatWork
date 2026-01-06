#!/bin/bash
# Script para aplicar configuración de cookies en Nginx para el web app

echo "=== Aplicando configuración de cookies en Nginx ==="
echo ""

# Verificar que estamos en el servidor correcto
if [ ! -f "/etc/nginx/nginx.conf" ]; then
    echo "❌ Error: Este script debe ejecutarse en el servidor con Nginx"
    exit 1
fi

# Hacer backup de la configuración actual
echo "1. Creando backup de configuración actual..."
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup creado"

# Verificar sintaxis antes de aplicar
echo ""
echo "2. Verificando sintaxis de Nginx..."
if sudo nginx -t; then
    echo "✅ Sintaxis correcta"
else
    echo "❌ Error en sintaxis. Revisar configuración."
    exit 1
fi

# Recargar Nginx
echo ""
echo "3. Recargando Nginx..."
if sudo systemctl reload nginx; then
    echo "✅ Nginx recargado exitosamente"
else
    echo "❌ Error al recargar Nginx"
    exit 1
fi

echo ""
echo "=== Configuración aplicada ==="
echo ""
echo "Verificar que las cookies funcionen:"
echo "1. Limpiar cookies del navegador"
echo "2. Hacer login nuevamente"
echo "3. Verificar que la cookie 'token' se crea"
echo "4. Navegar a /home o /pipeline"
echo "5. Verificar que NO redirige a /login"
echo ""
