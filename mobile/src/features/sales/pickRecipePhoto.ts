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

export type PickedPhoto = ImagePicker.ImagePickerAsset;

// Offers camera or gallery. Returns the chosen photo, or null if the user backed out.
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const source = await ask();
  if (!source) return null;
  const perm = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new ApiError(0, source === "camera" ? "Permite el acceso a la cámara para tomar la foto." : "Permite el acceso a tus fotos para elegir una.");
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  return res.canceled ? null : res.assets[0];
}

// Uploads a picked photo. Returns the updated recipe.
export async function uploadRecipePhoto(recipeId: string, asset: PickedPhoto): Promise<Recipe> {
  // Expo's fetch (SDK 58) can't send RN's { uri } file parts: read the file into a Blob. Its multipart encoder
  // only writes a filename (which multer needs to see a file) when the part has a `name`.
  const bytes = await (await fetch(asset.uri)).blob();
  const file = Object.assign(new Blob([bytes], { type: asset.mimeType ?? "image/jpeg" }), { name: asset.fileName ?? "photo.jpg" });
  const form = new FormData();
  form.append("image", file as unknown as Blob);
  return request<Recipe>(`/api/recipes/${recipeId}/image`, { method: "POST", body: form, timeoutMs: 60000 }); // photos are slow on mobile data
}

// Pick and upload in one go. Returns the updated recipe, or null if the user backed out.
export async function pickRecipePhoto(recipeId: string): Promise<Recipe | null> {
  const asset = await pickPhoto();
  return asset ? uploadRecipePhoto(recipeId, asset) : null;
}
