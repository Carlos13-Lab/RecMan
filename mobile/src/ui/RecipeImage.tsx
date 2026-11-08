import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { API_URL } from "../features/session/session";
import { RecipeTile } from "../features/sales/RecipeTile";
import { resolveImageUrl } from "../shared/imageUrl";

type Props = { name: string; category: string | null; imageUrl?: string | null; size?: number | `${number}%` };

// Recipe photo (cached, fades in); falls back to the category gradient tile when there is none.
export function RecipeImage({ name, category, imageUrl, size = "100%" }: Props) {
  const uri = resolveImageUrl(imageUrl, API_URL);
  if (!uri) return <RecipeTile name={name} category={category} size={size} />;
  const radius = typeof size === "number" ? size * 0.25 : 14;
  return (
    <View style={[styles.box, { width: size, aspectRatio: 1, borderRadius: radius }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" accessibilityLabel={name} />
    </View>
  );
}

const styles = StyleSheet.create({ box: { overflow: "hidden" } });
