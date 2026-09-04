import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Ensure environment variables are loaded via dotenv
dotenv.config()

export const prisma = new PrismaClient()

export default prisma
