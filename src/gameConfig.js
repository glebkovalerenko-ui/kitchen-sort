// /src/gameConfig.js

export const TILE_TYPES = {
    EMPTY: 0,
    EGG: 'egg',
    TOMATO: 'tomato',
    FRIED_EGG: 'fried_egg',
    DICED_TOMATOES: 'diced_tomatoes',
    OMELLETE: 'omelette',
    TOMATO_SAUCE: 'tomato_sauce',
    SCRAMBLED_EGGS: 'scrambled_eggs',
    BRUSCHETTA_TOMATO: 'bruschetta_tomato',
    OMELETTE_WITH_TOMATOES: 'omelette_with_tomatoes',
    SHAKSHUKA_BASE: 'shakshuka_base',
    EGG_MUFFIN_BASE: 'egg_muffin_base',
    BREAKFAST_TOAST: 'breakfast_toast',
    EGG_TOMATO_SALAD: 'egg_tomato_salad',
    SHAKSHUKA: 'shakshuka',
    ITALIAN_OMELETTE: 'italian_omelette',
    EGG_MUFFIN: 'egg_muffin',
    TOMATO_SPREAD: 'tomato_spread',
    STUFFED_TOMATO: 'stuffed_tomato',
    BREAKFAST_PLATE: 'breakfast_plate',
    PROTEIN_PAN: 'protein_pan',
    BAKED_FRITTATA: 'baked_frittata',
    CHEF_SPECIAL: 'chef_special',
};

// --- НОВОЕ: УРОВНИ СЛОЖНОСТИ ПРЕДМЕТОВ (TIERS) ---
// Ключевая структура для балансировки генерации заказов.
export const ITEM_TIERS = {
    [TILE_TYPES.EGG]: 1,
    [TILE_TYPES.TOMATO]: 1,
    [TILE_TYPES.FRIED_EGG]: 2,
    [TILE_TYPES.DICED_TOMATOES]: 2,
    [TILE_TYPES.OMELLETE]: 3,
    [TILE_TYPES.TOMATO_SAUCE]: 3,
    [TILE_TYPES.SCRAMBLED_EGGS]: 3,
    [TILE_TYPES.BRUSCHETTA_TOMATO]: 3,
    [TILE_TYPES.OMELETTE_WITH_TOMATOES]: 4,
    [TILE_TYPES.SHAKSHUKA_BASE]: 4,
    [TILE_TYPES.EGG_MUFFIN_BASE]: 4,
    [TILE_TYPES.BREAKFAST_TOAST]: 4,
    [TILE_TYPES.EGG_TOMATO_SALAD]: 4,
    [TILE_TYPES.TOMATO_SPREAD]: 4,
    [TILE_TYPES.STUFFED_TOMATO]: 4,
    [TILE_TYPES.SHAKSHUKA]: 5,
    [TILE_TYPES.ITALIAN_OMELETTE]: 5,
    [TILE_TYPES.EGG_MUFFIN]: 5,
    [TILE_TYPES.BREAKFAST_PLATE]: 6,
    [TILE_TYPES.PROTEIN_PAN]: 6,
    [TILE_TYPES.BAKED_FRITTATA]: 6,
    [TILE_TYPES.CHEF_SPECIAL]: 7,
};


