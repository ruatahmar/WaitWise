import express from "express";
import "dotenv/config";
import { connectDb } from "./config/db.js";
import globalErrorHandler from "./middleware/globalErrorHandler.middleware.js";
import queueRouter from "./routes/queues.routes.js"

const PORT = Number(process.env.PORT) || 8000;

const app = express();

app.use("/queues", queueRouter)

//global error handler
app.use(globalErrorHandler)

await connectDb()
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});
