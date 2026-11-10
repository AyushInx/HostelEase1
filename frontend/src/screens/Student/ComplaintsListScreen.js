import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import { useFocusEffect } from "@react-navigation/native";
import ComplaintTracker from "../../components/ComplaintTracker";
import {
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_STATUS_COLORS,
} from "../../constants/hostels";
import { confirmAction } from "../../utils/confirmDialog";

export default function ComplaintsListScreen() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const res = await API.get("/complaints/my");
      setComplaints(res.data?.items || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [])
  );

  const handleDelete = (id) => {
    confirmAction({
      title: "Delete Complaint",
      message: "Are you sure you want to permanently delete this complaint?",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          setLoading(true);
          await API.delete(`/complaints/${id}`);
          loadComplaints();
        } catch (e) {
          Alert.alert("Error", e?.response?.data?.message || "Failed to delete complaint");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const formatLocation = (item) => {
    const parts = [];
    if (item.hostel) parts.push(item.hostel);
    if (item.block) parts.push(`Block ${item.block}`);
    if (item.roomNumber) parts.push(`Room ${item.roomNumber}`);
    return parts.length > 0 ? parts.join(" • ") : "Hostel Campus";
  };

  const renderItem = ({ item }) => {
    const statusLabel = COMPLAINT_STATUS_LABELS[item.status] || item.status;
    const badgeColor = COMPLAINT_STATUS_COLORS[item.status] || "#FF9800";

    return (
      <View style={styles.card}>
        {/* Top Header: Category, Status badge, Date, Delete */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{statusLabel}</Text>
            </View>
            {item.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={17} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.complaintTitle}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>

        {/* Location Tag */}
        <View style={styles.locationTag}>
          <Ionicons name="location-sharp" size={14} color="#6b7280" />
          <Text style={styles.locationText}>{formatLocation(item)}</Text>
        </View>

        {/* Step Tracker */}
        <View style={styles.trackerWrap}>
          <ComplaintTracker status={item.status} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={complaints}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadComplaints} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No complaints found</Text>
              <Text style={styles.emptySubText}>
                Need help? Tap 'New Complaint' to report any hostel issues.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f0e7",
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  categoryBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryText: {
    color: "#0284c7",
    fontSize: 11,
    fontWeight: "600",
  },
  date: {
    color: "#9ca3af",
    fontSize: 12,
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
    marginBottom: 10,
  },
  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f9fafb",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  trackerWrap: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6b7280",
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 4,
  },
});
