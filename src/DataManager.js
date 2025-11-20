// /src/DataManager.js

import { GADGETS, GENERATORS } from './GameConfig.js';
import { analyticsManager } from './AnalyticsManager.js';

const SAVE_KEY = 'playerData';

class DataManager {
    constructor() {
        this.player = null;
        this.playerData = null;
        
        this.saveTimeout = null;
        this.isDataDirty = false;
        this.SAVE_DELAY = 2000;

        this.sessionStartCoins = 0;
        this.coinsEarnedThisSession = 0;
    }
    
    startSessionTracking() {
        this.sessionStartCoins = this.getCoins();
        this.coinsEarnedThisSession = 0;
    }

    async init(player) {
        this.player = player;
        console.log('DataManager initialized with Yandex Player object.');
        return this.load();
    }

    reset() {
        console.log("Resetting player data to default.");
        this.playerData = this.getDefaultData();
        this.save(true);
    }
    
    async load() {
        try {
            const data = await this.player.getData([SAVE_KEY]);
            if (data && data[SAVE_KEY]) {
                this.playerData = data[SAVE_KEY];
                // --- ДОБАВЛЕНА ОБРАБОТКА ДЛЯ СОВМЕСТИМОСТИ СТАРЫХ СОХРАНЕНИЙ ---
                if (this.playerData.savedGrid === undefined) {
                    this.playerData.savedGrid = null;
                }
                if (this.playerData.score === undefined) {
                    this.playerData.score = 0;
                }
                console.log('Player data loaded from cloud:', this.playerData);
            } else {
                console.log('No data in cloud. Using default data.');
                this.playerData = this.getDefaultData();
                await this.save(true);
            }
        } catch (error) {
            console.error('Failed to load player data from cloud:', error);
            this.playerData = this.getDefaultData();
        }
    }

    markDirty() {
        this.isDataDirty = true;
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.save(true);
        }, this.SAVE_DELAY);
    }
    
    async save(flush = false) {
        if (!this.isDataDirty && flush === false) {
            return;
        }
        if (!this.player) {
            console.error('Cannot save data: Player object is not initialized.');
            return;
        }

        try {
            await this.player.setData({ [SAVE_KEY]: this.playerData }, flush);
            console.log(`Game data saved to cloud! (Flush: ${flush})`, this.playerData);
            this.isDataDirty = false;
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
        } catch (error) {
            console.error('Failed to save player data to cloud:', error);
        }
    }

    // --- УПРАВЛЕНИЕ ЗВУКОМ ---
    isMuted() {
        return this.playerData.settings?.isMuted ?? false;
    }

    setMuted(isMuted) {
        if (!this.playerData.settings) {
            this.playerData.settings = {};
        }
        this.playerData.settings.isMuted = isMuted;
        this.save(true);
    }
    
    // --- УПРАВЛЕНИЕ КОЛЛЕКЦИЕЙ ---
    unlockIngredient(type) {
        if (!this.playerData.unlockedItems.includes(type)) {
            this.playerData.unlockedItems.push(type);
            analyticsManager.trackEntityUnlocked(type);
            this.markDirty();
            return true;
        }
        return false;
    }
    
    isUnlocked(type) {
        return this.playerData.unlockedItems.includes(type);
    }

    // --- УПРАВЛЕНИЕ ВАЛЮТОЙ И ОЧКАМИ ---
    getCoins() { return this.playerData.coins; }
    
    addCoins(amount) {
        this.playerData.coins += amount;
        this.coinsEarnedThisSession += amount;
        this.markDirty();
    }

    removeCoins(amount) {
        if (this.playerData.coins >= amount) {
            this.playerData.coins -= amount;
            this.markDirty();
            return true;
        }
        return false;
    }
    
    getCoinsEarnedThisSession() {
        return this.coinsEarnedThisSession;
    }

    getScore() { return this.playerData.score; }
    setScore(score) {
        this.playerData.score = score;
        this.markDirty();
    }
    
    // --- УПРАВЛЕНИЕ ИГРОВЫМ ПОЛЕМ ---
    getGridState() { return this.playerData.savedGrid; }
    setGridState(gridState) {
        this.playerData.savedGrid = gridState;
        this.markDirty();
    }
    clearGridState() {
        this.playerData.savedGrid = null;
        this.playerData.score = 0;
        this.save(true); // Немедленно сохраняем, чтобы при обновлении не загрузилась старая игра
    }

    // --- УПРАВЛЕНИЕ ГАДЖЕТАМИ ---
    getGadgetLevel(gadgetId) {
        return this.playerData.gadgets[gadgetId + 'Level'] ?? 0;
    }

    getGadgetUpgradeCost(gadgetId) {
        const gadget = GADGETS[gadgetId];
        const level = this.getGadgetLevel(gadgetId);
        return Math.floor(gadget.baseCost * Math.pow(gadget.costFactor, level));
    }

    upgradeGadget(gadgetId) {
        const cost = this.getGadgetUpgradeCost(gadgetId);
        if (this.removeCoins(cost)) {
            const newLevel = this.getGadgetLevel(gadgetId) + 1;
            this.playerData.gadgets[gadgetId + 'Level'] = newLevel;
            analyticsManager.trackGadgetUpgraded(gadgetId, newLevel);
            this.save(true);
            return true;
        }
        return false;
    }
    
    // --- УПРАВЛЕНИЕ ГЕНЕРАТОРАМИ ---
    getGeneratorState(generatorId) {
        if (!this.playerData.generators[generatorId]) {
            this.playerData.generators[generatorId] = {
                charges: 4,
                lastChargeTimestamp: Date.now(),
                capacityLevel: 0,
                speedLevel: 0,
                bonusLevel: 0
            };
            this.markDirty();
        }
        return this.playerData.generators[generatorId];
    }
    
    setGeneratorState(generatorId, state) {
        this.playerData.generators[generatorId] = state;
        this.markDirty();
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
        if (this.removeCoins(cost)) {
            const state = this.getGeneratorState(generatorId);
            const newLevel = state[upgradeType + 'Level'] + 1;
            state[upgradeType + 'Level'] = newLevel;
            analyticsManager.trackGeneratorUpgraded(generatorId, upgradeType, newLevel);
            this.save(true);
            return true;
        }
        return false;
    }

    getDefaultData() {
        return {
            coins: 0,
            score: 0, // <-- ДОБАВЛЕНО
            unlockedItems: ['egg', 'tomato'],
            savedGrid: null, // <-- ДОБАВЛЕНО
            gadgets: {
                knifeLevel: 0,
                spatulaLevel: 0
            },
            generators: {},
            settings: {
                isMuted: false
            }
        };
    }
}

export const dataManager = new DataManager();