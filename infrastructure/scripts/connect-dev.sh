#!/bin/bash
###############################################################################
# Script para conectar a la instancia EC2 de desarrollo de Cactus
# Usa AWS Session Manager para conexión segura sin SSH keys
###############################################################################

set -e

INSTANCE_ID="i-01fcf7ea379b96978"
REGION="sa-east-1"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           CACTUS - Conectando a EC2 Development            ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Instance: $INSTANCE_ID                        ║"
echo "║  Region:   $REGION                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar AWS CLI
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI no está instalado"
    echo "Mac: brew install awscli"
    echo "Linux: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Verificar Session Manager Plugin
if ! command -v session-manager-plugin &> /dev/null; then
    echo "ERROR: Session Manager Plugin no está instalado"
    echo "Mac: brew install --cask session-manager-plugin"
    echo "Linux: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
    exit 1
fi

# Verificar credenciales
echo "Verificando credenciales AWS..."
if ! aws sts get-caller-identity --region $REGION &> /dev/null; then
    echo "ERROR: Credenciales AWS no configuradas"
    echo "Ejecuta: aws configure"
    exit 1
fi
echo "✅ Credenciales OK"

echo ""
echo "Conectando... (usa 'exit' para salir)"
echo ""

# Conectar
aws ssm start-session --target $INSTANCE_ID --region $REGION

