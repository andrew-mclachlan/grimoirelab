#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AwsVpcStack } from "../lib/aws-vpc-stack";
import { AwsEcrStack } from "../lib/aws-ecr-stack";
import { AwsEcsStack } from "../lib/aws-ecs-stack";

const app = new cdk.App();

//
// Environment variables
// Should be set in local environment or workflows before running `cdk` commands
const { GRIMOIRE_AWS_ACCOUNT, GRIMOIRE_AWS_REGION } = process.env;

//
// ECR Repository Stack
// Create ECR repository separately out of main stack to avoid unneccessary deletion
new AwsEcrStack(app, "AwsEcrStack", {
  env: { account: `${GRIMOIRE_AWS_ACCOUNT}`, region: `${GRIMOIRE_AWS_REGION}` },
});

//
// VPC Stack separately out of main stack to avoid unneccessary deletion
const vpcStack = new AwsVpcStack(app, "AwsVpcStack", {
  env: { account: `${GRIMOIRE_AWS_ACCOUNT}`, region: `${GRIMOIRE_AWS_REGION}` },
});

//
// ECS Stack with a cluser and tasks
new AwsEcsStack(app, "AwsEcsStack", {
  env: { account: `${GRIMOIRE_AWS_ACCOUNT}`, region: `${GRIMOIRE_AWS_REGION}` },
  vpc: vpcStack.vpc,
  cluster: vpcStack.cluster,
  appLogGroup: vpcStack.appLogGroup,
});
