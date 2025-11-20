// /public/YandexSDKMock.js
// Это "заглушка" для Yandex Games SDK, чтобы игра работала локально.

console.warn('YANDEX SDK MOCK IS RUNNING!');

// --- Имитация сохранения данных (Player) ---
const localStorageMock = {
    playerData: {},

    init: function() {
        const data = localStorage.getItem('kitchenSortSaveData_mock');
        this.playerData = data ? JSON.parse(data) : {};
        return Promise.resolve(this);
    },

    getData: function(keys) {
        console.log('[MOCK SDK] Player.getData called with keys:', keys);
        const result = {};
        keys.forEach(key => {
            if (this.playerData[key]) {
                result[key] = this.playerData[key];
            }
        });
        return Promise.resolve(result);
    },

    setData: function(data, flush) {
        console.log('[MOCK SDK] Player.setData called with data:', data, 'Flush:', flush);
        Object.keys(data).forEach(key => {
            this.playerData[key] = data[key];
        });
        localStorage.setItem('kitchenSortSaveData_mock', JSON.stringify(this.playerData));
        return Promise.resolve();
    }
};

// --- Имитация рекламы (Adv) ---
const advMock = {
    showFullscreenAdv: function(callbacks) {
        console.log('[MOCK SDK] Adv.showFullscreenAdv called.');
        setTimeout(() => {
            console.log('[MOCK SDK] Interstitial Ad "closed".');
            callbacks.callbacks.onClose(true);
        }, 500);
    },

    showRewardedVideo: function(callbacks) {
        console.log('[MOCK SDK] Adv.showRewardedVideo called.');
        setTimeout(() => {
            console.log('[MOCK SDK] Rewarded Ad "watched" and "closed".');
            callbacks.callbacks.onRewarded();
            callbacks.callbacks.onClose();
        }, 1000);
    }
};

// --- Имитация аналитики (Metrica) ---
const metricaMock = {
    reachGoal: function(eventName, eventParams) {
        console.log(`[MOCK SDK] Metrica.reachGoal called. Event: ${eventName}`, eventParams || '');
    }
};

// --- УЛУЧШЕННАЯ ИМИТАЦИЯ ЛИДЕРБОРДОВ ---
const leaderboardMock = {
    setLeaderboardScore: function(leaderboardName, score) {
        console.log(`[MOCK SDK] Leaderboard.setLeaderboardScore called. Board: '${leaderboardName}', Score: ${score}`);
        return Promise.resolve();
    },
    getLeaderboardPlayerEntry: function(leaderboardName) {
        console.log(`[MOCK SDK] Leaderboard.getLeaderboardPlayerEntry called for '${leaderboardName}'.`);
        return Promise.resolve({
            getScore: () => 12345,
            getRank: () => 10
        });
    },
    openLeaderboard: function(leaderboardName) {
        console.log(`[MOCK SDK] Leaderboard.openLeaderboard called for board: '${leaderboardName}'.`);
        alert(`[MOCK] Открыта таблица лидеров: '${leaderboardName}'`);
        return Promise.resolve();
    }
};

// --- Создаем глобальный объект YaGames ---
window.YaGames = {
    init: () => {
        console.log('[MOCK SDK] YaGames.init called.');
        return Promise.resolve({
            adv: advMock,
            metrica: metricaMock,
            features: { 
                Leaderboards: { isFeatureAvailable: true },
                LoadingAPI: { ready: () => console.log('[MOCK SDK] LoadingAPI.ready() called.') }
            },
            // <-- ВОТ ИСПРАВЛЕНИЕ: ДОБАВЛЕН НЕДОСТАЮЩИЙ ОБЪЕКТ -->
            environment: {
                i18n: {
                    lang: 'ru' // Имитируем русский язык по умолчанию для локального теста
                },
                payload: null // Добавляем на всякий случай, чтобы избежать других ошибок
            },
            // <-- КОНЕЦ ИСПРАВЛЕНИЯ -->
            getPlayer: () => {
                console.log('[MOCK SDK] ysdk.getPlayer called.');
                return localStorageMock.init();
            },
            getLeaderboards: () => {
                console.log('[MOCK SDK] ysdk.getLeaderboards called.');
                return Promise.resolve(leaderboardMock);
            }
        });
    }
};