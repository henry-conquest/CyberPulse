import { createSlice } from '@reduxjs/toolkit';

export const initialSessionInfoSlice = {
  user: null,
  selectedClient: null,
  tenants: []
};

const sessionInfoSlice = createSlice({
  name: 'sessionInfoData',
  initialState: initialSessionInfoSlice,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
    setSelectedClient(state, action) {
      state.selectedClient = action.payload;
    },
    setTenants(state, action) {
      state.tenants = action.payload;
    },
  },
});

export default sessionInfoSlice;
