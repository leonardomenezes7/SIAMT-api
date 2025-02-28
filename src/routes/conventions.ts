import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import path from 'path'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import fastifyMultipart from '@fastify/multipart'
import { env } from '../env'
import fs from "fs"
import fastifyStatic from '@fastify/static'

export async function conventionsRoutes(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })

  // Determinar diretório correto para arquivos
  const uploadDir = env.NODE_ENV === 'production'
    ? path.join(__dirname, '../../build/tmp/uploads') // Caminho na Render Cloud
    : path.join(__dirname, '../public/uploads') // Caminho local

  // Garante que a pasta existe
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  // Configurar Fastify Static para servir arquivos corretamente
  app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
  })

  // 🔹 Rota para Upload
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
        return reply.status(400).send({ message: 'File is required' })
      }

      const filePath = path.join(uploadDir, FileName)
      await fs.promises.writeFile(filePath, FileBuffer)

      console.log(`Arquivo salvo em: ${filePath}`)

      await knex("conventions").insert({
        id: randomUUID(),
        name,
        year,
        file: FileName
      })

      return reply.status(201).send({ message: 'Arquivo enviado com sucesso!' })
    } catch (error) {
      console.error('Erro durante o upload:', error)
      return reply.status(500).send({
        message: 'Erro ao processar a requisição.',
        error: error instanceof Error ? error.message : error,
      })
    }
  })

  // 🔹 Rota para Listar Convenções
  app.get("/", async (request, reply) => {
    try {
      const conventions = await knex("conventions")
        .orderBy("year", "desc")
        .select()

      const baseUrl = env.NODE_ENV === 'production'
        ? 'https://siamt-api.onrender.com/uploads'
        : 'http://localhost:3333/uploads'

      const conventionsWithFiles = conventions.map(convention => ({
        ...convention,
        fileUrl: `${baseUrl}/${convention.file}`
      }))

      return reply.send({ conventions: conventionsWithFiles })
    } catch (error) {
      console.error('Erro ao listar convenções:', error)
      return reply.status(500).send({ message: 'Erro ao buscar convenções' })
    }
  })

  // 🔹 Rota para Download de Arquivos PDF
  app.get('/download/:fileName', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const paramsSchema = z.object({
        fileName: z.string()
      })
  
      const { fileName } = paramsSchema.parse(request.params)
  
      const filePath = path.join(uploadDir, fileName)
  
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ message: 'Arquivo não encontrado' })
      }
  
      // Configurar headers corretos para download
      reply.header('Content-Type', 'application/pdf')
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`)
      reply.header('Content-Transfer-Encoding', 'binary')
      reply.header('Accept-Ranges', 'bytes')
  
      // Retornar arquivo como stream para evitar corrupção
      const fileStream = fs.createReadStream(filePath)
      return reply.send(fileStream)
  
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      return reply.status(500).send({ message: 'Erro ao baixar o arquivo' })
    }
  })
  // 🔹 Rota para Deletar Convenções
  app.delete("/:id", async (request, reply) => {
    try {
      const paramsSchema = z.object({
        id: z.string().uuid()
      })

      const { id } = paramsSchema.parse(request.params)

      const convention = await knex("conventions").where({ id }).first()

      if (!convention) {
        return reply.status(404).send({ message: "Convenção não encontrada!" })
      }

      const filePath = path.join(uploadDir, convention.file)

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath) // Excluir o arquivo do servidor
      }

      await knex("conventions").where({ id }).delete()

      return reply.send({ message: "Convenção deletada com sucesso!" })
    } catch (error) {
      console.error('Erro ao deletar convenção:', error)
      return reply.status(500).send({ message: 'Erro ao deletar convenção' })
    }
  })
}