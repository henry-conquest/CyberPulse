import { configureStore } from '@reduxjs/toolkit';
import sessionInfoSlice from './features/sessionInfo';
import identitiesAndPeopleSlice from './features/identitiesAndPeopleSlice';
import endUserDevicesSlice from './features/endUserDevicesSlice';

export const store = configureStore({
  reducer: {
    sessionInfo: sessionInfoSlice.reducer,
    identitiesAndPeople: identitiesAndPeopleSlice.reducer,
    endUserDevices: endUserDevicesSlice.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export default store;

export const sessionInfoActions = sessionInfoSlice.actions;
export const identitiesAndPeopleActions = identitiesAndPeopleSlice.actions;
export const endUserDevicesActions = endUserDevicesSlice.actions