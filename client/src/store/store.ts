import { configureStore } from '@reduxjs/toolkit';
import sessionInfoSlice from './features/sessionInfo';
import identitiesAndPeopleSlice from './features/identitiesAndPeopleSlice';
import endUserDevicesSlice from './features/endUserDevicesSlice';
import cloudAndInfrastructureSlice from './features/clouseAndInfrastructureSlice';
import manualWidgetsSlice from './features/manualWidgetsSlice';

export const store = configureStore({
  reducer: {
    sessionInfo: sessionInfoSlice.reducer,
    identitiesAndPeople: identitiesAndPeopleSlice.reducer,
    endUserDevices: endUserDevicesSlice.reducer,
    cloudAndInfrastructure: cloudAndInfrastructureSlice.reducer,
    manualWidgets: manualWidgetsSlice.reducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export default store;

export const sessionInfoActions = sessionInfoSlice.actions;
export const identitiesAndPeopleActions = identitiesAndPeopleSlice.actions;
export const endUserDevicesActions = endUserDevicesSlice.actions
export const cloudAndInfrastructureActions = cloudAndInfrastructureSlice.actions
export const manualWidgetsActions = manualWidgetsSlice.actions