# =============================================================================
# AWS Compute Module - EC2 + Elastic IP + Security Groups + IAM
# =============================================================================

locals {
  prefix = "${var.project_name}-${var.environment}"
  
  # Use existing CDK names if provided, otherwise use clean names
  security_group_name    = coalesce(var.existing_security_group_name, "${local.prefix}-instance-sg")
  iam_role_name          = coalesce(var.existing_iam_role_name, "${local.prefix}-instance-role")
  instance_profile_name  = coalesce(var.existing_instance_profile_name, "${local.prefix}-instance-profile")
}

# =============================================================================
# Data Sources
# =============================================================================

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Fetch Cloudflare IP ranges dynamically
data "http" "cloudflare_ips" {
  url = "https://api.cloudflare.com/client/v4/ips"
}

locals {
  # Parse Cloudflare IPs from API response
  cloudflare_response = jsondecode(data.http.cloudflare_ips.response_body)
  cloudflare_ipv4     = local.cloudflare_response.result.ipv4_cidrs
  cloudflare_ipv6     = local.cloudflare_response.result.ipv6_cidrs
}

# =============================================================================
# Security Group
# =============================================================================

resource "aws_security_group" "instance" {
  name        = local.security_group_name
  description = "Security group for Cactus EC2 instance"
  vpc_id      = var.vpc_id

  # SSH (keep open for admin access)
  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = local.security_group_name
  }

  lifecycle {
    ignore_changes = [name, tags["Name"]]
  }
}

# =============================================================================
# Cloudflare-only Ingress Rules (HTTP/HTTPS)
# =============================================================================

# HTTP from Cloudflare IPv4 ranges only
resource "aws_security_group_rule" "http_cloudflare_ipv4" {
  count             = var.restrict_to_cloudflare ? length(local.cloudflare_ipv4) : 0
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = [local.cloudflare_ipv4[count.index]]
  security_group_id = aws_security_group.instance.id
  description       = "HTTP from Cloudflare IPv4"
}

# HTTPS from Cloudflare IPv4 ranges only
resource "aws_security_group_rule" "https_cloudflare_ipv4" {
  count             = var.restrict_to_cloudflare ? length(local.cloudflare_ipv4) : 0
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [local.cloudflare_ipv4[count.index]]
  security_group_id = aws_security_group.instance.id
  description       = "HTTPS from Cloudflare IPv4"
}

# HTTP from Cloudflare IPv6 ranges only
resource "aws_security_group_rule" "http_cloudflare_ipv6" {
  count             = var.restrict_to_cloudflare ? length(local.cloudflare_ipv6) : 0
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  ipv6_cidr_blocks  = [local.cloudflare_ipv6[count.index]]
  security_group_id = aws_security_group.instance.id
  description       = "HTTP from Cloudflare IPv6"
}

# HTTPS from Cloudflare IPv6 ranges only
resource "aws_security_group_rule" "https_cloudflare_ipv6" {
  count             = var.restrict_to_cloudflare ? length(local.cloudflare_ipv6) : 0
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  ipv6_cidr_blocks  = [local.cloudflare_ipv6[count.index]]
  security_group_id = aws_security_group.instance.id
  description       = "HTTPS from Cloudflare IPv6"
}

# Fallback: HTTP/HTTPS from anywhere (when Cloudflare restriction is disabled)
resource "aws_security_group_rule" "http_anywhere" {
  count             = var.restrict_to_cloudflare ? 0 : 1
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.instance.id
  description       = "HTTP from anywhere"
}

resource "aws_security_group_rule" "https_anywhere" {
  count             = var.restrict_to_cloudflare ? 0 : 1
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.instance.id
  description       = "HTTPS from anywhere"
}

# =============================================================================
# IAM Role and Instance Profile
# =============================================================================

resource "aws_iam_role" "instance" {
  name = local.iam_role_name
  path = "/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = local.iam_role_name
  }

  lifecycle {
    ignore_changes = [name, tags["Name"]]
  }
}

# Attach AWS managed policies
resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Custom policy for Secrets Manager and S3
resource "aws_iam_role_policy" "instance_custom" {
  name = "${local.prefix}-instance-policy"
  role = aws_iam_role.instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.db_secret_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.logs_bucket_arn,
          "${var.logs_bucket_arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ec2:DescribeTags"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "instance" {
  name = local.instance_profile_name
  role = aws_iam_role.instance.name

  tags = {
    Name = local.instance_profile_name
  }

  lifecycle {
    ignore_changes = [name, tags["Name"]]
  }
}

# =============================================================================
# User Data Script
# =============================================================================

locals {
  user_data = <<-EOF
    #!/bin/bash
    set -e

    echo "🚀 Starting MaatWork server setup..."

    # Update system
    dnf update -y

    # Install dependencies
    dnf install -y git nginx python3 python3-pip nodejs npm

    # Install pnpm globally
    npm install -g pnpm@9

    # Install PM2 globally
    npm install -g pm2

    # Create app directory
    mkdir -p /home/ec2-user/abax
    chown -R ec2-user:ec2-user /home/ec2-user/abax

    # Create logs directory
    mkdir -p /home/ec2-user/abax/logs/{api,web,analytics}
    chown -R ec2-user:ec2-user /home/ec2-user/abax/logs

    # Enable and start nginx
    systemctl enable nginx
    systemctl start nginx

    # Configure PM2 startup
    env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

    echo "✅ Server setup complete!"
    echo "📋 Next steps:"
    echo "   1. Clone your repository"
    echo "   2. Configure environment variables"
    echo "   3. Run database migrations"
    echo "   4. Start services with PM2"
  EOF
}

# =============================================================================
# EC2 Instance
# =============================================================================

resource "aws_instance" "main" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.instance.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name
  key_name               = var.ssh_key_name

  root_block_device {
    volume_size           = var.volume_size
    volume_type           = "gp3"
    delete_on_termination = true
    # Note: Set to false to match existing CDK infrastructure
    # Change to true for new deployments if encryption is desired
    encrypted             = false
  }

  user_data                   = base64encode(local.user_data)
  user_data_replace_on_change = false

  tags = {
    Name        = "${local.prefix}-instance"
    Environment = var.environment
  }

  lifecycle {
    # Ignore changes that would force replacement of existing instance
    ignore_changes = [
      ami,
      user_data,
      root_block_device,
      key_name,
      security_groups,
      tags,
    ]
  }
}

# =============================================================================
# Elastic IP
# =============================================================================

resource "aws_eip" "main" {
  instance = aws_instance.main.id
  domain   = "vpc"

  tags = {
    Name = "${local.prefix}-eip"
  }

  lifecycle {
    ignore_changes = [tags["Name"]]
  }
}
