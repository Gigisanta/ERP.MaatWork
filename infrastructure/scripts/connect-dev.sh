#!/bin/bash
###############################################################################
# Script para conectar a la instancia EC2 de desarrollo de Cactus via SSH
###############################################################################

set -e

EC2_IP="56.125.148.180"
SSH_KEY="$HOME/.ssh/maatwork-dev"
SSH_USER="ec2-user"

echo ""
echo "============================================================"
echo "           MAATWORK - Conectando a EC2 Development            "
echo "============================================================"
echo "  IP:   $EC2_IP"
echo "  User: $SSH_USER"
echo "  Key:  $SSH_KEY"
echo "============================================================"
echo ""

# Verificar que existe la clave SSH
if [ ! -f "$SSH_KEY" ]; then
    echo "ERROR: No se encuentra la clave SSH en $SSH_KEY"
    echo "Genera una con: ssh-keygen -t ed25519 -f $SSH_KEY"
    exit 1
fi

echo "Conectando..."
echo ""

# Conectar via SSH
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_IP"
