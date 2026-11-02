import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import urllib.request


SCRIPT = Path(__file__).resolve().parents[1] / ".agents/skills/eraser-diagrams/scripts/render.py"
spec = importlib.util.spec_from_file_location("eraser_render", SCRIPT)
render_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(render_module)


class RenderTests(unittest.TestCase):
    def test_posts_dsl_to_current_api_with_bearer_token(self):
        response = {"imageUrl": "https://example.test/image.png", "createEraserFileUrl": "https://example.test/create"}
        with patch.object(urllib.request, "urlopen", return_value=io.BytesIO(json.dumps(response).encode())) as open_url:
            result = render_module.render("Client > API: request\n", "sequence-diagram", "secret-token", team_id="team-1")

        request = open_url.call_args.args[0]
        self.assertEqual(request.full_url, "https://app.eraser.io/api/render/elements")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Authorization"), "Bearer secret-token")
        self.assertEqual(json.loads(request.data), {
            "elements": [{"type": "diagram", "diagramType": "sequence-diagram", "code": "Client > API: request\n"}],
            "theme": "light",
            "background": True,
            "imageQuality": 2,
            "teamId": "team-1",
        })
        self.assertEqual(result, response)


if __name__ == "__main__":
    unittest.main()
