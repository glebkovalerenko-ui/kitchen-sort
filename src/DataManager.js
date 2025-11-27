// /src/DataManager.js

import { GADGETS, GENERATORS, INTERSTITIAL_FIRST_SESSION_DELAY } from './GameConfig.js';
import { analyticsManager } from './AnalyticsManager.js';

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

        // --- КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ ---
        // Флаг, подтверждающий, что мы успешно загрузили данные из облака (или убедились, что их там нет).
        // Если false, сохранение в облако будет ЗАБЛОКИРОВАНО.
        this.isCloudSyncOk = false;
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
        // Сброс разрешен всегда, так как это явное действие игрока (если бы была кнопка в настройках)
        // Но для безопасности ставим флаг true, чтобы новые данные могли записаться.
        this.playerData = this.getDefaultData();
        this.isCloudSyncOk = true; 
        this.save(true);
    }
    
    async load() {
        if (!this.player) {
            console.error('Cannot load: Player object is missing.');
            // Инициализируем дефолтом, чтобы игра не крашнулась, но сохранять не будем.
            this.playerData = this.getDefaultData();
            this.isCloudSyncOk = false;
            return;
        }

        try {
            const data = await this.player.getData([SAVE_KEY]);
            
            // Если мы здесь, значит запрос прошел успешно (даже если данных нет)
            this.isCloudSyncOk = true;

            if (data && data[SAVE_KEY]) {
                this.playerData = data[SAVE_KEY];
                
                // --- ОБРАБОТКА ДЛЯ СОВМЕСТИМОСТИ СТАРЫХ СОХРАНЕНИЙ ---
                if (!this.playerData.savedGrid) this.playerData.savedGrid = null;
                if (!this.playerData.score) this.playerData.score = 0;
                if (!this.playerData.lastInterstitialShowTimestamp) this.playerData.lastInterstitialShowTimestamp = 0;
                
                // Проверка timestamp первого запуска
                if (!this.playerData.firstPlayTimestamp) {
                    this.playerData.firstPlayTimestamp = Date.now();
                    // Не сохраняем немедленно, чтобы лишний раз не дергать сеть, 
                    // данные и так "грязные" если мы их поменяли, сохранимся при следующем действии.
                    this.markDirty(); 
                }
                
                console.log('Player data loaded from cloud:', this.playerData);
            } else {
                console.log('No data in cloud (New Player). Using default data.');
                this.playerData = this.getDefaultData();
                // Для нового игрока сразу сохраняем структуру
                await this.save(true);
            }
        } catch (error) {
            // --- КРИТИЧЕСКАЯ ОБРАБОТКА ОШИБКИ ---
            console.error('CRITICAL: Failed to load player data from cloud:', error);
            
            // Мы НЕ знаем, есть ли у игрока прогресс. 
            // Чтобы он не перезаписался "нулем", блокируем сохранение.
            this.isCloudSyncOk = false;
            
            // Даем игроку "пустышку", чтобы игра запустилась и можно было поиграть в текущую сессию.
            this.playerData = this.getDefaultData();
        }
    }

    markDirty() {
        this.isDataDirty = true;
        
        if (this.saveTimeout) clearTimeout(this.saveTimeout);

        this.saveTimeout = setTimeout(() => {
            this.save(true);
        }, this.SAVE_DELAY);
    }
    
    async save(flush = false) {
        // Если данные не менялись и не требуется принудительная запись - выходим
        if (!this.isDataDirty && flush === false) return;
        
        // Если нет объекта игрока - выходим
        if (!this.player) return;

        // --- КРИТИЧЕСКАЯ ЗАЩИТА ---
        // Если при загрузке была ошибка сети, мы НЕ имеем права сохранять,
        // иначе перезапишем облачное сохранение локальной пустышкой.
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
            // При ошибке сохранения мы не сбрасываем isCloudSyncOk, 
            // так как данные у нас все еще валидные, просто сеть мигнула.
            // Попробуем сохранить в следующий раз.
        }
    }

    // --- УПРАВЛЕНИЕ РЕКЛАМОЙ ---
    canShowInterstitial() {
        // Если данные не загружены, лучше не показывать рекламу, так как мы не знаем тайминги
        if (!this.playerData) return false;

        const now = Date.now();

        // Проверка "медового месяца"
        const firstPlayTimestamp = this.playerData.firstPlayTimestamp || 0;
        if (now - firstPlayTimestamp < INTERSTITIAL_FIRST_SESSION_DELAY) {
            console.log(`[AdManager] Interstitial Ad request skipped due to first session grace period.`);
            return false;
        }

        // Проверка кулдауна
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
            // Возвращаем временный объект, чтобы не крашить UI, если данные не загрузились
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
            }
        };
    }
}

export const dataManager = new DataManager();