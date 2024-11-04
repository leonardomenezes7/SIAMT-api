import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("conventions", (table) => {
    table.uuid("id").primary()
    table.text("name").notNullable()
    table.text("year").notNullable()
    table.text("file").notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("conventions")
}