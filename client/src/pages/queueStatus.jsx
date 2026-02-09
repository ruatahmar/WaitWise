import { useEffect, useState } from "react"
import { getQueueStatus, leaveQueue, rejoinQueue } from "../api/queueApi"
import { useParams } from "react-router-dom"
import { socket } from "../socket";
import { NavBar } from "../components/navBar";
import formatExpireTime from "../utils/formateExpiryAt";

export function QueueStatus() {
    const [queue, setQueue] = useState({})
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const { queueUserId, queueId } = useParams()
    const qid = Number(queueId);
    const quid = Number(queueUserId);
    useEffect(() => {
        async function getStatus() {
            const res = await getQueueStatus(qid)
            console.log(res.data.data)
            setQueue(res.data.data)
            setName(res.data.data.queue.name)
        }
        getStatus()
    }, [qid])

    useEffect(() => {
        if (!quid) return;
        socket.connect()
        socket.emit("joinQueueUser", { queueUserId: quid });
        const onUserStatusUpdate = (payload) => {
            console.log("UPDATE RECEIVED", payload)
            setQueue(prev => ({
                ...prev,
                ...payload,
            }));
        };
        socket.on("userStatusUpdate", onUserStatusUpdate);
        return () => {
            socket.emit("leaveQueueUser", { queueUserId: quid });
            socket.off("userStatusUpdate", onUserStatusUpdate);
        };
    }, [quid]);
    // Handle refresh 
    const handleRefresh = async () => {
        setLoading(true)
        try {
            const res = await getQueueStatus(qid)
            console.log(res)
            setQueue(res.data.data)
        } catch (error) {
            console.error("Failed to refresh queue status", error)
        } finally {
            setLoading(false)
        }
    }
    // Handle leave queue
    const handleLeave = async () => {
        setLoading(true)
        try {
            await leaveQueue(qid)
        } catch (error) {
            console.error("Failed to leave queue", error)
        } finally {
            setLoading(false)
        }
    }
    // Handle rejoin queue
    const handleRejoin = async () => {
        setLoading(true)
        try {
            await rejoinQueue(qid)
        } catch (error) {
            console.error("Failed to rejoin queue", error)
        } finally {
            setLoading(false)
        }
    }

    const canRejoin = queue.status === 'MISSED' || queue.status === 'CANCELLED'

    if (!queue) return <h1>Loading...</h1>;


    return (
        <>
            <NavBar />
            <div className="p-8 md:p-10 max-w-4xl mx-auto text-white">
                <div className="mb-8 text-black">
                    <h1 className="text-4xl font-bold mb-2">Queue Status</h1>
                    <p style={{ color: '#9CA3AF' }}>Real-time status of your queues</p>
                </div>

                <div className="space-y-5">

                    <div
                        key={queue.queueId}
                        className="rounded-xl border p-6"
                        style={{
                            backgroundColor: '#18181F',
                            borderColor: 'rgba(229, 231, 235, 0.1)'
                        }}
                    >
                        {/* Header with Action Buttons */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-xl font-semibold mb-1">
                                    {name}

                                </h3>
                                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                                    Joined {queue.joinedAt}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <div className="text-right">
                                    <div
                                        className="text-4xl font-bold mb-1"
                                        style={{ color: '#22C55E' }}
                                    >
                                        {queue.position}
                                    </div>
                                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                                        Your position
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    {/* Refresh Button */}
                                    <button
                                        onClick={handleRefresh}
                                        disabled={loading}
                                        className="p-2 rounded-lg transition-all hover:shadow-md disabled:opacity-50"
                                        style={{
                                            backgroundColor: '#F59E0B',
                                            color: '#0F0F14'
                                        }}
                                        title="Refresh queue status"
                                    >
                                        {loading ? (
                                            <span className="text-lg animate-spin">⟳</span>
                                        ) : (
                                            <span className="text-lg">🔄</span>
                                        )}
                                    </button>

                                    {/* Leave/Rejoin Buttons */}
                                    {canRejoin ? (
                                        <button
                                            onClick={handleRejoin}
                                            disabled={loading}
                                            className="px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md disabled:opacity-50"
                                            style={{
                                                backgroundColor: '#22C55E',
                                                color: '#0F0F14'
                                            }}
                                        >
                                            {loading ? 'Rejoining...' : 'Rejoin Queue'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleLeave}
                                            disabled={loading}
                                            className="px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md disabled:opacity-50"
                                            style={{
                                                backgroundColor: '#EF4444',
                                                color: 'white'
                                            }}
                                        >
                                            {loading ? 'Leaving...' : 'Leave Queue'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div
                            className="grid grid-cols-3 gap-3 mb-5 p-4 rounded-lg"
                            style={{ backgroundColor: '#0F0F14' }}
                        >
                            <div>
                                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                                    Grace Time
                                </p>
                                <p className="text-xl font-bold">{queue.queue?.graceTime} min</p>
                            </div>
                            <div>
                                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                                    People Ahead
                                </p>
                                <p className="text-xl font-bold">{queue.position ? `${queue.position - 1}` : `0`}</p>
                            </div>
                            <div>
                                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                                    Status
                                </p>
                                <p
                                    className="text-sm font-semibold capitalize"
                                    style={{
                                        color: queue.status === 'serving' ? '#22C55E' : queue.status === 'MISSED' ? '#EF4444' : '#F59E0B'
                                    }}
                                >
                                    {queue.status}
                                </p>
                            </div>
                        </div>

                        {/* Expires At - Show when user is late */}
                        {queue.status === 'LATE' && queue.expiresAt && (
                            <div
                                className="mb-5 p-4 rounded-lg border-l-4"
                                style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderLeftColor: '#EF4444'
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">⏰</span>
                                    <div>
                                        <p className="text-xs" style={{ color: '#9CA3AF' }}>
                                            Expires At
                                        </p>
                                        <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                                            {formatExpireTime(queue.expiresAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Progress Section */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Queue Overview</h4>
                            <div
                                className="h-2 rounded-full overflow-hidden mb-3"
                                style={{ backgroundColor: '#0F0F14' }}
                            >
                                <div
                                    className="h-full transition-all duration-300"
                                    style={{
                                        width: `${(queue.position / queue.count) * 100}%`,
                                        backgroundColor: '#22C55E'
                                    }}
                                />
                            </div>
                            <div
                                className="flex justify-between items-center p-3 rounded-lg"
                                style={{ backgroundColor: '#0F0F14' }}
                            >
                                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                                    Position {queue.position} {queue.count ? `of ${queue.count}` : ""}
                                </span>
                                <div
                                    className="flex items-center gap-1 text-xs font-semibold"
                                    style={{ color: '#22C55E' }}
                                >
                                    📈 Moving forward
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    )
}