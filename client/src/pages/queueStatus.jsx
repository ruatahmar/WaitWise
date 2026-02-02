import { useEffect, useState } from "react"
import { getQueueStatus } from "../api/queueApi"
import { useParams } from "react-router-dom"
import { socket } from "../socket";

export function QueueStatus() {
    const [status, setStatus] = useState({})
    const { queueUserId, queueId } = useParams()
    const qid = Number(queueId);
    const quid = Number(queueUserId);
    useEffect(() => {
        async function getStatus() {
            const res = await getQueueStatus(qid)
            console.log(res.data.data)
            setStatus(res.data.data)
        }
        getStatus()
    }, [qid])

    useEffect(() => {
        if (!quid) return;
        socket.connect()
        socket.emit("joinQueueUser", { queueUserId: quid });
        console.log("entered")
        const onQueueUpdate = (payload) => {
            console.log("UPDATE RECEIVED", payload)
            setStatus(prev => ({
                ...prev,
                ...payload,
            }));
        };

        const onYourTurn = () => (payload) => {
            console.log("UPDATE RECEIVED", payload)
            alert("It's your turn!")
            console.log(payload)
            setStatus(prev => ({
                ...prev,
                ...payload,
            }));
        };

        socket.on("queueUpdate", onQueueUpdate);
        socket.on("yourTurn", onYourTurn);
        console.log(status)

        return () => {
            socket.emit("leaveQueueUser", { queueUserId: quid });
            socket.off("queueUpdate", onQueueUpdate);
            socket.off("yourTurn", onYourTurn);
        };
    }, [quid]);

    if (!status) return <h1>Loading...</h1>;


    return (
        <>
            <h1>Status: {status.status}</h1>
            <h1>Position: {status.position}</h1>
            <h1>Token: {status.token}</h1>
            <h1>priorityBoost: {status.priorityBoost}</h1>
            <h1></h1>
            <h1></h1>
        </>
    )
}