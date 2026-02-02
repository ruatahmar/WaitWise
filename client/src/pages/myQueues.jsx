import { useEffect, useState } from "react";
import { NavBar } from "../components/navBar";
import { getAllTickets } from "../api/queueApi";
import QueuesCard from "../components/queueCards";

export default function MyQueues() {
    const [queues, setQueues] = useState([])
    useEffect(() => {
        const fetchAllQueues = async () => {
            const res = await getAllTickets()
            console.log(res)
            setQueues(res.data.data)
        }
        fetchAllQueues();

    }, [])
    return (
        <>
            <NavBar />
            <h1 className="text-xl my-10">My Queues</h1>
            <div className="grid grid-cols-4 gap-3 place-items-center">
                {queues.map((queue) => {
                    return <QueuesCard key={queue.id} name={queue.queue.name} status={queue.status} queueUserId={queue.id} queueId={queue.queueId} />
                })}



            </div>
        </>
    )
}