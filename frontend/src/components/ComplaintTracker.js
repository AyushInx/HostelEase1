import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COMPLAINT_STEPS, COMPLAINT_STATUS_LABELS } from "../constants/hostels";

export default function ComplaintTracker({ status }) {
  const currentIndex = COMPLAINT_STEPS.indexOf(status);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <View style={styles.container}>
      <View style={styles.trackRow}>
        {COMPLAINT_STEPS.map((stepKey, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isPending = idx > activeIndex;

          const dotColor = isDone
            ? "#4CAF50"
            : isCurrent
            ? "#2196F3"
            : "#d1d5db";

          return (
            <React.Fragment key={stepKey}>
              {/* Step Dot */}
              <View style={styles.stepContainer}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: dotColor },
                    isCurrent && styles.activeDotRing,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : isCurrent ? (
                    <View style={styles.innerDot} />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.label,
                    isCurrent && styles.activeLabel,
                    isDone && styles.doneLabel,
                  ]}
                  numberOfLines={1}
                >
                  {COMPLAINT_STATUS_LABELS[stepKey] || stepKey}
                </Text>
              </View>

              {/* Connecting line between steps */}
              {idx < COMPLAINT_STEPS.length - 1 && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: idx < activeIndex ? "#4CAF50" : "#e5e7eb",
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepContainer: {
    alignItems: "center",
    width: 68,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  activeDotRing: {
    borderWidth: 3,
    borderColor: "#bbdefb",
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  line: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: -4,
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9ca3af",
    marginTop: 6,
    textAlign: "center",
  },
  activeLabel: {
    color: "#2196F3",
    fontWeight: "700",
  },
  doneLabel: {
    color: "#1f2937",
    fontWeight: "600",
  },
});
