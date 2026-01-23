import { Pool } from 'pg'
import "dotenv/config"
import ApiError from '../utils/apiError.js'

const pool = new Pool({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: process.env.DB_PASSWORD,
    database: "WaitWise",
    max: 10,
    idleTimeoutMillis: 30000  //this is like maximum allowed time in waiting queue
})

const connectDb = async () => {
    try {
        await pool.connect()
        console.log("Database successfully connected")
    } catch (error) {
        console.error(error)
        throw new ApiError(503, `Database service unavailable`)
    }
}

export { connectDb, pool };