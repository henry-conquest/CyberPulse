import { EndUserDevicesSliceModel } from '@/models/EndUserDevicesModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialEndUserDevicesState: EndUserDevicesSliceModel = {
  noEncryption: {
      count: 0,
      devices: [],
  },
};

const endUserDevicesSlice = createSlice({
  name: 'endUserDevicesData',
  initialState: initialEndUserDevicesState,
  reducers: {
    setNoEncryption(state, action) {
      state.noEncryption = action.payload;
    },
    reset(state) {
      state.noEncryption = {
        count: 0,
        devices: []
      }
    }
  },
});

export default endUserDevicesSlice;
