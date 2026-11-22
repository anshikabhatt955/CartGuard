import urllib.request
import json

def test():
    # Test POST /reports
    post_data = {
        "domain": "testmerchant.in",
        "url": "https://testmerchant.in/checkout",
        "pattern_type": "basket_sneaking",
        "official_name": "Basket Sneaking",
        "ccpa_section": "CCPA Guidelines 2023, Section 6",
        "severity": "HIGH",
        "evidence_text": "Auto-checked donation box of Rs 50"
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/reports",
        data=json.dumps(post_data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print(f"PASS: POST /reports status {response.status}, report_id: {res.get('report_id')}")

    # Test GET /sites/testmerchant.in/score
    with urllib.request.urlopen("http://127.0.0.1:8000/sites/testmerchant.in/score") as response:
        score_data = json.loads(response.read().decode())
        print(f"PASS: GET /sites/testmerchant.in/score -> Score: {score_data.get('trust_score')}")

if __name__ == "__main__":
    test()
