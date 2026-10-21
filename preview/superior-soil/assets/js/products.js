/* Superior Soil Supplements product catalog.
   Every analysis below is taken from the label, guaranteed analysis or lab sheet on file.
   To add a product: copy a line, give it a unique id, and pick a cat from SS_CATEGORIES. */
window.SS_CATEGORIES = {
  gypsum:     { label: "Gypsum", page: "gypsum.html" },
  solution:   { label: "Solution grade", page: "solution.html" },
  lime:       { label: "Limestone and dolomite", page: "amendments.html" },
  sulfur:     { label: "Sulfur", page: "amendments.html" },
  compost:    { label: "Compost and manure", page: "amendments.html" },
  specialty:  { label: "Specialty and fertilizer", page: "amendments.html" },
  biological: { label: "Biologicals", page: "amendments.html" },
  wood:       { label: "Bark and wood products", page: "landscape.html" }
};

window.SS_PRODUCTS = [
  // Gypsum (bulk, broadcast)
  { id: "tr100", cat: "gypsum", name: "Empire TR-100", sub: "Mined in Empire, Nevada. 60% dihydrate, 40% anhydrite.", analysis: "100% gypsum equivalent, 24% Ca, 19% S", forms: ["Bulk"], flags: [], doc: "assets/docs/empire-tr-100-guaranteed-analysis.pdf", unit: "tons" },
  { id: "e90", cat: "gypsum", name: "Empire Gypsum 90", sub: "Mined in Empire, Nevada. High-purity dihydrate.", analysis: "90% CaSO₄·2H₂O, 21% Ca, 16% S", forms: ["Bulk"], flags: [], doc: "assets/docs/empire-gypsum-90-guaranteed-analysis.pdf", unit: "tons" },

  // Solution grade
  { id: "p97", cat: "solution", name: "Diamond K Premium 97", sub: "Solution grade calcium sulfate dihydrate", analysis: "97% CaSO₄·2H₂O; 97% passing 200 mesh, 92% passing 325 mesh", forms: ["Silo", "Super sacks", "50 lb bags"], flags: ["solution"], doc: "assets/docs/diamond-k-premium-97.pdf", unit: "tons" },
  { id: "p95ha", cat: "solution", name: "Diamond K Premium 95 HA", sub: "Solution gypsum with humic acids, wettable powder", analysis: "95% CaSO₄·2H₂O, 22.12% Ca, 17.58% S, 0.75% humic acids", forms: ["Super sacks", "50 lb bags"], flags: ["solution", "omri"], doc: "assets/docs/diamond-k-premium-95-ha.pdf", unit: "tons" },
  { id: "x95", cat: "solution", name: "Ultra Fine x95 Solution Gypsum", sub: "Ultra fine solution grade gypsum", analysis: "Contact us for current analysis", forms: ["Silo", "Super sacks"], flags: ["solution"], doc: "", unit: "tons" },
  { id: "kms", cat: "solution", name: "Diamond K KMS", sub: "Potassium magnesium sulfate, ground to 325 mesh", analysis: "21% potassium, 11% magnesium, 22% sulfur; low chloride", forms: ["Super sacks", "50 lb bags"], flags: ["solution", "omri"], doc: "assets/docs/diamond-k-kms.pdf", unit: "tons" },
  { id: "aqua", cat: "solution", name: "Aqua Drive Elite", sub: "Nonionic soil surfactant for water penetration", analysis: "Alkylpolyglucoside 31%, poloxalene 19%, polydimethylsiloxane 2%", forms: ["Liquid"], flags: ["solution"], doc: "", unit: "gallons" },

  // Limestone and dolomite
  { id: "bml", cat: "lime", name: "Blue Mountain Limestone", sub: "Agricultural limestone, Columbia, CA", analysis: "95% CCE, 32% Ca, 1% Mg; lime score 90; 86% passing 100 mesh", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "smi", cat: "lime", name: "SMI Limestone", sub: "High-calcium limestone", analysis: "98% CCE", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "flower", cat: "lime", name: "Ag Flower Limestone", sub: "OMRI listed limestone", analysis: "80% CCE", forms: ["Bulk"], flags: ["omri"], doc: "", unit: "tons" },
  { id: "beet", cat: "lime", name: "Beet Lime", sub: "Calcium carbonate byproduct of sugar beet processing", analysis: "Contact us for current analysis", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "bmd", cat: "lime", name: "Blue Mountain Dolomite", sub: "Calcium and magnesium liming material", analysis: "95% CCE", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "ag90", cat: "lime", name: "AG 90 Dolomite", sub: "Liming material and Ca/Mg supplement", analysis: "90% CCE, 20.3% Ca, 11.0% Mg; Oregon lime score 88", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "odol", cat: "lime", name: "OMRI Dolomite", sub: "Dolomite for certified organic ground", analysis: "90% CCE", forms: ["Bulk"], flags: ["omri"], doc: "", unit: "tons" },

  // Sulfur
  { id: "sfines", cat: "sulfur", name: "Screened Sulfur Fines", sub: "Elemental sulfur for lowering soil pH", analysis: "99% S", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "microsul", cat: "sulfur", name: "MicroSul Sulfur", sub: "Elemental sulfur product", analysis: "70% S", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "sr90", cat: "sulfur", name: "SR 90 Sulfur", sub: "Degradable sulfur", analysis: "90% S", forms: ["Bulk", "Bags"], flags: [], doc: "", unit: "tons" },
  { id: "dispersul", cat: "sulfur", name: "Martin DisperSul", sub: "Bentonite-degradable sulfur pastille", analysis: "90% S", forms: ["Bulk", "Bags"], flags: [], doc: "", unit: "tons" },
  { id: "osulf", cat: "sulfur", name: "OMRI Sulfur", sub: "Sulfur for certified organic ground", analysis: "Contact us for current analysis", forms: ["Bulk"], flags: ["omri"], doc: "", unit: "tons" },

  // Compost and manure
  { id: "allgreen", cat: "compost", name: "Superior All-Green Compost", sub: "Green waste compost; CDFA registered organic input material", analysis: "Lab analysis available on request", forms: ["Bulk"], flags: ["organic"], doc: "", unit: "tons" },
  { id: "dairy", cat: "compost", name: "Dairy Manure Compost", sub: "Composted dairy manure", analysis: "Typical as received: 1.1% N, 1.0% P₂O₅, 2.3% K₂O, 25.8% OM", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "steer", cat: "compost", name: "Steer Manure Compost", sub: "Composted feedlot manure", analysis: "Lab analysis available on request", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "duck", cat: "compost", name: "Duck Manure", sub: "Dry, low moisture manure; high phosphate", analysis: "Typical as received: 1.0% N, 2.17% P₂O₅, 1.39% K₂O, 8% moisture", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },
  { id: "cblend", cat: "compost", name: "Custom compost blends", sub: "Compost or manure blended with gypsum, lime, zeolite or micronutrients for one pass", analysis: "Built to your soil test", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },

  // Specialty and fertilizer
  { id: "zeolite", cat: "specialty", name: "KMI Zeolite", sub: "Natural clinoptilolite from Pahrump, Nevada", analysis: "97% clinoptilolite; CEC 2.0 meq/g; 40 m²/g surface area", forms: ["Bulk", "Super sacks"], flags: ["omri"], doc: "assets/docs/kmi-zeolite-grower-guide.pdf", unit: "tons" },
  { id: "biochar", cat: "specialty", name: "Wood biochar", sub: "Forest-biomass biochar screened to 1/4 inch; CDFA organic input material", analysis: "Stable carbon for water and nutrient holding", forms: ["Bulk"], flags: ["organic"], doc: "", unit: "yards" },
  { id: "humate", cat: "specialty", name: "Black Earth Humates", sub: "Humic and fulvic source", analysis: "Contact us for current analysis", forms: ["Bulk", "Bags"], flags: [], doc: "", unit: "tons" },
  { id: "sop", cat: "specialty", name: "Yara Sulfate of Potash, granular", sub: "Potassium and sulfur with a low salt index", analysis: "0-0-50 with sulfate sulfur", forms: ["Bulk", "Bags"], flags: [], doc: "", unit: "tons" },
  { id: "fert", cat: "specialty", name: "Custom dry fertilizer blends", sub: "N-P-K and micronutrients blended with amendments", analysis: "Formulated by our agronomist", forms: ["Bulk"], flags: [], doc: "", unit: "tons" },

  // Biologicals
  { id: "zeltec", cat: "biological", name: "ZelTec", sub: "Dry biological inoculant by AgVerra", analysis: "Bacteria 1 billion CFU/g, fungi 1 million CFU/g, endomycorrhizae 11,700 prop/lb", forms: ["Dry wettable powder"], flags: ["omri", "solution"], doc: "assets/docs/zeltec-product-sheet.pdf", unit: "lbs" },
  { id: "nitryx", cat: "biological", name: "Nitryx SP", sub: "Biological nitrogen fixer", analysis: "Paenibacillus polymyxa, 2 × 10⁹ CFU/g", forms: ["Soluble powder"], flags: ["solution"], doc: "", unit: "lbs" },
  { id: "megaphos", cat: "biological", name: "MegaPhos SP", sub: "Biological phosphorus solubilizer", analysis: "Bacillus megaterium, 1 × 10¹⁰ CFU/g", forms: ["Soluble powder"], flags: ["solution"], doc: "", unit: "lbs" },
  { id: "armory", cat: "biological", name: "Armory SP", sub: "Beneficial Bacillus and Streptomyces blend", analysis: "Total Bacillus 1.2 × 10¹⁰ CFU/g", forms: ["Soluble powder"], flags: ["solution"], doc: "", unit: "lbs" },
  { id: "fpe", cat: "biological", name: "Fermented Plant Extracts (FPE)", sub: "Liquid soil probiotic and biostimulant", analysis: "Small-batch fermented plant inputs", forms: ["Liquid"], flags: ["solution"], doc: "", unit: "gallons" },

  // Bark and wood products (all 100% virgin forest material unless noted)
  { id: "fir-saw", cat: "wood", group: "Fir", name: "Cross cut fir sawdust", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "fir-shav", cat: "wood", group: "Fir", name: "Fir shavings", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "fir-chips", cat: "wood", group: "Fir", name: "Fir chips", sub: "1/2 to 1-1/4 inch", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "fir-fines", cat: "wood", group: "Fir", name: "Fir fines", sub: "0 to 1/4 inch", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "fir-aged", cat: "wood", group: "Fir", name: "Aged fir fines", sub: "0 to 1/4 inch", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "pebble", cat: "wood", group: "Fir", name: "Mini pebble bark", sub: "1/4 inch coarse", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "deco-mini", cat: "wood", group: "Fir", name: "Mini deco bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "deco-s", cat: "wood", group: "Fir", name: "Small deco bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "deco-m", cat: "wood", group: "Fir", name: "Medium deco bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "deco-l", cat: "wood", group: "Fir", name: "Large deco bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "walk-sup", cat: "wood", group: "Fir", name: "Superior Walk On Bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "walk-supreme", cat: "wood", group: "Fir", name: "Supreme Walk On Bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "rw-saw", cat: "wood", group: "Redwood", name: "Redwood sawdust", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "rw-shav", cat: "wood", group: "Redwood", name: "Redwood shavings", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "rw-nitro", cat: "wood", group: "Redwood", name: "Nitrolized redwood shavings", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "rw-chips", cat: "wood", group: "Redwood", name: "Redwood chips", sub: "1/4 to 3/4 inch", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "rw-3", cat: "wood", group: "Redwood", name: "Triple grind redwood bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "rw-2", cat: "wood", group: "Redwood", name: "Double grind redwood bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "rw-1", cat: "wood", group: "Redwood", name: "Single grind redwood bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "ce-saw", cat: "wood", group: "Cedar", name: "Cedar sawdust", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "ce-shav", cat: "wood", group: "Cedar", name: "Cedar shavings", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "ce-chips", cat: "wood", group: "Cedar", name: "Cedar chips", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "ce-ground", cat: "wood", group: "Cedar", name: "Ground cedar bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "ce-shred", cat: "wood", group: "Cedar", name: "Shredded cedar bark", sub: "", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "or-fines", cat: "wood", group: "Orchard", name: "Orchard fines", sub: "Similar to sawdust", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "or-1", cat: "wood", group: "Orchard", name: "Orchard #1 grind", sub: "3/4 to 1-1/2 inch", analysis: "", forms: [], flags: [], unit: "yards" },
  { id: "or-2", cat: "wood", group: "Orchard", name: "Orchard #2 grind", sub: "1-1/2 to 2-1/2 inch", analysis: "", forms: [], flags: [], unit: "yards" }
];

