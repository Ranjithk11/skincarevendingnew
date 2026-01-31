"use client";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  questions: null,
  visitCount: null,
  skinType: "NORMAL_SKIN",
};

export const analysisSlice: any = createSlice({
  name: "analysisSlice",
  initialState,
  reducers: {
    saveOnboardingQuestions: (state, action) => {
      state.questions = action.payload;
    },
    updateVisitCount: (state, action) => {
      state.visitCount = action.payload;
    },
    setSkinType: (state, action) => {
      state.skinType = action.payload;
    },
  },
});

export const { saveOnboardingQuestions, updateVisitCount, setSkinType } =
  analysisSlice.actions;
export default analysisSlice.reducer;
