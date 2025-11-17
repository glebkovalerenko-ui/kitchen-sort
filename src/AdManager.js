// /src/AdManager.js

class AdManager {
    constructor() {
        this.ysdk = null;
        this.isAdOpen = false; // Флаг, чтобы игра не ставилась на паузу дважды
    }

    // Инициализация менеджера
    init(ysdk) {
        this.ysdk = ysdk;
        console.log('Yandex SDK initialized in AdManager!');
    }

    // Показ полноэкранной рекламы
    showInterstitial(scene) {
        if (!this.ysdk) {
            console.warn('Yandex SDK is not initialized.');
            return;
        }

        this.isAdOpen = true;
        scene.sound.pauseAll(); // Ставим все звуки на паузу

        this.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onClose: (wasShown) => {
                    console.log('Interstitial Ad closed. Was shown:', wasShown);
                    scene.sound.resumeAll(); // Возобновляем звуки
                    this.isAdOpen = false;
                },
                onError: (error) => {
                    console.error('Interstitial Ad error:', error);
                    scene.sound.resumeAll();
                    this.isAdOpen = false;
                }
            }
        });
    }

    // Показ рекламы за вознаграждение
    showRewarded(scene, callbacks) {
        if (!this.ysdk) {
            console.warn('Yandex SDK is not initialized.');
            callbacks.onError?.(); // Вызываем колбэк ошибки, если он есть
            return;
        }

        this.isAdOpen = true;
        scene.sound.pauseAll();

        this.ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    console.log('Rewarded Ad opened.');
                },
                onRewarded: () => {
                    console.log('REWARDED!');
                    callbacks.onRewarded?.(); // Вызываем колбэк "Награждено!"
                },
                onClose: () => {
                    console.log('Rewarded Ad closed.');
                    scene.sound.resumeAll();
                    this.isAdOpen = false;
                    callbacks.onClose?.(); // Вызываем колбэк закрытия
                },
                onError: (error) => {
                    console.error('Rewarded Ad error:', error);
                    scene.sound.resumeAll();
                    this.isAdOpen = false;
                    callbacks.onError?.(); // Вызываем колбэк ошибки
                }
            }
        });
    }
}

// Создаем один-единственный экземпляр, как и с DataManager
export const adManager = new AdManager();