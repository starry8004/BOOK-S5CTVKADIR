// content.js
let currentAccount = null;
let collectedData = [];
let isUIVisible = true;

// 향상된 로깅 시스템
const logger = {
    debug: (message) => console.debug(`[Instagram Analyzer] ${message}`),
    info: (message) => console.log(`[Instagram Analyzer] ${message}`),
    error: (message, error) => console.error(`[Instagram Analyzer] ${message}`, error)
};

// 숫자 변환 함수 개선
function parseNumber(text) {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    
    const units = {
        '만': 10000,
        '천': 1000,
        'K': 1000,
        'M': 1000000
    };

    for (const [unit, multiplier] of Object.entries(units)) {
        if (text.includes(unit)) {
            return parseFloat(text.replace(unit, '')) * multiplier;
        }
    }
    
    return parseFloat(text) || 0;
}

// 상태 관리 클래스
class StatusManager {
    constructor() {
        this.container = null;
        this.timeoutId = null;
    }

    getContainer() {
        if (!this.container) {
            this.container = document.getElementById('analysis-status');
        }
        return this.container;
    }

    update(message, type = 'info') {
        const container = this.getContainer();
        if (!container) return;

        const colors = {
            success: '#4caf50',
            error: '#f44336',
            info: '#2196f3'
        };

        container.style.display = 'block';
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: ${colors[type]}">●</span>
                <span>${message}</span>
            </div>
        `;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        if (type !== 'info') {
            this.timeoutId = setTimeout(() => {
                container.style.display = 'none';
            }, 3000);
        }
    }
}

const statusManager = new StatusManager();

// DOM 요소 대기 함수 개선
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

// 선택자 상수
const SELECTORS = {
    STATS: 'header section li',
    USERNAME: 'header h2, header h1',
    BIO: 'header section > div:last-child',
    REELS_VIEW: 'span._aacl, span.x1lliihq',
    REELS_LINK: 'a[href*="/reels"], a[href*="/channel"]'
};

// 계정 정보 수집 함수 개선
async function collectAccountInfo() {
    try {
        logger.info('Starting analysis...');
        statusManager.update('계정 정보 수집 중...', 'info');

        // 헤더 섹션 대기
        await waitForElement('header section');
        
        // 통계 데이터 수집
        const stats = await collectStats();
        
        // 사용자 정보 수집
        const userInfo = await collectUserInfo();
        
        // 릴스 데이터 수집
        const reelsData = await collectReelsData();

        // 데이터 통합 및 검증
        currentAccount = {
            ...stats,
            ...userInfo,
            ...reelsData,
            collectedAt: new Date().toISOString(),
            meetsRequirements: checkRequirements(stats.followersCount, reelsData.avgReelsViews)
        };

        statusManager.update('분석 완료!', 'success');
        logger.info('Data collection completed');
        updateUI();
    } catch (error) {
        statusManager.update(`오류 발생: ${error.message}`, 'error');
        logger.error('Error in collectAccountInfo:', error);
    }
}

// 통계 데이터 수집
async function collectStats() {
    const statsList = document.querySelectorAll(SELECTORS.STATS);
    if (!statsList || statsList.length < 3) {
        throw new Error('통계 정보를 찾을 수 없습니다. 프로필 페이지인지 확인해주세요.');
    }

    return {
        posts: statsList[0].textContent,
        followers: statsList[1].textContent,
        following: statsList[2].textContent,
        followersCount: parseNumber(statsList[1].textContent)
    };
}

// 사용자 정보 수집
async function collectUserInfo() {
    const usernameElement = await waitForElement(SELECTORS.USERNAME);
    const bio = document.querySelector(SELECTORS.BIO)?.textContent || '';

    return {
        username: usernameElement.textContent,
        bio
    };
}

// 릴스 데이터 수집
async function collectReelsData() {
    statusManager.update('릴스 데이터 수집 중...', 'info');
    
    const reelsTab = await findReelsTab();
    if (reelsTab) {
        reelsTab.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await waitForElement(SELECTORS.REELS_VIEW);
    }

    const views = collectReelsViews();
    const avgReelsViews = calculateAverageViews(views);
    
    return { avgReelsViews };
}

// 릴스 탭 찾기
async function findReelsTab() {
    const reelsTabByHref = document.querySelector(SELECTORS.REELS_LINK);
    if (reelsTabByHref) return reelsTabByHref;

    return Array.from(document.querySelectorAll('a')).find(a => 
        a.querySelector('svg title')?.textContent?.includes('릴스')
    );
}

// 릴스 조회수 수집
function collectReelsViews() {
    return Array.from(document.querySelectorAll(SELECTORS.REELS_VIEW))
        .filter(el => el.textContent.includes('회'))
        .slice(0, 9)
        .map(el => {
            const text = el.textContent.replace('조회수 ', '').replace('회', '');
            return parseNumber(text);
        })
        .filter(count => !isNaN(count) && count > 0);
}

// 평균 조회수 계산
function calculateAverageViews(views) {
    return views.length ? views.reduce((a, b) => a + b, 0) / views.length : 0;
}

// 요구사항 충족 여부 확인
function checkRequirements(followers, avgViews) {
    return followers >= 10000 && avgViews >= 10000;
}

// CSV 변환 함수 개선
function convertToCSV(data) {
    const headers = [
        'username',
        'posts',
        'followers',
        'following',
        'bio',
        'avgReelsViews',
        'collectedAt',
        'meetsRequirements'
    ];
    
    const csvRows = data.map(account => 
        headers.map(header => {
            const value = account[header];
            // CSV 주입 방지를 위한 이스케이프 처리
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );
    
    return [headers.join(','), ...csvRows].join('\n');
}

// UI 업데이트
function updateUI() {
    // 기존 UI 제거
    const existingUI = document.getElementById('account-analyzer');
    if (existingUI) {
        existingUI.remove();
    }

    // 새 UI 생성
    const container = document.createElement('div');
    container.id = 'account-analyzer';
    
    // 기본 스타일 설정
    const baseStyles = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: #1a1a1a;
        color: #ffffff;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        min-width: 280px;
        border: 1px solid #333;
        transition: transform 0.3s ease;
    `;
    
    // 토글 상태에 따른 위치 조정
    const visibilityStyles = isUIVisible 
        ? 'transform: translateX(0);'
        : 'transform: translateX(calc(100% - 30px));';
    
    container.style.cssText = baseStyles + visibilityStyles;

    // 토글 버튼 추가
    const toggleButton = document.createElement('button');
    toggleButton.innerHTML = isUIVisible ? '◀' : '▶';
    toggleButton.style.cssText = `
        position: absolute;
        left: -30px;
        top: 50%;
        transform: translateY(-50%);
        background: #1a1a1a;
        border: 1px solid #333;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 8px 0 0 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        font-size: 12px;
        z-index: 1;
    `;
    
    // 토글 버튼 클릭 이벤트
    toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        isUIVisible = !isUIVisible;
        updateUI();
    });
    
    container.appendChild(toggleButton);

    // 진행 상태 표시 컨테이너
    const statusContainer = document.createElement('div');
    statusContainer.id = 'analysis-status';
    statusContainer.style.cssText = `
        margin-top: 10px;
        padding: 8px;
        background: #252525;
        border-radius: 8px;
        font-size: 12px;
        display: none;
    `;

    // 나머지 UI 내용 추가
    const mainContent = document.createElement('div');
    mainContent.style.opacity = isUIVisible ? '1' : '0';
    mainContent.style.transition = 'opacity 0.3s ease';
    mainContent.style.pointerEvents = isUIVisible ? 'auto' : 'none';

    if (!currentAccount) {
        mainContent.innerHTML = `
            <div style="margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                <h3 style="margin: 0; font-size: 16px; color: #fff;">Instagram 계정 분석기</h3>
            </div>
            <div style="background: #252525; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin: 0 0 10px 0; color: #fff;">📌 사용 방법</p>
                <ol style="margin: 0; padding-left: 20px; color: #ccc;">
                    <li>계정 프로필 페이지로 이동</li>
                    <li>Q키를 눌러 분석 시작</li>
                    <li>분석이 완료되면 W키로 저장</li>
                </ol>
            </div>
            <div id="status-message" style="text-align: center; color: #ccc; padding: 10px; background: #252525; border-radius: 8px;">
                계정을 분석하려면 Q를 누르세요
            </div>
        `;
    } else {
        mainContent.innerHTML = `
            <div style="margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                <h3 style="margin: 0; font-size: 16px; color: #fff;">계정 분석 결과</h3>
            </div>
            <div style="background: #252525; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="margin-bottom: 8px;">
                    <span style="color: #888;">계정명:</span>
                    <span style="color: #fff; float: right;">${currentAccount.username}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #888;">팔로워:</span>
                    <span style="color: #fff; float: right;">${currentAccount.followers}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #888;">평균 릴스 조회수:</span>
                    <span style="color: #fff; float: right;">${Math.round(currentAccount.avgReelsViews).toLocaleString()}</span>
                </div>
            </div>
            <div style="margin: 12px 0; padding: 10px; background: ${currentAccount.meetsRequirements ? '#1e3a1e' : '#3a1e1e'}; border-radius: 8px; text-align: center; color: #fff;">
                ${currentAccount.meetsRequirements ? '✅ 조건 충족' : '❌ 조건 미달'}
            </div>
            <button onclick="saveData()" style="
                width: 100%;
                padding: 10px;
                background: #0095f6;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 10px;
                font-weight: 600;
            ">데이터 저장 (W)</button>
        `;
    }

    container.appendChild(mainContent);
    container.appendChild(statusContainer);
    document.body.appendChild(container);
}

