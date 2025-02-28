import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fastifyMultipart from '@fastify/multipart'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import { env } from '../env'

export async function conventionsRoutes(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let title = ''
      let year = ''
      let pdfFileBuffer: Buffer | null = null
      let pdfFileName = ''

      const parts = request.parts()

      for await (const part of parts) {
        if (part.type === 'file') {
          pdfFileBuffer = await part.toBuffer()
          pdfFileName = `${Date.now()}-${part.filename}`
        } else if (part.type === 'field') {
          if (part.fieldname === 'title') title = part.value as string
          if (part.fieldname === 'year') year = part.value as string
        }
      }

      if (!title || !year) {
        return reply.status(400).send({ message: 'Missing required fields' })
      }

      if (!pdfFileBuffer) {
        return reply.status(400).send({ message: 'PDF file is required' })
      }

      // Diretório onde os arquivos serão salvos
      const tmpDir = env.NODE_ENV === 'production'
        ? path.join('/opt/render/project/src/src/tmp') // Caminho correto no ambiente de produção
        : path.join(__dirname, 'tmp') // Caminho local

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      const filePath = path.join(tmpDir, pdfFileName)
      await fs.promises.writeFile(filePath, pdfFileBuffer)
      console.log(`Arquivo salvo em: ${filePath}`)

      await knex("conventions").insert({
        id: randomUUID(),
        title,
        year,
        file: pdfFileName
      })

      return reply.status(201).send({
        message: 'PDF uploaded successfully!',
        data: {
          title,
          year,
          file: pdfFileName,
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

  app.get("/", async (request, reply: FastifyReply) => {
    const allConventions = await knex("conventions")
      .orderBy("year", "desc")
      .select()

    const baseUrl = env.NODE_ENV === 'production'
      ? 'https://siamt-api.onrender.com/uploads' // Prefixo configurado no fastify-static
      : 'http://localhost:3333/uploads'

    const conventionsWithFiles = allConventions.map(convention => ({
      ...convention,
      fileUrl: `${baseUrl}/${convention.file}`
    }))
  
    return reply.send({ conventions: conventionsWithFiles })
  })

  app.delete("/:id", async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = paramsSchema.parse(request.params)

    await knex("conventions").where({ id }).delete()

    return reply.send({ message: "Convenção deletada com sucesso!" })
  })
}