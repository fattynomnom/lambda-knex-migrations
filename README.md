# Lambda + Knex migrations

This project consists of a AWS CDK app and a BuildKite pipeline.

The CDK app does the following:

- Creates a Postgres database in RDS, hosted on a private VPC
- Creates a Lambda function that runs Knex migrations against the database

and the BuildKite pipeline will deploy the CDK stack and invoke the Lambda function to run migrations.

## Setup

1. Update AWS CDK config in `.awsCdk/config.ts`
1. Install CDK app dependencies via `cd .awsCdk && npm install`
1. Deploy CDK via `cd .awsCdk && cdk deploy STACK_NAME`

## Creating migrations with Knex

1. Run `cd .awsCdk/src && npx knex migrate:make migration_name`
1. Go to the created migration file under `.awsCdk/src/migrations` and update

## Running migrations locally

`cd .awsCdk/src && npx knex migrate:up`

## Invoking migrator function

To invoke your deployed migrator function manually, run command `scripts/invokeLambda.sh` in root directory

## Resources

- [CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)
- [Knex](https://knexjs.org/)
