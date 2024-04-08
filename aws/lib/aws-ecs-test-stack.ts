import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";

interface AwsEcsTestStackProps extends cdk.StackProps {
  readonly vpc: ec2.Vpc;
  readonly cluster: ecs.Cluster;
  readonly appLogGroup: logs.ILogGroup;
  readonly securityGroup: ec2.SecurityGroup;
}

export class AwsEcsTestStack extends cdk.Stack {
  public readonly ecsService6: ecsPatterns.ApplicationLoadBalancedFargateService;

  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps & AwsEcsTestStackProps
  ) {
    super(scope, id, props);

    //
    // Task Definition for ECS fargate service running the mordred application
    const taskDefinition6 = new ecs.TaskDefinition(
      this,
      "grimoire-app-test-task-definition",
      {
        cpu: "256",
        memoryMiB: "512",
        compatibility: ecs.Compatibility.FARGATE,
      }
    );

    taskDefinition6.addContainer("grimoire-app-test-container", {
      containerName: this.resourceName("test"),
      image: ecs.ContainerImage.fromRegistry("httpd:2.4"),
      command: [
        "/bin/sh -c \"echo '<html> <head> <title>Amazon ECS Sample App</title> <style>body {margin-top: 40px; background-color: #333;} </style> </head><body> <div style=color:white;text-align:center> <h1>Amazon ECS Sample App</h1> <h2>Congratulations!</h2> <p>Your application is now running on a container in Amazon ECS.</p> </div></body></html>' >  /usr/local/apache2/htdocs/index.html && httpd-foreground\"",
      ],
      entryPoint: ["sh", "-c"],
      essential: true,
      portMappings: [
        {
          containerPort: 80,
          hostPort: 80,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: ecs.LogDrivers.awsLogs({
        logGroup: props.appLogGroup,
        streamPrefix: "grimoire-test",
      }),
    });

    this.ecsService6 = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "grimoire-app-test-service",
      {
        cluster: props.cluster,
        loadBalancerName: this.resourceName("app-test-lb"),
        propagateTags: ecs.PropagatedTagSource.SERVICE,
        protocol: ApplicationProtocol.HTTP,
        publicLoadBalancer: true,
        serviceName: this.resourceName("test"),
        healthCheckGracePeriod: cdk.Duration.minutes(3),
        taskDefinition: taskDefinition6,
        taskSubnets: this.privateSubnetSelection(props.vpc),
        openListener: false,
      }
    );

    this.ecsService6.service.enableServiceConnect({
      services: [],
      namespace: props.cluster.defaultCloudMapNamespace?.namespaceName,
    });

    // `openListener` is set to false, so we need to
    // add Security Group rule for Application Load Balancer explicitly
    this.ecsService6.loadBalancer.connections.allowFrom(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(80)
    );

    //
    // Allow from everywhere!!
    this.ecsService6.loadBalancer.connections.allowFrom(
      ec2.Peer.ipv4("0.0.0.0/0"),
      ec2.Port.tcp(80)
    );
  }

  // resourceName is a common method for AWS resource naming
  private resourceName(name: string): string {
    return `grimoire-${name}`;
  }

  // privateSubnetSelection returns a selection of subnets in the vpc with type PRIVATE
  private privateSubnetSelection(vpc: ec2.Vpc) {
    return vpc.selectSubnets({
      subnetGroupName: this.resourceName("vpc-private"),
    });
  }
}
