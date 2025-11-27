// /src/AdManager.js
import { analyticsManager } from './AnalyticsManager.js';
import { dataManager } from './DataManager.js';

class AdManager {
    constructor() {
        this.ysdk = null;
        // Флаг, чтобы избежать двойного вызова resume, если SDK сглючит и вызовет onError + onClose
        this.isAdProcessing = false;
    }

    init(ysdk) {
        this.ysdk = ysdk;
        if (this.ysdk) {
            console.log('AdManager initialized successfully.');
        } else {
            console.warn('AdManager initialized in Offline/Safe Mode (No SDK).');
        }
    }

    /**
     * Показать межстраничную рекламу (Interstitial)
     * @param {Phaser.Scene} scene - Сцена, которую нужно поставить на паузу
     */
    showInterstitial(scene) {
        // 1. Проверка наличия SDK (AdBlock / Offline)
        if (!this.ysdk) {
            console.log('[AdManager] Skipping Interstitial: No SDK.');
            return;
        }

        // 2. Проверка кулдауна (таймера)
        if (!dataManager.canShowInterstitial()) {
            console.log('[AdManager] Interstitial request skipped due to cooldown or grace period.');
            return;
        }

        // 3. Подготовка игры
        this.isAdProcessing = true;
        const wasMutedBeforeAd = scene.game.sound.mute; // Запоминаем состояние, на всякий случай
        
        // Глобально выключаем звук и ставим игру на паузу
        scene.game.sound.mute = true;
        scene.scene.pause();

        this.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onClose: (wasShown) => {
                    this.handleAdClosed(scene, 'interstitial', wasShown);
                    
                    // Записываем время показа ТОЛЬКО если реклама реально была показана
                    if (wasShown) {
                        dataManager.recordInterstitialShow();
                        analyticsManager.trackAdWatched('interstitial_gameover', 'success');
                    } else {
                        console.log('[AdManager] Interstitial closed but NOT shown (Error or Config).');
                        analyticsManager.trackAdWatched('interstitial_gameover', 'closed_not_shown');
                    }
                },
                onError: (error) => {
                    console.error('[AdManager] Interstitial Error:', error);
                    this.handleAdClosed(scene, 'interstitial', false); // Восстанавливаем игру
                    analyticsManager.trackAdWatched('interstitial_gameover', 'error');
                }
            }
        });
    }

    /**
     * Показать рекламу за вознаграждение (Rewarded)
     * @param {Phaser.Scene} scene - Сцена для паузы
     * @param {string} placement - Идентификатор места (для аналитики)
     * @param {object} callbacks - { onRewarded, onClose, onError }
     */
    showRewarded(scene, placement, callbacks) {
        // 1. Проверка наличия SDK
        if (!this.ysdk) {
            console.warn('[AdManager] Cannot show Rewarded: No SDK.');
            callbacks.onError?.(); // Сразу сообщаем об ошибке, чтобы UI разблокировался
            return;
        }

        this.isAdProcessing = true;
        
        // Глобально выключаем звук и ставим игру на паузу
        scene.game.sound.mute = true;
        scene.scene.pause();

        this.ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    console.log(`[AdManager] Rewarded Ad opened: ${placement}`);
                },
                onRewarded: () => {
                    console.log('[AdManager] REWARDED!');
                    analyticsManager.trackAdWatched(placement, 'success');
                    callbacks.onRewarded?.();
                },
                onClose: () => {
                    console.log('[AdManager] Rewarded Ad closed.');
                    this.handleAdClosed(scene, 'rewarded', true);
                    callbacks.onClose?.();
                },
                onError: (error) => {
                    console.error('[AdManager] Rewarded Ad error:', error);
                    analyticsManager.trackAdWatched(placement, 'error');
                    this.handleAdClosed(scene, 'rewarded', false);
                    callbacks.onError?.();
                }
            }
        });
    }

    /**
     * Внутренний метод для безопасного восстановления игры после рекламы
     */
    handleAdClosed(scene, type, success) {
        if (!this.isAdProcessing) return; // Защита от двойного вызова
        this.isAdProcessing = false;

        console.log(`[AdManager] Restoring game after ${type}.`);

        // 1. Восстанавливаем сцену
        if (scene && scene.scene) {
            scene.scene.resume();
        }

        // 2. Восстанавливаем звук УМНО
        // Если игрок сам выключил звук в настройках (isMuted = true),
        // то мы оставляем mute = true. Иначе включаем.
        const userSettingsMuted = dataManager.isMuted();
        if (scene && scene.game && scene.game.sound) {
            scene.game.sound.mute = userSettingsMuted;
        }
    }
}

export const adManager = new AdManager();