import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import { CactusConfig, ComputeResources } from '../config/types';

export interface AdvancedComputeProps {
  config: CactusConfig;
  vpc: ec2.IVpc;
  database: rds.DatabaseInstance;
  dbSecret: secretsmanager.ISecret;
}

/**
 * Advanced Compute Construct
 *
 * Crea infraestructura escalable con ECS Fargate y Application Load Balancer.
 * Diseñado para producción con auto-scaling y alta disponibilidad.
 *
 * Recursos creados:
 * - ECS Cluster
 * - ECS Fargate Services (API, Web, Analytics)
 * - Application Load Balancer
 * - ECR Repositories
 * - Auto-scaling (si está habilitado)
 */
export class AdvancedCompute extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly apiService: ecs.FargateService;
  public readonly webService: ecs.FargateService;
  public readonly analyticsService: ecs.FargateService;
  public readonly urls: ComputeResources;

  constructor(scope: Construct, id: string, props: AdvancedComputeProps) {
    super(scope, id);

    const { config, vpc, database, dbSecret } = props;

    if (!config.advancedCompute) {
      throw new Error('advancedCompute configuration is required for Advanced mode');
    }

    const prefix = `${config.projectName}-${config.environment}`;

    // ==================== ECS Cluster ====================

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: prefix,
      containerInsights: true,
    });

    // ==================== ECR Repositories ====================

    const apiRepo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: `${prefix}/api`,
      removalPolicy:
        config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    const webRepo = new ecr.Repository(this, 'WebRepo', {
      repositoryName: `${prefix}/web`,
      removalPolicy:
        config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    const analyticsRepo = new ecr.Repository(this, 'AnalyticsRepo', {
      repositoryName: `${prefix}/analytics`,
      removalPolicy:
        config.environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    // ==================== Application Load Balancer ====================

    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: `${prefix}-alb`,
    });

    const listener = this.alb.addListener('HttpListener', {
      port: 80,
      open: true,
    });

    // ==================== Log Groups ====================

    const apiLogGroup = new logs.LogGroup(this, 'ApiLogs', {
      logGroupName: `/ecs/${prefix}/api`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const webLogGroup = new logs.LogGroup(this, 'WebLogs', {
      logGroupName: `/ecs/${prefix}/web`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const analyticsLogGroup = new logs.LogGroup(this, 'AnalyticsLogs', {
      logGroupName: `/ecs/${prefix}/analytics`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ==================== API Service ====================

    const apiTaskDef = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      cpu: config.advancedCompute.cpu,
      memoryLimitMiB: config.advancedCompute.memoryLimitMiB,
    });

    apiTaskDef.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(apiRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'api',
        logGroup: apiLogGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret, 'connectionString'),
      },
      portMappings: [{ containerPort: 3001 }],
    });

    dbSecret.grantRead(apiTaskDef.taskRole);

    this.apiService = new ecs.FargateService(this, 'ApiService', {
      cluster: this.cluster,
      taskDefinition: apiTaskDef,
      desiredCount: config.advancedCompute.desiredCount,
      serviceName: `${prefix}-api`,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Permitir acceso a RDS
    this.apiService.connections.allowTo(database, ec2.Port.tcp(5432));

    // ==================== Web Service ====================

    const webTaskDef = new ecs.FargateTaskDefinition(this, 'WebTaskDef', {
      cpu: config.advancedCompute.cpu,
      memoryLimitMiB: config.advancedCompute.memoryLimitMiB,
    });

    webTaskDef.addContainer('WebContainer', {
      image: ecs.ContainerImage.fromEcrRepository(webRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'web',
        logGroup: webLogGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: `http://${this.alb.loadBalancerDnsName}/api`,
      },
      portMappings: [{ containerPort: 3000 }],
    });

    this.webService = new ecs.FargateService(this, 'WebService', {
      cluster: this.cluster,
      taskDefinition: webTaskDef,
      desiredCount: config.advancedCompute.desiredCount,
      serviceName: `${prefix}-web`,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // ==================== Analytics Service ====================

    const analyticsTaskDef = new ecs.FargateTaskDefinition(this, 'AnalyticsTaskDef', {
      cpu: config.advancedCompute.cpu,
      memoryLimitMiB: config.advancedCompute.memoryLimitMiB,
    });

    analyticsTaskDef.addContainer('AnalyticsContainer', {
      image: ecs.ContainerImage.fromEcrRepository(analyticsRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'analytics',
        logGroup: analyticsLogGroup,
      }),
      environment: {
        ENVIRONMENT: config.environment,
        PORT: '3002',
      },
      portMappings: [{ containerPort: 3002 }],
    });

    this.analyticsService = new ecs.FargateService(this, 'AnalyticsService', {
      cluster: this.cluster,
      taskDefinition: analyticsTaskDef,
      desiredCount: 1, // Analytics suele necesitar solo 1 instancia
      serviceName: `${prefix}-analytics`,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // ==================== ALB Target Groups ====================

    // API target group (default)
    const apiTargetGroup = listener.addTargets('ApiTarget', {
      port: 80,
      targets: [this.apiService],
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*', '/health'])],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      targetGroupName: `${prefix}-api-tg`,
    });

    // Analytics target group
    listener.addTargets('AnalyticsTarget', {
      port: 80,
      targets: [this.analyticsService],
      priority: 20,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/analytics/*'])],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
      },
      targetGroupName: `${prefix}-analytics-tg`,
    });

    // Web target group (default - catch all)
    listener.addTargets('WebTarget', {
      port: 80,
      targets: [this.webService],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
      },
      targetGroupName: `${prefix}-web-tg`,
    });

    // ==================== Auto Scaling ====================

    if (config.advancedCompute.enableAutoScaling) {
      // API Auto Scaling
      const apiScaling = this.apiService.autoScaleTaskCount({
        minCapacity: config.advancedCompute.minCount,
        maxCapacity: config.advancedCompute.maxCount,
      });

      apiScaling.scaleOnCpuUtilization('ApiCpuScaling', {
        targetUtilizationPercent: 70,
        scaleInCooldown: cdk.Duration.seconds(60),
        scaleOutCooldown: cdk.Duration.seconds(60),
      });

      // Web Auto Scaling
      const webScaling = this.webService.autoScaleTaskCount({
        minCapacity: config.advancedCompute.minCount,
        maxCapacity: config.advancedCompute.maxCount,
      });

      webScaling.scaleOnCpuUtilization('WebCpuScaling', {
        targetUtilizationPercent: 70,
        scaleInCooldown: cdk.Duration.seconds(60),
        scaleOutCooldown: cdk.Duration.seconds(60),
      });
    }

    // ==================== URLs ====================

    this.urls = {
      apiUrl: `http://${this.alb.loadBalancerDnsName}/api`,
      webUrl: `http://${this.alb.loadBalancerDnsName}`,
      analyticsUrl: `http://${this.alb.loadBalancerDnsName}/analytics`,
    };

    // ==================== Outputs ====================

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS',
      exportName: `${prefix}-alb-dns`,
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'ApiRepoUri', {
      value: apiRepo.repositoryUri,
      description: 'API ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'WebRepoUri', {
      value: webRepo.repositoryUri,
      description: 'Web ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'AnalyticsRepoUri', {
      value: analyticsRepo.repositoryUri,
      description: 'Analytics ECR Repository URI',
    });
  }
}
