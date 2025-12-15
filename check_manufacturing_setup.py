"""
Manufacturing ICP - Quick Setup Verification Script
Run this to check if all dependencies are installed correctly
"""

import sys

def check_dependency(module_name, import_statement=None):
    """Check if a module can be imported"""
    try:
        if import_statement:
            exec(import_statement)
        else:
            __import__(module_name)
        print(f"✓ {module_name} - OK")
        return True
    except ImportError as e:
        print(f"✗ {module_name} - MISSING ({e})")
        return False
    except Exception as e:
        print(f"⚠ {module_name} - ERROR ({e})")
        return False

print("=" * 60)
print("Manufacturing ICP - Dependency Check")
print("=" * 60)
print()

print("[1] Core Flask Dependencies:")
check_dependency("flask")
check_dependency("flask_cors")
check_dependency("flask_sqlalchemy")
print()

print("[2] Database:")
check_dependency("sqlalchemy")
check_dependency("openpyxl")
print()

print("[3] AI/ML Dependencies:")
check_dependency("transformers")
check_dependency("torch")
check_dependency("sentence_transformers")
print()

print("[4] RAG System (NEW - Critical for Manufacturing ICP):")
rag_ok = True
rag_ok &= check_dependency("chromadb")
rag_ok &= check_dependency("aiohttp")
print()

print("[5] Apollo API:")
check_dependency("requests")
print()

print("[6] Google Services:")
check_dependency("google")
print()

print("=" * 60)

if not rag_ok:
    print()
    print("⚠ WARNING: RAG dependencies missing!")
    print()
    print("To install, run:")
    print("   install_rag_deps.bat")
    print()
    print("Or manually:")
    print("   pip install chromadb>=0.4.0 aiohttp>=3.9.0")
    print()
else:
    print()
    print("✓ All RAG dependencies installed!")
    print()
    print("Manufacturing ICP is ready to use!")
    print()
    print("Next steps:")
    print("1. Run: python app.py")
    print("2. Navigate to: http://localhost:5000/manufacturing-icp")
    print("3. Configure Apollo API key in Settings")
    print("4. Generate test campaign (10/10/5 leads)")
    print()

print("=" * 60)
print()
print("Detailed setup guide: MANUFACTURING_ICP_COMPLETION.md")
print("User guide: MANUFACTURING_ICP_USER_GUIDE.md")
print()
