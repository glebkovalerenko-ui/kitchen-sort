// /src/gameConfig.js

export const TILE_TYPES = {
    EMPTY: 0,
    // Яичная цепочка (5 уровней)
    EGG: 'egg',
    FRIED_EGG: 'fried_egg',
    OMELLETE: 'omelette',
    SHAKSHUKA: 'shakshuka',
    BREAKFAST_PLATTER: 'breakfast_platter',
    // Томатная цепочка (5 уровней)
    TOMATO: 'tomato',
    DICED_TOMATOES: 'diced_tomatoes',
    TOMATO_SAUCE: 'tomato_sauce',
    TOMATO_SOUP: 'tomato_soup',
    GAZPACHO: 'gazpacho'
};

export const RECIPES = {
    [TILE_TYPES.EGG]:              { mergeTo: TILE_TYPES.FRIED_EGG,        score: 10,  coins: 1 },
    [TILE_TYPES.FRIED_EGG]:        { mergeTo: TILE_TYPES.OMELLETE,         score: 25,  coins: 3 },
    [TILE_TYPES.OMELLETE]:         { mergeTo: TILE_TYPES.SHAKSHUKA,        score: 75,  coins: 8 },
    [TILE_TYPES.SHAKSHUKA]:        { mergeTo: TILE_TYPES.BREAKFAST_PLATTER,score: 200, coins: 20 },

    [TILE_TYPES.TOMATO]:           { mergeTo: TILE_TYPES.DICED_TOMATOES,   score: 10,  coins: 1 },
    [TILE_TYPES.DICED_TOMATOES]:   { mergeTo: TILE_TYPES.TOMATO_SAUCE,     score: 25,  coins: 3 },
    [TILE_TYPES.TOMATO_SAUCE]:     { mergeTo: TILE_TYPES.TOMATO_SOUP,      score: 75,  coins: 8 },
    [TILE_TYPES.TOMATO_SOUP]:      { mergeTo: TILE_TYPES.GAZPACHO,         score: 200, coins: 20 }
    // Предметы последнего уровня (BREAKFAST_PLATTER, GAZPACHO) не имеют рецептов
};

export const SPAWNABLE_INGREDIENTS = [ TILE_TYPES.EGG, TILE_TYPES.TOMATO ];

export const GADGETS = {
    'knife': {
        id: 'knife',
        name: 'Better Knife',
        description: 'Increases coins per merge by 10% per level.',
        baseCost: 100,
        costFactor: 1.5
    },
    'spatula': {
        id: 'spatula',
        name: 'Golden Spatula',
        description: 'Increases score per merge by 10% per level.',
        baseCost: 250,
        costFactor: 1.8
    }
};