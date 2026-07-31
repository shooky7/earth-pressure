# Earth Pressure Calculator

A geotechnical engineering calculator for lateral earth pressure analysis using Rankine, Coulomb, and At-Rest (Jaky) theories.

## Features

- **Rankine Theory** — Active & Passive pressure coefficients
- **Coulomb Theory** — Accounts for wall friction (δ), backfill slope (β), wall inclination (θ)
- **At-Rest (K₀)** — Jaky's formula with OCR support
- **Water Table** — Pore water pressure included automatically
- **Cohesive Soils** — Tension crack depth calculation
- **Resultant Forces** — Total force and point of action
- **Charts** — Pressure distribution with depth (Recharts)
- **Theory Recommendation** — Suggests best theory for your conditions
- **Printable Results** — Print/export from the browser

## Deploy to AWS Amplify

### Option 1: Connect Git Repo (Recommended)

1. Push this folder to a GitHub/GitLab/Bitbucket repo
2. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
3. Click **New app → Host web app**
4. Connect your Git provider and select the repo
5. Amplify auto-detects the `amplify.yml` — click **Save and deploy**
6. Your app is live in ~2 minutes ✅

### Option 2: Manual Deploy

```bash
npm install
npm run build
# Then drag-drop the /build folder into Amplify Console
```

## Local Development

```bash
npm install
npm start
# Opens at http://localhost:3000
```

## Tech Stack

- React 18
- Recharts (pressure distribution charts)
- AWS Amplify (hosting)
- Pure CSS (no UI framework)

## Formulas Used

| Theory | Formula |
|--------|---------|
| Rankine Ka | `tan²(45° − φ/2)` |
| Rankine Kp | `tan²(45° + φ/2)` |
| Coulomb Ka | Wedge theory with δ, β, θ |
| Jaky K₀ | `(1 − sin φ) × OCR^sin φ` |
| Active pressure | `σh = Ka·σv − 2c√Ka` |
| Tension crack | `zc = 2c / (γ√Ka)` |

## Disclaimer

For preliminary design only. Always verify with a licensed geotechnical engineer.
