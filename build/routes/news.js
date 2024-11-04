var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/routes/news.ts
var news_exports = {};
__export(news_exports, {
  newsRoutes: () => newsRoutes
});
module.exports = __toCommonJS(news_exports);
var import_promises = require("fs/promises");
var import_path = require("path");
var import_multipart = __toESM(require("@fastify/multipart"));

// src/database.ts
var import_knex = require("knex");

// src/env/index.ts
var import_config = require("dotenv/config");
var import_zod = require("zod");
var envSchema = import_zod.z.object({
  NODE_ENV: import_zod.z.enum(["development", "test", "production"]).default("production"),
  DATABASE_URL: import_zod.z.string().refine((value) => value.trim() !== ""),
  PORT: import_zod.z.coerce.number().default(3333)
});
var _env = envSchema.safeParse(process.env);
if (_env.success === false) {
  console.error("\u26A0\uFE0F Invalid environment variables!", _env.error.format());
  throw new Error("\u26A0\uFE0F Invalid environment variables!");
}
var env = _env.data;

// src/database.ts
var config = {
  client: "sqlite",
  connection: {
    filename: env.DATABASE_URL
  },
  migrations: {
    extension: "ts",
    directory: "./db/migrations"
  },
  useNullAsDefault: true
};
var knex = (0, import_knex.knex)(config);

// src/routes/news.ts
var import_node_crypto = require("crypto");
var import_zod2 = require("zod");
async function newsRoutes(app) {
  app.register(import_multipart.default, {
    limits: {
      fileSize: 10 * 1024 * 1024
      //10mb
    }
  });
  app.post("/", async (request, reply) => {
    try {
      let title = "";
      let description = "";
      let author = "";
      let imageFileBuffer = null;
      let imageFileName = "";
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          imageFileBuffer = await part.toBuffer();
          imageFileName = `${Date.now()}-${part.filename}`;
        } else if (part.type === "field") {
          if (part.fieldname === "title") title = part.value;
          if (part.fieldname === "description") description = part.value;
          if (part.fieldname === "author") author = part.value;
        }
      }
      if (!title || !description || !author) {
        return reply.status(400).send({ message: "Missing required fields" });
      }
      if (!imageFileBuffer) {
        return reply.status(400).send({ message: "Image is required" });
      }
      const filePath = (0, import_path.join)(__dirname, "..", "..", "tmp", imageFileName);
      await (0, import_promises.writeFile)(filePath, imageFileBuffer);
      await knex("news").insert({
        id: (0, import_node_crypto.randomUUID)(),
        title,
        description,
        author,
        image: imageFileName
      });
      return reply.status(201).send({
        message: "News created successfully!",
        data: {
          title,
          description,
          author,
          image: imageFileName
        }
      });
    } catch (error) {
      console.error("Erro durante o processamento da requisi\xE7\xE3o:", error);
      return reply.status(500).send({
        message: "An error occurred while processing the request.",
        error: error instanceof Error ? error.message : error
      });
    }
  });
  app.get("/:id", async (request) => {
    const paramsSchema = import_zod2.z.object({
      id: import_zod2.z.string().uuid()
    });
    const { id } = paramsSchema.parse(request.params);
    const news = await knex("news").where({ id }).first();
    return { news };
  });
  app.get("/", async (request, reply) => {
    const allNews = await knex("news").orderBy("created_at", "desc").select();
    const newsWithImages = allNews.map((news) => ({
      ...news,
      imageUrl: `http://localhost:3333/images/${news.image}`
    }));
    return reply.send({ allNews: newsWithImages });
  });
  app.delete("/:id", async (request, reply) => {
    const paramsSchema = import_zod2.z.object({
      id: import_zod2.z.string().uuid()
    });
    const { id } = paramsSchema.parse(request.params);
    await knex("news").where({ id }).delete();
    return reply.send({ message: "Not\xEDcia deletada com sucesso!" });
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  newsRoutes
});
