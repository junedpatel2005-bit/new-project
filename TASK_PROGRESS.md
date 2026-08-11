# Task Progress: Show on Map Button Implementation

## Analysis
The "Show on map" button functionality is already implemented in the code:
- ProCard has a "Show on map" button that calls `onShowLocation` callback
- Discover page handles the callback by finding the professional's `displayPoint`, setting `selectedPoint`, enabling `showMap`, and scrolling to map
- ProfessionalDiscoveryMap accepts `selectedPoint` prop to focus on a specific location

## Issue
The seed data doesn't include `professionalLatitude` and `professionalLongitude` fields, so `displayPoint` is always undefined. The `createDisplayPoint` function in `geo.ts` requires these coordinates.

## Plan
- [x] Analyze the current implementation
- [x] Identify the root cause (missing lat/lng in seed data)
- [x] Update seed.ts to include latitude/longitude for professionals
- [x] Re-seed the database
- [x] Test the "Show on map" functionality
- [x] Verify the map opens and shows the professional's location
- [ ] Create a professional account with location set to Surat, Gujarat
- [ ] Verify the Surat professional appears on the map