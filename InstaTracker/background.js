chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'start-analysis') {
        const accountNames = await collectRecommendedAccounts();
        await analyzeAccounts(accountNames);
    } else if (command === 'save-data') {
        saveToCSV(collectedData);
    }
});
