// /src/DataManager.js

import { GADGETS, GENERATORS, INTERSTITIAL_FIRST_SESSION_DELAY, ORDERS_CONFIG } from './GameConfig.js';
import { analyticsManager } from './AnalyticsManager.js';
import OrderSystem from './systems/OrderSystem.js'; // <-- ИМПОРТ

const SAVE_KEY = 'playerData';
const INTERSTITIAL_COOLDOWN = 90000; // 90 секунд в миллисекундах

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
        
        // --- НОВОЕ: Инициализация системы заказов ---
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
                
                // --- ОБРАБОТКА ДЛЯ СОВМЕСТИМОСТИ СТАРЫХ СОХРАНЕНИЙ ---
                if (!this.playerData.savedGrid) this.playerData.savedGrid = null;
                if (!this.playerData.score) this.playerData.score = 0;
                if (!this.playerData.lastInterstitialShowTimestamp) this.playerData.lastInterstitialShowTimestamp = 0;
                
                if (!this.playerData.firstPlayTimestamp) {
                    this.playerData.firstPlayTimestamp = Date.now();
                    this.markDirty(); 
                }

                // --- НОВОЕ: Проверка и создание структуры заказов для старых сохранений ---
                if (!this.playerData.orders) {
                    console.log('Old save detected. Initializing new Order System structure.');
                    this.playerData.orders = this.getDefaultData().orders;
                    this.markDirty();
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
        
        // --- НОВОЕ: Генерация первоначальных заказов, если слоты пусты ---
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

    // --- УПРАВЛЕНИЕ РЕКЛАМОЙ ---
    canShowInterstitial() {
        if (!this.playerData) return false;
        const now = Date.now();
        const firstPlayTimestamp = this.playerData.firstPlayTimestamp || 0;
        if (now - firstPlayTimestamp < INTERSTITIAL_FIRST_SESSION_DELAY) {
            console.log(`[AdManager] Interstitial Ad request skipped due to first session grace period.`);
            return false;
        }
        const lastShown = this.playerData.lastInterstitialShowTimestamp || 0;
        if (now - lastShown < INTERSTITIAL_COOLDOWN) {
            console.log(`[AdManager] Interstitial Ad request skipped due to 90s cooldown.`);
            return false;
        }
        return true;
    }

    recordInterstitialShow() {
        if (!this.playerData) return;
        this.playerData.lastInterstitialShowTimestamp = Date.now();
        this.save(true);
        console.log(`[AdManager] Interstitial timestamp recorded: ${this.playerData.lastInterstitialShowTimestamp}`);
    }

    // --- УПРАВЛЕНИЕ ЗВУКОМ ---
    isMuted() { 
        return this.playerData?.settings?.isMuted ?? false; 
    }
    
    setMuted(isMuted) {
        if (!this.playerData) return;
        if (!this.playerData.settings) this.playerData.settings = {};
        this.playerData.settings.isMuted = isMuted;
        this.save(true);
    }
    
    // --- УПРАВЛЕНИЕ КОЛЛЕКЦИЕЙ ---
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

    isUnlocked(type) { 
        return this.playerData ? this.playerData.unlockedItems.includes(type) : false; 
    }

    // --- УПРАВЛЕНИЕ ВАЛЮТОЙ И ОЧКАМИ ---
    getCoins() { 
        return this.playerData ? this.playerData.coins : 0; 
    }

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

    getScore() { return this.playerData ? this.playerData.score : 0; }

    setScore(score) {
        if (!this.playerData) return;
        this.playerData.score = score;
        this.markDirty();
    }
    
    // --- УПРАВЛЕНИЕ ИГРОВЫМ ПОЛЕМ ---
    getGridState() { return this.playerData ? this.playerData.savedGrid : null; }

    setGridState(gridState) {
        if (!this.playerData) return;
        this.playerData.savedGrid = gridState;
        this.markDirty();
    }

    clearGridState() {
        if (!this.playerData) return;
        this.playerData.savedGrid = null;
        this.playerData.score = 0;
        this.save(true);
    }
    
    // --- НОВЫЕ МЕТОДЫ: УПРАВЛЕНИЕ ЗАКАЗАМИ ---

    /**
     * Возвращает полное состояние системы заказов.
     */
    getOrdersState() {
        return this.playerData?.orders;
    }

    /**
     * Выполняет заказ, начисляет награду и запускает кулдаун.
     * @param {string} orderId - ID заказа для выполнения.
     * @returns {boolean} - true, если заказ успешно выполнен.
     */
    fulfillOrder(orderId) {
        if (!this.playerData) return false;

        const orderIndex = this.playerData.orders.activeOrders.findIndex(o => o.id === orderId);
        const slotIndex = this.playerData.orders.orderSlots.findIndex(s => s.orderId === orderId);

        if (orderIndex === -1 || slotIndex === -1) {
            console.warn(`Order with id ${orderId} not found.`);
            return false;
        }

        const order = this.playerData.orders.activeOrders[orderIndex];
        
        // Начисляем монеты
        this.addCoins(order.coinReward);

        // Убираем заказ из активных
        this.playerData.orders.activeOrders.splice(orderIndex, 1);
        
        // Запускаем кулдаун в слоте
        const cooldown = ORDERS_CONFIG.COOLDOWN_SECONDS[order.difficulty] * 1000;
        this.playerData.orders.orderSlots[slotIndex].cooldownUntil = Date.now() + cooldown;
        this.playerData.orders.orderSlots[slotIndex].orderId = null;
        
        console.log(`Order ${orderId} fulfilled. Reward: ${order.coinReward}. Slot ${slotIndex} is on cooldown.`);

        this.save(true); // Принудительное сохранение
        return true;
    }

    /**
     * Проверяет кулдауны и генерирует новые заказы для свободных слотов.
     * Этот метод нужно будет вызывать периодически из update-цикла UIScene.
     */
    updateOrderCooldowns() {
        if (!this.playerData) return;

        let changed = false;
        const now = Date.now();

        this.playerData.orders.orderSlots.forEach((slot, index) => {
            // Если слот пуст (нет заказа и не на кулдауне)
            if (!slot.orderId && now > slot.cooldownUntil) {
                this._generateAndPlaceNewOrder(index);
                changed = true;
            }
        });
        
        if (changed) {
            this.markDirty();
        }
    }

    /**
     * Внутренний метод для генерации заказов при первой загрузке.
     */
    _generateInitialOrders() {
        if (!this.playerData) return;
        
        this.playerData.orders.orderSlots.forEach((slot, index) => {
            // Генерируем, только если слот абсолютно пуст (нет ID заказа)
            if (!slot.orderId && Date.now() > slot.cooldownUntil) {
                 this._generateAndPlaceNewOrder(index);
            }
        });
    }

    /**
     * Внутренний хелпер для генерации и сохранения одного заказа.
     * @param {number} slotIndex - Индекс слота для заполнения.
     */
    _generateAndPlaceNewOrder(slotIndex) {
        const newOrder = this.orderSystem.generateNewOrder(this.playerData.unlockedItems);
        if (newOrder) {
            this.playerData.orders.activeOrders.push(newOrder);
            this.playerData.orders.orderSlots[slotIndex].orderId = newOrder.id;
            this.playerData.orders.orderSlots[slotIndex].cooldownUntil = 0;
            console.log(`Generated new order ${newOrder.id} for slot ${slotIndex}`);
        }
    }


    // --- УПРАВЛЕНИЕ ГАДЖЕТАМИ ---
    getGadgetLevel(gadgetId) { 
        return this.playerData ? (this.playerData.gadgets[gadgetId + 'Level'] ?? 0) : 0; 
    }

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
    
    // --- УПРАВЛЕНИЕ ГЕНЕРАТОРАМИ ---
    getGeneratorState(generatorId) {
        if (!this.playerData) {
            return { charges: 0, lastChargeTimestamp: Date.now(), capacityLevel: 0, speedLevel: 0, bonusLevel: 0 };
        }
        if (!this.playerData.generators[generatorId]) {
            this.playerData.generators[generatorId] = {
                charges: 4, lastChargeTimestamp: Date.now(),
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
            return config.baseValue - (config.decrement * level);
        } else {
            return config.baseValue + (config.increment * level);
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
        // --- НОВОЕ: Добавляем структуру orders ---
        const initialSlots = [];
        for (let i = 0; i < ORDERS_CONFIG.MAX_ACTIVE_ORDERS; i++) {
            initialSlots.push({ orderId: null, cooldownUntil: 0 });
        }

        return {
            coins: 0,
            score: 0,
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
                activeOrders: [], // Массив объектов заказов
                orderSlots: initialSlots // Состояние слотов (кулдаун и ID заказа)
            }
        };
    }
}

export const dataManager = new DataManager();