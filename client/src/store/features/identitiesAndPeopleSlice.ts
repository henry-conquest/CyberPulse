import { createSlice } from '@reduxjs/toolkit';

export const initialIdentitiesAndPeopleState = {
  knownLocations: null
};

const identitiesAndPeopleSlice = createSlice({
  name: 'identitiesAndPeopleData',
  initialState: initialIdentitiesAndPeopleState,
  reducers: {
    setKnownLocations(state, action) {
      state.knownLocations = action.payload;
    },
    reset(state, action) {
      state.knownLocations = null
    }
  },
});

export default identitiesAndPeopleSlice;
