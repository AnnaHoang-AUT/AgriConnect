# AgriReuse

List it. Match it. Reuse it.

## Run locally

Extract the ZIP. Open a terminal **inside the AgriConnect-main folder containing package.json**:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. For deployment:

```sh
npm run test
npm run lint
npm run build
```

Deploy the generated `dist` directory with your existing Vercel or Netlify project. This package does not publish changes to your live site.

## What changed

- Clickable logo with the tagline below the name.
- Sticky navigation includes Home, Back where available, account access and the current step. Back from Delivery preserves held funds, measurements and trade progress; Continue to delivery returns to the trade.
- Log in opens the login form; Sign up free opens registration.
- Category appears directly below What is it. `400kg apples` now extracts `apples` without requiring the word “of”.
- Three added categories: clean untreated wood residues, clean scoured wool offcuts and clean processed eggshells. Existing compost and animal categories remain available for compatibility. These are conditional eligibility suggestions, not certifications of low risk or legality.
- Voice mode reads NZ questions, guidance and answer choices one at a time. Select an answer or use Speak my answer, then confirm the recognised answer. Microphone permission and browser speech support are required; use HTTPS or localhost. Typed and on-screen answers remain available. Real microphone and speech output need device/browser testing.
- Uncertainty about a blocking biosecurity issue now holds the listing rather than allowing it to go live.
- The carrier records actual pickup and delivery quantities and condition notes. Both demo participants see a shared in-app update log.
- Goods release and the 2% fee are calculated from eligible actual quantities. The original buyer hold is retained in the ledger; the unused balance is refunded. The seller transport refund follows the existing demo policy.
- Delivery requires the demo buyer PIN `4821`. Quality concerns pause payout until the buyer explicitly accepts the reported condition at the existing unit price. Otherwise funds remain held for dispute resolution; negotiated discounts are not implemented.

## Demonstrate a weight shortfall

1. Create an account, or log in with an account created in this browser.
2. Describe `400kg apples`. Review the listing, answer the NZ questions honestly and accept the responsibilities.
3. For the synthetic demonstration, choose Circular Fields.
4. In Seller view, pay the $52 transport hold. Switch to Buyer and pay the $60 goods hold.
5. Switch to Carrier. Enter 350 kg at pickup and explain the shortfall. Confirm pickup.
6. Enter 320 kg at delivery, explain the difference, and enter PIN `4821`.
7. If a quality concern was checked, switch to Buyer to review and accept it before release.
8. In Carrier view release payments. Goods release is $48 (80%); fee is $0.96; seller goods payout is $47.04; buyer refund is $12; seller transport refund is $52.

Release uses the lower actual pickup/delivery quantity, capped at the accepted agreement. Measurements cannot be negative, delivery cannot exceed pickup, and the UI requires a new agreement for excess goods rather than increasing the charge. Units such as bales and cubic metres use the same quantity logic.

## Category scope and NZ guidance

The added categories are deliberately narrow and offered only for suitable non-food, non-feed uses:

| Category | Eligible description | Exclusions and checks |
| --- | --- | --- |
| Wood residues | Clean untreated shavings, sawdust or chips | Treated/painted/glued timber, foreign material, suspected pests and movement restrictions hold the listing. |
| Wool offcuts | Clean scoured processed fibre with source records | Raw/dirty wool, manure, missing records, unsafe residues or suspected disease hold the listing. |
| Eggshells | Cleaned, heat-treated and dried shells with records | Egg contents, contamination, missing processing records, suspected disease or movement restrictions hold the listing. |

These are platform screening choices, not a claim that MPI has approved each product or process. Lawful trade depends on the source, material, processing, use and applicable restrictions. The questions do not verify documents or check live controlled-area boundaries. Existing broad manure/animal categories have not been certified as low risk. Have category-specific production guidance reviewed before launch.

Primary guidance consulted on 4 October 2026:

- [MPI: animal feed and disease prevention](https://www.mpi.govt.nz/animals/animal-feed-preventing-disease-transfer)
- [MPI: food waste supplied to pigs](https://www.mpi.govt.nz/animals/animal-feed-preventing-disease-transfer/feeding-food-waste-to-pigs-and-preventing-disease)
- [MPI: biosecurity on farms](https://www.mpi.govt.nz/biosecurity/how-to-find-report-and-prevent-pests-and-diseases/biosecurity-on-your-farm-or-lifestyle-block)
- [MPI: egg production and processing](https://www.mpi.govt.nz/food-business/poultry-egg-processing-requirements/egg-production-processing/egg-production-processing-food-safety-requirements)
- [MPI: wool and animal products](https://www.mpi.govt.nz/export/exporting-wool-hides-trophies-and-rendered-animal-products)
- [MPI: Bonamia oyster controls](https://www.mpi.govt.nz/biosecurity/exotic-pests-and-diseases-in-new-zealand/long-term-biosecurity-management-programmes/bonamia-ostreae-parasite-threat-to-flat-oysters) — marine shells were not selected because even empty shells can spread this parasite.

## Files and verification

- `src/App.jsx`: listing, navigation and carrier workflow.
- `src/useRuleVoice.js`: spoken question sequence and confirmed speech answers.
- `src/Account.jsx`: login/signup entry mode.
- `src/data.js`: categories, screening questions and delivery rules.
- `src/engine.js`: parsing, matching and settlement in cents.
- `tests/settlement.test.js`: financial conservation, full/partial/zero quantities, excess cap, invalid values and listing parsing.

Verified: production build, lint, four automated tests, and React component interaction checks covering login/signup, sequential speech with mocked speech APIs, funded back navigation, carrier measurements, quality hold and refunds. A real browser visual/microphone test was unavailable in the execution environment.

## Demo limitations

Prices, distances and farms are synthetic. Accounts live in this browser; payment holds, refunds, role permissions and notifications are simulated. No messages are actually sent. Trade progress is kept in React state and resets on reload or confirmed Home navigation. Real operation needs authenticated roles, a database, server-side measurement/audit records, dispute handling and payment-provider integration. The existing full transport refund policy still needs a defined funding source for the carrier in production.
