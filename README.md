# Plot Pilot

A mobile app (iOS/Android) that helps people map, manage, and track agricultural land — plots, activities, and key records in one place, replacing scattered notebooks, spreadsheets, and memory.

## Features (MVP)

- Draw plot boundaries on a map (tap-to-place or GPS walk/drive), with auto-calculated area and perimeter
- Plot profile pages: crop, soil type, notes
- Log activities against a plot (planting, spraying, irrigation, harvesting, etc.), with autocomplete on previously used types
- Per-plot activity feed and a combined timeline across all plots
- Dashboard with plot count, recent activity, search, and filter by crop
- Fully offline — all data is stored on-device (SQLite) and is the source of truth, no accounts or cloud sync
- English and European Portuguese (pt-PT) localization

## Tech Stack

- [React Native](https://reactnative.dev/) via [Expo](https://expo.dev/) (TypeScript)
- [MapLibre](https://maplibre.org/) with OpenStreetMap tiles for mapping
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for on-device storage
- [i18next](https://www.i18next.com/) / [react-i18next](https://react.i18next.com/) for localization

## Getting Started

```bash
npm install
npm start
```

Then press `i` for iOS simulator, `a` for Android emulator, or `w` for web — or scan the QR code with the [Expo Go](https://expo.dev/go) app on your device.

## License

MIT — see [LICENSE](./LICENSE).
