export const COLORS = {
  primary: '#002C13',
  secondary: '#A73A15',
  success: '#306A43',
  warning: '#CCA72F',
  danger: '#BA1A1A',
  eco: '#F0FDF4',
  ecoText: '#065F46',
  gray: '#717970',
  lightGray: '#F3F4F3',
  white: '#FFFFFF',
  black: '#1A1C1C',
  background: '#F9F9F8',
};

export const GRADES = {
  A: { label: 'Grade A - Like New', color: '#00210d', bg: '#b2f1bf' },
  B: { label: 'Grade B - Lightly Used', color: '#241a00', bg: '#ffe088' },
  C: { label: 'Grade C - Well Used', color: '#3a0a00', bg: '#ffdbd0' },
  D: { label: 'Grade D - Heavily Used', color: '#93000a', bg: '#ffdad6' },
};

const getBaseUrl = () => {

  const NGROK_URL = 'https://unvillainous-shila-hardheadedly.ngrok-free.dev';
  if (NGROK_URL) {
    const url = `${NGROK_URL}/api/`;
    if (__DEV__) console.log('🌐 TUNNEL TARGET:', url);
    return url;
  }

  const MACHINE_IP = '10.122.236.226';
  const url = `http://${MACHINE_IP}:8000/api/`;
  if (__DEV__) console.log('🏠 LOCAL TARGET:', url);
  return url;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
};

export const GRADING_CONFIG = {
  'Tech': [
    { key: 'is_fully_functional', label: 'Fully Functional', desc: 'No internal hardware/software issues', weight: 40 },
    { key: 'battery_health_good', label: 'Good Battery Health', desc: 'Battery holds charge well', weight: 10 },
    { key: 'has_repair_history', label: 'No Repair History', desc: 'Never been opened or repaired', weight: 15 },
    { key: 'has_scratches', label: 'Pristine Screen & Body', desc: 'No visible marks on display or body', weight: 15 },
    { key: 'has_all_accessories', label: 'All Original Parts/Cables', desc: 'Includes all original components and chargers', weight: 10 },
    { key: 'has_original_box', label: 'Original Packaging', desc: 'Comes with retail box', weight: 10 },
  ],
  'Luxury': [
    { key: 'has_receipt', label: 'Proof of Authenticity', desc: 'Includes receipt, invoice, or certificate', weight: 30 },
    { key: 'has_scratches', label: 'Pristine Cosmetic State', desc: 'No stains, rips, tarnishing, or visible wear', weight: 20 },
    { key: 'is_clean', label: 'Cleanliness', desc: 'Odourless and free of dust or dirt', weight: 20 },
    { key: 'has_original_box', label: 'Original Packaging & Dust Bag', desc: 'Comes with original retail box or designer dust bag', weight: 15 },
    { key: 'is_fully_functional', label: 'Fully Functional Hardware', desc: 'Zippers, clasps, locks work perfectly', weight: 10 },
    { key: 'is_modified', label: 'No Alterations', desc: 'Unmodified original stitching and parts', weight: 5 },
  ],
  'Men': [
    { key: 'has_scratches', label: 'Excellent Surface', desc: 'No tears, rips, holes, major stains, or color fading', weight: 30 },
    { key: 'is_clean', label: 'Cleanliness', desc: 'Freshly washed and odour-free', weight: 25 },
    { key: 'is_fully_functional', label: 'Intact Fasteners', desc: 'All zippers, buttons, and drawstrings are fully functional', weight: 20 },
    { key: 'has_original_box', label: 'Original Brand Tags', desc: 'Retail brand tags or care labels are intact', weight: 10 },
    { key: 'is_modified', label: 'No Alterations', desc: 'No custom tailoring or size modifications', weight: 10 },
    { key: 'has_all_accessories', label: 'All Accessories Included', desc: 'Includes optional belts, matching straps, etc.', weight: 5 },
  ],
  'Women': [
    { key: 'has_scratches', label: 'Excellent Surface', desc: 'No tears, rips, holes, major stains, or color fading', weight: 30 },
    { key: 'is_clean', label: 'Cleanliness', desc: 'Freshly washed and odour-free', weight: 25 },
    { key: 'is_fully_functional', label: 'Intact Fasteners', desc: 'All zippers, buttons, and drawstrings are fully functional', weight: 20 },
    { key: 'has_original_box', label: 'Original Brand Tags', desc: 'Retail brand tags or care labels are intact', weight: 10 },
    { key: 'is_modified', label: 'No Alterations', desc: 'No custom tailoring or size modifications', weight: 10 },
    { key: 'has_all_accessories', label: 'All Accessories Included', desc: 'Includes optional belts, matching straps, etc.', weight: 5 },
  ],
  'Books': [
    { key: 'is_fully_functional', label: 'Intact Binding', desc: 'No loose, torn, or missing pages', weight: 30 },
    { key: 'is_clean', label: 'No Markings', desc: 'Pages are free of highlights, ink, or penciled notes', weight: 30 },
    { key: 'has_scratches', label: 'Crisp Cover & Spine', desc: 'No severe creases, corner bends, or spine splitting', weight: 20 },
    { key: 'has_all_accessories', label: 'Clean Pages', desc: 'No significant yellowing, foxing, or moisture odors', weight: 10 },
    { key: 'has_original_box', label: 'Collectible / Dust Jacket', desc: 'First edition, signed copy, or includes dust jacket/slipcase', weight: 10 },
  ],
  'Home & Living': [
    { key: 'has_dents_cracks', label: 'Structural Integrity', desc: 'No cracks, dents, wobbles, or safety defects', weight: 30 },
    { key: 'is_fully_functional', label: 'Fully Functional', desc: 'Drawers slide, joints fit, electrical parts work', weight: 25 },
    { key: 'is_clean', label: 'Cleanliness', desc: 'Free of dust, rust, stains, and mold', weight: 20 },
    { key: 'has_scratches', label: 'Excellent Surface', desc: 'No deep scratches, chips, or discoloration', weight: 15 },
    { key: 'has_all_accessories', label: 'Complete Assembly Parts', desc: 'Includes all screws, brackets, and instruction sheets', weight: 10 },
  ],
  'Default': [
    { key: 'is_fully_functional', label: 'Fully Functional', desc: 'Works exactly as intended', weight: 30 },
    { key: 'is_clean', label: 'Cleanliness', desc: 'Free of stains, dust, or odors', weight: 20 },
    { key: 'has_scratches', label: 'Surface Condition', desc: 'No visible scratches or cosmetic wear', weight: 15 },
    { key: 'has_dents_cracks', label: 'No Physical Damage', desc: 'No cracks, dents, or structural issues', weight: 15 },
    { key: 'has_original_box', label: 'Original State', desc: 'Comes with original tags or packaging', weight: 10 },
    { key: 'has_all_accessories', label: 'Complete Set', desc: 'Includes all original components', weight: 10 },
  ]
};
