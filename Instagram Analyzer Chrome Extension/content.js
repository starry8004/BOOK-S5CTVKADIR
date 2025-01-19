// content.js
let currentAccount = null;
let collectedData = [];
let isUIVisible = true;

// 디버깅을 위한 로그 함수
function log(message) {
    console.log(`[Instagram Analyzer] ${message}`);
}

// 숫자 변환 함수 (예: "1.5만" -> 15000)
function parseNumber(text) {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.includes('만')) {
        return parseFloat(text.replace('만', '')) * 10000;
    } else if (text.includes('천')) {
        return parseFloat(text.replace('천', '')) * 1000;
    }
    return parseFloat(text || '0');
}

// 상태 업데이트 함수
function updateStatus(message, type = 'info') {
    const statusContainer = document.getElementById('analysis-status');
    if (!statusContainer) return;

    statusContainer.style.display = 'block';
    statusContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'}">●</span>
            <span>${message}</span>
        </div>
    `;

    // 성공/에러 메시지는 3초 후 사라짐
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusContainer.style.display = 'none';
        }, 3000);
    }
}

// 계정 정보 수집
async function collectAccountInfo() {
    try {
        log('분석 시작...');
        updateStatus('계정 정보 수집 중...', 'info');
        
        // 게시물, 팔로워, 팔로잉 수 찾기
        const stats = document.querySelectorAll('span._ac2a');
        if (!stats || stats.length < 3) {
            throw new Error('통계 정보를 찾을 수 없습니다');
        }

        updateStatus('팔로워/팔로잉 정보 분석 중...', 'info');
        const posts = stats[0].textContent;
        const followers = stats[1].textContent;
        const following = stats[2].textContent;
        
        // 사용자 이름
        const username = document.querySelector('h2._aacl._aacs._aact._aacx._aad7').textContent;
        
        // 계정 설명
        const bio = document.querySelector('div._aa_c')?.textContent || '';

        // 릴스 탭으로 이동
        updateStatus('릴스 데이터 수집 중...', 'info');
        log('릴스 탭 찾는 중...');
        const reelsTab = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/reels'));
        if (reelsTab) {
            reelsTab.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 릴스 조회수 수집
        const viewElements = document.querySelectorAll('span.x1lliihq');
        const views = Array.from(viewElements)
            .filter(el => el.textContent.includes('회'))
            .slice(0, 9)
            .map(el => {
                const text = el.textContent.replace('조회수 ', '').replace('회', '');
                return parseNumber(text);
            })
            .filter(count => !isNaN(count) && count > 0);

        const avgReelsViews = views.length ? views.reduce((a, b) => a + b, 0) / views.length : 0;
        log(`평균 릴스 조회수: ${avgReelsViews}`);

        // 조건 체크
        const followersCount = parseNumber(followers);
        const meetsRequirements = followersCount >= 10000 && avgReelsViews >= 10000;

        currentAccount = {
            username,
            posts,
            followers,
            following,
            bio,
            avgReelsViews,
            collectedAt: new Date().toISOString(),
            meetsRequirements
        };

        updateStatus('분석 완료!', 'success');
        log('데이터 수집 완료');
        updateUI();
    } catch (error) {
        updateStatus(`오류 발생: ${error.message}`, 'error');
        log(`오류 발생: ${error.message}`);
        console.error('Error collecting account info:', error);
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
        background: #1a1a1a;
        color: #ffffff;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        min-width: 280px;
        border: 1px solid #333;
        transition: transform 0.3s ease, opacity 0.3s ease;
        ${!isUIVisible ? 'transform: translateX(calc(100% + 20px));' : ''}
    `;

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
    `;
    toggleButton.onclick = () => {
        isUIVisible = !isUIVisible;
        updateUI();
    };
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

    if (!currentAccount) {
        container.innerHTML += `
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
        container.innerHTML += `
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

    container.appendChild(statusContainer);
    document.body.appendChild(container);
}

// 데이터 저장
function saveData() {
    if (!currentAccount) {
        log('저장할 데이터가 없습니다');
        updateStatus('저장할 데이터가 없습니다', 'error');
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
    
    updateStatus('데이터 저장 완료!', 'success');
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

// 전역 함수로 등록
window.saveData = saveData;

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

// 키보드 이벤트 리스너
document.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'Q') {
        log('분석 시작 단축키 감지됨');
        showKeyPressNotification('⌨️ 계정 분석 시작...');
        collectAccountInfo();
    } else if (e.key === 'w' || e.key === 'W') {
        log('데이터 저장 단축키 감지됨');
        showKeyPressNotification('⌨️ 데이터 저장 중...');
        saveData();
    }
});

// 초기 UI 생성
log('확장 프로그램 초기화');
updateUI();