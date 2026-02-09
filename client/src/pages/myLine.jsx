import React from 'react';
import { useEffect, useState } from "react";
import { NavBar } from "../components/navBar";
import { getAllTickets, joinQueue } from "../api/queueApi";
import PositionCard from '../components/positionsCard';
import { useNavigate } from 'react-router-dom';

export default function MyLinePage() {
    const navigate = useNavigate()
    const [queues, setQueues] = useState([])
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [queueId, setQueueId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAllQueues = async () => {
            const res = await getAllTickets()
            console.log(res.data.data)
            setQueues(res.data.data)
        }
        fetchAllQueues();

    }, [])

    const handleInputChange = (e) => {
        const { value } = e.target;
        setQueueId(value);
        if (error) setError('');
    };

    const handleJoinQueue = async (e) => {
        e.preventDefault();
        if (!queueId || !queueId.trim()) {
            setError('Queue ID is required');
            return;
        }
        if (isNaN(queueId)) {
            setError('Queue ID must be a number');
            return;
        }
        setLoading(true);
        try {

            await joinQueue(Number(queueId));
            // setQueues([...queues, res.data.data]);
            navigate(`/queues/${queueId}`)
            console.log('Joining queue with ID:', queueId);

            setQueueId('');
            setError('');
            setShowJoinModal(false);
        } catch (error) {
            console.error("Failed to join queue", error);
            setError('Failed to join queue');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <NavBar />
            <div className="p-8 md:p-10 max-w-6xl mx-auto text-white">
                <div className="mb-8 flex justify-between items-start">
                    <div style={{ color: '#000' }}>
                        <h1 className="text-4xl font-bold mb-2">My Line</h1>
                        <p style={{ color: '#9CA3AF' }}>Queues you're currently waiting in</p>
                    </div>
                    <button
                        onClick={() => setShowJoinModal(true)}
                        className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg"
                        style={{
                            backgroundColor: '#22C55E',
                            color: '#0F0F14'
                        }}
                    >
                        ➕ Join Queue
                    </button>
                </div>

                {queues.length === 0 ? (
                    <div
                        className="rounded-xl border p-12 text-center "
                        style={{
                            backgroundColor: '#18181F',
                            borderColor: 'rgba(229, 231, 235, 0.1)'
                        }}
                    >
                        <div className="text-5xl mb-4">👥</div>
                        <h3 className="text-lg font-semibold mb-2">Not in any queues</h3>
                        <p style={{ color: '#9CA3AF' }}>Join a queue to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-white">
                        {queues.map(queue => (
                            <PositionCard key={queue.id} queue={queue} />
                        ))}
                    </div>
                )}
            </div>

            {/* Join Queue Modal */}
            {showJoinModal && (
                <div
                    className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={() => setShowJoinModal(false)}
                >
                    <div
                        className="bg-gray-900 rounded-xl border p-8 w-full max-w-md"
                        style={{
                            backgroundColor: '#18181F',
                            borderColor: 'rgba(229, 231, 235, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold mb-6 text-white">Join Queue</h2>

                        <form onSubmit={handleJoinQueue} className="space-y-4">
                            {/* Error Message */}
                            {error && (
                                <div
                                    className="p-3 rounded-lg text-sm font-medium"
                                    style={{
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        color: '#EF4444',
                                        borderLeft: '4px solid #EF4444'
                                    }}
                                >
                                    ✕ {error}
                                </div>
                            )}

                            {/* Queue ID Input */}
                            <div>
                                <label className="text-sm font-semibold block mb-2 text-white">
                                    Queue ID
                                </label>
                                <input
                                    type="text"
                                    value={queueId}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 1, 2, 3..."
                                    required
                                    disabled={loading}
                                    className="w-full px-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                                    style={{
                                        backgroundColor: '#0F0F14',
                                        color: '#E5E7EB',
                                        borderColor: 'rgba(229, 231, 235, 0.2)',
                                        '--tw-ring-color': 'rgba(34, 197, 94, 0.5)'
                                    }}
                                />
                                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                                    Enter the ID of the queue you want to join
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowJoinModal(false);
                                        setQueueId('');
                                        setError('');
                                    }}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all border disabled:opacity-50"
                                    style={{
                                        backgroundColor: '#0F0F14',
                                        color: '#E5E7EB',
                                        borderColor: 'rgba(229, 231, 235, 0.2)'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg disabled:opacity-50"
                                    style={{
                                        backgroundColor: '#22C55E',
                                        color: '#0F0F14'
                                    }}
                                >
                                    {loading ? 'Joining...' : 'Join Queue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}