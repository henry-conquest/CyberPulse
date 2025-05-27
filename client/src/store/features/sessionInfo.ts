import { createSlice } from '@reduxjs/toolkit';

export const initialSessionInfoSlice = {
  user: null,
};

const sessionInfoSlice = createSlice({
  name: 'sessionInfoData',
  initialState: initialSessionInfoSlice,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
  },
});

export default sessionInfoSlice;
