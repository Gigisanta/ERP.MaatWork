#!/bin/bash
# =============================================================================
# Cactus CDK to Terraform Import Script - DEV Environment
# =============================================================================
# Run this AFTER terraform init
# =============================================================================

set -e

echo "🚀 Importing CDK resources to Terraform..."
echo ""

# Resource IDs discovered from your AWS account
EC2_INSTANCE_ID="i-01fcf7ea379b96978"
EIP_ALLOCATION_ID="eipalloc-0c46467b722ed8135"
EC2_SG_ID="sg-0bac7f0374851e03a"
RDS_SG_ID="sg-0f0a3c8c2f781c54a"
RDS_IDENTIFIER="cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92"
S3_BUCKET="cactus-dev-logs-017734516842"
SECRET_ARN="arn:aws:secretsmanager:sa-east-1:017734516842:secret:cactus-dev/db-credentials-lcZua1"
IAM_ROLE_NAME="Cactus-Mvp-Dev-MvpComputeInstanceRole4387A1AA-YeFYVN6l5bFq"
IAM_PROFILE_NAME="Cactus-Mvp-Dev-MvpComputeInstanceInstanceProfileB9644836-ZAErVIeYmtZo"
DB_SUBNET_GROUP="cactus-mvp-dev-databasesubnetgroup7d60f180-puvsiy02kmwi"

echo "📦 Importing S3 Bucket..."
terraform import 'module.cactus.module.storage.aws_s3_bucket.logs' "$S3_BUCKET" || true

echo "🔐 Importing IAM Role..."
terraform import 'module.cactus.module.compute.aws_iam_role.instance' "$IAM_ROLE_NAME" || true

echo "🔐 Importing IAM Instance Profile..."
terraform import 'module.cactus.module.compute.aws_iam_instance_profile.instance' "$IAM_PROFILE_NAME" || true

echo "🔒 Importing EC2 Security Group..."
terraform import 'module.cactus.module.compute.aws_security_group.instance' "$EC2_SG_ID" || true

echo "🔒 Importing RDS Security Group..."
terraform import 'module.cactus.module.database.aws_security_group.database' "$RDS_SG_ID" || true

echo "🔑 Importing Secrets Manager Secret..."
terraform import 'module.cactus.module.database.aws_secretsmanager_secret.db_credentials' "$SECRET_ARN" || true

echo "🌐 Importing DB Subnet Group..."
terraform import 'module.cactus.module.database.aws_db_subnet_group.main' "$DB_SUBNET_GROUP" || true

echo "🗄️ Importing RDS Instance..."
terraform import 'module.cactus.module.database.aws_db_instance.main' "$RDS_IDENTIFIER" || true

echo "💻 Importing EC2 Instance..."
terraform import 'module.cactus.module.compute.aws_instance.main' "$EC2_INSTANCE_ID" || true

echo "🌍 Importing Elastic IP..."
terraform import 'module.cactus.module.compute.aws_eip.main' "$EIP_ALLOCATION_ID" || true

echo ""
echo "✅ Import complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run 'terraform plan' to verify no changes"
echo "   2. If there are changes, adjust terraform.tfvars"
echo "   3. Run 'terraform apply' to sync state"




