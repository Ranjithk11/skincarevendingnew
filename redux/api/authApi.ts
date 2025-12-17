import { JWT } from "next-auth/jwt";
import { API_ROUTES } from "../routes/apiRoutes";
import { Session, User } from "next-auth";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import inititBaseQuery from "../baseQuery/baseQuery";
import { subDomain } from "@/utils/constants";

interface UserLoginPayload {
  phoneNumber: string;
  onBoardingQuestions: any[];
  name: string;
  email: string;
  countryCode?: string;
  isValidated?: boolean;
  location: string;
  skinType?: string;
}

export const loginUser = async (
  input: string,
  inputType: "phoneNumber" | "email"
) => {
  const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN || subDomain?._id;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${API_ROUTES.USER_LOGIN}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(dbToken ? { "x-db-token": dbToken } : {}),
      },
      body: JSON.stringify({
        input: input,
        inputType: inputType,
      }),
    }
  );
  const data = await response.json();
  return data;
};

export const saveUser = async (payload: UserLoginPayload) => {
  const dbToken = process.env.NEXT_PUBLIC_DB_TOKEN || subDomain?._id;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${API_ROUTES.SAVE_USER}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(dbToken ? { "x-db-token": dbToken } : {}),
      },
      body: JSON.stringify({
        phoneNumber: payload.phoneNumber,
        onBoardingQuestions: payload.onBoardingQuestions,
        name: payload.name,
        email: payload.email,
        countryCode: payload.countryCode,
        isValidated: payload.isValidated,
        location: payload.location,
        skinType: payload.skinType,
      }),
    }
  );

  const data = await response.json();
  return data;
};

export const updateToken = (token: JWT, user: User) => {
  if (token) {
    token.id = user.id;
    token.name = user?.firstName + " " + user?.lastName;
    token.email = user?.email;
    token.mobileNumber = user?.mobileNumber;
    token.firstName = user?.firstName;
    token.lastName = user?.lastName;
    token.isEmailVerified = user?.isEmailVerified;
    token.isProfileCompleted = user?.isProfileCompleted;
    token.dateOfBirth = user?.dateOfBirth;
    token.gender = user?.gender;
    token.onBoardingQuestions = user?.onBoardingQuestions;
    token.selfyImage = user?.selfyImage;
    token.selfyImagePath = user?.selfyImagePath;
    token.skinType = user?.skinType;
    token.isOtpVerified = user?.isOtpVerified;
  }
  return token;
};

export const updateSession = (session: Session, token: JWT) => {
  if (token) {
    session.user.id = token?.id as string;
    session.user.name = token?.firstName + " " + token?.lastName;
    session.user.firstName = token?.firstName as string;
    session.user.lastName = token?.lastName as string;
    session.user.mobileNumber = token?.mobileNumber as string;
    session.user.email = token?.email as string;
    session.user.gender = token?.gender as string;
    session.user.isEmailVerified = token?.isEmailVerified as boolean;
    session.user.isProfileCompleted = token?.isProfileCompleted as boolean;
    session.user.onBoardingQuestions = token?.onBoardingQuestions as any[];
    session.user.selfyImage = token?.selfyImage as string;
    session.user.selfyImagePath = token?.selfyImagePath as string;
    session.user.skinType = token?.skinType as string;
    session.user.isOtpVerified = token?.isOtpVerified as boolean;
  }
  return session;
};

export const authApi = createApi({
  reducerPath: "authApi",
  //baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL }),
  baseQuery: inititBaseQuery({}),
  tagTypes: ["authApi"],
  endpoints: (builder) => ({
    sendOtp: builder.mutation<
      any,
      { input: string; action: string; inputType: string }
    >({
      query: (body) => {
        return {
          url: API_ROUTES.USER_SEND_OTP,
          method: "POST",
          body,
        };
      },
    }),
    verifyOtp: builder.mutation<
      any,
      { input: string; action: string; otp: number }
    >({
      query: (body) => {
        return {
          url: API_ROUTES.USER_VERIFY_OTP,
          method: "POST",
          body,
        };
      },
    }),
    validateDomain: builder.mutation<any, { subDomain: string }>({
      query: (body) => {
        return {
          url: API_ROUTES.VALIDATE_DOMAIN,
          method: "POST",
          body,
        };
      },
    }),
    fetchBranches: builder.query<any, any>({
      query: () => {
        return {
          url: API_ROUTES.FETCH_BRANCHES,
        };
      },
      transformResponse(response: any) {
        return {
          ...response,
          data: response?.data?.map((item: any) => {
            return {
              label: item,
              name: item,
            };
          }),
        };
      },
    }),
  }),
});

export const {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useLazyFetchBranchesQuery,
  useValidateDomainMutation,
} = authApi;
