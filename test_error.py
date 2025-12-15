"""Test script to identify the Flask Internal Server Error"""
import sys
import traceback

try:
    from app import app

    # Test the app context
    with app.app_context():
        from models import db, Settings

        # Try to access the database
        print("Testing database connection...")
        settings_count = Settings.query.count()
        print(f"Database working - {settings_count} settings found")

    # Test a simple route
    print("\nTesting route '/'...")
    with app.test_client() as client:
        response = client.get('/')
        print(f"Status Code: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.data.decode()}")

except Exception as e:
    print(f"\nError occurred:")
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {str(e)}")
    print("\nFull traceback:")
    traceback.print_exc()
