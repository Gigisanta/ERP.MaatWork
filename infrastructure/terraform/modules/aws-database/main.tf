# =============================================================================
# AWS Database Module - RDS PostgreSQL + Secrets Manager
# =============================================================================

locals {
  prefix = "${var.project_name}-${var.environment}"
  
  # Use existing CDK names if provided, otherwise use clean names
  db_identifier       = coalesce(var.existing_db_identifier, "${local.prefix}-database")
  security_group_name = coalesce(var.existing_security_group_name, "${local.prefix}-database-sg")
  secret_name         = coalesce(var.existing_secret_name, "${local.prefix}/db-credentials")
  subnet_group_name   = coalesce(var.existing_subnet_group_name, "${local.prefix}-db-subnet-group")
}

# =============================================================================
# Random Password for Database
# =============================================================================

resource "random_password" "db_password" {
  length           = 32
  special          = false  # Avoid special chars for easier connection strings
  override_special = ""
  
  lifecycle {
    ignore_changes = all  # Don't regenerate password on import
  }
}

# =============================================================================
# Secrets Manager - Database Credentials
# =============================================================================

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = local.secret_name
  description = "Database credentials for Cactus ${var.environment}"

  tags = {
    Name = "${local.prefix}-db-credentials"
  }

  lifecycle {
    ignore_changes = [name]
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "cactus_admin"
    password = random_password.db_password.result
    database = "cactus"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    # Full connection string for convenience
    connection_string = "postgresql://cactus_admin:${random_password.db_password.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/cactus"
  })

  lifecycle {
    ignore_changes = [secret_string]  # Don't update secret on import
  }
}

# =============================================================================
# Security Group for RDS
# =============================================================================

resource "aws_security_group" "database" {
  name        = local.security_group_name
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  # Allow PostgreSQL from compute security group
  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.compute_security_group_id]
  }

  # No outbound traffic needed for RDS
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  tags = {
    Name = local.security_group_name
  }

  lifecycle {
    ignore_changes = [name, tags["Name"]]
  }
}

# =============================================================================
# DB Subnet Group
# =============================================================================

resource "aws_db_subnet_group" "main" {
  name        = local.subnet_group_name
  description = "Database subnet group for ${local.prefix}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name = local.subnet_group_name
  }

  lifecycle {
    ignore_changes = [name, tags["Name"]]
  }
}

# =============================================================================
# RDS PostgreSQL Instance
# =============================================================================

resource "aws_db_instance" "main" {
  identifier = local.db_identifier

  # Engine
  engine         = "postgres"
  engine_version = "16"

  # Instance
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"

  # Credentials
  db_name  = "cactus"
  username = "cactus_admin"
  password = random_password.db_password.result

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = true  # Required for default VPC setup

  # Availability
  multi_az = var.multi_az

  # Backup
  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Protection
  deletion_protection = var.environment == "prod"
  skip_final_snapshot = var.environment == "dev"
  final_snapshot_identifier = var.environment == "prod" ? "${local.prefix}-final-snapshot" : null

  # Performance Insights (free tier)
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  tags = {
    Name = "${local.prefix}-database"
  }

  lifecycle {
    # Ignore changes that would affect existing imported infrastructure
    ignore_changes = [
      identifier,
      password,
      engine_version,
      backup_window,
      maintenance_window,
      performance_insights_enabled,
      performance_insights_retention_period,
      copy_tags_to_snapshot,
      tags,
    ]
  }
}
