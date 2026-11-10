import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import { AuthContext } from "../../context/AuthContext";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const RATING_LABELS = {
  1: "Very Bad",
  2: "Bad",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

export default function MessMenuScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  // Set default selected day to current day of the week
  const getTodayDayName = () => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayNames[new Date().getDay()] || "Monday";
  };

  const [selectedDay, setSelectedDay] = useState(getTodayDayName());
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingMeal, setSubmittingMeal] = useState(null); // 'BREAKFAST' | 'LUNCH' | 'DINNER' | null
  const [activeCommentMeal, setActiveCommentMeal] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [studentInfo, setStudentInfo] = useState({
    hostel: user?.hostel || "CVR",
    block: user?.block || null,
  });

  const loadMenus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/mess/menu");
      const items = res.data?.items || [];
      setMenus(items);
      if (res.data?.studentHostel) {
        setStudentInfo({
          hostel: res.data.studentHostel,
          block: res.data.studentBlock || null,
        });
      }
    } catch (e) {
      console.log("Failed to load mess menus", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const currentMenu = menus.find((m) => m.day === selectedDay);

  const handleRateMeal = async (mealType, rating, customComment = null) => {
    if (!currentMenu) return;
    if (submittingMeal) return;

    try {
      setSubmittingMeal(mealType);
      const commentToSubmit =
        customComment !== null ? customComment : (commentText[mealType] || currentMenu.meals?.[mealType.toLowerCase()]?.myComment || "");

      const res = await API.post("/mess/feedback", {
        menuId: currentMenu.id,
        mealType,
        rating,
        comment: commentToSubmit.trim() || null,
      });

      // Optimistically update the menu state
      setMenus((prev) =>
        prev.map((m) => {
          if (m.id === currentMenu.id) {
            const key = mealType.toLowerCase();
            const prevStats = m.meals?.[key] || {};
            const hadRated = prevStats.myRating !== null;
            const prevRating = prevStats.myRating || 0;
            const newTotal = hadRated ? prevStats.totalRatings : prevStats.totalRatings + 1;
            const newSum = (prevStats.averageRating * prevStats.totalRatings) - prevRating + rating;
            const newAvg = newTotal > 0 ? Math.round((newSum / newTotal) * 10) / 10 : rating;

            return {
              ...m,
              meals: {
                ...m.meals,
                [key]: {
                  ...prevStats,
                  totalRatings: newTotal,
                  averageRating: newAvg,
                  myRating: rating,
                  myComment: commentToSubmit.trim() || null,
                },
              },
            };
          }
          return m;
        })
      );

      Alert.alert(
        "Rating Recorded! ⭐",
        `You rated ${mealType.toLowerCase()} ${rating} star${rating > 1 ? "s" : ""} (${RATING_LABELS[rating]}). You can update it anytime.`
      );
      setActiveCommentMeal(null);
    } catch (e) {
      Alert.alert("Rating Error", e?.response?.data?.message || "Failed to submit rating.");
    } finally {
      setSubmittingMeal(null);
    }
  };

  const handleCommentSubmit = (mealType) => {
    const currentRating = currentMenu?.meals?.[mealType.toLowerCase()]?.myRating;
    if (!currentRating) {
      Alert.alert("Rating Required", "Please select a 1-5 star rating before submitting feedback.");
      return;
    }
    handleRateMeal(mealType, currentRating, commentText[mealType] || "");
  };

  const renderStarRating = (mealType, stats) => {
    const isSubmitting = submittingMeal === mealType;
    const currentRating = stats?.myRating || 0;

    return (
      <View style={styles.ratingSection}>
        <View style={styles.ratingHeaderRow}>
          <Text style={styles.rateMealLabel}>Rate this meal:</Text>
          {currentRating > 0 && (
            <View style={styles.myRatingPill}>
              <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
              <Text style={styles.myRatingPillText}>
                Your vote: {currentRating} ⭐ ({RATING_LABELS[currentRating]})
              </Text>
            </View>
          )}
        </View>

        {/* 5 Stars interactive row */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= currentRating;
            return (
              <TouchableOpacity
                key={star}
                style={styles.starBtn}
                onPress={() => handleRateMeal(mealType, star)}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isFilled ? "star" : "star-outline"}
                  size={28}
                  color={isFilled ? "#f59e0b" : "#cbd5e1"}
                />
                <Text style={[styles.starNum, isFilled && styles.starNumFilled]}>{star}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Optional Comment Toggle */}
        <TouchableOpacity
          style={styles.commentToggleBtn}
          onPress={() => setActiveCommentMeal(activeCommentMeal === mealType ? null : mealType)}
        >
          <Ionicons
            name={activeCommentMeal === mealType ? "chevron-up" : "chatbubble-ellipses-outline"}
            size={14}
            color="#2563eb"
          />
          <Text style={styles.commentToggleBtnText}>
            {activeCommentMeal === mealType
              ? "Hide feedback note"
              : stats?.myComment
              ? "Edit feedback / issue note"
              : "Write feedback / report issue (optional)"}
          </Text>
        </TouchableOpacity>

        {/* Feedback Input Form */}
        {activeCommentMeal === mealType && (
          <View style={styles.commentInputBox}>
            <TextInput
              style={styles.commentTextInput}
              placeholder="e.g. Food was too oily / hygiene issue / delicious food..."
              placeholderTextColor="#94a3b8"
              value={commentText[mealType] !== undefined ? commentText[mealType] : stats?.myComment || ""}
              onChangeText={(t) => setCommentText((prev) => ({ ...prev, [mealType]: t }))}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={[styles.commentSubmitBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={() => handleCommentSubmit(mealType)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={styles.commentSubmitBtnText}>Save Feedback Note</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Display existing saved comment */}
        {stats?.myComment && activeCommentMeal !== mealType && (
          <View style={styles.savedNoteWrap}>
            <Ionicons name="chatbubble" size={12} color="#64748b" />
            <Text style={styles.savedNoteText}>"{stats.myComment}"</Text>
          </View>
        )}
      </View>
    );
  };

  const renderMealCard = (title, mealType, items, icon, color) => {
    const stats = currentMenu?.meals?.[mealType.toLowerCase()] || {};
    const avg = stats.averageRating || 0;
    const total = stats.totalRatings || 0;

    return (
      <View style={[styles.mealCard, { borderLeftColor: color }]}>
        <View style={styles.mealHeader}>
          <View style={[styles.iconBox, { backgroundColor: color }]}>
            <Ionicons name={icon} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mealTitle}>{title}</Text>
          </View>

          {/* Average Rating Badge */}
          <View style={styles.avgRatingBadge}>
            <Ionicons name="star" size={13} color="#f59e0b" />
            <Text style={styles.avgRatingText}>
              {total > 0 ? `${avg.toFixed(1)} (${total})` : "No ratings"}
            </Text>
          </View>
        </View>

        <Text style={styles.mealItems}>{items || "No menu updated for this meal"}</Text>

        {/* 1-5 Star Rating & Feedback */}
        {renderStarRating(mealType, stats)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Hero Header */}
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#111" />
          </TouchableOpacity>

          {/* Student Hostel & Block Pill */}
          <View style={styles.hostelPill}>
            <Ionicons name="business" size={14} color="#1e3a8a" />
            <Text style={styles.hostelPillText}>
              {studentInfo.hostel} {studentInfo.block ? `• Block ${studentInfo.block}` : ""}
            </Text>
          </View>
        </View>

        <Text style={styles.kicker}>Mess Menu & Food Reviews</Text>
        <Text style={styles.heading}>What's cooking today? 🍳</Text>
        <Text style={styles.heroSubText}>
          Showing menu assigned to {studentInfo.hostel} {studentInfo.block ? `(Block ${studentInfo.block})` : ""}. Rate individual meals to help maintain quality!
        </Text>
      </View>

      {/* Day Selector Tabs */}
      <View style={styles.daySelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelector}>
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayChip, isSelected && styles.activeDayChip]}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayText, isSelected && styles.activeDayText]}>
                  {day.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMenus} />}
      >
        {loading && menus.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={{ marginTop: 10, color: "#64748b" }}>Loading {studentInfo.hostel} mess menu...</Text>
          </View>
        ) : currentMenu ? (
          <>
            {renderMealCard("Breakfast", "BREAKFAST", currentMenu.breakfast, "sunny-outline", "#FFB74D")}
            {renderMealCard("Lunch", "LUNCH", currentMenu.lunch, "restaurant-outline", "#FF7043")}
            {renderMealCard("Dinner", "DINNER", currentMenu.dinner, "moon-outline", "#5C6BC0")}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={70} color="#cbd5e1" />
            <Text style={styles.emptyText}>No menu published for {selectedDay}</Text>
            <Text style={styles.emptySubText}>
              The warden has not published a {studentInfo.hostel} menu for {selectedDay} yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fa",
  },
  hero: {
    backgroundColor: "#f5cf6a",
    margin: 16,
    padding: 20,
    borderRadius: 26,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 46,
  },
  heroTopRow: {
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
  hostelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hostelPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e3a8a",
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
  },
  daySelectorContainer: {
    paddingVertical: 4,
  },
  daySelector: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeDayChip: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },
  dayText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  activeDayText: {
    color: "#ffffff",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  mealCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  mealTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  avgRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  avgRatingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400e",
  },
  mealItems: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
    marginBottom: 14,
  },
  ratingSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  ratingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rateMealLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  myRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  myRatingPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  starBtn: {
    alignItems: "center",
    padding: 4,
  },
  starNum: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    marginTop: 2,
  },
  starNumFilled: {
    color: "#d97706",
  },
  commentToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  commentToggleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  commentInputBox: {
    marginTop: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  commentTextInput: {
    fontSize: 13,
    color: "#0f172a",
    padding: 0,
    minHeight: 40,
  },
  commentSubmitBtn: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  commentSubmitBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  savedNoteWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savedNoteText: {
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
    flex: 1,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
