require('dotenv').config();

// node.js
const { google } = require('googleapis');
const express = require('express');
const app = express();
const port = 3000;

// Set up Google Sheets API
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account-key.json', // Update this path
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const spreadsheetId = String(process.env.SPREADSHEET_ID);
const sheetName = String(process.env.SHEET_NAME);
let lastRow = 0; // Keeps track of the last row read

async function checkSheet() {
    try {
        const client = await auth.getClient();
        const range = `${sheetName}!A${lastRow + 1}:D`; // Adjust the range to start from the next row(s)
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth: client,
        });

        const rows = response.data.values;
        if (rows && rows.length > 0) {
            for (const row of rows) {
                console.log(`New entry: ${row.join(', ')}`);
                // Log this information to your server or database
            }
            lastRow += rows.length; // Update lastRow to reflect the number of new rows read
        }
    } catch (error) {
        console.error('Error accessing Google Sheets:', error);
    }
}

// Poll the Google Sheet every 15 seconds
setInterval(checkSheet, 15000);

// Start the Express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
