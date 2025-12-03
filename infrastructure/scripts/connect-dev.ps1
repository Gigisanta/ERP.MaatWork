<#
.SYNOPSIS
    Conectar a la instancia EC2 de desarrollo de Cactus via SSH

.DESCRIPTION
    Usa SSH tradicional para conectarse a la EC2.

.EXAMPLE
    .\connect-dev.ps1
#>

$ErrorActionPreference = "Stop"

$EC2_IP = "56.125.148.180"
$SSH_KEY = "$HOME\.ssh\cactus-dev"
$SSH_USER = "ec2-user"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "           CACTUS - Conectando a EC2 Development            " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  IP:   $EC2_IP" -ForegroundColor Cyan
Write-Host "  User: $SSH_USER" -ForegroundColor Cyan
Write-Host "  Key:  $SSH_KEY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe la clave SSH
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "ERROR: No se encuentra la clave SSH en $SSH_KEY" -ForegroundColor Red
    Write-Host "Genera una con: ssh-keygen -t ed25519 -f $SSH_KEY" -ForegroundColor Yellow
    exit 1
}

Write-Host "Conectando..." -ForegroundColor Green
Write-Host ""

# Conectar via SSH
ssh -i $SSH_KEY "$SSH_USER@$EC2_IP"
