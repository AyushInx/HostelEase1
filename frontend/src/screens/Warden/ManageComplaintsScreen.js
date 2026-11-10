import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import {
  HOSTELS,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_STATUS_COLORS,
} from "../../constants/hostels";
import { confirmAction } from "../../utils/confirmDialog";

export default function ManageComplaintsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [hostelFilter, setHostelFilter] = useState("ALL");

  const headerBg = "#b9e1d0";
  const hostelKeys = Object.keys(HOSTELS);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get("/complaints");
      const payload = res?.data;
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (Array.isArray(payload?.items)) list = payload.items;
      else if (Array.isArray(payload?.data?.items)) list = payload.data.items;
      else if (Array.isArray(payload?.data)) list = payload.data;
      setItems(list);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return items.filter((c) => {
      // Search query filter
      const matchesSearch = [
        c.title,
        c.description,
        c.category,
        c.hostel,
        c.block,
        c.roomNumber,
        c?.user?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;

      // Category filter
      if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;

      // Hostel filter
      const itemHostel = c.hostel || c.user?.hostel;
      if (hostelFilter !== "ALL" && itemHostel !== hostelFilter) return false;

      return true;
    });
  }, [q, items, statusFilter, categoryFilter, hostelFilter]);

  const updateStatus = async (id, status) => {
    try {
      setLoading(true);
      await API.put(`/complaints/update/${id}`, { status });
      await load();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const remove = (id) => {
    confirmAction({
      title: "Delete Complaint",
      message: "Are you sure you want to permanently delete this complaint?",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          setLoading(true);
          await API.delete(`/complaints/${id}`);
          await load();
        } catch (e) {
          Alert.alert("Error", e?.response?.data?.message || "Failed to delete complaint");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const formatLocation = (c) => {
    const parts = [];
    const h = c.hostel || c.user?.hostel;
    const b = c.block || c.user?.block;
    const r = c.roomNumber || c.user?.roomNumber;
    if (h) parts.push(h);
    if (b) parts.push(`Block ${b}`);
    if (r) parts.push(`Room ${r}`);
    return parts.length > 0 ? parts.join(" • ") : "Hostel Campus";
  };

  const hasActiveFilters =
    statusFilter !== "ALL" || categoryFilter !== "ALL" || hostelFilter !== "ALL";

  const clearFilters = () => {
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setHostelFilter("ALL");
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header Hero */}
        <View style={[styles.hero, { backgroundColor: headerBg }]}>
          <View style={styles.heroRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation?.goBack?.()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color="#111" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
              onPress={() => setFilterOpen(true)}
            >
              <Ionicons
                name="filter"
                size={16}
                color={hasActiveFilters ? "#fff" : "#111"}
              />
              <Text
                style={[
                  styles.filterText,
                  hasActiveFilters && styles.filterTextActive,
                ]}
              >
                {hasActiveFilters ? "Filtered" : "Filter"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.kicker}>Complaints</Text>
          <Text style={styles.heading}>
            Review, accept, and resolve student issues.
          </Text>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#555" />
            <TextInput
              placeholder="Search by title, student, or room..."
              value={q}
              onChangeText={setQ}
              style={styles.searchInput}
              placeholderTextColor="#777"
            />
            {q ? (
              <TouchableOpacity onPress={() => setQ("")}>
                <Ionicons name="close-circle" size={18} color="#555" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Complaints List */}
        <View style={styles.listWrap}>
          {loading && <Text style={styles.muted}>Loading complaints...</Text>}
          {!loading && filtered.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="checkbox-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No complaints found</Text>
              {hasActiveFilters && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                  <Text style={styles.clearBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {filtered.map((c) => {
            const badgeColor = COMPLAINT_STATUS_COLORS[c.status] || "#FF9800";
            const statusLabel = COMPLAINT_STATUS_LABELS[c.status] || c.status;

            return (
              <View key={c.id} style={styles.card}>
                {/* Header: Title, Category, Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {c.title}
                    </Text>
                    {c.category ? (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{c.category}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.badgeText}>{statusLabel}</Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.desc}>{c.description}</Text>

                {/* Meta: Location & Student */}
                <View style={styles.metaRow}>
                  <View style={styles.locationPill}>
                    <Ionicons name="location" size={13} color="#4b5563" />
                    <Text style={styles.locationText}>{formatLocation(c)}</Text>
                  </View>
                  {c.user?.name ? (
                    <View style={styles.userPill}>
                      <Ionicons name="person-outline" size={13} color="#4b5563" />
                      <Text style={styles.userText}>{c.user.name}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  {/* Accept button (sets to ACKNOWLEDGED) */}
                  {c.status === "PENDING" && (
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.acceptBtn]}
                      onPress={() => updateStatus(c.id, "ACKNOWLEDGED")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                  )}

                  {/* Mark In-Progress */}
                  {c.status !== "IN_PROGRESS" && c.status !== "RESOLVED" && (
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.progressBtn]}
                      onPress={() => updateStatus(c.id, "IN_PROGRESS")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="construct-outline" size={15} color="#fff" />
                      <Text style={styles.progressText}>Fixing</Text>
                    </TouchableOpacity>
                  )}

                  {/* Resolve */}
                  {c.status !== "RESOLVED" && (
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.resolveBtn]}
                      onPress={() => updateStatus(c.id, "RESOLVED")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={15} color="#fff" />
                      <Text style={styles.resolveText}>Resolve</Text>
                    </TouchableOpacity>
                  )}

                  <View style={{ flex: 1 }} />

                  {/* Delete */}
                  <TouchableOpacity
                    style={[styles.smallBtn, styles.dangerBtn]}
                    onPress={() => remove(c.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Filter Modal (Status, Category, Hostel) */}
      <Modal visible={filterOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Complaints</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Ionicons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status Filter */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterChipsRow}>
                {["ALL", "PENDING", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"].map(
                  (st) => {
                    const isSelected = statusFilter === st;
                    const label =
                      st === "ALL" ? "All" : COMPLAINT_STATUS_LABELS[st] || st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[styles.fChip, isSelected && styles.fChipActive]}
                        onPress={() => setStatusFilter(st)}
                      >
                        <Text
                          style={[
                            styles.fChipText,
                            isSelected && styles.fChipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              {/* Category Filter */}
              <Text style={styles.filterSectionTitle}>Category</Text>
              <View style={styles.filterChipsRow}>
                {["ALL", ...COMPLAINT_CATEGORIES].map((cat) => {
                  const isSelected = categoryFilter === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.fChip, isSelected && styles.fChipActive]}
                      onPress={() => setCategoryFilter(cat)}
                    >
                      <Text
                        style={[
                          styles.fChipText,
                          isSelected && styles.fChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Hostel Filter */}
              <Text style={styles.filterSectionTitle}>Hostel</Text>
              <View style={styles.filterChipsRow}>
                {["ALL", ...hostelKeys].map((h) => {
                  const isSelected = hostelFilter === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[styles.fChip, isSelected && styles.fChipActive]}
                      onPress={() => setHostelFilter(h)}
                    >
                      <Text
                        style={[
                          styles.fChipText,
                          isSelected && styles.fChipTextActive,
                        ]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.clearAction]}
                onPress={clearFilters}
              >
                <Text style={styles.clearActionText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.applyAction]}
                onPress={() => setFilterOpen(false)}
              >
                <Text style={styles.applyActionText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f2f0e7",
  },
  hero: {
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  filterBtnActive: {
    backgroundColor: "#111827",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },
  filterTextActive: {
    color: "#fff",
  },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#111",
  },
  listWrap: {
    padding: 16,
  },
  muted: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4b5563",
    marginTop: 10,
  },
  clearBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  categoryBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  categoryText: {
    color: "#0284c7",
    fontSize: 11,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  desc: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  userPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  userText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  acceptBtn: {
    backgroundColor: "#9C27B0", // Purple for Accepted / Acknowledged
  },
  acceptText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  progressBtn: {
    backgroundColor: "#2563eb",
  },
  progressText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  resolveBtn: {
    backgroundColor: "#16a34a",
  },
  resolveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  dangerBtn: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  filterModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  fChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  fChipTextActive: {
    color: "#ffffff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clearAction: {
    backgroundColor: "#f3f4f6",
  },
  clearActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4b5563",
  },
  applyAction: {
    backgroundColor: "#111827",
  },
  applyActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
