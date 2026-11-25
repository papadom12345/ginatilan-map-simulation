# Ginatilan water supply map simulation

This educational MapLibre simulation uses illustrative spring yields, barangay tank levels, meter readings, and estimated pipeline routes. It does not show surveyed or official municipal water infrastructure.

## Run locally

From the repository root, start a local static server:

```powershell
python -m http.server 8000
```

Open [http://localhost:8000/html,css,js/](http://localhost:8000/html,css,js/) in a browser. The map uses MapLibre GL JS from jsDelivr and public OpenStreetMap, Esri, and elevation tile services, so an internet connection is needed for map tiles.

## Simulation controls

- Play/Pause, Reset, and the adjustable 1x–100x speed control govern simulation time and flow animation (default 4x).
- Weather, intensity, spring yield, flow rate, and pressure change the simulation.
- Use the pipeline manager to select, close/open, simulate a blockage, rename, reshape, recolor, change status, or delete an estimated route. Generated-route edits persist in this browser; Reset restores the generated network.
- Add a manual route, click its start and turning points to preview the traced line, then choose Finish Pipeline or Cancel. Start, turn, and end points are marked; the saved route stays visible and selected routes are highlighted. Edit, undo, redo, and delete remain available. Manual routes persist in this browser using local storage.
- Undo and Redo reverse recent pipeline creations, deletions, route edits, names, and status changes; restored states are saved in this browser.
- Selecting a route opens Pipeline Settings on the map. Its 25%–300% particle-speed control changes that route's visual animation only, not simulated flow volume; the setting is saved and included in Undo/Redo.
- Water Supply, Pipe Manager, and Pipeline Settings share independent chevron controls to collapse or restore each panel without changing simulation or pipeline state.
- The map-style selector switches between street, satellite, labeled satellite, terrain, dark, and light base maps without a page reload.
- Choose Map Only to expand the map and enter browser fullscreen. Exit Map Only or press Escape to return to the dashboard without resetting the simulation; a compact toolbar keeps map style, zoom, reset-view, and pipeline visibility controls available.
- Select a barangay marker or tank marker to inspect its simulated meter readings or storage level. Click a spring marker to toggle its source.
- Tilt, Town, Orbit, and Satellite preserve the original map controls.
