import { prisma } from "../../config/db.js";

const VALID_MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"];

export const createMenu = async ({ hostels, hostel, blocks, block, day, breakfast, lunch, dinner }) => {
  // Normalize hostels: array of strings
  let hostelList = [];
  if (Array.isArray(hostels) && hostels.length > 0) {
    hostelList = hostels.map((h) => String(h).trim()).filter(Boolean);
  } else if (hostel && String(hostel).trim()) {
    hostelList = [String(hostel).trim()];
  } else {
    hostelList = ["CVR"];
  }

  // Normalize blocks: array of strings or [null] for all blocks
  let blockList = [null];
  if (Array.isArray(blocks) && blocks.length > 0) {
    const filtered = blocks.map((b) => (b ? String(b).trim() : null)).filter(Boolean);
    if (filtered.length > 0) {
      blockList = filtered;
    }
  } else if (block && String(block).trim()) {
    blockList = [String(block).trim()];
  }

  const cleanDay = String(day || "").trim();
  const createdMenus = [];

  for (const h of hostelList) {
    for (const b of blockList) {
      // Upsert: check if a menu already exists for this (hostel, block, day)
      const existing = await prisma.messMenu.findFirst({
        where: {
          hostel: h,
          block: b,
          day: cleanDay,
        },
      });

      if (existing) {
        const updated = await prisma.messMenu.update({
          where: { id: existing.id },
          data: {
            breakfast: String(breakfast || "").trim(),
            lunch: String(lunch || "").trim(),
            dinner: String(dinner || "").trim(),
          },
        });
        createdMenus.push(updated);
      } else {
        const created = await prisma.messMenu.create({
          data: {
            hostel: h,
            block: b,
            day: cleanDay,
            breakfast: String(breakfast || "").trim(),
            lunch: String(lunch || "").trim(),
            dinner: String(dinner || "").trim(),
          },
        });
        createdMenus.push(created);
      }
    }
  }

  return createdMenus.length === 1 ? createdMenus[0] : { count: createdMenus.length, items: createdMenus };
};

export const updateMenu = async ({ id, hostel, block, day, breakfast, lunch, dinner }) => {
  const data = {};
  if (hostel !== undefined) data.hostel = hostel;
  if (block !== undefined) data.block = block ? String(block).trim() : null;
  if (day !== undefined) data.day = String(day).trim();
  if (breakfast !== undefined) data.breakfast = String(breakfast).trim();
  if (lunch !== undefined) data.lunch = String(lunch).trim();
  if (dinner !== undefined) data.dinner = String(dinner).trim();

  return prisma.messMenu.update({
    where: { id: Number(id) },
    data,
  });
};

export const deleteMenu = async ({ id }) => {
  return prisma.messMenu.delete({
    where: { id: Number(id) },
    select: { id: true },
  });
};

export const listMenus = async ({ user, day, hostel, block, page = 1, limit = 50 }) => {
  let targetHostel = hostel;
  let targetBlock = block;

  // Enforce student role isolation: students can ONLY view their own hostel
  if (user?.role === "STUDENT") {
    // Look up fresh user profile to guarantee accurate hostel/block
    const studentProfile = await prisma.user.findUnique({
      where: { id: Number(user.id) },
      select: { hostel: true, block: true },
    });

    targetHostel = studentProfile?.hostel || user?.hostel || "CVR";
    targetBlock = studentProfile?.block || user?.block || null;
  }

  const where = {};
  if (day) where.day = day;

  if (targetHostel && targetHostel !== "ALL") {
    where.hostel = targetHostel;
  }

  if (user?.role === "STUDENT") {
    // For students: match their specific block OR generic hostel menu (block is null)
    if (targetBlock) {
      where.OR = [
        { block: targetBlock },
        { block: null },
      ];
    } else {
      where.block = null;
    }
  } else if (targetBlock && targetBlock !== "ALL") {
    where.block = targetBlock;
  }

  const [items, total] = await Promise.all([
    prisma.messMenu.findMany({
      where,
      orderBy: [{ day: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        feedbacks: {
          select: {
            id: true,
            userId: true,
            mealType: true,
            rating: true,
            comment: true,
          },
        },
      },
    }),
    prisma.messMenu.count({ where }),
  ]);

  const currentUserId = user?.id ? Number(user.id) : null;

  // Format menus with meal ratings
  const formattedItems = items.map((menu) => {
    const meals = {
      breakfast: formatMealStats(menu.feedbacks, "BREAKFAST", currentUserId),
      lunch: formatMealStats(menu.feedbacks, "LUNCH", currentUserId),
      dinner: formatMealStats(menu.feedbacks, "DINNER", currentUserId),
    };

    return {
      id: menu.id,
      hostel: menu.hostel,
      block: menu.block,
      day: menu.day,
      breakfast: menu.breakfast,
      lunch: menu.lunch,
      dinner: menu.dinner,
      meals,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
    };
  });

  return { items: formattedItems, total, page, limit, studentHostel: targetHostel, studentBlock: targetBlock };
};

function formatMealStats(feedbacks = [], mealType, currentUserId) {
  const mealFeedbacks = feedbacks.filter((f) => f.mealType === mealType);
  const total = mealFeedbacks.length;
  const sum = mealFeedbacks.reduce((acc, f) => acc + (f.rating || 0), 0);
  const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

  const userFeedback = currentUserId ? mealFeedbacks.find((f) => f.userId === currentUserId) : null;

  return {
    totalRatings: total,
    averageRating: avg,
    myRating: userFeedback ? userFeedback.rating : null,
    myComment: userFeedback ? userFeedback.comment : null,
  };
}

export const createFeedback = async ({ userId, menuId, mealType, rating, comment }) => {
  const cleanMealType = String(mealType || "").trim().toUpperCase();
  if (!VALID_MEAL_TYPES.includes(cleanMealType)) {
    const e = new Error("Invalid mealType. Allowed: BREAKFAST, LUNCH, DINNER");
    e.status = 400;
    throw e;
  }

  const numRating = Number(rating);
  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    const e = new Error("Rating must be an integer between 1 and 5 stars");
    e.status = 400;
    throw e;
  }

  const cleanComment = comment && String(comment).trim() ? String(comment).trim() : null;

  // Verify menu exists
  const menu = await prisma.messMenu.findUnique({
    where: { id: Number(menuId) },
  });
  if (!menu) {
    const e = new Error("Mess menu not found");
    e.status = 404;
    throw e;
  }

  // Upsert: prevents duplicates, updates previous rating if re-voting
  const feedback = await prisma.messFeedback.upsert({
    where: {
      userId_menuId_mealType: {
        userId: Number(userId),
        menuId: Number(menuId),
        mealType: cleanMealType,
      },
    },
    update: {
      rating: numRating,
      comment: cleanComment,
    },
    create: {
      userId: Number(userId),
      menuId: Number(menuId),
      mealType: cleanMealType,
      rating: numRating,
      comment: cleanComment,
    },
    select: {
      id: true,
      userId: true,
      menuId: true,
      mealType: true,
      rating: true,
      comment: true,
      updatedAt: true,
    },
  });

  return feedback;
};

