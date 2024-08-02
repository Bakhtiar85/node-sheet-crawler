require('dotenv').config();
const { google } = require('googleapis');
const express = require('express');
const app = express();
const { zipToCountryCity } = require('./src/geocodeService');
const { getValues } = require('./state');
const { submitForm } = require('./src/puppeteerForm');
const port = 3000;

const is_testing_url = process.env.IS_TESTING_URL;
const spreadsheetId = String(process.env.SPREADSHEET_ID);
const sheetName = String(process.env.SHEET_NAME);
const retryAttempts = 3; // Number of retry attempts for form submission
let lastRow = 0; // Keeps track of the last row read

// Set up Google Sheets API
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account-key.json', // Update this path
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

async function fetchSheetData(range) {
    try {
        const client = await auth.getClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth: client,
        });
        return response.data.values || [];
    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        return [];
    }
}

async function processRow(row) {
    const [timestamp, fullName, phone, zipcode, age] = row;
    if (timestamp === "Timestamp") return;

    try {
        const countryCityInfo = await zipToCountryCity(zipcode);
        if (!countryCityInfo) {
            console.log("Invalid or unsupported ZIP code:", zipcode);
            return;
        }

        let success = false;
        for (let attempt = 0; attempt < retryAttempts; attempt++) {
            try {
                await submitForm(fullName, phone, zipcode, age, false, countryCityInfo);
                success = true;
                break;
            } catch (submitError) {
                console.error(`Error submitting form (attempt ${attempt + 1}):`, submitError);
            }
        }

        if (!success) {
            console.error('Failed to submit form after maximum attempts');
            console.log('Failed values:', { phone, zipcode });
        } else {
            const values = getValues();
            console.log('Submitted values:', { phone, zipcode, values });
        }
    } catch (error) {
        console.error('Error processing row:', error);
    }
}

async function checkSheet() {
    const range = `${sheetName}!A${lastRow + 1}:E`; // Adjust the range to start from the next row(s)
    const rows = await fetchSheetData(range);

    if (rows.length > 0) {
        for (const row of rows) {
            await processRow(row);
        }
        lastRow += rows.length; // Update lastRow to reflect the number of new rows read
    }

    // Poll the Google Sheet every 30 seconds
    setTimeout(() => {
        console.log("Rechecking Google Sheets for new entries after 30 seconds.");
        checkSheet();
    }, 30000);
}

// Start the process based on the environment
if (is_testing_url === 'true') {
    submitForm('fullName', 'phone', '20147', 'age', is_testing_url);
} else {
    checkSheet();
}

// Start the Express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
