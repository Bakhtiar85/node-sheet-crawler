# Google Sheets Monitoring Project

This project monitors a Google Sheet for new entries and logs them to the console.

## Setup Instructions

### 1. Set Up Google Developer Console and Service Account

1. **Create a Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Click on `Select a project` or `Create Project`.
   - Enter a project name and click `Create`.

2. **Enable Google Sheets API**:
   - Go to the [API Library](https://console.cloud.google.com/apis/library).
   - Search for `Google Sheets API` and click on it.
   - Click `Enable`.

3. **Create a Service Account**:
   - Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts).
   - Click `Create Service Account`.
   - Enter a name and click `Create`.
   - Assign the role `Editor` or `Viewer` and click `Continue`.
   - Click `Done`.

4. **Generate Service Account Key**:
   - Click on your service account.
   - Go to the `Keys` tab.
   - Click `Add Key` > `Create new key`.
   - Choose `JSON` and click `Create`.
   - Save the generated `service-account-key.json` file.

### 2. Set Up Google Sheet and Link with Google Form

1. **Create a Google Sheet**:
   - Go to [Google Sheets](https://sheets.google.com/).
   - Click `Blank` to create a new sheet.

2. **Link Google Form**:
   - Go to [Google Forms](https://forms.google.com/).
   - Create a new form or use an existing one.
   - Click on the `Responses` tab.
   - Click on the green Sheets icon to link the form to a Google Sheet.

3. **Share the Sheet with Your Service Account**:
   - Open your Google Sheet.
   - Click `Share` in the top-right corner.
   - Enter the email address from your `service-account-key.json` file (it will look like `your-service-account@project-id.iam.gserviceaccount.com`).
   - Click `Send`.

### 3. Dependencies and Services

- **Node.js**: Ensure Node.js is installed on your machine.
- **Dependencies**:
  - Install the necessary packages with:

    ```bash
    npm install express googleapis dotenv
    ```

- **Environment Variables**:
  - Create a `.env` file in the root directory.
  - Add the following content:

    ```env
    SPREADSHEET_ID=your_google_sheet_id
    SHEET_NAME=Sheet1
    ```

### Running the Project

1. **Start the Server**:
   - Run the following command to start the server:

     ```bash
     npm start
     ```

   - The server will be running at `http://localhost:3000`.
