"""
Real-time Apollo API Usage Monitor
Run this script to track API usage changes in real-time
"""

import requests
import json
import time
from datetime import datetime

API_KEY = 'PJsnRknvyw8xFCkmOuwgjQ'
HEADERS = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
}

def get_usage_snapshot():
    """Get current Apollo API usage"""
    resp = requests.post(
        'https://api.apollo.io/api/v1/usage_stats/api_usage_stats',
        headers=HEADERS,
        json={'api_key': API_KEY},
        timeout=15
    )

    if resp.status_code == 200:
        return resp.json()
    return None

def calculate_total_calls(usage_data):
    """Calculate total API calls from usage data"""
    total = 0
    for endpoint, stats in usage_data.items():
        if 'day' in stats:
            total += stats['day'].get('consumed', 0)
    return total

def get_active_endpoints(usage_data):
    """Get endpoints with non-zero usage"""
    active = []
    for endpoint, stats in usage_data.items():
        if 'day' in stats and stats['day'].get('consumed', 0) > 0:
            active.append({
                'endpoint': endpoint,
                'consumed': stats['day']['consumed'],
                'limit': stats['day']['limit']
            })
    return sorted(active, key=lambda x: x['consumed'], reverse=True)

def main():
    print("=" * 70)
    print("APOLLO API REAL-TIME USAGE MONITOR")
    print("=" * 70)
    print("This script will check Apollo API usage every 60 seconds")
    print("Press Ctrl+C to stop")
    print()

    # Get initial snapshot
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Getting initial snapshot...")
    initial_usage = get_usage_snapshot()

    if not initial_usage:
        print("ERROR: Could not connect to Apollo API")
        return

    initial_total = calculate_total_calls(initial_usage)
    print(f"Initial total calls today: {initial_total:,}")
    print()

    # Monitor loop
    check_count = 0
    try:
        while True:
            time.sleep(60)  # Wait 60 seconds
            check_count += 1

            current_usage = get_usage_snapshot()
            if not current_usage:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: Could not fetch usage")
                continue

            current_total = calculate_total_calls(current_usage)
            new_calls = current_total - initial_total

            timestamp = datetime.now().strftime('%H:%M:%S')
            print(f"[{timestamp}] Check #{check_count} - Total: {current_total:,} (+{new_calls:,} since start)")

            if new_calls > 0:
                print("  ⚠️  NEW API CALLS DETECTED!")
                print("  Active endpoints:")
                for ep in get_active_endpoints(current_usage)[:5]:
                    print(f"    {ep['endpoint']}: {ep['consumed']:,} / {ep['limit']:,}")
                print()

            # Update baseline
            initial_total = current_total

    except KeyboardInterrupt:
        print()
        print("=" * 70)
        print("Monitoring stopped by user")
        print("=" * 70)

        # Final snapshot
        final_usage = get_usage_snapshot()
        if final_usage:
            final_total = calculate_total_calls(final_usage)
            print(f"\nFinal total calls today: {final_total:,}")
            print("\nMost active endpoints:")
            for i, ep in enumerate(get_active_endpoints(final_usage)[:10], 1):
                print(f"  {i}. {ep['endpoint']}: {ep['consumed']:,} calls")

if __name__ == '__main__':
    main()
