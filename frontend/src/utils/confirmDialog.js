import { Alert, Platform } from "react-native";

/**
 * Universal cross-platform confirmation dialog that works identically
 * on Native (iOS/Android) and Web (Vercel/browsers).
 * 
 * In React Native Web, Alert.alert ignores button callbacks.
 * This utility uses window.confirm on web and Alert.alert on mobile native.
 */
export const confirmAction = ({
  title = "Confirm",
  message = "Are you sure you want to proceed?",
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  isDestructive = true,
}) => {
  if (Platform.OS === "web") {
    const textPrompt = `${title}\n\n${message}`;
    const ok = typeof window !== "undefined" ? window.confirm(textPrompt) : false;
    if (ok && typeof onConfirm === "function") {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: "cancel" },
      {
        text: confirmText,
        style: isDestructive ? "destructive" : "default",
        onPress: onConfirm,
      },
    ]);
  }
};

export const showAlert = (title, message) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert([title, message].filter(Boolean).join("\n\n"));
  } else {
    Alert.alert(title, message);
  }
};

/**
 * Format any ISO/Date string into standard DD-MM-YYYY
 */
export const formatDMY = (dateVal) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};
