"""Test if all imports in app.py work correctly"""
import sys

print("Testing imports from app.py...")

try:
    print("1. Testing Flask imports...")
    from flask import Flask, render_template, request, jsonify, session
    from flask_cors import CORS
    print("   OK: Flask imports")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("2. Testing config...")
    from config import Config
    print("   OK: Config")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("3. Testing models...")
    from models import db, Settings, Campaign, EmailTemplate, JobLead, ActivityLog
    print("   OK: Models")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("4. Testing GoogleSearchService...")
    from services.google_search import GoogleSearchService
    print("   OK: GoogleSearchService")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("5. Testing ApolloAPIService...")
    from services.apollo_api import ApolloAPIService
    print("   OK: ApolloAPIService")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("6. Testing EmailGenerator...")
    from services.email_generator import EmailGenerator
    print("   OK: EmailGenerator")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("7. Testing EmailSender...")
    from services.email_sender import EmailSender
    print("   OK: EmailSender")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("8. Testing SheetsLogger...")
    from services.sheets_logger import SheetsLogger
    print("   OK: SheetsLogger")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("9. Testing CampaignScheduler...")
    from services.scheduler import CampaignScheduler
    print("   OK: CampaignScheduler")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("10. Testing JobParserService...")
    from services.job_parser import JobParserService
    print("   OK: JobParserService")
except Exception as e:
    print(f"   ERROR: {e}")

try:
    print("11. Testing AILeadScorer...")
    from services.ai_lead_scorer import AILeadScorer
    print("   OK: AILeadScorer")
except Exception as e:
    print(f"   ERROR: {e}")

print("\nAll imports tested!")
