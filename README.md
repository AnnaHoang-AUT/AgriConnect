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
- Starting with **Create a listing by voice** enables an automatic speak/listen conversation: initial description, listing summary and corrections, category checks, responsibilities, publication, buyer choice, simulated payment confirmations, carrier quantities and PIN, payout and refunds.
- It asks concise main questions without reading Act names or rule references. Full rules remain visible. Every recognised answer is repeated and must be confirmed aloud before saving. Say **yes** to confirm or **no** to answer again.
- Listening starts automatically after each question finishes. Say **repeat**, **pause**, **back**, or **home**. Home requires spoken confirmation before clearing progress. Resume voice restarts the current screen's review; already confirmed answers remain. Silence never implies consent.
- Account login/registration and optional photo uploads use the screen; passwords are never requested by voice. Voice resumes after sign-in. Demo role switches can be selected by voice; production permissions need server-side enforcement.
- Microphone permission and browser speech recognition/synthesis support are required; use HTTPS or localhost. Unsupported browsers provide on-screen fallback. Microphone errors pause voice with instructions. Actual speech quality and microphone behaviour require device/browser testing.
- Uncertainty about a blocking biosecurity issue now holds the listing rather than allowing it to go live.
- The carrier records actual pickup and delivery quantities and condition notes. Both demo participants see a shared in-app update log.
- Goods release and the 2% fee are calculated from eligible actual quantities. The original buyer hold is retained in the ledger; the unused balance is refunded. The seller transport refund follows the existing demo policy.
- Delivery requires the demo buyer PIN `4821`. Quality concerns pause payout until the buyer explicitly accepts the reported condition at the existing unit price. Otherwise funds remain held for dispute resolution; negotiated discounts are not implemented.

## Try the automatic voice conversation

1. Open the app over HTTPS or localhost in a browser with speech recognition and synthesis.
2. Click **Create a listing by voice** and allow microphone access when requested.
3. If signed out, complete the account form; voice resumes automatically.
4. Wait until the app finishes speaking before answering. For example: “I have four hundred kilograms of apples to collect within three days.”
5. Confirm what it heard using voice. Continue answering and confirming the checks, responsibilities and publication prompt.
6. Use **Pause voice**, **Resume voice**, or **Use screen instead** whenever needed. In text mode, optional individual-question voice controls remain available.

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
- `src/useListingConversation.js`: automatic conversation across listing and trade stages.
- `src/voiceConversation.js`: cancellable speech, automatic listening, confirmations and number parsing.
- `src/voicePrompts.js`: concise spoken questions and responsibilities.
- `src/useRuleVoice.js`: optional individual-question voice controls for users who began with text.
- `src/Account.jsx`: login/signup entry mode.
- `src/data.js`: categories, screening questions and delivery rules.
- `src/engine.js`: parsing, matching and settlement in cents.
- `tests/settlement.test.js`: financial conservation, full/partial/zero quantities, excess cap, invalid values and listing parsing.
- `tests/voice.test.js`: spoken quantities/prices, answer correction, pause, cancellation and repeat.

Verified: production build, lint, nine automated tests, existing React component interaction checks, and a complete spoken-flow component test with mocked speech APIs: automatic resumption after login, review, checks, responsibilities, publication, match selection, payments, quantities, PIN, payouts and refunds. A real browser visual/microphone test was unavailable in the execution environment.

## Demo limitations

Prices, distances and farms are synthetic. Accounts live in this browser; payment holds, refunds, role permissions and notifications are simulated. No messages are actually sent. Trade progress is kept in React state and resets on reload or confirmed Home navigation. Real operation needs authenticated roles, a database, server-side measurement/audit records, dispute handling and payment-provider integration. The existing full transport refund policy still needs a defined funding source for the carrier in production.
