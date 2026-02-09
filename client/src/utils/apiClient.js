import axios from "axios";
import { tokenStore } from "../auth/token";

export const api = axios.create({
    baseURL: "http://localhost:8080/api/v1",
    withCredentials: true,
});
export const publicApi = axios.create({
    baseURL: "http://localhost:8080/api/v1",
    withCredentials: true,
})

/* =========================
   REQUEST: attach access token
   ========================= */
api.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/* =========================
   RESPONSE: refresh handling
   ========================= */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token) => {
    failedQueue.forEach(p => {
        if (error) p.reject(error);
        else p.resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    res => res,
    async (error) => {
        const originalRequest = error.config;

        // 🚫 DO NOT refresh on refresh request itself
        if (originalRequest.url?.includes("/auth/refresh")) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization =
                        `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const res = await api.post("/auth/refresh");
                const newAccessToken = res.data.data.accessToken;

                tokenStore.set(newAccessToken);
                processQueue(null, newAccessToken);

                originalRequest.headers.Authorization =
                    `Bearer ${newAccessToken}`;

                return api(originalRequest);
            } catch (err) {
                processQueue(err);
                tokenStore.clear();
                // window.location.href = "/login";
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);