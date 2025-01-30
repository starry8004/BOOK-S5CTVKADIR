// content.js
// 비슷한 계정 수집 및 조건 분석 코드
let collectedData = [];

// 추천 계정 리스트 수집
async function collectRecommendedAccounts() {
    const recommendedButton = document.querySelector('button[aria-label="비슷한 계정"]');
    if (!recommendedButton) {
        alert('"비슷한 계정" 버튼을 찾을 수 없습니다. 현재 계정을 확인해주세요.');
        return;
    }
    
    // 비슷한 계정 버튼 클릭
    recommendedButton.click();

    // 리스트 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 2000));

    const accounts = Array.from(document.querySelectorAll('div[role="dialog"] a[href*="/profiles/"]'));
    const accountNames = accounts.map(account => account.textContent.trim());
    alert(`${accountNames.length}개의 추천 계정을 수집했습니다.`);

    return accountNames;
}

// 데이터 저장
function saveToCSV(data) {
    const headers = ['계정명', '게시물 수', '팔로워 수', '팔로우 수', '설명 링크', '릴스 평균 조회수'];
    const csvContent = [
        headers.join(','),
        ...data.map(account => Object.values(account).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'InstaTracker_Data.csv');
    link.click();
}

// 조건 분석 및 데이터 수집
async function analyzeAccounts(accountNames) {
    for (const name of accountNames) {
        // 계정 방문 로직
        console.log(`Analyzing ${name}...`);
        // 조건 분석 로직 추가 (팔로워 수, 릴스 평균 등)
        collectedData.push({
            username: name,
            posts: 0, // 예시 데이터
            followers: 0,
            following: 0,
            bioLink: '',
            avgReelsViews: 0
        });
    }

    alert('조건 분석 완료!');
}