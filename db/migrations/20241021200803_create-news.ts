import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("news", (table) => {
    table.uuid("id").primary()
    table.text("title").notNullable()
    table.text("author").notNullable()
    table.text("description").notNullable()
    table.text("image").notNullable()
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("news")
}