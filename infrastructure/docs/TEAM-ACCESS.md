# Guía de Acceso para el Equipo de Desarrollo

## 🚀 Acceso Rápido a la EC2 de Cactus

### Prerrequisitos (una sola vez)

#### 1. Generar clave SSH

```bash
# Windows (PowerShell)
ssh-keygen -t ed25519 -C "tu-nombre" -f $HOME\.ssh\cactus-dev

# Mac/Linux
ssh-keygen -t ed25519 -C "tu-nombre" -f ~/.ssh/cactus-dev
```

#### 2. Enviar tu clave pública al admin

```bash
# Windows
Get-Content $HOME\.ssh\cactus-dev.pub

# Mac/Linux
cat ~/.ssh/cactus-dev.pub
```

Envía el output al admin para que lo agregue al servidor.

---

### Conectarse a la EC2

#### Opción A: Usar el script incluido

**Windows (PowerShell):**
```powershell
.\infrastructure\scripts\connect-dev.ps1
```

**Mac/Linux:**
```bash
./infrastructure/scripts/connect-dev.sh
```

#### Opción B: SSH directo

```bash
ssh -i ~/.ssh/cactus-dev ec2-user@56.125.148.180
```

#### Opción C: Configurar SSH config (recomendado)

Agrega esto a tu `~/.ssh/config`:

```
Host cactus-dev
    HostName 56.125.148.180
    User ec2-user
    IdentityFile ~/.ssh/cactus-dev
```

Luego conectate con:
```bash
ssh cactus-dev
```

---

### Comandos útiles una vez conectado

```bash
# Ver estado de los servicios
cd ~/abax/infrastructure/mvp
docker-compose ps

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f api

# Reiniciar un servicio
docker-compose restart api

# Rebuild y restart
docker-compose up -d --build api

# Ver uso de recursos
htop
```

---

### Información del servidor

| Ambiente | IP | User |
|----------|-----|------|
| DEV | `56.125.148.180` | `ec2-user` |

---

### Troubleshooting

#### "Permission denied (publickey)"
Tu clave SSH no está en el servidor. Pide al admin que la agregue.

#### "Connection refused"
1. Verifica que la instancia esté corriendo
2. Verifica el Security Group (puerto 22 debe estar abierto)

#### "Connection timed out"
1. Verifica tu conexión a internet
2. Verifica que la IP sea correcta

---

## 🔐 Para Administradores

### Agregar nuevo desarrollador

1. Recibir la clave pública del desarrollador

2. Conectar a la EC2:
   ```bash
   ssh -i ~/.ssh/cactus-dev ec2-user@56.125.148.180
   ```

3. Agregar la clave:
   ```bash
   echo "CLAVE_PUBLICA_DEL_DESARROLLADOR" >> ~/.ssh/authorized_keys
   ```

### Ver claves autorizadas

```bash
cat ~/.ssh/authorized_keys
```

### Remover acceso

```bash
# Editar y eliminar la línea correspondiente
nano ~/.ssh/authorized_keys
```
