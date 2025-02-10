// content.js
(function() {
    // --- 플로팅 패널 생성 및 스타일 설정 ---
    let floatingPanel = document.createElement("div");
    floatingPanel.id = "myFloatingPanel";
    floatingPanel.style.position = "fixed";
    floatingPanel.style.top = "50px";
    floatingPanel.style.right = "0";
    floatingPanel.style.width = "300px";
    floatingPanel.style.backgroundColor = "#fff";
    floatingPanel.style.border = "1px solid #ccc";
    floatingPanel.style.zIndex = "9999";
    floatingPanel.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
    floatingPanel.style.fontFamily = "sans-serif";
    floatingPanel.innerHTML = `
      <div id="panelHeader" style="background: #f1f1f1; padding: 5px; display: flex; justify-content: space-between; align-items: center; cursor: move;">
        <span>Search Assistant</span>
        <button id="toggleButton" style="font-size: 12px;">닫기</button>
      </div>
      <div id="panelContent" style="padding: 10px;">
        <div id="searchStatus">대기중...</div>
        <div id="searchProgress">진행률: 0/0</div>
      </div>
    `;
    document.body.appendChild(floatingPanel);
  
    // --- 패널 열기/닫기 토글 버튼 처리 ---
    document.getElementById("toggleButton").addEventListener("click", function() {
      let panelContent = document.getElementById("panelContent");
      if (panelContent.style.display === "none") {
        panelContent.style.display = "block";
        this.textContent = "닫기";
      } else {
        panelContent.style.display = "none";
        this.textContent = "열기";
      }
    });
  
    // --- 검색 자동화 관련 변수 및 함수 ---
    let isSearching = false;
    let currentKeywords = [];
    let currentIndex = 0;
    let batchSize = 10;
    let isProcessing = false;
  
    // 딜레이 함수
    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    // 지정한 선택자에 해당하는 요소를 재시도하며 찾는 함수 (최대 20회 시도, 총 최대 10초)
    async function findElement(selector, maxAttempts = 20, interval = 500) {
      for (let i = 0; i < maxAttempts; i++) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Element found for ${selector}`);
          return element;
        }
        await delay(interval);
      }
      throw new Error(`Element not found: ${selector}`);
    }
  
    // MutationObserver를 사용해 결과 테이블 내의 변화 감지
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const showingEl = document.querySelector(SELECTORS.SHOWING_TEXT);
        if (
          showingEl &&
          showingEl.textContent.includes('Showing') &&
          !showingEl.textContent.includes('Showing 0 to 0 of 0 entries')
        ) {
          console.log("Search complete detected by MutationObserver");
          onSearchComplete();
          break;
        }
      }
    });
  
    function startObserver() {
      const table = document.querySelector(SELECTORS.RESULTS_TABLE);
      if (table) {
        observer.observe(table, { childList: true, subtree: true });
      } else {
        console.log("Results table not found when starting observer.");
      }
    }
  
    // 현재 키워드에 대해 검색을 진행하는 함수
    async function processNextKeyword() {
      if (!isSearching || isProcessing) return;
      try {
        console.log("Processing keyword index:", currentIndex);
        const searchInput = await findElement(SELECTORS.SEARCH_INPUT);
        console.log("Search input element:", searchInput);
        isProcessing = true;
        
        // 명시적으로 포커스를 줍니다.
        searchInput.focus();
        
        // 현재 키워드 입력
        searchInput.value = currentKeywords[currentIndex];
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log("Keyword entered:", currentKeywords[currentIndex]);
        await delay(300);  // 약간의 지연을 더 추가합니다.
        
        // Enter 키 이벤트들을 순서대로 시뮬레이션
        const keydownEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          code: 'Enter',
          bubbles: true
        });
        searchInput.dispatchEvent(keydownEvent);
        
        const keypressEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          keyCode: 13,
          code: 'Enter',
          bubbles: true
        });
        searchInput.dispatchEvent(keypressEvent);
        
        const keyupEvent = new KeyboardEvent('keyup', {
          key: 'Enter',
          keyCode: 13,
          code: 'Enter',
          bubbles: true
        });
        searchInput.dispatchEvent(keyupEvent);
        console.log("Enter key events dispatched.");
        
        currentIndex++;
        document.getElementById("searchProgress").textContent = `진행률: ${currentIndex}/${currentKeywords.length}`;
      } catch (error) {
        console.error("Error in processNextKeyword:", error);
      }
    }
  
    // 검색 결과 감지 후 처리 (배치 단위 다운로드 처리 포함)
    async function onSearchComplete() {
      isProcessing = false;
      console.log("Search complete callback triggered.");
      
      // 배치 단위마다 다운로드 버튼 클릭
      if (currentIndex % batchSize === 0) {
        const downloadButton = document.querySelector(SELECTORS.DOWNLOAD_BUTTON);
        if (downloadButton) {
          downloadButton.click();
          console.log("Download button clicked.");
          await delay(1000);
        } else {
          console.log("Download button not found.");
        }
      }
      
      if (isSearching && currentIndex < currentKeywords.length) {
        processNextKeyword();
      } else if (currentIndex >= currentKeywords.length) {
        document.getElementById("searchStatus").textContent = "모든 키워드 검색이 완료되었습니다.";
        isSearching = false;
        observer.disconnect();
      }
    }
  
    // --- 팝업 또는 백그라운드 스크립트에서 전송된 메시지 처리 ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'startSearch') {
        isSearching = true;
        currentKeywords = request.keywords;
        batchSize = request.batchSize;
        currentIndex = 0;
        isProcessing = false;
        document.getElementById("searchStatus").textContent = "검색 시작됨";
        document.getElementById("searchProgress").textContent = `진행률: 0/${currentKeywords.length}`;
        console.log("Start search message received:", currentKeywords);
        startObserver();
        processNextKeyword();
      } else if (request.action === 'stopSearch') {
        isSearching = false;
        isProcessing = false;
        observer.disconnect();
        document.getElementById("searchStatus").textContent = "검색 중지됨";
      }
    });
  })();
  