/* Root zone explorer: what each nutrient does and how Superior Soil supplies it */
window.SS_NUTRIENTS = {
  N: { name: "Nitrogen", does: "Drives leaf and shoot growth and builds protein. It is the nutrient most crops use the most of.", short: "Pale, yellowing older leaves and slow, thin growth.", products: ["fert", "nitryx", "dairy", "zeolite"], test: "Standard soil test: available nitrate and ammonium, plus estimated nitrogen release." },
  P: { name: "Phosphorus", does: "Powers root growth, energy transfer, bloom and set.", short: "Dull, dark or purple-tinted leaves, weak roots and poor set.", products: ["megaphos", "duck", "fert"], test: "Mehlich III phosphorus on the standard soil test." },
  K: { name: "Potassium", does: "Controls water use, moves sugars and sizes nuts and fruit.", short: "Scorched edges on older leaves and undersized fruit or nuts.", products: ["kms", "sop", "fert"], test: "Mehlich III potassium and base saturation." },
  Ca: { name: "Calcium", does: "Builds strong cell walls and fruit firmness, and flocculates clay so water moves into the soil.", short: "Tip burn, fruit disorders, and sealed or crusted ground.", products: ["p97", "tr100", "bml"], test: "Base saturation on the soil test; calcium and SAR on the water test." },
  Mg: { name: "Magnesium", does: "Sits at the center of every chlorophyll molecule.", short: "Yellowing between the veins of older leaves.", products: ["kms", "ag90", "bmd"], test: "Mehlich III magnesium and the calcium to magnesium ratio." },
  S: { name: "Sulfur", does: "Builds proteins and enzymes and works hand in hand with nitrogen.", short: "Even yellowing of the youngest leaves.", products: ["e90", "kms", "sop", "sfines"], test: "Mehlich III sulfur on the soil test; sulfate on the water test." },
  micro: { name: "Zinc, iron and manganese", does: "Run the enzymes behind growth and chlorophyll. Zinc drives early shoot and leaf expansion.", short: "Little leaf and rosetting (zinc) or yellow young leaves with green veins (iron, manganese), most often on high-pH ground.", products: ["fert", "sfines", "humate"], test: "Mehlich III micronutrients and soil pH." },
  B: { name: "Boron", does: "Needed for pollination, nut and fruit set, and healthy new growth.", short: "Poor set and tip dieback. Too much is toxic, so the water gets tested too.", products: ["fert"], test: "Soil boron, plus boron on the irrigation water analysis." },
  bio: { name: "Soil biology", does: "Microbes cycle nutrients, unlock phosphorus, fix nitrogen and protect roots.", short: "Tired ground, low organic matter, slow response to fertilizer, or soil after fumigation.", products: ["zeltec", "armory", "fpe", "allgreen"], test: "Organic matter and estimated nitrogen release on the soil test." },
  water: { name: "Water and sodium", does: "Nutrients only reach roots that water reaches. Sodium, and very clean low-salt water, both seal the surface.", short: "Water ponds or runs off, salt burn on leaf edges, uneven stands.", products: ["p97", "tr100", "aqua"], test: "Irrigation water analysis and a saturated paste test." }
};
