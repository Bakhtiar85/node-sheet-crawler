require('dotenv').config();

const { google } = require('googleapis');
const express = require('express');
const app = express();
const port = 3000;

const { submitForm } = require('./src/puppeteerForm');
const is_testing_url = process.env.IS_TESTING_URL;

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
        const range = `${sheetName}!A${lastRow + 1}:E`; // Adjust the range to start from the next row(s)
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth: client,
        });

        const rows = response.data.values;
        if (rows && rows.length > 0) {
            for (const row of rows) {
                const [timestamp, fullName, email, zipcode, age] = row;
                if (timestamp !== "Timestamp") {
                    let success = false;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            const result = await submitForm(fullName, email, zipcode, age, false);
                            console.log("Posted Data via PUPPETEER: ", result);
                            success = true;
                            break;
                        } catch (submitError) {
                            console.error(`Error submitting form (attempt ${attempt + 1}):`, submitError);
                        }
                    }
                    if (!success) {
                        console.error('Failed to submit form after 3 attempts');
                    }
                }
            }
            lastRow += rows.length; // Update lastRow to reflect the number of new rows read
        }
        // Poll the Google Sheet every 30 seconds
        setTimeout(() => {
            console.log("calling sheet again after 30 seconds!!!");
            checkSheet();
        }, 30000);
    } catch (error) {
        console.error('Error accessing Google Sheets:', error);
    }
}
if (is_testing_url === 'true') {
    submitForm('fullName', 'email', '20147', 'age', is_testing_url);
} else {
    checkSheet();
}

// Start the Express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
