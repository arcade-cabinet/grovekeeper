import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  vignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  weatherForecast: {
    position: "absolute",
    top: 64,
    right: 12,
  },
  toolBelt: {
    position: "absolute",
    bottom: 140,
    right: 12,
  },
  batchHarvest: {
    position: "absolute",
    bottom: 240,
    right: 16,
    zIndex: 10,
  },
  staminaGauge: {
    position: "absolute",
    bottom: 240,
    right: 20,
  },
});
