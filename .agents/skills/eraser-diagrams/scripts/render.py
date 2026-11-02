#!/usr/bin/env python3
"""Render an Eraser DSL file with the Eraser API."""

import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.request


ENDPOINT = "https://app.eraser.io/api/render/elements"
DIAGRAM_TYPES = (
    "cloud-architecture-diagram",
    "flowchart-diagram",
    "sequence-diagram",
    "entity-relationship-diagram",
    "bpmn-diagram",
)


def render(code, diagram_type, token, team_id=None):
    payload = {
        "elements": [{"type": "diagram", "diagramType": diagram_type, "code": code}],
        "theme": "light",
        "background": True,
        "imageQuality": 2,
    }
    if team_id:
        payload["teamId"] = team_id

    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.load(response)
    if not isinstance(result, dict) or not result.get("imageUrl"):
        raise ValueError("Eraser API response did not contain imageUrl")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("code_file", type=Path, help="UTF-8 Eraser DSL file")
    parser.add_argument("--diagram-type", required=True, choices=DIAGRAM_TYPES)
    parser.add_argument("--team-id", help="Required for an organization API token")
    args = parser.parse_args()

    token = os.environ.get("ERASER_API_TOKEN")
    if not token:
        parser.error("ERASER_API_TOKEN is required")

    try:
        result = render(args.code_file.read_text(encoding="utf-8"), args.diagram_type, token, args.team_id)
    except urllib.error.HTTPError as error:
        parser.exit(1, "Eraser API returned HTTP {}\n".format(error.code))
    except (OSError, urllib.error.URLError, ValueError) as error:
        parser.exit(1, "Render failed: {}\n".format(error))
    print(json.dumps(result, ensure_ascii=False))
