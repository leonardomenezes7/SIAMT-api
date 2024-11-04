var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/server.ts
var import_fastify = __toESM(require("fastify"));

// src/routes/news.ts
var import_promises = require("fs/promises");
var import_path = require("path");
var import_multipart = __toESM(require("@fastify/multipart"));

// src/database.ts
var import_knex = require("knex");
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
async function newsRoutes(app2) {
  app2.register(import_multipart.default, {
    limits: {
      fileSize: 10 * 1024 * 1024
      //10mb
    }
  });
  app2.post("/", async (request, reply) => {
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
  app2.get("/:id", async (request) => {
    const paramsSchema = import_zod2.z.object({
      id: import_zod2.z.string().uuid()
    });
    const { id } = paramsSchema.parse(request.params);
    const news = await knex("news").where({ id }).first();
    return { news };
  });
  app2.get("/", async (request, reply) => {
    const allNews = await knex("news").orderBy("created_at", "desc").select();
    const newsWithImages = allNews.map((news) => ({
      ...news,
      imageUrl: `http://localhost:3333/images/${news.image}`
    }));
    return reply.send({ allNews: newsWithImages });
  });
  app2.delete("/:id", async (request, reply) => {
    const paramsSchema = import_zod2.z.object({
      id: import_zod2.z.string().uuid()
    });
    const { id } = paramsSchema.parse(request.params);
    await knex("news").where({ id }).delete();
    return reply.send({ message: "Not\xEDcia deletada com sucesso!" });
  });
}

// src/routes/conventions.ts
var import_promises2 = require("fs/promises");
var import_path2 = require("path");
var import_node_crypto2 = require("crypto");
var import_zod3 = require("zod");
var import_multipart2 = __toESM(require("@fastify/multipart"));
async function conventionsRoutes(app2) {
  app2.register(import_multipart2.default, {
    limits: {
      fileSize: 10 * 1024 * 1024
      //10mb
    }
  });
  app2.post("/", async (request, reply) => {
    try {
      let name = "";
      let year = "";
      let FileBuffer = null;
      let FileName = "";
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          FileBuffer = await part.toBuffer();
          FileName = `${Date.now()}-${part.filename}`;
        } else if (part.type === "field") {
          if (part.fieldname === "name") name = part.value;
          if (part.fieldname === "year") year = part.value;
        }
      }
      if (!name || !year) {
        return reply.status(400).send({ message: "Missing required fields" });
      }
      if (!FileBuffer) {
        return reply.status(400).send({ message: "Image is required" });
      }
      const filePath = (0, import_path2.join)(__dirname, "..", "..", "tmp", FileName);
      await (0, import_promises2.writeFile)(filePath, FileBuffer);
      await knex("conventions").insert({
        id: (0, import_node_crypto2.randomUUID)(),
        name,
        year,
        file: FileName
      });
      return reply.status(201).send();
    } catch (error) {
      console.error("Erro durante o processamento da requisi\xE7\xE3o:", error);
      return reply.status(500).send({
        message: "An error occurred while processing the request.",
        error: error instanceof Error ? error.message : error
      });
    }
  });
  app2.get("/", async () => {
    const conventions = await knex("conventions").select();
    return { conventions };
  });
  app2.delete("/:id", async (request, reply) => {
    const paramsSchema = import_zod3.z.object({
      id: import_zod3.z.string().uuid()
    });
    const { id } = paramsSchema.parse(request.params);
    await knex("conventions").where({ id }).delete();
    return reply.send({ message: "Conven\xE7\xE3o deletada com sucesso!" });
  });
}

// src/server.ts
var import_cors = __toESM(require("@fastify/cors"));
var import_static = __toESM(require("@fastify/static"));
var import_path3 = __toESM(require("path"));
var app = (0, import_fastify.default)();
app.register(import_static.default, {
  root: import_path3.default.join(__dirname, "../tmp"),
  prefix: "/images"
});
app.register(import_cors.default, {
  origin: "*"
});
app.register(newsRoutes, {
  prefix: "/news"
});
app.register(conventionsRoutes, {
  prefix: "/conventions"
});
app.listen({
  host: "0.0.0.0",
  port: env.PORT
}).then(() => {
  console.log("HTTP Server Running!");
});
