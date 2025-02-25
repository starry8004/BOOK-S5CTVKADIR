console.log("Background script loaded for YouTube to Sheets");

function sendToGoogleSheets(title, url) {
  const webAppUrl = 'https://script.google.com/macros/s/AKfycbwaxOkUfyjA573j3vxbhxmJyM9ufnd9b26NgQC_DytoVo_OPpvg6S7bNLWJ8ruDEW0U/exec'; // 실제 웹 앱 URL을 넣으세요

  fetch(webAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, url }),
  })
  .then(response => response.json())
  .then(data => {
    console.log('Success:', data);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

chrome.commands.onCommand.addListener(function(command) {
  console.log("Command received:", command);
  if (command === "collect-youtube-info") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log("Sending message to content script");
      chrome.tabs.sendMessage(tabs[0].id, {action: "getYouTubeInfo"}, function(response) {
        console.log("Response from content script:", response);
        if (response && response.title && response.url) {
          console.log("YouTube info:", response.title, response.url);
          sendToGoogleSheets(response.title, response.url);
        } else {
          console.log("No valid response received");
        }
      });
    });
  }
});
