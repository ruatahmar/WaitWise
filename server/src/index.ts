import http from "http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors"
import "dotenv/config";
import cookieParser from "cookie-parser"
import globalErrorHandler from "./middleware/globalErrorHandler.middleware.js";
import queueRouter from "./routes/v1/queues.routes.js"
import authRouter from "./routes/v1/auth.routes.js"
import { jwtAuth } from "./middleware/jwtAuth.js";

const PORT = Number(process.env.PORT) || 8000;

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());

//routes
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/queues", queueRouter)

//global error handler
app.use(globalErrorHandler)

app.get("/jwtTest", jwtAuth, () => {
    console.log("successful")
    return
})

// const httpServer = http.createServer(app);

// export const io = new Server(httpServer, {
//     cors: {
//         origin: "*", // lock this down later
//     },
// });
// io.on("connection", (socket) => {
//     console.log("Socket connected:", socket.id);
// });

// httpServer.listen(3000, () => {
//     console.log("Server running");
// });


import { initSocket } from "./socket.js";

const server = http.createServer(app);

export const io = initSocket(server);

server.listen(8080, () => {
    console.log("server running on 8080");
});
