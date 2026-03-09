import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  current_stock: number;
  min_stock: number;
}

export interface Recipe {
  id: string;
  name: string;
  category_id: string | null;
  product_id: string | null;
  output_quantity: number;
  output_unit: string;
  estimated_cost: number;
  sale_price: number;
  modifiers: any[];
  extras: any[];
  instructions: string;
  ingredients: { ingredient_id: string; ingredient_name?: string; quantity: number; unit?: string }[];
}

export interface ProductionOrder {
  id: string;
  recipe_id: string | null;
  recipe_name: string;
  quantity: number;
  status: string;
  type: string;
  total_cost: number;
  notes: string;
  created_at: string;
  completed_at: string | null;
}

export function useProduction() {
  const queryClient = useQueryClient();

  const ingredientsQuery = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ingredients').select('*').order('name');
      if (error) throw error;
      return (data || []) as Ingredient[];
    },
  });

  const recipesQuery = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recipes').select('*, recipe_ingredients(*)').order('name');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        ingredients: (r.recipe_ingredients || []).map((ri: any) => ({
          ingredient_id: ri.ingredient_id,
          quantity: ri.quantity,
          unit: ri.unit,
        })),
      })) as Recipe[];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ['production_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('production_orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProductionOrder[];
    },
  });

  const addIngredient = useMutation({
    mutationFn: async (ing: { name: string; unit: string; cost_per_unit?: number; current_stock?: number; min_stock?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase.from('ingredients').insert({ ...ing, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  });

  const updateIngredient = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Ingredient> }) => {
      const { error } = await supabase.from('ingredients').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  });

  const deleteIngredient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ingredients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingredients'] }),
  });

  const addRecipe = useMutation({
    mutationFn: async (recipe: {
      name: string;
      category_id?: string;
      product_id?: string;
      output_quantity?: number;
      output_unit?: string;
      sale_price?: number;
      modifiers?: any[];
      extras?: any[];
      instructions?: string;
      ingredients: { ingredient_id: string; quantity: number; unit?: string }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');

      const allIngs = queryClient.getQueryData(['ingredients']) as Ingredient[] || [];
      const estimatedCost = recipe.ingredients.reduce((sum, ri) => {
        const ing = allIngs.find(i => i.id === ri.ingredient_id);
        return sum + (ing ? ing.cost_per_unit * ri.quantity : 0);
      }, 0);

      const { ingredients: recipeIngs, ...recipeData } = recipe;
      const { data, error } = await supabase.from('recipes')
        .insert({ ...recipeData, user_id: user.id, estimated_cost: estimatedCost })
        .select().single();
      if (error) throw error;

      if (recipeIngs.length > 0) {
        const { error: riError } = await supabase.from('recipe_ingredients')
          .insert(recipeIngs.map(ri => ({ recipe_id: data.id, ...ri })));
        if (riError) throw riError;
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });

  const addProductionOrder = useMutation({
    mutationFn: async (order: { recipe_id: string; recipe_name: string; quantity: number; type?: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');

      const recipe = (recipesQuery.data || []).find(r => r.id === order.recipe_id);
      const totalCost = recipe ? recipe.estimated_cost * order.quantity : 0;

      const { data, error } = await supabase.from('production_orders')
        .insert({ ...order, user_id: user.id, total_cost: totalCost, status: 'pending' })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production_orders'] }),
  });

  const executeProduction = useMutation({
    mutationFn: async (orderId: string) => {
      const orders = queryClient.getQueryData(['production_orders']) as ProductionOrder[] || [];
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('შეკვეთა ვერ მოიძებნა');

      const recipes = queryClient.getQueryData(['recipes']) as Recipe[] || [];
      const recipe = recipes.find(r => r.id === order.recipe_id);
      if (!recipe) throw new Error('რეცეპტი ვერ მოიძებნა');

      const ingredients = queryClient.getQueryData(['ingredients']) as Ingredient[] || [];

      // 1. Deduct ingredients
      for (const ri of recipe.ingredients) {
        const ing = ingredients.find(i => i.id === ri.ingredient_id);
        if (ing) {
          const newStock = Math.max(0, ing.current_stock - ri.quantity * order.quantity);
          await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', ing.id);
        }
      }

      // 2. Increase finished product stock if product_id is linked
      if (recipe.product_id) {
        const { data: prodData } = await supabase.from('products').select('stock').eq('id', recipe.product_id).single();
        if (prodData) {
          const newProdStock = (prodData.stock || 0) + (recipe.output_quantity * order.quantity);
          await supabase.from('products').update({ stock: newProdStock }).eq('id', recipe.product_id);
        }
      }

      // 3. Mark completed
      const { error } = await supabase.from('production_orders')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production_orders'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const calculateCost = (recipeId: string): number => {
    const recipe = (recipesQuery.data || []).find(r => r.id === recipeId);
    if (!recipe) return 0;
    return recipe.ingredients.reduce((sum, ri) => {
      const ing = (ingredientsQuery.data || []).find(i => i.id === ri.ingredient_id);
      return sum + (ing ? ing.cost_per_unit * ri.quantity : 0);
    }, 0);
  };

  return {
    ingredients: ingredientsQuery.data || [],
    recipes: recipesQuery.data || [],
    productionOrders: ordersQuery.data || [],
    isLoading: ingredientsQuery.isLoading,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    addRecipe,
    deleteRecipe,
    addProductionOrder,
    executeProduction,
    calculateCost,
  };
}
