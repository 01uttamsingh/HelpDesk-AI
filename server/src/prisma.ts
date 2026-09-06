import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prioritize test environment variables when NODE_ENV is test
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true })
  dotenv.config({ path: path.resolve(process.cwd(), 'server/.env.test'), override: true })
}
dotenv.config()

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

export const prisma = new PrismaClient({ adapter })

export default prisma
