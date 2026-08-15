# Solar Doc Manager — Website (Admin Panel)

Front-end only — talks to the **shared backend** over the network, so it
must be deployed alongside (not instead of) the backend package.

## Setup
1. Deploy the **backend** package first (see its README) and copy its URL.
2. Open `public/config.js` and set:
   ```js
   window.API_BASE = "https://your-backend-url.com";
   ```
3. Deploy this `public/` folder to any static or Node host (Vercel,
   Netlify, your own server — wherever you were planning to deploy it).

## Run locally (for testing before you deploy)
Terminal 1 — start the backend:
```
cd ../backend
node server.js
```
Terminal 2 — start this website:
```
node server.js
```
Open **http://localhost:3002/** — `config.js` already points at
`http://localhost:3000` by default, matching the backend's local port, so
local testing works with no edits.

## Demo login
| Role  | Mobile      | Password  |
|-------|-------------|-----------|
| Admin | 9000000001  | admin123  |

## Keeping in sync with the mobile app
Both this website and the mobile app package must have their `config.js`
pointed at the **same** backend URL. As long as they are, any customer you
add or stage you update here shows up in the mobile app immediately, and
any document a staff member uploads from the app shows up here — they're
really just two different front doors onto the same data.
