import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser"
import globalErrorHandler from "./middleware/globalErrorHandler.middleware.js";
import queueRouter from "./routes/v1/queues.routes.js"
import authRouter from "./routes/v1/auth.routes.js"
import { jwtAuth } from "./middleware/jwtAuth.js";

const PORT = Number(process.env.PORT) || 8000;

const app = express();

app.use(express.json());
app.use(cookieParser());

//routes
app.use("/api/v1/queues", queueRouter)
app.use("/api/v1/auth", authRouter)

//global error handler
app.use(globalErrorHandler)

app.get("/jwtTest", jwtAuth, ()=>{
    console.log("successful")
    return
} )

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});
