import sqlite3

conn = sqlite3.connect('instance/database.db')
cursor = conn.cursor()

cursor.execute('SELECT id, name, is_default FROM email_template ORDER BY id')
templates = cursor.fetchall()

print('\nYour Email Templates:')
print('=' * 70)
for id, name, is_default in templates:
    default_marker = ' [DEFAULT]' if is_default else ''
    print(f'{id:2d}. {name}{default_marker}')

print('=' * 70)
print(f'Total: {len(templates)} templates')

conn.close()
