import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteQueue, getActiveUsers, getSpecificQueue, lateArrived, markComeplete, markLate, removeFromQueue, updateQueue } from '../api/queueApi';
import { NavBar } from '../components/navBar';
import { socket } from '../socket';
import QueueForm from '../components/queueForm';

export default function AdminControlPage() {
  const { queueId } = useParams()
  const qid = Number(queueId)
  const [queue, setQueue] = useState({});
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let isMounted = true;

    socket.connect();
    socket.emit("joinQueue", { queueId: qid });

    const onQueueUpdate = (payload) => {
      if (!isMounted) return;
      console.log(payload)
      setUsers(payload.users);
    };

    socket.on("queueUpdate", onQueueUpdate);

    const loadInitialData = async () => {
      const [queueRes, usersRes] = await Promise.all([
        getSpecificQueue(qid),
        getActiveUsers(qid, 1),
      ]);

      if (!isMounted) return;

      setQueue(queueRes.data.data);
      setUsers(usersRes.data.data.users);
      setTotalPages(usersRes.data.data.paginated.totalPages || 1);
      setPage(1);
    };

    loadInitialData();

    return () => {
      isMounted = false;
      socket.emit("leaveQueue", { queueId: qid });
      socket.off("queueUpdate", onQueueUpdate);
    };
  }, [qid]);

  // Load more entries
  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const usersRes = await getActiveUsers(qid, nextPage);

      // Append new users to existing list
      setUsers([...users, ...usersRes.data.data.users]);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load more users", error);
    } finally {
      setLoadingMore(false);
    }
  }

  // Status priority order for display when filter is 'ALL'
  const statusPriority = {
    'SERVING': 0,
    'LATE': 1,
    'WAITING': 2,
    'COMPLETED': 3,
    'MISSED': 4,
    'CANCELLED': 5
  };

  // Filter entries based on selected status with smart ordering
  const filteredEntries = users ? users.filter(user => {
    if (filter === 'ALL') return true;
    return user.status === filter;
  }).sort((a, b) => {
    // When filter is 'ALL', sort by priority order
    if (filter === 'ALL') {
      const priorityA = statusPriority[a.status] ?? 999;
      const priorityB = statusPriority[b.status] ?? 999;
      return priorityA - priorityB;
    }
    return 0;
  }) : [];

  const handleMarkLate = async (entryId) => {
    setLoading(true);
    try {
      await markLate(qid, entryId)
      console.log(`Marked ${entryId} as late`);
    } catch (error) {
      console.error("Failed to mark as late", error);
    } finally {
      setLoading(false);
    }
  }

  const handleArriveQueue = async (entryId) => {
    setLoading(true);
    try {
      await lateArrived(qid, entryId)
      console.log(`${entryId} rejoined queue`);
    } catch (error) {
      console.error("Failed to rejoin queue", error);
    } finally {
      setLoading(false);
    }
  }

  const handleCompleteEntry = async (entryId) => {
    setLoading(true);
    try {
      await markComeplete(qid, entryId)
      console.log(`Completed ${entryId}`);
    } catch (error) {
      console.error("Failed to complete entry", error);
    } finally {
      setLoading(false);
    }
  }

  const handleRemoveEntry = async (entryId) => {
    setLoading(true);
    try {
      console.log(entryId)
      await removeFromQueue(qid, entryId)
      console.log(`Removed ${entryId} from queue`);
    } catch (error) {
      console.error("Failed to remove entry", error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateQueue = async (formData) => {
    setEditLoading(true);
    try {
      const res = await updateQueue(qid, formData);
      setQueue(res.data.data);
      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update queue", error);
    } finally {
      setEditLoading(false);
    }
  }

  const handleDeleteQueue = async () => {
    setEditLoading(true);
    try {
      await deleteQueue(qid)
      navigate("/queues")
    } catch (error) {
      console.error("Failed to delete queue", error);
    }
    finally {
      setEditLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <div className="p-8 md:p-10 max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2 ">{queue.name}</h1>
            <p style={{ color: '#9CA3AF' }}>ID : {queue.id}</p>
          </div>
          <div className='flex gap-4'>
            <button
              onClick={() => handleDeleteQueue()}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md flex items-center gap-2"
              style={{
                backgroundColor: '#EF4444',
                color: '#0F0F14'
              }}
              title="Delete Queue"
            >
              🗑️ Delete
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:shadow-md flex items-center gap-2"
              style={{
                backgroundColor: '#F59E0B',
                color: '#0F0F14'
              }}
              title="Edit queue settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {queue && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total in Queue', value: queue.maxSize ? `${queue.count} / ${queue.maxSize}` : queue.count || 0, color: '#22C55E' },
                { label: 'Grace Time', value: `${queue.graceTime || 0}m`, color: '#F59E0B' },
                { label: 'Service Slots', value: queue.serviceSlots || 'N/A', color: '#22C55E' }
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: '#18181F',
                    borderColor: 'rgba(229, 231, 235, 0.1)'
                  }}
                >
                  <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Entries */}
            <div
              className="rounded-xl border p-6"
              style={{
                backgroundColor: '#18181F',
                borderColor: 'rgba(229, 231, 235, 0.1)'
              }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-white">Queue Entries</h3>
                <div className="flex gap-2 flex-wrap">
                  {['ALL', 'SERVING', 'WAITING', 'LATE', 'COMPLETED', 'MISSED', 'CANCELLED'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                      style={{
                        backgroundColor: filter === status ? '#22C55E' : '#0F0F14',
                        color: filter === status ? '#0F0F14' : '#E5E7EB',
                        border: filter === status ? 'none' : '1px solid rgba(229, 231, 235, 0.2)'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <div
                  className="py-12 text-center"
                  style={{ color: '#9CA3AF' }}
                >
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-sm"> {filter === "ALL" ? "No entries" : `No entries with status ${filter}`}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEntries.map((entry, index) => {
                    const borderColor =
                      entry.status === 'COMPLETED' ? '#22C55E' :
                        entry.status === 'SERVING' ? '#F59E0B' :
                          entry.status === 'LATE' ? '#EF4444' :
                            entry.status === 'MISSED' ? '#EF4444' :
                              entry.status === 'CANCELLED' ? '#EF4444' :
                                '#9CA3AF';

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 rounded-lg border-l-4 transition-all"
                        style={{
                          backgroundColor: '#0F0F14',
                          borderLeftColor: borderColor
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">👤</span>
                            <span className="font-semibold text-white">{entry.user.name || 'Unknown'}</span>
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>
                              #{index + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>
                              Joined at {entry.joinedAt || entry.createdAt || 'N/A'}
                            </p>
                            <span
                              className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                              style={{
                                backgroundColor: borderColor,
                                color: entry.status === 'LATE' || entry.status === 'MISSED' || entry.status === 'CANCELLED' ? 'white' : '#0F0F14'
                              }}
                            >
                              {entry.status}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap justify-end">
                          {/* Mark as Late - only if serving */}
                          {entry.status === 'SERVING' && (
                            <button
                              onClick={() => handleMarkLate(entry.userId)}
                              disabled={loading}
                              className="px-3 py-1 rounded-md text-xs font-semibold transition-all hover:shadow-md disabled:opacity-50 text-white"
                              style={{ backgroundColor: '#EF4444' }}
                              title="Mark user as late"
                            >
                              Mark Late
                            </button>
                          )}

                          {/* arrived Queue - only if late */}
                          {entry.status === 'LATE' && (
                            <button
                              onClick={() => handleArriveQueue(entry.userId)}
                              disabled={loading}
                              className="px-3 py-1 rounded-md text-xs font-semibold transition-all hover:shadow-md disabled:opacity-50 text-black"
                              style={{ backgroundColor: '#22C55E' }}
                              title="User rejoins queue (back to WAITING)"
                            >
                              Arrived
                            </button>
                          )}

                          {/* Complete - only if serving */}
                          {(entry.status === 'SERVING') && (
                            <button
                              onClick={() => handleCompleteEntry(entry.userId)}
                              disabled={loading}
                              className="px-3 py-1 rounded-md text-xs font-semibold transition-all hover:shadow-md disabled:opacity-50 text-black"
                              style={{ backgroundColor: '#22C55E' }}
                              title="Complete this entry"
                            >
                              Complete
                            </button>
                          )}

                          {/* Remove - available for non-completed/non-missed statuses */}
                          {entry.status !== 'COMPLETED' && entry.status !== 'MISSED' && (
                            <button
                              onClick={() => handleRemoveEntry(entry.userId)}
                              disabled={loading}
                              className="px-3 py-1 rounded-md text-xs font-semibold transition-all hover:shadow-md disabled:opacity-50 text-white"
                              style={{ backgroundColor: '#EF4444' }}
                              title="Remove from queue"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Load More Button */}
              {page < totalPages && (
                <div className="flex justify-center mt-6 pt-6 border-t" style={{ borderColor: 'rgba(229, 231, 235, 0.1)' }}>
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore || loading}
                    className="px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:shadow-md disabled:opacity-50"
                    style={{
                      backgroundColor: '#22C55E',
                      color: '#0F0F14'
                    }}
                  >
                    {loadingMore ? 'Loading more...' : 'Load More Entries'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Queue Form Modal */}
      <QueueForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateQueue}
        initialData={queue}
        isLoading={editLoading}
        mode="edit"
      />
    </>
  )
}