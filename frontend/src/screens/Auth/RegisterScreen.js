import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { register as registerApi } from "../../api/auth";
import { AuthContext } from "../../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HOSTELS } from "../../constants/hostels";

const { width } = Dimensions.get("window");

export default function RegisterScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedHostel, setSelectedHostel] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();

  const hostelKeys = Object.keys(HOSTELS);
  const currentHostelConfig = selectedHostel ? HOSTELS[selectedHostel] : null;

  const handleHostelSelect = (hostelKey) => {
    setSelectedHostel(hostelKey);
    const config = HOSTELS[hostelKey];
    if (!config?.hasBlocks) {
      setSelectedBlock("");
    } else if (!config.blocks.includes(selectedBlock)) {
      setSelectedBlock("");
    }
  };

  const handleRoomChange = (text) => {
    // Strip non-numeric characters and cap at 4 digits
    const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 4);
    setRoomNumber(digitsOnly);
  };

  const handleRegister = async () => {
    const trimmedName = (name || "").trim();
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = password || "";

    if (!trimmedName || !trimmedEmail || !trimmedPassword || !confirmPassword) {
      return alert("Please fill in all required fields");
    }
    if (trimmedPassword !== confirmPassword) {
      return alert("Passwords don't match");
    }
    if (trimmedPassword.length < 6) {
      return alert("Password must be at least 6 characters");
    }

    if (!selectedHostel) {
      return alert("Please select your Hostel");
    }

    if (currentHostelConfig?.hasBlocks && !selectedBlock) {
      return alert(`Please select a Block for ${selectedHostel}`);
    }

    try {
      setSubmitting(true);

      const response = await registerApi({
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        hostel: selectedHostel,
        block: currentHostelConfig?.hasBlocks ? selectedBlock : null,
        roomNumber: roomNumber ? roomNumber.trim() : null,
      });

      if (!response || !response.data) {
        throw new Error("Invalid response from server");
      }

      // Automatically log the user in using AuthContext
      const loginResult = await login(trimmedEmail, trimmedPassword);
      if (!loginResult.success) {
        alert("Registration successful! Please log in with your credentials.");
        navigation.navigate("Login");
        return { success: true };
      }

      alert("Registration successful! Welcome to HostelEase.");
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.friendlyMessage ||
        error.message ||
        "Registration failed. Please try again.";
      alert(`Registration failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : (Platform.OS === "android" ? "height" : undefined)}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header / Logo */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add" size={40} color="#fff" />
            </View>
            <Text style={styles.appName}>HostelEase</Text>
            <Text style={styles.welcomeText}>Join Us! 🚀</Text>
            <Text style={styles.subtitleText}>Create your account to get started</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  placeholder="John Doe"
                  placeholderTextColor="#aaa"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  placeholder="student@example.com"
                  placeholderTextColor="#aaa"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Hostel Selector (Chips) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hostel *</Text>
              <View style={styles.chipsRow}>
                {hostelKeys.map((hostelKey) => {
                  const isSelected = selectedHostel === hostelKey;
                  return (
                    <TouchableOpacity
                      key={hostelKey}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => handleHostelSelect(hostelKey)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="business"
                        size={14}
                        color={isSelected ? "#fff" : "#555"}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {hostelKey}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Block Selector (Chips) - Shown only if the selected hostel has blocks */}
            {currentHostelConfig?.hasBlocks && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Block * (for {selectedHostel})</Text>
                <View style={styles.chipsRow}>
                  {currentHostelConfig.blocks.map((block) => {
                    const isSelected = selectedBlock === block;
                    return (
                      <TouchableOpacity
                        key={block}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setSelectedBlock(block)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          Block {block}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Room Number (Optional, numeric only, max 4 digits) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Room No. (optional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="bed-outline" size={20} color="#888" style={styles.inputIcon} />
                <TextInput
                  placeholder="e.g. 104"
                  placeholderTextColor="#aaa"
                  value={roomNumber}
                  onChangeText={handleRoomChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.input}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#8fb3ff", "#6b9eff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Creating Account..." : "Create Account"}
                </Text>
                {!submitting && (
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace("Login")}>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f0e7", // Cream background
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#8fb3ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#8fb3ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    marginTop: 6,
  },
  subtitleText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
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
    color: "#ffffff",
  },
  registerButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6b9eff",
  },
});
