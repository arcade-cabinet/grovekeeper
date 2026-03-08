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
  batchHarvest: {
    position: "absolute",
    bottom: 180,
    right: 16,
    zIndex: 10,
  },
});
