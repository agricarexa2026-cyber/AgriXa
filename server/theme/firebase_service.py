import copy
import threading
import time

from core.firebase import db

SYSTEM_COLLECTION = 'system'

# In-process TTL cache for the theme and system config documents. These are
# fetched on every page load, so caching them briefly cuts Firestore read
# quota usage. Writes through update_* invalidate the cache immediately.
CACHE_TTL_SECONDS = 60

_cache = {}
_cache_lock = threading.Lock()


def _cache_get(key):
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() >= expires_at:
            del _cache[key]
            return None
        return copy.deepcopy(value)


def _cache_set(key, value):
    with _cache_lock:
        _cache[key] = (time.monotonic() + CACHE_TTL_SECONDS, copy.deepcopy(value))


def _cache_invalidate(key):
    with _cache_lock:
        _cache.pop(key, None)


DEFAULT_THEME = {
    'primaryColor': '#478347',
    'secondaryColor': '#87b787',
    'dangerColor': '#e53e3e',
    'backgroundColor': '#fff9e9',
    'textColor': '#204a0e',
    'borderRadius': '8px',
    'minecraftMode': False,
    'minecraftLogo': False,
    'minecraftHero': False,
    'minecraftSteve': False,
    'minecraftMusic': False,
}

def get_theme():
    cached = _cache_get('theme')
    if cached is not None:
        return cached
    doc = db.collection(SYSTEM_COLLECTION).document('theme').get()
    if doc.exists:
        data = doc.to_dict()
        merged = {**DEFAULT_THEME, **data}
        if merged != data:
            db.collection(SYSTEM_COLLECTION).document('theme').set(merged)
        _cache_set('theme', merged)
        return dict(merged)
    db.collection(SYSTEM_COLLECTION).document('theme').set(DEFAULT_THEME)
    _cache_set('theme', DEFAULT_THEME)
    return dict(DEFAULT_THEME)

def update_theme(data):
    db.collection(SYSTEM_COLLECTION).document('theme').set(data, merge=True)
    _cache_invalidate('theme')

def get_system_config():
    cached = _cache_get('config')
    if cached is not None:
        return cached
    doc = db.collection(SYSTEM_COLLECTION).document('config').get()
    defaults = {
        'isSystemEnabled': True,
        'disabledEndpoints': [],
        'useSupabaseAuth': False,
        'dashboardTemplates': {'admin': 1, 'farmer': 1, 'extension_worker': 1},
    }
    if doc.exists:
        data = doc.to_dict()
        for key, val in defaults.items():
            if key not in data:
                data[key] = val
        _cache_set('config', data)
        return dict(data)
    _cache_set('config', defaults)
    return dict(defaults)

def update_system_config(data):
    db.collection(SYSTEM_COLLECTION).document('config').set(data, merge=True)
    _cache_invalidate('config')
