console.log("Content script loaded for YouTube to Sheets");

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received in content script:", request);
  if (request.action === "getYouTubeInfo") {
    let title = document.querySelector('meta[property="og:title"]')?.content || document.title;
    let url = window.location.href;
    console.log("Extracted YouTube info:", {title, url});
    sendResponse({title: title, url: url});
  }
});