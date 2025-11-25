# Limpieza de puertos y procesos para un arranque limpio de desarrollo
# Puertos objetivo: 3000 (Web), 3001 (API), 3002 (Analytics)

Write-Host "Limpieza de entorno de desarrollo (puertos y procesos)" -ForegroundColor Cyan

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDirectory

function Test-PortFree {
    param([int]$Port)
    
    try {
        # Intentar con Get-NetTCPConnection primero
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            return $false
        }
    } catch {
        # Fallback a netstat
        $netstatOutput = netstat -ano | Select-String ":$Port\s+.*LISTENING"
        if ($netstatOutput) {
            return $false
        }
    }
    return $true
}

function Kill-Port {
    param(
        [int]$Port
    )
    
    $maxRetries = 5
    $retryCount = 0
    $portFreed = $false
    
    while ($retryCount -lt $maxRetries -and -not $portFreed) {
        $retryCount++
        $pids = @()
        
        try {
            $useFallback = $false

# AI_DECISION: Incluir todas las conexiones del puerto al recolectar PIDs.
# Justificación: En entornos Windows la propiedad State puede exponerse como enum numérico cuando el script se ejecuta sin sesión interactiva, lo que deja fuera procesos que sí están escuchando.
# Impacto: Asegura que los procesos de Node/Next que mantienen el puerto ocupado se identifiquen y puedan terminarse.
            try {
                $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 }
                if ($connections) {
                    foreach ($conn in $connections) {
                        $pid = $conn.OwningProcess
                        if ($pid -gt 0 -and $pids -notcontains $pid) {
                            $pids += $pid
                        }
                    }
                }
            } catch {
                $useFallback = $true
            }

            if (-not $useFallback -and $pids.Count -eq 0) {
                $useFallback = $true
            }

            if ($useFallback) {
                # Fallback a netstat cuando Get-NetTCPConnection no está disponible o no reporta PIDs
                # Buscar específicamente LISTENING para evitar falsos positivos
                $netstatOutput = netstat -ano | Select-String ":$Port\s+.*LISTENING"
                if (-not $netstatOutput) {
                    # También buscar cualquier conexión al puerto
                    $netstatOutput = netstat -ano | Select-String ":$Port\s+"
                }
                if ($netstatOutput) {
                    foreach ($line in $netstatOutput) {
                        # Buscar PID al final de la línea (último número)
                        if ($line -match '\s+(\d+)\s*$') {
                            $pid = [int]$matches[1]
                            if ($pid -gt 0 -and $pids -notcontains $pid) {
                                $pids += $pid
                            }
                        }
                    }
                }
            }
            
            # Si encontramos procesos, matarlos
            if ($pids.Count -gt 0) {
                if ($retryCount -eq 1) {
                    Write-Host "Matando procesos en puerto $Port..." -ForegroundColor Yellow
                    Write-Host ("  Detectados PIDs: {0}" -f ($pids -join ", ")) -ForegroundColor DarkGray
                }
                
                foreach ($pid in $pids) {
                    try {
                        # Usar taskkill para matar proceso y todos sus hijos (/T = tree)
                        # /F = force, /T = kill child processes
                        $killResult = taskkill /F /T /PID $pid 2>&1
                        
                        # Esperar más tiempo para que el proceso termine completamente
                        Start-Sleep -Milliseconds 1000
                        
                        # Verificar que el proceso realmente terminó
                        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                        if (-not $proc) {
                            if ($retryCount -eq 1) {
                                Write-Host "  Proceso $pid terminado" -ForegroundColor Green
                            }
                        } else {
                            # Si aún existe, intentar con Stop-Process como fallback
                            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue | Out-Null
                            Start-Sleep -Milliseconds 500
                        }
                    } catch {
                        # Proceso ya terminado o sin permisos - continuar
                    }
                }
                
                # Esperar más tiempo para que el puerto se libere completamente
                Start-Sleep -Milliseconds 1500
                
                # Verificar si el puerto está libre ahora
                $portFreed = Test-PortFree -Port $Port
                
                if (-not $portFreed -and $retryCount -lt $maxRetries) {
                    Write-Host "  Reintentando liberar puerto $Port (intento $retryCount/$maxRetries)..." -ForegroundColor DarkYellow
                    Start-Sleep -Milliseconds 1000
                }
            } else {
                # No hay procesos usando el puerto
                $portFreed = Test-PortFree -Port $Port
            }
        } catch {
            # Ignorar errores y continuar
        }
    }
    
    if (-not $portFreed) {
        Write-Host "  ⚠️  Advertencia: No se pudo liberar completamente el puerto $Port después de $maxRetries intentos" -ForegroundColor Yellow
        Write-Host "  Puede que necesites cerrar manualmente los procesos que usan este puerto" -ForegroundColor DarkYellow
        return $false
    }
    
    return $true
}

