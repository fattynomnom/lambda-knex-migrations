/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {
  IManagedPolicy,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";

import { Construct } from "constructs";
import { Permission } from "aws-cdk-lib/aws-lambda";

export interface LambdaProps {
  policyStatements?: PolicyStatement[];
  managedPolicies?: IManagedPolicy[];
  permissions?: Permission[];
  functionName: string;
  functionRoleDesc: string;
  functionRoleName: string;
  config: NodejsFunctionProps;
}

export class Lambda extends Construct {
  lambdaFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id);

    const inlinePolicyDoc = new PolicyDocument();
    if (props.policyStatements && props.policyStatements.length > 0) {
      props.policyStatements.forEach((policyStatement) => {
        inlinePolicyDoc.addStatements(policyStatement);
      });
    }

    if (props.managedPolicies && props.managedPolicies.length > 0) {
      props.managedPolicies.push(
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        )
      );
    } else {
      props.managedPolicies = [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ];
    }

    const execRole = new Role(this, props.functionRoleName, {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      description: props.functionRoleDesc,
      managedPolicies: props.managedPolicies,
      inlinePolicies:
        props.policyStatements && props.policyStatements.length > 0
          ? {
              INLINE_POLICY: inlinePolicyDoc,
            }
          : undefined,
      roleName: props.functionRoleName,
    });

    const l = new NodejsFunction(this, props.functionName, {
      ...props.config,
      role: execRole,
      functionName: props.functionName,
    });
    this.lambdaFn = l;

    if (props.permissions && props.permissions.length > 0) {
      let index = 1;
      props.permissions.forEach((permission) => {
        l.addPermission("lambda_permission_" + index, permission);
        index++;
      });
    }
  }
}
