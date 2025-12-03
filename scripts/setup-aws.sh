#!/bin/bash

# Script para configurar AWS CLI y preparar cuentas para deployment

set -e

echo "🚀 Setup AWS para Cactus CI/CD"
echo "=================================="
echo ""

# Colores para output
GREEN='\033[0.32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para configurar una cuenta AWS
configure_account() {
    local env_name=$1
    local profile_name="cactus-$env_name"
    
    echo -e "${BLUE}📋 Configurando cuenta ${env_name}...${NC}"
    echo ""
    
    # Configurar AWS CLI profile
    aws configure --profile $profile_name
    
    echo ""
    echo "Obteniendo Account ID..."
    ACCOUNT_ID=$(aws sts get-caller-identity --profile $profile_name --query Account --output text)
    echo -e "${GREEN}Account ID ${env_name}: $ACCOUNT_ID${NC}"
    
    echo ""
    echo "Verificando región..."
    REGION=$(aws configure get region --profile $profile_name)
    echo -e "${GREEN}Región: $REGION${NC}"
    
    # Guardar en archivo temporal
    echo "AWS_ACCOUNT_ID_${env_name^^}=$ACCOUNT_ID" >> /tmp/cactus_aws_config.env
    echo "AWS_REGION_${env_name^^}=$REGION" >> /tmp/cactus_aws_config.env
    
    echo ""
}

# Limpiar archivo temporal anterior
rm -f /tmp/cactus_aws_config.env

echo -e "${YELLOW}¿Deseas configurar la cuenta DEV? (y/n):${NC} "
read -r setup_dev

if [ "$setup_dev" = "y" ]; then
    configure_account "dev"
fi

echo ""
echo -e "${YELLOW}¿Deseas configurar la cuenta PROD? (y/n):${NC} "
read -r setup_prod

if [ "$setup_prod" = "y" ]; then
    configure_account "prod"
fi

echo ""
echo -e "${GREEN}✅ Setup completado!${NC}"
echo ""
echo "=================================="
echo -e "${BLUE}📝 Valores para GitHub Secrets${NC}"
echo "=================================="
echo ""

if [ -f /tmp/cactus_aws_config.env ]; then
    cat /tmp/cactus_aws_config.env
    echo ""
fi

echo "Agrega estos secretos a GitHub:"
echo "1. Ve a: Settings > Secrets and variables > Actions"
echo "2. Agrega los siguientes secrets:"
echo ""
echo "Para DEV:"
echo "  - AWS_ACCOUNT_ID_DEV"
echo "  - AWS_ACCESS_KEY_ID_DEV"
echo "  - AWS_SECRET_ACCESS_KEY_DEV"
echo ""
echo "Para PROD:"
echo "  - AWS_ACCOUNT_ID_PROD"
echo "  - AWS_ACCESS_KEY_ID_PROD"
echo "  - AWS_SECRET_ACCESS_KEY_PROD"
echo "  - PROD_API_URL (ejemplo: http://cactus-prod-alb-123456789.us-east-1.elb.amazonaws.com)"
echo ""
echo "=================================="
echo -e "${BLUE}🔧 Próximos pasos${NC}"
echo "=================================="
echo ""
echo "1. Crear IAM users con permisos de deployment:"
echo "   - ECS, ECR, CloudFormation, RDS, VPC, CloudWatch"
echo ""
echo "2. Bootstrap CDK en ambas cuentas:"
echo "   export AWS_PROFILE=cactus-dev"
echo "   cd infrastructure/cdk"
echo "   pnpm cdk bootstrap"
echo ""
echo "   export AWS_PROFILE=cactus-prod"
echo "   pnpm cdk bootstrap"
echo ""
echo "3. Deploy infraestructura inicial:"
echo "   export AWS_PROFILE=cactus-dev"
echo "   pnpm cdk deploy --all --context env=dev"
echo ""
echo "   export AWS_PROFILE=cactus-prod"
echo "   pnpm cdk deploy --all --context env=prod"
echo ""
echo "4. Configurar billing alerts en AWS Console para ambas cuentas"
echo ""

# Limpiar archivo temporal
rm -f /tmp/cactus_aws_config.env
