import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CactusConfig, CactusStackProps, ComputeResources } from '../config/types';
import { MvpCompute } from '../constructs/mvp-compute';
import { AdvancedCompute } from '../constructs/advanced-compute';

/**
 * Stack principal de Cactus
 * 
 * Crea toda la infraestructura necesaria para ejecutar Cactus CRM.
 * El modo de deployment (MVP o Advanced) se determina por la configuración.
 * 
 * @example
 * ```typescript
 * new CactusStack(app, 'CactusStack', {
 *   env: { account, region },
 *   config: getConfig(app),
 * });
 * ```
 */
export class CactusStack extends cdk.Stack {
    public readonly vpc: ec2.IVpc;
    public readonly database: rds.DatabaseInstance;
    public readonly dbSecret: secretsmanager.ISecret;
    public readonly computeResources: ComputeResources;

    // MVP resources
    public readonly ec2Instance?: ec2.Instance;
    public readonly logsBucket?: s3.Bucket;

    // Advanced resources
    public readonly ecsCluster?: ecs.Cluster;
    public readonly alb?: elbv2.ApplicationLoadBalancer;

    constructor(scope: Construct, id: string, props: CactusStackProps) {
        super(scope, id, props);

        const { config } = props;
        const prefix = `${config.projectName}-${config.environment}`;

        // ==================== VPC ====================

        if (config.vpc.useDefault) {
            // MVP: Usar VPC por defecto
            this.vpc = ec2.Vpc.fromLookup(this, 'VPC', {
                isDefault: true,
            });
        } else {
            // Advanced: Crear VPC custom
            this.vpc = new ec2.Vpc(this, 'VPC', {
                vpcName: `${prefix}-vpc`,
                maxAzs: config.vpc.maxAzs,
                natGateways: config.vpc.natGateways,
                subnetConfiguration: [
                    {
                        cidrMask: 24,
                        name: 'Public',
                        subnetType: ec2.SubnetType.PUBLIC,
                    },
                    {
                        cidrMask: 24,
                        name: 'Private',
                        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    },
                    {
                        cidrMask: 24,
                        name: 'Database',
                        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    },
                ],
            });

            // VPC Endpoints para reducir costos de NAT
            this.vpc.addGatewayEndpoint('S3Endpoint', {
                service: ec2.GatewayVpcEndpointAwsService.S3,
            });
        }

        // ==================== Database ====================

        // Security Group para RDS
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSG', {
            vpc: this.vpc,
            description: 'Security group for RDS PostgreSQL',
            allowAllOutbound: false,
        });

        // Secret para credenciales
        this.dbSecret = new secretsmanager.Secret(this, 'DBCredentials', {
            secretName: `${prefix}/db-credentials`,
            description: `Database credentials for Cactus ${config.environment}`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: 'cactus_admin',
                    database: 'cactus',
                }),
                generateStringKey: 'password',
                excludePunctuation: true,
                passwordLength: 32,
            },
        });

        // Parsear el tipo de instancia
        const [dbInstanceClass, dbInstanceSize] = config.database.instanceType.split('.') as [string, string];
        const dbInstanceClassEnum = dbInstanceClass.toUpperCase() as keyof typeof ec2.InstanceClass;
        const dbInstanceSizeEnum = dbInstanceSize.toUpperCase() as keyof typeof ec2.InstanceSize;

        // RDS PostgreSQL
        this.database = new rds.DatabaseInstance(this, 'Database', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16,
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass[dbInstanceClassEnum],
                ec2.InstanceSize[dbInstanceSizeEnum]
            ),
            vpc: this.vpc,
            vpcSubnets: {
                subnetType: config.vpc.useDefault 
                    ? ec2.SubnetType.PUBLIC 
                    : ec2.SubnetType.PRIVATE_ISOLATED,
            },
            securityGroups: [dbSecurityGroup],
            credentials: rds.Credentials.fromSecret(this.dbSecret),
            databaseName: 'cactus',
            allocatedStorage: config.database.allocatedStorage,
            maxAllocatedStorage: config.database.maxAllocatedStorage,
            storageType: rds.StorageType.GP3,
            multiAz: config.database.multiAz,
            backupRetention: cdk.Duration.days(config.database.backupRetentionDays),
            deletionProtection: config.environment === 'prod',
            removalPolicy: config.environment === 'prod' 
                ? cdk.RemovalPolicy.SNAPSHOT 
                : cdk.RemovalPolicy.DESTROY,
            publiclyAccessible: config.vpc.useDefault,
        });

        // ==================== Compute ====================

        if (config.mode === 'mvp') {
            // MVP: EC2 con Docker Compose + PM2 + S3 Logs
            const mvpCompute = new MvpCompute(this, 'MvpCompute', {
                config,
                vpc: this.vpc,
                database: this.database,
                dbSecret: this.dbSecret,
            });

            this.computeResources = mvpCompute.urls;
            (this as { ec2Instance: ec2.Instance }).ec2Instance = mvpCompute.instance;
            (this as { logsBucket: s3.Bucket }).logsBucket = mvpCompute.logsBucket;

        } else {
            // Advanced: ECS Fargate con ALB + CloudWatch Logs
            const advancedCompute = new AdvancedCompute(this, 'AdvancedCompute', {
                config,
                vpc: this.vpc,
                database: this.database,
                dbSecret: this.dbSecret,
            });

            this.computeResources = advancedCompute.urls;
            (this as { ecsCluster: ecs.Cluster }).ecsCluster = advancedCompute.cluster;
            (this as { alb: elbv2.ApplicationLoadBalancer }).alb = advancedCompute.alb;
        }

        // ==================== Tags ====================

        cdk.Tags.of(this).add('Project', config.projectName);
        cdk.Tags.of(this).add('Environment', config.environment);
        cdk.Tags.of(this).add('Mode', config.mode);
        cdk.Tags.of(this).add('ManagedBy', 'CDK');

        // ==================== Outputs ====================

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: this.computeResources.apiUrl,
            description: 'API URL',
        });

        new cdk.CfnOutput(this, 'WebUrl', {
            value: this.computeResources.webUrl,
            description: 'Web App URL',
        });

        new cdk.CfnOutput(this, 'AnalyticsUrl', {
            value: this.computeResources.analyticsUrl,
            description: 'Analytics Service URL',
        });

        new cdk.CfnOutput(this, 'DBEndpoint', {
            value: this.database.dbInstanceEndpointAddress,
            description: 'RDS PostgreSQL endpoint',
            exportName: `${prefix}-db-endpoint`,
        });

        new cdk.CfnOutput(this, 'DBSecretArn', {
            value: this.dbSecret.secretArn,
            description: 'Secret ARN for DB credentials',
        });
    }
}

