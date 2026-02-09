import { useEffect, useState } from "react";
import { NavBar } from "../components/navBar";
import { createQueue, getAllQueues } from "../api/queueApi";
import QueuesCard from "../components/queueCards";
import QueueForm from "../components/queueForm";

export default function MyQueues() {
    const [queues, setQueues] = useState([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchAllQueues = async () => {
            const res = await getAllQueues()
            console.log(res.data.data)
            setQueues(res.data.data)
        }
        fetchAllQueues();

    }, [])

    const handleCreateQueue = async (formData) => {
        setLoading(true);
        try {
            const res = await createQueue(formData);
            setQueues([...queues, res.data.data])
            setShowCreateModal(false)
        } catch (error) {
            console.error("Failed to create queue", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <NavBar />
            <div className="p-8 md:p-10 max-w-6xl mx-auto">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">My Queues</h1>
                        <p style={{ color: '#9CA3AF' }}>Manage queues you've created</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg flex items-center gap-2"
                        style={{
                            backgroundColor: '#22C55E',
                            color: '#0F0F14'
                        }}
                    >
                        ➕ Create Queue
                    </button>
                </div>

                {queues.length === 0 ? (
                    <div
                        className="rounded-xl border p-12 text-center"
                        style={{
                            backgroundColor: '#18181F',
                            borderColor: 'rgba(229, 231, 235, 0.1)'
                        }}
                    >
                        <div className="text-5xl mb-4">👥</div>
                        <h3 className="text-lg font-semibold mb-2 text-white">No Queues Yet</h3>
                        <p className="mb-6" style={{ color: '#9CA3AF' }}>
                            Create your first queue to get started
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {queues.map(queue => (
                            <QueuesCard key={queue.id} queue={queue} />
                        ))}
                    </div>
                )}
            </div>

            {/* Queue Form Modal */}
            <QueueForm
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateQueue}
                isLoading={loading}
                mode="create"
            />
        </>
    )
}