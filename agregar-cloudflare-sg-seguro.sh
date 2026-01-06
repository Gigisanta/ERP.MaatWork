#!/bin/bash
# Script para agregar solo rangos de Cloudflare al Security Group
# Ejecuta en el servidor: chmod +x agregar-cloudflare-sg-seguro.sh && ./agregar-cloudflare-sg-seguro.sh

SG_ID="sg-0bac7f0374851e03a"
REGION="sa-east-1"
PORT=80

echo "=========================================="
echo "🔒 Agregar Solo Rangos de Cloudflare"
echo "=========================================="
echo "Security Group: $SG_ID"
echo "Puerto: $PORT (HTTP)"
echo "Region: $REGION"
echo ""

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI no está instalado"
    exit 1
fi

# Verificar regla existente
echo "=== Verificando Reglas Existentes ==="
EXISTING_RULE=$(aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`$PORT\` && IpProtocol==\`tcp\`]" \
  --output json 2>/dev/null)

if [ "$EXISTING_RULE" != "[]" ] && [ -n "$EXISTING_RULE" ]; then
    echo "⚠️  Ya existe una regla para puerto $PORT:"
    echo "$EXISTING_RULE" | jq -r '.[] | "   Source: \(.IpRanges[0].CidrIp // "N/A")"'
    echo ""
    read -p "¿Deseas agregar rangos de Cloudflare además de la regla existente? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Operación cancelada"
        exit 0
    fi
fi

# Obtener rangos IPv4 de Cloudflare
echo ""
echo "=== Obteniendo Rangos IPv4 de Cloudflare ==="
CF_IPV4=$(curl -s https://www.cloudflare.com/ips-v4)

if [ -z "$CF_IPV4" ]; then
    echo "❌ No se pudieron obtener rangos de Cloudflare"
    exit 1
fi

echo "✅ Rangos obtenidos:"
echo "$CF_IPV4" | wc -l | xargs echo "   Total de rangos:"
echo ""

# Confirmar antes de agregar
echo "=== Rangos que se agregarán ==="
echo "$CF_IPV4" | head -5
echo "... (y más)"
echo ""
read -p "¿Continuar agregando estos rangos? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Operación cancelada"
    exit 0
fi

# Agregar cada rango
echo ""
echo "=== Agregando Rangos ==="
SUCCESS=0
FAILED=0
ALREADY_EXISTS=0

echo "$CF_IPV4" | while read cidr; do
    if [ -n "$cidr" ]; then
        if aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port $PORT \
            --cidr "$cidr" \
            --region $REGION \
            --description "HTTP from Cloudflare IPv4" 2>/dev/null; then
            echo "✅ $cidr"
            SUCCESS=$((SUCCESS + 1))
        else
            ERROR=$(aws ec2 authorize-security-group-ingress \
                --group-id $SG_ID \
                --protocol tcp \
                --port $PORT \
                --cidr "$cidr" \
                --region $REGION \
                --description "HTTP from Cloudflare IPv4" 2>&1)
            
            if echo "$ERROR" | grep -q "already exists"; then
                echo "⚠️  $cidr (ya existe)"
                ALREADY_EXISTS=$((ALREADY_EXISTS + 1))
            else
                echo "❌ $cidr (error)"
                FAILED=$((FAILED + 1))
            fi
        fi
    fi
done

echo ""
echo "=========================================="
echo "📊 Resumen"
echo "=========================================="
echo "✅ Agregados: $SUCCESS"
echo "⚠️  Ya existían: $ALREADY_EXISTS"
echo "❌ Fallidos: $FAILED"
echo ""
echo "✅ Security Group configurado solo para Cloudflare"
echo ""
echo "Próximo paso: Probar desde tu PC:"
echo "  Invoke-WebRequest -Uri 'http://56.125.148.180/health' -Method Head"
