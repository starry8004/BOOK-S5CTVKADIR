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
          const lines = text.split('\n').map(line => line.trim());
          
          // 헤더 제거하고 키워드만 추출
          keywords = lines
            .slice(1)  // 헤더 행 제거
            .filter((_, index) => index % 2 === 1)  // 키워드 행만 선택
            .filter(Boolean);  // 빈 값 제거
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data, {
            cellDates: true,
            cellText: false,
            raw: true
          });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { 
            header: 1,
            defval: '',
            blankrows: false
          });
          
          // 헤더 제거 후 키워드만 추출
          keywords = rows
            .slice(1)  // 헤더 행 제거
            .filter((_, index) => index % 2 === 1)  // 키워드 행만 선택
            .map(row => row[1])  // '타겟키워드' 열의 값만 추출
            .filter(Boolean);  // 빈 값 제거
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
    
    // 메시지 리스너
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