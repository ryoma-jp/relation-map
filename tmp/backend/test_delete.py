import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# ログイン
login_response = client.post("/api/auth/login", json={"username": "admin", "password": "password"})
if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.json())
else:
    token = login_response.json()["access_token"]
    print(f"Login successful")
    
    # リレーション削除を試みる
    headers = {"Authorization": f"Bearer {token}"}
    delete_response = client.delete("/api/relations/types/friend", headers=headers)
    print(f"\nDELETE /api/relations/types/friend response:")
    print(f"  Status Code: {delete_response.status_code}")
    print(f"  Body: {json.dumps(delete_response.json(), indent=2)}")
