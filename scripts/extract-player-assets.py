"""Extract Hoop Land player sprite sheets and alphabet art for the web previews.

Usage: python scripts/extract-player-assets.py "C:/.../Hoop Land_Data/data.unity3d"
Requires UnityPy and Pillow. Reads the installed game; writes only player-assets/.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

import UnityPy
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "player-assets"
ROOT.mkdir(exist_ok=True)
env = UnityPy.load(sys.argv[1])
textures = [o for o in env.objects if o.type.name == "Texture2D" and o.assets_file.name == "sharedassets0.assets"]
by_id = {o.path_id: o for o in textures}

layers = {"head": 583, "eye-white": 304, "eye-color": 708, "brow-color": 667,
          "unibrow-color": 753, "idle": 311}
for name, path_id in layers.items():
    by_id[path_id].read().image.save(ROOT / f"{name}.png")

numeric = defaultdict(list)
letters = {}
for obj in textures:
    data = obj.read()
    if len(data.m_Name) == 4 and data.m_Name.isdigit() and data.m_Width == 64:
        numeric[int(data.m_Name)].append(obj)
    if len(data.m_Name) == 1 and data.m_Name.isupper() and data.m_Width == 32:
        letters[data.m_Name] = obj


def right_pixels(obj):
    alpha = obj.read().image.getchannel("A").crop((32, 0, 64, 32))
    return sum(value > 0 for value in alpha.getdata())


hair, facial, accessories = {}, {}, {}
for code, candidates in numeric.items():
    if code == 0:
        continue  # 0000 is the game's empty style.
    hair_obj = max(candidates, key=right_pixels)
    hair[code] = hair_obj
    remaining = [obj for obj in candidates if obj is not hair_obj]
    if code <= 31 and remaining:
        no_back = [obj for obj in remaining if right_pixels(obj) == 0]
        if no_back:
            beard = max(no_back, key=lambda obj: (obj.read().image.getchannel("A").crop((0, 0, 32, 32)).getbbox() or (0, 0, 0, 0))[3])
            facial[code] = beard
            remaining.remove(beard)
    if code <= 25 and remaining:
        accessories[code] = remaining[0]


def atlas(filename, items, tile, columns):
    rows = (max(items, default=0) // columns) + 1
    image = Image.new("RGBA", (columns * tile, rows * tile))
    for code, obj in items.items():
        image.alpha_composite(obj.read().image.convert("RGBA"), ((code % columns) * tile, (code // columns) * tile))
    image.save(ROOT / filename)


atlas("hair.png", hair, 64, 16)
atlas("facial-hair.png", facial, 64, 8)
atlas("head-accessories.png", accessories, 64, 8)
atlas("team-letters.png", {ord(k) - 65: v for k, v in letters.items()}, 32, 8)
(ROOT / "manifest.json").write_text(json.dumps({
    "source": "Installed Hoop Land data.unity3d",
    "layers": layers,
    "hair": {f"{k:04d}": v.path_id for k, v in sorted(hair.items())},
    "facialHair": {f"{k:04d}": v.path_id for k, v in sorted(facial.items())},
    "headAccessories": {f"{k:04d}": v.path_id for k, v in sorted(accessories.items())},
    "letters": {k: v.path_id for k, v in sorted(letters.items())},
}, indent=2) + "\n")
print(f"Extracted {len(hair)} hairstyles, {len(facial)} facial-hair styles, "
      f"{len(accessories)} head accessories, and {len(letters)} letters")
