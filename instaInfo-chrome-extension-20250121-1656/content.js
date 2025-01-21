// content.js
let currentAccount = null;
let collectedData = [];
let isUIVisible = true;

// 향상된 로깅 시스템
const logger = {
    debug: (message) => console.debug(`[Instagram Analyzer] ${message}`),
    info: (message) => console.log(`[Instagram Analyzer] ${message}`),
    warn: (message) => console.warn(`[Instagram Analyzer] ${message}`),
    error: (message, error) => console.error(`[Instagram Analyzer] ${message}`, error)
};

/**
 * 숫자 문자열을 파싱하는 함수
 * @param {string|HTMLElement} text - 파싱할 텍스트 또는 HTML 요소
 * @returns {number} - 변환된 숫자
 * 
 * 지원하는 형식:
 * - 일반 숫자: "1234"
 * - 천 단위: "1천", "1K"
 * - 만 단위: "1만"
 * - 백만 단위: "1M"
 */
function parseNumber(text) {
    try {
        // null, undefined 체크
        if (!text) return 0;

        // HTMLElement가 전달된 경우 textContent를 사용
        if (text instanceof HTMLElement) {
            text = text.textContent;
        }

        // 객체인 경우 toString 사용
        if (typeof text === 'object') {
            text = text?.toString() || '0';
        }

        // 문자열이 아닌 경우 문자열로 변환
        if (typeof text !== 'string') {
            text = String(text);
        }

        // 숫자와 단위(만, 천, K, M)만 추출
        text = text.replace(/[^0-9.만천KM]/g, '').trim();

        // 단위별 곱셈 값 정의
        const units = {
            '만': 10000,    // 1만 = 10000
            '천': 1000,     // 1천 = 1000
            'K': 1000,      // 1K = 1000
            'M': 1000000    // 1M = 1000000
        };

        // 단위가 있는 경우 해당 단위로 계산
        for (const [unit, multiplier] of Object.entries(units)) {
            if (text.includes(unit)) {
                const value = parseFloat(text.replace(unit, ''));
                if (!isNaN(value)) {
                    return value * multiplier;
                }
            }
        }

        return parseFloat(text) || 0;
    } catch (error) {
        logger.error('Error in parseNumber:', error);
        return 0;
    }
}

/**
 * 상태 메시지 관리 클래스
 * - 분석 진행 상태를 실시간으로 표시
 * - 성공/에러/정보 메시지를 다른 색상으로 표시
 * - 일부 메시지는 3초 후 자동으로 사라짐
 */
class StatusManager {
    constructor() {
        this.container = null;      // 상태 메시지를 표시할 컨테이너 요소
        this.timeoutId = null;      // 메시지 자동 제거를 위한 타이머 ID
    }

    // 상태 메시지 컨테이너 요소 가져오기
    getContainer() {
        if (!this.container) {
            this.container = document.getElementById('analysis-status');
        }
        return this.container;
    }

