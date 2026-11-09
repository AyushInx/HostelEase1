import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRODUCTION_API_URL = "https://hostelease1-production.up.railway.app/api";

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL,
  timeout: 20000, // 20-second timeout for mobile networks and cross-region latency
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// Safe diagnostic sanitizer: masks passwords, tokens, secrets
const sanitizeLogData = (data) => {
  if (!data || typeof data !== "object") return data;
  const SENSITIVE_KEYS = ["password", "token", "otp", "secret", "authorization"];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  return sanitized;
};

// Request Interceptor
API.interceptors.request.use(
  async (config) => {
    config.metadata = { startTime: Date.now() };

    try {
      const token =
        (await AsyncStorage.getItem("@HostelEase:token")) ||
        (await AsyncStorage.getItem("@HostelHub:token"));
      if (token) {
        if (config.headers && typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${token}`);
        } else {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (storageErr) {
      console.warn("[API] Storage read error:", storageErr.message);
    }

    // Diagnostic logging without sensitive credentials
    try {
      const logBody =
        typeof config.data === "string"
          ? sanitizeLogData(JSON.parse(config.data))
          : sanitizeLogData(config.data);
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        payload: logBody || null,
      });
    } catch {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error("[API Request Setup Error]", error?.message);
    return Promise.reject(error);
  }
);

// Response Interceptor
API.interceptors.response.use(
  (response) => {
    const elapsed = response.config?.metadata?.startTime
      ? `${Date.now() - response.config.metadata.startTime}ms`
      : "unknown";
    console.log(`[API Response] ${response.status} ${response.config?.url} (${elapsed})`);
    return response;
  },
  (error) => {
    const config = error.config || {};
    const elapsed = config.metadata?.startTime
      ? `${Date.now() - config.metadata.startTime}ms`
      : "unknown";

    const diagnostic = {
      method: config.method?.toUpperCase() || "UNKNOWN",
      url: `${config.baseURL || ""}${config.url || ""}`,
      status: error.response?.status || "NO_RESPONSE",
      code: error.code || "UNKNOWN_CODE",
      message: error.message || "No error message",
      duration: elapsed,
    };

    console.warn("[API Diagnostic Error]", JSON.stringify(diagnostic));

    // Provide friendly, contextual message on network dropout
    if (!error.response && (error.message === "Network Error" || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED")) {
      error.friendlyMessage =
        "Could not connect to the HostelEase server. Please check your internet connection or try again in a few moments.";
    }

    return Promise.reject(error);
  }
);

export default API;
