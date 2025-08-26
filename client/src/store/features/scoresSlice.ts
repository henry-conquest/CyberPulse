import { ScoresSliceModel } from '@/models/ScoresSliceModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialScoresSliceState: ScoresSliceModel = {
    identityScores: [],
    dataScores: [],
    appScores: [],
};

const scoresSlice = createSlice({
  name: 'manualWidgetsData',
  initialState: initialScoresSliceState,
  reducers: {
    setIdentityScores(state, action) {
      state.identityScores = action.payload;
    },
    setDataScores(state, action) {
      state.dataScores = action.payload;
    },
    setAppScores(state, action) {
      state.appScores = action.payload;
    },
    reset(state) {
      state.identityScores = []
      state.dataScores = []
      state.appScores = []
    }
  },
});

export default scoresSlice;
