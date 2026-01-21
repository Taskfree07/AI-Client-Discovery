from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import pickle
import os
from datetime import datetime
from typing import List, Dict

class SheetsLogger:
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

    def __init__(self, credentials_file: str = 'credentials.json'):
        self.credentials_file = credentials_file
        self.token_file = 'token.pickle'
        self.creds = None
        self.service = None

    def authenticate(self) -> bool:
        """
        Authenticate with Google Sheets API
        """
        try:
            # Check if we have saved credentials
            if os.path.exists(self.token_file):
                with open(self.token_file, 'rb') as token:
                    self.creds = pickle.load(token)

            # If credentials are not valid, refresh or get new ones
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    self.creds.refresh(Request())
                else:
                    if not os.path.exists(self.credentials_file):
                        return False

                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_file, self.SCOPES)
                    self.creds = flow.run_local_server(port=0)

                # Save credentials for next run
                with open(self.token_file, 'wb') as token:
                    pickle.dump(self.creds, token)

            self.service = build('sheets', 'v4', credentials=self.creds)
            return True

        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return False

    def list_spreadsheets(self) -> List[Dict]:
        """
        List available spreadsheets (requires Drive API access)
        For now, user will need to provide spreadsheet ID manually
        """
        # This would require Google Drive API scope
        # For simplicity, we'll ask users to provide spreadsheet ID in settings
        return []

    def create_spreadsheet(self, title: str) -> str:
        """
        Create a new spreadsheet
        Returns: spreadsheet_id
        """
        if not self.service:
            if not self.authenticate():
                raise Exception("Authentication failed")

        try:
            spreadsheet = {
                'properties': {
                    'title': title
                },
                'sheets': [{
                    'properties': {
                        'title': 'Job Leads',
                        'gridProperties': {
                            'frozenRowCount': 1
                        }
                    }
                }]
            }

            result = self.service.spreadsheets().create(body=spreadsheet).execute()
            spreadsheet_id = result['spreadsheetId']

            # Add headers
            self._add_headers(spreadsheet_id)

            return spreadsheet_id

        except Exception as e:
            print(f"Error creating spreadsheet: {str(e)}")
            raise

    def _add_headers(self, spreadsheet_id: str):
        """Add header row to the spreadsheet"""
        headers = [[
            'Date',
            'Campaign',
            'Job Title',
            'Company Name',
            'Company Size',
            'Job URL',
            'Contact Name',
            'Contact Title',
            'Contact Email',
            'Email Sent',
            'Email Subject',
            'Status',
            'Notes'
        ]]

        self.service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range='Job Leads!A1:M1',
            valueInputOption='RAW',
            body={'values': headers}
        ).execute()

    def log_job_lead(self, spreadsheet_id: str, lead_data: Dict):
        """
        Log a job lead to Google Sheets
        """
        if not self.service:
            if not self.authenticate():
                raise Exception("Authentication failed")

        try:
            values = [[
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                lead_data.get('campaign_name', ''),
                lead_data.get('job_title', ''),
                lead_data.get('company_name', ''),
                lead_data.get('company_size', ''),
                lead_data.get('job_url', ''),
                lead_data.get('contact_name', ''),
                lead_data.get('contact_title', ''),
                lead_data.get('contact_email', ''),
                'Yes' if lead_data.get('email_sent') else 'No',
                lead_data.get('email_subject', ''),
                lead_data.get('status', 'new'),
                lead_data.get('notes', '')
            ]]

            self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range='Job Leads!A:M',
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body={'values': values}
            ).execute()

            return True

        except Exception as e:
            print(f"Error logging to sheets: {str(e)}")
            return False

    def batch_log_leads(self, spreadsheet_id: str, leads: List[Dict]):
        """
        Log multiple leads at once
        """
        if not self.service:
            if not self.authenticate():
                raise Exception("Authentication failed")

        try:
            values = []
            for lead in leads:
                values.append([
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    lead.get('campaign_name', ''),
                    lead.get('job_title', ''),
                    lead.get('company_name', ''),
                    lead.get('company_size', ''),
                    lead.get('job_url', ''),
                    lead.get('contact_name', ''),
                    lead.get('contact_title', ''),
                    lead.get('contact_email', ''),
                    'Yes' if lead.get('email_sent') else 'No',
                    lead.get('email_subject', ''),
                    lead.get('status', 'new'),
                    lead.get('notes', '')
                ])

            self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range='Job Leads!A:M',
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body={'values': values}
            ).execute()

            return True

        except Exception as e:
            print(f"Error batch logging to sheets: {str(e)}")
            return False
