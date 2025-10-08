import { ScoresSliceModel } from '@/models/ScoresSliceModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialScoresSliceState: ScoresSliceModel = {
  identityScores: [],
  dataScores: [],
  appScores: [],
  maturityScore: null,
  widgetScores: {
    cyberSecurityEnabled: 0,
  },
  maturityHistory: [],
  scoresHistory: [],
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
    setCyberSecurityEnabledPoints(state, action) {
      state.widgetScores.cyberSecurityEnabled = action.payload;
    },
    setMaturityScore(state, action) {
      state.maturityScore = action.payload;
    },
    setMaturityHistory(state, action) {
      state.maturityHistory = action.payload;
    },
    setScoresHistory(state, action) {
      state.scoresHistory = action.payload;
    },
    reset(state) {
      state.identityScores = [];
      state.dataScores = [];
      state.appScores = [];
      state.maturityScore = null;
      state.maturityHistory = [];
      state.scoresHistory = [];
    },
  },
});

export default scoresSlice;
