const TERMS = [
  ['About AgriReuse', 'AgriReuse is an online marketplace that connects NZ farms and growers who have surplus material with those who can use it. We hold payments and share trade details. We are not the seller, the buyer or the carrier, and we do not inspect goods.'],
  ['Your account', 'Accounts are free. You must give accurate details, including your business name and NZBN, keep your password safe, and use one account per business. You are responsible for activity on your account.'],
  ['Fees', 'Joining and listing are free. When a trade completes we deduct 2% of the goods value from the seller\u2019s payout. An optional subscription ($10 per year) sends you alerts about new listings in the categories you choose. Fees may be subject to GST.'],
  ['Seller responsibilities', 'Describe your goods accurately (type, amount, condition) and tell us before dispatch if anything changes. You must follow NZ law that applies to your goods, including the Biosecurity Act 1993, the Agricultural Compounds and Veterinary Medicines Act 1997, the Biosecurity (Meat and Food Waste for Pigs) Regulations 2005, the Biosecurity (Ruminant Protein) Regulations 1999 and the Fair Trading Act 1986. Report suspected exotic pests or diseases to MPI on 0800 80 99 66, and do not move goods that are under movement controls.'],
  ['Buyer responsibilities', 'Check that the goods suit your intended use and use them lawfully. You are responsible for feeding, composting or applying them in line with NZ rules. Pay for the goods and give the carrier your delivery PIN only when the goods arrive.'],
  ['Payments and delivery', 'The buyer\u2019s goods payment and the seller\u2019s transport payment are held by our payment partner. The carrier records pickup and delivered quantities and informs both parties of differences. Goods release uses the lower actual quantity, capped at the agreement, and the unused goods balance is refunded to the buyer. Quality issues pause release for buyer review. After the carrier confirms delivery with the buyer\u2019s PIN, the goods payment (less our fee) goes to the seller and the transport payment is refunded to the seller. If the seller reports a change before dispatch, the buyer can accept it or cancel for a full refund.'],
  ['Problems and disputes', 'Contact us promptly if something goes wrong and we will help both sides reach a fair outcome. Nothing in these terms limits rights you have under NZ law that cannot be excluded.'],
  ['Liability', 'To the extent the law allows, AgriReuse is not liable for the condition, suitability or safety of goods, or for losses from trades between members. We do not guarantee that a match or buyer will be found.'],
  ['Law and changes', 'These terms are governed by New Zealand law. We may update them and will tell members about material changes.'],
]

const PRIVACY = [
  ['What we collect', 'Your name, business name, NZBN, email, your listings and trades, the categories you follow, and basic usage data.'],
  ['How we use it', 'To run your account, match listings, hold and release payments, arrange delivery, send alerts you asked for, and keep the platform safe and fair.'],
  ['Who can see it', 'Other members see your business name, area and listing details. Your contact details are shared with the other party and the carrier only for a confirmed trade. We share information with our payment partner and carriers as needed to complete trades, and with authorities such as MPI when the law requires.'],
  ['Storing and keeping it', 'We keep your information securely for as long as your account is active and as long as the law requires for payment and trade records. In this demo, accounts are stored only in your own browser.'],
  ['Your rights', 'Under the Privacy Act 2020 you can ask to see and correct the information we hold about you. Contact privacy@agrireuse.example (placeholder). If you are unhappy with our response, you can complain to the Office of the Privacy Commissioner.'],
]

export function LegalModal({ tab, setTab, onClose }) {
  const items = tab === 'terms' ? TERMS : PRIVACY
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="rolebar">
          <button className={tab === 'terms' ? 'on' : ''} onClick={() => setTab('terms')}>Terms of Use</button>
          <button className={tab === 'privacy' ? 'on' : ''} onClick={() => setTab('privacy')}>Privacy Policy</button>
        </div>
        <p className="warning">Draft for this demo. Have a NZ lawyer review before launch.</p>
        {items.map(([h, t], i) => (
          <div key={h}><h3>{i + 1}. {h}</h3><p className="muted">{t}</p></div>
        ))}
        <button className="voice-button" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
