#!/usr/bin/env python3
import csv, json, shutil
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "generated_pools"
TEMPLATES = {
    "college": ROOT / "templates" / "college",
    "pro": ROOT / "templates" / "pro",
}

POSITION_LABELS = {
    0: ("PG", "Point Guard"),
    1: ("G", "Guard"),
    2: ("SG", "Shooting Guard"),
    3: ("GF", "Guard-Forward"),
    4: ("SF", "Small Forward"),
    5: ("F", "Forward"),
    6: ("PF", "Power Forward"),
    7: ("FC", "Forward-Center"),
    8: ("C", "Center"),
}

STAFF_ROLE_LABELS = {
    1: ("head_coach", "Head Coach"),
    2: ("assistant_coach", "Assistant Coach"),
    3: ("athletic_trainer", "Athletic Trainer"),
    4: ("talent_scout", "Talent Scout"),
}

PLAYER_BUCKETS = [
    ("teams_roster", lambda d: [
        (p, {"team_collection": "teams", "team_id": t.get("id"), "team_name": " ".join(x for x in [t.get("city",""), t.get("name","")] if x).strip()})
        for t in d.get("teams", []) for p in t.get("roster", [])
    ]),
    ("star_teams_roster", lambda d: [
        (p, {"team_collection": "starTeams", "team_id": t.get("id"), "team_name": " ".join(x for x in [t.get("city",""), t.get("name","")] if x).strip()})
        for t in d.get("starTeams", []) for p in t.get("roster", [])
    ]),
    ("free_agents", lambda d: [(p, {}) for p in d.get("freeAgents", [])]),
    ("draft_class", lambda d: [(p, {}) for p in d.get("draftClass", [])]),
    ("retirees", lambda d: [(p, {}) for p in d.get("retirees", [])]),
    ("hall_of_fame", lambda d: [(p, {}) for p in d.get("hallOfFame", [])]),
]

def full_name(person):
    return " ".join(x for x in [person.get("fn",""), person.get("ln","")] if x).strip()

def is_nonblank_person(person):
    if not isinstance(person, dict):
        return False
    return bool(full_name(person) or person.get("id") not in (None, 0) or person.get("tag"))

def write_jsonl(path, records):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")

