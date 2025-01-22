import { STORAGE, MESSAGES } from '../utils/constants.js';

class StorageManager {
    constructor() {
        this.MAX_ACCOUNTS = STORAGE.MAX_ACCOUNTS;
        this.STORAGE_KEY = STORAGE.KEY;
    }

    /**
     * 계정 데이터를 Chrome Storage에 저장
     * @param {Object} account - 저장할 계정 데이터
     * @returns {Promise<Object>} 저장 결과
     */
    async saveAccount(account) {
        try {
            const accounts = await this.getAccounts();
            
            // 중복 체크
            const isDuplicate = accounts.some(a => a.username === account.username);
            if (isDuplicate) {
                throw new Error(MESSAGES.ERRORS.DUPLICATE_ACCOUNT);
            }

            // 최대 개수 체크
            if (accounts.length >= this.MAX_ACCOUNTS) {
                throw new Error(MESSAGES.ERRORS.STORAGE_FULL);
            }

            // 새 계정 추가
            accounts.push({
                ...account,
                savedAt: new Date().toISOString()
            });

            // Chrome Storage에 저장
            await chrome.storage.local.set({
                [this.STORAGE_KEY]: accounts
            });

            return { 
                success: true, 
                message: MESSAGES.SUCCESS.SAVED 
            };
        } catch (error) {
            console.error('Storage save error:', error);
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    /**
     * 저장된 모든 계정 데이터 조회
     * @returns {Promise<Array>} 저장된 계정 목록
     */
    async getAccounts() {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEY);
            return result[this.STORAGE_KEY] || [];
        } catch (error) {
            console.error('Storage get error:', error);
            return [];
        }
    }

    /**
     * 저장된 계정 수 조회
     * @returns {Promise<number>} 저장된 계정 수
     */
    async getCount() {
        const accounts = await this.getAccounts();
        return accounts.length;
    }

    /**
     * 모든 저장 데이터 초기화
     * @returns {Promise<Object>} 초기화 결과
     */
    async clearAll() {
        try {
            await chrome.storage.local.remove(this.STORAGE_KEY);
            return { 
                success: true, 
                message: MESSAGES.SUCCESS.CLEARED 
            };
        } catch (error) {
            console.error('Storage clear error:', error);
            return { 
                success: false, 
                message: error.message 
            };
        }
    }

    /**
     * 특정 계정 삭제
     * @param {string} username - 삭제할 계정명
     * @returns {Promise<Object>} 삭제 결과
     */
    async removeAccount(username) {
        try {
            const accounts = await this.getAccounts();
            const filtered = accounts.filter(a => a.username !== username);
            await chrome.storage.local.set({
                [this.STORAGE_KEY]: filtered
            });
            return { 
                success: true, 
                message: MESSAGES.SUCCESS.DELETED 
            };
        } catch (error) {
            console.error('Account remove error:', error);
            return { 
                success: false, 
                message: error.message 
            };
        }
    }
}

export default new StorageManager();