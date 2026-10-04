// Demo data only. Distances, prices and farms are synthetic.
export const FEE = { membership: 10, rate: 0.02 } // $10/yr per member + 2% of goods value

export const farms = [
  { id: 'f1', name: 'Sunrise Banana Farm', type: 'Banana grower', area: 'Northland', rating: 4.8 },
  { id: 'f2', name: 'Green Pastures Farm', type: 'Mixed livestock farm', area: 'Northland', rating: 4.9, interests: ['plant'] },
  { id: 'f3', name: 'Circular Fields', type: 'Mixed cropping farm', area: 'Northland', rating: 4.7, interests: ['plant'] },
  { id: 'f4', name: 'Kauri Market Gardens', type: 'Market garden', area: 'Northland', rating: 4.6, interests: ['organic'], km: 12 },
  { id: 'f5', name: 'Bay Berry Growers', type: 'Berry orchard', area: 'Northland', rating: 4.8, interests: ['organic', 'plant'], km: 27 },
  { id: 'f6', name: 'Hillcrest Nursery', type: 'Plant nursery', area: 'Northland', rating: 4.5, interests: ['organic'], km: 41 },
]

export const demand = [
  { id: 'd1', farmId: 'f2', cat: 'plant', use: 'feed', pathway: 'Potential livestock feed', min: 100, max: 500, unit: 'kg', maxKm: 25, marketRate: 0.55, verify: true },
  { id: 'd2', farmId: 'f3', cat: 'plant', use: 'compost', pathway: 'Composting & soil improvement', min: 200, max: 4000, unit: 'kg', maxKm: 40, marketRate: 0.35, verify: false },
]

export const routes = { f2: { km: 18, min: 24, cost: 31 }, f3: { km: 34, min: 39, cost: 52 } }

export const categories = {
  plant: {
    label: 'Fruit, vegetable & crop waste', price: 0.15, disposal: 0.27,
    uses: ['Livestock feed (after suitability checks)', 'Compost and soil improvement', 'Worm farms and mulch'],
    benefit: 'Low-cost feed or soil input, collected from a nearby farm.',
    questions: [
      { id: 'spray', risk: 'hold', law: 'ACVM Act 1997', text: 'Has it been sprayed or treated with a chemical that is still within its withholding period?' },
      { id: 'pest', risk: 'hold', law: 'Biosecurity Act 1993', text: 'Do you suspect any unwanted or notifiable pest or disease (e.g. fruit fly, myrtle rust)?', help: 'Report suspected pests to MPI on 0800 80 99 66.' },
      { id: 'move', risk: 'hold', law: 'Biosecurity Act 1993', text: 'Does it come from a place under MPI movement controls (controlled area or notice of direction)?' },
      { id: 'meat', risk: 'nofeed', law: 'Meat & Food Waste for Pigs Regs 2005', text: 'Has it touched meat, animal products or catering waste?', help: 'Such material must not go to pigs unless heated to 100°C for one hour. We will exclude it from feed matches.' },
      { id: 'mould', risk: 'nofeed', law: 'Fair Trading Act 1986', text: 'Is there mould, heavy rot, or foreign material such as plastic or glass?' },
    ],
  },
  organic: {
    label: 'Compost, manure & organic matter', price: 0.04, disposal: 0.1,
    uses: ['Garden and orchard soil conditioner', 'Nursery potting mix', 'Pasture renovation'],
    benefit: 'Cheap, nutrient-rich soil input without buying bagged product.',
    questions: [
      { id: 'weed', risk: 'hold', law: 'Biosecurity Act 1993', text: 'Is it likely to contain weed seed or pest material from a notified unwanted organism?' },
      { id: 'move', risk: 'hold', law: 'Biosecurity Act 1993', text: 'Does it come from a farm or area under disease movement restrictions (e.g. M. bovis)?' },
      { id: 'resid', risk: 'nofeed', law: 'ACVM Act 1997', text: 'Could it contain herbicide, antibiotic or other chemical residues?' },
      { id: 'foreign', risk: 'nofeed', law: 'Fair Trading Act 1986', text: 'Does it contain plastic, treated timber or other foreign material?' },
    ],
  },
  animal: {
    label: 'Animal-derived by-products', price: 0.1, disposal: 0.4,
    uses: ['Fertiliser or compost input (not for ruminant feed)'],
    benefit: 'A lawful soil-nutrient pathway for by-products.',
    questions: [
      { id: 'rum', risk: 'hold', law: 'Biosecurity (Ruminant Protein) Regs 1999', text: 'Does it contain ruminant protein (meat, bone or blood meal from cattle, sheep, goats or deer)?', help: 'It must never be fed to cattle, sheep, goats or deer.' },
      { id: 'dis', risk: 'hold', law: 'Biosecurity Act 1993', text: 'Is it from animals with a suspected notifiable disease?' },
      { id: 'untreated', risk: 'nofeed', law: 'Meat & Food Waste for Pigs Regs 2005', text: 'Is it untreated (not heat-treated to 100°C for one hour)?' },
    ],
  },
}

export const declarations = [
  'My description of the goods (type, amount, condition) is accurate. I will tell AgriConnect before pickup if anything changes. (Fair Trading Act 1986)',
  'I understand buyers are responsible for lawful use, and I will not knowingly supply goods for a use that breaks NZ biosecurity or feed rules.',
  'I will report any suspected exotic pest or disease to MPI (0800 80 99 66), and I will not move the goods until it is cleared.',
]

export const deliveryRules = [
  'Seller reports any change in amount or quality before the goods are dispatched. The buyer can accept or cancel for a full refund.',
  'The carrier confirms delivery with the buyer\u2019s 4-digit PIN. Payment is released only after that confirmation.',
  'Goods payment goes to the seller (less 2%). The seller\u2019s transport payment is refunded in full.',
]
