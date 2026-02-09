import { useNavigate } from "react-router-dom";
export default function PositionCard({ queue }) {
    const statusColor = queue.status === 'SERVING' ? '#22C55E' : '#F59E0B';
    const name = queue.queue.name
    console.log(name)
    const navigate = useNavigate()
    function handleClick() {
        navigate(`/queues/${queue.queueId}/${queue.id}`)
    }
    return (
        <div
            key={queue.queueId}
            className="rounded-xl text-white border p-6 transition-all hover:shadow-lg hover:translate-y-[-2px]"
            style={{
                backgroundColor: '#18181F',
                borderColor: 'rgba(229, 231, 235, 0.1)'
            }}
        >
            <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1 ">
                    {name}
                </h3>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    Joined at {queue.joinedAt}
                </p>
            </div>

            <div
                className="flex items-center gap-3 p-4 rounded-lg mb-4 border-l-4"
                style={{
                    backgroundColor: '#0F0F14',
                    borderLeftColor: statusColor
                }}
            >
                <div>
                    <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                        Your Position
                    </p>
                    <p className="text-3xl font-bold" style={{ color: statusColor }}>
                        {queue.position ? `#${queue.position}` : ``}
                    </p>
                </div>
                <div className="flex-1">
                    <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-black capitalize"
                        style={{ backgroundColor: statusColor }}
                    >
                        {queue.status}
                    </span>
                </div>
            </div>

            <button
                onClick={handleClick}
                className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg text-black"
                style={{ backgroundColor: statusColor }}
            >
                View Details
            </button>
        </div>
    );
}