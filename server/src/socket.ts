import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

export function initSocket(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173", // frontend
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("socket connected:", socket.id);

        socket.on("joinQueueUser", ({ queueUserId }) => {
            socket.join(`queueUser:${queueUserId}`);
            console.log(`joined queueUser:${queueUserId}`);
        });

        socket.on("leaveQueueUser", ({ queueUserId }) => {
            socket.leave(`queueUser:${queueUserId}`);
            console.log(`left queueUser:${queueUserId}`);
        });

        socket.on("joinQueue", ({ queueId }) => {
            socket.join(`queue:${queueId}`);
            console.log(`joined queue:${queueId}`)
        });

        socket.on("leaveQueue", ({ queueId }) => {
            socket.join(`queue:${queueId}`);
            console.log(`joined queue:${queueId}`)
        });

        socket.on("disconnect", () => {
            console.log("socket disconnected:", socket.id);
        });
    });

    return io;
}
