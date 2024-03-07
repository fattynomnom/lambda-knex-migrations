import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseSecret,
  ParameterGroup,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import {
  IVpc,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { config, type Env } from "../config";
import { Lambda } from "../constructs/Lambda";
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";

export class AwsCdkStack extends Stack {
  env: Env;

  constructor(scope: Construct, id: string, env: Env, props?: StackProps) {
    super(scope, id, props);

    this.env = env;

    // Uses an existing VPC
    const vpc = Vpc.fromLookup(this, "vpc", { vpcId: config[this.env].vpcId });

    const engine = DatabaseInstanceEngine.postgres({
      version: PostgresEngineVersion.VER_15_3,
    });
    const port = 5432;

    // Create DB credentials
    const dbCredentials = new DatabaseSecret(this, "db-credentials", {
      secretName: "db-credentials",
      username: "root",
    });

    // Create security group for Lambda function
    const lambdaSg = new SecurityGroup(this, "lambda-sg", {
      securityGroupName: "lambda-sg",
      vpc,
      allowAllOutbound: true,
    });

    // Create security group for DB instance
    const dbSg = new SecurityGroup(this, "db-sg", {
      securityGroupName: "db-sg",
      vpc,
      allowAllOutbound: true,
    });
    dbSg.addIngressRule(dbSg, Port.tcp(port));
    dbSg.addIngressRule(
      lambdaSg,
      Port.tcp(port),
      "Allow access from Lambda",
      true
    );
    dbSg.addIngressRule(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(port),
      `Allow for database connection from only within the VPC (${vpc.vpcId})`
    );

    // To fix "no pg_hba.conf entry for host" issue: https://stackoverflow.com/questions/76899023/rds-while-connection-error-no-pg-hba-conf-entry-for-host
    const parameterGroup = new ParameterGroup(this, "db-parameter-group", {
      engine,
      description: "Parameter group for Postgres DB",
      parameters: {
        "rds.force_ssl": "0",
      },
    });

    // Create a Postgres DB instance in RDS
    const dbInstance = new DatabaseInstance(this, "database", {
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: InstanceType.of(
        config[this.env].dbInstanceClass,
        config[this.env].dbInstanceSize
      ),
      engine,
      port,
      securityGroups: [dbSg],
      databaseName: "database_name",
      credentials: Credentials.fromSecret(dbCredentials),
      backupRetention: config[this.env].dbBackupRetention,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      allocatedStorage: config[this.env].dbStorageSizeGB,
      parameterGroup,
    });

    // Create role with privileges to read DB credentials for the DB proxy
    const readSmRole = new Role(this, "db-proxy-role", {
      roleName: "db-proxy-role",
      assumedBy: new ServicePrincipal("rds.amazonaws.com"),
      inlinePolicies: {
        INLINE_POLICY: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["secretsmanager:GetSecretValue"],
              resources: [dbCredentials.secretArn],
            }),
          ],
        }),
      },
    });

    // Create the DB proxy
    const dbProxy = dbInstance.addProxy("db-proxy", {
      secrets: [dbCredentials],
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSg],
      debugLogging: true,
      iamAuth: true,
      role: readSmRole,
    });

    // Creates the Lambda function that performs Knex migrations
    const lambdaConstruct = new Lambda(this, "migrator-function", {
      config: {
        // Note: Error when using NODEJS_LATEST - cannot find module "aws-sdk"
        runtime: Runtime.NODEJS_16_X,
        entry: "src/index.ts",
        timeout: cdk.Duration.minutes(3),
        environment: {
          DB_SECRET_ARN: dbCredentials.secretArn,
        },
        bundling: {
          externalModules: [
            // Excluding dependencies that Lambda has pre-installed
            "aws-sdk",
            "pg-native",
            // Excluding all other dependencies from Knex
            "better-sqlite3",
            "mysql",
            "mysql2",
            "sqlite3",
            "oracledb",
            "pg-query-stream",
            "tedious",
          ],
          commandHooks: {
            // Copies Knex migration files to be bundled together with the Lambda function
            afterBundling: (inputDir: string, outputDir: string): string[] => [
              `cp -r ${inputDir}/src/migrations ${outputDir}/migrations`,
            ],
            beforeBundling: (): string[] => [],
            beforeInstall: (): string[] => [],
          },
        },
        vpc,
        vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [lambdaSg],
      },
      functionName: "migrator-function",
      functionRoleDesc:
        "Performs Knex migrations on the database located in a private VPC",
      functionRoleName: "migrator-function-role",
      managedPolicies: [
        // Needed for the function to access DB located in private VPC, see: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaVPCAccessExecutionRole"
        ),
      ],
    });

    // Grants permissions for Lambda function to access DB credentials
    dbCredentials.grantRead(lambdaConstruct.lambdaFn);

    // Allows the Lambda function to connect to the DB proxy
    dbProxy.grantConnect(lambdaConstruct.lambdaFn, "root");
  }
}
