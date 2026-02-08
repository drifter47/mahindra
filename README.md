# Mahindra Order Taking Form

A digital order taking form for Mahindra Showroom car accessories with Google Sheets integration.

## Features

- 📱 Mobile-friendly responsive design
- 🌙 Dark mode support
- 📊 Google Sheets backend storage
- 🔢 Auto-resetting daily serial numbers (starts at 1 each day)
- 📜 Order history view with search
- 💾 Offline support with local storage

## Quick Setup

### 1. Google Sheets Setup

1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)
2. Go to **Extensions → Apps Script**
3. Delete the default code and paste the contents of `google-apps-script.gs`
4. Click **Deploy → New deployment**
5. Choose:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** and authorize when prompted
7. Copy the **Web app URL**

### 2. Connect the App

1. Open `script.js`
2. Replace this line:
   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
   With your Web App URL:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
   ```

### 3. Deploy to GitHub Pages

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Mahindra OTF"

# Add your GitHub repository (create one first on github.com)
git remote add origin https://github.com/YOUR_USERNAME/mahindra.git

# Push to GitHub
git push -u origin main

# Enable GitHub Pages:
# Go to Repository Settings → Pages → Source: main branch → Save
```

Your app will be available at: `https://YOUR_USERNAME.github.io/mahindra`

## Usage

1. Open the app on your phone or computer
2. Fill in the order details
3. Click **Submit Order**
4. View past orders in the **Order History** tab

## Form Fields

| Field | Description |
|-------|-------------|
| Sl No. | Auto-generated (YYYYMMDD-001 format, resets daily) |
| Date | Order date |
| OTF No. | Order Taking Form number |
| Customer Name | Customer's full name |
| Vehicle Model | Mahindra vehicle model |
| Chassis No. | Vehicle chassis number |
| Item Description | Accessory description |
| Part No. | Part number (optional) |
| Amount | Item amount in ₹ |
| Total Amount | Total order amount in ₹ |
| Status | Pending / In Progress / Completed / Cancelled |
| Remarks | Additional notes (optional) |

## Troubleshooting

**Orders not saving to Google Sheets?**
- Check if the Apps Script URL is correctly pasted
- Ensure the script is deployed as "Anyone" can access
- Check browser console (F12) for error messages

**App works offline?**
- Yes! Orders are saved locally and can be viewed in history
- Sync manually when back online

## License

MIT - Free to use and modify
