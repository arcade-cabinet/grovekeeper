import { useEffect } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function Sparkle({
  angle,
  delay,
  reduceMotion,
}: {
  angle: number;
  delay: number;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(reduceMotion ? 0.7 : 0);
  const scale = useSharedValue(reduceMotion ? 0.8 : 0.5);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.7;
      scale.value = 0.8;
      return;
    }

    opacity.value = withDelay(
      delay * 1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
        () => {},
        ReduceMotion.Never,
      ),
    );
    scale.value = withDelay(
      delay * 1000,
      withRepeat(
        withSequence(withTiming(1, { duration: 500 }), withTiming(0.5, { duration: 500 })),
        -1,
        true,
        () => {},
        ReduceMotion.Never,
      ),
    );
  }, [opacity, scale, delay, reduceMotion]);

  const radius = 80;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      className="absolute h-2 w-2 rounded-full bg-prestige-gold"
      style={[
        {
          left: "50%",
          top: "50%",
          marginLeft: x - 4,
          marginTop: y - 4,
        },
        animatedStyle,
      ]}
    />
  );
}
