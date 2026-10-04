from functools import lru_cache

import httpx

from app.core.config import settings

UNSPLASH_URL = "https://api.unsplash.com/search/photos"
TIMEOUT = httpx.Timeout(6.0, connect=3.0)


def _utm(url: str) -> str:
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}utm_source=la_ceramica&utm_medium=referral"


def resolve_image(category: str, prompt: str) -> dict | None:
    if category in {"Logotypy marek", "Herby klubów piłkarskich"}:
        return {"imageUrl": "PROXY", "attribution": "Logo by Brandfetch"} if fetch_proxied_image(category, prompt) else None
    return _resolve_other_image(category, prompt)


@lru_cache(maxsize=128)
def _resolve_other_image(category: str, prompt: str) -> dict | None:
    try:
        if category == "Flagi państw":
            url = f"https://flagcdn.com/w640/{prompt.lower()}.png"
            response = httpx.get(url, timeout=TIMEOUT)
            return {"imageUrl": url, "attribution": None} if response.is_success else None
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
    if category not in {"Logotypy marek", "Herby klubów piłkarskich"}:
        return None
    try:
        return _fetch_brand_image(prompt)
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None


@lru_cache(maxsize=128)
def _fetch_brand_image(domain: str) -> tuple[bytes, str]:
    # Cache only successful downloads. An exception is never cached by lru_cache.
    for url in brand_asset_urls(domain)[:4]:
        try:
            response = httpx.get(url, timeout=TIMEOUT, follow_redirects=True)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
            if not response.content.strip() or not content_type.startswith("image/"):
                continue
            return response.content, content_type
        except httpx.HTTPError:
            continue
    raise ValueError("No downloadable brand image")


@lru_cache(maxsize=128)
def brand_asset_urls(domain: str) -> tuple[str, ...]:
    if not settings.brandfetch_api_key:
        raise ValueError("Brandfetch is not configured")
    response = httpx.get(
        f"https://api.brandfetch.io/v2/brands/{domain}",
        headers={"Authorization": f"Bearer {settings.brandfetch_api_key}"},
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    logos = response.json().get("logos") or []
    urls = []
    for preferred_type in ("symbol", "icon", "logo"):
        for preferred_format in ("png", "webp", "svg", "jpeg"):
            for logo in logos:
                if logo.get("type") != preferred_type:
                    continue
                for item in logo.get("formats") or []:
                    if item.get("format") == preferred_format and item.get("src") and item["src"] not in urls:
                        urls.append(item["src"])
    if not urls:
        raise ValueError("No brand assets")
    return tuple(urls)
