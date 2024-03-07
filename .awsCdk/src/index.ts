import * as AWS from "aws-sdk";

import knex from "knex";

export const handler = async (): Promise<any> => {
  const dbSecretArn = process.env.DB_SECRET_ARN || "";
  const secretManager = new AWS.SecretsManager({
    region: "ap-southeast-2",
  });
  const secretParams: AWS.SecretsManager.GetSecretValueRequest = {
    SecretId: dbSecretArn,
  };
  const dbSecret = await secretManager.getSecretValue(secretParams).promise();
  const secretString = dbSecret.SecretString || "";
  if (!secretString) {
    throw new Error("secret string is empty");
  }

  const { host, port, username, password, dbname } = JSON.parse(secretString);

  const knexClient = knex({
    client: "pg",
    connection: {
      host,
      port,
      user: username,
      password,
      database: dbname,
    },
  });
  const res = await knexClient.migrate.up({
    tableName: "knex_migrations",
    extension: "js",
    directory: "migrations",
    disableTransactions: false,
  });
};
