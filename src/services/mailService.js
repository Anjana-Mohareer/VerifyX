import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_thf7j6o";
const TEMPLATE_ID = "template_fe9hgqe";
const PUBLIC_KEY = "yOUYYD57OvpnpV5H6";

export async function sendStatusMail(candidate, status, remarks = "") {
  if (!candidate?.email) {
    throw new Error("Candidate email not found");
  }

  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_name: candidate.fullName || candidate.name || "Candidate",
      to_email: candidate.email,
      application_status: status,
      remarks: remarks || "No remarks added.",
      company_name: "Verify-X",
    },
    PUBLIC_KEY
  );
}