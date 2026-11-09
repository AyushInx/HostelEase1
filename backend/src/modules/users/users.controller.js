import * as UsersService from "./users.service.js";

export const listUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const data = await UsersService.listUsers({
      role,
      search,
      page: Number(page),
      limit: Number(limit),
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, hostel, block, roomNumber, oldPassword, newPassword } = req.body || {};

    const updated = await UsersService.updateMe({
      userId,
      name,
      hostel,
      block,
      roomNumber,
      oldPassword,
      newPassword,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const getStudentStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await UsersService.getStudentStats({ userId });
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
