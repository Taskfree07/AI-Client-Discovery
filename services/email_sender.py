import msal
import requests
from typing import Dict, Optional
import sys
import os

# Add parent directory to path to import utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.email_utils import text_to_html_email

class EmailSender:
    def __init__(self, client_id: str, client_secret: str, tenant_id: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.tenant_id = tenant_id
        self.access_token = None
        self.user_email = None

    def authenticate(self) -> bool:
        """
        Authenticate using Microsoft Graph API with client credentials
        """
        try:
            authority = f"https://login.microsoftonline.com/{self.tenant_id}"
            app = msal.ConfidentialClientApplication(
                self.client_id,
                authority=authority,
                client_credential=self.client_secret
            )

            result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])

            if "access_token" in result:
                self.access_token = result['access_token']
                return True
            else:
                print(f"Authentication failed: {result.get('error_description', 'Unknown error')}")
                return False

        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return False

    def send_email(self, to_email: str, subject: str, body: str,
                   from_email: str = None) -> Dict:
        """
        Send email using Microsoft Graph API

        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body (can include HTML)
            from_email: Sender email (must be authorized in Azure AD)

        Returns:
            Dictionary with 'success' (bool) and 'message' (str)
        """
        if not self.access_token:
            if not self.authenticate():
                return {'success': False, 'message': 'Authentication failed'}

        try:
            # If from_email is not provided, you need to set a default
            if not from_email:
                return {'success': False, 'message': 'Sender email is required'}

            url = f"https://graph.microsoft.com/v1.0/users/{from_email}/sendMail"

            # Convert plain text to professional HTML format
            html_body = text_to_html_email(body)

            email_msg = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML",
                        "content": html_body
                    },
                    "toRecipients": [
                        {
                            "emailAddress": {
                                "address": to_email
                            }
                        }
                    ]
                },
                "saveToSentItems": "true"
            }

            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }

            response = requests.post(url, json=email_msg, headers=headers)

            if response.status_code == 202:
                return {'success': True, 'message': 'Email sent successfully'}
            else:
                error_msg = response.json().get('error', {}).get('message', 'Unknown error')
                return {'success': False, 'message': f'Failed to send email: {error_msg}'}

        except Exception as e:
            return {'success': False, 'message': f'Error sending email: {str(e)}'}

    def validate_config(self) -> Dict:
        """
        Validate email configuration by testing authentication
        """
        try:
            if self.authenticate():
                return {'valid': True, 'message': 'Configuration is valid'}
            else:
                return {'valid': False, 'message': 'Authentication failed. Check credentials.'}
        except Exception as e:
            return {'valid': False, 'message': str(e)}
