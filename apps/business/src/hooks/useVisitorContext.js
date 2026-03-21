const VERTICAL_MAP = {
  'aviation': { label: 'Aviation', firestoreValue: 'aviation' },
  'auto-dealer': { label: 'Auto Dealer', firestoreValue: 'auto_dealer' },
  'auto': { label: 'Auto Dealer', firestoreValue: 'auto_dealer' },
  'dealer': { label: 'Auto Dealer', firestoreValue: 'auto_dealer' },
  'real-estate': { label: 'Real Estate', firestoreValue: 'real_estate_development' },
  're': { label: 'Real Estate', firestoreValue: 'real_estate_development' },
  'solar': { label: 'Solar', firestoreValue: 'solar_vpp' },
  'web3': { label: 'Web3', firestoreValue: 'web3' },
  'healthcare': { label: 'Healthcare', firestoreValue: 'healthcare' },
  'government': { label: 'Government', firestoreValue: 'government' },
  'legal': { label: 'Legal', firestoreValue: 'legal' },
  'pilot': { label: 'Aviation', firestoreValue: 'aviation' },
  'creators': { label: 'Creators', firestoreValue: 'creators' },
  'creator': { label: 'Creators', firestoreValue: 'creators' },
  'property-management': { label: 'Property Management', firestoreValue: 're_operations' },
};

export { VERTICAL_MAP };

export function useVisitorContext() {
  const params = new URLSearchParams(window.location.search);
  const vertical = params.get('vertical');
  const promoted = params.get('promoted');

  if (promoted === 'true') return { state: 'STATE-5', vertical: null, verticalLabel: null };

  if (vertical && VERTICAL_MAP[vertical]) {
    const mapped = VERTICAL_MAP[vertical];
    return { state: 'STATE-2', vertical: mapped.firestoreValue, verticalLabel: mapped.label };
  }

  if (vertical) {
    // Unknown vertical — fall back to STATE-1
    return { state: 'STATE-1', vertical: null, verticalLabel: null };
  }

  return { state: 'STATE-1', vertical: null, verticalLabel: null };
}
