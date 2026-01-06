#!/bin/bash
# Script para testear conectividad externa y verificar si Cloudflare puede alcanzar el servidor
# Ejecuta en el servidor: chmod +x testear-conectividad-externa.sh && ./testear-conectividad-externa.sh

echo "=========================================="
echo "🔍 TEST: Conectividad Externa Nginx ↔ Cloudflare"
echo "=========================================="
echo ""

# Obtener IP pública
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
if [ -z "$PUBLIC_IP" ]; then
    echo "❌ No se pudo obtener IP pública"
    exit 1
fi

echo "IP Pública del Servidor: $PUBLIC_IP"
echo ""

# ==========================================================
# TEST 1: Nginx responde localmente
# ==========================================================
echo "=== TEST 1: Nginx Local ==="
LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null)
if [ "$LOCAL_RESPONSE" = "200" ]; then
    echo "✅ Nginx responde localmente (HTTP $LOCAL_RESPONSE)"
else
    echo "❌ Nginx NO responde localmente (HTTP $LOCAL_RESPONSE)"
    echo "   Este es el problema principal. Nginx no está funcionando."
    exit 1
fi
echo ""

# ==========================================================
# TEST 2: Nginx escucha en todas las interfaces (0.0.0.0)
# ==========================================================
echo "=== TEST 2: Nginx Escucha en IP Pública ==="
LISTEN_CONFIG=$(sudo grep -E "^\s*listen\s+.*:80" /etc/nginx/nginx.conf 2>/dev/null | head -1)
if echo "$LISTEN_CONFIG" | grep -q "0.0.0.0:80\|default_server\|listen 80"; then
    echo "✅ Nginx está configurado para escuchar en todas las interfaces"
    echo "   Configuración: $LISTEN_CONFIG"
else
    echo "⚠️  Verificar configuración de listen en nginx.conf"
    echo "   Debe ser: listen 80; o listen 0.0.0.0:80;"
    echo "   Actual: $LISTEN_CONFIG"
fi
echo ""

# Verificar qué está escuchando
echo "=== Puerto 80 Escuchando ==="
PORT_LISTEN=$(sudo ss -tulpn | grep :80)
if [ -n "$PORT_LISTEN" ]; then
    echo "✅ Puerto 80 está escuchando:"
    echo "$PORT_LISTEN"
    # Verificar si escucha en 0.0.0.0
    if echo "$PORT_LISTEN" | grep -q "0.0.0.0:80"; then
        echo "✅ Escucha en 0.0.0.0:80 (todas las interfaces)"
    else
        echo "⚠️  Verificar en qué IP está escuchando"
    fi
else
    echo "❌ Puerto 80 NO está escuchando"
fi
echo ""

# ==========================================================
# TEST 3: Firewall del Sistema
# ==========================================================
echo "=== TEST 3: Firewall del Sistema ==="
if command -v firewall-cmd &> /dev/null; then
    if sudo systemctl is-active --quiet firewalld; then
        echo "⚠️  Firewalld está activo"
        HTTP_ALLOWED=$(sudo firewall-cmd --list-services 2>/dev/null | grep -q http && echo "sí" || echo "no")
        if [ "$HTTP_ALLOWED" = "sí" ]; then
            echo "✅ HTTP está permitido en firewall"
        else
            echo "❌ HTTP NO está permitido en firewall"
            echo "   Solución: sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload"
        fi
    else
        echo "✅ Firewalld no está activo"
    fi
else
    # Verificar iptables
    if command -v iptables &> /dev/null; then
        IPTABLES_RULES=$(sudo iptables -L INPUT -n | grep -E "80|http" | head -3)
        if [ -n "$IPTABLES_RULES" ]; then
            echo "⚠️  iptables tiene reglas. Verificar que permita puerto 80:"
            echo "$IPTABLES_RULES"
        else
            echo "✅ No hay reglas de iptables bloqueando (o está en modo ACCEPT)"
        fi
    else
        echo "✅ No se detectó firewall configurado"
    fi
fi
echo ""

