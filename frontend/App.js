import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AuthProvider from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import OnboardingScreen from "./src/screens/Auth/OnboardingScreen";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

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
            background-color: #0b1120;
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
          /* Custom sleek scrollbar */
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
    // Mobile phones: pure 100% full-screen native mobile web app
    if (isMobile) {
      return <View style={styles.webMobileContainer}>{renderContent()}</View>;
    }

    // Laptops / Desktops: Modern device showcase portal
    return (
      <View style={styles.webDesktopContainer}>
        {/* Top Navbar */}
        <View style={styles.desktopNavbar}>
          <View style={styles.navBrand}>
            <Image
              source={require("./assets/icon.png")}
              style={styles.navLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.navTitle}>HostelEase</Text>
              <Text style={styles.navSubtitle}>Smart Hostel Management Portal</Text>
            </View>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Live Production</Text>
          </View>
        </View>

        {/* Center Device Frame */}
        <View style={styles.deviceFrameWrap}>
          <View style={styles.deviceFrame}>
            {/* Top Phone Speaker / Notch */}
            <View style={styles.deviceNotch}>
              <View style={styles.speakerPill} />
            </View>
            {/* App Content */}
            <View style={styles.deviceContent}>{renderContent()}</View>
          </View>
        </View>

        {/* Bottom Desktop Hint */}
        <View style={styles.desktopFooter}>
          <Ionicons name="phone-portrait-outline" size={14} color="#94a3b8" style={{ marginRight: 6 }} />
          <Text style={styles.desktopFooterText}>
            For the best mobile experience, open this link directly in your phone's browser or tap "Add to Home Screen".
          </Text>
        </View>
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
    backgroundColor: "#0b1120",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
  },
  desktopNavbar: {
    width: "100%",
    height: 60,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  navBrand: {
    flexDirection: "row",
    alignItems: "center",
  },
  navLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 12,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: 0.3,
  },
  navSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  statusText: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "700",
  },
  deviceFrameWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
  },
  deviceFrame: {
    width: "100%",
    maxWidth: 420,
    height: "100%",
    maxHeight: 840,
    backgroundColor: "#ffffff",
    borderRadius: 40,
    borderWidth: 7,
    borderColor: "#1e293b",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 36,
    elevation: 16,
    flexDirection: "column",
  },
  deviceNotch: {
    width: "100%",
    height: 20,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  speakerPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#334155",
  },
  deviceContent: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#f2f0e7",
  },
  desktopFooter: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    width: "100%",
  },
  desktopFooterText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
