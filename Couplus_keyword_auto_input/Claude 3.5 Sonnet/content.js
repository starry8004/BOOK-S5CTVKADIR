let isSearching = false;
let currentKeywords = [];
let currentIndex = 0;
let batchSize = 10;
let isProcessing = false;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// 요소 찾기 함수 (재시도 로직 포함)
async function findElement(selector, maxAttempts = 5, interval = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    const element = document.querySelector(selector);
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Element not found: ${selector}`);
}

// 검색 완료 감지를 위한 MutationObserver 설정
const searchCompleteObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    try {
      // 1. 테이블 변경 확인
      const tableChanged = mutation.type === 'childList' && 
                          mutation.target.matches(SELECTORS.RESULTS_TABLE);
      
      // 2. "Showing" 텍스트 확인
      const showingText = document.querySelector(SELECTORS.SHOWING_TEXT)?.textContent || '';
      const resultsLoaded = showingText.includes('Showing') && 
                           !showingText.includes('Showing 0 to 0 of 0 entries');
      
      // 3. 에러 메시지 확인
      const errorElement = document.querySelector(SELECTORS.ERROR_MESSAGE);
      const hasError = errorElement && errorElement.style.display !== 'none';
      
      if (hasError) {
        handleSearchError();
      } else if (tableChanged && resultsLoaded) {
        onSearchComplete();
        break;
      }
    } catch (error) {
      console.error('Observer error:', error);
      handleSearchError();
    }
  }
});

// 검색 에러 처리
async function handleSearchError() {
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    console.log(`Retrying search (${retryCount}/${MAX_RETRIES})...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    await processNextKeyword();
  } else {
    retryCount = 0;
    isProcessing = false;
    reportError(`키워드 "${currentKeywords[currentIndex]}" 검색 실패`);
    currentIndex++;
    processNextKeyword();
  }
}

// 검색 완료 후 처리
async function onSearchComplete() {
  if (!isProcessing) return;
  
  try {
    isProcessing = false;
    retryCount = 0;

    // 현재 검색이 배치 크기에 도달했는지 확인
    if (currentIndex % batchSize === 0) {
      await checkAndClickDownload();
    }

    // 다음 검색 시작
    if (isSearching && currentIndex < currentKeywords.length) {
      await processNextKeyword();
    } else if (currentIndex >= currentKeywords.length) {
      // 모든 검색 완료
      chrome.runtime.sendMessage({ 
        action: 'searchComplete',
        message: '모든 키워드 검색이 완료되었습니다.'
      });
      isSearching = false;
    }
  } catch (error) {
    console.error('Search completion error:', error);
    handleSearchError();
  }
}

// 다음 키워드 처리
async function processNextKeyword() {
  if (isProcessing || !isSearching) return;

  try {
    const searchInput = await findElement(SELECTORS.SEARCH_INPUT);
    const searchButton = await findElement(SELECTORS.SEARCH_BUTTON);
    
    if (searchInput && searchButton) {
      isProcessing = true;
      
      // 입력 필드 클리어 및 새 키워드 입력
      searchInput.value = '';
      await new Promise(resolve => setTimeout(resolve, 100));
      searchInput.value = currentKeywords[currentIndex];
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 약간의 지연 후 검색 버튼 클릭
      await new Promise(resolve => setTimeout(resolve, 200));
      searchButton.click();
      
      // 진행상황 업데이트
      chrome.runtime.sendMessage({
        action: 'updateProgress',
        current: currentIndex + 1,
        total: currentKeywords.length
      });
    }
  } catch (error) {
    console.error('Process keyword error:', error);
    handleSearchError();
  }
}
