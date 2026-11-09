import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import leaveRoutes from "./modules/leave/leave.routes.js";
import complaintsRoutes from "./modules/complaints/complaints.routes.js";
import messRoutes from "./modules/mess/mess.routes.js";
import marketplaceRoutes from "./modules/marketplace/marketplace.routes.js";
import pollsRoutes from "./modules/polls/polls.routes.js";
import lostfoundRoutes from "./modules/lostfound/lostfound.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import { HOSTELS, COMPLAINT_CATEGORIES } from "./constants/hostels.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { prisma } from "./config/db.js";
import { auth } from "./middlewares/auth.js";
import { role } from "./middlewares/role.js";

const app = express();


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Safe non-sensitive request logger for production diagnostics
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`
    );
  });
  next();
});

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/mess", messRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/polls", pollsRoutes);
app.use("/api/lostfound", lostfoundRoutes);
app.use("/api/notifications", notificationsRoutes);


app.get("/api/hostels", (req, res) => {
  res.json({
    hostels: HOSTELS,
    categories: COMPLAINT_CATEGORIES,
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/admin/stats", auth, role("ADMIN"), async (req, res, next) => {
  try {
    const [users, pendingLeaves, openComplaints, polls] = await Promise.all([
      prisma.user.count(),
      prisma.leave.count({ where: { status: "PENDING" } }),
      prisma.complaint.count({ where: { NOT: { status: "RESOLVED" } } }),
      prisma.poll.count(),
    ]);
    res.json({ users, pendingLeaves, openComplaints, activePolls: polls });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);


app.listen(ENV.PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
export { prisma };
export default app;
