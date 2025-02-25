function doPost(e) {
    try {
      Logger.log("Request received: " + JSON.stringify(e));
      var contents = e.postData && e.postData.contents ? e.postData.contents : null;
      if (!contents) {
        Logger.log("No contents received");
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No data received' }))
                             .setMimeType(ContentService.MimeType.JSON);
      }
  
      var data = JSON.parse(contents);
      var sheet = SpreadsheetApp.openById("1H6ZW6T5DnlOURSJhyJlt5UhJj38Xc_xBQhIg6c_vcw8").getActiveSheet();
      sheet.appendRow([data.title, data.url]);
  
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
                           .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      Logger.log("Error: " + error.message);
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
  }
  