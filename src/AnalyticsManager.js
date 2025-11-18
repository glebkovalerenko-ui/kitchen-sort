// /src/AnalyticsManager.js

class AnalyticsManager {
    constructor() {
        this.ysdk = null;
    }

    // Инициализация менеджера
    init(ysdk) {
        this.ysdk = ysdk;
        console.log('Yandex SDK initialized in AnalyticsManager!');
    }

    // Общий метод для отправки событий
    trackEvent(eventName, eventParams = {}) {
        if (!this.ysdk) {
            console.warn(`[Analytics] Yandex SDK not initialized. Event not sent: ${eventName}`, eventParams);
            return;
        }
        
        console.log(`[Analytics] Tracking event: ${eventName}`, eventParams);
        this.ysdk.metrica.reachGoal(eventName, eventParams);
    }

    // --- Методы для ключевых событий из GDD ---

    /**
     * Отслеживает завершение игровой сессии.
     * @param {number} score - Финальный счет.
     * @param {number} sessionDuration - Длительность сессии в секундах.
     * @param {number} coinsEarned - Монет заработано за сессию.
     */
    trackGameEnd(score, sessionDuration, coinsEarned) {
        this.trackEvent('game_end', {
            score: score,
            duration_seconds: sessionDuration,
            coins_earned: coinsEarned
        });
    }

    /**
     * Отслеживает открытие нового предмета.
     * @param {string} entityId - ID открытого предмета (например, 'omelette').
     */
    trackEntityUnlocked(entityId) {
        this.trackEvent('entity_unlocked', {
            entity_id: entityId
        });
    }

    /**
     * Отслеживает улучшение гаджета.
     * @param {string} gadgetId - ID гаджета ('knife' или 'spatula').
     * @param {number} newLevel - Новый уровень гаджета.
     */
    trackGadgetUpgraded(gadgetId, newLevel) {
        this.trackEvent('gadget_upgraded', {
            gadget_id: gadgetId,
            new_level: newLevel
        });
    }

    /**
     * Отслеживает улучшение генератора.
     * @param {string} generatorId - ID генератора ('coop' или 'greenhouse').
     * @param {string} upgradeType - Тип улучшения ('capacity', 'speed', 'bonus').
     * @param {number} newLevel - Новый уровень улучшения.
     */
    trackGeneratorUpgraded(generatorId, upgradeType, newLevel) {
        this.trackEvent('generator_upgraded', {
            generator_id: generatorId,
            upgrade_type: upgradeType,
            new_level: newLevel
        });
    }

    /**
     * Отслеживает просмотр рекламы.
     * @param {string} placement - Место показа ('interstitial', 'rewarded_continue', 'rewarded_double_coins', etc.).
     * @param {string} result - Результат просмотра ('success', 'error', 'closed').
     */
    trackAdWatched(placement, result) {
        this.trackEvent('ad_watched', {
            placement: placement,
            result: result
        });
    }
}

// Создаем единственный экземпляр для всего проекта
export const analyticsManager = new AnalyticsManager();