import { ManualWidgetsSliceModel } from '@/models/ManualWidgetsModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialManualWidgetsState: ManualWidgetsSliceModel = {
  manualWidgets: [],
};

const manualWidgetsSlice = createSlice({
  name: 'manualWidgetsData',
  initialState: initialManualWidgetsState,
  reducers: {
    setManualWidgets(state, action) {
      state.manualWidgets = action.payload;
    },
    reset(state) {
      state.manualWidgets = [];
    },
  },
});

export default manualWidgetsSlice;
