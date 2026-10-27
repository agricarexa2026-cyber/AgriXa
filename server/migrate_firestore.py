
import os
import json
import time
import base64
import hashlib
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore
from google.api_core.exceptions import ResourceExhausted
from google.cloud.firestore_v1 import DocumentReference

KEYS_DIR = os.path.join(
    os.path.expanduser("~"),
    "Desktop",
    "FirebaseKeys"
)

OLD_KEY = os.path.join(KEYS_DIR, "agricare-old.json")
NEW_KEY = os.path.join(KEYS_DIR, "agricare-new.json")

STATE_FILE = os.path.join(
    os.path.dirname(__file__),
    "firestore_migration_progress.json"
)

EXPECTED_OLD = "agricare-7b511"
EXPECTED_NEW = "agixav2"

old_app = firebase_admin.initialize_app(
    credentials.Certificate(OLD_KEY),
    name="migration_old"
)

new_app = firebase_admin.initialize_app(
    credentials.Certificate(NEW_KEY),
    name="migration_new"
)

if old_app.project_id != EXPECTED_OLD:
    raise RuntimeError("Unexpected source Firebase project")

if new_app.project_id != EXPECTED_NEW:
    raise RuntimeError("Unexpected destination Firebase project")

old_db = firestore.client(app=old_app)
new_db = firestore.client(app=new_app)

def load_progress():
    if not os.path.exists(STATE_FILE):
        return {
            "source": EXPECTED_OLD,
            "destination": EXPECTED_NEW,
            "completed": {},
            "copied": 0
        }

    with open(STATE_FILE, "r", encoding="utf-8") as f:
        state = json.load(f)

    if (
        state.get("source") != EXPECTED_OLD
        or state.get("destination") != EXPECTED_NEW
    ):
        raise RuntimeError("Progress file belongs to another migration")

    return state

progress = load_progress()

def save_progress():
    temp_file = STATE_FILE + ".tmp"

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2)

    os.replace(temp_file, STATE_FILE)

def convert_value(value):
    if isinstance(value, DocumentReference):
        return new_db.document(value.path)

    if isinstance(value, dict):
        return {
            key: convert_value(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [convert_value(item) for item in value]

    if isinstance(value, tuple):
        return [convert_value(item) for item in value]

    return value

def copy_document(snapshot):
    source_path = snapshot.reference.path
    target_ref = new_db.document(source_path)

    if not progress["completed"].get(source_path):
        data = convert_value(snapshot.to_dict() or {})

        target_ref.set(data)

        progress["completed"][source_path] = True
        progress["copied"] += 1

        save_progress()

        print(
            f"[COPIED {progress['copied']}] {source_path}",
            flush=True
        )

    for subcollection in snapshot.reference.collections():
        copy_collection(subcollection)

def copy_collection(collection):
    print(f"\nScanning: {collection.path}", flush=True)

    for snapshot in collection.stream():
        copy_document(snapshot)

def main():
    print("=" * 55)
    print("AGRiCARE FIRESTORE MIGRATION")
    print("=" * 55)
    print(f"FROM: {EXPECTED_OLD}")
    print(f"TO:   {EXPECTED_NEW}")
    print(f"Previously completed: {progress['copied']}")
    print("=" * 55)

    try:
        for collection in old_db.collections():
            copy_collection(collection)

        print("\nMigration pass completed.")
        print(f"Documents copied: {progress['copied']}")
        print("Run a separate verification before switching production.")

    except ResourceExhausted as error:
        save_progress()
        print("\nFIRESTORE QUOTA EXCEEDED")
        print("Migration progress saved.")
        print("Retry after the old project's quota resets.")
        print(f"Documents copied: {progress['copied']}")

    except KeyboardInterrupt:
        save_progress()
        print("\nMigration interrupted.")
        print("Progress saved.")

    except Exception as error:
        save_progress()
        print(f"\nMigration stopped: {error}")
        raise

if __name__ == "__main__":
    main()
