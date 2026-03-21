import { Divider, Grid, Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { styled } from "@mui/material/styles";
import React, { Fragment, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useGetUploadImageInfoMutation } from "@/redux/api/analysisApi";

interface PreventingInfoProps {
  useData: any;
  data: any;
}

const StyledPreventingWrapper = styled(Box)(({ theme }) => ({
  width: "100%",
  paddingTop: 50,
  paddingBottom: 50,
  minHeight: 400,
  "& .user_profile_image": {
    width: 200,
    height: 250,
    [theme.breakpoints.between("xs", "sm")]: {
      width: 150,
      height: 150,
    },
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    backgroundPosition: "top",
    borderRadius: 20,
  },
  "& .MuiTypography-h6": {
    fontWeight: 700,
    fontSize: 25,
    [theme.breakpoints.between("xs", "sm")]: {
      textAlign: "left",
      fontSize: 20,
    },
  },
  "& .MuiTypography-body1": {
    [theme.breakpoints.between("xs", "sm")]: {
      textAlign: "left",
      fontSize: 14,
    },
  },
  "& span": {
    color: theme.palette.primary.main,
  },
}));

const PreventingView = ({ useData, data }: PreventingInfoProps) => {
  const [
    getUploadImageInfo,
    { data: dataImageInfo, isLoading: isLoadingImageInfo },
  ] = useGetUploadImageInfoMutation();

  useEffect(() => {
    if (data) {
      getUploadImageInfo({
        userId: data?.data?.[0]?.userId,
        fileName: data?.data?.[0]?.analysedImages[0]?.fileName,
      });
    }
  }, [data]);

  return (
    <StyledPreventingWrapper>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h6" >
              What’s preventing you to <span>get your glow on?</span>
            </Typography>
          </Grid>
          <Grid item xs={12} container alignItems="flex-start" spacing={4}>
            <Grid item>
              <Box
                sx={{ backgroundImage: `url(${dataImageInfo?.data?.url})` }}
                component="div"
                className="user_profile_image"
              ></Box>
            </Grid>
            <Grid item xs>
              <Typography variant="h6">
                <span>SKIN ANALYSIS ATTRIBUTES</span>
              </Typography>
              <Box mt={2}>
                {data?.data?.[0]?.attributeCode?.map(
                  (item: any, index: number) => (
                    <Typography
                      key={index}
                      fontWeight={600}
                      variant="body1"
                      gutterBottom
                    >
                      ({item.code})-{item?.attribute.replace("_", " ")}
                    </Typography>
                  )
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Box mt={2}>
              {data?.data?.[0]?.analysisAiSummary?.length > 0 && (
                <Box mt={2}>
                  <Box mb={3}>
                    <Typography variant="h6">
                      <span>SMART SKIN ANALYSIS REPORT</span>
                    </Typography>
                  </Box>
                  {data?.data?.[0]?.analysisAiSummary?.map(
                    (item: any, index: number) => (
                      <Box mb={2} key={index}>
                        <Typography
                          fontWeight={700}
                          variant="subtitle2"
                          gutterBottom
                        >
                          {item.heading}
                        </Typography>
                        <Typography color={"#000000"}>
                          {item.data.replace(/>|-/g, " ")}{" "}
                        </Typography>
                      </Box>
                    )
                  )}
                </Box>
              )}

              {data?.data?.[0]?.recommendedLipProducts?.length > 0 && (
                <Grid container>
                  <Grid item xs={12}>
                    <Box mb={3}>
                      <Typography variant="h6">
                        <span>LIP ANALYSIS REPORT</span>
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography
                      fontWeight={700}
                      variant="subtitle2"
                      gutterBottom
                    >
                      Lip attribute
                    </Typography>
                    <Typography color={"#000000"}>
                      {data?.data?.[0]?.detectedLipAttributes?.[0]?.replace("_", " ")}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography
                      fontWeight={700}
                      variant="subtitle2"
                      gutterBottom
                    >
                      Lip Color
                    </Typography>
                    <Typography color={"#000000"}>
                      {data?.data?.[0]?.lipColor?.title?.replace("_", " ")}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography
                      fontWeight={700}
                      variant="subtitle2"
                      gutterBottom
                    >
                      Lip Shape
                    </Typography>
                    <Typography color={"#000000"}>
                      {data?.data?.[0]?.lipShape?.title.replace("_", " ")}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box mt={4}>
                      <Typography
                        gutterBottom
                        fontWeight={700}
                        variant="subtitle2"
                      >
                        LIP ANALYSIS SUMMARY
                      </Typography>
                      <Typography>
                        {data?.data?.[0]?.lipAnalysisSummary}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </StyledPreventingWrapper>
  );
};

export default PreventingView;
