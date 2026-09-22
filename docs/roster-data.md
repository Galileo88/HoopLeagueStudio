# Roster editor data

The roster editor preserves Hoop Land's player objects when editing or moving players. A move changes `tid` to the destination team's ID and updates `contract.tid` when the contract was tied to the source team. Player ID, game history, and the rest of the player record remain intact. The source team's starting lineup drops a reference to the moved player when it contains that player's ID.

The installed Steam build's `data.unity3d` includes a readable `archetypes` text asset. Its ordered rows supply the archetype names shown in Manage Roster. IDs 1–10 correspond to those archetype rows; 0 means none. The skill code choices are the codes found across the repository's ten Pro and College templates. The full skill names were checked against the installed build's IL2CPP metadata and the developer's skill list. The editor displays names while preserving the original codes in exported league data. Imported skill codes outside that list remain selectable and preserved.

The readable assets do not reveal the complete formulas for displayed player rating, skill effects, or all game modifiers. The editor changes stored values and leaves rating calculation to Hoop Land. Before adding a calculated rating or skill effect preview, the compiled game behavior needs to be traced and compared with examples inside the game.
