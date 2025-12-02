# Guía de Acceso para el Equipo de Desarrollo

## 🚀 Acceso Rápido a la EC2 de Cactus

### Prerrequisitos (una sola vez)

#### 1. Instalar AWS CLI

**Windows:**
```powershell
winget install Amazon.AWSCLI
```

**Mac:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

#### 2. Instalar Session Manager Plugin

**Windows:**
Descargar e instalar: https://s3.amazonaws.com/session-manager-downloads/plugin/latest/windows/SessionManagerPluginSetup.exe

**Mac:**
```bash
brew install --cask session-manager-plugin
```

**Linux:**
```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```

#### 3. Configurar credenciales AWS

Pide al admin las credenciales y ejecuta:
```bash
aws configure
# AWS Access Key ID: [tu-access-key]
# AWS Secret Access Key: [tu-secret-key]
# Default region: sa-east-1
# Default output format: json
```

---

### Conectarse a la EC2

#### Opción A: Comando directo (más simple)

```bash
# Conectar a desarrollo
aws ssm start-session --target i-01fcf7ea379b96978 --region sa-east-1
```

#### Opción B: Usar el script incluido

**Windows (PowerShell):**
```powershell
.\infrastructure\scripts\connect-dev.ps1
```

**Mac/Linux:**
```bash
./infrastructure/scripts/connect-dev.sh
```

#### Opción C: SSH nativo (para VS Code Remote, etc.)

Agrega esto a tu `~/.ssh/config`:

```
# Cactus Development Server
Host cactus-dev
    HostName i-01fcf7ea379b96978
    User ec2-user
    ProxyCommand aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters "portNumber=%p" --region sa-east-1
```

Luego puedes conectarte con:
```bash
ssh cactus-dev
```

O abrir VS Code Remote SSH → `cactus-dev`

---

### Comandos útiles una vez conectado

```bash
# Cambiar a ec2-user
sudo su - ec2-user

# Ver estado de los servicios
docker-compose ps

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f api

# Reiniciar un servicio
docker-compose restart api

# Ver uso de recursos
htop
```

---

### Información del servidor

| Ambiente | Instance ID | Región |
|----------|-------------|--------|
| DEV | `i-01fcf7ea379b96978` | sa-east-1 |

---

### Troubleshooting

#### "SessionManagerPlugin is not found"
Instala el plugin de Session Manager (ver prerrequisitos arriba).

#### "Unable to start session"
1. Verifica que la instancia esté corriendo
2. Verifica que tengas las credenciales correctas: `aws sts get-caller-identity`

#### "Access denied"
Contacta al admin para que te agregue los permisos necesarios.

---

## 🔐 Para Administradores

### Agregar nuevo desarrollador

1. Crear usuario IAM con políticas:
   - `AmazonSSMFullAccess` (o política custom más restrictiva)
   
2. Compartir credenciales de forma segura

### Política IAM mínima para desarrolladores

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:StartSession",
                "ssm:TerminateSession",
                "ssm:ResumeSession",
                "ssm:DescribeSessions",
                "ssm:GetConnectionStatus"
            ],
            "Resource": [
                "arn:aws:ec2:sa-east-1:017734516842:instance/i-01fcf7ea379b96978",
                "arn:aws:ssm:sa-east-1:017734516842:document/AWS-StartSSHSession"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ssm:DescribeInstanceInformation"
            ],
            "Resource": "*"
        }
    ]
}
```

