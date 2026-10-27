import os
import json
from google.oauth2 import service_account
from google.auth.transport.requests import Request

keys_dir = os.path.join(
    os.path.expanduser("~"),
    "Desktop",
    "FirebaseKeys"
)

for filename in ["agricare-old.json", "agricare-new.json"]:
    print(f"\nTesting {filename}")

    try:
        path = os.path.join(keys_dir, filename)

        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)

        credentials = service_account.Credentials.from_service_account_info(
            data,
            scopes=[
                "https://www.googleapis.com/auth/datastore"
            ]
        )

        credentials.refresh(Request())

        print("Project:", data["project_id"])
        print("Authentication: SUCCESS")

    except Exception as error:
        print("Authentication: FAILED")
        print("Error:", str(error))