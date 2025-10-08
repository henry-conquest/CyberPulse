
import { devicesAndInfrastructureSliceModel } from '@/models/CloudAndInfrastructureModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialdevicesAndInfrastructureSlice: devicesAndInfrastructureSliceModel = {
  secureScores: [
    {
      month: '',
      date: '',
      percentage: 0,
      comparative: 0
    }
  ],
  encryptionCount: 0,
  compliancePolicies: null
};

const devicesAndInfrastructureSlice = createSlice({
  name: 'devicesAndInfrastructureData',
  initialState: initialdevicesAndInfrastructureSlice,
  reducers: {
    setSecureScores(state, action) {
      state.secureScores = action.payload;
    },
    setEncryption(state, action) {
      state.encryptionCount = action.payload
    },
    setCompliancePolicies(state, action) {
      state.compliancePolicies = action.payload
    },
    reset(state) {
      state.secureScores = [
      {
        month: '',
        date: '',
        percentage: 0,
        comparative: 0
      }
      ],
      state.encryptionCount = 0,
      state.compliancePolicies = null
    }
  }
})

export default devicesAndInfrastructureSlice;
