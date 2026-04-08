# Project Audit + Rename Report

Generated on: 2026-04-08  
Project root: `d:\next-gen\Next-Gen-Friend`

## 1. Scope Completed

1. Reviewed features and endpoint wiring (renderer IPC invokes vs main IPC handlers).
2. Checked for potentially non-working or unreachable features.
3. Renamed all `harsh` references to `yash` across the project (case-aware: `Harsh` -> `Yash`, `HARSH` -> `YASH`).
4. Verified compile health after changes.

## 2. Endpoint Audit Summary

- Renderer `ipcRenderer.invoke(...)` channels found: **80**
- Main `ipcMain.handle(...)` channels found: **86**
- Invoked channels with no matching handler: **2**

### 2.1 Problems Found (likely non-working features)

1. **Missing handler: `deploy-wormhole`**
   - Invoked from:
     - `src/renderer/src/views/WorkFlowEditor.tsx`
     - `src/renderer/src/services/Iris-voice-ai.ts`
   - Existing handler in main is named:
     - `open-wormhole` in `src/main/services/wormhole.ts`
   - Impact:
     - Macro/tool flow for “deploy wormhole” can fail at runtime due to channel mismatch.

2. **Missing handler: `create-directory`**
   - Invoked from:
     - `src/renderer/src/functions/file-manager-api.ts` (`createFolder`)
   - No `ipcMain.handle('create-directory', ...)` found in `src/main`.
   - Impact:
     - “create folder” tool path can fail at runtime.

### 2.2 Handlers currently not invoked by renderer code (non-blocking)

- `check-keys-exist`
- `check-vault-status`
- `close-drop-zone-ui`
- `consume-pending-oauth-callback`
- `file:reveal`
- `get-device-details`
- `ghost-drag-and-drop`
- `spawn-drop-zone-ui`

## 3. Feature Audit Summary

### Working/available core surfaces

- Dashboard, Macros, Notes, Gallery, Phone, Settings are wired in `src/renderer/src/UI/IRIS.tsx`.

### Feature gap found

1. **Apps view exists but is not wired in navigation**
   - File exists: `src/renderer/src/views/APP.tsx`
   - No import/use of this view in `IRIS.tsx` tab routing.
   - Impact:
     - Apps UI is currently unreachable from the main tab navigation.

## 4. Rename Operation (`harsh` -> `yash`)

### Files updated

1. `CODE_OF_CONDUCT.md`
2. `CONTRIBUTING.md`
3. `electron-builder.yml`
4. `LICENSE`
5. `package.json`
6. `README.txt`
7. `SECURITY.md`
8. `src/renderer/src/functions/gallery-managet-api.ts`
9. `src/renderer/src/services/Iris-voice-ai.ts`
10. `src/main/logic/reality-hacker.ts`

### Rename verification

- Command run: `rg -n -i "harsh" .`
- Result: **No matches found**

## 5. Build/Type Verification

1. `npm run typecheck` -> **Passed**
2. `npm run build` -> **Passed**

## 6. Final Status

- Requested rename is complete across the codebase (`harsh` -> `yash`).
- Endpoint/feature audit completed.
- Two endpoint mismatches were found and documented above as likely runtime breakpoints.
