import { env } from "./env"
import fastify from "fastify"
import { newsRoutes } from "./routes/news"
import { conventionsRoutes } from "./routes/conventions"
import fastifyCors from "@fastify/cors"
import fastifyStatic from "@fastify/static"
import path from "path"
import fs from 'fs'

const tmpDir = path.join(__dirname, 'tmp')

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true })
}

const app = fastify()

const staticDir = env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, "src", "/tmp")

app.register(fastifyStatic, {
  root: staticDir,
  prefix: "/images/"
})

app.register(fastifyCors, {
  origin: "*"
})

app.register(newsRoutes, {
  prefix: "/news"
})

app.register(conventionsRoutes, {
  prefix: "/conventions"
})

app.listen({
  host: "0.0.0.0",
  port: env.PORT
}).then(() => {
  console.log("HTTP Server Running!")
})