# Matar procesos por nombre (primero, antes de limpiar puertos)
Write-Host "Matando procesos Node/Next/TSX comunes..." -ForegroundColor Yellow

$processesKilled = 0

try {
    # Obtener todos los procesos node de una vez
    $allNodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
    
    foreach ($proc in $allNodeProcs) {
        try {
            $cmdLine = $null
            try {
                $procInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
                if ($procInfo) {
                    $cmdLine = $procInfo.CommandLine
                }
            } catch {
                # Intentar método alternativo
                try {
                    $procInfo = Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
                    if ($procInfo) {
                        $cmdLine = $procInfo.CommandLine
                    }
                } catch {
                    # Ignorar si no podemos obtener el command line
                }
            }
            
            if ($cmdLine) {
                # Verificar si es un proceso que queremos matar
                $shouldKill = $false
                $processName = ""
                
                if ($cmdLine -match "next dev") {
                    $shouldKill = $true
                    $processName = "next dev"
                } elseif ($cmdLine -match "tsx watch") {
                    $shouldKill = $true
                    $processName = "tsx watch"
                } elseif ($cmdLine -match "node dist/") {
                    $shouldKill = $true
                    $processName = "node dist"
                } elseif ($cmdLine -like "*$projectRoot*") {
# AI_DECISION: Terminar cualquier proceso Node que se esté ejecutando dentro del monorepo.
# Justificación: Algunos procesos de Next/TSX no incluyen argumentos predecibles pero siempre corren desde el directorio del proyecto, lo que impedía liberación de puertos.
# Impacto: Garantiza que el entorno se limpie sin afectar procesos node externos al repo.
                    $shouldKill = $true
                    $processName = "node (monorepo)"
                }
                
                if ($shouldKill) {
                    # Usar taskkill para matar proceso y todos sus hijos
                    try {
                        taskkill /F /T /PID $proc.Id 2>&1 | Out-Null
                        Start-Sleep -Milliseconds 500
                        # Verificar que el proceso terminó
                        $stillRunning = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
                        if (-not $stillRunning) {
                            Write-Host "  Proceso $processName (PID: $($proc.Id)) terminado" -ForegroundColor Green
                            $processesKilled++
                        } else {
                            # Fallback a Stop-Process si taskkill no funcionó
                            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue | Out-Null
                            Start-Sleep -Milliseconds 500
                            $stillRunning = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
                            if (-not $stillRunning) {
                                Write-Host "  Proceso $processName (PID: $($proc.Id)) terminado" -ForegroundColor Green
                                $processesKilled++
                            }
                        }
                    } catch {
                        # Intentar con Stop-Process como fallback
                        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue | Out-Null
                        Start-Sleep -Milliseconds 500
                        $stillRunning = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
                        if (-not $stillRunning) {
                            Write-Host "  Proceso $processName (PID: $($proc.Id)) terminado" -ForegroundColor Green
                            $processesKilled++
                        }
                    }
                }
            }
        } catch {
            # Ignorar errores individuales
        }
    }
    
    # Matar procesos Python de analytics-service
    $pythonProcs = Get-Process -Name "python","python3","py" -ErrorAction SilentlyContinue | Where-Object {
        try {
            $procInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue
            if ($procInfo -and $procInfo.CommandLine -match "analytics-service") {
                return $true
            }
        } catch {
            return $false
        }
        return $false
    }
    
    foreach ($proc in $pythonProcs) {
        try {
            # Usar taskkill para matar proceso y todos sus hijos
            taskkill /F /T /PID $proc.Id 2>&1 | Out-Null
            Start-Sleep -Milliseconds 500
            $stillRunning = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
            if (-not $stillRunning) {
                Write-Host "  Proceso analytics-service (PID: $($proc.Id)) terminado" -ForegroundColor Green
                $processesKilled++
            } else {
                # Fallback a Stop-Process
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue | Out-Null
                Start-Sleep -Milliseconds 500
                $stillRunning = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
                if (-not $stillRunning) {
                    Write-Host "  Proceso analytics-service (PID: $($proc.Id)) terminado" -ForegroundColor Green
                    $processesKilled++
                }
            }
        } catch {
            # Ignorar errores
        }
    }
} catch {
    # Ignorar errores generales
}

