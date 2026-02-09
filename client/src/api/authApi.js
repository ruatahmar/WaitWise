import { api, publicApi } from "../utils/apiClient";

export const login = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);
export const refreshToken = () => publicApi.post("/auth/refresh");
export const logout = () => api.post("/auth/logout");
export const logoutAllDevices = () => api.post("/auth/logoutAll")