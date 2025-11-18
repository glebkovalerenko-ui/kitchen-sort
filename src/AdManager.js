// /src/AdManager.js
import { analyticsManager } from './AnalyticsManager.js';

class AdManager {
    constructor() {
        this.ysdk = null;
        this.isAdOpen = false;
    }

    init(ysdk) {
        this.ysdk = ysdk;
        console.log('Yandex SDK initialized in AdManager!');
    }

    showInterstitial(scene) {
        if (!this.ysdk) {
            console.warn('Yandex SDK is not initialized.');
            return;
        }

        this.isAdOpen = true;
        scene.sound.pauseAll();
        // Приостанавливаем саму сцену, чтобы остановить update-цикл и таймеры
        scene.scene.pause(); 

        this.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onClose: (wasShown) => {
                    console.log('Interstitial Ad closed. Was shown:', wasShown);
                    analyticsManager.trackAdWatched('interstitial_gameover', wasShown ? 'success' : 'closed');
                    scene.sound.resumeAll();
                    scene.scene.resume(); // Возобновляем сцену
                    this.isAdOpen = false;
                },
                onError: (error) => {
                    console.error('Interstitial Ad error:', error);
                    analyticsManager.trackAdWatched('interstitial_gameover', 'error');
                    scene.sound.resumeAll();
                    scene.scene.resume(); // Возобновляем сцену
                    this.isAdOpen = false;
                }
            }
        });
    }

    showRewarded(scene, placement, callbacks) {
        if (!this.ysdk) {
            console.warn('Yandex SDK is not initialized.');
            callbacks.onError?.();
            return;
        }

        this.isAdOpen = true;
        scene.sound.pauseAll();
        scene.scene.pause(); // Приостанавливаем сцену

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
                    scene.scene.resume(); // Возобновляем сцену
                    this.isAdOpen = false;
                    callbacks.onClose?.();
                },
                onError: (error) => {
                    console.error('Rewarded Ad error:', error);
                    analyticsManager.trackAdWatched(placement, 'error');
                    scene.sound.resumeAll();
                    scene.scene.resume(); // Возобновляем сцену
                    this.isAdOpen = false;
                    callbacks.onError?.();
                }
            }
        });
    }
}

export const adManager = new AdManager();