// 데이터 저장
function saveData() {
    if (!currentAccount) {
        logger.info('저장할 데이터가 없습니다');
        statusManager.update('저장할 데이터가 없습니다', 'error');
        return;
    }
    
    collectedData.push(currentAccount);
    
    // CSV 형식으로 변환
    const csv = convertToCSV(collectedData);
    
    // 다운로드
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `instagram_accounts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    statusManager.update('데이터 저장 완료!', 'success');
    logger.info('데이터 저장 완료');
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
    
    // 애니메이션 스타일 추가
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
    
    // 2초 후 제거
    setTimeout(() => {
        notification.remove();
        style.remove();
    }, 2000);
}

// 이벤트 리스너 등록
function initializeEventListeners() {
    document.addEventListener('keydown', (e) => {
        const keyHandlers = {
            'q': () => {
                logger.info('Analysis hotkey detected');
                showKeyPressNotification('⌨️ 계정 분석 시작...');
                collectAccountInfo();
            },
            'w': () => {
                logger.info('Save data hotkey detected');
                showKeyPressNotification('⌨️ 데이터 저장 중...');
                saveData();
            }
        };

        const handler = keyHandlers[e.key.toLowerCase()];
        if (handler) handler();
    });
}

// 초기화
function initialize() {
    logger.info('Extension initialized');
    updateUI();
    initializeEventListeners();
}

initialize();