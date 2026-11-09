import { prisma } from "../../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ENV } from "../../config/env.js";
import { validateLocation, validateRoomNumber } from "../../constants/hostels.js";

export const register = async ({ name, email, password, hostel, block, roomNumber }) => {
  if (!name || !name.trim()) {
    const e = new Error("Name is required");
    e.status = 400;
    throw e;
  }

  if (!email || !email.trim()) {
    const e = new Error("Email is required");
    e.status = 400;
    throw e;
  }

  if (!password || password.length < 6) {
    const e = new Error("Password must be at least 6 characters");
    e.status = 400;
    throw e;
  }

  // Validate hostel and block
  const locResult = validateLocation(hostel, block);
  if (!locResult.valid) {
    const e = new Error(locResult.message);
    e.status = 400;
    throw e;
  }

  // Validate room number (optional, numeric 1-4 digits)
  const roomResult = validateRoomNumber(roomNumber);
  if (!roomResult.valid) {
    const e = new Error(roomResult.message);
    e.status = 400;
    throw e;
  }

  const cleanEmail = email.trim().toLowerCase();
  const hashed = await bcrypt.hash(password, 10);

  // Role is strictly hardcoded to STUDENT
  return prisma.user.create({
    data: {
      name: name.trim(),
      email: cleanEmail,
      password: hashed,
      role: "STUDENT",
      hostel: locResult.hostel,
      block: locResult.block,
      roomNumber: roomResult.roomNumber,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hostel: true,
      block: true,
      roomNumber: true,
      createdAt: true,
    },
  });
};

export const login = async ({ email, password }) => {
  if (!email || !password) {
    const e = new Error("Email and password are required");
    e.status = 400;
    throw e;
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (!user) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const e = new Error("Invalid credentials");
    e.status = 401;
    throw e;
  }

  return jwt.sign(
    { id: user.id, role: user.role },
    ENV.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const resetPassword = async ({ email, newPassword, confirmPassword }) => {
  if (!email || !email.trim()) {
    const e = new Error("Email is required");
    e.status = 400;
    throw e;
  }

  if (!newPassword || newPassword.length < 6) {
    const e = new Error("Password must be at least 6 characters");
    e.status = 400;
    throw e;
  }

  if (newPassword !== confirmPassword) {
    const e = new Error("Passwords do not match");
    e.status = 400;
    throw e;
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (!user) {
    const e = new Error("No account found with this email");
    e.status = 404;
    throw e;
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return { success: true, message: "Password reset successful. Please log in with your new password." };
};

export const me = async (userId) => {
  return prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hostel: true,
      block: true,
      roomNumber: true,
      createdAt: true,
    },
  });
};

export const assignRole = async ({ userId, role }) => {
  const allowed = ["ADMIN", "WARDEN", "STUDENT"];
  if (!allowed.includes(role)) {
    const e = new Error("Invalid role");
    e.status = 400;
    throw e;
  }

  const updated = await prisma.user.update({
    where: { id: Number(userId) },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hostel: true,
      block: true,
      roomNumber: true,
      createdAt: true,
    },
  });

  return updated;
};
