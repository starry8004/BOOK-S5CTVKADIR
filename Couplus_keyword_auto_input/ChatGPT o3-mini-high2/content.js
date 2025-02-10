// content.js
(function() {
    /*************** 플로팅 패널 UI 생성 ******************/
    let floatingPanel = document.createElement("div");
    floatingPanel.id = "floatingPanel";
    // 패널 스타일 설정
    floatingPanel.style.position = "fixed";
    floatingPanel.style.top = "20px";
    floatingPanel.style.right = "20px";
    floatingPanel.style.width = "320px";
    floatingPanel.style.backgroundColor = "#fff";
    floatingPanel.style.border = "1px solid #ccc";
    floatingPanel.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
    floatingPanel.style.padding = "10px";
    floatingPanel.style.zIndex = "99999";
    floatingPanel.style.fontFamily = "sans-serif";
    floatingPanel.innerHTML = `
      <div id="panelHeader" style="font-weight: bold; margin-bottom: 10px;">
        <span>COUPLUS 키워드 검색 도구</span>
        <button id="closePanel" style="float: right;">X</button>
      </div>
      <div id="panelContent">
        <div class="container" style="margin-bottom: 8px;">
          <input type="file" id="fileInput" accept=".csv" />
        </div>
        <div class="container" style="margin-bottom: 8px;">
          <label>자동 다운로드 단위: <input type="number" id="batchSizeInput" value="10" min="1" style="width:60px;"></label>
        </div>
        <div class="container" style="margin-bottom: 8px;">
          <button id="startButton" style="width: 48%;">검색 시작</button>
          <button id="stopButton" style="width: 48%;">중지</button>
        </div>
        <div id="status" style="margin-top: 10px; padding: 5px; border-radius: 4px;"></div>
        <div class="progress" style="margin-top: 5px;">진행률: <span id="progressText">0/0</span></div>
        <div class="keywords-preview" id="keywordsPreview" style="margin-top: 10px; max-height: 100px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; font-size: 12px;"></div>
      </div>
    `;
    document.body.appendChild(floatingPanel);
  
    // 패널 닫기 버튼 이벤트
    document.getElementById("closePanel").addEventListener("click", () => {
      floatingPanel.style.display = "none";
    });
  
    /*************** 파일 읽기 및 검색 관련 변수 및 함수 ***************/
    let isSearching = false;
    let currentKeywords = [];
    let currentIndex = 0;
    let batchSize = 10;
    let isProcessing = false;
  
    // 딜레이 함수 (Promise 기반)
    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    // 지정한 선택자에 해당하는 요소를 재시도하며 찾는 함수
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
  
    // MutationObserver로 검색 결과 감지 (예: "Showing 1 to 5 of 5 entries")
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const showingEl = document.querySelector(SELECTORS.SHOWING_TEXT);
        if (
          showingEl &&
          showingEl.textContent.includes('Showing') &&
          !showingEl.textContent.includes('Showing 0 to 0 of 0 entries')
        ) {
          console.log("검색 결과 감지됨.");
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
        console.log("결과 테이블을 찾지 못했습니다.");
      }
    }
  
    // 현재 키워드에 대해 검색을 진행하는 함수
    async function processNextKeyword() {
      if (!isSearching || isProcessing || currentIndex >= currentKeywords.length) return;
      try {
        console.log("현재 인덱스:", currentIndex);
        const searchInput = await findElement(SELECTORS.SEARCH_INPUT);
        console.log("검색 입력 필드:", searchInput);
        isProcessing = true;
  
        // 입력 필드에 포커스 주기
        searchInput.focus();
  
        // 현재 키워드 입력 및 이벤트 전파
        searchInput.value = currentKeywords[currentIndex];
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log("키워드 입력됨:", currentKeywords[currentIndex]);
        await delay(300);
  
        // Enter 키 이벤트들을 순차적으로 시뮬레이션
        const keydownEvent = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, code: 'Enter', bubbles: true });
        searchInput.dispatchEvent(keydownEvent);
        const keypressEvent = new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, code: 'Enter', bubbles: true });
        searchInput.dispatchEvent(keypressEvent);
        const keyupEvent = new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, code: 'Enter', bubbles: true });
        searchInput.dispatchEvent(keyupEvent);
        console.log("Enter 이벤트 전파됨.");
        
        currentIndex++;
        document.getElementById("progressText").textContent = `${currentIndex}/${currentKeywords.length}`;
  
        // fallback 타이머: 10초 내에 결과 감지가 없으면 다음 키워드 진행
        delay(10000).then(() => {
          if (isSearching && isProcessing) {
            console.log("Fallback: 다음 키워드로 넘어갑니다.");
            onSearchComplete();
          }
        });
        
      } catch (error) {
        console.error("processNextKeyword 오류:", error);
        isProcessing = false;
      }
    }
  
    // 결과 감지 후 처리 및 다음 키워드 진행
    async function onSearchComplete() {
      isProcessing = false;
      console.log("검색 완료 콜백 실행.");
      
      // 배치 단위마다 다운로드 버튼 클릭 (다운로드 선택자가 맞으면 작동)
      if (currentIndex > 0 && currentIndex % batchSize === 0) {
        const downloadButton = document.querySelector(SELECTORS.DOWNLOAD_BUTTON);
        if (downloadButton) {
          downloadButton.click();
          console.log("다운로드 버튼 클릭됨.");
          await delay(1000);
        } else {
          console.log("다운로드 버튼을 찾지 못했습니다.");
        }
      }
      
      if (isSearching && currentIndex < currentKeywords.length) {
        processNextKeyword();
      } else if (currentIndex >= currentKeywords.length) {
        document.getElementById("status").textContent = "모든 키워드 검색 완료.";
        isSearching = false;
        observer.disconnect();
      }
    }
  
    /*************** 파일 선택 및 버튼 이벤트 처리 (팝업 기능 통합) ***************/
    let keywords = []; // CSV에서 읽은 키워드 배열
  
    function updateStatus(message, isError = false) {
      const statusDiv = document.getElementById("status");
      statusDiv.textContent = message;
      statusDiv.style.backgroundColor = isError ? "#ffe6e6" : "#e6ffe6";
      statusDiv.style.color = isError ? "#cc0000" : "#006600";
    }
  
    function updateKeywordsPreview() {
      const preview = document.getElementById("keywordsPreview");
      if (keywords.length > 0) {
        preview.textContent = `추출된 키워드 (${keywords.length}개):\n${keywords.join(', ')}`;
      } else {
        preview.textContent = "";
      }
    }
  
    // 파일 선택 이벤트
    document.getElementById("fileInput").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        if (file.name.endsWith(".csv")) {
          const text = await file.text();
          const lines = text.split("\n").map(line => line.trim());
          // CSV의 첫 줄은 헤더라고 가정하고, 두 번째 열(인덱스 1)을 키워드로 추출 (구조에 맞게 수정)
          keywords = lines.slice(1)
            .map(line => line.split(",")[1])
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
  
    // 검색 시작 버튼 이벤트
    document.getElementById("startButton").addEventListener("click", () => {
      if (keywords.length === 0) {
        updateStatus("먼저 파일을 선택해주세요.", true);
        return;
      }
      // 검색 시작 시 배치 단위 값 설정
      batchSize = parseInt(document.getElementById("batchSizeInput").value);
      if (isNaN(batchSize) || batchSize < 1) {
        updateStatus("올바른 다운로드 단위를 입력해주세요.", true);
        return;
      }
      // 만약 검색 중이면 새로 시작하지 않음
      if (isSearching) {
        updateStatus("검색이 이미 진행 중입니다.");
        return;
      }
      // 검색 데이터를 content.js 내부 변수에 저장
      isSearching = true;
      currentKeywords = keywords; // 이미 CSV에서 추출한 키워드 배열
      currentIndex = 0;
      isProcessing = false;
      document.getElementById("progressText").textContent = `0/${currentKeywords.length}`;
      updateStatus("검색 시작됨.");
      console.log("검색 시작:", currentKeywords);
      startObserver();
      processNextKeyword();
    });
  
    // 검색 중지 버튼 이벤트
    document.getElementById("stopButton").addEventListener("click", () => {
      isSearching = false;
      isProcessing = false;
      observer.disconnect();
      updateStatus("검색 중지됨.");
    });
  
  })();  