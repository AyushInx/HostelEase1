import * as ComplaintsService from "./complaints.service.js";

export const createComplaint = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, description, category, hostel, block, roomNumber, imageUrl } = req.body || {};

    if (!title || !title.trim()) {
      const e = new Error("Title is required");
      e.status = 400;
      throw e;
    }

    const created = await ComplaintsService.createComplaint({
      userId,
      title: title.trim(),
      description: description ? description.trim() : "",
      category,
      hostel,
      block,
      roomNumber,
      imageUrl: imageUrl || null,
    });
    res.json(created);
  } catch (error) {
    next(error);
  }
};

export const listMyComplaints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, category } = req.query;
    const data = await ComplaintsService.listMyComplaints({
      userId,
      page: Number(page),
      limit: Number(limit),
      status,
      category,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const listComplaints = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, category, hostel } = req.query;
    const data = await ComplaintsService.listComplaints({
      page: Number(page),
      limit: Number(limit),
      status,
      category,
      hostel,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const updateComplaint = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!status) {
      const e = new Error("status is required");
      e.status = 400;
      throw e;
    }
    const updated = await ComplaintsService.updateComplaint({ id, status });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const getComplaintById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const requester = req.user;
    const complaint = await ComplaintsService.getComplaintById({ id });
    if (!complaint) {
      const e = new Error("Complaint not found");
      e.status = 404;
      throw e;
    }
    if (requester.role === "STUDENT" && complaint.userId !== requester.id) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    res.json(complaint);
  } catch (error) {
    next(error);
  }
};

export const deleteComplaint = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const requester = req.user;
    const complaint = await ComplaintsService.getComplaintById({ id });
    if (!complaint) {
      const e = new Error("Complaint not found");
      e.status = 404;
      throw e;
    }
    if (requester.role === "STUDENT" && complaint.userId !== requester.id) {
      const e = new Error("Forbidden");
      e.status = 403;
      throw e;
    }
    await ComplaintsService.deleteComplaint({ id });
    res.json({ success: true, message: "Complaint deleted" });
  } catch (error) {
    next(error);
  }
};
