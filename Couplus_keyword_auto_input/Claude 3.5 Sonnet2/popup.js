document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('fileInput');
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  const statusDiv = document.getElementById('status');
  const batchSizeInput = document.getElementById('batchSizeInput');
  const progressText = document.getElementById('progressText');
  const keywordsPreview = document.getElementById('keywordsPreview');
  
  let keywords = [];
  
  function updateStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? 'error' : 'success';
  }
  
  function updateKeywordsPreview() {
    if (keywords.length > 0) {
      keywordsPreview.textContent = `추출된 키워드 (${keywords.length}개):\n${keywords.join(', ')}`;
    } else {
      keywordsPreview.textContent = '';
    }
  }
  
  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        // CSV 파일을 줄 단위로 분리하고, 각 줄에서 쉼표를 기준으로 두 번째 열(인덱스 1)을 키워드로 추출
        const lines = text.split('\n').map(line => line.trim());
        // 헤더 행 제거 후 키워드 추출 (CSV 형식에 따라 필요하면 수정)
        keywords = lines.slice(1)
          .map(line => line.split(',')[1])
          .filter(Boolean);
      }
      
      updateStatus(`${keywords.length}개의 키워드를 불러왔습니다.`);
      updateKeywordsPreview();
    } catch (error) {
      updateStatus(`파일 읽기 오류: ${error.message}`, true);
      keywords = [];
      updateKeywordsPreview();
    }
  });
  
  startButton.addEventListener('click', function() {
    if (keywords.length === 0) {
      updateStatus('먼저 파일을 선택해주세요.', true);
      return;
    }
    
    const batchSize = parseInt(batchSizeInput.value);
    if (isNaN(batchSize) || batchSize < 1) {
      updateStatus('올바른 다운로드 단위를 입력해주세요.', true);
      return;
    }
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url;
      if (!currentUrl.includes('couplus.co.kr/keyword')) {
        updateStatus('COUPLUS 키워드 분석 페이지에서 실행해주세요.', true);
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startSearch',
        keywords: keywords,
        batchSize: batchSize
      });
      
      updateStatus('검색이 시작되었습니다.');
    });
  });
  
  stopButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stopSearch' });
    });
    updateStatus('검색이 중지되었습니다.');
  });
  
  // 진행 상황 업데이트 메시지 수신
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateProgress') {
      progressText.textContent = `${request.current}/${request.total}`;
    } else if (request.action === 'searchComplete') {
      updateStatus(request.message);
    } else if (request.action === 'searchError') {
      updateStatus(request.message, true);
    }
  });
});
