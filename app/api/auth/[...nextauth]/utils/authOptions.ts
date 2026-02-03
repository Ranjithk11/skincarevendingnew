import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  loginUser,
  saveUser,
  updateSession,
  updateToken,
} from "@/redux/api/authApi";
import _ from "lodash";

const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {},
      authorize: async (credentials: any, _req) => {
        let response: any = {};
        console.log(credentials);
        if (credentials?.actionType === "login") {
          response = await loginUser(
            credentials?.input,
            credentials?.loginType
          );
        }
        if (credentials?.actionType === "register") {
          response = await saveUser({
            phoneNumber: credentials?.phoneNumber,
            name: credentials?.name,
            email: credentials?.email,
            onBoardingQuestions: JSON.parse(credentials?.onBoardingQuestions),
            countryCode: credentials?.countryCode,
            isValidated: true,
            location: credentials?.location,
            skinType: credentials?.skinType,
            skipOtp: true, // Skip OTP for vending machine flow
          });
          console.log("User Registration",response);
        }

        if (response?.status === "success" && _.isEmpty(response?.data)) {
          return null;
        }

        

        if (response?.status && response?.status !== "success") {
          const msg =
            response?.message ||
            response?.error ||
            response?.data?.message ||
            response?.data?.error ||
            "Authentication failed";
          throw new Error(typeof msg === "string" ? msg : "Authentication failed");
        }

        const data = response?.data ?? response?.user ?? response?.result ?? {};

        const resolvedId =
          data?._id ||
          data?.id ||
          data?.userId ||
          data?.user_id ||
          response?._id ||
          response?.id ||
          response?.userId;

        if (!resolvedId) {
          // Some backends return success without the full user payload.
          // Try to re-fetch user via login endpoint so we can still create a session.
          try {
            if (credentials?.actionType === "register") {
              const input = credentials?.phoneNumber || credentials?.email;
              const inputType = credentials?.phoneNumber ? "phoneNumber" : "email";
              if (input) {
                const loginRes = await loginUser(input, inputType);
                const loginData = loginRes?.data ?? loginRes?.user ?? loginRes?.result ?? {};
                const loginId =
                  loginData?._id ||
                  loginData?.id ||
                  loginData?.userId ||
                  loginRes?._id ||
                  loginRes?.id ||
                  loginRes?.userId;
                if (loginId) {
                  response = loginRes;
                }
              }
            }
          } catch {}

          const data2 = response?.data ?? response?.user ?? response?.result ?? {};
          const resolvedId2 =
            data2?._id ||
            data2?.id ||
            data2?.userId ||
            data2?.user_id ||
            response?._id ||
            response?.id ||
            response?.userId;

          if (!resolvedId2) {
            console.error("NextAuth authorize(): Missing user id from backend response", {
              actionType: credentials?.actionType,
              response,
            });
            return null;
          }

          const resolvedName2 =
            data2?.name ||
            data2?.firstName ||
            credentials?.name ||
            "";
          const resolvedEmail2 = data2?.email || credentials?.email || "";
          const resolvedPhone2 = data2?.phoneNumber || credentials?.phoneNumber;

          return {
            id: resolvedId2,
            mobileNumber: resolvedPhone2,
            onBoardingQuestions: data2?.onBoardingQuestions,
            name: resolvedName2,
            firstName: resolvedName2,
            lastName: data2?.lastName || "",
            email: resolvedEmail2,
            isEmailVerified: Boolean(data2?.isEmailVerified),
            isProfileCompleted: Boolean(data2?.isProfileCompleted),
            gender: data2?.gender || "",
            isOtpVerified: data2?.isOtpVerified,
          };
        }

        const resolvedName =
          data?.name ||
          data?.firstName ||
          credentials?.name ||
          "";

        const resolvedEmail = data?.email || credentials?.email || "";
        const resolvedPhone = data?.phoneNumber || credentials?.phoneNumber;

        return {
          id: resolvedId,
          mobileNumber: resolvedPhone,
          onBoardingQuestions: data?.onBoardingQuestions,
          name: resolvedName,
          firstName: resolvedName,
          lastName: data?.lastName || "",
          email: resolvedEmail,
          isEmailVerified: Boolean(data?.isEmailVerified),
          isProfileCompleted: Boolean(data?.isProfileCompleted),
          gender: data?.gender || "",
          isOtpVerified: data?.isOtpVerified,
        };
      },
    }),
  ],
  secret: process.env.NEXT_PUBLIC_AUTH_SECRET,
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token = updateToken(token, user);
      }
      if (trigger === "update") {
        if (session) {
          token = updateToken(token, session?.user);
        }
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session = updateSession(session, token);
      }
      return session;
    },
  },
};

export default authOptions;
