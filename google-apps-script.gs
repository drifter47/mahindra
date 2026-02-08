/**
 * Mahindra Order Taking Form - Google Apps Script
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any code in the editor and paste this entire script
 * 4. Click 'Deploy' > 'New deployment'
 * 5. Select Type: 'Web app'
 * 6. Set 'Execute as': 'Me'
 * 7. Set 'Who has access': 'Anyone'
 * 8. Click 'Deploy' and copy the Web App URL
 * 9. Replace YOUR_GOOGLE_APPS_SCRIPT_URL_HERE in script.js with the URL
 * 
 * UPDATE: Each item is now stored as a separate row for easy searching!
 */

// Sheet configuration
const SHEET_NAME = 'Orders'; // Name of the sheet tab
const PHOTOS_FOLDER_NAME = 'OTF_Photos'; // Folder name for storing photos in Google Drive

/**
 * Handle GET requests - Retrieve orders
 */
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse([]);
    }
    
    const headers = data[0];
    const orders = data.slice(1).map(row => {
      const order = {};
      headers.forEach((header, index) => {
        order[header] = row[index];
      });
      return order;
    }).reverse(); // Most recent first
    
    return createJsonResponse(orders);
  } catch (error) {
    return createJsonResponse({ error: error.message });
  }
}

/**
 * Handle POST requests - Submit new order
 * Creates a separate row for each item in the order
 */
function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Generate base serial number (resets daily)
    const baseSlNo = generateDailySerialNumber(sheet);
    
    // Handle photo upload to Google Drive
    let photoUrl = '';
    if (data.photo && data.photo.startsWith('data:image')) {
      try {
        photoUrl = savePhotoToDrive(data.photo, baseSlNo, data.otfNo || 'unknown');
      } catch (photoError) {
        Logger.log('Photo save error: ' + photoError.message);
        // Continue without photo if there's an error
      }
    }
    
    // Get items array from the data
    const items = data.items || [];
    
    // If no items array, create single row from legacy format
    if (items.length === 0) {
      const row = [
        baseSlNo,
        data.date || new Date(),
        data.otfNo || '',
        data.customerName || '',
        data.vehicleModel || '',
        data.chassisNo || '',
        data.itemDescription || '',
        data.partNo || '',
        data.amount || 0,
        data.totalAmount || 0,
        data.status || 'Pending',
        data.remarks || '',
        photoUrl,
        new Date()
      ];
      sheet.appendRow(row);
    } else {
      // Create a row for each item
      const rows = items.map((item, index) => {
        // Add item number suffix for multiple items (e.g., 20260208-001-A, 20260208-001-B)
        const itemSuffix = items.length > 1 ? `-${String.fromCharCode(65 + index)}` : '';
        const slNo = baseSlNo + itemSuffix;
        
        return [
          slNo,                               // Sl No. with item suffix
          data.date || new Date(),            // Date
          data.otfNo || '',                   // OTF No.
          data.customerName || '',            // Customer Name
          data.vehicleModel || '',            // Vehicle Model
          data.chassisNo || '',               // Chassis No.
          item.description || '',             // Item Description (per item)
          item.partNo || '',                  // Part No. (per item)
          item.amount || 0,                   // Amount (per item)
          data.totalAmount || 0,              // Total Amount (order total)
          data.status || 'Pending',           // Status
          data.remarks || '',                 // Remarks
          index === 0 ? photoUrl : '',        // Photo URL (only on first item)
          new Date()                          // Timestamp
        ];
      });
      
      // Append all rows at once (more efficient)
      if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      }
    }
    
    return createJsonResponse({ 
      success: true, 
      slNo: baseSlNo,
      itemCount: items.length || 1,
      photoUrl: photoUrl,
      message: 'Order saved successfully' 
    });
  } catch (error) {
    return createJsonResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Get or create the Orders sheet with headers
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    
    // Add headers
    const headers = [
      'Sl No.',
      'Date',
      'OTF No.',
      'Customer Name',
      'Vehicle Model',
      'Chassis No.',
      'Item Description',
      'Part No.',
      'Amount',
      'Total Amount',
      'Status',
      'Remarks',
      'Photo URL',
      'Timestamp'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#B91C1C');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Set column widths
    sheet.setColumnWidth(1, 130);  // Sl No.
    sheet.setColumnWidth(2, 100);  // Date
    sheet.setColumnWidth(3, 100);  // OTF No.
    sheet.setColumnWidth(4, 150);  // Customer Name
    sheet.setColumnWidth(5, 120);  // Vehicle Model
    sheet.setColumnWidth(6, 120);  // Chassis No.
    sheet.setColumnWidth(7, 200);  // Item Description
    sheet.setColumnWidth(8, 100);  // Part No.
    sheet.setColumnWidth(9, 100);  // Amount
    sheet.setColumnWidth(10, 100); // Total Amount
    sheet.setColumnWidth(11, 100); // Status
    sheet.setColumnWidth(12, 150); // Remarks
    sheet.setColumnWidth(13, 200); // Photo URL
    sheet.setColumnWidth(14, 150); // Timestamp
  }
  
  return sheet;
}

