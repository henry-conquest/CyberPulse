import { IdentitiesAndPeopleSliceModel } from '@/models/IdentitiesAndPeopleModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialIdentitiesAndPeopleState: IdentitiesAndPeopleSliceModel = {
  knownLocations: null,
  phishResistantMFA: {
    toEnable: [],
    toDisable: [],
    enhance: [],
    correct: []
  },
  m365Admins: null,
  signInPolicies: null
};

const identitiesAndPeopleSlice = createSlice({
  name: 'identitiesAndPeopleData',
  initialState: initialIdentitiesAndPeopleState,
  reducers: {
    setKnownLocations(state, action) {
      state.knownLocations = action.payload;
    },
    setPhishResistantMFA(state, action) {
      state.phishResistantMFA = action.payload;
    },
    setM365Admins(state, action) {
      state.m365Admins = action.payload;
    },
    setSignInPolicies(state, action) {
      state.signInPolicies = action.payload;
    },
    reset(state) {
      state.knownLocations = null
      state.phishResistantMFA = {
        toEnable: [],
        toDisable: [],
        enhance: [],
        correct: []
      },
      state.m365Admins = null,
      state.signInPolicies = null
    }
  },
});

export default identitiesAndPeopleSlice;
