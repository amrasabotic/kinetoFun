export type GameScreen = 'landing' | 'order' | 'baking' | 'result';

export type IngredientType = 'sauce' | 'cheese' | 'pepperoni' | 'mushroom' | 'basil';

export interface Ingredient {
  id: string;
  type: IngredientType;
  x: number;
  y: number;
}

export interface PizzaOrder {
  name: string;
  description: string;
  ingredients: IngredientType[];
}

export interface HandState {
  cursorX: number;
  cursorY: number;
  isPinching: boolean;
  isTracking: boolean;
}

export const PIZZA_ORDERS: PizzaOrder[] = [
  {
    name: 'Margherita',
    description: 'Classic tomato sauce with cheese and basil',
    ingredients: ['sauce', 'cheese', 'basil'],
  },
  {
    name: 'Pepperoni',
    description: 'Tomato sauce, cheese, and pepperoni',
    ingredients: ['sauce', 'cheese', 'pepperoni'],
  },
  {
    name: 'Mushroom Delight',
    description: 'Tomato sauce, cheese, and mushrooms',
    ingredients: ['sauce', 'cheese', 'mushroom'],
  },
  {
    name: 'Garden Special',
    description: 'Sauce, cheese, mushrooms, and basil',
    ingredients: ['sauce', 'cheese', 'mushroom', 'basil'],
  },
  {
    name: 'The Works',
    description: 'Everything! Sauce, cheese, pepperoni, mushrooms, basil',
    ingredients: ['sauce', 'cheese', 'pepperoni', 'mushroom', 'basil'],
  },
];

export const INGREDIENT_COLORS: Record<IngredientType, string> = {
  sauce: '#c0392b',
  cheese: '#f39c12',
  pepperoni: '#922b21',
  mushroom: '#7d6608',
  basil: '#1e8449',
};

export const INGREDIENT_LABELS: Record<IngredientType, string> = {
  sauce: 'Tomato Sauce',
  cheese: 'Cheese',
  pepperoni: 'Pepperoni',
  mushroom: 'Mushrooms',
  basil: 'Basil',
};
