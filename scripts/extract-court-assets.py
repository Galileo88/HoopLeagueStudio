"""Extract replaceable court preview PNGs from a local Hoop Land installation.

Requires UnityPy and Pillow. Does not modify the game installation.
Usage: python scripts/extract-court-assets.py "C:/.../Hoop Land_Data/data.unity3d"
"""
import json
import sys
from pathlib import Path

import UnityPy

ROOT = Path(__file__).resolve().parents[1] / "court"
ROOT.mkdir(exist_ok=True)
env = UnityPy.load(sys.argv[1])
regions = {
    (1, 1, 641, 321): "outerWood",
    (1, 26, 641, 296): "innerWood-pro",
    (1, 30, 641, 292): "innerWood-college",
    (1, 113, 641, 209): "outerKey",
    (1, 129, 641, 193): "innerKey",
    (129, 128, 513, 194): "outerFT",
    (96, 129, 546, 193): "innerFT",
}
fixed = {188: "outer-court", 333: "court-lines", 502: "three-point-pro", 271: "three-point-college"}
manifest = []
for obj in env.objects:
    if obj.type.name != "Texture2D" or obj.assets_file.name != "sharedassets0.assets":
        continue
    data = obj.read()
    name = fixed.get(obj.path_id)
    if data.m_Width == 642 and data.m_Height == 322:
        image = data.image
        region = regions.get(image.getbbox())
        if region:
            name = region + "-" + data.m_Name
    if name:
        image = data.image
        image.save(ROOT / (name + ".png"))
        manifest.append({"file": name + ".png", "sourceTexture": obj.path_id, "width": image.width, "height": image.height})
(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Extracted {len(manifest)} court layers into {ROOT}")
