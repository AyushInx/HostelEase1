import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator, Platform, StyleSheet } from "react-native";
import AuthProvider from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import OnboardingScreen from "./src/screens/Auth/OnboardingScreen";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const check = async () => {
      const seen = await AsyncStorage.getItem("hasSeenOnboarding");
      setShowOnboarding(seen !== "true");
      setLoading(false);
    };
    check();
  }, []);

  const finish = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      console.log("Onboarding completed and saved to AsyncStorage");
      setShowOnboarding(false);
    } catch (error) {
      console.error("Error saving onboarding status:", error);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderContent = () => {
    if (showOnboarding) {
      return <OnboardingScreen onComplete={finish} />;
    }
    return (
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    );
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webFrame}>{renderContent()}</View>
      </View>
    );
  }

  return renderContent();
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  webFrame: {
    width: "100%",
    maxWidth: 480,
    height: "100%",
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
});

