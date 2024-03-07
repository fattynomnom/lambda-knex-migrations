#!/usr/bin/env node

import "source-map-support/register";

import * as cdk from "aws-cdk-lib";

import { AwsCdkStack } from "../lib/.aws-cdk-stack";
import { config } from "../config";

const app = new cdk.App();

new AwsCdkStack(app, config.prod.stackName, "prod", {
  env: { region: config.prod.region, account: config.prod.accountId },
});

new AwsCdkStack(app, config.staging.stackName, "staging", {
  env: {
    region: config.staging.region,
    account: config.staging.accountId,
  },
});
