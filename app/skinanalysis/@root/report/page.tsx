import React, { Fragment } from "react";
import { getServerSession } from "next-auth/next";
import authOptions from "@/app/api/auth/[...nextauth]/utils/authOptions";
import { APP_ROUTES } from "@/utils/routes";
import { redirect } from "next/navigation";
import KioskReportPage from "@/containers/skinanalysis-home/KioskReport";

const KioskReportRoute = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(APP_ROUTES.HOME);
  }
  return (
    <Fragment>
      <KioskReportPage />
    </Fragment>
  );
};

export default KioskReportRoute;