# ==========================================================
# TEST 4: Security Group (AWS)
# ==========================================================
echo "=== TEST 4: Security Group AWS ==="
if command -v aws &> /dev/null; then
    INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)
    if [ -n "$INSTANCE_ID" ]; then
        echo "Instance ID: $INSTANCE_ID"
        
        # Obtener Security Groups
        SG_IDS=$(aws ec2 describe-instances \
            --instance-ids "$INSTANCE_ID" \
            --region sa-east-1 \
            --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' \
            --output text 2>/dev/null)
        
        if [ -n "$SG_IDS" ]; then
            echo "Security Groups: $SG_IDS"
            echo ""
            
            for SG_ID in $SG_IDS; do
                echo "Verificando Security Group: $SG_ID"
                
                # Verificar regla HTTP (puerto 80)
                HTTP_RULE=$(aws ec2 describe-security-groups \
                    --group-ids "$SG_ID" \
                    --region sa-east-1 \
                    --query 'SecurityGroups[0].IpPermissions[?FromPort==`80` && IpProtocol==`tcp`]' \
                    --output json 2>/dev/null)
                
                if [ "$HTTP_RULE" != "[]" ] && [ -n "$HTTP_RULE" ]; then
                    echo "✅ Security Group $SG_ID permite HTTP (puerto 80)"
                    echo "$HTTP_RULE" | jq -r '.[] | "   Desde: \(.IpRanges[0].CidrIp // "N/A")"'
                else
                    echo "❌ Security Group $SG_ID NO permite HTTP (puerto 80)"
                    echo "   Solución: Agregar regla HTTP desde 0.0.0.0/0 o rangos Cloudflare"
                fi
            done
        else
            echo "⚠️  No se pudieron obtener Security Groups"
        fi
    else
        echo "⚠️  No se pudo obtener Instance ID"
    fi
else
    echo "⚠️  AWS CLI no está instalado"
    echo "   Verificar Security Group manualmente en AWS Console:"
    echo "   EC2 → Instances → Security → Inbound rules"
    echo "   Debe permitir: HTTP (80) desde 0.0.0.0/0 o rangos Cloudflare"
fi
echo ""

# ==========================================================
# TEST 5: Test de Conectividad Externa (desde el servidor)
# ==========================================================
echo "=== TEST 5: Test de Conectividad Externa ==="
echo "⚠️  Este test requiere acceso desde fuera del servidor"
echo ""
echo "Desde tu máquina local, ejecuta:"
echo ""
echo "  # Test básico"
echo "  curl -I http://$PUBLIC_IP/health"
echo ""
echo "  # Test con timeout (si no responde, Security Group o firewall bloquea)"
echo "  curl -I --max-time 5 http://$PUBLIC_IP/health"
echo ""
echo "  # Test desde Cloudflare (simular)"
echo "  curl -I -H 'CF-Connecting-IP: 1.2.3.4' http://$PUBLIC_IP/health"
echo ""

# Intentar test desde el servidor mismo usando la IP pública
echo "Intentando test desde el servidor usando IP pública..."
EXTERNAL_TEST=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://$PUBLIC_IP/health 2>/dev/null)
if [ "$EXTERNAL_TEST" = "200" ]; then
    echo "✅ El servidor puede conectarse a sí mismo por IP pública (HTTP $EXTERNAL_TEST)"
    echo "   Esto indica que nginx está accesible externamente"
else
    echo "⚠️  No se pudo conectar desde el servidor a su propia IP pública"
    echo "   Esto puede ser normal (algunos servidores bloquean loopback)"
    echo "   Debes probar desde fuera del servidor"
fi
echo ""

# ==========================================================
# TEST 6: Verificar Cloudflare SSL Mode
# ==========================================================
echo "=== TEST 6: Verificar Cloudflare SSL Mode ==="
echo "⚠️  Este test requiere acceso a Cloudflare Dashboard"
echo ""
echo "1. Ve a Cloudflare Dashboard → Tu dominio"
echo "2. SSL/TLS → Overview"
echo "3. Verifica el modo SSL:"
echo ""
echo "   ✅ 'Full' o 'Full (Strict)' → Correcto"
echo "   ❌ 'Flexible' → INCORRECTO (causa error 521)"
echo ""
echo "   Si está en 'Flexible':"
echo "   - Cloudflare intenta HTTPS → tu servidor"
echo "   - Tu servidor solo tiene HTTP"
echo "   - Cloudflare no puede validar SSL → Error 521"
echo ""

# ==========================================================
# TEST 7: Verificar DNS en Cloudflare
# ==========================================================
echo "=== TEST 7: Verificar DNS en Cloudflare ==="
echo "1. Cloudflare Dashboard → DNS → Records"
echo "2. Verifica que el registro A apunte a: $PUBLIC_IP"
echo "3. Verifica que esté 'Proxied' (nube naranja activada)"
echo ""

# ==========================================================
# RESUMEN Y DIAGNÓSTICO
# ==========================================================
echo "=========================================="
echo "📋 RESUMEN Y DIAGNÓSTICO"
echo "=========================================="
echo ""

# Contar problemas
PROBLEMAS=0

if [ "$LOCAL_RESPONSE" != "200" ]; then
    echo "❌ PROBLEMA 1: Nginx no responde localmente"
    PROBLEMAS=$((PROBLEMAS + 1))
fi

if [ -z "$PORT_LISTEN" ]; then
    echo "❌ PROBLEMA 2: Puerto 80 no está escuchando"
    PROBLEMAS=$((PROBLEMAS + 1))
fi

if [ "$EXTERNAL_TEST" != "200" ] && [ -n "$EXTERNAL_TEST" ]; then
    echo "⚠️  POSIBLE PROBLEMA: No se puede conectar desde fuera"
    echo "   (Debes probar desde tu máquina local para confirmar)"
fi

echo ""
if [ $PROBLEMAS -eq 0 ]; then
    echo "✅ Nginx está funcionando correctamente en el servidor"
    echo ""
    echo "Si aún tienes error 521, el problema está en:"
    echo "  1. Security Group no permite tráfico en puerto 80"
    echo "  2. Cloudflare SSL Mode está en 'Flexible' (debe ser 'Full')"
    echo "  3. DNS en Cloudflare no apunta a la IP correcta"
    echo "  4. Firewall del sistema bloquea puerto 80"
    echo ""
    echo "Próximo paso: Probar desde tu máquina local:"
    echo "  curl -I http://$PUBLIC_IP/health"
else
    echo "❌ Hay $PROBLEMAS problema(s) con nginx en el servidor"
    echo "   Corrige estos problemas primero"
fi
echo ""
