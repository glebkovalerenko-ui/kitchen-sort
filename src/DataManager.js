// /src/DataManager.js

import { GADGETS, GENERATORS, INTERSTITIAL_FIRST_SESSION_DELAY, ORDERS_CONFIG, ITEM_TIERS, TILE_TYPES, RECIPES } from './GameConfig.js';
import { analyticsManager } from './AnalyticsManager.js';
import OrderSystem from './systems/OrderSystem.js';

const SAVE_KEY = 'playerData';
const INTERSTITIAL_COOLDOWN = 180000; // 3 минуты

class DataManager {
    constructor() {
        this.player = null;
        this.playerData = null;
        
        this.saveTimeout = null;
        this.isDataDirty = false;
        this.SAVE_DELAY = 2000;

        this.sessionStartCoins = 0;
        this.coinsEarnedThisSession = 0;

        this.isCloudSyncOk = false;
        
        this.orderSystem = new OrderSystem();
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
        this.isCloudSyncOk = true; 
        this.save(true);
    }
    
    async load() {
        if (!this.player) {
            console.error('Cannot load: Player object is missing.');
            this.playerData = this.getDefaultData();
            this.isCloudSyncOk = false;
            return;
        }

        try {
            const data = await this.player.getData([SAVE_KEY]);
            
            this.isCloudSyncOk = true;

            if (data && data[SAVE_KEY]) {
                this.playerData = data[SAVE_KEY];
                
                if (this.playerData.score && !this.playerData.totalScore) {
                    this.playerData.totalScore = this.playerData.score;
                    this.playerData.weeklyScore = this.playerData.score;
                    delete this.playerData.score;
                }
                
                const defaultData = this.getDefaultData();
                for (const key in defaultData) {
                    if (this.playerData[key] === undefined) {
                        this.playerData[key] = defaultData[key];
                    }
                }
                
                console.log('Player data loaded from cloud:', this.playerData);
            } else {
                console.log('No data in cloud (New Player). Using default data.');
                this.playerData = this.getDefaultData();
                await this.save(true);
            }
        } catch (error) {
            console.error('CRITICAL: Failed to load player data from cloud:', error);
            this.isCloudSyncOk = false;
            this.playerData = this.getDefaultData();
        }
        
        this._checkWeeklyReset();
        this._generateInitialOrders();
    }

    markDirty() {
        this.isDataDirty = true;
        
        if (this.saveTimeout) clearTimeout(this.saveTimeout);

        this.saveTimeout = setTimeout(() => {
            this.save(true);
        }, this.SAVE_DELAY);
    }
    
