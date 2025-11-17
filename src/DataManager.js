// /src/DataManager.js

import { GADGETS } from './gameConfig.js'; // Импортируем гаджеты
const SAVE_KEY = 'kitchenSortSaveData';

class DataManager {
    constructor() {
        this.playerData = this.load();
    }

    // Метод загрузки данных
    load() {
        const dataString = localStorage.getItem(SAVE_KEY);
        if (dataString) {
            // Если данные есть, превращаем их из строки обратно в объект
            return JSON.parse(dataString);
        } else {
            // Если данных нет (первый запуск), создаем стандартный объект
            return this.getDefaultData();
        }
    }

    // Метод сохранения данных
    save() {
        // Превращаем наш объект с данными в строку и сохраняем в localStorage
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.playerData));
        console.log('Game data saved!', this.playerData);
    }

    // Открывает новый ингредиент
    unlockIngredient(type) {
        if (!this.playerData.unlockedItems.includes(type)) {
            this.playerData.unlockedItems.push(type);
            this.save(); // Сохраняем прогресс сразу после открытия
            return true; // Возвращаем true, если это было новое открытие
        }
        return false; // Возвращаем false, если уже был открыт
    }

    // Проверяет, открыт ли ингредиент
    isUnlocked(type) {
        return this.playerData.unlockedItems.includes(type);
    }

    getCoins() { return this.playerData.coins; }
    addCoins(amount) {
        this.playerData.coins += amount;
        // Не сохраняем здесь, чтобы не делать это каждый раз. Сохраним в конце хода.
    }
    removeCoins(amount) {
        this.playerData.coins -= amount;
        // Убираем save() и отсюда. Будем сохранять в методе upgradeGadget.
    }

    getGadgetLevel(gadgetId) {
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
            this.save();
            return true;
        }
        return false;
    }

    // Структура данных по умолчанию
    getDefaultData() {
        return {
            coins: 0,
            unlockedItems: ['egg', 'tomato'], // Базовые ингредиенты открыты с самого начала
            gadgets: {
                knifeLevel: 0,
                spatulaLevel: 0
            }
        };
    }
}

// Создаем один-единственный экземпляр менеджера, который будет использоваться всей игрой
export const dataManager = new DataManager();