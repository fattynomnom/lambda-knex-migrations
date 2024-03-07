import { InstanceClass, InstanceSize } from "aws-cdk-lib/aws-ec2";

import { Duration } from "aws-cdk-lib";

export type Env = "staging" | "prod";

interface Config {
  region: string;
  stackName: string;
  accountId: string;
  vpcId: string;
  dbBackupRetention: Duration;
  dbInstanceClass: InstanceClass;
  dbInstanceSize: InstanceSize;
  dbStorageSizeGB: number;
}

export const config: Record<Env, Config> = {
  staging: {
    region: "ap-southeast-2",
    stackName: "rds-database-staging",
    accountId: "account-d",
    vpcId: "vpc-id",
    dbBackupRetention: Duration.days(0),
    dbInstanceClass: InstanceClass.T3,
    dbInstanceSize: InstanceSize.MICRO,
    dbStorageSizeGB: 10,
  },
  prod: {
    region: "ap-southeast-2",
    stackName: "rds-database-prod",
    accountId: "account-d",
    vpcId: "vpc-id",
    dbBackupRetention: Duration.days(30),
    dbInstanceClass: InstanceClass.T4G,
    dbInstanceSize: InstanceSize.LARGE,
    dbStorageSizeGB: 100,
  },
};
