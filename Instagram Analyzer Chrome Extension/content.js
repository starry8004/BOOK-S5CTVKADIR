// content.js
let currentAccount = null;
let collectedData = [];

// 숫자 변환 함수 (예: "1.5만" -> 15000)
function parseNumber(text) {
  if (!text) return 0;
  text = text.replace(/,/g, '');
  if (text.includes('만')) {
    return parseFloat(text.replace('만', '')) * 10000;
  } else if (text.includes('천')) {
    return parseFloat(text.replace('천', '')) * 1000;
  }
  return parseFloat(text);
}

// 계정 정보 수집
async function collectAccountInfo() {
  try {
    // 기본 정보 수집
    const username = document.querySelector('._aa_c').textContent;
    const stats = Array.from(document.querySelectorAll('._ac2a'));
    const posts = stats[0].textContent;
    const followers = stats[1].textContent;
    const following = stats[2].textContent;
    const bio = document.querySelector('._aa_c').textContent;

    // 릴스 조회수 수집
    const reelsViews = await collectReelsViews();

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

    // UI 업데이트
    updateUI();
  } catch (error) {
    console.error('Error collecting account info:', error);
  }
}

// 릴스 조회수 수집
async function collectReelsViews() {
  try {
    const reelsTab = document.querySelector('a[href*="/reels/"]');
    if (!reelsTab) return 0;

    reelsTab.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const viewCounts = Array.from(document.querySelectorAll('.view-count'))
      .slice(0, 9)
      .map(el => parseNumber(el.textContent.replace('조회수 ', '').replace('회', '')))
      .filter(count => !isNaN(count));

    return viewCounts.length ? 
      viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length : 0;
  } catch (error) {
    console.error('Error collecting reels views:', error);
    return 0;
  }
}

// 데이터 저장
function saveData() {
  if (!currentAccount) return;
  
  collectedData.push(currentAccount);
  
  // CSV 형식으로 변환
  const csv = convertToCSV(collectedData);
  
  // 다운로드
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'instagram_accounts.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// CSV 변환
function convertToCSV(data) {
  const headers = ['username', 'posts', 'followers', 'following', 'bio', 'avgReelsViews', 'collectedAt'];
  const rows = data.map(account => 
    headers.map(header => JSON.stringify(account[header])).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// UI 업데이트를 위한 요소 생성
function createUI() {
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
  `;
  document.body.appendChild(container);
  return container;
}

// UI 업데이트
function updateUI() {
  let container = document.getElementById('account-analyzer');
  if (!container) {
    container = createUI();
  }

  if (!currentAccount) {
    container.innerHTML = '<p>계정을 분석하려면 Q를 누르세요</p>';
    return;
  }

  container.innerHTML = `
    <h3>${currentAccount.username}</h3>
    <p>팔로워: ${currentAccount.followers}</p>
    <p>평균 릴스 조회수: ${currentAccount.avgReelsViews.toLocaleString()}</p>
    <p style="color: ${currentAccount.meetsRequirements ? 'green' : 'red'}">
      ${currentAccount.meetsRequirements ? '✅ 조건 충족' : '❌ 조건 미달'}
    </p>
    <button onclick="saveData()">데이터 저장 (W)</button>
  `;
}

// 키보드 이벤트 리스너
document.addEventListener('keydown', (e) => {
  if (e.key === 'q' || e.key === 'Q') {
    collectAccountInfo();
  } else if (e.key === 'w' || e.key === 'W') {
    saveData();
  }
});

// 초기 UI 생성
createUI();
