import { createSlice } from '@reduxjs/toolkit';

export const initialIdentitiesAndPeopleState = {
  knownLocations: null,
  phishResistantMFA: null
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
      state.phishResistantMFA = null
    }
  },
});

export default identitiesAndPeopleSlice;
