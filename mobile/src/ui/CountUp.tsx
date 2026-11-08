import { useEffect, useState } from "react";
import { Text, type TextProps } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

type Props = TextProps & { value: number; format: (n: number) => string; duration?: number };

// Counts from the previous value to `value` (ease-out). Jumps straight there with reduced motion.
export function CountUp({ value, format, duration = 700, ...rest }: Props) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) return setShown(value);
    const from = shown;
    const t0 = Date.now();
    let raf = requestAnimationFrame(function tick() {
      const p = Math.min((Date.now() - t0) / duration, 1);
      setShown(from + (value - from) * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `shown` is only the animation origin
  }, [value, duration, reduce]);
  return <Text {...rest}>{format(shown)}</Text>;
}
