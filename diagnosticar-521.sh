#!/bin/bash
# Script de diagnóstico para error 521 de Cloudflare
# Ejecuta en el servidor: chmod +x diagnosticar-521.sh && ./diagnosticar-521.sh

echo "=========================================="
echo "🔍 DIAGNÓSTICO: Error 521 Cloudflare"
echo "=========================================="
echo ""

echo "=== 1. Estado de Nginx ==="
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx está corriendo"
    sudo systemctl status nginx --no-pager | head -10
else
    echo "❌ Nginx NO está corriendo"
    echo "   Solución: sudo systemctl start nginx"
fi
echo ""

echo "=== 2. Puerto 80 Escuchando ==="
PORT_80=$(sudo ss -tulpn | grep :80)
if [ -n "$PORT_80" ]; then
    echo "✅ Puerto 80 está escuchando:"
    echo "$PORT_80"
else
    echo "❌ Puerto 80 NO está escuchando"
    echo "   Nginx no está corriendo o no está configurado en puerto 80"
fi
echo ""

echo "=== 3. Test Local de Nginx ==="
LOCAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null)
if [ "$LOCAL_TEST" = "200" ]; then
    echo "✅ Nginx responde localmente (HTTP $LOCAL_TEST)"
else
    echo "❌ Nginx NO responde localmente (HTTP $LOCAL_TEST)"
    echo "   Verificar configuración de nginx"
fi
echo ""

echo "=== 4. Verificación de Sintaxis Nginx ==="
if sudo nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "✅ Configuración de nginx es válida"
else
    echo "❌ Configuración de nginx tiene errores:"
    sudo nginx -t 2>&1 | grep -i error
fi
echo ""

echo "=== 5. Últimos Errores de Nginx ==="
ERRORS=$(sudo tail -10 /var/log/nginx/error.log 2>/dev/null)
if [ -n "$ERRORS" ]; then
    echo "Últimos errores:"
    echo "$ERRORS"
else
    echo "✅ No hay errores recientes en logs"
fi
echo ""

echo "=== 6. Firewall del Sistema ==="
if command -v firewall-cmd &> /dev/null; then
    if sudo systemctl is-active --quiet firewalld; then
        echo "⚠️  Firewalld está activo"
        echo "   Verificar que HTTP esté permitido:"
        sudo firewall-cmd --list-services 2>/dev/null | grep -q http && echo "   ✅ HTTP permitido" || echo "   ❌ HTTP NO permitido"
    else
        echo "✅ Firewalld no está activo (o no está instalado)"
    fi
else
    echo "✅ No hay firewall configurado (o no es firewalld)"
fi
echo ""

echo "=== 7. IP Pública y Conectividad ==="
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
if [ -n "$PUBLIC_IP" ]; then
    echo "IP Pública: $PUBLIC_IP"
    echo "   Probar desde fuera: curl -I http://$PUBLIC_IP/health"
else
    echo "⚠️  No se pudo obtener IP pública"
fi
echo ""

echo "=== 8. Security Group (Requiere AWS CLI) ==="
if command -v aws &> /dev/null; then
    INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)
    if [ -n "$INSTANCE_ID" ]; then
        echo "Instance ID: $INSTANCE_ID"
        echo "   Verificar Security Group en AWS Console:"
        echo "   EC2 → Instances → $INSTANCE_ID → Security → Inbound rules"
        echo "   Debe permitir: HTTP (80) desde 0.0.0.0/0 o rangos Cloudflare"
    fi
else
    echo "⚠️  AWS CLI no está instalado"
    echo "   Verificar Security Group manualmente en AWS Console"
fi
echo ""

echo "=== 9. Resumen y Próximos Pasos ==="
echo ""
if sudo systemctl is-active --quiet nginx && [ -n "$(sudo ss -tulpn | grep :80)" ] && [ "$LOCAL_TEST" = "200" ]; then
    echo "✅ Nginx está funcionando correctamente en el servidor"
    echo ""
    echo "Si aún tienes error 521, verifica:"
    echo "  1. Security Group permite tráfico en puerto 80"
    echo "  2. Cloudflare SSL Mode está en 'Full' o 'Full (Strict)'"
    echo "  3. DNS en Cloudflare apunta a la IP correcta: $PUBLIC_IP"
else
    echo "❌ Hay problemas con nginx en el servidor"
    echo ""
    echo "Soluciones:"
    if ! sudo systemctl is-active --quiet nginx; then
        echo "  - Iniciar nginx: sudo systemctl start nginx"
    fi
    if [ -z "$(sudo ss -tulpn | grep :80)" ]; then
        echo "  - Verificar configuración de nginx (debe escuchar en puerto 80)"
    fi
    if [ "$LOCAL_TEST" != "200" ]; then
        echo "  - Verificar logs: sudo tail -50 /var/log/nginx/error.log"
    fi
fi
echo ""
