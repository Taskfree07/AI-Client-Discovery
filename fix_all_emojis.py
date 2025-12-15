"""Fix ALL emoji characters across the entire project"""
import os
import re

# Comprehensive emoji to ASCII mapping
emoji_map = {
    # Common emojis
    '🔍': '[SEARCH]',
    '📊': '[STATS]',
    '✅': '[OK]',
    '⚠️': '[WARN]',
    '❌': '[ERROR]',
    '🔬': '[PROCESS]',
    '✓': '[+]',
    '🌐': '[WEB]',
    '🎯': '[TARGET]',
    '🏢': '[COMPANY]',
    '👔': '[CONTACT]',
    '🔐': '[LOCK]',
    '💡': '[TIP]',

    # Additional emojis found
    '💎': '[PREMIUM]',
    '📧': '[EMAIL]',
    '🚀': '[ROCKET]',
    '🔥': '[FIRE]',
    '💼': '[BUSINESS]',
    '👍': '[THUMBSUP]',
    '📝': '[NOTE]',
    '🤔': '[THINK]',
    '💰': '[MONEY]',
    '🔧': '[TECH]',
    '📈': '[CHART]',
    '👨\u200d💻': '[ENGINEER]',
    '🤖': '[AI]',
    '☁️': '[CLOUD]',
    '☁': '[CLOUD]',
    '🏭': '[INDUSTRY]',
    '🎨': '[DESIGN]',
    '⚙️': '[SETTINGS]',
    '⚙': '[SETTINGS]',
    '📥': '[INBOX]',
    '📤': '[OUTBOX]',
}

def fix_file(filepath):
    """Fix emojis in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Replace all emojis
        for emoji, replacement in emoji_map.items():
            content = content.replace(emoji, replacement)

        # If changes were made, write back
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing {filepath}: {e}")
        return False

# Fix all Python files in services directory
services_dir = 'services'
fixed_count = 0

for filename in os.listdir(services_dir):
    if filename.endswith('.py'):
        filepath = os.path.join(services_dir, filename)
        if fix_file(filepath):
            print(f"Fixed: {filepath}")
            fixed_count += 1

print(f"\nTotal files fixed: {fixed_count}")
