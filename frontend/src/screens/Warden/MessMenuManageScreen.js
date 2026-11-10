import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import { confirmAction } from "../../utils/confirmDialog";
import { HOSTELS } from "../../constants/hostels";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOSTEL_KEYS = Object.keys(HOSTELS); // ["CVR", "Aryabhatta", "Kalam", "Asima"]
const ALL_BLOCKS = ["A", "B", "C", "D"];

export default function MessMenuManageScreen({ navigation }) {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const headerBg = "#f5cf6a";

  // Filter state for viewing menu cards
  const [selectedHostelFilter, setSelectedHostelFilter] = useState("ALL");
  const [selectedDayFilter, setSelectedDayFilter] = useState("ALL");

  // Create / Edit Modal State
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [targetHostels, setTargetHostels] = useState(["CVR"]);
  const [targetBlocks, setTargetBlocks] = useState(["ALL"]);
  const [day, setDay] = useState("Monday");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");

  // Analytics Dashboard Modal State
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({ meals: [], feedbackList: [], overallAvg: 0, totalRatings: 0 });
  const [analyticsHostel, setAnalyticsHostel] = useState("ALL");
  const [analyticsMealType, setAnalyticsMealType] = useState("ALL");
  const [analyticsDay, setAnalyticsDay] = useState("ALL");
  const [analyticsTab, setAnalyticsTab] = useState("ratings"); // 'ratings' | 'comments'

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/mess/menu");
      const items = res.data?.items || [];
      setMenus(items);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsOpen(true);
      const qs = new URLSearchParams();
      if (analyticsHostel !== "ALL") qs.append("hostel", analyticsHostel);
      if (analyticsMealType !== "ALL") qs.append("mealType", analyticsMealType);
      if (analyticsDay !== "ALL") qs.append("day", analyticsDay);

      const res = await API.get(`/mess/analytics?${qs.toString()}`);
      setAnalyticsData(res.data || { meals: [], feedbackList: [], overallAvg: 0, totalRatings: 0 });
    } catch (e) {
      Alert.alert("Analytics Error", e?.response?.data?.message || "Failed to load ratings");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsHostel, analyticsMealType, analyticsDay]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (analyticsOpen) {
      loadAnalytics();
    }
  }, [analyticsHostel, analyticsMealType, analyticsDay]);

  const remove = (id, menuInfo) => {
    confirmAction({
      title: "Delete Mess Menu",
      message: `Are you sure you want to delete this menu?\n\n${menuInfo}`,
      confirmText: "Delete Menu",
      onConfirm: async () => {
        try {
          setLoading(true);
          await API.delete(`/mess/menu/${id}`);
          await load();
        } catch (e) {
          Alert.alert("Error", e?.response?.data?.message || "Failed to delete menu");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const openCreateModal = () => {
    setEditingId(null);
    setTargetHostels(["CVR"]);
    setTargetBlocks(["ALL"]);
    setDay("Monday");
    setBreakfast("");
    setLunch("");
    setDinner("");
    setOpen(true);
  };

  const openEditModal = (menu) => {
    setEditingId(menu.id);
    setTargetHostels([menu.hostel || "CVR"]);
    setTargetBlocks([menu.block || "ALL"]);
    setDay(menu.day || "Monday");
    setBreakfast(menu.breakfast || "");
    setLunch(menu.lunch || "");
    setDinner(menu.dinner || "");
    setOpen(true);
  };

  const toggleHostelSelection = (h) => {
    if (targetHostels.includes(h)) {
      if (targetHostels.length === 1) return; // Keep at least one
      setTargetHostels(targetHostels.filter((x) => x !== h));
    } else {
      setTargetHostels([...targetHostels, h]);
    }
  };

  const toggleBlockSelection = (b) => {
    if (b === "ALL") {
      setTargetBlocks(["ALL"]);
      return;
    }
    let next = targetBlocks.filter((x) => x !== "ALL");
    if (next.includes(b)) {
      next = next.filter((x) => x !== b);
      if (next.length === 0) next = ["ALL"];
    } else {
      next = [...next, b];
    }
    setTargetBlocks(next);
  };

  const submit = async () => {
    if (loading) return;

    if (!breakfast.trim() || !lunch.trim() || !dinner.trim()) {
      return Alert.alert("Input Required", "Please provide breakfast, lunch, and dinner items.");
    }

    try {
      setLoading(true);

      if (editingId) {
        // Single update
        await API.put(`/mess/menu/${editingId}`, {
          hostel: targetHostels[0] || "CVR",
          block: targetBlocks.includes("ALL") ? null : targetBlocks[0],
          day,
          breakfast: breakfast.trim(),
          lunch: lunch.trim(),
          dinner: dinner.trim(),
        });
      } else {
        // Bulk or single create
        const selectedBlocks = targetBlocks.includes("ALL") ? [null] : targetBlocks;
        await API.post("/mess/menu", {
          hostels: targetHostels,
          blocks: selectedBlocks,
          day,
          breakfast: breakfast.trim(),
          lunch: lunch.trim(),
          dinner: dinner.trim(),
        });
      }

      // Clear form immediately
      setOpen(false);
      setEditingId(null);
      setBreakfast("");
      setLunch("");
      setDinner("");
      await load();
      Alert.alert("Success", "Mess menu published successfully! 🍳");
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to save menu");
    } finally {
      setLoading(false);
    }
  };

  const filteredMenus = useMemo(() => {
    return menus.filter((m) => {
      if (selectedHostelFilter !== "ALL" && m.hostel !== selectedHostelFilter) return false;
      if (selectedDayFilter !== "ALL" && m.day !== selectedDayFilter) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        const text = [m.day, m.hostel, m.block, m.breakfast, m.lunch, m.dinner].join(" ").toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [menus, selectedHostelFilter, selectedDayFilter, q]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Section */}
        <View style={[styles.hero, { backgroundColor: headerBg }]}>
          <View style={styles.heroRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
              <Ionicons name="chevron-back" size={18} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.analyticsBtn} onPress={loadAnalytics}>
              <Ionicons name="stats-chart" size={16} color="#0f172a" />
              <Text style={styles.analyticsText}>Rating Analytics & Feedback</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.kicker}>Mess Administration</Text>
          <Text style={styles.heading}>Hostel Mess Menus 🍳</Text>
          <Text style={styles.heroSubText}>
            Publish and manage menus for CVR, Kalam, Asima, and Aryabhatta with multi-block support.
          </Text>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#555" />
            <TextInput
              placeholder="Search dishes or days..."
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

        {/* Hostel Filter Tabs */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by Hostel:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.filterChip, selectedHostelFilter === "ALL" && styles.filterChipActive]}
              onPress={() => setSelectedHostelFilter("ALL")}
            >
              <Text style={[styles.filterChipText, selectedHostelFilter === "ALL" && styles.filterChipTextActive]}>
                All Hostels ({menus.length})
              </Text>
            </TouchableOpacity>
            {HOSTEL_KEYS.map((hKey) => {
              const count = menus.filter((m) => m.hostel === hKey).length;
              const isSelected = selectedHostelFilter === hKey;
              return (
                <TouchableOpacity
                  key={hKey}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedHostelFilter(hKey)}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {hKey} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Day Filter Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterChipsRow, { marginTop: 8 }]}>
            <TouchableOpacity
              style={[styles.dayFilterChip, selectedDayFilter === "ALL" && styles.dayFilterChipActive]}
              onPress={() => setSelectedDayFilter("ALL")}
            >
              <Text style={[styles.dayFilterText, selectedDayFilter === "ALL" && styles.dayFilterTextActive]}>All Days</Text>
            </TouchableOpacity>
            {DAYS.map((d) => {
              const isSelected = selectedDayFilter === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayFilterChip, isSelected && styles.dayFilterChipActive]}
                  onPress={() => setSelectedDayFilter(d)}
                >
                  <Text style={[styles.dayFilterText, isSelected && styles.dayFilterTextActive]}>{d.slice(0, 3)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Menu Cards List */}
        <View style={styles.listWrap}>
          {loading && menus.length === 0 && <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 20 }} />}
          {!loading && filteredMenus.length === 0 && (
            <View style={styles.emptyWrap}>
              <Ionicons name="fast-food-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No menus match your filter</Text>
              <Text style={styles.emptySubtitle}>Tap the + button below to create a new mess menu.</Text>
            </View>
          )}

          {filteredMenus.map((m) => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.cardDay}>{m.day}</Text>
                  <View style={styles.hostelBadgeRow}>
                    <View style={styles.hostelBadge}>
                      <Ionicons name="business" size={11} color="#1e3a8a" />
                      <Text style={styles.hostelBadgeText}>{m.hostel}</Text>
                    </View>
                    <View style={styles.blockBadge}>
                      <Text style={styles.blockBadgeText}>{m.block ? `Block ${m.block}` : "All Blocks"}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => openEditModal(m)}>
                    <Ionicons name="pencil" size={17} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconActionBtn, { backgroundColor: "#fef2f2" }]}
                    onPress={() => remove(m.id, `${m.hostel} (${m.block || "All Blocks"}) - ${m.day}`)}
                  >
                    <Ionicons name="trash-outline" size={17} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Meals Preview */}
              <View style={styles.mealRows}>
                <View style={styles.mealRow}>
                  <Text style={styles.mealRowLabel}>🌅 Breakfast</Text>
                  <Text style={styles.mealRowText}>{m.breakfast}</Text>
                </View>

                <View style={styles.mealRow}>
                  <Text style={styles.mealRowLabel}>🍛 Lunch</Text>
                  <Text style={styles.mealRowText}>{m.lunch}</Text>
                </View>

                <View style={styles.mealRow}>
                  <Text style={styles.mealRowLabel}>🌙 Dinner</Text>
                  <Text style={styles.mealRowText}>{m.dinner}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal} activeOpacity={0.9}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* CREATE / EDIT MENU MODAL */}
      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Mess Menu" : "Publish Mess Menu"}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {/* Target Hostel Multi-select */}
              <Text style={styles.inputLabel}>Target Hostel(s) * (Select one or more)</Text>
              <View style={styles.multiSelectRow}>
                {HOSTEL_KEYS.map((hKey) => {
                  const isSelected = targetHostels.includes(hKey);
                  return (
                    <TouchableOpacity
                      key={hKey}
                      style={[styles.multiSelectChip, isSelected && styles.multiSelectChipActive]}
                      onPress={() => toggleHostelSelection(hKey)}
                    >
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={15}
                        color={isSelected ? "#2563eb" : "#64748b"}
                      />
                      <Text style={[styles.multiSelectChipText, isSelected && styles.multiSelectChipTextActive]}>
                        {hKey}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Target Block Multi-select */}
              <Text style={styles.inputLabel}>Target Block(s) *</Text>
              <View style={styles.multiSelectRow}>
                <TouchableOpacity
                  style={[styles.multiSelectChip, targetBlocks.includes("ALL") && styles.multiSelectChipActive]}
                  onPress={() => toggleBlockSelection("ALL")}
                >
                  <Text style={[styles.multiSelectChipText, targetBlocks.includes("ALL") && styles.multiSelectChipTextActive]}>
                    All Blocks
                  </Text>
                </TouchableOpacity>

                {ALL_BLOCKS.map((b) => {
                  const isSelected = targetBlocks.includes(b);
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.multiSelectChip, isSelected && styles.multiSelectChipActive]}
                      onPress={() => toggleBlockSelection(b)}
                    >
                      <Text style={[styles.multiSelectChipText, isSelected && styles.multiSelectChipTextActive]}>
                        Block {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Day Selector */}
              <Text style={styles.inputLabel}>Day of the Week *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                {DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.modalDayChip, day === d && styles.modalDayChipActive]}
                    onPress={() => setDay(d)}
                  >
                    <Text style={[styles.modalDayChipText, day === d && styles.modalDayChipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Meal Inputs */}
              <Text style={styles.inputLabel}>Breakfast Items *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Aloo Paratha, Curd, Chutney, Tea"
                value={breakfast}
                onChangeText={setBreakfast}
                placeholderTextColor="#94a3b8"
                multiline
              />

              <Text style={styles.inputLabel}>Lunch Items *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Rajma, Steamed Rice, Roti, Salad"
                value={lunch}
                onChangeText={setLunch}
                placeholderTextColor="#94a3b8"
                multiline
              />

              <Text style={styles.inputLabel}>Dinner Items *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Paneer Butter Masala, Dal, Roti, Rice"
                value={dinner}
                onChangeText={setDinner}
                placeholderTextColor="#94a3b8"
                multiline
              />
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, loading && { opacity: 0.6 }]}
                onPress={submit}
                disabled={loading}
              >
                <Text style={styles.modalSubmitText}>
                  {loading ? "Publishing..." : editingId ? "Update Menu" : "Publish Menu"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DETAILED RATING DASHBOARD & FEEDBACK MODAL */}
      <Modal visible={analyticsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.analyticsModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Mess Rating & Feedback Dashboard 📊</Text>
                <Text style={styles.analyticsSubTitle}>
                  Overall Average: ⭐ {analyticsData.overallAvg} / 5.0 ({analyticsData.totalRatings} total ratings)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAnalyticsOpen(false)}>
                <Ionicons name="close-circle" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Tab Selector: Meal Ratings vs Written Complaints */}
            <View style={styles.analyticsTabsRow}>
              <TouchableOpacity
                style={[styles.analyticsTabBtn, analyticsTab === "ratings" && styles.analyticsTabBtnActive]}
                onPress={() => setAnalyticsTab("ratings")}
              >
                <Ionicons name="star" size={15} color={analyticsTab === "ratings" ? "#2563eb" : "#64748b"} />
                <Text style={[styles.analyticsTabText, analyticsTab === "ratings" && styles.analyticsTabTextActive]}>
                  Meal Ratings Breakdown ({analyticsData.meals?.length || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.analyticsTabBtn, analyticsTab === "comments" && styles.analyticsTabBtnActive]}
                onPress={() => setAnalyticsTab("comments")}
              >
                <Ionicons name="chatbubbles" size={15} color={analyticsTab === "comments" ? "#2563eb" : "#64748b"} />
                <Text style={[styles.analyticsTabText, analyticsTab === "comments" && styles.analyticsTabTextActive]}>
                  Written Feedback ({analyticsData.feedbackList?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filters Row */}
            <View style={styles.analyticsFiltersWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {/* Hostel Filter */}
                <TouchableOpacity
                  style={[styles.filterChipSm, analyticsHostel === "ALL" && styles.filterChipSmActive]}
                  onPress={() => setAnalyticsHostel("ALL")}
                >
                  <Text style={[styles.filterChipSmText, analyticsHostel === "ALL" && styles.filterChipSmTextActive]}>
                    All Hostels
                  </Text>
                </TouchableOpacity>
                {HOSTEL_KEYS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.filterChipSm, analyticsHostel === h && styles.filterChipSmActive]}
                    onPress={() => setAnalyticsHostel(h)}
                  >
                    <Text style={[styles.filterChipSmText, analyticsHostel === h && styles.filterChipSmTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {analyticsLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ marginTop: 10, color: "#64748b" }}>Loading analytics dashboard...</Text>
              </View>
            ) : analyticsTab === "ratings" ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                {analyticsData.meals?.length === 0 ? (
                  <Text style={styles.muted}>No meals found for the selected filter.</Text>
                ) : (
                  analyticsData.meals.map((item, idx) => {
                    const stars = item.starCounts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                    const total = item.totalRatings || 0;

                    return (
                      <View key={idx} style={styles.analyticsMealCard}>
                        <View style={styles.analyticsMealHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.analyticsMealTitle}>
                              {item.day} • {item.mealType}
                            </Text>
                            <Text style={styles.analyticsMealLocation}>
                              {item.hostel} • {item.block}
                            </Text>
                          </View>

                          <View style={styles.analyticsScoreBadge}>
                            <Ionicons name="star" size={14} color="#f59e0b" />
                            <Text style={styles.analyticsScoreText}>
                              {total > 0 ? `${item.averageRating} / 5.0` : "No ratings"}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.analyticsMealContent}>{item.mealContent}</Text>
                        <Text style={styles.analyticsTotalVotesText}>{total} students rated this meal</Text>

                        {/* 1-5 Star Breakdown Bars */}
                        <View style={styles.starBarsWrap}>
                          {[5, 4, 3, 2, 1].map((s) => {
                            const count = stars[s] || 0;
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <View key={s} style={styles.starBarRow}>
                                <Text style={styles.starBarLabel}>{s} ⭐</Text>
                                <View style={styles.starBarTrack}>
                                  <View style={[styles.starBarFill, { width: `${pct}%` }]} />
                                </View>
                                <Text style={styles.starBarCount}>
                                  {count} ({pct}%)
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                {analyticsData.feedbackList?.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 40 }}>
                    <Ionicons name="chatbubble-outline" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No written feedback yet</Text>
                    <Text style={styles.emptySubtitle}>Student issue reports and comments will appear here.</Text>
                  </View>
                ) : (
                  analyticsData.feedbackList.map((entry, idx) => (
                    <View key={idx} style={styles.feedbackCardItem}>
                      <View style={styles.feedbackCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.feedbackStudentName}>{entry.studentName}</Text>
                          <Text style={styles.feedbackStudentLocation}>
                            {entry.userHostel} • Block {entry.userBlock} • Room {entry.roomNumber}
                          </Text>
                        </View>
                        <View style={styles.feedbackRatingPill}>
                          <Ionicons name="star" size={12} color="#f59e0b" />
                          <Text style={styles.feedbackRatingPillText}>{entry.rating} / 5</Text>
                        </View>
                      </View>

                      <View style={styles.feedbackMealTag}>
                        <Text style={styles.feedbackMealTagText}>
                          {entry.day} • {entry.mealType} ({entry.mealName})
                        </Text>
                      </View>

                      <Text style={styles.feedbackCommentText}>"{entry.comment}"</Text>
                      <Text style={styles.feedbackTime}>
                        {new Date(entry.createdAt).toLocaleDateString()} at{" "}
                        {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.closeAnalyticsBtn} onPress={() => setAnalyticsOpen(false)}>
              <Text style={styles.closeAnalyticsBtnText}>Close Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f4f6fa",
  },
  hero: {
    margin: 16,
    padding: 20,
    borderRadius: 26,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 46,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  analyticsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  kicker: {
    color: "#1e293b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
    marginBottom: 4,
  },
  heroSubText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 16,
    marginBottom: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    color: "#111",
    fontSize: 13,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterChipsRow: {
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  dayFilterChip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dayFilterChipActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  dayFilterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  dayFilterTextActive: {
    color: "#ffffff",
  },
  listWrap: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  muted: {
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 30,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitleWrap: {
    flex: 1,
  },
  cardDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  hostelBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  hostelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hostelBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  blockBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  blockBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  mealRows: {
    gap: 10,
  },
  mealRow: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  mealRowLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 3,
  },
  mealRowText: {
    fontSize: 13,
    color: "#1e293b",
    lineHeight: 18,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 540,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
    marginBottom: 6,
  },
  multiSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  multiSelectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  multiSelectChipActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  multiSelectChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  multiSelectChipTextActive: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  modalDayChip: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalDayChipActive: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  modalDayChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  modalDayChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a",
    minHeight: 50,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  modalCancelText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 13,
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2563eb",
  },
  modalSubmitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  analyticsModalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 580,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  analyticsSubTitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  analyticsTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  analyticsTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  analyticsTabBtnActive: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  analyticsTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  analyticsTabTextActive: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  analyticsFiltersWrap: {
    marginBottom: 10,
  },
  filterChipSm: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  filterChipSmActive: {
    backgroundColor: "#2563eb",
  },
  filterChipSmText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipSmTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  analyticsMealCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  analyticsMealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  analyticsMealTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  analyticsMealLocation: {
    fontSize: 11,
    color: "#64748b",
  },
  analyticsScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  analyticsScoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  analyticsMealContent: {
    fontSize: 12,
    color: "#334155",
    marginVertical: 4,
  },
  analyticsTotalVotesText: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 6,
  },
  starBarsWrap: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4,
  },
  starBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starBarLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    width: 32,
  },
  starBarTrack: {
    flex: 1,
    height: 7,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  starBarFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 4,
  },
  starBarCount: {
    fontSize: 10,
    color: "#64748b",
    width: 60,
    textAlign: "right",
  },
  feedbackCardItem: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  feedbackCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  feedbackStudentName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  feedbackStudentLocation: {
    fontSize: 11,
    color: "#64748b",
  },
  feedbackRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  feedbackRatingPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400e",
  },
  feedbackMealTag: {
    backgroundColor: "#eff6ff",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  feedbackMealTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1e40af",
  },
  feedbackCommentText: {
    fontSize: 13,
    color: "#1e293b",
    lineHeight: 18,
    fontStyle: "italic",
    marginBottom: 4,
  },
  feedbackTime: {
    fontSize: 10,
    color: "#94a3b8",
  },
  closeAnalyticsBtn: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  closeAnalyticsBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
});
