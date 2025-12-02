<#
.SYNOPSIS
    Conectar a la instancia EC2 de desarrollo de Cactus

.DESCRIPTION
    Usa AWS Session Manager para conectarse de forma segura sin SSH keys.

.EXAMPLE
    .\connect-dev.ps1
#>

$ErrorActionPreference = "Stop"

$INSTANCE_ID = "i-01fcf7ea379b96978"
$REGION = "sa-east-1"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           CACTUS - Conectando a EC2 Development            ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Instance: $INSTANCE_ID                        ║" -ForegroundColor Cyan
Write-Host "║  Region:   $REGION                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar AWS CLI
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: AWS CLI no esta instalado" -ForegroundColor Red
    Write-Host "Instala con: winget install Amazon.AWSCLI" -ForegroundColor Yellow
    exit 1
}

# Verificar Session Manager Plugin
$pluginPath = "C:\Program Files\Amazon\SessionManagerPlugin\bin\session-manager-plugin.exe"
if (-not (Test-Path $pluginPath)) {
    Write-Host "ERROR: Session Manager Plugin no esta instalado" -ForegroundColor Red
    Write-Host "Descarga de: https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe" -ForegroundColor Yellow
    exit 1
}

# Verificar credenciales
Write-Host "Verificando credenciales AWS..." -ForegroundColor Yellow
try {
    aws sts get-caller-identity --region $REGION | Out-Null
    Write-Host "Credenciales OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Credenciales AWS no configuradas" -ForegroundColor Red
    Write-Host "Ejecuta: aws configure" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Conectando... (usa 'exit' para salir)" -ForegroundColor Green
Write-Host ""

# Conectar
aws ssm start-session --target $INSTANCE_ID --region $REGION