# Esperar un poco después de matar procesos para que los recursos se liberen
if ($processesKilled -gt 0) {
    Write-Host "Esperando liberación de recursos..." -ForegroundColor DarkGray
    Start-Sleep -Milliseconds 2000
}

# Limpiar puertos típicos (esto también matará cualquier proceso que quede)
Write-Host ""
Write-Host "Verificando y liberando puertos..." -ForegroundColor Cyan

# AI_DECISION: Separar puertos críticos de opcionales.
# Justificación: El puerto 5678 es usado por N8N (Docker) que debe permanecer ejecutándose independientemente.
# Impacto: Permite que el desarrollo continúe aunque N8N esté corriendo, solo falla si los puertos críticos están ocupados.
$criticalPorts = @(3000, 3001, 3002)  # Puertos críticos para desarrollo (Web, API, Analytics)
$optionalPorts = @(5678)  # Puertos opcionales (N8N Docker service)

# Limpiar todos los puertos (críticos y opcionales)
$allPortsToClean = $criticalPorts + $optionalPorts
$criticalPortsFree = $true
$optionalPortsFree = $true

foreach ($port in $allPortsToClean) {
    $portFree = Kill-Port -Port $port
    if (-not $portFree) {
        if ($criticalPorts -contains $port) {
            $criticalPortsFree = $false
        } else {
            $optionalPortsFree = $false
        }
    }
}

# Espera final para asegurar que todos los puertos estén libres
Start-Sleep -Milliseconds 1000

# Verificación final de puertos
Write-Host ""
Write-Host "Verificación final de puertos..." -ForegroundColor Cyan

# Verificar puertos críticos
$criticalCheckPassed = $true
foreach ($port in $criticalPorts) {
    $isFree = Test-PortFree -Port $port
    if ($isFree) {
        Write-Host "  ✅ Puerto $port está libre" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Puerto $port aún está en uso" -ForegroundColor Red
        $criticalCheckPassed = $false
    }
}

# Verificar puertos opcionales (solo advertencias, no bloquean)
foreach ($port in $optionalPorts) {
    $isFree = Test-PortFree -Port $port
    if ($isFree) {
        Write-Host "  ✅ Puerto $port está libre" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Puerto $port aún está en uso (opcional - N8N Docker)" -ForegroundColor Yellow
    }
}

# Solo fallar si los puertos críticos están ocupados
if ($criticalCheckPassed) {
    Write-Host ""
    Write-Host "✅ Entorno limpio - Puertos críticos están libres" -ForegroundColor Green
    if (-not $optionalPortsFree) {
        Write-Host "   Nota: Algunos puertos opcionales están en uso pero no bloquean el desarrollo" -ForegroundColor DarkGray
    }
    exit 0
} else {
    Write-Host ""
    Write-Host "❌ Algunos puertos críticos aún están en uso" -ForegroundColor Red
    Write-Host "   Por favor, cierra manualmente los procesos que usan los puertos 3000, 3001 o 3002" -ForegroundColor Yellow
    Write-Host "   y vuelve a intentar." -ForegroundColor Yellow
    exit 1
}
