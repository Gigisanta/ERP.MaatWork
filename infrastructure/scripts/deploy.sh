#!/bin/bash
###############################################################################
# Script de deployment para Cactus Infrastructure
# 
# Uso:
#   ./deploy.sh --env dev --mode mvp
#   ./deploy.sh --env prod --mode advanced --action diff
#   ./deploy.sh --env dev --mode mvp --action destroy
#
# Opciones:
#   --env, -e       Ambiente: dev o prod (default: dev)
#   --mode, -m      Modo: mvp o advanced (default: mvp)
#   --action, -a    Acción: deploy, diff, destroy, synth (default: deploy)
#   --profile, -p   Perfil de AWS (opcional)
#   --help, -h      Mostrar ayuda
###############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Valores por defecto
ENVIRONMENT="dev"
MODE="mvp"
ACTION="deploy"
AWS_PROFILE_OPT=""

# Directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CDK_DIR="$SCRIPT_DIR/../cdk"

# Función de ayuda
show_help() {
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  --env, -e       Ambiente: dev o prod (default: dev)"
    echo "  --mode, -m      Modo: mvp o advanced (default: mvp)"
    echo "  --action, -a    Acción: deploy, diff, destroy, synth (default: deploy)"
    echo "  --profile, -p   Perfil de AWS (opcional)"
    echo "  --help, -h      Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 --env dev --mode mvp"
    echo "  $0 --env prod --mode advanced --action diff"
    echo "  $0 -e dev -m mvp -a destroy"
    exit 0
}

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --env|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --mode|-m)
            MODE="$2"
            shift 2
            ;;
        --action|-a)
            ACTION="$2"
            shift 2
            ;;
        --profile|-p)
            AWS_PROFILE_OPT="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}Opción desconocida: $1${NC}"
            show_help
            ;;
    esac
done

# Validar opciones
if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo -e "${RED}ERROR: Ambiente inválido: $ENVIRONMENT. Usa 'dev' o 'prod'${NC}"
    exit 1
fi

if [[ ! "$MODE" =~ ^(mvp|advanced)$ ]]; then
    echo -e "${RED}ERROR: Modo inválido: $MODE. Usa 'mvp' o 'advanced'${NC}"
    exit 1
fi

if [[ ! "$ACTION" =~ ^(deploy|diff|destroy|synth)$ ]]; then
    echo -e "${RED}ERROR: Acción inválida: $ACTION. Usa 'deploy', 'diff', 'destroy' o 'synth'${NC}"
    exit 1
fi

# Banner
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              CACTUS INFRASTRUCTURE DEPLOYMENT              ║${NC}"
echo -e "${CYAN}╠════════════════════════════════════════════════════════════╣${NC}"
printf "${CYAN}║  Mode:        %-44s║${NC}\n" "$(echo $MODE | tr '[:lower:]' '[:upper:]')"
printf "${CYAN}║  Environment: %-44s║${NC}\n" "$(echo $ENVIRONMENT | tr '[:lower:]' '[:upper:]')"
printf "${CYAN}║  Action:      %-44s║${NC}\n" "$(echo $ACTION | tr '[:lower:]' '[:upper:]')"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar directorio CDK
if [[ ! -f "$CDK_DIR/package.json" ]]; then
    echo -e "${RED}ERROR: No se encuentra package.json en $CDK_DIR${NC}"
    echo -e "${YELLOW}Ejecuta este script desde la raíz del proyecto o desde infrastructure/scripts${NC}"
    exit 1
fi

# Cambiar al directorio CDK
cd "$CDK_DIR"

# Verificar dependencias
echo -e "${YELLOW}Verificando dependencias...${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}ERROR: pnpm no está instalado${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI no está instalado${NC}"
    exit 1
fi

# Instalar dependencias si es necesario
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    pnpm install
fi

# Configurar perfil de AWS
if [[ -n "$AWS_PROFILE_OPT" ]]; then
    export AWS_PROFILE="$AWS_PROFILE_OPT"
    echo -e "${YELLOW}Usando perfil AWS: $AWS_PROFILE${NC}"
fi

# Confirmación para producción
if [[ "$ENVIRONMENT" == "prod" && "$ACTION" == "deploy" ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  ADVERTENCIA: Estás a punto de desplegar en PRODUCCIÓN${NC}"
    echo ""
    read -p "Escribe 'DEPLOY PROD' para confirmar: " confirm
    if [[ "$confirm" != "DEPLOY PROD" ]]; then
        echo -e "${RED}Deployment cancelado${NC}"
        exit 1
    fi
fi

if [[ "$ENVIRONMENT" == "prod" && "$ACTION" == "destroy" ]]; then
    echo ""
    echo -e "${RED}🚨 PELIGRO: Estás a punto de DESTRUIR la infraestructura de PRODUCCIÓN${NC}"
    echo ""
    read -p "Escribe 'DESTROY PROD' para confirmar: " confirm
    if [[ "$confirm" != "DESTROY PROD" ]]; then
        echo -e "${RED}Destroy cancelado${NC}"
        exit 1
    fi
fi

# Construir argumentos CDK
CDK_ARGS="--context mode=$MODE --context env=$ENVIRONMENT"

echo ""
echo -e "${CYAN}Ejecutando: cdk $ACTION $CDK_ARGS${NC}"
echo ""

# Ejecutar CDK
case $ACTION in
    deploy)
        npx cdk deploy --all $CDK_ARGS --require-approval never
        ;;
    diff)
        npx cdk diff $CDK_ARGS
        ;;
    destroy)
        npx cdk destroy --all $CDK_ARGS --force
        ;;
    synth)
        npx cdk synth $CDK_ARGS
        ;;
esac

EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✅ $ACTION completado exitosamente!${NC}"
else
    echo ""
    echo -e "${RED}❌ $ACTION falló con código $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi











