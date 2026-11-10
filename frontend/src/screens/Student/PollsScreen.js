import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { AuthContext } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { confirmAction } from "../../utils/confirmDialog";

// Animated Poll Card Component
const PollCard = React.memo(({ poll, onVote, onCancelVote, formatDate, animatedValue }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const isMultiple = poll.pollType === "MULTIPLE";
  const myVotes = Array.isArray(poll.myVotes) ? poll.myVotes : [];
  const hasVoted = Boolean(poll.hasVoted || myVotes.length > 0);

  // Total votes calculation
  const totalVotes = useMemo(() => {
    if (typeof poll.totalVotes === "number") return poll.totalVotes;
    return (poll.options || []).reduce((sum, opt) => sum + (opt.votes || 0), 0);
  }, [poll.totalVotes, poll.options]);

  const maxVotes = useMemo(() => {
    return Math.max(0, ...(poll.options || []).map((o) => o.votes || 0));
  }, [poll.options]);

  const toggleOption = (optText) => {
    if (hasVoted || isSubmitting) return;
    if (isMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optText) ? prev.filter((t) => t !== optText) : [...prev, optText]
      );
    } else {
      setSelectedOptions([optText]);
    }
  };

  const handleVoteSubmit = () => {
    if (selectedOptions.length === 0) {
      Alert.alert("Selection Required", "Please choose an option before submitting your vote.");
      return;
    }

    const optionSummary = selectedOptions.map((o) => `• ${o}`).join("\n");
    confirmAction({
      title: "Confirm Your Vote",
      message: `You are voting for:\n\n${optionSummary}\n\nDo you want to confirm your vote?`,
      confirmText: "Submit Vote",
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await onVote(poll.id, selectedOptions);
          setSelectedOptions([]);
        } catch (e) {
          const msg = e.response?.data?.message || e.message || "Failed to submit vote";
          Alert.alert("Voting Error", msg);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleCancelVoteSubmit = () => {
    confirmAction({
      title: "Retract Your Vote",
      message: "Are you sure you want to cancel your vote? You will be able to vote again.",
      confirmText: "Yes, Cancel Vote",
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await onCancelVote(poll.id);
          setSelectedOptions([]);
        } catch (e) {
          const msg = e.response?.data?.message || e.message || "Failed to retract vote";
          Alert.alert("Error", msg);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  return (
    <Animated.View style={[styles.pollCard, { transform: [{ scale: animatedValue }] }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded(!expanded)}
        style={styles.cardHeaderTouchable}
      >
        <View style={styles.pollHeader}>
          <View style={styles.pollEmojiContainer}>
            <Ionicons name="stats-chart" size={24} color="#3b82f6" />
          </View>
          <View style={styles.pollTitleContainer}>
            <Text style={styles.pollTitle}>{poll.title}</Text>
            <View style={styles.badgeRow}>
              {/* Poll Type Badge */}
              <View style={[styles.typeBadge, isMultiple ? styles.typeBadgeMulti : styles.typeBadgeSingle]}>
                <Ionicons
                  name={isMultiple ? "checkbox-outline" : "radio-button-on-outline"}
                  size={12}
                  color={isMultiple ? "#7c3aed" : "#2563eb"}
                />
                <Text style={[styles.typeBadgeText, { color: isMultiple ? "#7c3aed" : "#2563eb" }]}>
                  {isMultiple ? "Multiple Choice" : "Single Choice"}
                </Text>
              </View>

              {/* Status Badge */}
              {!hasVoted ? (
                <View style={styles.statusBadgePending}>
                  <Text style={styles.statusTextPending}>Vote Now</Text>
                </View>
              ) : (
                <View style={styles.statusBadgeVoted}>
                  <Ionicons name="checkmark-circle" size={12} color="#fff" />
                  <Text style={styles.statusTextVoted}>Voted</Text>
                </View>
              )}

              <Text style={styles.pollDate}>{formatDate(poll.createdAt)}</Text>
            </View>
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={22} color="#888" />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.pollOptionsContainer}>
          <Text style={styles.pollInstruction}>
            {!hasVoted
              ? isMultiple
                ? "Select one or more options and click Submit Vote below:"
                : "Select your choice and click Submit Vote below:"
              : "Here are the current results. You can retract your vote anytime:"}
          </Text>

          {(poll.options || []).map((option) => {
            const isUserChoice = myVotes.includes(option.text);
            const isSelected = selectedOptions.includes(option.text);
            const isLeading = hasVoted && option.votes === maxVotes && maxVotes > 0;
            const percentage =
              typeof option.percentage === "number"
                ? option.percentage
                : totalVotes === 0
                ? 0
                : Math.round(((option.votes || 0) / totalVotes) * 100);

            return (
              <TouchableOpacity
                key={option.id || option.text}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  isUserChoice && styles.optionCardUserVoted,
                ]}
                onPress={() => toggleOption(option.text)}
                disabled={hasVoted || isSubmitting}
                activeOpacity={0.75}
              >
                <View style={styles.optionTopRow}>
                  {/* Radio / Checkbox indicator when voting */}
                  {!hasVoted && (
                    <Ionicons
                      name={
                        isMultiple
                          ? isSelected
                            ? "checkbox"
                            : "square-outline"
                          : isSelected
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={20}
                      color={isSelected ? "#2563eb" : "#888"}
                      style={styles.optionIcon}
                    />
                  )}

                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                      isUserChoice && styles.optionTextUserVoted,
                    ]}
                  >
                    {option.text}
                  </Text>

                  {/* Badges when voted */}
                  <View style={styles.optionTagsRow}>
                    {isUserChoice && (
                      <View style={styles.myVoteBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                        <Text style={styles.myVoteBadgeText}>Your Choice</Text>
                      </View>
                    )}
                    {isLeading && (
                      <View style={styles.leadingBadge}>
                        <Text style={styles.leadingBadgeText}>🏆 Leading</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Live Percentage Bars if voted */}
                {hasVoted && (
                  <View style={styles.resultBarSection}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${percentage}%` },
                          isLeading && styles.barFillLeading,
                          isUserChoice && styles.barFillUserChoice,
                        ]}
                      />
                    </View>
                    <View style={styles.barNumbersRow}>
                      <Text style={styles.percentageText}>{percentage}%</Text>
                      <Text style={styles.voteCountText}>
                        {option.votes || 0} {option.votes === 1 ? "vote" : "votes"}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Action Row */}
          {!hasVoted ? (
            <View style={styles.submitRow}>
              <TouchableOpacity
                style={[
                  styles.submitVoteBtn,
                  selectedOptions.length === 0 && styles.submitVoteBtnDisabled,
                ]}
                onPress={handleVoteSubmit}
                disabled={selectedOptions.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#fff" />
                    <Text style={styles.submitVoteBtnText}>
                      Submit Vote {selectedOptions.length > 0 ? `(${selectedOptions.length})` : ""}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.postVoteRow}>
              <View style={styles.totalVotesWrap}>
                <Ionicons name="people" size={16} color="#555" />
                <Text style={styles.totalVotesText}>{totalVotes} total votes</Text>
              </View>

              <TouchableOpacity
                style={styles.cancelVoteBtn}
                onPress={handleCancelVoteSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <>
                    <Ionicons name="arrow-undo-outline" size={15} color="#dc2626" />
                    <Text style={styles.cancelVoteBtnText}>Cancel My Vote</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
});

export default function PollsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const headerBg = "#8fb3ff";

  const animatedValues = useMemo(() => [], []);

  const formatDate = useCallback((dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  }, []);

  const CACHE_KEY = "polls_cache_v2";

  const loadPolls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/polls");
      const payload = res?.data;
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (Array.isArray(payload?.items)) list = payload.items;
      else if (Array.isArray(payload?.data?.items)) list = payload.data.items;
      else if (Array.isArray(payload?.data)) list = payload.data;

      list.forEach((poll, index) => {
        if (!animatedValues[index]) {
          animatedValues[index] = new Animated.Value(0);
          Animated.spring(animatedValues[index], {
            toValue: 1,
            friction: 8,
            tension: 40,
            delay: index * 60,
            useNativeDriver: true,
          }).start();
        }
      });

      setPolls(list);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch (e) {
      console.log("Failed to load polls", e);
    } finally {
      setLoading(false);
    }
  }, [animatedValues]);

  useEffect(() => {
    const loadCache = async () => {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const list = JSON.parse(cached);
          setPolls(list);
          list.forEach((_, index) => {
            if (!animatedValues[index]) {
              animatedValues[index] = new Animated.Value(1);
            }
          });
        } catch (_) {}
      }
      loadPolls();
    };
    loadCache();
  }, []);

  const handleVote = useCallback(
    async (pollId, selectedOptions) => {
      await API.post(`/polls/${pollId}/vote`, { options: selectedOptions });
      await loadPolls();
    },
    [loadPolls]
  );

  const handleCancelVote = useCallback(
    async (pollId) => {
      await API.post(`/polls/${pollId}/cancel-vote`);
      await loadPolls();
    },
    [loadPolls]
  );

  const filteredPolls = useMemo(() => {
    if (!searchQuery.trim()) return polls;
    const query = searchQuery.trim().toLowerCase();
    return polls.filter(
      (poll) =>
        poll.title?.toLowerCase().includes(query) ||
        poll.description?.toLowerCase().includes(query)
    );
  }, [searchQuery, polls]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={[styles.hero, { backgroundColor: headerBg }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="chevron-back" size={18} color="#111" />
          </TouchableOpacity>
          <Text style={styles.kicker}>Student Voice</Text>
          <Text style={styles.heading}>Hostel Polls & Surveys 🗳️</Text>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#555" />
            <TextInput
              placeholder="Search active polls..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#777"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.listWrap}>
          {loading && polls.length === 0 && <Text style={styles.muted}>Loading polls...</Text>}
          {!loading && filteredPolls.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={56} color="#bbb" />
              <Text style={styles.emptyTitle}>No polls found</Text>
              <Text style={styles.emptyMessage}>
                {searchQuery ? "Try searching with different keywords." : "No active polls right now. Check back later!"}
              </Text>
            </View>
          )}

          {filteredPolls.map((item, index) => (
            <PollCard
              key={item.id}
              poll={item}
              onVote={handleVote}
              onCancelVote={handleCancelVote}
              formatDate={formatDate}
              animatedValue={animatedValues[index] || new Animated.Value(1)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  kicker: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 4,
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    color: "#111",
    fontSize: 14,
  },
  listWrap: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  muted: {
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  pollCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeaderTouchable: {
    marginBottom: 6,
  },
  pollHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  pollEmojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pollTitleContainer: {
    flex: 1,
  },
  pollTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeSingle: {
    backgroundColor: "#dbeafe",
  },
  typeBadgeMulti: {
    backgroundColor: "#ede9fe",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadgePending: {
    backgroundColor: "#f97316",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTextPending: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusBadgeVoted: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusTextVoted: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  pollDate: {
    fontSize: 11,
    color: "#94a3b8",
    marginLeft: 4,
  },
  pollOptionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  pollInstruction: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
    fontWeight: "500",
  },
  optionCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionCardSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
    borderWidth: 2,
  },
  optionCardUserVoted: {
    backgroundColor: "#f0fdf4",
    borderColor: "#22c55e",
  },
  optionTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    marginRight: 10,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  optionTextSelected: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  optionTextUserVoted: {
    color: "#15803d",
    fontWeight: "700",
  },
  optionTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  myVoteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  myVoteBadgeText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "700",
  },
  leadingBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leadingBadgeText: {
    fontSize: 11,
    color: "#b45309",
    fontWeight: "700",
  },
  resultBarSection: {
    marginTop: 8,
  },
  barTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#93c5fd",
    borderRadius: 4,
  },
  barFillLeading: {
    backgroundColor: "#f59e0b",
  },
  barFillUserChoice: {
    backgroundColor: "#22c55e",
  },
  barNumbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  voteCountText: {
    fontSize: 11,
    color: "#64748b",
  },
  submitRow: {
    marginTop: 10,
  },
  submitVoteBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitVoteBtnDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitVoteBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  postVoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  totalVotesWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  totalVotesText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  cancelVoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelVoteBtnText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "700",
  },
});
