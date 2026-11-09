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
    floors: [0, 1, 2, 3, 4], // 5 floors (0 to 4)
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

/**
 * Validates hostel and block according to hostel rules.
 * Block is required only if the hostel has blocks.
 */
export const validateLocation = (hostel, block) => {
  if (!hostel || typeof hostel !== "string") {
    return { valid: false, message: "Hostel is required" };
  }

  const cleanHostel = hostel.trim();
  const matchedKey = Object.keys(HOSTELS).find(
    (k) => k.toLowerCase() === cleanHostel.toLowerCase()
  );

  if (!matchedKey) {
    return {
      valid: false,
      message: `Invalid hostel. Allowed hostels: ${Object.keys(HOSTELS).join(", ")}`,
    };
  }

  const config = HOSTELS[matchedKey];

  if (config.hasBlocks) {
    if (!block || typeof block !== "string" || !block.trim()) {
      return {
        valid: false,
        message: `Block is required for ${config.name} (${config.blocks.join(", ")})`,
      };
    }
    const cleanBlock = block.trim().toUpperCase();
    if (!config.blocks.includes(cleanBlock)) {
      return {
        valid: false,
        message: `Invalid block for ${config.name}. Allowed blocks: ${config.blocks.join(", ")}`,
      };
    }
    return { valid: true, hostel: config.name, block: cleanBlock };
  }

  // Hostel does not have blocks
  return { valid: true, hostel: config.name, block: null };
};

/**
 * Validates room number: optional, if provided must be numeric and up to 4 digits.
 * Empty or whitespace becomes null.
 */
export const validateRoomNumber = (roomNumber) => {
  if (roomNumber === undefined || roomNumber === null) {
    return { valid: true, roomNumber: null };
  }
  const str = String(roomNumber).trim();
  if (!str) {
    return { valid: true, roomNumber: null };
  }
  if (!/^\d{1,4}$/.test(str)) {
    return { valid: false, message: "Room number must be numeric and between 1 and 4 digits" };
  }
  return { valid: true, roomNumber: str };
};

