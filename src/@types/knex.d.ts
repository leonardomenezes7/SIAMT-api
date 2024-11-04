import { Knex } from "knex"

declare module "knex/types/tables" {
  export interface Tables {
    news: {
      id: string,
      title: string,
      author: string,
      description: string,
      image: string,
      created_at: string
    },
    conventions: {
      id: string,
      name: string,
      year: string,
      file: string
    }
  }
}