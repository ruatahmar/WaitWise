import React from 'react';

export default function MyQueuesPage({ queues, userEmail }) {
    const adminQueues = queues.filter(q => q.createdBy === userEmail);

    return (
        <div className="p-8 md:p-10 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">My Queues</h1>
                <p style={{ color: '#9CA3AF' }}>Manage queues you've created</p>
            </div>

            {adminQueues.length === 0 ? (
                <div
                    className="rounded-xl border p-12 text-center"
                    style={{
                        backgroundColor: '#18181F',
                        borderColor: 'rgba(229, 231, 235, 0.1)'
                    }}
                >
                    <div className="text-5xl mb-4">👥</div>
                    <h3 className="text-lg font-semibold mb-2">No Queues Yet</h3>
                    <p className="mb-6" style={{ color: '#9CA3AF' }}>
                        Create your first queue to get started
                    </p>
                    <button
                        className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg"
                        style={{
                            backgroundColor: '#22C55E',
                            color: '#0F0F14'
                        }}
                    >
                        ➕ Create Queue
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {adminQueues.map(queue => (
                        <div
                            key={queue.id}
                            className="rounded-xl border p-6 transition-all hover:shadow-lg hover:translate-y-[-2px]"
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
                                        {queue.totalInQueue}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
                                        Avg Wait
                                    </p>
                                    <p className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
                                        {queue.avgWaitTime}m
                                    </p>
                                </div>
                            </div>

                            <button
                                className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-lg"
                                style={{
                                    backgroundColor: '#22C55E',
                                    color: '#0F0F14'
                                }}
                            >
                                Manage Queue
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}