"use client";
import React, { Fragment, useEffect } from "react";
import Drawer from "@mui/material/Drawer";
import { styled } from "@mui/material/styles";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import {
  Box,
  Button,
  Grid,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { LOGO_URL } from "@/utils/constants";
import { Icon } from "@iconify/react";
import { APP_ROUTES } from "@/utils/routes";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import FooterComponent from "../footer";
import { useAppDispatch } from "@/redux/store/store";
import { clearCart } from "@/redux/reducers/cartSlice";
import VoiceControl from "@/components/ui/VoiceControl";

const drawerWidth = 200;
interface HomeLayoutProps {
  children: React.ReactNode;
}

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  ...(open && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: drawerWidth,
  }),
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  "& .MuiPaper-root": {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    backgroundColor: theme.palette.secondary.main,
    "& .DrawerTail": {
      flex: 1,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      borderBottom: `1px solid ${theme.palette.divider}`,
      "& :hover": {
        cursor: "pointer",
      },
      "& .MuiTypography-body1": {
        color: theme.palette.common.white,
      },
      "& svg": {
        color: theme.palette.common.white,
        width: 50,
      },
    },
  },
}));

const HomeLayout = ({ children }: HomeLayoutProps) => {
  const [open, setOpen] = React.useState(false);
  const theme = useTheme();
  const isSmDevice = useMediaQuery(theme.breakpoints.only("xs"));
  const { data: session } = useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleDrawerOpen = () => {
    setOpen(!open);
  };

  const handleRouter = (url: string) => {
    router.push(`${url}`);
  };

  useEffect(() => {
    if (isSmDevice) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isSmDevice]);

  return (
    <Fragment>
      <AppBar color="primary" position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 2,
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box flexGrow={1}>
            <img width={150} src="/logo/logo_gold_white.png" />
          </Box>
          <Box paddingRight="15px" display="flex" alignItems="center" gap={1}>
            <VoiceControl />
            <IconButton
              onClick={() => {
                dispatch(clearCart());
                signOut().then(()=>{
                  router.push("/");
                });
              }}
            >
              <Icon color="#FFFFFF" icon="mdi:power" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <StyledDrawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            ...(!open && { display: "none" }),
          },
        }}
        onClose={() => setOpen(false)}
        variant={"permanent"}
        anchor="left"
        open={open}
      >
        <Box
          component="div"
          className="DrawerTail"
          onClick={() => handleRouter(APP_ROUTES.SELFIE)}
        >
          <Grid
            container
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <Grid item>
              <Icon icon="ion:camera-outline" width={50} />
            </Grid>
            <Grid item>
              <Typography variant="body1">Take Selfie</Typography>
            </Grid>
          </Grid>
        </Box>
        <Box
          component="div"
          className="DrawerTail"
          onClick={() => handleRouter(APP_ROUTES.RECOMMENDATIONS)}
        >
          <Grid
            container
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <Grid item>
              <Icon icon="uim:layers-alt" width={50} />
            </Grid>
            <Grid item>
              <Typography variant="body1">Recommendations</Typography>
            </Grid>
          </Grid>
        </Box>
        {/* <Box
          component="div"
          className="DrawerTail"
          onClick={() => handleRouter(APP_ROUTES.BROCHURE)}
        >
          <Grid
            container
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <Grid item>
              <Icon icon="mdi:file-pdf-box" width={50} />
            </Grid>
            <Grid item>
              <Typography variant="body1">Brochure</Typography>
            </Grid>
          </Grid>
        </Box> */}
        <Box component="div" className="DrawerTail">
          <Grid
            container
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <Grid item>
              <Icon icon="ph:user-bold" width={50} />
            </Grid>
            <Grid item>
              <Typography variant="body1">
                {session?.user?.firstName}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body1">
                {session?.user?.mobileNumber}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </StyledDrawer>
      <Main open={open}>{children}</Main>
    </Fragment>
  );
};

export default HomeLayout;
