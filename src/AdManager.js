// /src/AdManager.js
import { analyticsManager } from './AnalyticsManager.js';

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
        scene.sound.pauseAll();

        this.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onClose: (wasShown) => {
                    console.log('Interstitial Ad closed. Was shown:', wasShown);
                    analyticsManager.trackAdWatched('interstitial_gameover', wasShown ? 'success' : 'closed');
                    scene.sound.resumeAll();
                    this.isAdOpen = false;
                },
                onError: (error) => {
                    console.error('Interstitial Ad error:', error);
                    analyticsManager.trackAdWatched('interstitial_gameover', 'error');
                    scene.sound.resumeAll();
                    this.isAdOpen = false;
                }
            }
        });
    }

    // Показ рекламы за вознаграждение
    showRewarded(scene, placement, callbacks) {
        if (!this.ysdk) {
            console.warn('Yandex SDK is not initialized.');
            callbacks.onError?.();
            return;
        }

        this.isAdOpen = true;
        scene.sound.pauseAll();

        this.ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    console.log(`Rewarded Ad opened for placement: ${placement}`);
                },
                onRewarded: () => {
                    console.log('REWARDED!');
                    analyticsManager.trackAdWatched(placement, 'success');
                    callbacks.onRewarded?.();
                },
                onClose: () => {
                    console.log('Rewarded Ad closed.');
                    scene.sound.resumeAll();
                    this.isAdOpen = false;
                    callbacks.onClose?.();
                },
                onError: (error) => {
                    console.error('Rewarded Ad error:', error);
                    analyticsManager.trackAdWatched(placement, 'error');
                    scene.sound.resumeAll();
                    this.isAdOpen = false;
                    callbacks.onError?.();
                }
            }
        });
    }
}

// Создаем один-единственный экземпляр, как и с DataManager
export const adManager = new AdManager();