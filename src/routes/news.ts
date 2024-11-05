import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fastifyMultipart from '@fastify/multipart'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import { env } from '../env'

export async function newsRoutes(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, //10mb
    },
  })
  
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let title = ''
      let description = ''
      let author = ''
      let imageFileBuffer: Buffer | null = null;
      let imageFileName = ''

      const parts = request.parts()

      for await (const part of parts) {
        if (part.type === 'file') {
          imageFileBuffer = await part.toBuffer()
          imageFileName = `${Date.now()}-${part.filename}`
        } else if (part.type === 'field') {
          if (part.fieldname === 'title') title = part.value as string
          if (part.fieldname === 'description') description = part.value as string
          if (part.fieldname === 'author') author = part.value as string
        }
      }

      if (!title || !description || !author) {
        return reply.status(400).send({ message: 'Missing required fields' })
      }

      if (!imageFileBuffer) {
        return reply.status(400).send({ message: 'Image is required' })
      }

      const tmpDir = env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '../tmp')

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      const filePath = path.join(tmpDir, imageFileName)
      await fs.promises.writeFile(filePath, imageFileBuffer)
      console.log(`Arquivo salvo em: ${filePath}`)

      await knex("news").insert({
        id: randomUUID(),
        title,
        description,
        author,
        image: imageFileName
      })

      return reply.status(201).send({
        message: 'News created successfully!',
        data: {
          title,
          description,
          author,
          image: imageFileName,
        },
      })
    } catch (error) {
      console.error('Erro durante o processamento da requisição:', error)
      return reply.status(500).send({
        message: 'An error occurred while processing the request.',
        error: error instanceof Error ? error.message : error,
      })
    }
  })

  app.get("/:id", async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = paramsSchema.parse(request.params)

    const news = await knex("news").where({ id }).first()

    return { news }
  })

  app.get("/", async (request, reply: FastifyReply) => {
    const allNews = await knex("news")
      .orderBy("created_at", "desc")
      .select()

    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://siamt-api.onrender.com/uploads' // prefixo do fastify-static
      : 'http://localhost:3333/uploads'

    const newsWithImages = allNews.map(news => ({
      ...news,
      imageUrl: `${baseUrl}/${news.image}`
    }))
  
    return reply.send({ allNews: newsWithImages })
  })

  app.delete("/:id", async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = paramsSchema.parse(request.params)

    await knex("news").where({ id }).delete()

    return reply.send({ message: "Notícia deletada com sucesso!" })
  })
}