import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, font, gradient } from "../../ui/tokens";
import { smoothPath } from "./series";

export type ChartPoint = { label: string; total: number };

const H = 160;
const PAD = { x: 8, top: 16, bottom: 8 };

// Smooth line + gradient area; labels are thinned (anchored on the last point); the last point is highlighted.
export function TrendChart({ points }: { points: ChartPoint[] }) {
  const [w, setW] = useState(0);
  const max = Math.max(...points.map((p) => p.total), 1);
  const xy = points.map((p, i) => ({
    x: PAD.x + (i * (w - 2 * PAD.x)) / Math.max(points.length - 1, 1),
    y: PAD.top + (1 - p.total / max) * (H - PAD.top - PAD.bottom),
  }));
  const last_ = points.length - 1;
  const step = points.length <= 7 ? 1 : Math.ceil(points.length / 6);
  const line = smoothPath(xy);
  const last = xy[xy.length - 1];
  const area = w ? `${line} L${last.x},${H} L${xy[0].x},${H} Z` : "";

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={gradient[1]} stopOpacity={0.3} />
              <Stop offset="1" stopColor={gradient[0]} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#area)" />
          <Path d={line} fill="none" stroke="url(#stroke)" strokeWidth={3} strokeLinecap="round" />
          <Circle cx={last.x} cy={last.y} r={8} fill={colors.primary} opacity={0.2} />
          <Circle cx={last.x} cy={last.y} r={4} fill={colors.primary} />
        </Svg>
      ) : null}
      <View style={styles.labels}>
        {w
          ? points.map((p, i) =>
              (last_ - i) % step === 0 ? (
                <Text key={i} style={[styles.label, { left: xy[i].x - 22 }, i === points.length - 1 && styles.labelActive]}>{p.label}</Text>
              ) : null,
            )
          : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { height: 36, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 12 },
  label: { position: "absolute", top: 12, width: 44, textAlign: "center", fontFamily: font.regular, fontSize: 11, color: colors.gray400, textTransform: "capitalize" },
  labelActive: { fontFamily: font.bold, color: colors.primary },
});
