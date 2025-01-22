// 전역 상태 관리
let currentAccount = null;
let collectedData = [];
let isUIVisible = true;

// 로깅 시스템
const logger = {
    debug: (message) => console.debug(`[Instagram Analyzer] ${message}`),
    info: (message) => console.log(`[Instagram Analyzer] ${message}`),
    warn: (message) => console.warn(`[Instagram Analyzer] ${message}`),
    error: (message, error) => console.error(`[Instagram Analyzer] ${message}`, error)
};

// Storage 및 UI 매니저 인스턴스 생성
const storageManager = new StorageManager();
const uiManager = new UIManager(storageManager);

// DOM 요소 대기 함수
async function waitForElement(selector, timeout = 5000, parent = document) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const element = parent.querySelector(selector);
        if (element) {
            return element;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Element not found: ${selector}`);
}

// 계정 정보 수집 함수
async function collectAccountInfo() {
    try {
        logger.info('Starting analysis...');
        uiManager.showStatus('계정 정보 수집 중...', 'info');

        const mainSection = await waitForElement('section > main');
        if (!mainSection) {
            throw new Error('메인 섹션을 찾을 수 없습니다.');
        }

        // 통계 데이터 수집
        const stats = await collectStats();
        
        // 사용자 정보 수집
        const userInfo = await collectUserInfo();
        
        // 릴스 데이터 수집
        const reelsData = await collectReelsData();

        // 데이터 통합
        currentAccount = {
            ...stats,
            ...userInfo,
            ...reelsData,
            collectedAt: new Date().toISOString(),
            meetsRequirements: checkRequirements(stats.followersCount, reelsData.avgReelsViews)
        };

        // Storage에 저장
        const saveResult = await storageManager.saveAccount(currentAccount);
        if (saveResult.success) {
            uiManager.showStatus('분석 및 저장 완료!', 'success');
        } else {
            uiManager.showStatus(saveResult.message, 'error');
        }

        // UI 업데이트
        await uiManager.updateUI(currentAccount);
        logger.info('Data collection completed');

    } catch (error) {
        uiManager.showStatus(`오류 발생: ${error.message}`, 'error');
        logger.error('Error in collectAccountInfo:', error);
    }
}

// 통계 데이터 수집
async function collectStats() {
    try {
        const statsList = document.querySelectorAll('header section li');
        if (!statsList || statsList.length < 3) {
            throw new Error('통계 정보를 찾을 수 없습니다. 프로필 페이지인지 확인해주세요.');
        }

        const postsRaw = statsList[0].textContent.match(/[\d,]+/)?.[0] || '0';
        const followersRaw = statsList[1].textContent.match(/[\d,.]+[만천KM]?/)?.[0] || '0';
        const followingRaw = statsList[2].textContent.match(/[\d,]+/)?.[0] || '0';

        return {
            posts: postsRaw,
            followers: followersRaw,
            following: followingRaw,
            followersCount: parseNumber(followersRaw)
        };
    } catch (error) {
        logger.error('통계 데이터 수집 중 오류:', error);
        throw error;
    }
}

// 사용자 정보 수집
async function collectUserInfo() {
    try {
        const username = window.location.pathname.replace('reels/', '').replace('/', '');
        let bio = '';
        let bioLink = '';

        const headerElement = await waitForElement('div > header');
        if (headerElement) {
            const sections = headerElement.querySelectorAll('section');
            const bioElement = sections[3];

            if (bioElement) {
                // 설명글 수집
                const bioSections = Array.from(sections).slice(3);
                bio = bioSections.map(section => 
                    section.textContent.trim().replace(',', '_').replace(/[\n\r]+/g, '_')
                ).join('_').trim();

                // 링크 추출
                const linkIconElements = bioElement.querySelectorAll('div');
                for (const div of linkIconElements) {
                    const svg = div.querySelector('svg[aria-label="링크 아이콘"]');
                    if (svg) {
                        const linkContainer = div.parentElement.querySelector('a[href^="https://l.instagram.com/?u="]');
                        if (linkContainer) {
                            const rawLink = linkContainer.href;
                            const url = new URL(rawLink);
                            bioLink = decodeURIComponent(url.searchParams.get('u')?.split('&')[0] || '');
                        }
                    }
                }
            }
        }

        return { username, bio, bioLink };
    } catch (error) {
        logger.error('사용자 정보 수집 중 오류:', error);
        return {
            username: window.location.pathname.replace('/', ''),
            bio: '',
            bioLink: ''
        };
    }
}

// 릴스 데이터 수집
async function collectReelsData() {
    uiManager.showStatus('릴스 데이터 수집 중...', 'info');

    const reelsTab = await findReelsTab();
    if (reelsTab) {
        reelsTab.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const reelsData = collectReelsViews();
    const avgReelsViews = calculateAverageViews(reelsData.map(data => data.views));

    return {
        avgReelsViews,
        reelsViews: reelsData.map(data => data.views),
        reelsData: reelsData
    };
}

// CSV 저장 및 초기화
async function exportAndClear() {
    try {
        const csv = await storageManager.exportToCSV();
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `instagram_accounts_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Storage 초기화
        await storageManager.clearAll();
        await uiManager.updateUI(currentAccount);
        uiManager.showStatus('데이터 저장 및 초기화 완료!', 'success');
    } catch (error) {
        uiManager.showStatus(error.message, 'error');
    }
}

// 키보드 이벤트 핸들러
function initializeEventListeners() {
    document.addEventListener('keydown', async (e) => {
        const keyHandlers = {
            'q': async () => {
                logger.info('Analysis hotkey detected');
                showKeyPressNotification('⌨️ 계정 분석 시작...');
                await collectAccountInfo();
            },
            'w': async () => {
                logger.info('Export data hotkey detected');
                showKeyPressNotification('⌨️ 데이터 저장 중...');
                await exportAndClear();
            }
        };

        const handler = keyHandlers[e.key.toLowerCase()];
        if (handler) await handler();
    });

    // Storage 변경 감지
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && changes[storageManager.STORAGE_KEY]) {
            await uiManager.updateUI(currentAccount);
        }
    });
}

// 키 입력 알림 표시
function showKeyPressNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        animation: fadeInOut 2s ease-in-out forwards;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            15% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 2000);
}

// 초기화
async function initialize() {
    logger.info('Extension initialized');
    await uiManager.updateUI();
    initializeEventListeners();
}

// 전역 함수 등록
window.removeAccountFromStorage = async (username) => {
    const result = await storageManager.removeAccount(username);
    if (result.success) {
        uiManager.showStatus('계정이 삭제되었습니다.', 'success');
        await uiManager.updateUI(currentAccount);
    } else {
        uiManager.showStatus(result.message, 'error');
    }
};

window.clearStorage = async () => {
    if (confirm('저장된 모든 데이터를 삭제하시겠습니까?')) {
        const result = await storageManager.clearAll();
        if (result.success) {
            uiManager.showStatus('저장된 데이터가 초기화되었습니다.', 'success');
            await uiManager.updateUI(currentAccount);
        } else {
            uiManager.showStatus(result.message, 'error');
        }
    }
};

window.exportAndClear = exportAndClear;

// 확장 프로그램 초기화
initialize();