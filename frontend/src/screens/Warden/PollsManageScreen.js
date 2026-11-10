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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import { confirmAction } from "../../utils/confirmDialog";

export default function PollsManageScreen({ navigation }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pollType, setPollType] = useState("SINGLE"); // "SINGLE" | "MULTIPLE"
  const [options, setOptions] = useState(["", ""]);
  const headerBg = "#8fb3ff";

  // Results Modal State
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [expandedOptionIndex, setExpandedOptionIndex] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return polls;
    return polls.filter((p) => p.title?.toLowerCase().includes(s));
  }, [q, polls]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get("/polls");
      const payload = res?.data;
      let items = [];
      if (Array.isArray(payload)) items = payload;
      else if (Array.isArray(payload?.items)) items = payload.items;
      else if (Array.isArray(payload?.data?.items)) items = payload.data.items;
      else if (Array.isArray(payload?.data)) items = payload.data;
      setPolls(items);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to load polls");
    } finally {
      setLoading(false);
    }
  };

  const remove = (id, pollTitle) => {
    confirmAction({
      title: "Delete Poll",
      message: `Are you sure you want to delete this poll?\n\n"${pollTitle}"\n\nAll recorded votes will be permanently deleted.`,
      confirmText: "Delete Poll",
      onConfirm: async () => {
        try {
          setLoading(true);
          await API.delete(`/polls/${id}`);
          await load();
        } catch (e) {
          Alert.alert("Error", e?.response?.data?.message || "Failed to delete poll");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const viewResults = async (id) => {
    try {
      setResultsLoading(true);
      setResultsOpen(true);
      setExpandedOptionIndex(null);
      const res = await API.get(`/polls/results/${id}`);
      setResultsData(res?.data || null);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to load poll analytics");
      setResultsOpen(false);
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeOption = (idx, val) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length >= 8) {
      return Alert.alert("Limit Reached", "A maximum of 8 options is allowed per poll.");
    }
    setOptions((o) => [...o, ""]);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) {
      return Alert.alert("Minimum Required", "A poll must have at least 2 options.");
    }
    setOptions((o) => o.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (loading) return;
    const cleanOptions = options.map((o) => String(o || "").trim()).filter(Boolean);
    if (!question.trim()) {
      return Alert.alert("Input Required", "Please enter a poll question.");
    }
    if (cleanOptions.length < 2) {
      return Alert.alert("Input Required", "Please provide at least 2 valid options.");
    }

    try {
      setLoading(true);
      await API.post("/polls", {
        question: question.trim(),
        options: cleanOptions,
        pollType,
      });
      // Clear form immediately
      setQuestion("");
      setPollType("SINGLE");
      setOptions(["", ""]);
      setOpen(false);
      Alert.alert("Success", "Poll published successfully! 📊");
      await load();
    } catch (e) {
      Alert.alert("Creation Error", e?.response?.data?.message || "Failed to create poll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header Hero */}
        <View style={[styles.hero, { backgroundColor: headerBg }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="chevron-back" size={18} color="#111" />
          </TouchableOpacity>
          <Text style={styles.kicker}>Warden Administration</Text>
          <Text style={styles.heading}>Hostel Polls & Analytics 📊</Text>
          <Text style={styles.subHeading}>
            Launch surveys, collect real-time student sentiment, and inspect voter demographics.
          </Text>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#555" />
            <TextInput
              placeholder="Search polls by question..."
              value={q}
              onChangeText={setQ}
              style={styles.searchInput}
              placeholderTextColor="#777"
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => setQ("")}>
                <Ionicons name="close-circle" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Poll List */}
        <View style={styles.listWrap}>
          {loading && polls.length === 0 && <Text style={styles.muted}>Loading polls...</Text>}
          {!loading && filtered.length === 0 && (
            <View style={styles.emptyWrap}>
              <Ionicons name="bar-chart-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No polls found</Text>
              <Text style={styles.emptyText}>Tap the + button below to create your first hostel poll.</Text>
            </View>
          )}

          {filtered.map((p) => {
            const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : null;
            const totalVotes = typeof p.totalVotes === "number" ? p.totalVotes : (p.options || []).reduce((s, o) => s + (o.votes || 0), 0);
            const isMulti = p.pollType === "MULTIPLE";

            // Find leading option
            let leadingOpt = null;
            if (Array.isArray(p.options) && p.options.length > 0) {
              const maxV = Math.max(...p.options.map((o) => o.votes || 0));
              if (maxV > 0) {
                leadingOpt = p.options.find((o) => o.votes === maxV);
              }
            }

            return (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerTitleWrap}>
                    <Text style={styles.cardTitle}>{p.title}</Text>
                    {created && <Text style={styles.cardDate}>Created: {created}</Text>}
                  </View>
                </View>

                {/* Chips Row */}
                <View style={styles.chipsRow}>
                  <View style={[styles.badge, isMulti ? styles.badgeMulti : styles.badgeSingle]}>
                    <Ionicons
                      name={isMulti ? "checkbox-outline" : "radio-button-on-outline"}
                      size={12}
                      color={isMulti ? "#7c3aed" : "#2563eb"}
                    />
                    <Text style={[styles.badgeText, { color: isMulti ? "#7c3aed" : "#2563eb" }]}>
                      {isMulti ? "Multiple Choice" : "Single Choice"}
                    </Text>
                  </View>

                  <View style={styles.badgeNeutral}>
                    <Ionicons name="people" size={12} color="#475569" />
                    <Text style={styles.badgeNeutralText}>{totalVotes} votes cast</Text>
                  </View>

                  {p.uniqueVoters > 0 && (
                    <View style={styles.badgeNeutral}>
                      <Ionicons name="person-circle-outline" size={12} color="#475569" />
                      <Text style={styles.badgeNeutralText}>{p.uniqueVoters} voters</Text>
                    </View>
                  )}

                  {leadingOpt && (
                    <View style={styles.badgeLeading}>
                      <Text style={styles.badgeLeadingText}>
                        🏆 {leadingOpt.text} ({leadingOpt.votes} votes)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Options Mini Preview */}
                <View style={styles.miniOptionsWrap}>
                  {(p.options || []).map((opt, i) => (
                    <View key={i} style={styles.miniOptionChip}>
                      <Text style={styles.miniOptionText}>
                        {opt.text} <Text style={{ color: "#64748b" }}>({opt.votes || 0})</Text>
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.analyticsBtn}
                    onPress={() => viewResults(p.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="analytics" size={16} color="#2563eb" />
                    <Text style={styles.analyticsBtnText}>Analytics & Voter Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => remove(p.id, p.title)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)} activeOpacity={0.9}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* CREATE NEW POLL MODAL */}
      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Poll</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* Question */}
              <Text style={styles.inputLabel}>Question or Topic *</Text>
              <TextInput
                placeholder="e.g. Which sweet would you prefer for Sunday dinner?"
                placeholderTextColor="#94a3b8"
                value={question}
                onChangeText={setQuestion}
                style={styles.input}
                multiline
              />

              {/* Poll Type Toggle */}
              <Text style={styles.inputLabel}>Voting Mode *</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    pollType === "SINGLE" && styles.typeSelectorBtnActive,
                  ]}
                  onPress={() => setPollType("SINGLE")}
                >
                  <Ionicons
                    name="radio-button-on"
                    size={16}
                    color={pollType === "SINGLE" ? "#2563eb" : "#64748b"}
                  />
                  <View>
                    <Text
                      style={[
                        styles.typeSelectorTitle,
                        pollType === "SINGLE" && styles.typeSelectorTitleActive,
                      ]}
                    >
                      Single Choice
                    </Text>
                    <Text style={styles.typeSelectorDesc}>Students can select only 1 option</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeSelectorBtn,
                    pollType === "MULTIPLE" && styles.typeSelectorBtnActive,
                  ]}
                  onPress={() => setPollType("MULTIPLE")}
                >
                  <Ionicons
                    name="checkbox"
                    size={16}
                    color={pollType === "MULTIPLE" ? "#7c3aed" : "#64748b"}
                  />
                  <View>
                    <Text
                      style={[
                        styles.typeSelectorTitle,
                        pollType === "MULTIPLE" && styles.typeSelectorTitleActive,
                      ]}
                    >
                      Multiple Choice
                    </Text>
                    <Text style={styles.typeSelectorDesc}>Students can select multiple options</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Options */}
              <Text style={styles.inputLabel}>Options (Minimum 2) *</Text>
              {options.map((item, index) => (
                <View key={index} style={styles.optionInputRow}>
                  <TextInput
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#94a3b8"
                    value={item}
                    onChangeText={(t) => changeOption(index, t)}
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  />
                  {options.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeOptBtn}
                      onPress={() => removeOption(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {options.length < 8 && (
                <TouchableOpacity style={styles.addOptBtn} onPress={addOption}>
                  <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
                  <Text style={styles.addOptBtnText}>Add Another Option</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSubmit, loading && { opacity: 0.6 }]} 
                onPress={submit}
                disabled={loading}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.modalBtnSubmitText}>{loading ? "Publishing..." : "Publish Poll"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DETAILED RESULTS & ANALYTICS MODAL */}
      <Modal visible={resultsOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.resultsModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalTitle}>Poll Analytics & Results</Text>
                {resultsData?.poll && (
                  <Text style={styles.resultsPollQuestion} numberOfLines={2}>
                    {resultsData.poll.question}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setResultsOpen(false)}>
                <Ionicons name="close-circle" size={26} color="#64748b" />
              </TouchableOpacity>
            </View>

            {resultsLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ marginTop: 10, color: "#64748b" }}>Loading analytics...</Text>
              </View>
            ) : !resultsData ? (
              <Text style={styles.muted}>No analytics data available.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                {/* Stats Summary Cards */}
                <View style={styles.statsSummaryRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statCardNumber}>{resultsData.totalVotes || 0}</Text>
                    <Text style={styles.statCardLabel}>Total Votes</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statCardNumber}>{resultsData.uniqueVoters || 0}</Text>
                    <Text style={styles.statCardLabel}>Students Voted</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Text style={styles.statCardNumber}>
                      {resultsData.poll?.pollType === "MULTIPLE" ? "Multi" : "Single"}
                    </Text>
                    <Text style={styles.statCardLabel}>Poll Type</Text>
                  </View>
                </View>

                {/* Options List with Progress & Voter Lists */}
                <Text style={styles.sectionHeaderTitle}>Vote Distribution & Voter Directory</Text>

                {(resultsData.options || []).map((opt, idx) => {
                  const isExpanded = expandedOptionIndex === idx;
                  const voters = Array.isArray(opt.voters) ? opt.voters : [];

                  return (
                    <View key={idx} style={styles.resultOptionCard}>
                      <View style={styles.resultOptionHeader}>
                        <Text style={styles.resultOptionTitle}>{opt.option}</Text>
                        {opt.isLeading && (
                          <View style={styles.badgeLeading}>
                            <Text style={styles.badgeLeadingText}>🏆 Leading</Text>
                          </View>
                        )}
                      </View>

                      {/* Percentage Bar */}
                      <View style={styles.analyticsBarTrack}>
                        <View
                          style={[
                            styles.analyticsBarFill,
                            { width: `${opt.percentage}%` },
                            opt.isLeading && styles.analyticsBarFillLeading,
                          ]}
                        />
                      </View>

                      <View style={styles.analyticsBarStats}>
                        <Text style={styles.analyticsPercentage}>{opt.percentage}%</Text>
                        <Text style={styles.analyticsVotesCount}>
                          {opt.votes} {opt.votes === 1 ? "vote" : "votes"}
                        </Text>
                      </View>

                      {/* Voter Breakdown Toggle */}
                      <TouchableOpacity
                        style={styles.voterToggleBtn}
                        onPress={() => setExpandedOptionIndex(isExpanded ? null : idx)}
                      >
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#2563eb"
                        />
                        <Text style={styles.voterToggleBtnText}>
                          {isExpanded
                            ? "Hide voters"
                            : `View voters (${voters.length})`}
                        </Text>
                      </TouchableOpacity>

                      {/* Voters List Accordion */}
                      {isExpanded && (
                        <View style={styles.votersListWrap}>
                          {voters.length === 0 ? (
                            <Text style={styles.noVotersText}>
                              No student has voted for this option yet.
                            </Text>
                          ) : (
                            voters.map((voter, vIdx) => (
                              <View key={vIdx} style={styles.voterItem}>
                                <Ionicons name="person-circle" size={24} color="#3b82f6" />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                  <Text style={styles.voterName}>{voter.name}</Text>
                                  <Text style={styles.voterDetails}>
                                    {[
                                      voter.hostel,
                                      voter.block ? `Block ${voter.block}` : null,
                                      voter.roomNumber ? `Room ${voter.roomNumber}` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ") || voter.email}
                                  </Text>
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={{ marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit, { backgroundColor: "#2563eb" }]}
                onPress={() => setResultsOpen(false)}
              >
                <Text style={styles.modalBtnSubmitText}>Close Analytics</Text>
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
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 13,
    color: "#334155",
    marginBottom: 14,
    lineHeight: 18,
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
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  headerTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 22,
  },
  cardDate: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 3,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSingle: {
    backgroundColor: "#dbeafe",
  },
  badgeMulti: {
    backgroundColor: "#ede9fe",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeNeutral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeNeutralText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  badgeLeading: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLeadingText: {
    fontSize: 11,
    color: "#b45309",
    fontWeight: "700",
  },
  miniOptionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  miniOptionChip: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniOptionText: {
    fontSize: 12,
    color: "#1e293b",
    fontWeight: "500",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  analyticsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingVertical: 8,
    borderRadius: 10,
  },
  analyticsBtnText: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "700",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteBtnText: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "700",
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
    maxWidth: 520,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  resultsModalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 560,
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
  },
  resultsPollQuestion: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  typeSelectorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
  },
  typeSelectorBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  typeSelectorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  typeSelectorTitleActive: {
    color: "#1d4ed8",
  },
  typeSelectorDesc: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  optionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  removeOptBtn: {
    padding: 8,
  },
  addOptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
    marginTop: 4,
    marginBottom: 10,
  },
  addOptBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  modalFooterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalBtnCancel: {
    backgroundColor: "#f1f5f9",
  },
  modalBtnCancelText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
  },
  modalBtnSubmit: {
    backgroundColor: "#2563eb",
  },
  modalBtnSubmitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  statsSummaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statCardNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  statCardLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  resultOptionCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  resultOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  resultOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  analyticsBarTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  analyticsBarFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },
  analyticsBarFillLeading: {
    backgroundColor: "#f59e0b",
  },
  analyticsBarStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  analyticsPercentage: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e293b",
  },
  analyticsVotesCount: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  voterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  voterToggleBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  votersListWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 8,
  },
  noVotersText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    padding: 4,
  },
  voterItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  voterName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  voterDetails: {
    fontSize: 11,
    color: "#64748b",
  },
});
