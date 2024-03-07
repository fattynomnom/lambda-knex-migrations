import type { Knex } from "knex";

const config: Knex.Config = {
  client: "postgresql",
  migrations: {
    tableName: "knex_migrations",
    extension: "js",
    directory: "migrations",
    disableTransactions: false,
  },
};

module.exports = config;
