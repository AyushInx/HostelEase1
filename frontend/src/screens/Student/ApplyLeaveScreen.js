import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";

import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function ApplyLeaveScreen({ navigation }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDateInput = (text, setter) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2 && digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
    }
    setter(formatted);
  };

  const handleSubmit = async () => {
    if (!fromDate || !toDate || !reason.trim()) {
      Alert.alert("Missing Details", "Please fill in all fields");
      return;
    }

    const dmyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const mFrom = fromDate.match(dmyRegex);
    const mTo = toDate.match(dmyRegex);

    if (!mFrom || !mTo) {
      Alert.alert("Invalid Date", "Please use DD-MM-YYYY format (e.g. 15-11-2026)");
      return;
    }

    const [fDay, fMonth, fYear] = fromDate.split("-").map(Number);
    const [tDay, tMonth, tYear] = toDate.split("-").map(Number);

    if (fMonth < 1 || fMonth > 12 || fDay < 1 || fDay > 31) {
      Alert.alert("Invalid Date", "From Date is not a valid calendar day/month");
      return;
    }
    if (tMonth < 1 || tMonth > 12 || tDay < 1 || tDay > 31) {
      Alert.alert("Invalid Date", "To Date is not a valid calendar day/month");
      return;
    }

    const startUtc = new Date(Date.UTC(fYear, fMonth - 1, fDay));
    const endUtc = new Date(Date.UTC(tYear, tMonth - 1, tDay, 23, 59, 59));

    if (endUtc < startUtc) {
      Alert.alert("Invalid Range", "To Date cannot be before From Date");
      return;
    }

    try {
      setLoading(true);
      await API.post("/leave/apply", {
        fromDate: startUtc.toISOString(),
        toDate: endUtc.toISOString(),
        reason: reason.trim()
      });
      Alert.alert("Success", "Leave application submitted successfully", [
        { text: "OK", onPress: () => {
            setFromDate("");
            setToDate("");
            setReason("");
            navigation.navigate("History"); 
        }}
      ]);
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to apply for leave";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const ScrollWrapper = Platform.OS === "web" ? ScrollView : KeyboardAwareScrollView;

  return (
    <ScrollWrapper 
      style={{ flex: 1 }}
      contentContainerStyle={styles.container} 
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={100}
      enableAutomaticScroll={true}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Apply for Leave</Text>
        <Text style={styles.subtitle}>Fill in the details below to request a leave pass.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>From Date (DD-MM-YYYY) *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="calendar-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="DD-MM-YYYY"
              placeholderTextColor="#aaa"
              value={fromDate}
              onChangeText={(t) => handleDateInput(t, setFromDate)}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>To Date (DD-MM-YYYY) *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="calendar-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="DD-MM-YYYY"
              placeholderTextColor="#aaa"
              value={toDate}
              onChangeText={(t) => handleDateInput(t, setToDate)}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reason</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Going home for weekend..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.disabledBtn]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit Application</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f2f0e7ff",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 16,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingVertical: 16,
    height: "auto",
    minHeight: 120,
  },
  textArea: {
    height: "100%",
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 18,
    marginTop: 12,
    gap: 8,
    shadowColor: "#111",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.7,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
