chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  if (command === "collect_data") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('Sending message to content script');
      chrome.tabs.sendMessage(tabs[0].id, { action: "collect_data" });
    });
  }
});
