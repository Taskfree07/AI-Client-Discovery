#!/usr/bin/env python3
"""
Pre-Deployment Verification Script
Checks if the app is ready for production deployment
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def check_item(condition, success_msg, failure_msg):
    """Check a condition and print result"""
    if condition:
        print(f"{Colors.GREEN}[OK]{Colors.END} {success_msg}")
        return True
    else:
        print(f"{Colors.RED}[FAIL]{Colors.END} {failure_msg}")
        return False

def main():
    print(f"\n{Colors.BLUE}=== AI Client Discovery - Deployment Check ==={Colors.END}\n")

    checks_passed = 0
    checks_failed = 0

    # 1. Check Environment Variables
    print(f"{Colors.YELLOW}1. Environment Variables:{Colors.END}")

    required_vars = [
        ('SECRET_KEY', 'Flask secret key'),
        ('APOLLO_API_KEY', 'Apollo API key'),
        ('GEMINI_API_KEY', 'Gemini API key'),
        ('GOOGLE_OAUTH_CLIENT_ID', 'Google OAuth Client ID'),
        ('GOOGLE_OAUTH_CLIENT_SECRET', 'Google OAuth Client Secret'),
    ]

    for var_name, description in required_vars:
        var_value = os.getenv(var_name)
        if check_item(
            var_value and len(var_value) > 0,
            f"{description} is set",
            f"{description} is MISSING"
        ):
            checks_passed += 1
        else:
            checks_failed += 1

    # 2. Check Apollo API Key
    print(f"\n{Colors.YELLOW}2. Apollo API Security:{Colors.END}")

    apollo_key = os.getenv('APOLLO_API_KEY')
    if check_item(
        apollo_key == 'QDjWXMpt8peVt2w8mHRnFQ',
        "Correct Apollo API key configured",
        "Apollo API key mismatch"
    ):
        checks_passed += 1
    else:
        checks_failed += 1

    # 3. Check Critical Files
    print(f"\n{Colors.YELLOW}3. Critical Files:{Colors.END}")

    critical_files = [
        'app.py',
        'models.py',
        'config.py',
        'requirements.txt',
        '.env',
        'utils/email_utils.py',
        'services/apollo_api.py',
        'services/email_sender.py',
        'services/lead_engine.py',
    ]

    for file_path in critical_files:
        if check_item(
            Path(file_path).exists(),
            f"{file_path} exists",
            f"{file_path} MISSING"
        ):
            checks_passed += 1
        else:
            checks_failed += 1

    # 4. Check Frontend Files
    print(f"\n{Colors.YELLOW}4. Frontend Files:{Colors.END}")

    frontend_files = [
        'frontend/package.json',
        'frontend/next.config.js',
        'frontend/src/app/page.tsx',
        'frontend/src/app/campaign-manager/new/page.tsx',
        'frontend/src/app/session-manager/page.tsx',
        'frontend/src/components/MainLayout.tsx',
    ]

    for file_path in frontend_files:
        if check_item(
            Path(file_path).exists(),
            f"{file_path} exists",
            f"{file_path} MISSING"
        ):
            checks_passed += 1
        else:
            checks_failed += 1

    # 5. Check Documentation
    print(f"\n{Colors.YELLOW}5. Documentation:{Colors.END}")

    docs = [
        'DEPLOYMENT_GUIDE.md',
        'DEPLOYMENT_SECURITY_CHECKLIST.md',
        'APOLLO_API_SECURITY.md',
        'APP_FEATURES_SUMMARY.md',
    ]

    for doc in docs:
        if check_item(
            Path(doc).exists(),
            f"{doc} exists",
            f"{doc} MISSING"
        ):
            checks_passed += 1
        else:
            checks_failed += 1

    # 6. Check Security Implementation
    print(f"\n{Colors.YELLOW}6. Security Implementation:{Colors.END}")

    # Check if app.py has security functions
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()

        security_checks = [
            ('init_apollo_api_key', 'Apollo API key initialization function'),
            ('validate_apollo_request', 'Request validation function'),
            ('get_apollo_api_key_secure', 'Secure API key retrieval function'),
            ('APOLLO_ALLOWED_ENDPOINTS', 'Endpoint whitelist'),
        ]

        for func_name, description in security_checks:
            if check_item(
                func_name in app_content,
                f"{description} implemented",
                f"{description} MISSING"
            ):
                checks_passed += 1
            else:
                checks_failed += 1
    except Exception as e:
        print(f"{Colors.RED}✗ Error reading app.py: {e}{Colors.END}")
        checks_failed += len(security_checks)

    # 7. Frontend Build Check
    print(f"\n{Colors.YELLOW}7. Frontend Build:{Colors.END}")

    node_modules_exists = Path('frontend/node_modules').exists()
    next_config_exists = Path('frontend/next.config.js').exists()

    if check_item(
        node_modules_exists,
        "node_modules exists (dependencies installed)",
        "node_modules MISSING (run: cd frontend && npm install)"
    ):
        checks_passed += 1
    else:
        checks_failed += 1

    if check_item(
        next_config_exists,
        "Next.js configuration exists",
        "next.config.js MISSING"
    ):
        checks_passed += 1
    else:
        checks_failed += 1

    # Print Summary
    print(f"\n{Colors.BLUE}=== Summary ==={Colors.END}")
    print(f"Checks Passed: {Colors.GREEN}{checks_passed}{Colors.END}")
    print(f"Checks Failed: {Colors.RED}{checks_failed}{Colors.END}")

    total_checks = checks_passed + checks_failed
    percentage = (checks_passed / total_checks * 100) if total_checks > 0 else 0

    print(f"\nReadiness: {percentage:.1f}%")

    if checks_failed == 0:
        print(f"\n{Colors.GREEN}[SUCCESS] ALL CHECKS PASSED - READY FOR DEPLOYMENT!{Colors.END}\n")
        return 0
    else:
        print(f"\n{Colors.YELLOW}[WARNING] Some checks failed. Review the issues above before deploying.{Colors.END}\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())
