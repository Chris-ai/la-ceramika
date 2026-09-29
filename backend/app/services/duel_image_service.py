from functools import lru_cache

import httpx

from app.core.config import settings

UNSPLASH_URL = "https://api.unsplash.com/search/photos"
TIMEOUT = httpx.Timeout(6.0, connect=3.0)


def _utm(url: str) -> str:
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}utm_source=la_ceramica&utm_medium=referral"


@lru_cache(maxsize=128)
def resolve_image(category: str, prompt: str) -> dict | None:
    try:
        if category == "Flagi państw":
            url = f"https://flagcdn.com/w640/{prompt.lower()}.png"
            response = httpx.get(url, timeout=TIMEOUT)
            return {"imageUrl": url, "attribution": None} if response.is_success else None
        if category in {"Logotypy marek", "Herby klubów piłkarskich"}:
            if brand_asset_url(prompt):
                return {"imageUrl": "PROXY", "attribution": "Logo by Brandfetch"}
            return None
        if category == "Zwierzęta":
            if not settings.unsplash_access_key:
                return None
            response = httpx.get(
                UNSPLASH_URL,
                params={"query": prompt, "per_page": 10, "orientation": "landscape", "content_filter": "high"},
                headers={"Authorization": f"Client-ID {settings.unsplash_access_key}"},
                timeout=TIMEOUT,
            )
            response.raise_for_status()
            results = response.json().get("results", [])
            if not results:
                return None
            photo = results[0]
            user = photo["user"]
            return {
                "imageUrl": photo["urls"]["regular"],
                "attribution": {
                    "author": user["name"],
                    "authorUrl": _utm(user["links"]["html"]),
                    "source": "Unsplash",
                    "sourceUrl": "https://unsplash.com/?utm_source=la_ceramica&utm_medium=referral",
                },
            }
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None
    return None


def fetch_proxied_image(category: str, prompt: str) -> tuple[bytes, str] | None:
    if category in {"Logotypy marek", "Herby klubów piłkarskich"}:
        url = brand_asset_url(prompt)
        if not url:
            return None
        try:
            response = httpx.get(url, timeout=TIMEOUT, follow_redirects=True)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "image/png").split(";", 1)[0]
            if not content_type.startswith("image/"):
                return None
            return response.content, content_type
        except httpx.HTTPError:
            return None
    return None


@lru_cache(maxsize=128)
def brand_asset_url(domain: str) -> str | None:
    if not settings.brandfetch_api_key:
        return None
    try:
        response = httpx.get(
            f"https://api.brandfetch.io/v2/brands/{domain}",
            headers={"Authorization": f"Bearer {settings.brandfetch_api_key}"},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        logos = response.json().get("logos", [])
        for preferred_type in ("symbol", "icon", "logo"):
            for logo in logos:
                if logo.get("type") != preferred_type:
                    continue
                formats = logo.get("formats", [])
                for preferred_format in ("svg", "png", "webp", "jpeg"):
                    match = next((item for item in formats if item.get("format") == preferred_format), None)
                    if match and match.get("src"):
                        return match["src"]
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None
    return None

