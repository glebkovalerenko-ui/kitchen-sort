// /src/DataManager.js

import { GADGETS } from './gameConfig.js';

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

    // Структура данных по умолчанию
    getDefaultData() {
        return {
            coins: 0,
            unlockedItems: ['egg', 'tomato'],
            gadgets: {
                knifeLevel: 0,
                spatulaLevel: 0
            }
        };
    }
}

// Экспортируем один-единственный экземпляр
export const dataManager = new DataManager();