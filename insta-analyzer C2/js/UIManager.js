import { UI, MESSAGES } from '../utils/constants.js';
import storageManager from '../storage/StorageManager.js';

class UIManager {
    constructor() {
        this.container = null;
        this.isExpanded = true;
        this.theme = window.UI.THEMES.DARK;
    }

    /**
     * 저장 상태 표시 HTML 생성
     * @returns {Promise<string>} 상태 표시 HTML
     */
    async createStorageStatus() {
        const count = await storageManager.getCount();
        return `
            <div style="
                background: ${this.theme.SURFACE};
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span style="color: ${this.theme.TEXT_SECONDARY};">임시 저장 현황:</span>
                <span style="
                    color: ${count >= 30 ? UI.COLORS.ERROR : UI.COLORS.SUCCESS};
                    font-weight: bold;
                ">${count}/30</span>
            </div>
        `;
    }

    /**
     * 계정 목록 HTML 생성
     * @returns {Promise<string>} 계정 목록 HTML
     */
    async createAccountsList() {
        const accounts = await storageManager.getAccounts();
        
        if (accounts.length === 0) {
            return `
                <div style="
                    text-align: center;
                    color: ${this.theme.TEXT_SECONDARY};
                    padding: 20px;
                    background: ${this.theme.SURFACE};
                    border-radius: 8px;
                ">
                    저장된 계정이 없습니다
                </div>
            `;
        }

        return `
            <div style="
                max-height: 300px;
                overflow-y: auto;
                background: ${this.theme.SURFACE};
                border-radius: 8px;
                padding: 10px;
            ">
                ${accounts.map((account, index) => `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 10px;
                        border-bottom: 1px solid ${this.theme.BORDER};
                        ${index === accounts.length - 1 ? 'border-bottom: none;' : ''}
                    ">
                        <div style="flex: 1;">
                            <div style="color: ${this.theme.TEXT}; margin-bottom: 4px;">
                                ${account.username}
                            </div>
                            <div style="color: ${this.theme.TEXT_SECONDARY}; font-size: 12px;">
                                팔로워: ${account.followers} · 
                                평균 조회수: ${Math.round(account.avgReelsViews).toLocaleString()}
                            </div>
                        </div>
                        <button
                            onclick="removeAccountFromStorage('${account.username}')"
                            style="
                                background: none;
                                border: none;
                                color: ${UI.COLORS.ERROR};
                                cursor: pointer;
                                padding: 5px;
                                font-size: 18px;
                            "
                        >×</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * 액션 버튼 HTML 생성
     * @returns {string} 액션 버튼 HTML
     */
    createActionButtons() {
        return `
            <div style="
                display: flex;
                gap: 10px;
                margin-top: 10px;
            ">
                <button
                    onclick="exportAndClear()"
                    style="
                        flex: 1;
                        padding: 10px;
                        background: ${UI.COLORS.INFO};
                        color: ${this.theme.TEXT};
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    "
                >CSV 저장 (W)</button>
                <button
                    onclick="clearStorage()"
                    style="
                        padding: 10px;
                        background: ${UI.COLORS.ERROR};
                        color: ${this.theme.TEXT};
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    "
                >초기화</button>
            </div>
        `;
    }

    /**
     * 전체 UI 업데이트
     */
    async updateUI() {
        const container = document.getElementById(UI.CONTAINER_ID);
        if (!container) return;

        const mainContent = container.querySelector('.main-content');
        if (!mainContent) return;

        const storageStatus = await this.createStorageStatus();
        const accountsList = await this.createAccountsList();
        const actionButtons = this.createActionButtons();

        mainContent.innerHTML = `
            ${storageStatus}
            ${accountsList}
            ${actionButtons}
        `;
    }

    /**
     * 상태 메시지 표시
     * @param {string} message - 표시할 메시지
     * @param {string} type - 메시지 타입 (success/error/info)
     */
    showMessage(message, type = 'info') {
        const container = document.getElementById(UI.STATUS_ID);
        if (!container) return;

        container.style.display = 'block';
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: ${UI.COLORS[type.toUpperCase()]}">●</span>
                <span>${message}</span>
            </div>
        `;

        if (type !== 'info') {
            setTimeout(() => {
                container.style.display = 'none';
            }, 3000);
        }
    }
}

window.uiManager = new UIManager();