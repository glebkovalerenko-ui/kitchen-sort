// /src/systems/OrderSystem.js
import { ORDERS_CONFIG, ITEM_TIERS, RECIPES, TILE_TYPES } from '../GameConfig.js';

// Вспомогательная функция для расчета базовой стоимости предмета
const coinValuesCache = new Map();

function calculateBaseCoinValue(itemType) {
    if (coinValuesCache.has(itemType)) {
        return coinValuesCache.get(itemType);
    }

    // Базовые предметы не имеют стоимости крафта (0)
    if (itemType === TILE_TYPES.EGG || itemType === TILE_TYPES.TOMATO) {
        return 0;
    }

    const recipe = RECIPES.find(r => r.output === itemType);
    if (!recipe) {
        coinValuesCache.set(itemType, 0);
        return 0;
    }

    // Стоимость = стоимость ингредиентов + монеты за слияние
    const value = calculateBaseCoinValue(recipe.inputs[0]) +
                  calculateBaseCoinValue(recipe.inputs[1]) +
                  recipe.coins;
    
    coinValuesCache.set(itemType, value);
    return value;
}

export default class OrderSystem {
    constructor() {
        // Заполняем кеш при инициализации
        if (coinValuesCache.size === 0) {
            for (const itemKey in TILE_TYPES) {
                const itemType = TILE_TYPES[itemKey];
                if (itemType !== 0) {
                    calculateBaseCoinValue(itemType);
                }
            }
        }
    }

    /**
     * Генерирует новый заказ, включая возможность "Discovery" (открытие нового предмета).
     * @param {string[]} unlockedItems - Массив ID предметов, открытых игроком.
     * @returns {object|null} - Объект заказа или null.
     */
    generateNewOrder(unlockedItems) {
        if (unlockedItems.length < 2) return null;

        // 1. Ищем кандидатов на открытие (Discovery)
        // Предмет закрыт, но оба его ингредиента открыты
        const discoveryCandidates = [];
        RECIPES.forEach(recipe => {
            const outputIsLocked = !unlockedItems.includes(recipe.output);
            const input1Unlocked = unlockedItems.includes(recipe.inputs[0]);
            const input2Unlocked = unlockedItems.includes(recipe.inputs[1]);
            
            if (outputIsLocked && input1Unlocked && input2Unlocked) {
                discoveryCandidates.push(recipe.output);
            }
        });

        let chosenItem = null;
        let chosenDifficulty = 'EASY';

        // 2. Логика выбора: Discovery (40%) или Обычный (60%)
        if (discoveryCandidates.length > 0 && Math.random() < 0.4) {
            chosenItem = discoveryCandidates[Math.floor(Math.random() * discoveryCandidates.length)];
            chosenDifficulty = 'HARD'; // Новые предметы всегда ценятся высоко
        } else {
            // Стандартная логика
            const maxUnlockedTier = Math.max(...unlockedItems.map(i => ITEM_TIERS[i] || 0));
            
            // Определяем целевые тиры
            const targetTiers = {
                EASY: Math.max(2, maxUnlockedTier - 2),
                MEDIUM: Math.max(3, maxUnlockedTier - 1),
                HARD: Math.max(3, maxUnlockedTier),
            };

            const roll = Math.random();
            if (roll < 0.5) chosenDifficulty = 'EASY';
            else if (roll < 0.85) chosenDifficulty = 'MEDIUM';
            else chosenDifficulty = 'HARD';

            let targetTier = targetTiers[chosenDifficulty];
            
            // Фильтруем предметы по тиру
            let candidates = unlockedItems.filter(item => {
                const t = ITEM_TIERS[item];
                return chosenDifficulty === 'HARD' ? (t >= targetTier && t <= targetTier + 1) : t === targetTier;
            });

            // Фоллбэк, если кандидатов нет
            if (candidates.length === 0) {
                candidates = unlockedItems.filter(item => ITEM_TIERS[item] >= 2);
            }

            if (candidates.length > 0) {
                chosenItem = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        if (!chosenItem) return null;

        // 3. Расчет награды
        const baseValue = calculateBaseCoinValue(chosenItem);
        const multiplier = ORDERS_CONFIG.REWARD_MULTIPLIER[chosenDifficulty];
        
        // Бонус x1.5 за Discovery заказ
        const isDiscovery = discoveryCandidates.includes(chosenItem);
        const finalMultiplier = isDiscovery ? multiplier * 1.5 : multiplier;

        const coinReward = Math.ceil((baseValue * finalMultiplier) / 5) * 5;

        return {
            id: `order_${Date.now()}_${Math.random()}`,
            itemType: chosenItem,
            amount: 1,
            coinReward: coinReward,
            difficulty: chosenDifficulty,
            isDiscovery: isDiscovery // Флаг для UI (черный силуэт)
        };
    }
}