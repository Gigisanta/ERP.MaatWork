#!/bin/bash
# =============================================================================
# Cactus CDK to Terraform Migration Script
# =============================================================================
# Usage: ./migrate.sh [dev|prod]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT="${1:-dev}"
PROJECT="maatwork"

echo -e "${BLUE}=== Cactus CDK to Terraform Migration ===${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform is not installed${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}AWS Account: ${AWS_ACCOUNT_ID}${NC}"

# Get resource IDs
echo ""
echo -e "${YELLOW}Discovering resources...${NC}"

# EC2 Instance
EC2_INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=${PROJECT}-${ENVIRONMENT}-instance" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text 2>/dev/null || echo "None")
echo "EC2 Instance: $EC2_INSTANCE_ID"

# Elastic IP
EIP_ALLOCATION_ID=$(aws ec2 describe-addresses \
  --filters "Name=tag:Name,Values=${PROJECT}-${ENVIRONMENT}-eip" \
  --query 'Addresses[0].AllocationId' \
  --output text 2>/dev/null || echo "None")
echo "Elastic IP: $EIP_ALLOCATION_ID"

# Security Group (EC2)
EC2_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${PROJECT}-${ENVIRONMENT}-instance-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")
echo "EC2 Security Group: $EC2_SG_ID"

# RDS Instance
RDS_IDENTIFIER="${PROJECT}-${ENVIRONMENT}-database"
RDS_EXISTS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_IDENTIFIER" \
  --query 'DBInstances[0].DBInstanceIdentifier' \
  --output text 2>/dev/null || echo "None")
echo "RDS Identifier: $RDS_EXISTS"

# RDS Security Group
RDS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${PROJECT}-${ENVIRONMENT}-database-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")
echo "RDS Security Group: $RDS_SG_ID"

# S3 Bucket
S3_BUCKET="${PROJECT}-${ENVIRONMENT}-logs-${AWS_ACCOUNT_ID}"
S3_EXISTS=$(aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null && echo "$S3_BUCKET" || echo "None")
echo "S3 Bucket: $S3_EXISTS"

# Secrets Manager
SECRET_ARN=$(aws secretsmanager list-secrets \
  --filters Key=name,Values="${PROJECT}-${ENVIRONMENT}/db-credentials" \
  --query 'SecretList[0].ARN' \
  --output text 2>/dev/null || echo "None")
echo "Secret ARN: $SECRET_ARN"

# IAM Role
IAM_ROLE_NAME="${PROJECT}-${ENVIRONMENT}-instance-role"
IAM_ROLE_EXISTS=$(aws iam get-role --role-name "$IAM_ROLE_NAME" \
  --query 'Role.RoleName' --output text 2>/dev/null || echo "None")
echo "IAM Role: $IAM_ROLE_EXISTS"

# IAM Instance Profile
IAM_PROFILE_NAME="${PROJECT}-${ENVIRONMENT}-instance-profile"
IAM_PROFILE_EXISTS=$(aws iam get-instance-profile --instance-profile-name "$IAM_PROFILE_NAME" \
  --query 'InstanceProfile.InstanceProfileName' --output text 2>/dev/null || echo "None")
echo "IAM Instance Profile: $IAM_PROFILE_EXISTS"

# DB Subnet Group
DB_SUBNET_GROUP="${PROJECT}-${ENVIRONMENT}-db-subnet-group"
DB_SUBNET_EXISTS=$(aws rds describe-db-subnet-groups \
  --db-subnet-group-name "$DB_SUBNET_GROUP" \
  --query 'DBSubnetGroups[0].DBSubnetGroupName' --output text 2>/dev/null || echo "None")
echo "DB Subnet Group: $DB_SUBNET_EXISTS"

echo ""
echo -e "${YELLOW}Generating import commands...${NC}"

# Generate import script
IMPORT_SCRIPT="import_${ENVIRONMENT}.sh"
cat > "$IMPORT_SCRIPT" << EOF
#!/bin/bash
# Auto-generated import commands for ${ENVIRONMENT}
# Run from: infrastructure/terraform/environments/${ENVIRONMENT}/

set -e

echo "Importing resources to Terraform..."

EOF

# Add import commands only for existing resources
if [ "$S3_EXISTS" != "None" ]; then
    echo "terraform import 'module.maatwork.module.storage.aws_s3_bucket.logs' '$S3_BUCKET'" >> "$IMPORT_SCRIPT"
fi

if [ "$IAM_ROLE_EXISTS" != "None" ]; then
    echo "terraform import 'module.maatwork.module.compute.aws_iam_role.instance' '$IAM_ROLE_NAME'" >> "$IMPORT_SCRIPT"
fi

if [ "$IAM_PROFILE_EXISTS" != "None" ]; then
    echo "terraform import 'module.maatwork.module.compute.aws_iam_instance_profile.instance' '$IAM_PROFILE_NAME'" >> "$IMPORT_SCRIPT"
fi

if [ "$EC2_SG_ID" != "None" ]; then
    echo "terraform import 'module.maatwork.module.compute.aws_security_group.instance' '$EC2_SG_ID'" >> "$IMPORT_SCRIPT"
fi

if [ "$RDS_SG_ID" != "None" ]; then
    echo "terraform import 'module.maatwork.module.database.aws_security_group.database' '$RDS_SG_ID'" >> "$IMPORT_SCRIPT"
fi

if [ "$SECRET_ARN" != "None" ]; then
    echo "terraform import 'module.maatwork.module.database.aws_secretsmanager_secret.db_credentials' '$SECRET_ARN'" >> "$IMPORT_SCRIPT"
fi

if [ "$DB_SUBNET_EXISTS" != "None" ]; then
    echo "terraform import 'module.maatwork.module.database.aws_db_subnet_group.main' '$DB_SUBNET_GROUP'" >> "$IMPORT_SCRIPT"
fi

if [ "$RDS_EXISTS" != "None" ]; then
    echo "terraform import 'module.maatwork.module.database.aws_db_instance.main' '$RDS_IDENTIFIER'" >> "$IMPORT_SCRIPT"
fi

if [ "$EC2_INSTANCE_ID" != "None" ]; then
    echo "terraform import 'module.maatwork.module.compute.aws_instance.main' '$EC2_INSTANCE_ID'" >> "$IMPORT_SCRIPT"
fi

if [ "$EIP_ALLOCATION_ID" != "None" ]; then
    echo "terraform import 'module.maatwork.module.compute.aws_eip.main' '$EIP_ALLOCATION_ID'" >> "$IMPORT_SCRIPT"
fi

cat >> "$IMPORT_SCRIPT" << EOF

echo ""
echo "Import complete! Run 'terraform plan' to verify."
EOF

chmod +x "$IMPORT_SCRIPT"

echo -e "${GREEN}Import script generated: ${IMPORT_SCRIPT}${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. cd infrastructure/terraform/environments/${ENVIRONMENT}"
echo "2. cp terraform.tfvars.example terraform.tfvars"
echo "3. Edit terraform.tfvars with your values"
echo "4. terraform init"
echo "5. Run the import script: ../../scripts/${IMPORT_SCRIPT}"
echo "6. terraform plan (should show no changes)"
echo ""
echo -e "${GREEN}Migration script complete!${NC}"




