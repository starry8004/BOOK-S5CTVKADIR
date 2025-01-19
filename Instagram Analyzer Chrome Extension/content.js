// content.js
let currentAccount = null;
let collectedData = [];

// 디버깅을 위한 로그 함수
function log(message) {
    console.log(`[Instagram Analyzer] ${message}`);
}

// 숫자 변환 함수 (예: "1.5만" -> 15000)
function parseNumber(text) {
    if (!text) return 0;
    text = text.replace(/,/g, '');
    if (text.includes('만')) {
        return parseFloat(text.replace('만', '')) * 10000;
    } else if (text.includes('천')) {
        return parseFloat(text.replace('천', '')) * 1000;
    }
    return parseFloat(text || '0');
}

// 계정 정보 수집
async function collectAccountInfo() {
    try {
        log('분석 시작...');
        
        // 헤더 섹션 찾기
        const headerSection = document.querySelector('header section');
        if (!headerSection) {
            throw new Error('헤더 섹션을 찾을 수 없습니다');
        }

        // 사용자 이름
        const username = headerSection.querySelector('h2')?.textContent;
        if (!username) {
            throw new Error('사용자 이름을 찾을 수 없습니다');
        }

        // 통계 수집 (게시물, 팔로워, 팔로잉)
        const statsItems = Array.from(headerSection.querySelectorAll('li'));
        if (statsItems.length < 3) {
            throw new Error('통계 정보를 찾을 수 없습니다');
        }

        const stats = statsItems.map(item => item.textContent);
        const posts = stats[0]?.split(' ')[0];
        const followers = stats[1]?.split(' ')[0];
        const following = stats[2]?.split(' ')[0];

        // 계정 설명
        const bio = headerSection.querySelector('h1')?.textContent || '';

        // 릴스 조회수 수집
        const reelsViews = await collectReelsViews();
        log(`릴스 평균 조회수: ${reelsViews}`);

        // 조건 체크
        const followersCount = parseNumber(followers);
        const avgReelsViews = reelsViews;
        const meetsRequirements = followersCount >= 10000 && avgReelsViews >= 10000;

        currentAccount = {
            username,
            posts,
            followers,
            following,
            bio,
            avgReelsViews: reelsViews,
            collectedAt: new Date().toISOString(),
            meetsRequirements
        };

        log('데이터 수집 완료');
        updateUI();
    } catch (error) {
        log(`오류 발생: ${error.message}`);
        console.error('Error collecting account info:', error);
    }
}

// 릴스 조회수 수집
async function collectReelsViews() {
    try {
        // 릴스 탭 찾기
        log('릴스 탭 찾는 중...');
        const reelsTab = document.querySelector('a[href*="/reels/"]');
        if (!reelsTab) {
            log('릴스 탭을 찾을 수 없습니다');
            return 0;
        }

        // 릴스 탭 클릭
        reelsTab.click();
        log('릴스 탭 클릭됨, 로딩 대기 중...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 조회수 수집
        const viewTexts = Array.from(document.querySelectorAll('span'))
            .filter(span => span.textContent.includes('회'));

        const views = viewTexts
            .slice(0, 9)
            .map(span => {
                const text = span.textContent.replace('조회수 ', '').replace('회', '');
                return parseNumber(text);
            })
            .filter(count => !isNaN(count) && count > 0);

        log(`수집된 릴스 수: ${views.length}`);
        
        return views.length ? views.reduce((a, b) => a + b, 0) / views.length : 0;
    } catch (error) {
        log(`릴스 조회수 수집 중 오류: ${error.message}`);
        return 0;
    }
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
    container.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    if (!currentAccount) {
        container.innerHTML = '<p>계정을 분석하려면 Q를 누르세요</p>';
    } else {
        container.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">${currentAccount.username}</h3>
            <div style="margin: 5px 0;">팔로워: ${currentAccount.followers}</div>
            <div style="margin: 5px 0;">평균 릴스 조회수: ${Math.round(currentAccount.avgReelsViews).toLocaleString()}</div>
            <div style="margin: 10px 0; padding: 5px; background: ${currentAccount.meetsRequirements ? '#e8f5e9' : '#ffebee'}; border-radius: 4px;">
                ${currentAccount.meetsRequirements ? '✅ 조건 충족' : '❌ 조건 미달'}
            </div>
            <button onclick="saveData()" style="
                width: 100%;
                padding: 8px;
                background: #0095f6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">데이터 저장 (W)</button>
        `;
    }

    document.body.appendChild(container);
}

// 데이터 저장
function saveData() {
    if (!currentAccount) {
        log('저장할 데이터가 없습니다');
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
    
    log('데이터 저장 완료');
}

// CSV 변환
function convertToCSV(data) {
    const headers = ['username', 'posts', 'followers', 'following', 'bio', 'avgReelsViews', 'collectedAt', 'meetsRequirements'];
    const rows = data.map(account => 
        headers.map(header => JSON.stringify(account[header] || '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

// 키보드 이벤트 리스너
document.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'Q') {
        log('분석 시작 단축키 감지됨');
        collectAccountInfo();
    } else if (e.key === 'w' || e.key === 'W') {
        log('데이터 저장 단축키 감지됨');
        saveData();
    }
});

// 초기 UI 생성
log('확장 프로그램 초기화');
updateUI();