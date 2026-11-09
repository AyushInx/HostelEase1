import * as AuthService from "./auth.service.js";

// In-memory IP rate limiter for password reset: max 5 attempts per IP per hour
const resetIpRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_RESET_REQUESTS_PER_WINDOW = 5;

const checkResetRateLimit = (ip) => {
  const now = Date.now();
  const clientData = resetIpRateLimitMap.get(ip);

  if (!clientData) {
    resetIpRateLimitMap.set(ip, { count: 1, startTime: now });
    return true;
  }

  // Window expired, reset window
  if (now - clientData.startTime > RATE_LIMIT_WINDOW_MS) {
    resetIpRateLimitMap.set(ip, { count: 1, startTime: now });
    return true;
  }

  if (clientData.count >= MAX_RESET_REQUESTS_PER_WINDOW) {
    return false;
  }

  clientData.count += 1;
  return true;
};

export const register = async (req, res, next) => {
  try {
    const user = await AuthService.register(req.body);
    res.json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email already registered" });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const token = await AuthService.login(req.body);
    res.json({ token });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection?.remoteAddress || "unknown_ip";
    const allowed = checkResetRateLimit(clientIp);
    if (!allowed) {
      return res.status(429).json({
        message: "Too many password reset attempts from this IP. Please try again after 1 hour.",
      });
    }

    const { email, newPassword, confirmPassword } = req.body || {};
    const result = await AuthService.resetPassword({ email, newPassword, confirmPassword });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await AuthService.me(req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const assignRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const requesterId = req.user.id;
    if (Number(userId) === Number(requesterId)) {
      const e = new Error("You cannot change your own role");
      e.status = 403;
      throw e;
    }
    const user = await AuthService.assignRole({ userId, role });
    res.json(user);
  } catch (error) {
    next(error);
  }
};
