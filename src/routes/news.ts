import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import fastifyMultipart from '@fastify/multipart'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import path from 'path'

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

      const tmpDir = path.join(__dirname, '../../tmp')

      const filePath = path.join(tmpDir, imageFileName)

      await writeFile(filePath, imageFileBuffer);

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

    const newsWithImages = allNews.map(news => ({
      ...news,
      imageUrl: `http://localhost:3333/images/${news.image}`
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