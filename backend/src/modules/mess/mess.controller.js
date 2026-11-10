import * as MessService from "./mess.service.js";

export const createMenu = async (req, res, next) => {
  try {
    const { hostels, hostel, blocks, block, day, breakfast, lunch, dinner } = req.body || {};
    if (!day || !breakfast || !lunch || !dinner) {
      const e = new Error("Day, breakfast, lunch, and dinner are required");
      e.status = 400;
      throw e;
    }
    const created = await MessService.createMenu({ hostels, hostel, blocks, block, day, breakfast, lunch, dinner });
    res.json(created);
  } catch (err) {
    next(err);
  }
};

export const updateMenu = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { hostel, block, day, breakfast, lunch, dinner } = req.body || {};
    const updated = await MessService.updateMenu({ id, hostel, block, day, breakfast, lunch, dinner });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteMenu = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await MessService.deleteMenu({ id });
    res.json(deleted);
  } catch (err) {
    next(err);
  }
};

export const listMenus = async (req, res, next) => {
  try {
    const { day, hostel, block, page = 1, limit = 50 } = req.query;
    const user = req.user;
    const data = await MessService.listMenus({ user, day, hostel, block, page: Number(page), limit: Number(limit) });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const createFeedback = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { menuId, mealType, rating, comment } = req.body || {};
    if (!menuId || !mealType || rating === undefined) {
      const e = new Error("menuId, mealType (BREAKFAST/LUNCH/DINNER), and rating (1-5) are required");
      e.status = 400;
      throw e;
    }
    const feedback = await MessService.createFeedback({
      userId,
      menuId: Number(menuId),
      mealType,
      rating: Number(rating),
      comment,
    });
    res.json({ success: true, feedback });
  } catch (err) {
    next(err);
  }
};

export const analytics = async (req, res, next) => {
  try {
    const { hostel, block, day, mealType, from, to } = req.query;
    const result = await MessService.analytics({ hostel, block, day, mealType, from, to });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
