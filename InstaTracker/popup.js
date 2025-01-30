// ========================= popup.js =========================
// 팝업에서 버튼 클릭 이벤트 처리
document.getElementById('startAnalysis').addEventListener('click', async () => {
    const accountNames = await collectRecommendedAccounts();
    await analyzeAccounts(accountNames);
});

document.getElementById('saveData').addEventListener('click', () => {
    saveToCSV(collectedData);
});