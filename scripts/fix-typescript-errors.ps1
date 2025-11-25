# Script para arreglar errores comunes de TypeScript
# Uso: .\scripts\fix-typescript-errors.ps1

$files = @(
    "apps/web/app/contacts/[id]/ContactEditableField.tsx",
    "apps/web/app/contacts/[id]/FinancialSummarySection.tsx",
    "apps/web/app/contacts/[id]/PrioritiesConcernsSection.tsx",
    "apps/web/app/contacts/[id]/TasksSection.tsx",
    "apps/web/app/contacts/[id]/PortfolioSection.tsx",
    "apps/web/app/contacts/[id]/NotesSection.tsx",
    "apps/web/app/contacts/new/page.tsx",
    "apps/web/app/portfolios/page.tsx",
    "apps/web/app/portfolios/[id]/page.tsx",
    "apps/web/app/teams/page.tsx",
    "apps/web/app/teams/[id]/page.tsx",
    "apps/web/app/register/page.tsx",
    "apps/web/app/pipeline/page.tsx",
    "apps/web/app/auth/AuthContext.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot ".." $file
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        
        # Agregar import de toLogContext si no existe
        if ($content -match "import.*logger.*from" -and $content -notmatch "toLogContext") {
            $content = $content -replace "(import\s+\{\s*logger\s*\}\s+from\s+['""][^'""]+['""])", '$1, toLogContext'
        }
        
        # Reemplazar logger.error/warn/info/debug con unknown por toLogContext
        $content = $content -replace "logger\.(error|warn|info|debug)\(([^,]+),\s*\{([^}]+)\}\)", 'logger.$1($2, toLogContext({$3}))'
        
        Set-Content -Path $fullPath -Value $content -NoNewline
        Write-Host "Fixed: $file"
    }
}

Write-Host "Done!"

