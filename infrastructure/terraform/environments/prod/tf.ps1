# =============================================================================
# Terraform Wrapper Script for PowerShell
# =============================================================================
# Usage:
#   .\tf.ps1 init
#   .\tf.ps1 plan
#   .\tf.ps1 apply
#   .\tf.ps1 import 'resource.address' 'resource-id'
# =============================================================================

# Load .env file if it exists
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Write-Host "Loading environment from .env..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Add Terraform to PATH if installed via winget
$terraformPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Hashicorp.Terraform_Microsoft.Winget.Source_8wekyb3d8bbwe"
if (Test-Path $terraformPath) {
    $env:Path = "$terraformPath;$env:Path"
}

# Run terraform with all arguments passed to this script
& terraform $args



