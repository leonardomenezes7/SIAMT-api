import { env } from "./env"
import fastify from "fastify"
import { newsRoutes } from "./routes/news"
import { conventionsRoutes } from "./routes/conventions"
import fastifyCors from "@fastify/cors"
import fastifyStatic from "@fastify/static"
import path from "path"
import fs from 'fs'

const app = fastify()

const staticDir = path.join(__dirname, 'tmp')
console.log("Diretório estático configurado para:", staticDir)

if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true })
}

app.register(fastifyStatic, {
  root: staticDir,
  prefix: "/images"
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