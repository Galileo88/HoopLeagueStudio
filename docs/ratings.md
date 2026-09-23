# Star ratings

The editor uses the installed Hoop Land 1.09.75 league-editor calculations, not an attribute-average estimate. Stars fill continuously, as in the game's masked star display; they are not rounded to whole or half stars. The stored `rating` field is not the displayed star rating.

Player stars: sum LAY, DNK, INS, MID, TPT, FTS, DRB, PAS, ORE, DRE, STL and BLK at index 0. Clamp the sum to 0–168, subtract 28, divide by 140, clamp to 0.1–1 and multiply by five. STR, SPD and STM do not contribute. No extra position or archetype weighting is applied to player stars.

Team offense: sum each attribute divided by 20 with weights LAY 0.5, DNK 1.5, INS 1, MID 1, TPT 2, FTS 0.5, DRB 1.5, PAS 1, ORE 1; divide by 6. Team defense uses DRE 3, STL 3, BLK 4, also divided by 20 and then 6. Average each component across the saved roster with weight 66 for `linePos < 5`, 33 for positions 5–9, and zero for the remaining players. Overall is `(3 * offense + defense) / 4`, clamped to 0–1 and multiplied by five. Rosters with fewer than five players return zero. Unknown or malformed required data is left unrated.

The raw component formula remains available as `teamDetails`. Displayed team stars now use **exhibition lineup preparation** on temporary player copies. Valid saved lineups are preserved; duplicate, missing, or invalid slots trigger the installed game's custom-league lineup preparation. It scores current stars and potential, assigns hybrid positions using roster depth and attribute/height tie-breaks, fills starter slots, performs compatible starter/bench swaps, and orders the bench. This path covers custom-league rosters of 5–15 players with complete position, height, potential, and attribute data. Unsupported data keeps the saved-lineup calculation.

Displayed ranks now compare prepared lineups for every league team. New randomized teams and expansion teams are optimized immediately, including valid but inherited template slots. Importing or loading a league repairs invalid or duplicate lineup slots across all teams and preserves existing valid lineups. Updated roster order, team positions, position ranks, and matching startingLineup player references are saved and exported; attributes and player identities are unchanged. Reloading a repaired league is idempotent. Franchise injuries, redshirts, career-performance modifiers and scouting visibility remain outside this custom-league scope.

## Verification

Read-only inspection of the installed IL2CPP metadata and GameAssembly.dll identified these relative virtual addresses:

- `PlayerAttributes.TotalAttributes`: 0x7AB3C0; initialization of the 168-point cap: 0x7ABDA0.
- `EditPlayer.StarRating(PlayerData)`: 0x7B1C40.
- `StarRating.UpdateStarRating(PlayerData)`: 0x811480; float display overload: 0x811950.
- `TeamStarRating.OffensiveRating(PlayerData, int)`: 0x898D10; defensive equivalent: 0x897D60.
- Team offense: 0x899350; team defense: 0x898000; overall: 0x899660.

The synthetic fixtures in `tests/fixtures/native-ratings.json` were evaluated against the actual machine-code methods using Unicorn, with IL2CPP initialization and list indexing stubbed and the game mode set outside franchise mode. No game process or save was modified. Forty player cases and twelve team cases match within 0.000001 stars. Calculations retain single-precision operation order. Fixtures contain synthetic attributes and numeric results, not game code.

Browser checks cover narrow/mobile layouts, live updates, team navigation, and preserving the original export fields. A native iOS visual comparison has not been performed.

Player displays limit the visible star track to the stored overall potential (pot / 2), including half-star caps. Current fill is clipped to that cap; team displays retain their five-star scale.

## Exhibition lineup regression coverage

`tests/fixtures/native-lineups.json` contains stripped numeric roster inputs and native output order for the supplied 32-team NCSA league plus six homogeneous-position variants (PG, C and four hybrid positions). Names, appearance, URLs and other unrelated fields are omitted. The native optimizer at RVA 0x6506A0 and position assignment at 0x46BE80 were executed in Unicorn after the initial lineup-slot sort used by `CheckLineup`. Runtime allocation/list services were stubbed, including the game’s small-list sorting behavior; exhibition availability and empty career history were supplied. Height is included for hybrid-position comparisons. All 38 resulting player orders match the JavaScript preparation.

The Ashland comparison fixture reproduces ranks 2/2/1 and approximately 4.554 offense, 4.192 defense and 4.464 overall stars. Tests also check export immutability, preserving valid lineups, and recomputation after attribute edits. These results validate installed desktop 1.09.75 behavior for this scope; they do not establish universal mobile-version or franchise parity.

The whole-league preparation supersedes the selected-team comparison above: the NCSA reference now ranks Ashland 17th offense, 10th defense and 10th overall when all 32 teams have prepared lineups. Its component star values remain the same.
