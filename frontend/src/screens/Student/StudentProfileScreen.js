import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import API from "../../api/api";
import { HOSTELS } from "../../constants/hostels";

export default function StudentProfileScreen() {
  const { user: ctxUser, logout, refreshUser } = useContext(AuthContext);
  const [me, setMe] = useState(ctxUser || null);
  const [loading, setLoading] = useState(false);

  // Edit Profile state
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [hostel, setHostel] = useState("");
  const [block, setBlock] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  // Change Password state
  const [secOpen, setSecOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const heroBg = "#8fb3ff";
  const hostelKeys = Object.keys(HOSTELS);
  const currentHostelConfig = hostel ? HOSTELS[hostel] : null;

  const initials = useMemo(() => {
    const n = (me?.name || "Student").trim();
    const parts = n.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (n[0] || "S").toUpperCase();
  }, [me?.name]);

  const memberSince = useMemo(() => {
    if (!me?.createdAt) return null;
    try {
      return new Date(me.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return null;
    }
  }, [me?.createdAt]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get("/auth/me");
      setMe(res?.data || ctxUser || null);
    } catch (_) {
      setMe(ctxUser || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = () => {
    setName(me?.name || "");
    setHostel(me?.hostel || "");
    setBlock(me?.block || "");
    setRoomNumber(me?.roomNumber ? String(me.roomNumber) : "");
    setEditOpen(true);
  };

  const handleHostelSelect = (hKey) => {
    setHostel(hKey);
    const config = HOSTELS[hKey];
    if (!config?.hasBlocks) {
      setBlock("");
    } else if (!config.blocks.includes(block)) {
      setBlock("");
    }
  };

  const handleRoomChange = (text) => {
    const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 4);
    setRoomNumber(digitsOnly);
  };

  const saveProfile = async () => {
    if (!name.trim()) return Alert.alert("Validation", "Name cannot be empty");

    if (hostel) {
      const config = HOSTELS[hostel];
      if (config?.hasBlocks && !block) {
        return Alert.alert("Validation", `Please select a block for ${hostel}`);
      }
    }

    try {
      setLoading(true);
      const res = await API.put("/users/me", {
        name: name.trim(),
        hostel: hostel || null,
        block: currentHostelConfig?.hasBlocks ? block : null,
        roomNumber: roomNumber.trim() || null,
      });

      setEditOpen(false);
      setMe(res.data);
      Alert.alert("Success", "Profile updated successfully");
      await load();
      if (refreshUser) refreshUser();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword)
      return Alert.alert("Validation", "Fill all password fields");
    if (newPassword !== confirmPassword)
      return Alert.alert(
        "Validation",
        "New password and confirm password do not match"
      );
    if (newPassword.length < 6)
      return Alert.alert("Validation", "Password must be at least 6 characters");

    try {
      setLoading(true);
      await API.put("/users/me", { oldPassword, newPassword });
      setSecOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Password updated successfully");
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to change password"
      );
    } finally {
      setLoading(false);
    }
  };

  const isProfileIncomplete = !me?.hostel;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero Section */}
        <View style={[styles.hero, { backgroundColor: heroBg }]}>
          <View style={styles.heroContent}>
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: "#6b9eff",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff" }}>
                  {initials}
                </Text>
              </View>
              <TouchableOpacity style={styles.editAvatarBtn} onPress={openEdit}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.name}>{me?.name || "Student"}</Text>
            <Text style={styles.roleBadge}>STUDENT</Text>

            <View style={styles.statsRow}>
              {memberSince && (
                <View style={styles.statItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="#fff"
                    style={{ opacity: 0.8 }}
                  />
                  <Text style={styles.statText}>Joined {memberSince}</Text>
                </View>
              )}
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons
                  name="bed-outline"
                  size={16}
                  color="#fff"
                  style={{ opacity: 0.8 }}
                />
                <Text style={styles.statText}>
                  {me?.roomNumber ? `Room ${me.roomNumber}` : "Room N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Incomplete Profile Prompt Banner for Existing Users */}
        {isProfileIncomplete && (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={24} color="#d97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertBannerTitle}>Complete Your Profile</Text>
              <Text style={styles.alertBannerDesc}>
                Set your Hostel and Room number so your complaints are quickly routed.
              </Text>
              <TouchableOpacity
                style={styles.alertBannerBtn}
                onPress={openEdit}
                activeOpacity={0.8}
              >
                <Text style={styles.alertBannerBtnText}>Set Hostel & Room Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Profile Details</Text>
            <TouchableOpacity onPress={openEdit} activeOpacity={0.7}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            {/* Full Name */}
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: "#e3f2fd" }]}>
                <Ionicons name="person" size={20} color="#2196F3" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.label}>Full Name</Text>
                <Text style={styles.value}>{me?.name || "-"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Email */}
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: "#e8f5e9" }]}>
                <Ionicons name="mail" size={20} color="#4CAF50" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.value}>{me?.email || "-"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Hostel */}
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="business" size={20} color="#d97706" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.label}>Hostel</Text>
                <Text style={styles.value}>{me?.hostel || "Not Set"}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Block & Room */}
            <View style={styles.rowItem}>
              <View style={[styles.iconBox, { backgroundColor: "#f3e8ff" }]}>
                <Ionicons name="bed" size={20} color="#9333ea" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.label}>Block & Room</Text>
                <Text style={styles.value}>
                  {me?.block ? `Block ${me.block} • ` : ""}
                  {me?.roomNumber ? `Room ${me.roomNumber}` : (me?.block ? "No Room" : "Not Set")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setSecOpen(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: "#fff3e0" }]}>
              <Ionicons name="lock-closed" size={20} color="#FF9800" />
            </View>
            <Text style={styles.actionText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { marginTop: 12 }]}
            onPress={logout}
          >
            <View style={[styles.iconBox, { backgroundColor: "#ffebee" }]}>
              <Ionicons name="log-out" size={20} color="#F44336" />
            </View>
            <Text style={[styles.actionText, { color: "#F44336" }]}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal (Name, Hostel chips, Block chips, numeric Room No.) */}
      <Modal visible={editOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Text style={styles.modalSub}>
                Update your name, hostel, block, and room number
              </Text>

              {/* Name */}
              <Text style={styles.modalInputLabel}>Full Name *</Text>
              <TextInput
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#999"
              />

              {/* Hostel Selector (Chips) */}
              <Text style={styles.modalInputLabel}>Hostel</Text>
              <View style={styles.modalChipsRow}>
                {hostelKeys.map((hKey) => {
                  const isSelected = hostel === hKey;
                  return (
                    <TouchableOpacity
                      key={hKey}
                      style={[styles.mChip, isSelected && styles.mChipActive]}
                      onPress={() => handleHostelSelect(hKey)}
                    >
                      <Text
                        style={[
                          styles.mChipText,
                          isSelected && styles.mChipTextActive,
                        ]}
                      >
                        {hKey}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Block Selector (Chips, if hostel has blocks) */}
              {currentHostelConfig?.hasBlocks && (
                <>
                  <Text style={styles.modalInputLabel}>
                    Block (for {hostel})
                  </Text>
                  <View style={styles.modalChipsRow}>
                    {currentHostelConfig.blocks.map((b) => {
                      const isSelected = block === b;
                      return (
                        <TouchableOpacity
                          key={b}
                          style={[
                            styles.mChip,
                            isSelected && styles.mChipActive,
                          ]}
                          onPress={() => setBlock(b)}
                        >
                          <Text
                            style={[
                              styles.mChipText,
                              isSelected && styles.mChipTextActive,
                            ]}
                          >
                            Block {b}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Room Number (numeric only, max 4 digits) */}
              <Text style={styles.modalInputLabel}>Room No. (optional)</Text>
              <TextInput
                placeholder="e.g. 104"
                value={roomNumber}
                onChangeText={handleRoomChange}
                keyboardType="number-pad"
                maxLength={4}
                style={styles.input}
                placeholderTextColor="#999"
              />

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnCancel]}
                  onPress={() => setEditOpen(false)}
                >
                  <Text style={styles.btnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={saveProfile}
                  disabled={loading}
                >
                  <Text style={styles.btnTextPrimary}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={secOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Security</Text>
            <Text style={styles.modalSub}>Update your password</Text>

            <TextInput
              placeholder="Current Password"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#999"
            />
            <TextInput
              placeholder="New Password (min 6 characters)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#999"
            />
            <TextInput
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#999"
            />

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setSecOpen(false)}
              >
                <Text style={styles.btnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={changePassword}
                disabled={loading}
              >
                <Text style={styles.btnTextPrimary}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f2f0e7" },
  hero: {
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroContent: { alignItems: "center" },
  avatarContainer: { position: "relative", marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#111",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 4 },
  roleBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    letterSpacing: 1,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 12,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  alertBanner: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    gap: 12,
    alignItems: "flex-start",
  },
  alertBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 2,
  },
  alertBannerDesc: {
    fontSize: 12,
    color: "#b45309",
    lineHeight: 16,
    marginBottom: 8,
  },
  alertBannerBtn: {
    backgroundColor: "#d97706",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  alertBannerBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    letterSpacing: 0.5,
  },
  editLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3b82f6",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  rowItem: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  rowBody: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  value: { fontSize: 15, fontWeight: "700", color: "#111" },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 12,
    marginLeft: 58,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 2,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: "#111",
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  mChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  mChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  mChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  mChipTextActive: {
    color: "#fff",
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 14 },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnCancel: { backgroundColor: "#f3f4f6" },
  btnPrimary: { backgroundColor: "#111" },
  btnTextCancel: { color: "#111", fontWeight: "700", fontSize: 14 },
  btnTextPrimary: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
