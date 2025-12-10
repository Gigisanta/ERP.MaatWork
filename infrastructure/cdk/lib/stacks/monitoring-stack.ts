import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { CactusConfig, CactusStackProps } from '../config/types';

export interface MonitoringStackProps extends cdk.StackProps {
  config: CactusConfig;
  /** Instancia EC2 para monitorear (solo MVP) */
  ec2Instance?: ec2.Instance;
  /** Cluster ECS para monitorear (solo Advanced) */
  ecsCluster?: ecs.Cluster;
  /** Application Load Balancer para monitorear (solo Advanced) */
  alb?: elbv2.ApplicationLoadBalancer;
}

/**
 * Stack de Monitoring para Cactus
 *
 * Crea alarmas y dashboards de CloudWatch, además de alertas de presupuesto.
 * Se adapta automáticamente al modo de deployment (MVP o Advanced).
 */
export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { config } = props;
    const prefix = `${config.projectName}-${config.environment}`;

    // ==================== SNS Topic ====================

    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${prefix}-alarms`,
      displayName: `Cactus ${config.environment.toUpperCase()} Alarms`,
    });

    // Agregar email de suscripción si está configurado
    if (config.monitoring.alarmEmail) {
      this.alarmTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(config.monitoring.alarmEmail)
      );
    }

    // ==================== Dashboard ====================

    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${prefix}-dashboard`,
    });

    // ==================== Alarmas según modo ====================

    if (config.mode === 'mvp' && props.ec2Instance) {
      this.createMvpAlarms(props.ec2Instance, config);
      this.createMvpDashboardWidgets(props.ec2Instance);
    } else if (config.mode === 'advanced' && props.ecsCluster && props.alb) {
      this.createAdvancedAlarms(props.ecsCluster, props.alb, config);
      this.createAdvancedDashboardWidgets(props.ecsCluster, props.alb);
    }

    // ==================== Budget Alert ====================

    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: `${prefix}-monthly-budget`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: config.monitoring.budgetAmount,
          unit: 'USD',
        },
        costFilters: {
          TagKeyValue: [`user:Project$${config.projectName}`],
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: this.alarmTopic.topicArn,
            },
          ],
        },
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: this.alarmTopic.topicArn,
            },
          ],
        },
      ],
    });

    // ==================== Tags ====================

    cdk.Tags.of(this).add('Project', config.projectName);
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');

    // ==================== Outputs ====================

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic ARN for alarms',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });
  }

  /**
   * Crea alarmas para modo MVP (EC2)
   */
  private createMvpAlarms(instance: ec2.Instance, config: CactusConfig): void {
    const prefix = `${config.projectName}-${config.environment}`;

    // CPU Alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      alarmName: `${prefix}-high-cpu`,
      metric: instance.metricCPUUtilization({
        period: cdk.Duration.minutes(5),
      }),
      threshold: config.monitoring.cpuAlarmThreshold,
      evaluationPeriods: 2,
      alarmDescription: `EC2 CPU exceeds ${config.monitoring.cpuAlarmThreshold}% for 10 minutes`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    cpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Disk Usage Alarm (requiere CloudWatch Agent)
    const diskAlarm = new cloudwatch.Alarm(this, 'HighDiskAlarm', {
      alarmName: `${prefix}-high-disk`,
      metric: new cloudwatch.Metric({
        namespace: 'CWAgent',
        metricName: 'disk_used_percent',
        dimensionsMap: {
          InstanceId: instance.instanceId,
          path: '/',
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 1,
      alarmDescription: 'Disk usage exceeds 80%',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    diskAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Status Check Alarm
    const statusAlarm = new cloudwatch.Alarm(this, 'StatusCheckAlarm', {
      alarmName: `${prefix}-status-check`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'StatusCheckFailed',
        dimensionsMap: {
          InstanceId: instance.instanceId,
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'EC2 instance status check failed',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    statusAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  /**
   * Crea alarmas para modo Advanced (ECS + ALB)
   */
  private createAdvancedAlarms(
    cluster: ecs.Cluster,
    alb: elbv2.ApplicationLoadBalancer,
    config: CactusConfig
  ): void {
    const prefix = `${config.projectName}-${config.environment}`;

    // ECS CPU Alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      alarmName: `${prefix}-ecs-high-cpu`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          ClusterName: cluster.clusterName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: config.monitoring.cpuAlarmThreshold,
      evaluationPeriods: 2,
      alarmDescription: `ECS CPU exceeds ${config.monitoring.cpuAlarmThreshold}% for 10 minutes`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    cpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // ECS Memory Alarm
    const memoryAlarm = new cloudwatch.Alarm(this, 'HighMemoryAlarm', {
      alarmName: `${prefix}-ecs-high-memory`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ECS',
        metricName: 'MemoryUtilization',
        dimensionsMap: {
          ClusterName: cluster.clusterName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: config.monitoring.memoryAlarmThreshold,
      evaluationPeriods: 2,
      alarmDescription: `ECS Memory exceeds ${config.monitoring.memoryAlarmThreshold}% for 10 minutes`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    memoryAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // ALB 5xx Errors
    const alb5xxAlarm = new cloudwatch.Alarm(this, 'ALB5xxAlarm', {
      alarmName: `${prefix}-alb-5xx`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'HTTPCode_Target_5XX_Count',
        dimensionsMap: {
          LoadBalancer: alb.loadBalancerFullName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      alarmDescription: 'More than 10 5xx errors in 5 minutes',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    alb5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));

    // Unhealthy Targets
    const unhealthyAlarm = new cloudwatch.Alarm(this, 'UnhealthyTargetsAlarm', {
      alarmName: `${prefix}-unhealthy-targets`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApplicationELB',
        metricName: 'UnHealthyHostCount',
        dimensionsMap: {
          LoadBalancer: alb.loadBalancerFullName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'At least one unhealthy target for 10 minutes',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    unhealthyAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alarmTopic));
  }

  /**
   * Crea widgets del dashboard para MVP
   */
  private createMvpDashboardWidgets(instance: ec2.Instance): void {
    const cpuWidget = new cloudwatch.GraphWidget({
      title: 'EC2 CPU Utilization',
      width: 12,
      height: 6,
      left: [
        instance.metricCPUUtilization({
          period: cdk.Duration.minutes(5),
          label: 'CPU %',
        }),
      ],
      leftYAxis: { min: 0, max: 100 },
    });

    const networkWidget = new cloudwatch.GraphWidget({
      title: 'EC2 Network',
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/EC2',
          metricName: 'NetworkIn',
          dimensionsMap: { InstanceId: instance.instanceId },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: 'Bytes In',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/EC2',
          metricName: 'NetworkOut',
          dimensionsMap: { InstanceId: instance.instanceId },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
          label: 'Bytes Out',
        }),
      ],
    });

    this.dashboard.addWidgets(cpuWidget, networkWidget);
  }

  /**
   * Crea widgets del dashboard para Advanced
   */
  private createAdvancedDashboardWidgets(
    cluster: ecs.Cluster,
    alb: elbv2.ApplicationLoadBalancer
  ): void {
    // ECS CPU Widget
    const cpuWidget = new cloudwatch.GraphWidget({
      title: 'ECS CPU Utilization',
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'CPUUtilization',
          dimensionsMap: { ClusterName: cluster.clusterName },
          statistic: 'Average',
          label: 'Avg CPU',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'CPUUtilization',
          dimensionsMap: { ClusterName: cluster.clusterName },
          statistic: 'Maximum',
          label: 'Max CPU',
        }),
      ],
      leftYAxis: { min: 0, max: 100 },
    });

    // ECS Memory Widget
    const memoryWidget = new cloudwatch.GraphWidget({
      title: 'ECS Memory Utilization',
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ECS',
          metricName: 'MemoryUtilization',
          dimensionsMap: { ClusterName: cluster.clusterName },
          statistic: 'Average',
          label: 'Avg Memory',
        }),
      ],
      leftYAxis: { min: 0, max: 100 },
    });

    // ALB Request Count
    const requestsWidget = new cloudwatch.GraphWidget({
      title: 'ALB Request Count',
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApplicationELB',
          metricName: 'RequestCount',
          dimensionsMap: { LoadBalancer: alb.loadBalancerFullName },
          statistic: 'Sum',
          label: 'Requests',
        }),
      ],
    });

    // ALB Response Time
    const latencyWidget = new cloudwatch.GraphWidget({
      title: 'ALB Response Time',
      width: 12,
      height: 6,
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApplicationELB',
          metricName: 'TargetResponseTime',
          dimensionsMap: { LoadBalancer: alb.loadBalancerFullName },
          statistic: 'Average',
          label: 'Avg',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApplicationELB',
          metricName: 'TargetResponseTime',
          dimensionsMap: { LoadBalancer: alb.loadBalancerFullName },
          statistic: 'p99',
          label: 'P99',
        }),
      ],
    });

    this.dashboard.addWidgets(cpuWidget, memoryWidget);
    this.dashboard.addWidgets(requestsWidget, latencyWidget);
  }
}
