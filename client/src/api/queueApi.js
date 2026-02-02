import { api } from "../utils/apiClient";

export const getAllQueues = () => api.get("/queues");
export const getAllTickets = () => api.get("/queues/tickets");
export const getQueueStatus = (queueId) => api.get(`queues/${queueId}/status`);