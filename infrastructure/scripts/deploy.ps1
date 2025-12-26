<#
.SYNOPSIS
    Script de deployment para Cactus Infrastructure

.DESCRIPTION
    Despliega la infraestructura de Cactus en AWS usando CDK.
    Soporta dos modos (mvp/advanced) y dos ambientes (dev/prod).

.PARAMETER Environment
    Ambiente de deployment: dev o prod

.PARAMETER Mode
    Modo de deployment: mvp o advanced

.PARAMETER Action
    Acción a ejecutar: deploy, diff, destroy, synth

.PARAMETER Profile
    Perfil de AWS a usar (opcional)

.EXAMPLE
    .\deploy.ps1 -Environment dev -Mode mvp
    
.EXAMPLE
    .\deploy.ps1 -Environment prod -Mode advanced -Action diff
    
.EXAMPLE
    .\deploy.ps1 -Environment dev -Mode mvp -Action destroy
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("mvp", "advanced")]
    [string]$Mode = "mvp",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("deploy", "diff", "destroy", "synth")]
    [string]$Action = "deploy",
    
    [Parameter(Mandatory=$false)]
    [string]$Profile = ""
)

$ErrorActionPreference = "Stop"

# Colores para output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Banner
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              MAATWORK INFRASTRUCTURE DEPLOYMENT              ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Mode:        $($Mode.ToUpper().PadRight(44))║" -ForegroundColor Cyan
Write-Host "║  Environment: $($Environment.ToUpper().PadRight(44))║" -ForegroundColor Cyan
Write-Host "║  Action:      $($Action.ToUpper().PadRight(44))║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
$cdkDir = Join-Path $PSScriptRoot "..\cdk"
if (-not (Test-Path (Join-Path $cdkDir "package.json"))) {
    Write-Host "ERROR: No se encuentra package.json en $cdkDir" -ForegroundColor Red
    Write-Host "Ejecuta este script desde la raiz del proyecto o desde infrastructure/scripts" -ForegroundColor Yellow
    exit 1
}

# Cambiar al directorio de CDK
Push-Location $cdkDir

try {
    # Verificar dependencias
    Write-Host "Verificando dependencias..." -ForegroundColor Yellow
    
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: pnpm no esta instalado" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: AWS CLI no esta instalado" -ForegroundColor Red
        exit 1
    }
    
    # Instalar dependencias si es necesario
    if (-not (Test-Path "node_modules")) {
        Write-Host "Instalando dependencias..." -ForegroundColor Yellow
        pnpm install
    }
    
    # Configurar perfil de AWS si se especificó
    if ($Profile) {
        $env:AWS_PROFILE = $Profile
        Write-Host "Usando perfil AWS: $Profile" -ForegroundColor Yellow
    }
    
    # Construir comando CDK
    $cdkArgs = @(
        "--context", "mode=$Mode",
        "--context", "env=$Environment"
    )
    
    # Confirmación para producción
    if ($Environment -eq "prod" -and $Action -eq "deploy") {
        Write-Host ""
        Write-Host "⚠️  ADVERTENCIA: Estas a punto de desplegar en PRODUCCION" -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Escribe 'DEPLOY PROD' para confirmar"
        if ($confirm -ne "DEPLOY PROD") {
            Write-Host "Deployment cancelado" -ForegroundColor Red
            exit 1
        }
    }
    
    if ($Environment -eq "prod" -and $Action -eq "destroy") {
        Write-Host ""
        Write-Host "🚨 PELIGRO: Estas a punto de DESTRUIR la infraestructura de PRODUCCION" -ForegroundColor Red
        Write-Host ""
        $confirm = Read-Host "Escribe 'DESTROY PROD' para confirmar"
        if ($confirm -ne "DESTROY PROD") {
            Write-Host "Destroy cancelado" -ForegroundColor Red
            exit 1
        }
    }
    
    # Ejecutar CDK
    Write-Host ""
    Write-Host "Ejecutando: cdk $Action $($cdkArgs -join ' ')" -ForegroundColor Cyan
    Write-Host ""
    
    switch ($Action) {
        "deploy" {
            npx cdk deploy --all @cdkArgs --require-approval never
        }
        "diff" {
            npx cdk diff @cdkArgs
        }
        "destroy" {
            npx cdk destroy --all @cdkArgs --force
        }
        "synth" {
            npx cdk synth @cdkArgs
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ $Action completado exitosamente!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ $Action fallo con codigo $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
} finally {
    Pop-Location
}







