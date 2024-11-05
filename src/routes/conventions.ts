import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import path from 'path'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import fastifyMultipart from '@fastify/multipart'
import { env } from '../env'
import fs from "fs"

export async function conventionsRoutes(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, //10 mb
    },
  })

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let name = ''
      let year = ''
      let FileBuffer: Buffer | null = null
      let FileName = ''

      const parts = request.parts()

      for await (const part of parts) {
        if (part.type === 'file') {
          FileBuffer = await part.toBuffer()
          FileName = `${Date.now()}-${part.filename}`
        } else if (part.type === 'field') {
          if (part.fieldname === 'name') name = part.value as string
          if (part.fieldname === 'year') year = part.value as string
        }
      }

      if (!name || !year) {
        return reply.status(400).send({ message: 'Missing required fields' })
      }

      if (!FileBuffer) {
        return reply.status(400).send({ message: 'Image is required' })
      }

      const tmpDir = env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '../tmp')

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      const filePath = path.join(tmpDir, FileName)

      await fs.promises.writeFile(filePath, FileBuffer)
      console.log(`Arquivo salvo em: ${filePath}`)

      await knex("conventions").insert({
        id: randomUUID(),
        name,
        year,
        file: FileName
      })

      return reply.status(201).send()
    } catch (error) {
      console.error('Erro durante o processamento da requisição:', error)
      return reply.status(500).send({
        message: 'An error occurred while processing the request.',
        error: error instanceof Error ? error.message : error,
      })
    }
  })

  app.get("/", async () => {
    const conventions = await knex("conventions")
      .orderBy("year", "desc")
      .select()

    return { conventions }
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