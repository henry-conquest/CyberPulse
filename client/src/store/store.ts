import { configureStore } from '@reduxjs/toolkit';
import sessionInfoSlice from './features/sessionInfo';

export const store = configureStore({
  reducer: {
    sessionInfo: sessionInfoSlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export default store;

export const sessionInfoActions = sessionInfoSlice.actions;
