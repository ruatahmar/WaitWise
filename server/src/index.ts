import express from "express";
import "dotenv/config";
import globalErrorHandler from "./middleware/globalErrorHandler.middleware.js";
import queueRouter from "./routes/queues.routes.js"

const PORT = Number(process.env.PORT) || 8000;

const app = express();

app.use("/queues", queueRouter)

//global error handler
app.use(globalErrorHandler)

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});
