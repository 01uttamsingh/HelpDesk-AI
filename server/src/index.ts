import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import prisma from './prisma'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Verify database connection
    await prisma.$queryRaw`SELECT 1`

    res.json({
      status: 'ok',
      database: 'connected',
      message: 'Helpdesk API is running and connected to PostgreSQL (helpdesk)',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database connection error:', error)
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
    })
  }
})

app.listen(PORT, async () => {
  try {
    await prisma.$connect()
    console.log(` Connected to PostgreSQL database (helpdesk)`)
  } catch (err) {
    console.error(` Failed to connect to database:`, err)
  }
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
