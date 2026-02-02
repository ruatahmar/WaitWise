import { useNavigate } from "react-router-dom"

export default function QueuesCard({ name, status, position, queueUserId, queueId }) {
    const navigate = useNavigate()
    function handleClick() {
        navigate(`/queues/${queueId}/${queueUserId}`)
    }
    return (
        <>
            <div onClick={handleClick} className="flex flex-col p-10 border h-50 w-80 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg">
                <h1 className="font-bold text-3xl">{name}</h1>
                <h1 className="text-sm ">{status}</h1>
                <h1 className="text-sm ">{position}</h1>
                <h1>{queueId}</h1>
            </div>
        </>
    )
}