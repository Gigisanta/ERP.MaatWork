#!/bin/bash
# Script para obtener credenciales de RDS desde Secrets Manager
# Ejecuta: chmod +x obtener-credenciales-rds.sh && ./obtener-credenciales-rds.sh

REGION="sa-east-1"
DB_IDENTIFIER="cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92"

echo "=== Buscando credenciales de RDS ==="
echo ""

# 1. Obtener el usuario maestro desde RDS
echo "1. Obteniendo usuario maestro desde RDS..."
MASTER_USER=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --region "$REGION" \
  --query 'DBInstances[0].MasterUsername' \
  --output text 2>/dev/null)

if [ -n "$MASTER_USER" ] && [ "$MASTER_USER" != "None" ]; then
  echo "✓ Usuario maestro: $MASTER_USER"
else
  echo "⚠️  No se pudo obtener el usuario maestro"
  MASTER_USER="maatwork_admin"  # Usuario por defecto según el código
  echo "  Usando usuario por defecto: $MASTER_USER"
fi

echo ""

# 2. Buscar en Secrets Manager
echo "2. Buscando en AWS Secrets Manager..."

# Posibles nombres de secretos
POSSIBLE_SECRETS=(
  "cactus-mvp-dev/db-credentials"
  "cactus-mvp-dev-db-credentials"
  "maatwork/mvp/db-credentials"
  "cactus/mvp/db-credentials"
  "cactus-mvp-dev/database"
)

SECRET_FOUND=false

for SECRET_NAME in "${POSSIBLE_SECRETS[@]}"; do
  echo "  Probando: $SECRET_NAME"
  
  SECRET_VALUE=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$REGION" \
    --query 'SecretString' \
    --output text 2>/dev/null)
  
  if [ $? -eq 0 ] && [ -n "$SECRET_VALUE" ]; then
    echo "  ✓ Secreto encontrado: $SECRET_NAME"
    SECRET_FOUND=true
    
    # Parsear JSON si está disponible
    if command -v jq &> /dev/null; then
      echo ""
      echo "=== Credenciales encontradas ==="
      echo ""
      echo "Usuario: $(echo "$SECRET_VALUE" | jq -r '.username // .user // "N/A"')"
      echo "Password: $(echo "$SECRET_VALUE" | jq -r '.password // "N/A"')"
      echo "Database: $(echo "$SECRET_VALUE" | jq -r '.database // .dbname // "N/A"')"
      echo "Host: $(echo "$SECRET_VALUE" | jq -r '.host // "N/A"')"
      echo "Port: $(echo "$SECRET_VALUE" | jq -r '.port // "N/A"')"
      echo ""
      echo "Connection String:"
      echo "$SECRET_VALUE" | jq -r '.connection_string // "N/A"'
    else
      echo ""
      echo "=== Secreto encontrado (instala 'jq' para ver formato JSON) ==="
      echo "$SECRET_VALUE"
    fi
    
    break
  fi
done

if [ "$SECRET_FOUND" = false ]; then
  echo "  ⚠️  No se encontró el secreto en Secrets Manager"
  echo ""
  echo "3. Listando todos los secretos disponibles..."
  aws secretsmanager list-secrets \
    --region "$REGION" \
    --query 'SecretList[*].Name' \
    --output table | grep -i -E "(cactus|mvp|rds|database|db)"
fi

echo ""
echo "=== Información de RDS ==="
echo "Endpoint: cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92.c5oaie0qy73q.sa-east-1.rds.amazonaws.com"
echo "Puerto: 5432"
echo "Usuario maestro: $MASTER_USER"
echo ""

if [ "$SECRET_FOUND" = false ]; then
  echo "=== Opciones ==="
  echo ""
  echo "1. Verificar manualmente en AWS Console:"
  echo "   https://console.aws.amazon.com/secretsmanager/home?region=$REGION"
  echo ""
  echo "2. Resetear la contraseña desde AWS Console:"
  echo "   RDS → Databases → $DB_IDENTIFIER → Modify → Change master password"
  echo ""
  echo "3. Usar el usuario maestro y resetear contraseña:"
  echo "   Usuario: $MASTER_USER"
  echo "   aws rds modify-db-instance \\"
  echo "     --db-instance-identifier $DB_IDENTIFIER \\"
  echo "     --master-user-password 'TuNuevaPassword' \\"
  echo "     --apply-immediately \\"
  echo "     --region $REGION"
fi
