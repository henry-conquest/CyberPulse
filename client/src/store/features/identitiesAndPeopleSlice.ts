import { IdentitiesAndPeopleSliceModel } from '@/models/IdentitiesAndPeopleModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialIdentitiesAndPeopleState: IdentitiesAndPeopleSliceModel = {
  knownLocations: null,
  phishResistantMFA: {
    toEnable: [],
    toDisable: [],
    enhance: [],
    correct: []
  }
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
    reset(state) {
      state.knownLocations = null
      state.phishResistantMFA = {
        toEnable: [],
        toDisable: [],
        enhance: [],
        correct: []
  }
    }
  },
});

export default identitiesAndPeopleSlice;
