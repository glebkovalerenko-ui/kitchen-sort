// /src/systems/OrderSystem.js
import { ORDERS_CONFIG, ITEM_TIERS, RECIPES, TILE_TYPES } from '../GameConfig.js';

// Вспомогательная, кешируемая функция для расчета базовой стоимости предмета
const coinValuesCache = new Map();
function calculateBaseCoinValue(itemType) {
    if (coinValuesCache.has(itemType)) {
        return coinValuesCache.get(itemType);
    }

    // Базовые предметы (Яйцо, Томат) не имеют рецепта, их стоимость для расчета = 0,
    // так как они не тратят монеты игрока.
    if (itemType === TILE_TYPES.EGG || itemType === TILE_TYPES.TOMATO) {
        return 0;
    }

    const recipe = RECIPES.find(r => r.output === itemType);
    if (!recipe) {
        coinValuesCache.set(itemType, 0);
        return 0;
    }

    // Стоимость предмета = стоимость его ингредиентов + монеты за само слияние
    const value = calculateBaseCoinValue(recipe.inputs[0]) +
                    calculateBaseCoinValue(recipe.inputs[1]) +
                    recipe.coins;
    
    coinValuesCache.set(itemType, value);
    return value;
}


export default class OrderSystem {
    constructor() {
        // Заполняем кеш при инициализации для ускорения работы
        if (coinValuesCache.size === 0) {
            for (const itemKey in TILE_TYPES) {
                const itemType = TILE_TYPES[itemKey];
                if (itemType !== 0) {
                    calculateBaseCoinValue(itemType);
                }
            }
        }
        console.log("OrderSystem initialized and coin values cache populated.");
    }

    /**
     * Генерирует новый заказ, основываясь на прогрессе игрока.
     * @param {string[]} unlockedItems - Массив ID предметов, открытых игроком.
     * @returns {object|null} - Сгенерированный объект заказа или null.
     */
    generateNewOrder(unlockedItems) {
        if (unlockedItems.length < 2) return null; // Нельзя дать заказ, если открыты только базовые предметы

        // 1. Определяем максимальный уровень (tier) предметов, доступных игроку
        let maxUnlockedTier = 0;
        unlockedItems.forEach(item => {
            if (ITEM_TIERS[item] > maxUnlockedTier) {
                maxUnlockedTier = ITEM_TIERS[item];
            }
        });

        // 2. Определяем целевые уровни для заказов разной сложности
        const targetTiers = {
            EASY: Math.max(2, maxUnlockedTier - 2),
            MEDIUM: Math.max(3, maxUnlockedTier - 1),
            HARD: Math.max(3, maxUnlockedTier),
        };

        // 3. Выбираем случайную сложность (с уклоном в более легкие)
        const difficultyRoll = Math.random();
        let chosenDifficulty;
        if (difficultyRoll < 0.5) chosenDifficulty = 'EASY';      // 50% шанс
        else if (difficultyRoll < 0.85) chosenDifficulty = 'MEDIUM'; // 35% шанс
        else chosenDifficulty = 'HARD';                         // 15% шанс

        let targetTier = targetTiers[chosenDifficulty];
        
        // 4. Находим все открытые предметы, подходящие под выбранный уровень
        const candidateItems = unlockedItems.filter(item => {
            const itemTier = ITEM_TIERS[item];
            // Для "сложных" заказов можем взять предмет на уровень выше, если он достижим
            if (chosenDifficulty === 'HARD') {
                return itemTier >= targetTier && itemTier <= targetTier + 1;
            }
            return itemTier === targetTier;
        });

        if (candidateItems.length === 0) {
            // Если для HARD нет кандидатов, пробуем MEDIUM
            if (chosenDifficulty === 'HARD') {
                chosenDifficulty = 'MEDIUM';
                targetTier = targetTiers[chosenDifficulty];
                const mediumCandidates = unlockedItems.filter(item => ITEM_TIERS[item] === targetTier);
                 if (mediumCandidates.length > 0) candidateItems.push(...mediumCandidates);
            }
             // Если все еще пусто, даем любой открытый заказ, кроме базовых
            if (candidateItems.length === 0) {
                 const fallbackItems = unlockedItems.filter(item => ITEM_TIERS[item] > 1);
                 if(fallbackItems.length === 0) return null;
                 candidateItems.push(...fallbackItems);
            }
        }

        // 5. Выбираем случайный предмет из кандидатов
        const chosenItem = candidateItems[Math.floor(Math.random() * candidateItems.length)];
        
        // 6. Рассчитываем награду
        const baseValue = calculateBaseCoinValue(chosenItem);
        const rewardMultiplier = ORDERS_CONFIG.REWARD_MULTIPLIER[chosenDifficulty];
        const coinReward = Math.ceil((baseValue * rewardMultiplier) / 5) * 5; // Округляем до 5 для красоты

        // 7. Формируем и возвращаем объект заказа
        return {
            id: `order_${Date.now()}_${Math.random()}`, // Уникальный ID
            itemType: chosenItem,
            amount: 1, // Пока всегда 1 предмет
            coinReward: coinReward,
            difficulty: chosenDifficulty
        };
    }
}