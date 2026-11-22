import urllib.request
import json

def test():
    urls = [
        ("Root", "http://127.0.0.1:8000/"),
        ("Score 127.0.0.1", "http://127.0.0.1:8000/sites/127.0.0.1/score"),
        ("Leaderboard", "http://127.0.0.1:8000/leaderboard"),
        ("Stats", "http://127.0.0.1:8000/stats"),
    ]
    for name, u in urls:
        try:
            res = urllib.request.urlopen(u)
            data = json.loads(res.read().decode())
            print(f"PASS: {name} returned status {res.status}")
            if name == "Score 127.0.0.1":
                print(f"  Score: {data.get('trust_score')} ({data.get('grade')})")
                for alert in data.get('crowd_alerts', []):
                    print(f"  Crowd Alert: {alert['alert_text']}")
        except Exception as e:
            print(f"FAIL: {name}: {e}")

if __name__ == "__main__":
    test()
