import { useNavigate } from "react-router-dom"

export default function QueuesCard({ queue }) {
    const navigate = useNavigate()
    function handleClick() {
        navigate(`/queues/${queue.id}/`)
    }
    return (
        <>
            <div
                key={queue.id}
                className="rounded-xl border p-6 transition-all hover:shadow-lg hover:translate-y-[-2px] text-white"
                style={{
                    backgroundColor: '#18181F',
                    borderColor: 'rgba(229, 231, 235, 0.1)'
                }}
            >
                <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-1">
                        {queue.name}
                    </h3>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        Created on {queue.createdAt}
                    </p>
                </div>

                <div
                    className="grid grid-cols-2 gap-3 mb-4 p-4 rounded-lg"
                    style={{ backgroundColor: '#0F0F14' }}
                >
                    <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                            In Queue
                        </p>
                        <p className="text-2xl font-bold" style={{ color: '#22C55E' }}>
                            {queue.count}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                            Grace Time
                        </p>
                        <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                            {queue.graceTime}m
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleClick}
                    className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg"
                    style={{
                        backgroundColor: '#22C55E',
                        color: '#0F0F14'
                    }}
                >
                    Manage Queue
                </button>
            </div>
        </>
    )
}