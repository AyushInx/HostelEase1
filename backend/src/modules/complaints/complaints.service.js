import { prisma } from "../../config/db.js";
import {
  COMPLAINT_CATEGORIES,
  validateLocation,
  validateRoomNumber,
} from "../../constants/hostels.js";

export const createComplaint = async ({
  userId,
  title,
  description,
  category,
  hostel,
  block,
  roomNumber,
  imageUrl,
}) => {
  if (!title || !title.trim()) {
    const e = new Error("Title is required");
    e.status = 400;
    throw e;
  }

  // Validate or default category
  let matchedCategory = "Other";
  if (category && typeof category === "string") {
    const found = COMPLAINT_CATEGORIES.find(
      (c) => c.toLowerCase() === category.trim().toLowerCase()
    );
    if (!found) {
      const e = new Error(
        `Invalid category. Allowed: ${COMPLAINT_CATEGORIES.join(", ")}`
      );
      e.status = 400;
      throw e;
    }
    matchedCategory = found;
  }

  const cleanTitle = title.trim();
  const cleanDescription = description && description.trim() ? description.trim() : "";

  // Fetch user profile for fallback location if not explicitly provided
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { hostel: true, block: true, roomNumber: true },
  });

  const finalHostel = hostel !== undefined ? hostel : user?.hostel;
  const finalBlock = block !== undefined ? block : user?.block;
  const finalRoom = roomNumber !== undefined ? roomNumber : user?.roomNumber;

  let validatedHostel = null;
  let validatedBlock = null;
  if (finalHostel) {
    const locResult = validateLocation(finalHostel, finalBlock);
    if (!locResult.valid) {
      const e = new Error(locResult.message);
      e.status = 400;
      throw e;
    }
    validatedHostel = locResult.hostel;
    validatedBlock = locResult.block;
  }

  let validatedRoom = null;
  if (finalRoom !== undefined && finalRoom !== null) {
    const roomResult = validateRoomNumber(finalRoom);
    if (!roomResult.valid) {
      const e = new Error(roomResult.message);
      e.status = 400;
      throw e;
    }
    validatedRoom = roomResult.roomNumber;
  }

  const created = await prisma.complaint.create({
    data: {
      userId: Number(userId),
      title: cleanTitle,
      description: cleanDescription,
      imageUrl: imageUrl || null,
      category: matchedCategory,
      hostel: validatedHostel,
      block: validatedBlock,
      roomNumber: validatedRoom,
      status: "PENDING",
    },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      category: true,
      hostel: true,
      block: true,
      roomNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return created;
};

export const listMyComplaints = async ({
  userId,
  page = 1,
  limit = 20,
  status,
  category,
}) => {
  const where = {
    userId: Number(userId),
    ...(status && status !== "ALL" ? { status } : {}),
    ...(category && category !== "ALL" ? { category } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        category: true,
        hostel: true,
        block: true,
        roomNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, total, page, limit };
};

export const listComplaints = async ({
  page = 1,
  limit = 20,
  status,
  category,
  hostel,
}) => {
  const where = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(category && category !== "ALL" ? { category } : {}),
    ...(hostel && hostel !== "ALL" ? { hostel } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        category: true,
        hostel: true,
        block: true,
        roomNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            roomNumber: true,
            hostel: true,
            block: true,
          },
        },
      },
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, total, page, limit };
};

export const updateComplaint = async ({ id, status }) => {
  const allowed = ["PENDING", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];
  if (!allowed.includes(status)) {
    const e = new Error(`Invalid status. Allowed: ${allowed.join(", ")}`);
    e.status = 400;
    throw e;
  }

  const updated = await prisma.complaint.update({
    where: { id: Number(id) },
    data: { status },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      category: true,
      hostel: true,
      block: true,
      roomNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  return updated;
};

export const getComplaintById = async ({ id }) => {
  return prisma.complaint.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      category: true,
      hostel: true,
      block: true,
      roomNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          roomNumber: true,
          hostel: true,
          block: true,
        },
      },
    },
  });
};

export const deleteComplaint = async ({ id }) => {
  return prisma.complaint.delete({
    where: { id: Number(id) },
    select: { id: true },
  });
};
