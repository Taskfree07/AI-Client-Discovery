#!/bin/bash
# Add the app directory to PYTHONPATH
export PYTHONPATH=$PYTHONPATH:/home/site/wwwroot

# Start gunicorn from the correct directory
cd /home/site/wwwroot
exec gunicorn --bind=0.0.0.0:8000 --timeout 600 app:app
