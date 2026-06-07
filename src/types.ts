export interface RecipeRecommendation {
  name: string;
  reason: string;
  ingredients: string[];
  instructions: string[];
  precautions: string[];
  imageUrl: string;
  originalImageUrl?: string;
  imagePrompt?: string;
}

export interface SavedRecipe extends RecipeRecommendation {
  id: number;
  createdAt: string;
}
