# Limpieza de puertos y procesos para un arranque limpio de desarrollo
# Puertos objetivo: 3000 (Web), 3001 (API), 3002 (Analytics)

Write-Host "Limpieza de entorno de desarrollo (puertos y procesos)" -ForegroundColor Cyan

function Kill-Port {
    param(
        [int]$Port
    )
    
    try {
        # Buscar procesos que usan el puerto
        $connections = netstat -ano | Select-String ":$Port"
        
        if ($connections) {
            Write-Host "Matando procesos en puerto $Port..." -ForegroundColor Yellow
            
            # Extraer PIDs únicos
            $pids = @()
            foreach ($line in $connections) {
                if ($line -match '\s+(\d+)$') {
                    $pid = [int]$matches[1]
                    if ($pid -gt 0 -and $pids -notcontains $pid) {
                        $pids += $pid
                    }
                }
            }
            
            # Matar cada proceso
            foreach ($pid in $pids) {
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue | Out-Null
                    Write-Host "  Proceso $pid terminado" -ForegroundColor Green
                } catch {
                    # Proceso ya terminado o sin permisos
                }
            }
        }
    } catch {
        # Ignorar errores
    }
}

# Matar procesos por nombre (adicional a matar por puerto)
Write-Host "Matando procesos Node/Next/TSX comunes..." -ForegroundColor Yellow

try {
    # Matar procesos next
    $nextProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        return $cmdLine -match "next dev"
    }
    
    foreach ($proc in $nextProcs) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue | Out-Null
            Write-Host "  Proceso next (PID: $($proc.Id)) terminado" -ForegroundColor Green
        } catch {
            # Ignorar errores
        }
    }
    
    # Matar procesos tsx watch
    $tsxProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        return $cmdLine -match "tsx watch"
    }
    
    foreach ($proc in $tsxProcs) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue | Out-Null
            Write-Host "  Proceso tsx watch (PID: $($proc.Id)) terminado" -ForegroundColor Green
        } catch {
            # Ignorar errores
        }
    }
    
    # Matar procesos node dist/
    $nodeDistProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        return $cmdLine -match "node dist/"
    }
    
    foreach ($proc in $nodeDistProcs) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue | Out-Null
            Write-Host "  Proceso node dist (PID: $($proc.Id)) terminado" -ForegroundColor Green
        } catch {
            # Ignorar errores
        }
    }
    
    # Matar procesos Python de analytics-service
    $pythonProcs = Get-Process -Name "python*" -ErrorAction SilentlyContinue | Where-Object {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
        return $cmdLine -match "analytics-service"
    }
    
    foreach ($proc in $pythonProcs) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue | Out-Null
            Write-Host "  Proceso analytics-service (PID: $($proc.Id)) terminado" -ForegroundColor Green
        } catch {
            # Ignorar errores
        }
    }
} catch {
    # Ignorar errores generales
}

# Limpiar puertos típicos
Kill-Port -Port 3000
Kill-Port -Port 3001
Kill-Port -Port 3002

Write-Host "Entorno limpio" -ForegroundColor Green
