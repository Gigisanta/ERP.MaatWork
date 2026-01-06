# 📋 Obtener Reglas del Security Group

## 🎯 Objetivo

Ver las reglas actuales del Security Group para configurarlo de forma segura (solo Cloudflare).

## 🔍 Opción 1: Desde AWS Console (Más Fácil)

1. **Ve a AWS Console** → EC2 → Security Groups
2. **Busca:** `sg-0bac7f0374851e03a`
3. **Click en el Security Group**
4. **Tab "Inbound rules"**
5. **Toma screenshot o copia todas las reglas**

**Reglas a copiar:**
- Type (HTTP, HTTPS, SSH, etc.)
- Port
- Source (IP o CIDR)
- Description

## 🔍 Opción 2: Desde el Servidor (Script)

```bash
# En el servidor
chmod +x mostrar-reglas-sg.sh
./mostrar-reglas-sg.sh
```

O manualmente:

```bash
# Ver todas las reglas
aws ec2 describe-security-groups \
  --group-ids sg-0bac7f0374851e03a \
  --region sa-east-1 \
  --output json

# O solo formato tabla
aws ec2 describe-security-groups \
  --group-ids sg-0bac7f0374851e03a \
  --region sa-east-1 \
  --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp,IpRanges[0].Description]' \
  --output table
```

## 🔍 Opción 3: Desde tu PC (AWS CLI)

Si tienes AWS CLI configurado en tu PC:

```powershell
aws ec2 describe-security-groups `
  --group-ids sg-0bac7f0374851e03a `
  --region sa-east-1 `
  --output json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## 📋 Qué Necesito Ver

Comparte conmigo:
1. **Todas las reglas de entrada (Inbound rules)**
2. **Especialmente si existe alguna regla para puerto 80**
3. **Las IPs/CIDRs permitidas actualmente**

Con esa información, te ayudo a:
- ✅ Agregar solo rangos de Cloudflare (seguro)
- ✅ Mantener otras reglas existentes
- ✅ No permitir 0.0.0.0/0
