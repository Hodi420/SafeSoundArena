# SafeSoundArena Frontend - Proposed Folder Structure

## src/
- components/         # All React components (UI elements)
- hooks/              # Custom React hooks (move from services/api/hooks/)
- services/           # API and backend logic
    - api/            # API client, endpoints, etc.
- store/              # State management (Zustand, Redux, etc.)
- utils/              # Utility/helper functions
- types/              # TypeScript types/interfaces
- constants/          # App-wide constants
- context/            # React Context providers
- tests/              # All test files (unit, integration, etc.)

## Migration Plan
- Move all files from `services/api/hooks/` to a new `hooks/` directory.
- Move all test files (`*.test.js`, `*.test.ts`) to a new `tests/` directory.
- Ensure all import paths are updated accordingly.

---
This structure makes the codebase easier to navigate and maintain. All UI, logic, state, and helpers are clearly separated.
