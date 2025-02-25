chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.action === "collect_data") {
    let title = document.title;
    let url = window.location.href;
    console.log('Title:', title, 'URL:', url);
    sendToGoogleSheets(title, url);
  }
});

function sendToGoogleSheets(title, url) {
  console.log('Sending data to Google Sheets');
  fetch('https://script.google.com/macros/s/AKfycbxRG5edScSU3OypWLN8g8Mc95tCbH44zrWIrCtUKsRwBOlQavMZeTTf2iDZi7e68w1K/exec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: title, url: url }),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    console.log('Success:', data);
    alert('Data successfully sent to Google Sheets');
  })
  .catch((error) => {
    console.error('Error:', error);
    alert('Failed to send data to Google Sheets: ' + error.message);
  });
}
