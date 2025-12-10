import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as fs from 'fs';
import * as path from 'path';
import { CactusConfig, ComputeResources } from '../config/types';

export interface MvpComputeProps {
  config: CactusConfig;
  vpc: ec2.IVpc;
  database: rds.DatabaseInstance;
  dbSecret: secretsmanager.ISecret;
}

/**
 * MVP Compute Construct
 *
 * Crea una instancia EC2 con Docker Compose para ejecutar todos los servicios.
 * Arquitectura simple y económica para validación inicial del producto.
 *
 * Recursos creados:
 * - EC2 Instance (t3.small por defecto)
 * - Elastic IP
 * - Security Group
 * - IAM Role con permisos para Secrets Manager y CloudWatch
 */
export class MvpCompute extends Construct {
  public readonly instance: ec2.Instance;
  public readonly elasticIp: ec2.CfnEIP;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly logsBucket: s3.Bucket;
  public readonly urls: ComputeResources;

  constructor(scope: Construct, id: string, props: MvpComputeProps) {
    super(scope, id);

    const { config, vpc, database, dbSecret } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    if (!config.mvpCompute) {
      throw new Error('mvpCompute configuration is required for MVP mode');
    }

    // ==================== S3 Bucket para Logs ====================
    // Más económico que CloudWatch Logs (~$0.023/GB vs ~$0.50/GB)

    this.logsBucket = new s3.Bucket(this, 'LogsBucket', {
      bucketName: `${prefix}-logs-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy:
        config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'prod',
      lifecycleRules: [
        {
          // Mover a Glacier después de 30 días
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          // Eliminar después de 90 días
          expiration: cdk.Duration.days(90),
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ==================== Security Group ====================

    this.securityGroup = new ec2.SecurityGroup(this, 'InstanceSG', {
      vpc,
      description: 'Security group for Cactus EC2 instance',
      allowAllOutbound: true,
    });

    // HTTP
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from anywhere'
    );

    // HTTPS
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from anywhere'
    );

    // SSH (considerar limitar a IP específica en producción)
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH from anywhere (restrict in production)'
    );

    // Permitir acceso a la base de datos
    database.connections.allowFrom(
      this.securityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from EC2 instance'
    );

    // ==================== IAM Role ====================

    const instanceRole = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for Cactus EC2 instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Permitir lectura de secrets
    dbSecret.grantRead(instanceRole);

    // Permitir escritura de logs a S3
    this.logsBucket.grantWrite(instanceRole);
    this.logsBucket.grantPut(instanceRole);

    // Permitir leer tags de EC2 (para obtener el bucket de logs en el script)
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ec2:DescribeTags'],
        resources: ['*'],
      })
    );

    // ==================== User Data ====================

    const userDataPath = path.join(__dirname, '../../scripts/user-data.sh');
    let userDataScript: string;

    try {
      userDataScript = fs.readFileSync(userDataPath, 'utf8');
    } catch {
      // Script de fallback si no existe el archivo
      userDataScript = `#!/bin/bash
set -e
echo "Installing Docker..."
yum update -y
yum install -y docker git
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo "Setup complete!"
`;
    }

    const userData = ec2.UserData.forLinux();
    userData.addCommands(userDataScript);

    // ==================== EC2 Instance ====================

    // Parsear el tipo de instancia
    const [instanceClass, instanceSize] = config.mvpCompute.instanceType.split('.') as [
      string,
      string,
    ];
    const instanceClassEnum = instanceClass.toUpperCase() as keyof typeof ec2.InstanceClass;
    const instanceSizeEnum = instanceSize.toUpperCase() as keyof typeof ec2.InstanceSize;

    this.instance = new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass[instanceClassEnum],
        ec2.InstanceSize[instanceSizeEnum]
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
        cpuType: ec2.AmazonLinuxCpuType.X86_64,
      }),
      securityGroup: this.securityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role: instanceRole,
      userData,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(config.mvpCompute.volumeSize, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            deleteOnTermination: true,
          }),
        },
      ],
    });

    // Tags
    cdk.Tags.of(this.instance).add('Name', `${prefix}-instance`);
    cdk.Tags.of(this.instance).add('LogsBucket', this.logsBucket.bucketName);
    cdk.Tags.of(this.instance).add('Environment', config.environment);
    cdk.Tags.of(this.instance).add('Project', config.projectName);

    // ==================== Elastic IP ====================

    this.elasticIp = new ec2.CfnEIP(this, 'ElasticIP', {
      instanceId: this.instance.instanceId,
      tags: [
        { key: 'Name', value: `${config.projectName}-${config.environment}-eip` },
        { key: 'Environment', value: config.environment },
        { key: 'Project', value: config.projectName },
      ],
    });

    // ==================== URLs ====================

    this.urls = {
      apiUrl: `http://${this.elasticIp.ref}/api`,
      webUrl: `http://${this.elasticIp.ref}`,
      analyticsUrl: `http://${this.elasticIp.ref}/analytics`,
    };

    // ==================== Outputs ====================

    new cdk.CfnOutput(this, 'InstanceIP', {
      value: this.elasticIp.ref,
      description: 'Elastic IP of the EC2 instance',
      exportName: `${prefix}-instance-ip`,
    });

    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
      description: 'EC2 Instance ID',
    });

    new cdk.CfnOutput(this, 'LogsBucketName', {
      value: this.logsBucket.bucketName,
      description: 'S3 bucket for application logs',
      exportName: `${prefix}-logs-bucket`,
    });

    new cdk.CfnOutput(this, 'LogsBucketArn', {
      value: this.logsBucket.bucketArn,
      description: 'S3 bucket ARN for logs',
    });

    new cdk.CfnOutput(this, 'SSHCommand', {
      value: `ssh -i ~/.ssh/${config.projectName}-${config.environment}.pem ec2-user@${this.elasticIp.ref}`,
      description: 'SSH command to connect to instance',
    });
  }
}
