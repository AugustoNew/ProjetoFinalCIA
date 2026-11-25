"use server";

import { redirect } from "next/navigation";
import { cancelAppointmentAndNotify } from "@/server/appointment-cancellation";

const cancelTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export async function cancelPublicAppointment(formData: FormData) {
  const token = formData.get("cancelToken");
  if (typeof token !== "string" || !cancelTokenPattern.test(token)) {
    redirect("/agendamento/cancelar?result=invalid");
  }

  const result = await cancelAppointmentAndNotify(
    { cancelToken: token },
    { respectMinimumNotice: true },
  );
  const resultQuery =
    result === "CANCELLED"
      ? "cancelled"
      : result === "TOO_LATE"
        ? "too-late"
        : "unavailable";
  redirect(`/agendamento/${token}?result=${resultQuery}`);
}
