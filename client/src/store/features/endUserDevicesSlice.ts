import { EndUserDevicesSliceModel } from '@/models/EndUserDevicesModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialEndUserDevicesState: EndUserDevicesSliceModel = {
  noEncryption: {
    count: 0,
    devices: [],
  },
  compliancePolicies: null,
};

const endUserDevicesSlice = createSlice({
  name: 'endUserDevicesData',
  initialState: initialEndUserDevicesState,
  reducers: {
    setNoEncryption(state, action) {
      state.noEncryption = action.payload;
    },
    setCompliancePolicies(state, action) {
      state.compliancePolicies = action.payload;
    },
    reset(state) {
      state.noEncryption = {
        count: 0,
        devices: [],
      };
    },
  },
});

export default endUserDevicesSlice;
