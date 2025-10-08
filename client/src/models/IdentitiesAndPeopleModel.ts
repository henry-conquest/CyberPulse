export type PhishResistanceLevel = true | false | 'partial';

export interface EvaluatedMethod {
  id: string;
  displayName: string;
  state: 'enabled' | 'disabled';
  isPhishResistant: PhishResistanceLevel;
  recommendation: string;
}

export interface GroupedMFAData {
  toEnable: EvaluatedMethod[];
  toDisable: EvaluatedMethod[];
  enhance: EvaluatedMethod[];
  correct: EvaluatedMethod[];
}

export interface IdentitiesAndPeopleSliceModel {
  knownLocations: any;
  m365Admins: any;
  signInPolicies: any;
  phishResistantMFA: GroupedMFAData;
}
