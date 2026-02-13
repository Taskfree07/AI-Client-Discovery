"""
Email utility functions for formatting and processing emails
"""
import html as html_module


def text_to_html_email(text):
    """
    Convert plain text email to professional HTML format.

    - Converts line breaks to <br> tags
    - Separates paragraphs with proper spacing
    - Adds professional styling
    - Preserves the original text structure
    - Escapes HTML special characters for security

    Args:
        text (str): Plain text email content

    Returns:
        str: Professional HTML-formatted email
    """
    # Escape HTML special characters to prevent XSS
    text = html_module.escape(text)

    # Split into paragraphs (double newlines = new paragraph)
    paragraphs = text.split('\n\n')

    # Build HTML with professional styling
    html_parts = [
        '<html>',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '</head>',
        '<body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">'
    ]

    for para in paragraphs:
        if para.strip():
            # Replace single newlines with <br> for line breaks within paragraphs
            para_html = para.replace('\n', '<br>')
            html_parts.append(f'<p style="margin: 0 0 16px 0;">{para_html}</p>')

    html_parts.extend(['</body>', '</html>'])

    return '\n'.join(html_parts)


def replace_email_variables(text, variables):
    """
    Replace variables in email text with actual values.

    Args:
        text (str): Email text with variables like {{FirstName}}
        variables (dict): Dictionary of variable names to values

    Returns:
        str: Text with variables replaced
    """
    for key, value in variables.items():
        # Support both {{variable}} and {variable} formats
        text = text.replace(f'{{{{{key}}}}}', str(value))
        text = text.replace(f'{{{key}}}', str(value))

    return text
