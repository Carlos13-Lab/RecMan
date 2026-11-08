import { useLocalSearchParams } from "expo-router";
import { RecipeBuilder } from "../../../src/features/recipes/RecipeBuilder";

export default function EditRecipe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeBuilder id={id} />;
}
