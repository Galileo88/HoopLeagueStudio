# Star ratings

The editor uses the installed Hoop Land 1.09.75 league-editor calculations, not an attribute-average estimate. Stars fill continuously, as in the game's masked star display; they are not rounded to whole or half stars. The stored `rating` field is not the displayed star rating.

Player stars: sum LAY, DNK, INS, MID, TPT, FTS, DRB, PAS, ORE, DRE, STL and BLK at index 0. Clamp the sum to 0–168, subtract 28, divide by 140, clamp to 0.1–1 and multiply by five. STR, SPD and STM do not contribute. No extra position or archetype weighting is applied to player stars.

Team offense: sum each attribute divided by 20 with weights LAY 0.5, DNK 1.5, INS 1, MID 1, TPT 2, FTS 0.5, DRB 1.5, PAS 1, ORE 1; divide by 6. Team defense uses DRE 3, STL 3, BLK 4, also divided by 20 and then 6. Average each component across the saved roster with weight 66 for `linePos < 5`, 33 for positions 5–9, and zero for the remaining players. Overall is `(3 * offense + defense) / 4`, clamped to 0–1 and multiplied by five. Rosters with fewer than five players return zero. Unknown or malformed required data is left unrated.

These are **saved-lineup, league-editor ratings**. No roster sorting or lineup mutation is performed. Templates can have repeated/default `linePos` values, and Hoop Land can assign a different lineup on import; that can change team stars. Franchise-only attribute modifiers and scouting visibility are outside this editor's rating scope. The editor never writes calculated stars back into league exports.

## Verification

Read-only inspection of the installed IL2CPP metadata and GameAssembly.dll identified these relative virtual addresses:

- `PlayerAttributes.TotalAttributes`: 0x7AB3C0; initialization of the 168-point cap: 0x7ABDA0.
- `EditPlayer.StarRating(PlayerData)`: 0x7B1C40.
- `StarRating.UpdateStarRating(PlayerData)`: 0x811480; float display overload: 0x811950.
- `TeamStarRating.OffensiveRating(PlayerData, int)`: 0x898D10; defensive equivalent: 0x897D60.
- Team offense: 0x899350; team defense: 0x898000; overall: 0x899660.

The synthetic fixtures in `tests/fixtures/native-ratings.json` were evaluated against the actual machine-code methods using Unicorn, with IL2CPP initialization and list indexing stubbed and the game mode set outside franchise mode. No game process or save was modified. Forty player cases and twelve team cases match within 0.000001 stars. Calculations retain single-precision operation order. Fixtures contain synthetic attributes and numeric results, not game code.

Browser checks cover narrow/mobile layouts, live updates, team navigation, and preserving the original export fields. A native iOS visual comparison has not been performed.