export const analytics = async ({ hostel, block, day, mealType, from, to }) => {
  const whereMenu = {};
  if (hostel && hostel !== "ALL") whereMenu.hostel = hostel;
  if (block && block !== "ALL") whereMenu.block = block;
  if (day && day !== "ALL") whereMenu.day = day;

  const menus = await prisma.messMenu.findMany({
    where: whereMenu,
    include: {
      feedbacks: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              hostel: true,
              block: true,
              roomNumber: true,
            },
          },
        },
      },
    },
  });

  const mealStats = [];
  const feedbackEntries = [];
  let totalRatingSum = 0;
  let totalRatingCount = 0;

  const targetMealTypes = mealType && mealType !== "ALL" ? [mealType.toUpperCase()] : VALID_MEAL_TYPES;

  menus.forEach((menu) => {
    targetMealTypes.forEach((mType) => {
      const feedbacks = (menu.feedbacks || []).filter((f) => f.mealType === mType);
      const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;

      feedbacks.forEach((f) => {
        if (f.rating >= 1 && f.rating <= 5) {
          starCounts[f.rating] = (starCounts[f.rating] || 0) + 1;
          sum += f.rating;
          totalRatingSum += f.rating;
          totalRatingCount += 1;
        }

        // Collect written comments
        if (f.comment && f.comment.trim()) {
          feedbackEntries.push({
            id: f.id,
            rating: f.rating,
            comment: f.comment,
            mealType: f.mealType,
            day: menu.day,
            hostel: menu.hostel,
            block: menu.block || "All Blocks",
            mealName: mType === "BREAKFAST" ? menu.breakfast : mType === "LUNCH" ? menu.lunch : menu.dinner,
            studentName: f.user?.name || "Student",
            roomNumber: f.user?.roomNumber || "-",
            userHostel: f.user?.hostel || menu.hostel,
            userBlock: f.user?.block || "-",
            createdAt: f.createdAt,
          });
        }
      });

      const total = feedbacks.length;
      const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
      const mealContent = mType === "BREAKFAST" ? menu.breakfast : mType === "LUNCH" ? menu.lunch : menu.dinner;

      mealStats.push({
        menuId: menu.id,
        hostel: menu.hostel,
        block: menu.block || "All Blocks",
        day: menu.day,
        mealType: mType,
        mealContent,
        totalRatings: total,
        averageRating: avg,
        starCounts,
      });
    });
  });

  // Sort written feedback by newest
  feedbackEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Sort meal stats by day order and meal order
  const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
  const mealOrder = { BREAKFAST: 1, LUNCH: 2, DINNER: 3 };
  mealStats.sort((a, b) => {
    const dDiff = (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0);
    if (dDiff !== 0) return dDiff;
    return (mealOrder[a.mealType] || 0) - (mealOrder[b.mealType] || 0);
  });

  const overallAvg = totalRatingCount > 0 ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10 : 0;

  return {
    overallAvg,
    totalRatings: totalRatingCount,
    meals: mealStats,
    feedbackList: feedbackEntries,
  };
};
