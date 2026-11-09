export const HOSTELS = {
  CVR: {
    name: "CVR",
    hasBlocks: false,
    blocks: [],
    floors: [0, 1, 2, 3, 4, 5, 6, 7],
    roomsPerFloor: 28,
  },
  Aryabhatta: {
    name: "Aryabhatta",
    hasBlocks: true,
    blocks: ["A", "B", "C", "D"],
    floors: [0, 1, 2, 3, 4, 5, 6, 7],
    roomsPerFloor: 32,
  },
  Kalam: {
    name: "Kalam",
    hasBlocks: true,
    blocks: ["A", "B", "C", "D"],
    floors: [0, 1, 2, 3, 4, 5, 6, 7],
    roomsPerFloor: 37,
  },
  Asima: {
    name: "Asima",
    hasBlocks: true,
    blocks: ["A", "B", "C", "D"],
    floors: [0, 1, 2, 3, 4],
    roomsPerFloor: null,
  },
};

export const COMPLAINT_CATEGORIES = [
  "Electrical",
  "Civil",
  "Mess",
  "Internet / Wi-Fi",
  "Other",
];

export const COMPLAINT_STATUS_LABELS = {
  PENDING: "Submitted",
  ACKNOWLEDGED: "Accepted",
  IN_PROGRESS: "Being Fixed",
  RESOLVED: "Resolved",
};

export const COMPLAINT_STATUS_COLORS = {
  PENDING: "#FF9800",
  ACKNOWLEDGED: "#9C27B0",
  IN_PROGRESS: "#2196F3",
  RESOLVED: "#4CAF50",
};

export const COMPLAINT_STEPS = ["PENDING", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];

