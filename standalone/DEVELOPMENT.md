# Standalone development

`Hoopland League Studio.html` is the authoritative application: its JavaScript, styles, and optional league template are embedded. No hosted project or build dependencies are required.

From the repository root, run:

```
node build-standalone.mjs
node verify-standalone.mjs
node verify-standalone-assets.mjs
node verify-standalone-picker.mjs
node verify-league-structure.cjs
```

The validation script never scans or bundles repository images. User archives are added through the application.

Package with PowerShell:

```
Compress-Archive -LiteralPath 'standalone/Hoopland League Studio.html','standalone/READ ME.txt' -DestinationPath 'standalone/Hoopland League Studio.zip' -Force
```

The ZIP contains only the standalone HTML and user instructions. Keep the filename/location stable where practical because browser draft storage may depend on it.
