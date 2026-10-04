import unittest
from unittest.mock import patch

import httpx

from app.services.duel_image_service import _fetch_brand_image, fetch_proxied_image, resolve_image


class BrandImagesTest(unittest.TestCase):
    def setUp(self):
        _fetch_brand_image.cache_clear()

    def tearDown(self):
        _fetch_brand_image.cache_clear()

    def response(self, content, media="image/png", status=200):
        return httpx.Response(status, content=content, headers={"content-type": media}, request=httpx.Request("GET", "https://example.com/logo"))

    def test_empty_and_failed_files_fall_back_to_next_variant(self):
        with patch("app.services.duel_image_service.brand_asset_urls", return_value=("first", "second", "third")), \
             patch("app.services.duel_image_service.httpx.get", side_effect=[self.response(b"", status=404), self.response(b""), self.response(b"logo")]) as get:
            self.assertEqual(fetch_proxied_image("Logotypy marek", "example.com"), (b"logo", "image/png"))
            self.assertEqual(get.call_count, 3)
            self.assertEqual(resolve_image("Logotypy marek", "example.com")["imageUrl"], "PROXY")
            self.assertEqual(get.call_count, 3)

    def test_transient_failure_is_not_cached(self):
        with patch("app.services.duel_image_service.brand_asset_urls", return_value=("first",)), \
             patch("app.services.duel_image_service.httpx.get", side_effect=[self.response(b"unavailable", "text/html"), self.response(b"logo")]):
            self.assertIsNone(resolve_image("Logotypy marek", "example.com"))
            self.assertEqual(resolve_image("Logotypy marek", "example.com")["imageUrl"], "PROXY")