export const RECIPES = [
    { inputs: [TILE_TYPES.EGG, TILE_TYPES.EGG], output: TILE_TYPES.FRIED_EGG, score: 10, coins: 1 },
    { inputs: [TILE_TYPES.TOMATO, TILE_TYPES.TOMATO], output: TILE_TYPES.DICED_TOMATOES, score: 10, coins: 1 },
    { inputs: [TILE_TYPES.FRIED_EGG, TILE_TYPES.FRIED_EGG], output: TILE_TYPES.OMELLETE, score: 25, coins: 3 },
    { inputs: [TILE_TYPES.DICED_TOMATOES, TILE_TYPES.DICED_TOMATOES], output: TILE_TYPES.TOMATO_SAUCE, score: 25, coins: 3 },
    { inputs: [TILE_TYPES.EGG, TILE_TYPES.FRIED_EGG], output: TILE_TYPES.SCRAMBLED_EGGS, score: 30, coins: 4 },
    { inputs: [TILE_TYPES.TOMATO, TILE_TYPES.DICED_TOMATOES], output: TILE_TYPES.BRUSCHETTA_TOMATO, score: 30, coins: 4 },
    { inputs: [TILE_TYPES.TOMATO, TILE_TYPES.SCRAMBLED_EGGS], output: TILE_TYPES.EGG_TOMATO_SALAD, score: 80, coins: 10 },
    { inputs: [TILE_TYPES.OMELLETE, TILE_TYPES.DICED_TOMATOES], output: TILE_TYPES.OMELETTE_WITH_TOMATOES, score: 150, coins: 15 },
    { inputs: [TILE_TYPES.TOMATO_SAUCE, TILE_TYPES.DICED_TOMATOES], output: TILE_TYPES.SHAKSHUKA_BASE, score: 150, coins: 15 },
    { inputs: [TILE_TYPES.OMELLETE, TILE_TYPES.SCRAMBLED_EGGS], output: TILE_TYPES.EGG_MUFFIN_BASE, score: 180, coins: 18 },
    { inputs: [TILE_TYPES.BRUSCHETTA_TOMATO, TILE_TYPES.FRIED_EGG], output: TILE_TYPES.BREAKFAST_TOAST, score: 160, coins: 16 },
    { inputs: [TILE_TYPES.TOMATO_SAUCE, TILE_TYPES.TOMATO], output: TILE_TYPES.TOMATO_SPREAD, score: 140, coins: 14 },
    { inputs: [TILE_TYPES.TOMATO, TILE_TYPES.OMELLETE], output: TILE_TYPES.STUFFED_TOMATO, score: 150, coins: 15 },
    { inputs: [TILE_TYPES.SHAKSHUKA_BASE, TILE_TYPES.FRIED_EGG], output: TILE_TYPES.SHAKSHUKA, score: 350, coins: 30 },
    { inputs: [TILE_TYPES.OMELETTE_WITH_TOMATOES, TILE_TYPES.FRIED_EGG], output: TILE_TYPES.ITALIAN_OMELETTE, score: 400, coins: 35 },
    { inputs: [TILE_TYPES.EGG_MUFFIN_BASE, TILE_TYPES.FRIED_EGG], output: TILE_TYPES.EGG_MUFFIN, score: 450, coins: 40 },
    { inputs: [TILE_TYPES.SCRAMBLED_EGGS, TILE_TYPES.SHAKSHUKA], output: TILE_TYPES.PROTEIN_PAN, score: 1000, coins: 80 },
    { inputs: [TILE_TYPES.ITALIAN_OMELETTE, TILE_TYPES.TOMATO_SPREAD], output: TILE_TYPES.BAKED_FRITTATA, score: 1200, coins: 100 },
    { inputs: [TILE_TYPES.ITALIAN_OMELETTE, TILE_TYPES.BREAKFAST_TOAST], output: TILE_TYPES.BREAKFAST_PLATE, score: 1500, coins: 125 },
    { inputs: [TILE_TYPES.BREAKFAST_PLATE, TILE_TYPES.PROTEIN_PAN], output: TILE_TYPES.CHEF_SPECIAL, score: 5000, coins: 400 },
];

export const GENERATORS = {
    'coop': {
        id: 'coop',
        produces: TILE_TYPES.EGG,
        upgrades: {
            capacity: { baseCost: 50, factor: 1.8, baseValue: 4, increment: 1 },
            speed: { baseCost: 100, factor: 1.5, baseValue: 600, decrement: 30 },
            bonus: { baseCost: 500, factor: 2.5, baseValue: 0, increment: 0.02 }
        }
    },
    'greenhouse': {
        id: 'greenhouse',
        produces: TILE_TYPES.TOMATO,
        upgrades: {
            capacity: { baseCost: 50, factor: 1.8, baseValue: 4, increment: 1 },
            speed: { baseCost: 100, factor: 1.5, baseValue: 600, decrement: 30 },
            bonus: { baseCost: 500, factor: 2.5, baseValue: 0, increment: 0.02 }
        }
    }
};

export const GADGETS = {
    'knife': { id: 'knife', baseCost: 100, costFactor: 1.5 },
    'spatula': { id: 'spatula', baseCost: 250, costFactor: 1.8 }
};

export const GREENHOUSE_SLOTS = [
    { "x": 171, "y": 467, "scale": 0.5 }, { "x": 396, "y": 467, "scale": 0.5 }, { "x": 620, "y": 467, "scale": 0.5 },
    { "x": 117, "y": 581, "scale": 0.5 }, { "x": 305, "y": 581, "scale": 0.5 }, { "x": 494, "y": 581, "scale": 0.5 }, { "x": 683, "y": 581, "scale": 0.5 }
];

export const COOP_SLOTS = [
    { "x": 306, "y": 291, "scale": 0.35 }, { "x": 485, "y": 291, "scale": 0.35 },
    { "x": 306, "y": 502, "scale": 0.35 }, { "x": 485, "y": 502, "scale": 0.35 },
    { "x": 190, "y": 720, "scale": 0.5 }, { "x": 402, "y": 760, "scale": 0.5 }, { "x": 615, "y": 720, "scale": 0.5 }
];

export const CLEAR_BOARD_COST = 250;

export const INTERSTITIAL_FIRST_SESSION_DELAY = 600000; // 600 секунд = 10 минут в миллисекундах

// --- НОВОЕ: КОНФИГУРАЦИЯ СИСТЕМЫ ЗАКАЗОВ ---
export const ORDERS_CONFIG = {
    MAX_ACTIVE_ORDERS: 3,

    // Множитель награды относительно "стоимости" крафта предмета
    REWARD_MULTIPLIER: {
        EASY: 1.5,   // x1.5 от стоимости
        MEDIUM: 2.0, // x2 от стоимости
        HARD: 3.0,   // x3 от стоимости
    },
    
    // Время перезарядки слота заказа в секундах
    COOLDOWN_SECONDS: {
        EASY: 180,   // 3 минуты
        MEDIUM: 300, // 5 минут
        HARD: 600,   // 10 минут
    }
};