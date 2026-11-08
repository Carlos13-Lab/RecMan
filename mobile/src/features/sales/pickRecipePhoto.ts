import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { ApiError } from "../../shared/http";
import { request } from "../session/session";
import type { Recipe } from "../../shared/types";

const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.7 };

const ask = () =>
  new Promise<"camera" | "gallery" | null>((resolve) =>
    Alert.alert("Foto de la receta", "¿De dónde quieres tomar la foto?", [
      { text: "Cámara", onPress: () => resolve("camera") },
      { text: "Galería", onPress: () => resolve("gallery") },
      { text: "Cancelar", style: "cancel", onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) }),
  );

// Offers camera or gallery, then uploads the photo. Returns the updated recipe, or null if the user backed out.
export async function pickRecipePhoto(recipeId: string): Promise<Recipe | null> {
  const source = await ask();
  if (!source) return null;
  const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new ApiError(0, source === "camera" ? "Permite el acceso a la cámara para tomar la foto." : "Permite el acceso a tus fotos para elegir una.");
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  if (res.canceled) return null;

  const asset = res.assets[0];
  const form = new FormData();
  // React Native's FormData accepts { uri, name, type } as a file part.
  form.append("image", { uri: asset.uri, name: asset.fileName ?? "photo.jpg", type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
  return request<Recipe>(`/api/recipes/${recipeId}/image`, { method: "POST", body: form, timeoutMs: 60000 }); // photos are slow on mobile data
}
