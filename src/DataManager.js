// /src/DataManager.js

import { GADGETS, GENERATORS } from './gameConfig.js';

const SAVE_KEY = 'playerData'; // Ключ, под которым все данные будут храниться в облаке

class DataManager {
    constructor() {
        this.player = null; // Здесь будет храниться объект игрока из Yandex SDK
        this.playerData = null; // Здесь будут кэшироваться данные игрока
    }

    // Метод инициализации. Должен быть вызван после получения ysdk.player
    async init(player) {
        this.player = player;
        console.log('DataManager initialized with Yandex Player object.');
        return this.load();
    }

    reset() {
        console.log("Resetting player data to default.");
        this.playerData = this.getDefaultData();
        this.save();
    }

    // Метод загрузки данных из облака
    async load() {
        try {
            const data = await this.player.getData([SAVE_KEY]);
            if (data && data[SAVE_KEY]) {
                this.playerData = data[SAVE_KEY];
                console.log('Player data loaded from cloud:', this.playerData);
            } else {
                console.log('No data in cloud. Using default data.');
                this.playerData = this.getDefaultData();
                // Сразу сохраняем дефолтные данные в облако
                await this.save();
            }
        } catch (error) {
            console.error('Failed to load player data from cloud:', error);
            // Если произошла ошибка, используем временные локальные данные
            this.playerData = this.getDefaultData();
        }
    }

    // Метод сохранения данных в облако
    async save() {
        if (!this.player) {
            console.error('Cannot save data: Player object is not initialized.');
            return;
        }
        try {
            await this.player.setData({ [SAVE_KEY]: this.playerData }, true); // true = flush immediately
            console.log('Game data saved to cloud!', this.playerData);
        } catch (error) {
            console.error('Failed to save player data to cloud:', error);
        }
    }

    // Открывает новый ингредиент
    unlockIngredient(type) {
        if (!this.playerData.unlockedItems.includes(type)) {
            this.playerData.unlockedItems.push(type);
            this.save(); // Сохраняем прогресс сразу после открытия
            return true;
        }
        return false;
    }

    // Проверяет, открыт ли ингредиент
    isUnlocked(type) {
        return this.playerData.unlockedItems.includes(type);
    }

    getCoins() { return this.playerData.coins; }
    
    addCoins(amount) {
        this.playerData.coins += amount;
        // Сохранение будет вызвано в конце хода (в handleMerge)
    }

    removeCoins(amount) {
        this.playerData.coins -= amount;
        // Сохранение будет вызвано в методе upgradeGadget
    }

    getGadgetLevel(gadgetId) {
        // Добавлена проверка на случай, если в сохранениях нет такого гаджета
        if (!this.playerData.gadgets[gadgetId + 'Level']) {
            return 0;
        }
        return this.playerData.gadgets[gadgetId + 'Level'];
    }

    getGadgetUpgradeCost(gadgetId) {
        const gadget = GADGETS[gadgetId];
        const level = this.getGadgetLevel(gadgetId);
        return Math.floor(gadget.baseCost * Math.pow(gadget.costFactor, level));
    }

    upgradeGadget(gadgetId) {
        const cost = this.getGadgetUpgradeCost(gadgetId);
        if (this.playerData.coins >= cost) {
            this.removeCoins(cost);
            this.playerData.gadgets[gadgetId + 'Level']++;
            this.save(); // Сохраняем после успешного апгрейда
            return true;
        }
        return false;
    }

    getGeneratorState(generatorId) {
        if (!this.playerData.generators[generatorId]) {
            this.playerData.generators[generatorId] = {
                charges: 4,
                lastChargeTimestamp: Date.now(),
                capacityLevel: 0,
                speedLevel: 0,
                bonusLevel: 0
            };
        }
        return this.playerData.generators[generatorId];
    }

    useGeneratorCharge(generatorId) {
        const state = this.getGeneratorState(generatorId);
        if (state.charges > 0) {
            state.charges--;
            this.save();
            return true;
        }
        return false;
    }

    setGeneratorState(generatorId, state) {
        this.playerData.generators[generatorId] = state;
    }

    getGeneratorUpgradeLevel(generatorId, upgradeType) {
        const state = this.getGeneratorState(generatorId);
        return state[upgradeType + 'Level'];
    }

    getGeneratorUpgradeCost(generatorId, upgradeType) {
        const config = GENERATORS[generatorId].upgrades[upgradeType];
        const level = this.getGeneratorUpgradeLevel(generatorId, upgradeType);
        return Math.floor(config.baseCost * Math.pow(config.factor, level));
    }
    
    getCurrentGeneratorValue(generatorId, upgradeType) {
        const config = GENERATORS[generatorId].upgrades[upgradeType];
        const level = this.getGeneratorUpgradeLevel(generatorId, upgradeType);
        if (upgradeType === 'speed') {
            return config.baseValue - (config.decrement * level);
        } else {
            return config.baseValue + (config.increment * level);
        }
    }

    upgradeGenerator(generatorId, upgradeType) {
        const cost = this.getGeneratorUpgradeCost(generatorId, upgradeType);
        if (this.getCoins() >= cost) {
            this.removeCoins(cost);
            const state = this.getGeneratorState(generatorId);
            state[upgradeType + 'Level']++;
            this.save();
            return true;
        }
        return false;
    }

    getDefaultData() {
        return {
            coins: 0,
            unlockedItems: ['egg', 'tomato'],
            gadgets: {
                knifeLevel: 0,
                spatulaLevel: 0
            },
            generators: {}
        };
    }
}

// Экспортируем один-единственный экземпляр
export const dataManager = new DataManager();