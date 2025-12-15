"""Fix all emoji characters in app.py to prevent UnicodeEncodeError"""
import re

# Read the file
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all emojis with ASCII equivalents
replacements = {
    '🔍': '[SEARCH]',
    '📊': '[STATS]',
    '✅': '[OK]',
    '⚠️': '[WARN]',
    '❌': '[ERROR]',
    '🔬': '[PROCESS]',
    '✓': '[+]',
    '🌐': '[WEB]',
    '🎯': '[RESULT]',
    '🏢': '[COMPANY]',
    '👔': '[CONTACT]',
    '🔐': '[LOCK]',
    '💡': '[TIP]',
}

for emoji, replacement in replacements.items():
    content = content.replace(emoji, replacement)

# Write back
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all emojis in app.py!")
