# AgriConnect (v2 demo)

    npm install
    npm run dev      # http://localhost:5173

Flow: describe surplus (voice or text) -> check listing + NZ rules questions -> match or "no match" local notifications -> agree & pay into hold -> delivery with change notice, PIN confirmation, payout.
Use the "Demo view" switch (Seller / Buyer / Carrier) on the payment and delivery screens.

- `src/data.js`: fees, farms, categories, compliance questions, delivery rules (edit here)
- `src/engine.js`: parsing, matching, fee settlement

All prices, distances and farms are synthetic. Payments are simulated; a real build needs a licensed NZ payment partner. Compliance wording is general guidance, not legal advice: have a lawyer and MPI review it before launch.
