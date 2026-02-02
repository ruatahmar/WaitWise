import { io } from "socket.io-client";

export const socket = io("http://localhost:8080", {
    withCredentials: true,
    autoConnect: false,
});
socket.on("connect", () => {
    console.log("Connected to WS server", socket.id);

    // Example: join a queue room
});

// socket.emit("joinQueue", { queueId: 123, userId: 456 });
// // Listen for messages from server
// socket.on("queueUpdate", (data) => {
//     console.log("Queue update:", data);
// });

// Optional: handle disconnect/reconnect
socket.on("disconnect", () => {
    console.log("Disconnected from server");
});