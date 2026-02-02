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

        

        return {
          id: response?.data?._id,
          mobileNumber: response?.data?.phoneNumber,
          onBoardingQuestions: response?.data?.onBoardingQuestions,
          name: response?.data?.name,
          firstName: response?.data?.name,
          lastName: "",
          email: response?.data?.email,
          isEmailVerified: false,
          isProfileCompleted: false,
          gender: "",
          isOtpVerified: response?.data?.isOtpVerified,
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
