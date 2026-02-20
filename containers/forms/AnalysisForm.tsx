"use client";
import { Box, Button, Grid, Typography, styled } from "@mui/material";
import React, { Fragment, useEffect, useState } from "react";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import { useForm } from "react-hook-form";
import RadioGroupSelectionComponent from "@/components/form-felds/RadioGropSelection";
import { useRouter, useSearchParams } from "next/navigation";
import { useLazyGetQuestionsQuery } from "@/redux/api/analysisApi";
import { saveOnboardingQuestions } from "@/redux/reducers/analysisSlice";
import { useDispatch } from "react-redux";
import { APP_ROUTES } from "@/utils/routes";
import LoadingComponent from "@/components/loaders/Loading";
import TextInputFieldComponent from "@/components/form-felds/textInputField";
import FormMobileInput from "@/components/form-felds/phoneInput";
import { matchIsValidTel } from "mui-tel-input";
import CheckBoxControlGroup from "@/components/form-felds/checkBoxGroup";
import { isValidateEmail } from "@/utils/func";
import { signIn } from "next-auth/react";
import { isArray, replace } from "lodash";
import { useSession } from "next-auth/react";
import { parsePhoneNumber } from "libphonenumber-js";
import OtpForm from "./OtpForm";
import {
  useLazyFetchBranchesQuery,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from "@/redux/api/authApi";
import { toast } from "react-toastify";
import SelectInputFieldComponent from "@/components/form-felds/SelectInput";

const StyledAnalysisFormWrapper = styled(Box)(({ theme }) => ({
  width: "100%",
  flexGrow: 1,
  display: "flex",
  paddingTop: 50,
  paddingBottom: 50,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  [theme.breakpoints.only("xs")]: {
    justifyContent: "flex-start",
    paddingTop: 50,
  },
  "& .__question_view": {
    width: 450,
    "& .MuiTypography-h4": {
      fontSize: 20,
      fontWeight: 800,
      marginBottom: 20,
    },
    [theme.breakpoints.only("xs")]: {
      width: 320,
      paddingLeft: 20,
      paddingRight: 20,
      "& .MuiTypography-h4": {
        fontSize: 22,
        fontWeight: 800,
        marginBottom: 10,
      },
    },
  },
}));

const AnalysisForm = () => {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [isSubmit, setIsSubmit] = useState<boolean>(false);
  const [showOtpForm, setShowOtpForm] = useState<boolean>(false);
  const [
    fetchBranches,
    { isLoading: isLoadingFetchBranches, data: dataFetchBranches },
  ] = useLazyFetchBranchesQuery();
  const [getQuestions, { isLoading, data, isError, isSuccess }] =
    useLazyGetQuestionsQuery();
  const { control, handleSubmit, getValues } = useForm({
    mode: "onSubmit",
  });
  const [qusIndex, setQusIndex] = useState<number>(0);
  const router = useRouter();
  const [verifyOtp, { isLoading: isLoadingVerifyOtp }] = useVerifyOtpMutation();
  const [sendOtp, { isLoading: isLoadingResentOtp }] = useSendOtpMutation();

  const onSumit = async (formDatadata: any) => {
    dispatch(saveOnboardingQuestions(formDatadata));
    if (data?.data) {
      if (data?.data[qusIndex]?.responseType === "REGISTER") {
        let answeredQuestions: any[] = [];
        const { email, name, phoneNumber, location, ...rest } = formDatadata;
        if (rest) {
          for (const [key, value] of Object.entries(rest)) {
            answeredQuestions.push({
              questionId: key,
              responseId: isArray(value) ? [...value] : [value],
            });
          }
        }
        const parseNumber = parsePhoneNumber(phoneNumber);
        const authResponse = await signIn("credentials", {
          phoneNumber: phoneNumber,
          name: name,
          email: email,
          onBoardingQuestions: JSON.stringify(answeredQuestions),
          redirect: false,
          actionType: "register",
          countryCode: parseNumber.countryCallingCode,
          isValidated: false,
          location: location,
        });
        if (authResponse?.error) {
          alert("Something went wrong please try again");
          setIsSubmit(false);
        } else {
          // Save user to local SQLite database for tracking
          try {
            await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: phoneNumber,
                name,
                phone: phoneNumber,
                email,
              }),
            });
          } catch (localDbError) {
            console.warn('Failed to save user to local DB:', localDbError);
          }
          setIsSubmit(false);
          setShowOtpForm(true);
        }
      } else {
        setQusIndex(qusIndex + 1);
      }
    }
  };
  const handleBack = () => {
    if (qusIndex === 0) {
      router.push("/");
    } else {
      if (!isSubmit) {
        setQusIndex(qusIndex - 1);
      }
    }
  };

  useEffect(() => {
    getQuestions({});
    fetchBranches({});
  }, []);

  const handleMultiSelection = (checkedId: any, fieldName: string) => {
    const { [`${fieldName}`]: ids } = getValues();
    const newIds = ids?.includes(checkedId)
      ? ids?.filter((id: any) => id !== checkedId)
      : [...(ids ?? []), checkedId];
    return newIds;
  };

  // handle OTP
  const handleOtp = (data: any) => {
    verifyOtp({
      input: getValues("phoneNumber"),
      action: "otpVerifyLogin",
      otp: Number(data?.otp),
    })
      .then((response: any) => {
        if (response?.error?.data?.status === "failure") {
          toast.error(response?.error?.data?.message);
        } else {
          toast.success(
            "Your OTP has been successfully verified. You can now proceed with your request."
          );
          router.replace(`${APP_ROUTES.SELFIE}`);
        }
      })
      .catch((error) => {
        toast.error("Something went to wrong please try again...");
      });
  };

  //handle resend OTP
  const handleResentOtp = () => {
    sendOtp({
      input: getValues("phoneNumber"),
      inputType: "phoneNumber",
      action: "otpVerifyLogin",
    })
      .then((response: any) => {
        if (response?.data?.status === "success") {
          toast.success(
            `As requested, a new One-Time Password (OTP) has been sent to your registered phone number ${getValues(
              "phoneNumber"
            )}`
          );
        } else {
          toast.error("Something went to wrong please try again...");
        }
      })
      .catch((error) => {
        toast.error("Something went to wrong please try again...");
      });
  };


  return (
    <StyledAnalysisFormWrapper style={{backgroundImage:`url(/images/homeBg_1.png)`}}>
      <Box component="div" className="__question_view">
        {isLoading && !isError && !data && <LoadingComponent />}
        {!isLoading && !isError && data && (
          <Fragment>
            {showOtpForm && (
              <OtpForm
                onClickBackButton={() => {
                  setShowOtpForm(false);
                }}
                onClickResendOtp={handleResentOtp}
                handleSubmit={handleSubmit}
                onSubmitForm={handleOtp}
                control={control}
                sendTo={`${getValues("phoneNumber")} or ${getValues("email")}`}
                isLoadinResendOtp={false}
                isVerifyLoading={false}
                watchChangeLoginType={"phoneNumber or email id"}
              />
            )}
            {!showOtpForm && (
              <Grid container spacing={2}>
                {data?.data.map((question: any, index: number) => (
                  <Fragment key={index}>
                    {index === qusIndex && (
                      <Fragment>
                        <Grid item xs={12}>
                          <Typography
                            fontWeight={600}
                            variant="h4"
                            textAlign="center"
                          >
                            {question?.value}
                          </Typography>
                        </Grid>
                        {question?.responseType === "SINGLE_SELECTION" && (
                          <Grid item xs={12}>
                            <RadioGroupSelectionComponent
                              control={control}
                              key={question._id}
                              rules={{
                                required: "This is a required field",
                              }}
                              defaultValues={""}
                              name={question._id}
                              id={question._id}
                              targetValue="_id"
                              labelName="value"
                              gridProps={{
                                direction: "row",
                                spacing: 1,
                              }}
                              gridItemProps={{
                                xs: 12,
                              }}
                              varient="CHECK_BOX_BUTTON"
                              options={question?.options}
                            />
                          </Grid>
                        )}
                        {question?.responseType === "MULTI_SELECTION" && (
                          <Grid item xs={12}>
                            <CheckBoxControlGroup
                              gridProps={{
                                direction: "row",
                                spacing: 1,
                              }}
                              gridItemProps={{
                                xs: 12,
                              }}
                              control={control}
                              options={question?.options}
                              key={question._id}
                              rules={{
                                required: "This is a required field",
                              }}
                              defaultValues={[]}
                              name={question._id}
                              id={question._id}
                              onChange={(checkedValue, fieldName) => {
                                return handleMultiSelection(
                                  checkedValue,
                                  fieldName
                                );
                              }}
                              labelName="value"
                            />
                          </Grid>
                        )}
                        {question?.responseType === "REGISTER" && (
                          <Fragment>
                            <Grid item xs={12}>
                              <TextInputFieldComponent
                                name="name"
                                control={control}
                                id="name"
                                label=""
                                textFieldProps={{
                                  fullWidth: true,
                                  placeholder: "Enter name",
                                }}
                                defaultValue={""}
                                rules={{
                                  required: "This is a required field",
                                }}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextInputFieldComponent
                                name="email"
                                control={control}
                                id="email"
                                label=""
                                textFieldProps={{
                                  fullWidth: true,
                                  placeholder: "Enter email address",
                                }}
                                defaultValue=""
                                rules={{
                                  required: "This is a required field",
                                  validate: isValidateEmail,
                                }}
                              />
                            </Grid>

                            <Grid item xs={12}>
                              <FormMobileInput
                                name="phoneNumber"
                                size="medium"
                                rules={{
                                  required: "This is a required field",
                                  validate: matchIsValidTel,
                                }}
                                control={control}
                                defaultValue=""
                                id="form-phone-input"
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <SelectInputFieldComponent
                                name="location"
                                defaultValue="leaf_water_studio"
                                control={control}
                                size="medium"
                                targetValue="name"
                                displayLabelName="label"
                                label=""
                                id="location-input"
                                
                                options={
                                  dataFetchBranches?.data?.map((branch:{ label: string; name: string }) => ({
                                    ...branch,
                                    label: branch.label
                                    .replace(/_/g, " ") 
                                    .replace(/\b\w/g, (char) => char.toUpperCase())
                                  })) || []
                                }
                              />
                            </Grid>
                          </Fragment>
                        )}
                      </Fragment>
                    )}
                  </Fragment>
                ))}
                <Grid item xs={12}></Grid>
                <Grid container spacing={3} item xs={12}>
                  <Grid item xs={6}>
                    <Button
                      size="large"
                      onClick={handleBack}
                      startIcon={<KeyboardDoubleArrowLeftIcon />}
                      variant="contained"
                      color="secondary"
                    >
                      Back
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      size="large"
                      disabled={isSubmit}
                      onClick={handleSubmit(onSumit)}
                      endIcon={<KeyboardDoubleArrowRightIcon />}
                      variant="contained"
                      color="primary"
                    >
                      {qusIndex === data?.data?.length - 1 ? "Submit" : "Next"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Fragment>
        )}
      </Box>
    </StyledAnalysisFormWrapper>
  );
};

export default AnalysisForm;
