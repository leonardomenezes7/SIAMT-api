import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fastifyMultipart from '@fastify/multipart'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import { env } from '../env'

export async function conventionsRoutes(app: FastifyInstance) {
  // Registra o plugin para uploads via multipart
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })

  // Rota para upload de PDF (POST /conventions)
  app.post('/conventions', async (request: FastifyRequest, reply: FastifyReply) => {
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

      // Usa a mesma estrutura que no news.ts para definir o diretório tmp
      const tmpDir = env.NODE_ENV === 'production'
        ? path.join(__dirname, 'tmp') // Em produção, __dirname aponta para build/tmp
        : path.join(__dirname, 'tmp')

      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      const filePath = path.join(tmpDir, pdfFileName)
      await fs.promises.writeFile(filePath, pdfFileBuffer)
      console.log(`Arquivo salvo em: ${filePath}`)

      // Insere o registro no banco de dados (ajuste o nome da tabela se necessário)
      await knex('conventions').insert({
        id: randomUUID(),
        title,
        year,
        file: pdfFileName,
      })

      return reply.status(201).send({
        message: 'PDF uploaded successfully!',
        data: { title, year, file: pdfFileName },
      })
    } catch (error) {
      console.error('Erro durante o processamento da requisição:', error)
      return reply.status(500).send({
        message: 'An error occurred while processing the request.',
        error: error instanceof Error ? error.message : error,
      })
    }
  })

  // Rota para listar todas as convenções (GET /conventions)
  app.get('/conventions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const allConventions = await knex('conventions')
        .select('*')
        .orderBy('created_at', 'desc')

      // Define a URL base para download; ajuste conforme seu domínio
      const baseUrl = env.NODE_ENV === 'production'
        ? 'https://siamt-api.onrender.com'
        : 'http://localhost:3333'

      const conventionsWithFiles = allConventions.map(convention => ({
        ...convention,
        downloadUrl: `${baseUrl}/conventions/download/${convention.file}`
      }))

      return reply.send({ conventions: conventionsWithFiles })
    } catch (error) {
      console.error('Error fetching conventions:', error)
      return reply.status(500).send({ message: 'Internal Server Error' })
    }
  })

  // Rota para download do PDF (GET /conventions/download/:filename)
  app.get('/conventions/download/:filename', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const paramsSchema = z.object({
        filename: z.string(),
      })
      const { filename } = paramsSchema.parse(request.params)

      const tmpDir = env.NODE_ENV === 'production'
        ? path.join(__dirname, 'tmp')
        : path.join(__dirname, 'tmp')
      const filePath = path.join(tmpDir, filename)

      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ message: 'File not found' })
      }

      reply.header('Content-Type', 'application/pdf')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      const fileBuffer = await fs.promises.readFile(filePath)
      return reply.send(fileBuffer)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      return reply.status(500).send({ message: 'Internal Server Error' })
    }
  })

  // Rota para exclusão de uma convenção (DELETE /conventions/:id)
  app.delete('/conventions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      })
      const { id } = paramsSchema.parse(request.params)

      const convention = await knex('conventions').where({ id }).first()
      if (!convention) {
        return reply.status(404).send({ message: 'Convention not found' })
      }

      const tmpDir = env.NODE_ENV === 'production'
        ? path.join(__dirname, 'tmp')
        : path.join(__dirname, 'tmp')
      const filePath = path.join(tmpDir, convention.file)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      await knex('conventions').where({ id }).delete()
      return reply.send({ message: 'Convention deleted successfully' })
    } catch (error) {
      console.error('Error deleting convention:', error)
      return reply.status(500).send({ message: 'Internal Server Error' })
    }
  })
}