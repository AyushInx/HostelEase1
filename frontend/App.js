import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import AuthProvider from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import OnboardingScreen from "./src/screens/Auth/OnboardingScreen";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  useEffect(() => {
    // Inject smooth-scroll and touch-action web CSS
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const styleId = "hostelease-web-smooth-scroll";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          html, body, #root {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: none;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          /* Ensure all scroll containers scroll freely and smoothly with touch/wheel */
          div[style*="overflow-y: auto"],
          div[style*="overflow-y: scroll"],
          div[style*="overflow: auto"],
          div[style*="overflow: scroll"] {
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-y !important;
            overscroll-behavior-y: contain !important;
            scroll-behavior: smooth;
          }
          /* Custom sleek scrollbar for web desktop */
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.18);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.32);
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
        `;
        document.head.appendChild(style);
      }
    }

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
      setShowOnboarding(false);
    } catch (error) {
      console.error("Error saving onboarding status:", error);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f2f0e7" }}>
        <ActivityIndicator size="large" color="#4285F4" />
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
    // If on a phone browser, take 100% of the screen seamlessly (just like the native app)
    if (isMobile) {
      return <View style={styles.webMobileContainer}>{renderContent()}</View>;
    }
    // If on a computer/tablet browser, center inside a sleek mobile frame
    return (
      <View style={styles.webDesktopContainer}>
        <View style={styles.webFrame}>{renderContent()}</View>
      </View>
    );
  }

  // Native Android & iOS app
  return renderContent();
}

const styles = StyleSheet.create({
  webMobileContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#f2f0e7",
  },
  webDesktopContainer: {
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
