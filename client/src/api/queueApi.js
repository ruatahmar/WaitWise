import { api } from "../utils/apiClient";

//crud
export const createQueue = (data) => api.post("/queues", data);
export const getSpecificQueue = (id) => api.get(`/queues/${id}`);
export const getAllQueues = () => api.get("/queues");
export const updateQueue = (id, data) => api.put(`/queues/${id}`, data);
export const deleteQueue = (id) => api.delete(`/queues/${id}`);

//user endpoints
export const joinQueue = (queueId) => api.post(`queues/${queueId}/join`)
export const leaveQueue = (queueId) => api.post(`queues/${queueId}/leave`)
export const getQueueStatus = (queueId) => api.get(`queues/${queueId}/status`);
export const getAllTickets = () => api.get("/queues/tickets");
export const rejoinQueue = (queueId) => api.post(`queues/${queueId}/rejoin`)

//admin endpoints
export const markComeplete = (queueId, targetId) => api.post(`queues/${queueId}/users/${targetId}/complete`)
export const markLate = (queueId, targetId) => api.post(`queues/${queueId}/users/${targetId}/late`)
export const removeFromQueue = (queueId, targetId) => api.post(`queues/${queueId}/users/${targetId}/remove`)
export const lateArrived = (queueId, targetId) => api.post(`queues/${queueId}/users/${targetId}/arrived`)
export const getActiveUsers = (queueId, page) => api.get(`queues/${queueId}/users?page=${page - 1}`)