/**
 * Generate daily serial number (resets to 1 each day)
 */
function generateDailySerialNumber(sheet) {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMMdd');
  
  // Get all existing serial numbers
  const data = sheet.getDataRange().getValues();
  let maxNum = 0;
  
  // Find the highest base number for today (ignore -A, -B suffixes)
  for (let i = 1; i < data.length; i++) {
    const slNo = String(data[i][0]);
    // Match pattern: YYYYMMDD-NNN or YYYYMMDD-NNN-X
    const match = slNo.match(new RegExp(`^${dateStr}-(\\d+)`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  
  // Return next serial number
  const nextNum = maxNum + 1;
  return `${dateStr}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Create JSON response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Save photo to Google Drive and return the URL
 */
function savePhotoToDrive(base64Data, slNo, otfNo) {
  // Get or create the photos folder
  const folder = getOrCreateFolder(PHOTOS_FOLDER_NAME);
  
  // Extract the base64 content and content type
  const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image data format');
  }
  
  const imageType = matches[1]; // e.g., 'jpeg', 'png'
  const base64Content = matches[2];
  
  // Decode the base64 string
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64Content),
    `image/${imageType}`,
    `OTF_${otfNo}_${slNo}.${imageType === 'jpeg' ? 'jpg' : imageType}`
  );
  
  // Create the file in Drive
  const file = folder.createFile(blob);
  
  // Make the file viewable by anyone with the link
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Return the view URL
  return file.getUrl();
}

/**
 * Get or create a folder in Google Drive
 */
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  }
  
  // Create the folder if it doesn't exist
  return DriveApp.createFolder(folderName);
}

/**
 * Test function - Run this to verify the script works
 * Click the ▶️ button to run, then check View > Logs
 */
function testScript() {
  const sheet = getOrCreateSheet();
  Logger.log('✅ Sheet created/found: ' + sheet.getName());
  Logger.log('✅ Next serial number would be: ' + generateDailySerialNumber(sheet));
  Logger.log('✅ Sheet has ' + sheet.getLastRow() + ' rows');
}

/**
 * Test POST - Simulates a form submission
 * Run this to test if data gets added to the sheet
 */
function testPost() {
  // Simulate the data that would come from the web form
  const testData = {
    postData: {
      contents: JSON.stringify({
        slNo: 'TEST-001',
        date: new Date().toISOString().split('T')[0],
        otfNo: 'TEST-OTF-123',
        customerName: 'Test Customer',
        vehicleModel: 'Thar',
        chassisNo: 'ABC123',
        itemDescription: 'Test Item',
        partNo: 'TP-001',
        amount: 1000,
        totalAmount: 1000,
        status: 'Pending',
        remarks: 'Test entry',
        photo: '', // No photo for test (would be base64 string in real usage)
        items: [
          { description: 'Floor Mat', partNo: 'FM-001', amount: 500 },
          { description: 'Seat Cover', partNo: 'SC-001', amount: 500 }
        ]
      })
    }
  };
  
  try {
    const result = doPost(testData);
    const response = JSON.parse(result.getContent());
    Logger.log('✅ SUCCESS: ' + JSON.stringify(response));
    Logger.log('✅ Check your sheet - new rows should be added!');
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}

