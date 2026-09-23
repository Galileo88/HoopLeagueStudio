# NCSA exhibition rating comparison

Investigated the user-supplied NCSA export and Ashland State screenshots on September 22, 2026. The reference display shows offense 2nd, defense 2nd, overall 1st. The current app returns 10th, 5th, 4th from the supplied export, reproducing the reported problem.

## Findings

Ashland has 13 players. The first ten have lineup slots 0–9, but Curtis Boyer, Kenny Jensen, and Bryan Richardson also have slot 0. The separate `startingLineup` contains only the first ten player IDs. Consequently, the app counts eight starters instead of five.

Using only the saved ten-player lineup is insufficient: assigning roster-order slots throughout the league produces Ashland ranks of 2nd offense, 13th defense, and 1st overall.

A diagnostic reorder of Ashland alone, by descending `3 * playerStars + 2 * pot`, with five starters and five bench contributors, produces:

| Component | Raw score | Stars | Rank |
|---|---:|---:|---:|
| Offense | 0.90972227 | 4.54861 | 2 |
| Defense | 0.82944435 | 4.14722 | 2 |
| Overall | 0.88965279 | 4.44826 | 1 |

This reproduces all screenshot ranks. It is a diagnostic match, **not proof that this simple sort reproduces the complete native lineup optimizer**. That optimizer also handles positional assignment, availability, position rank, and swaps. Applying the diagnostic reorder to every team changes Ashland's ranks again.

## Installed-game evidence

Read-only inspection of the installed 1.09.75 executable shows:

- `TeamSelect.OnEnable` (RVA 0x54AE50) calls `EditLineup.CheckLineup` for the two selected teams at 0x54B69D and 0x54B6B6 before refreshing the display.
- `CheckLineup` (0x64DE80) checks for invalid/duplicate lineup slots and calls `OptimizeLineup` at 0x64E352 when repair is needed.
- `OptimizeLineup` (0x6506A0) calls `TeamData.SetPlayerPositions` (0x46BE80), then assigns starters and bench slots using position ranks and ratings.
- `GetLineupRating` (0x64F0B0) calls `CalculateCompositeScore` (0x8B5B80). Its inputs include current stars, potential, and recent performance. The simplified diagnostic above does not implement all of these paths.
- Team ranking routines compare raw team component scores across the supplied league list. They do not repair all teams' lineups before sorting.

This establishes a selected-team repair path that can make exhibition ranks depend on the current in-memory lineup state, not just the original export. It does not establish every team previously selected in the user's mobile session, or confirm mobile-version parity.

## Implementation implications

Do not change the verified offense/defense weights or add an invented position-balance penalty to fit one screenshot. The missing behavior is lineup preparation. Before claiming exact exhibition parity, reproduce and validate the complete native lineup preparation, define whether the app compares repaired or exported opponent lineups, and test more than one team. Keep derived lineup calculations separate from the user's exported roster data.

Follow-up: production ratings now prepare the selected team on temporary copies. The complete implemented custom-league preparation was compared against 38 native lineup outputs, including all 32 NCSA teams. This supersedes the simplified diagnostic sort above. The native-prepared Ashland scores are 0.91083330 offense, 0.83833331 defense, and 0.89270830 overall; ranks remain 2/2/1. See `ratings.md` for scope and the saved-opponent comparison policy.
