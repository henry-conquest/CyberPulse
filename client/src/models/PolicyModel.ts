export interface Policy {
  id: string;
  displayName: string;
  isPhishResistant: boolean | 'partial';
  recommendation: string;
  state: string;
}
