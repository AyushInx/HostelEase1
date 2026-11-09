import React, { useState, useRef } from "react";
import {
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PAGES = [
  {
    backgroundColor: "#d1f7c4", // Playful Mint
    circleBg: "#e8fadd",
    image: require("../../../assets/pic1.png"),
    title: "Welcome to HostelEase",
    subtitle: "Your ultimate companion for a seamless hostel life.",
  },
  {
    backgroundColor: "#ffcc80", // Playful Peach/Orange
    circleBg: "#ffe0b2",
    image: require("../../../assets/on1.png"),
    title: "Stay Connected",
    subtitle: "Notices, Polls, and Complaints - all in one place.",
  },
  {
    backgroundColor: "#fff59d", // Playful Lemon
    circleBg: "#fff9c4",
    image: require("../../../assets/pic3.png"),
    title: "Easy Living",
    subtitle: "Apply for leaves, check mess menu, and more!",
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Responsive sizes based on screen/container
  const containerWidth = Math.min(windowWidth, 480);
  const circleSize = Math.min(Math.round(containerWidth * 0.65), 240);
  const imageSize = Math.round(circleSize * 0.78);

  const transitionTo = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= PAGES.length) return;
    const direction = nextIndex > currentIndex ? -30 : 30;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      slideAnim.setValue(-direction);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (currentIndex < PAGES.length - 1) {
      transitionTo(currentIndex + 1);
    } else {
      if (onComplete) onComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      transitionTo(currentIndex - 1);
    }
  };

  // PanResponder for smooth swipe gestures on both native & web
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 15,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Swiped left
          handleNext();
        } else if (gestureState.dx > 50) {
          // Swiped right
          handlePrev();
        }
      },
    })
  ).current;

  const currentPage = PAGES[currentIndex];

  return (
    <View
      style={[styles.container, { backgroundColor: currentPage.backgroundColor }]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.innerContent, { maxWidth: 480 }]}>
        {/* Main Content Area */}
        <Animated.View
          style={[
            styles.cardContent,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Circle Wrapper with Illustration */}
          <View
            style={[
              styles.imageWrapper,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                backgroundColor: currentPage.circleBg,
              },
            ]}
          >
            <Image
              source={currentPage.image}
              style={{ width: imageSize, height: imageSize }}
              resizeMode="contain"
            />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>{currentPage.title}</Text>
          <Text style={styles.subtitle}>{currentPage.subtitle}</Text>
        </Animated.View>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomBar}>
          {/* Skip Button (left) */}
          <View style={styles.skipWrapper}>
            {currentIndex < PAGES.length - 1 ? (
              <TouchableOpacity
                onPress={onComplete}
                style={styles.skipButton}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {/* Dots Indicator (center) */}
          <View style={styles.dotsContainer}>
            {PAGES.map((_, i) => {
              const isActive = i === currentIndex;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => transitionTo(i)}
                  activeOpacity={0.8}
                  style={[
                    styles.dot,
                    isActive ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              );
            })}
          </View>

          {/* Next / Get Started Button (right) */}
          <View style={styles.actionWrapper}>
            {currentIndex < PAGES.length - 1 ? (
              <TouchableOpacity
                onPress={handleNext}
                style={styles.nextButton}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onComplete}
                style={styles.doneButton}
                activeOpacity={0.85}
              >
                <Text style={styles.doneText}>Get Started</Text>
                <Ionicons
                  name="rocket-outline"
                  size={19}
                  color="#fff"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  innerContent: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 30,
  },
  cardContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  imageWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#222",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 16,
    color: "#4a4a4a",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  bottomBar: {
    width: "100%",
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  skipWrapper: {
    minWidth: 70,
    alignItems: "flex-start",
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    height: 8,
    marginHorizontal: 4,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  actionWrapper: {
    minWidth: 70,
    alignItems: "flex-end",
  },
  nextButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  doneButton: {
    flexDirection: "row",
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  doneText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
