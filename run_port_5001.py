"""Run Flask on port 5001 to test"""
from app import app, init_db, email_generator

if __name__ == '__main__':
    print("Initializing database...")
    init_db()

    print("Loading AI model...")
    email_generator.load_model()

    print("Starting Flask on port 5001...")
    app.run(debug=True, host='0.0.0.0', port=5001)
