import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

url_to_test = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8008/mock/cart.html"
print(f"Testing analyze for {url_to_test}...")

try:
    req = urllib.request.Request(
        "http://127.0.0.1:8008/analyze",
        data=json.dumps({"url": url_to_test}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8")
        print("Response received:")
        data = json.loads(body)
        print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
