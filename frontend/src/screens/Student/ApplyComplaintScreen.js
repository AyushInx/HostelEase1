import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import { AuthContext } from "../../context/AuthContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  HOSTELS,
  COMPLAINT_CATEGORIES,
} from "../../constants/hostels";

export default function ApplyComplaintScreen({ navigation }) {
  const { user } = useContext(AuthContext);

  const [category, setCategory] = useState("Electrical");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostel, setHostel] = useState("");
  const [block, setBlock] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-fill location from user profile on mount
  useEffect(() => {
    if (user) {
      if (user.hostel) setHostel(user.hostel);
      if (user.block) setBlock(user.block);
      if (user.roomNumber) setRoomNumber(String(user.roomNumber));
    }
  }, [user]);

  const hostelKeys = Object.keys(HOSTELS);
  const currentHostelConfig = hostel ? HOSTELS[hostel] : null;

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

  const handleSubmit = async () => {
    if (!description.trim()) {
      return Alert.alert("Error", "Please provide a description of the issue");
    }

    if (!hostel) {
      return Alert.alert("Location Required", "Please select a hostel for this complaint");
    }

    if (currentHostelConfig?.hasBlocks && !block) {
      return Alert.alert("Location Required", `Please select a block for ${hostel}`);
    }

    try {
      setLoading(true);
      const cleanTitle = title.trim() || `${category} issue`;

      await API.post("/complaints", {
        title: cleanTitle,
        description: description.trim(),
        category,
        hostel,
        block: currentHostelConfig?.hasBlocks ? block : null,
        roomNumber: roomNumber.trim() || null,
      });

      Alert.alert("Success", "Complaint submitted successfully", [
        {
          text: "OK",
          onPress: () => {
            setTitle("");
            setDescription("");
            navigation.navigate("History");
          },
        },
      ]);
    } catch (e) {
      const msg = e.response?.data?.message || e.friendlyMessage || "Failed to submit complaint";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={100}
      enableAutomaticScroll={true}
    >
      <View style={styles.card}>
        <Text style={styles.title}>New Complaint</Text>
        <Text style={styles.subtitle}>
          Select a category, verify location, and describe your issue.
        </Text>

        {/* 1. Category Chips */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.chipsWrap}>
            {COMPLAINT_CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Complaint Summary / Location Box (Auto-filled from profile, editable for complaint only) */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <Ionicons name="location-outline" size={16} color="#6b9eff" />
            <Text style={styles.locationHeaderText}>Complaint Location</Text>
          </View>
          <Text style={styles.locationSubText}>
            Pre-filled from profile. Edit here if reporting for another spot.
          </Text>

          {/* Hostel Chips */}
          <Text style={styles.subLabel}>Hostel *</Text>
          <View style={styles.chipsWrap}>
            {hostelKeys.map((hKey) => {
              const isSelected = hostel === hKey;
              return (
                <TouchableOpacity
                  key={hKey}
                  style={[styles.chipSm, isSelected && styles.chipSmActive]}
                  onPress={() => handleHostelSelect(hKey)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipSmText, isSelected && styles.chipSmTextActive]}>
                    {hKey}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Block Chips (if hostel has blocks) */}
          {currentHostelConfig?.hasBlocks && (
            <>
              <Text style={styles.subLabel}>Block *</Text>
              <View style={styles.chipsWrap}>
                {currentHostelConfig.blocks.map((b) => {
                  const isSelected = block === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[styles.chipSm, isSelected && styles.chipSmActive]}
                      onPress={() => setBlock(b)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipSmText, isSelected && styles.chipSmTextActive]}>
                        Block {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Room Number (numeric only, max 4 digits) */}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.subLabel}>Room No. (optional)</Text>
            <View style={styles.roomInputWrap}>
              <Ionicons name="bed-outline" size={16} color="#888" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.roomInput}
                placeholder="e.g. 204"
                value={roomNumber}
                onChangeText={handleRoomChange}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        </View>

        {/* 3. Title (optional, defaults to "<category> issue") */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title (optional)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="alert-circle-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder={`e.g. ${category} issue`}
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        {/* 4. Description (multiline) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide exact details of the issue..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit Complaint</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#6b9eff",
    borderColor: "#6b9eff",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
  },
  chipTextActive: {
    color: "#fff",
  },
  locationSection: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    gap: 4,
  },
  locationHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
  },
  locationSubText: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 10,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
    marginTop: 6,
    marginBottom: 4,
  },
  chipSm: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  chipSmActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  chipSmText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  chipSmTextActive: {
    color: "#fff",
  },
  roomInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 10,
    height: 40,
  },
  roomInput: {
    flex: 1,
    fontSize: 13,
    color: "#111",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 80,
    paddingVertical: 0,
  },
  submitBtn: {
    backgroundColor: "#111",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
