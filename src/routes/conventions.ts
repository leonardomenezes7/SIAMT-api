import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import path from 'path'
import { knex } from '../database'
import { env } from '../env'
import fs from "fs"
import { z } from 'zod' // <-- Adicione esta linha

export async function conventionsRoutes(app: FastifyInstance) {
  // Rota para Download de arquivos PDF
  app.get('/download/:fileName', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const paramsSchema = z.object({
        fileName: z.string()
      })

      const { fileName } = paramsSchema.parse(request.params)

      // Determinar o diretório correto do ambiente
      const uploadDir = env.NODE_ENV === 'production'
        ? path.join(__dirname, '../../public/uploads') // Caminho corrigido para build no Render
        : path.join(__dirname, '../public/uploads') // Caminho local em dev

      const filePath = path.join(uploadDir, fileName)

      // Verifica se o arquivo existe
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ message: 'Arquivo não encontrado' })
      }

      // Configura headers corretos para download do arquivo
      reply.header('Content-Type', 'application/pdf')
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`)

      // Retorna o arquivo como stream para evitar corrupção
      const fileStream = fs.createReadStream(filePath)
      return reply.send(fileStream)

    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      return reply.status(500).send({ message: 'Erro ao baixar o arquivo' })
    }
  })
}