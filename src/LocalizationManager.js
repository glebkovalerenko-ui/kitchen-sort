// /src/LocalizationManager.js

class LocalizationManager {
    constructor() {
        this.strings = {};
        this.lang = 'en'; // Язык по умолчанию
    }

    /**
     * Инициализирует менеджер, определяя язык и получая уже загруженные данные локализации.
     * @param {object} ysdk - Экземпляр Yandex Games SDK.
     * @param {object} localeData - Загруженный JSON-объект с переводами.
     */
    init(ysdk, localeData) {
        if (!ysdk) {
            console.error('LocalizationManager: Yandex SDK instance is required!');
            return;
        }
        if (!localeData) {
            console.error('LocalizationManager: Locale data is required!');
            this.strings = {};
            return;
        }

        // Определяем язык. По умолчанию 'en', если язык не поддерживается.
        const detectedLang = ysdk.environment.i18n.lang;
        this.lang = ['ru', 'en'].includes(detectedLang) ? detectedLang : 'en';
        
        this.strings = localeData;
        console.log(`[Localization] Initialized for language: '${this.lang}'.`);
    }

    /**
     * Получает строку по ключу для текущего языка.
     * @param {string} key - Ключ строки.
     * @param {object} [params={}] - Объект с параметрами для замены (например, {coins: 10}).
     * @returns {string} - Локализованная строка.
     */
    getString(key, params = {}) {
        let str = this.strings[key];

        if (str === undefined) {
            console.warn(`[Localization] Missing string for key: ${key}`);
            return `[${key}]`; // Возвращаем ключ, чтобы было легко найти отсутствующий перевод
        }

        // Заменяем плейсхолдеры вида {placeholder} на значения из params
        for (const paramKey in params) {
            const regex = new RegExp(`{${paramKey}}`, 'g');
            str = str.replace(regex, params[paramKey]);
        }

        return str;
    }
}

export const localizationManager = new LocalizationManager();