def write_csv(path, fieldnames, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

manifest = {
    "format_version": 1,
    "description": "Player and personnel pools extracted from HoopLeagueStudio college/pro templates. Each JSONL line keeps the original full person object intact under player/person.",
    "position_codes": {str(k): {"short": v[0], "name": v[1]} for k, v in POSITION_LABELS.items()},
    "staff_role_codes": {str(k): {"slug": v[0], "name": v[1]} for k, v in STAFF_ROLE_LABELS.items()},
    "levels": {},
}
source_rows = []

for level, folder in TEMPLATES.items():
    player_groups = defaultdict(list)
    personnel_groups = defaultdict(list)
    player_index_rows = []
    personnel_index_rows = []
    template_summaries = []

    for path in sorted(folder.glob("*.txt")):
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        src_base = {
            "level": level,
            "template_file": path.name,
            "league_name": data.get("leagueName", ""),
            "league_short_name": data.get("shortName", ""),
            "build_version": (data.get("meta") or {}).get("buildVersion", ""),
        }
        template_player_count = 0
        template_personnel_count = 0
        bucket_counts = Counter()
        role_counts = Counter()

        for bucket, getter in PLAYER_BUCKETS:
            for player, extra in getter(data):
                if not isinstance(player, dict):
                    continue
                pos = player.get("pos")
                short, pos_name = POSITION_LABELS.get(pos, (f"POS_{pos}", f"Position {pos}"))
                source = dict(src_base)
                source.update(extra)
                source["bucket"] = bucket
                wrapped = {
                    "source": source,
                    "position": {"code": pos, "short": short, "name": pos_name},
                    "player": player,
                }
                player_groups[short].append(wrapped)
                player_index_rows.append({
                    "template_file": path.name,
                    "league_name": data.get("leagueName", ""),
                    "bucket": bucket,
                    "team_id": extra.get("team_id", ""),
                    "team_name": extra.get("team_name", ""),
                    "player_id": player.get("id", ""),
                    "first_name": player.get("fn", ""),
                    "last_name": player.get("ln", ""),
                    "position_code": pos,
                    "position": short,
                    "position_name": pos_name,
                    "age": player.get("age", ""),
                    "height": player.get("ht", ""),
                    "weight": player.get("wt", ""),
                })
                template_player_count += 1
                bucket_counts[bucket] += 1

        for team_collection in ("teams", "starTeams"):
            for team in data.get(team_collection, []):
                team_meta = {
                    "team_collection": team_collection,
                    "team_id": team.get("id"),
                    "team_name": " ".join(x for x in [team.get("city",""), team.get("name","")] if x).strip(),
                }
                fo = team.get("frontOffice") or {}
                for person in fo.get("staff", []):
                    if not is_nonblank_person(person):
                        continue
                    pos = person.get("pos")
                    slug, role_name = STAFF_ROLE_LABELS.get(pos, (f"staff_pos_{pos}", f"Staff Position {pos}"))
                    source = dict(src_base)
                    source.update(team_meta)
                    source["bucket"] = "frontOffice.staff"
                    wrapped = {"source": source, "category": {"slug": slug, "name": role_name, "pos_code": pos}, "person": person}
                    personnel_groups[slug].append(wrapped)
                    personnel_index_rows.append({
                        "template_file": path.name, "league_name": data.get("leagueName", ""),
                        "team_id": team.get("id", ""), "team_name": team_meta["team_name"],
                        "category": slug, "category_name": role_name, "person_id": person.get("id", ""),
                        "first_name": person.get("fn", ""), "last_name": person.get("ln", ""), "pos_code": pos,
                    })
                    template_personnel_count += 1
                    role_counts[slug] += 1

                for person in fo.get("announcers", []):
                    if not is_nonblank_person(person):
                        continue
                    slug, role_name = "announcer", "Announcer"
                    source = dict(src_base)
                    source.update(team_meta)
                    source["bucket"] = "frontOffice.announcers"
                    wrapped = {"source": source, "category": {"slug": slug, "name": role_name, "pos_code": person.get("pos")}, "person": person}
                    personnel_groups[slug].append(wrapped)
                    personnel_index_rows.append({
                        "template_file": path.name, "league_name": data.get("leagueName", ""),
                        "team_id": team.get("id", ""), "team_name": team_meta["team_name"],
                        "category": slug, "category_name": role_name, "person_id": person.get("id", ""),
                        "first_name": person.get("fn", ""), "last_name": person.get("ln", ""), "pos_code": person.get("pos", ""),
                    })
                    template_personnel_count += 1
                    role_counts[slug] += 1

        global_categories = [
            ("commissioner", "commissioner", "Commissioner", data.get("commissioner")),
            ("referees", "referee", "Referee", data.get("referees", [])),
            ("coaches", "coach", "Coach", data.get("coaches", [])),
            ("media", "media", "Media", data.get("media", [])),
        ]
        for bucket, slug, role_name, value in global_categories:
            people = value if isinstance(value, list) else [value]
            for person in people:
                if not is_nonblank_person(person):
                    continue
                source = dict(src_base)
                source["bucket"] = bucket
                wrapped = {"source": source, "category": {"slug": slug, "name": role_name, "pos_code": person.get("pos")}, "person": person}
                personnel_groups[slug].append(wrapped)
                personnel_index_rows.append({
                    "template_file": path.name, "league_name": data.get("leagueName", ""),
                    "team_id": "", "team_name": "", "category": slug, "category_name": role_name,
                    "person_id": person.get("id", ""), "first_name": person.get("fn", ""),
                    "last_name": person.get("ln", ""), "pos_code": person.get("pos", ""),
                })
                template_personnel_count += 1
                role_counts[slug] += 1

        summary = {
            "template_file": path.name,
            "level": level,
            "league_name": data.get("leagueName", ""),
            "build_version": (data.get("meta") or {}).get("buildVersion", ""),
            "player_count": template_player_count,
            "personnel_count": template_personnel_count,
            "player_buckets": dict(bucket_counts),
            "personnel_categories": dict(role_counts),
        }
        template_summaries.append(summary)
        source_rows.append({
            "level": level, "template_file": path.name, "league_name": data.get("leagueName", ""),
            "build_version": (data.get("meta") or {}).get("buildVersion", ""),
            "player_count": template_player_count, "personnel_count": template_personnel_count,
        })

    level_player_dir = OUT / "players" / level
    level_personnel_dir = OUT / "personnel" / level

    ordered_positions = [POSITION_LABELS[i][0] for i in range(9)]
    for short in ordered_positions:
        write_jsonl(level_player_dir / f"{short}.jsonl", player_groups.get(short, []))
    for short in sorted(k for k in player_groups if k not in ordered_positions):
        write_jsonl(level_player_dir / f"{short}.jsonl", player_groups[short])

    player_fields = ["template_file","league_name","bucket","team_id","team_name","player_id","first_name","last_name","position_code","position","position_name","age","height","weight"]
    write_csv(level_player_dir / "index.csv", player_fields, player_index_rows)

    expected_personnel = ["head_coach","assistant_coach","athletic_trainer","talent_scout","announcer","commissioner","referee","coach","media"]
    for slug in expected_personnel:
        write_jsonl(level_personnel_dir / f"{slug}.jsonl", personnel_groups.get(slug, []))
    for slug in sorted(k for k in personnel_groups if k not in expected_personnel):
        write_jsonl(level_personnel_dir / f"{slug}.jsonl", personnel_groups[slug])

    personnel_fields = ["template_file","league_name","team_id","team_name","category","category_name","person_id","first_name","last_name","pos_code"]
    write_csv(level_personnel_dir / "index.csv", personnel_fields, personnel_index_rows)

    manifest["levels"][level] = {
        "templates": template_summaries,
        "players": {
            "total_records": len(player_index_rows),
            "by_position": {k: len(v) for k, v in sorted(player_groups.items())},
            "index": f"players/{level}/index.csv",
        },
        "personnel": {
            "total_records": len(personnel_index_rows),
            "by_category": {k: len(v) for k, v in sorted(personnel_groups.items())},
            "index": f"personnel/{level}/index.csv",
        },
    }

write_csv(OUT / "source_summary.csv",
          ["level","template_file","league_name","build_version","player_count","personnel_count"],
          source_rows)

with (OUT / "manifest.json").open("w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

readme = """# Hoop League player and personnel pools

These files were extracted from every template in `templates/college` and `templates/pro`.

## Players
- Players are split first by level (college/pro), then by Hoop Land position.
- Each `.jsonl` line is one record.
- The original full player object is preserved unchanged under the `player` key.
- The wrapper adds source/template/team information and a readable position label.
- `index.csv` is a compact searchable list for names, teams, positions, age, height, and weight.

Position sequence used:
- 0 PG — Point Guard
- 1 G — Guard
- 2 SG — Shooting Guard
- 3 GF — Guard-Forward
- 4 SF — Small Forward
- 5 F — Forward
- 6 PF — Power Forward
- 7 FC — Forward-Center
- 8 C — Center

## Staff and other personnel
Team front-office staff are split into:
- Head Coach (pos 1)
- Assistant Coach (pos 2)
- Athletic Trainer (pos 3)
- Talent Scout (pos 4)

Announcers are stored separately. The export also includes Commissioner, Referee, Coach, and Media categories when present in a source template. Empty category files are kept so the folder layout stays stable.

## Data preservation
No fields are removed from player or personnel records. All nested appearance, accessories/suits, attributes, skills, tendencies, status, contracts, stats, history, records, and other source data remain attached to that person's object.

## Source buckets
The extractor looks at active team rosters plus star-team rosters, free agents, draft class, retirees, and Hall of Fame pools when those buckets contain records.

`manifest.json` contains counts by level, position, category, and source template.
"""
(OUT / "README.md").write_text(readme, encoding="utf-8")
print(json.dumps(manifest, indent=2))