    async save(flush = false) {
        if (!this.isDataDirty && flush === false) return;
        if (!this.player) return;

        if (!this.isCloudSyncOk) {
            console.warn('SAVE BLOCKED: Cloud sync was not established successfully during load.');
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

    _checkWeeklyReset() {
        const now = new Date();
        const lastReset = new Date(this.playerData.lastWeeklyResetTimestamp);
        
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        currentWeekStart.setHours(0, 0, 0, 0);

        if (lastReset < currentWeekStart) {
            console.log("New week detected! Resetting weekly score.");
            this.playerData.weeklyScore = 0;
            this.playerData.lastWeeklyResetTimestamp = currentWeekStart.getTime();
            this.save(true);
        }
    }

    canShowInterstitial() {
        if (!this.playerData) return false;
        const now = Date.now();
        const firstPlayTimestamp = this.playerData.firstPlayTimestamp || 0;
        if (now - firstPlayTimestamp < INTERSTITIAL_FIRST_SESSION_DELAY) {
            return false;
        }
        const lastShown = this.playerData.lastInterstitialShowTimestamp || 0;
        return (now - lastShown >= INTERSTITIAL_COOLDOWN);
    }

    recordInterstitialShow() {
        if (!this.playerData) return;
        this.playerData.lastInterstitialShowTimestamp = Date.now();
        this.save(true);
    }

    isMuted() { return this.playerData?.settings?.isMuted ?? false; }
    
    setMuted(isMuted) {
        if (!this.playerData) return;
        if (!this.playerData.settings) this.playerData.settings = {};
        this.playerData.settings.isMuted = isMuted;
        this.save(true);
    }
    
    unlockIngredient(type) {
        if (!this.playerData) return false;
        if (!this.playerData.unlockedItems.includes(type)) {
            this.playerData.unlockedItems.push(type);
            analyticsManager.trackEntityUnlocked(type);
            this.markDirty();
            return true;
        }
        return false;
    }

    isUnlocked(type) { return this.playerData ? this.playerData.unlockedItems.includes(type) : false; }

    getUnlockedRecipesCount() { return this.playerData.unlockedItems.length; }

    getCoins() { return this.playerData ? this.playerData.coins : 0; }

    addCoins(amount) {
        if (!this.playerData) return;
        this.playerData.coins += amount;
        this.coinsEarnedThisSession += amount;
        this.markDirty();
    }

    removeCoins(amount) {
        if (!this.playerData) return false;
        if (this.playerData.coins >= amount) {
            this.playerData.coins -= amount;
            this.markDirty();
            return true;
        }
        return false;
    }

    getCoinsEarnedThisSession() { return this.coinsEarnedThisSession; }
    
    getTotalScore() { return this.playerData ? this.playerData.totalScore : 0; }
    getWeeklyScore() { return this.playerData ? this.playerData.weeklyScore : 0; }

    addScore(amount) {
        if (!this.playerData) return;
        this.playerData.totalScore += amount;
        this.playerData.weeklyScore += amount;
        this.markDirty();
    }
    
    getGridState() { return this.playerData ? this.playerData.savedGrid : null; }

    setGridState(gridState) {
        if (!this.playerData) return;
        this.playerData.savedGrid = gridState;
        this.markDirty();
    }

    clearGridState() {
        if (!this.playerData) return;
        this.playerData.savedGrid = null;
        this.save(true);
    }
    
    getOrdersState() { return this.playerData?.orders; }

    fulfillOrder(orderId) {
        if (!this.playerData) return false;

        const orderIndex = this.playerData.orders.activeOrders.findIndex(o => o.id === orderId);
        const slotIndex = this.playerData.orders.orderSlots.findIndex(s => s.orderId === orderId);

        if (orderIndex === -1 || slotIndex === -1) {
            return false;
        }

        const order = this.playerData.orders.activeOrders[orderIndex];
        this.addCoins(order.coinReward);
        this.playerData.orders.activeOrders.splice(orderIndex, 1);
        
        let cooldown = 0;
        const unlockedCount = this.getUnlockedRecipesCount();

        if (unlockedCount < 15) {
            const baseCooldown = 10000;
            const step = Math.floor(this.playerData.completedOrdersCount / 10);
            cooldown = baseCooldown + (step * 5000);
        } 
        else {
            const tier = ITEM_TIERS[order.itemType] || 2;
            if (tier <= 3) cooldown = 45000;
            else if (tier <= 5) cooldown = 180000;
            else cooldown = 600000;
        }

        this.playerData.orders.orderSlots[slotIndex].cooldownUntil = Date.now() + cooldown;
        this.playerData.orders.orderSlots[slotIndex].orderId = null;
        this.playerData.completedOrdersCount++;
        
        this.save(true);
        return true;
    }

    updateOrderCooldowns() {
        if (!this.playerData) return;
        let changed = false;
        const now = Date.now();
        this.playerData.orders.orderSlots.forEach((slot, index) => {
            if (!slot.orderId && now > slot.cooldownUntil) {
                this._generateAndPlaceNewOrder(index);
                changed = true;
            }
        });
        if (changed) this.markDirty();
    }

    _generateInitialOrders() {
        if (!this.playerData) return;
        this.playerData.orders.orderSlots.forEach((slot, index) => {
            if (!slot.orderId && Date.now() > slot.cooldownUntil) {
                 this._generateAndPlaceNewOrder(index);
            }
        });
    }
    
    _generateAndPlaceNewOrder(slotIndex) {
        const tutorialOrderSequence = [
            TILE_TYPES.FRIED_EGG,
            TILE_TYPES.DICED_TOMATOES,
            TILE_TYPES.OMELLETE
        ];
        
        let newOrder = null;
        const completedCount = this.playerData.completedOrdersCount;

        // --- ИСПРАВЛЕНИЕ: Новая, более надежная логика для обучающих заказов ---
        if (completedCount < tutorialOrderSequence.length) {
            const nextTutorialItem = tutorialOrderSequence[completedCount];
            const isAlreadyActive = this.playerData.orders.activeOrders.some(o => o.itemType === nextTutorialItem);

            // Генерируем следующий обучающий заказ, только если его еще нет на доске
            if (!isAlreadyActive) {
                const recipe = RECIPES.find(r => r.output === nextTutorialItem);
                newOrder = {
                    id: `order_tutorial_${Date.now()}_${Math.random()}`,
                    itemType: nextTutorialItem,
                    coinReward: recipe ? recipe.coins * 3 : 15,
                    difficulty: 'EASY'
                };
            }
        } 
        // Если обучение пройдено, переходим к обычной генерации
        else {
            newOrder = this.orderSystem.generateNewOrder(this.playerData.unlockedItems);
        }

        if (newOrder) {
            this.playerData.orders.activeOrders.push(newOrder);
            this.playerData.orders.orderSlots[slotIndex].orderId = newOrder.id;
            this.playerData.orders.orderSlots[slotIndex].cooldownUntil = 0;
        }
    }

    getGadgetLevel(gadgetId) { return this.playerData ? (this.playerData.gadgets[gadgetId + 'Level'] ?? 0) : 0; }

    getGadgetUpgradeCost(gadgetId) {
        const gadget = GADGETS[gadgetId];
        const level = this.getGadgetLevel(gadgetId);
        return Math.floor(gadget.baseCost * Math.pow(gadget.costFactor, level));
    }

    upgradeGadget(gadgetId) {
        if (!this.playerData) return false;
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
    
    getGeneratorState(generatorId) {
        if (!this.playerData) {
            return { charges: 0, lastChargeTimestamp: Date.now(), capacityLevel: 0, speedLevel: 0, bonusLevel: 0 };
        }
        if (!this.playerData.generators[generatorId]) {
            this.playerData.generators[generatorId] = {
                charges: 15, lastChargeTimestamp: Date.now(),
                capacityLevel: 0, speedLevel: 0, bonusLevel: 0
            };
            this.markDirty();
        }
        return this.playerData.generators[generatorId];
    }

    setGeneratorState(generatorId, state) {
        if (!this.playerData) return;
        this.playerData.generators[generatorId] = state;
        this.markDirty();
    }

    getGeneratorUpgradeLevel(generatorId, upgradeType) {
        return this.getGeneratorState(generatorId)[upgradeType + 'Level'];
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
            return config.baseValue * Math.pow(0.95, level);
        } else {
            return config.baseValue + (config.increment * level);
        }
    }

    getGeneratorCooldown(generatorId) {
        const unlockedCount = this.getUnlockedRecipesCount();

        if (unlockedCount < 15) {
            const restarts = this.playerData.generatorRestarts[generatorId] || 0;
            if (restarts < 5) return 15; 
            
            const baseCooldown = 15;
            const step = Math.floor((restarts - 5) / 5);
            return baseCooldown + (step * 15);
        }
        else {
            return this.getCurrentGeneratorValue(generatorId, 'speed');
        }
    }
    
    recordGeneratorRestart(generatorId) {
        if (this.playerData.generatorRestarts[generatorId] !== undefined) {
            this.playerData.generatorRestarts[generatorId]++;
            this.markDirty();
        }
    }

    upgradeGenerator(generatorId, upgradeType) {
        if (!this.playerData) return false;
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
            unlockedItems: ['egg', 'tomato'],
            savedGrid: null,
            lastInterstitialShowTimestamp: 0,
            firstPlayTimestamp: Date.now(),
            gadgets: {
                knifeLevel: 0,
                spatulaLevel: 0
            },
            generators: {},
            settings: {
                isMuted: false
            },
            orders: {
                activeOrders: [],
                orderSlots: Array(ORDERS_CONFIG.MAX_ACTIVE_ORDERS).fill(0).map(() => ({ orderId: null, cooldownUntil: 0 }))
            },
            totalScore: 0,
            weeklyScore: 0,
            lastWeeklyResetTimestamp: 0,
            completedOrdersCount: 0,
            generatorRestarts: {
                coop: 0,
                greenhouse: 0
            }
        };
    }
}

export const dataManager = new DataManager();