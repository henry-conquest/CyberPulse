
import { CloudAndInfrastructureSliceModel } from '@/models/CloudAndInfrastructureModel';
import { createSlice } from '@reduxjs/toolkit';

export const initialCloudAndInfrastructureSlice: CloudAndInfrastructureSliceModel = {
  secureScores: [
    {
      month: '',
      date: '',
      percentage: 0,
      comparative: 0
    }
  ]
};

const cloudAndInfrastructureSlice = createSlice({
  name: 'cloudAndInfrastructureData',
  initialState: initialCloudAndInfrastructureSlice,
  reducers: {
    setSecureScores(state, action) {
      state.secureScores = action.payload;
    },
    reset(state) {
      state.secureScores = [
      {
        month: '',
        date: '',
        percentage: 0,
        comparative: 0
      }
      ]
    }
  }
})

export default cloudAndInfrastructureSlice;
