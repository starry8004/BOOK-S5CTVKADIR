// 감시할 대상: document.body 전체
const targetNode = document.body;

// 감시 옵션: 자식 노드의 추가/삭제 및 하위 트리까지 감시
const config = { childList: true, subtree: true };

// 콜백 함수: DOM에 변화가 생기면 호출됩니다.
const callback = function(mutationsList, observer) {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      // 페이지 내 모든 텍스트 요소 중 "Showing"과 "entries"가 포함된 요소를 찾습니다.
      const showingElements = document.querySelectorAll("div, span, p, td");
      showingElements.forEach(element => {
        if (element.innerText && element.innerText.includes("Showing") && element.innerText.includes("entries")) {
          console.log("검색 결과가 완전히 로드되었습니다:", element.innerText);
          // 여기서 필요한 동작을 추가할 수 있습니다.
          // 예를 들어, 다음 키워드 검색을 자동으로 진행하는 함수 호출 등

          // 만약 한 번 감지 후 더 이상 감시할 필요가 없다면 observer를 중지합니다.
          observer.disconnect();
        }
      });
    }
  }
};

// MutationObserver 생성 후, 대상 노드와 옵션으로 감시 시작
const observer = new MutationObserver(callback);
observer.observe(targetNode, config);