    /**
     * 상태 메시지 업데이트
     * @param {string} message - 표시할 메시지
     * @param {string} type - 메시지 타입 (success/error/info)
     */
    update(message, type = 'info') {
        const container = this.getContainer();
        if (!container) return;

        // 메시지 타입별 색상 정의
        const colors = {
            success: '#4caf50',  // 초록색
            error: '#f44336',    // 빨간색
            info: '#2196f3'      // 파란색
        };

        // 메시지 UI 업데이트
        container.style.display = 'block';
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: ${colors[type]}">●</span>
                <span>${message}</span>
            </div>
        `;

        // 이전 타이머가 있다면 제거
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        // info 타입이 아닌 경우 3초 후 메시지 숨김
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
    REELS_LINK: 'a[href*="/reels"], a[href*="/channel"]',
    REELS_CONTAINER: 'div._aacl._aabd._aa8k._al3l'
};

// 계정 정보 수집 함수 개선
async function collectAccountInfo() {
    try {
        logger.info('Starting analysis...');
        statusManager.update('계정 정보 수집 중...', 'info');

        // section > main 요소 대기
        const mainSection = await waitForElement('section > main');
        if (!mainSection) {
            throw new Error('메인 섹션을 찾을 수 없습니다.');
        }

        // header 요소 대기
        const headerElement = await waitForElement('div > header', 5000, mainSection);
        if (!headerElement) {
            throw new Error('헤더 요소를 찾을 수 없습니다.');
        }

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

        const container = document.getElementById('account-analyzer');
        if (container) {
            container.style.height = 'calc(100vh - 100px)';
            const detailsContainer = container.querySelector('div:nth-child(1) > div:nth-child(2)');
            if (detailsContainer) {
                detailsContainer.style.display = 'block';
            }
        }
        updateUI();
    } catch (error) {
        statusManager.update(`오류 발생: ${error.message}`, 'error');
        logger.error('Error in collectAccountInfo:', error);
    }
}

// 통계 데이터 수집
async function collectStats() {
    try {
        // 메인 섹션 찾기
        const mainSection = document.querySelector('section > main');
        if (!mainSection) {
            throw new Error('메인 섹션을 찾을 수 없습니다.');
        }

        // 통계 정보가 있는 ul 요소 찾기
        const statsList = mainSection.querySelectorAll('ul li');
        if (!statsList || statsList.length < 3) {
            throw new Error('통계 정보를 찾을 수 없습니다. 프로필 페이지인지 확인해주세요.');
        }

        // 숫자만 추출하여 간단한 형식으로 변환
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
        logger.info('사용자 정보 수집 시작');

        const username = window.location.pathname.replace('reels/', '').replace('/', '');
        logger.debug(`수집된 사용자명: ${username}`);

        let bio = '';
        let bioLink = '';

        try {
            const mainSection = document.querySelector('section > main');
            if (mainSection) {
                const headerElement = mainSection.querySelector('div > header');
                if (headerElement) {
                    const sections = headerElement.querySelectorAll('section');
                    const bioElement = sections[3];
                    logger.debug('Bio element 찾기 시도:', bioElement);

                    if (bioElement) {
                        // 설명글 수집 - 네 번째 section 이후의 모든 section의 텍스트를 결합
                        const bioSections = Array.from(sections).slice(3);  // 네 번째 section부터 끝까지
                        bio = bioSections.map(section => {
                            // 모든 텍스트 내용을 포함하고 줄바꿈을 공백으로 대체
                            return section.textContent.trim().replace(',', '_').replace(/[\n\r]+/g, '_');
                        }).join('_').trim();  // section 간 구분도 공백으로 처리
                        bio = bio.replace(',', '_');
                        logger.debug(`수집된 설명글: ${bio}`);

                        // 링크 추출 로직
                        const linkIconElements = bioElement.querySelectorAll('div');
                        for (const div of linkIconElements) {
                            const svg = div.querySelector('svg[aria-label="링크 아이콘"]');
                            if (svg) {
                                const linkContainer = div.parentElement.querySelector('a[href^="https://l.instagram.com/?u="]');
                                if (linkContainer) {
                                    const rawLink = linkContainer.href;
                                    logger.info(`Instagram 링크 발견: ${rawLink}`);

                                    try {
                                        const url = new URL(rawLink);
                                        const actualLink = url.searchParams.get('u');
                                        if (actualLink) {
                                            bioLink = decodeURIComponent(actualLink.split('&')[0]);
                                            logger.info(`실제 링크 추출: ${bioLink}`);
                                        }
                                    } catch (urlError) {
                                        logger.error('URL 파싱 오류:', urlError);
                                    }
                                    break;
                                }
                            }
                        }

                        if (!bioLink) {
                            logger.warn('링크 아이콘으로부터 링크를 찾을 수 없음');
                        }
                    } else {
                        logger.warn('네 번째 section을 찾을 수 없음');
                    }
                }
            }
        } catch (bioError) {
            logger.error('설명글 추출 중 오류:', bioError);
        }

        logger.info('사용자 정보 수집 완료');
        logger.debug(`최종 수집된 설명글: ${bio}`);
        logger.debug(`최종 수집된 링크: ${bioLink}`);

        return {
            username,
            bio,
            bioLink
        };
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
    statusManager.update('릴스 데이터 수집 중...', 'info');

    const reelsTab = await findReelsTab();
    if (reelsTab) {
        reelsTab.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await waitForElement(SELECTORS.REELS_VIEW);
    }

    const reelsData = collectReelsViews();
    const avgReelsViews = calculateAverageViews(reelsData.map(data => data.views));

    return {
        avgReelsViews,
        reelsViews: reelsData.map(data => data.views),
        reelsData: reelsData
    };
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
    try {
        // 메인 릴스 그리드 컨테이너 찾기
        const mainSection = document.querySelector('main[role="main"]');
        if (!mainSection) {
            logger.debug('메인 섹션을 찾을 수 없습니다.');
            return [];
        }

        // 헤더 다음에 있는 릴스 컨테이너 찾기
        const header = mainSection.querySelector('header');
        if (!header) {
            logger.debug('헤더를 찾을 수 없습니다.');
            return [];
        }

        // 릴스 그리드 컨테이너 (헤더 다음의 div 중 릴스를 포함하는 div)
        const reelsContainer = Array.from(header.parentElement.children)
            .find(el => el.querySelector('a[href*="/reel/"]'));

        if (!reelsContainer) {
            logger.debug('릴스 컨테이너를 찾을 수 없습니다.');
            return [];
        }

        // 각 릴스 아이템 찾기
        const reelsItems = Array.from(reelsContainer.querySelectorAll('a[href*="/reel/"]'));
        logger.debug(`Found ${reelsItems.length} reels items`);

        // 첫 번째 릴스 아이템의 모든 div 요소의 HTML을 로그로 출력
        if (reelsItems.length > 0) {
            const firstReelDivs = reelsItems[0].querySelectorAll('div');
            firstReelDivs.forEach((div, index) => {
                logger.debug(`Div ${index + 1} HTML: ${div.outerHTML}`);
            });
        }

        const reelsData = reelsItems.slice(0, 50).map(item => {
            try {
                // 모든 span 요소의 텍스트를 로그로 출력
                const spans = item.querySelectorAll('span');
                spans.forEach((span, index) => {
                    logger.debug(`Span ${index + 1}: ${span.textContent.trim()}`);
                });

                // 조회수 요소 찾기 (조회수 아이콘이 있는 div의 형제 요소)
                const viewCountEl = findViewCountElement(item);
                const views = parseNumber(viewCountEl?.textContent || '0');

                // 썸네일 이미지 찾기 (background-image에서 URL 추출)
                const thumbnailDiv = item.querySelector('div[style*="background-image"]');
                let thumbnail = null;
                if (thumbnailDiv) {
                    const style = thumbnailDiv.getAttribute('style');
                    const urlMatch = style.match(/url\("([^"]+)"\)/);
                    if (urlMatch) {
                        thumbnail = urlMatch[1];
                    }
                }

                return {
                    views,
                    thumbnail,
                    link: item.href
                };
            } catch (error) {
                logger.error('릴스 데이터 추출 중 오류:', error);
                return { views: 0, thumbnail: null, link: null };
            }
        });

        return reelsData.filter(data => data.views > 0);

    } catch (error) {
        logger.error('릴스 수집 중 오류:', error);
        return [];
    }
}

// 조회수 요소 찾기 함수
function findViewCountElement(item) {
    try {
        // 모든 span 요소를 찾고, 마지막 span을 선택
        const spans = item.querySelectorAll('span');
        if (spans.length > 0) {
            const lastSpan = spans[spans.length - 1];
            logger.debug(`Using last span for views: ${lastSpan.textContent.trim()}`);
            return lastSpan;
        }
        return null;
    } catch (error) {
        logger.error('조회수 요소 찾기 중 오류:', error);
        return null;
    }
}

// 릴스 이미지 찾기 함수
function findReelsImage(item) {
    // 1. 배경 이미지 스타일에서 찾기
    const bgDiv = item.querySelector('div[style*="background-image"]');
    if (bgDiv) {
        const style = bgDiv.getAttribute('style');
        const urlMatch = style.match(/url\("([^"]+)"\)/);
        if (urlMatch) return { src: urlMatch[1] };
    }

    // 2. 일반 이미지 태그에서 찾기
    return item.querySelector('img[src*="scontent"]');
}

// 릴스 링크 찾기 함수
function findReelsLink(item) {
    // 1. 릴스 전용 링크 찾기
    const reelsLink = item.querySelector('a[href*="/reel/"]');
    if (reelsLink) return reelsLink.href;

    // 2. 일반 링크 찾기
    const anyLink = item.querySelector('a') || item.closest('a');
    return anyLink?.href || null;
}

// 평균 조회수 계산
function calculateAverageViews(views) {
    if (!views.length) return 0;
    const total = views.reduce((a, b) => a + b, 0);
    return total / views.length;
}

// 요구사항 충족 여부 확인
function checkRequirements(followers, avgViews) {
    try {
        // followers: 인플루언서의 총 팔로워 수 (문자열 또는 숫자 형식으로 입력 가능)
        // avgViews: 최근 게시물의 평균 조회수 (숫자)
        const followersCount = parseNumber(followers);

        // 디버깅을 위한 원본 값 로깅
        logger.info('Raw followers value:', followers);
        logger.info('Parsed followers count:', followersCount);
        logger.info('Raw avgViews value:', avgViews);

        // followersCheck: 팔로워 수가 최소 요구사항(10,000)을 충족하는지 여부
        const followersCheck = followersCount >= 10000;
        // viewsCheck: 평균 조회수가 최소 요구사항(10,000)을 충족하는지 여부
        const viewsCheck = avgViews >= 10000;

        // 요구사항 체크 결과 상세 로깅
        logger.info(`Requirements check details:
            Followers (${followersCount} >= 10000): ${followersCheck}
            Avg Views (${avgViews} >= 10000): ${viewsCheck}
        `);

        // result: 모든 요구사항이 충족되었는지 여부 (팔로워 수와 평균 조회수 모두 충족해야 함)
        const result = followersCheck && viewsCheck;
        logger.info('Final requirements check result:', result);

        return result;
    } catch (error) {
        // 에러 발생 시 로깅하고 false 반환
        logger.error('Error in checkRequirements:', error);
        return false; // 안전한 기본값으로 false 반환
    }
}

// CSV 변환 함수 수정
function convertToCSV(data) {
    const headers = [
        '계정명',
        '게시물',
        '팔로워',
        '팔로우',
        '설명글',
        '링크'
    ];

    const csvRows = data.map(account => {
        return [
            account.username,
            account.posts,
            account.followers,
            account.following,
            account.bio || '',
            account.bioLink || ''
        ].join(',');  // 쉼표로 구분
    });

    return [headers.join(','), ...csvRows].join('\n');
}

// UI 업데이트
function updateUI() {
    logger.info('UI 업데이트 시작');
    logger.debug(`현재 계정 데이터 존재 여부: ${!!currentAccount}`);
    logger.debug(`저장된 데이터 수: ${collectedData.length}`);

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
        top: 50px;
        bottom: 50px;
        right: 20px;
        width: 300px;
        background: #1a1a1a;
        color: #ffffff;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        border: 1px solid #333;
        transition: all 0.3s ease;
        cursor: move;
        overflow: hidden;
    `;

    let isMinimized = !currentAccount; // 계정 데이터가 없으면 최소화 상태

    container.style.cssText = baseStyles;
    container.style.height = isMinimized ? '80px' : 'calc(100vh - 100px)';

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

    // 메인 컨텐츠 컨테이너
    const mainContent = document.createElement('div');
    mainContent.style.transition = 'opacity 0.3s ease';

    // 드래그 관련 변수
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // 결과 컨테이너
    const resultContainer = document.createElement('div');
    resultContainer.style.cssText = `
        margin-bottom: 15px; 
        border-bottom: 1px solid #333; 
        padding-bottom: 10px;
        cursor: pointer;
        ${isMinimized ? 'margin-top: -10px;' : ''}
    `;
    resultContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; white-space: nowrap; min-width: 300px;">
            <h3 style="margin: 0; font-size: 16px; color: #fff; flex-shrink: 0;">계정 분석 결과</h3>
            <div style="display: flex; gap: 8px; margin-left: 10px; flex-shrink: 0;">
                <button id="quick-search-button" style="
                    min-width: 50px;
                    padding: 5px 10px;
                    background: #0095f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    white-space: nowrap;
                ">검색</button>
                <button id="analyze-button" style="
                    min-width: 50px;
                    padding: 5px 10px;
                    background: #0095f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    white-space: nowrap;
                ">조회</button>
                ${currentAccount ? `
                    <button id="saveToListButton" style="
                        min-width: 80px;
                        padding: 5px 10px;
                        background: #0095f6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        white-space: nowrap;
                    ">목록추가</button>
                ` : ''}
            </div>
        </div>
    `;

    const detailsContainer = document.createElement('div');
    detailsContainer.style.display = isMinimized ? 'none' : 'block';

    // 탭 버튼 스타일
    const tabButtonStyle = `
        padding: 8px 16px;
        background: transparent;
        color: #888;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
    `;

    const activeTabButtonStyle = `
        color: #0095f6;
        border-bottom: 2px solid #0095f6;
    `;

    // 탭 컨테이너 생성
    detailsContainer.innerHTML = `
        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
            <button id="detailInfoTab" style="${tabButtonStyle}${!currentAccount?.showSaveList ? activeTabButtonStyle : ''}">
                상세정보
            </button>
            <button id="saveListTab" style="${tabButtonStyle}${currentAccount?.showSaveList ? activeTabButtonStyle : ''}">
                저장 목록
            </button>
            <button id="searchTab" style="${tabButtonStyle}">
                검색
            </button>
        </div>
        <div id="detailInfoContent" style="display: ${!currentAccount?.showSaveList ? 'block' : 'none'}">
            <div style="background: #252525; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="margin-bottom: 8px;">
                    <span style="color: #888;">계정명:</span>
                    <span style="color: #fff; float: right;">${currentAccount ? currentAccount.username : ''}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #888;">게시물:</span>
                    <span style="color: #fff; float: right;">${currentAccount ? currentAccount.posts.toLocaleString() : ''}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #888;">팔로워:</span>
                    <span style="color: #fff; float: right;">${currentAccount ? currentAccount.followers.toLocaleString() : ''}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #888;">팔로우:</span>
                    <span style="color: #fff; float: right;">${currentAccount ? currentAccount.following.toLocaleString() : ''}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #888;">평균 릴스 조회수:</span>
                    <span style="color: #fff; float: right;">${currentAccount ? Math.round(currentAccount.avgReelsViews).toLocaleString() : ''}</span>
                </div>
            </div>
            <div style="margin: 12px 0; padding: 10px; background: ${currentAccount && currentAccount.meetsRequirements ? '#1e3a1e' : '#3a1e1e'}; border-radius: 8px; text-align: center; color: #fff;">
                ${currentAccount ? (currentAccount.meetsRequirements ? '✅ 조건 충족' : '❌ 조건 미달') : ''}
            </div>
            ${currentAccount && currentAccount.reelsData ? `
                <div style="margin: 12px 0; background: #252525; padding: 12px; border-radius: 8px; max-height: 400px; overflow-y: auto;">
                    <h4 style="margin: 0 0 10px 0; color: #fff; font-size: 14px;">릴스 조회수 상세</h4>
                    <div style="display: grid; grid-template-columns: repeat(1, 1fr); gap: 8px;">
                        ${currentAccount.reelsData.map((data, index) => `
                            <div style="display: flex; align-items: center; padding: 8px; background: #333; border-radius: 4px;">
                                ${data.thumbnail ? `
                                    <a href="${data.link || '#'}" target="_blank" style="text-decoration: none;">
                                        <img src="${data.thumbnail}" 
                                             style="width: 60px; height: 106px; object-fit: cover; border-radius: 4px; margin-right: 12px;"
                                             alt="릴스 ${index + 1} 썸네일"
                                             onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div style=\'width: 60px; height: 106px; background: #444; border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center;\'><span style=\'color: #666;\'>No Image</span></div>'"
                                        />
                                    </a>
                                ` : `
                                    <div style="width: 60px; height: 106px; background: #444; border-radius: 4px; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
                                        <span style="color: #666;">No Image</span>
                                    </div>
                                `}
                                <div style="flex-grow: 1;">
                                    <div style="color: #fff; font-size: 14px; margin-bottom: 4px;">
                                        릴스 ${index + 1}
                                    </div>
                                    <div style="color: #ccc; font-size: 12px;">
                                        조회수: ${data.views.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #333;">
                        <div style="color: #ccc; font-size: 12px; margin-bottom: 4px;">
                            총 릴스 수: ${currentAccount.reelsData.length}개
                        </div>
                        <div style="color: #ccc; font-size: 12px; margin-bottom: 4px;">
                            총 조회수: ${currentAccount.reelsData.reduce((a, b) => a + b.views, 0).toLocaleString()}
                        </div>
                        <div style="color: #ccc; font-size: 12px;">
                            평균 조회수: ${Math.round(currentAccount.avgReelsViews).toLocaleString()}
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div id="saveListContent" style="display: ${currentAccount?.showSaveList ? 'block' : 'none'}">
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                    <thead>
                        <tr style="background: #252525; color: #888; text-align: left; font-size: 12px;">
                            <th style="padding: 8px; border-bottom: 1px solid #333;">계정명</th>
                            <th style="padding: 8px; border-bottom: 1px solid #333;">게시물</th>
                            <th style="padding: 8px; border-bottom: 1px solid #333;">팔로워</th>
                            <th style="padding: 8px; border-bottom: 1px solid #333;">팔로우</th>
                            <th style="padding: 8px; border-bottom: 1px solid #333;">설명글</th>
                            <th style="padding: 8px; border-bottom: 1px solid #333;">링크</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${collectedData.map((account, index) => `
                            <tr style="background: ${index % 2 === 0 ? '#1a1a1a' : '#252525'};">
                                <td style="padding: 8px; color: #fff; font-size: 12px;">${account.username}</td>
                                <td style="padding: 8px; color: #fff; font-size: 12px;">${account.posts}</td>
                                <td style="padding: 8px; color: #fff; font-size: 12px;">${account.followers}</td>
                                <td style="padding: 8px; color: #fff; font-size: 12px;">${account.following}</td>
                                <td style="padding: 8px; color: #fff; font-size: 12px;">${account.bio || ''}</td>
                                <td style="padding: 8px; color: #fff; font-size: 12px;">
                                    ${account.bioLink ? `<a href="${account.bioLink}" target="_blank" style="color: #0095f6; text-decoration: none;">링크</a>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${collectedData.length > 0 ? `
                <div style="display: flex; gap: 8px;">
                    <button id="saveToFileButton" style="
                        flex: 1;
                        padding: 10px;
                        background: #0095f6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-top: 10px;
                        font-weight: 600;
                    ">파일로 저장 (${collectedData.length}개)</button>
                    <button id="clearListButton" style="
                        padding: 10px;
                        background: #f44336;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-top: 10px;
                        font-weight: 600;
                    ">초기화</button>
                </div>
            ` : '<div style="text-align: center; color: #888; padding: 20px;">저장된 데이터가 없습니다</div>'}
        </div>
        <div id="searchContent" style="display: none;">
            <div style="margin-bottom: 15px;">
                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" id="searchInput" placeholder="검색할 계정명 입력" style="
                        flex: 1;
                        padding: 8px;
                        border: 1px solid #333;
                        border-radius: 8px;
                        background: #1a1a1a;
                        color: #fff;
                        font-size: 14px;
                        white-space: nowrap;
                        width: 100%;
                    ">
                    <button id="searchButton1" style="
                        padding: 8px 16px;
                        background: #0095f6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 400;
                        white-space: nowrap;
                    ">검색1</button>
                    <button id="searchButton2" style="
                        padding: 8px 16px;
                        background: #0095f6;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 400;
                        white-space: nowrap;
                    ">검색2</button>
                </div>
                <button id="analyzeAllButton" style="
                    width: 100%;
                    padding: 8px 16px;
                    background: #0095f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    margin-top: 10px;
                ">검색2 결과 현재 페이지 계정 분석</button>
                <div id="accountsTable" style="
                    margin-top: 15px;
                    max-height: calc(100vh - 300px);
                    overflow-y: auto;
                "></div>
            </div>
        </div>
    `;

    // 탭 전환 이벤트 수정
    const detailInfoTab = detailsContainer.querySelector('#detailInfoTab');
    const saveListTab = detailsContainer.querySelector('#saveListTab');
    const searchTab = detailsContainer.querySelector('#searchTab');
    const detailInfoContent = detailsContainer.querySelector('#detailInfoContent');
    const saveListContent = detailsContainer.querySelector('#saveListContent');
    const searchContent = detailsContainer.querySelector('#searchContent');

    // 탭 전환 이벤트
    detailInfoTab.addEventListener('click', () => {
        logger.info('DetailInfo 탭 클릭됨');
        logger.debug(`현재 showSaveList 상태: ${currentAccount?.showSaveList}`);

        currentAccount.showSaveList = false;
        logger.debug('showSaveList를 false로 변경');

        detailInfoTab.style.cssText = tabButtonStyle + activeTabButtonStyle;
        saveListTab.style.cssText = tabButtonStyle;
        searchTab.style.cssText = tabButtonStyle;
        detailInfoContent.style.display = 'block';
        saveListContent.style.display = 'none';
        searchContent.style.display = 'none';

        logger.info('DetailInfo 탭으로 전환 완료');
    });

    saveListTab.addEventListener('click', () => {
        logger.info('SaveList 탭 클릭됨');
        logger.debug(`현재 showSaveList 상태: ${currentAccount?.showSaveList}`);

        currentAccount.showSaveList = true;
        logger.debug('showSaveList를 true로 변경');

        saveListTab.style.cssText = tabButtonStyle + activeTabButtonStyle;
        detailInfoTab.style.cssText = tabButtonStyle;
        searchTab.style.cssText = tabButtonStyle;
        detailInfoContent.style.display = 'none';
        saveListContent.style.display = 'block';
        searchContent.style.display = 'none';

        logger.info('SaveList 탭으로 전환 완료');
    });

    // 검색 탭 클릭 이벤트
    searchTab.addEventListener('click', () => {
        logger.info('Search 탭 클릭됨');

        // 탭 스타일 변경
        searchTab.style.cssText = tabButtonStyle + activeTabButtonStyle;
        detailInfoTab.style.cssText = tabButtonStyle;
        saveListTab.style.cssText = tabButtonStyle;

        // 컨텐츠 표시/숨김
        detailInfoContent.style.display = 'none';
        saveListContent.style.display = 'none';
        searchContent.style.display = 'block';
    });

    // 검색 기능 구현
    const searchButton1 = detailsContainer.querySelector('#searchButton1');
    const searchButton2 = detailsContainer.querySelector('#searchButton2');
    const searchInput = detailsContainer.querySelector('#searchInput');

    if (searchInput) {
        // localStorage에서 저장된 검색어 불러오기
        const savedSearchTerm = localStorage.getItem('instagramAnalyzerSearchTerm');
        if (savedSearchTerm) {
            searchInput.value = savedSearchTerm;
        }

        // 검색어 입력 시 localStorage에 저장
        searchInput.addEventListener('input', (e) => {
            localStorage.setItem('instagramAnalyzerSearchTerm', e.target.value);
        });

        // Enter 키 이벤트
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();  // 폼 제출 방지
                searchButton1.click();
            }
        });
    }

    searchButton1.addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            try {
                // 검색어 localStorage에 저장
                localStorage.setItem('instagramAnalyzerSearchTerm', searchTerm);
                
                // 검색 중임을 표시
                statusManager.update('검색 중...', 'info');
                
                // 검색 결과를 표시할 컨테이너 생성 또는 업데이트
                let searchResultsContainer = searchContent.querySelector('#searchResults');
                if (!searchResultsContainer) {
                    searchResultsContainer = document.createElement('div');
                    searchResultsContainer.id = 'searchResults';
                    searchResultsContainer.style.cssText = `
                        margin-top: 15px;
                        max-height: calc(100vh - 250px);
                        overflow-y: auto;
                        background: #252525;
                        border-radius: 8px;
                        padding: 12px;
                    `;
                    searchContent.appendChild(searchResultsContainer);
                }

                // 검색 API 호출
                const encodedTerm = encodeURIComponent(searchTerm);
                const response = await fetch(`https://www.instagram.com/web/search/topsearch/?query=${encodedTerm}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (!response.ok) throw new Error('검색 실패');

                const data = await response.json();
                
                // 검색 결과 표시
                searchResultsContainer.innerHTML = `
                    <div style="margin-bottom: 10px; color: #888;">
                        검색 결과: ${data.users?.length || 0}개
                    </div>
                    ${data.users?.map(user => `
                        <div class="profile-item" 
                             data-username="${user.user.username}"
                             style="
                                display: flex;
                                align-items: center;
                                padding: 8px;
                                border-bottom: 1px solid #333;
                                cursor: pointer;"
                        >
                            <img src="${user.user.profile_pic_url}" 
                                 style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px;"
                                 alt="${user.user.username}의 프로필"
                            />
                            <div>
                                <div style="color: #fff; font-weight: 600;">
                                    ${user.user.username}
                                </div>
                                <div style="color: #888; font-size: 12px;">
                                    ${user.user.full_name}
                                </div>
                            </div>
                        </div>
                    `).join('') || '<div style="text-align: center; color: #888; padding: 20px;">검색 결과가 없습니다.</div>'}
                `;

                // 프로필 아이템에 클릭 이벤트 리스너 추가
                const profileItems = searchResultsContainer.querySelectorAll('.profile-item');
                profileItems.forEach(item => {
                    item.addEventListener('click', () => {
                        const username = item.dataset.username;
                        if (username) {
                            goToProfile(username);
                        }
                    });
                });

                statusManager.update('검색 완료', 'success');
            } catch (error) {
                logger.error('검색 중 오류:', error);
                statusManager.update('검색 중 오류가 발생했습니다.', 'error');
                
                // 에러 메시지 표시
                searchResultsContainer.innerHTML = `
                    <div style="text-align: center; color: #f44336; padding: 20px;">
                        검색 중 오류가 발생했습니다.<br>
                        다시 시도해주세요.
                    </div>
                `;
            }
        } else {
            statusManager.update('검색어를 입력해주세요.', 'error');
        }
    });

    searchButton2.addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            // Instagram 검색 URL로 이동 (URL 인코딩 적용)
            const encodedTerm = encodeURIComponent(searchTerm);
            window.location.href = `https://www.instagram.com/explore/search/keyword/?q=${encodedTerm}`;
            logger.info(`검색 실행: ${searchTerm}`);
        } else {
            statusManager.update('검색어를 입력해주세요.', 'error');
        }
    });

    // 조회 버튼 클릭 이벤트
    const analyzeButton = resultContainer.querySelector('#analyze-button');
    analyzeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        logger.info('Analysis button clicked');
        showKeyPressNotification('⌨️ 계정 분석 시작...');
        collectAccountInfo();
    });

    // 저장 목록에 추가 버튼에 대한 이벤트 리스너 추가
    const saveButton = resultContainer.querySelector('#saveToListButton');
    if (saveButton) {
        saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            logger.info('Save to list button clicked');

            if (!currentAccount) {
                logger.error('현재 계정 데이터가 없음');
                statusManager.update('저장할 데이터가 없습니다.', 'error');
                return;
            }

            // 중복 체크
            const isDuplicate = collectedData.some(account => account.username === currentAccount.username);
            if (isDuplicate) {
                logger.warn(`중복된 계정 발견: ${currentAccount.username}`);
                statusManager.update('이미 저장된 계정입니다.', 'error');
                return;
            }

            // 데이터 저장
            collectedData.push({ ...currentAccount });
            logger.info(`새 계정 추가됨: ${currentAccount.username}`);

            // 상태 메시지 표시
            statusManager.update('저장 목록에 추가되었습니다.', 'success');

            // 저장 목록 탭으로 전환
            currentAccount.showSaveList = true;
            updateUI();

            // 저장 목록 탭으로 포커스
            const saveListTab = document.querySelector('#saveListTab');
            if (saveListTab) {
                saveListTab.click();
            }
        });
    }

    // 파일로 저장 버튼에 대한 이벤트 리스너 추가
    const saveToFileButton = detailsContainer.querySelector('#saveToFileButton');
    if (saveToFileButton) {
        saveToFileButton.addEventListener('click', (e) => {
            e.stopPropagation();
            logger.info('Save to file button clicked');

            if (collectedData.length === 0) {
                logger.warn('저장할 데이터가 없음');
                statusManager.update('저장할 데이터가 없습니다.', 'error');
                return;
            }

            logger.debug('CSV 변환 시작');
            const csv = convertToCSV(collectedData);

            logger.debug('Blob 생성');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            logger.debug('다운로드 링크 생성');
            const link = document.createElement('a');
            const now = new Date();
            const fileName = `instagram_accounts_${now.toISOString().split('T')[0]}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}.csv`;

            link.setAttribute('href', url);
            link.setAttribute('download', fileName);

            logger.debug(`파일 다운로드 시작: ${fileName}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            statusManager.update('파일 저장 완료!', 'success');
            logger.info('파일 저장 완료');
        });
    }

    // 이벤트 리스너 등록 부분에 초기화 버튼 이벤트 추가
    const clearListButton = detailsContainer.querySelector('#clearListButton');
    if (clearListButton) {
        clearListButton.addEventListener('click', (e) => {
            e.stopPropagation();
            logger.info('Clear list button clicked');

            if (confirm('저장된 모든 데이터를 삭제하시겠습니까?')) {
                logger.debug('사용자가 초기화 확인');

                // 저장 목록 초기화
                collectedData = [];
                logger.info('저장 목록 초기화 완료');

                // 상세정보 탭으로 전환
                if (currentAccount) {
                    currentAccount.showSaveList = false;
                }

                // UI 업데이트
                updateUI();

                // 상세정보 탭 클릭
                const detailInfoTab = document.querySelector('#detailInfoTab');
                if (detailInfoTab) {
                    detailInfoTab.click();
                }

                statusManager.update('저장 목록이 초기화되었습니다.', 'success');
            } else {
                logger.debug('사용자가 초기화 취소');
            }
        });
    }

    // 드래그 기능을 위한 이벤트 리스너 수정
    let lastClickTime = 0;
    container.addEventListener('mousedown', (e) => {
        const clickTime = new Date().getTime();
        if (clickTime - lastClickTime < 300) {  // 더블클릭 간격 체크
            e.preventDefault();  // 더블클릭 시 드래그 시작 방지
            return;
        }
        lastClickTime = clickTime;

        // 기존 드래그 코드...
        if (e.target.tagName === 'BUTTON' ||
            e.target.tagName === 'A' ||
            e.target.closest('#saveListContent')) return;

        const resultContainerArea = e.target.closest('div');
        if (resultContainerArea && (resultContainerArea === resultContainer || resultContainerArea.parentElement === resultContainer)) {
            isDragging = true;
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            container.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            // 화면 경계 체크 - 패널이 최소 30px는 보이도록 설정
            const minVisible = 30;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            // 좌우 경계 제한
            if (currentX < -containerWidth + minVisible) {
                currentX = -containerWidth + minVisible;
            }
            if (currentX > windowWidth - minVisible) {
                currentX = windowWidth - minVisible;
            }

            // 상하 경계 제한
            if (currentY < 0) {
                currentY = 0;
            }
            if (currentY > windowHeight - minVisible) {
                currentY = windowHeight - minVisible;
            }

            xOffset = currentX;
            yOffset = currentY;

            container.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            container.style.cursor = 'default';
        }
    });

    // 드래그 중 텍스트 선택 방지
    resultContainer.addEventListener('selectstart', (e) => {
        if (isDragging) {
            e.preventDefault();
        }
    });

    // 커서 스타일 설정
    resultContainer.style.cursor = 'pointer';
    resultContainer.querySelector('h3').style.cursor = 'pointer';

    // 검색 버튼 이벤트 리스너 수정
    const quickSearchButton = resultContainer.querySelector('#quick-search-button');
    if (quickSearchButton) {
        quickSearchButton.addEventListener('click', (e) => {
            e.stopPropagation();
            logger.info('Quick search button clicked');

            // 패널이 접혀있으면 펼치기
            if (container.style.height === '80px') {
                container.style.height = 'calc(100vh - 100px)';
                detailsContainer.style.display = 'block';
            }

            // 검색 탭 활성화
            const searchTab = document.querySelector('#searchTab');
            if (searchTab) {
                searchTab.click();

                // 검색 입력창에 포커스
                setTimeout(() => {
                    const searchInput = document.querySelector('#searchInput');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 100);
            }
        });
    }

    // 계정 분석 기능 추가
    const analyzeAllButton = detailsContainer.querySelector('#analyzeAllButton');
    if (analyzeAllButton) {
        analyzeAllButton.addEventListener('click', async () => {
            try {
                statusManager.update('계정 분석 중...', 'info');
                
                // 모든 썸네일 링크와 이미지 수집
                const thumbnails = Array.from(document.querySelectorAll('a[role="link"][href*="/p/"]'))
                    .map(link => {
                        const img = link.querySelector('img[class*="x5yr21d"]');
                        return {
                            link: link,
                            imageUrl: img?.src || '',
                            alt: img?.alt || '이미지 설명 없음'
                        };
                    })
                    .filter(item => item.imageUrl); // 이미지 URL이 있는 항목만 필터링
                
                if (thumbnails.length === 0) {
                    throw new Error('분석할 썸네일을 찾을 수 없습니다.');
                }

                statusManager.update(`총 ${thumbnails.length}개의 썸네일 발견, 분석 시작...`, 'info');
                
                const accountsSet = new Set();
                let processedCount = 0;

                // 썸네일 순차 처리
                for (const thumbnail of thumbnails) {
                    try {
                        thumbnail.link.click();
                        // 1~3초 사이의 랜덤한 딜레이 적용
                        const randomDelay = Math.floor(Math.random() * 2000) + 1000; // 1000~3000ms
                        await new Promise(resolve => setTimeout(resolve, randomDelay));

                        const popup = document.querySelector('div[role="dialog"]');
                        if (popup) {
                            // 헤더에서 계정명 추출
                            const accountHeader = popup.querySelector('header a[role="link"]');
                            const accountName = accountHeader?.textContent?.trim() || '계정명 없음';
                            
                            // 계정 정보를 Set에 추가
                            if (!accountsSet.has(accountName)) {
                                accountsSet.add(accountName);
                            }

                            // 팝업 닫기
                            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                            const closeDelay = Math.floor(Math.random() * 300) + 300;
                            await new Promise(resolve => setTimeout(resolve, closeDelay));
                        }

                        processedCount++;
                        statusManager.update(`${processedCount}/${thumbnails.length} 처리 중...`, 'info');
                    } catch (error) {
                        logger.error('썸네일 처리 중 오류:', error);
                        continue;
                    }
                }

                // 결과 테이블 생성 (썸네일 이미지 포함)
                const accountsTable = detailsContainer.querySelector('#accountsTable');
                const accounts = Array.from(accountsSet);
                
                accountsTable.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px;">
                        ${thumbnails.map(thumbnail => `
                            <div style="background: #252525; border-radius: 8px; overflow: hidden;">
                                <a href="${thumbnail.link.href}" target="_blank" style="text-decoration: none; position: relative; display: block;">
                                    <img src="${thumbnail.imageUrl}" 
                                         style="width: 100%; height: 150px; object-fit: cover;"
                                         alt="${thumbnail.alt}"
                                         title="${thumbnail.alt}"
                                    />
                                    <div style="
                                        position: absolute;
                                        bottom: 0;
                                        left: 0;
                                        right: 0;
                                        background: rgba(0,0,0,0.7);
                                        color: white;
                                        padding: 8px;
                                        font-size: 12px;
                                        white-space: nowrap;
                                        overflow: hidden;
                                        text-overflow: ellipsis;
                                    ">
                                        ${thumbnail.alt.split('by ')[1]?.split(' on')[0] || '계정명 없음'}
                                    </div>
                                </a>
                            </div>
                        `).join('')}
                    </div>
                    <table style="width: 100%; border-collapse: collapse; background: #252525; border-radius: 8px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #333;">
                                <th style="padding: 12px; text-align: left; color: #888;">No.</th>
                                <th style="padding: 12px; text-align: left; color: #888;">계정명</th>
                                <th style="padding: 12px; text-align: left; color: #888;">링크</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${accounts.map((username, index) => `
                                <tr style="border-bottom: 1px solid #333;">
                                    <td style="padding: 12px; color: #fff;">${index + 1}</td>
                                    <td style="padding: 12px; color: #fff;">${username}</td>
                                    <td style="padding: 12px;">
                                        <a href="https://www.instagram.com/${username}/" 
                                           target="_blank" 
                                           style="color: #0095f6; text-decoration: none;">
                                            프로필 보기
                                        </a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;

                statusManager.update(`분석 완료! ${accounts.length}개의 고유 계정을 찾았습니다.`, 'success');
            } catch (error) {
                logger.error('계정 분석 중 오류:', error);
                statusManager.update('계정 분석 중 오류가 발생했습니다: ' + error.message, 'error');
            }
        });
    }

    mainContent.appendChild(resultContainer);
    mainContent.appendChild(detailsContainer);
    container.appendChild(mainContent);
    container.appendChild(statusContainer);
    document.body.appendChild(container);

    // 토글 기능을 위한 이벤트 리스너 수정
    resultContainer.addEventListener('dblclick', (e) => {  // click을 dblclick으로 변경
        // 버튼 클릭 시 토글 동작 방지
        if (e.target.tagName === 'BUTTON') return;

        // 조회 결과가 있을 때만 토글 동작
        if (currentAccount) {
            if (container.style.height === '80px') {
                container.style.height = 'calc(100vh - 100px)';
                detailsContainer.style.display = 'block';
                logger.debug('패널 확장');
            } else {
                container.style.height = '80px';
                detailsContainer.style.display = 'none';
                logger.debug('패널 축소');
            }
        } else {
            logger.debug('조회 결과가 없어 토글 동작 무시');
        }
    });

    // 키보드 단축키 추가
    document.addEventListener('keydown', (e) => {
        // 'e' 또는 'E' 키를 누르면 패널을 초기 위치로 이동
        if (e.key.toLowerCase() === 'e') {
            const container = document.getElementById('account-analyzer');
            if (container) {
                // 초기 위치로 이동
                currentX = 20;  // 기본 right: 20px 위치
                currentY = 50;  // 기본 top: 50px 위치
                xOffset = currentX;
                yOffset = currentY;
                container.style.transform = `translate(${currentX}px, ${currentY}px)`;

                // 패널이 접혀있는 경우 펼치기
                if (container.style.height === '80px') {
                    container.style.height = 'calc(100vh - 100px)';
                    const detailsContainer = container.querySelector('div:nth-child(1) > div:nth-child(2)');
                    if (detailsContainer) {
                        detailsContainer.style.display = 'block';
                    }
                }

                logger.info('패널을 초기 위치로 이동');
            } else {
                // 패널이 없는 경우 새로 생성
                updateUI();
                logger.info('패널 새로 생성');
            }
        }
    });

    logger.info('UI 업데이트 완료');
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

// 프로필 이동 함수 추가
function goToProfile(username) {
    logger.info(`프로필 이동: ${username}`);
    window.open(`https://www.instagram.com/${username}/`, '_blank');
}

// goToProfile 함수를 전역 스코프에 추가
window.goToProfile = goToProfile;

initialize();