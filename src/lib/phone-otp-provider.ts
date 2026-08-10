import "server-only";

export type PhoneOtpResult = { ok: true } | { ok: false; error: string; status: number };

function providerName() {
  return (process.env.PHONE_OTP_PROVIDER ?? "development").trim().toLowerCase();
}

function developmentCode() {
  const configuredCode = process.env.DEV_PHONE_OTP?.trim();
  if (configuredCode) return configuredCode;

  // Make a fresh local checkout usable immediately. Preview and Production
  // deployments must explicitly set DEV_PHONE_OTP while this temporary mode is used.
  return process.env.NODE_ENV !== "production" ? "2412" : null;
}

/**
 * Starts an OTP challenge without exposing provider credentials or the code.
 * A real SMS implementation belongs in this module; signup remains unchanged.
 */
export async function requestPhoneOtp(_phone: string): Promise<PhoneOtpResult> {
  if (providerName() === "development") {
    if (developmentCode()) return { ok: true };
    return {
      ok: false,
      status: 503,
      error: "Development OTP is not configured. Set DEV_PHONE_OTP for this deployment.",
    };
  }

  if (!process.env.SMS_API_KEY || !process.env.SMS_API_SECRET || !process.env.SMS_API_URL) {
    return {
      ok: false,
      status: 503,
      error: "The selected SMS provider is not configured yet.",
    };
  }

  return {
    ok: false,
    status: 501,
    error: "The selected SMS provider has not been implemented yet.",
  };
}

/** Verifies an OTP without exposing provider configuration to the client. */
export async function verifyPhoneOtp(_phone: string, code: string): Promise<PhoneOtpResult> {
  if (providerName() === "development") {
    const expectedCode = developmentCode();
    if (!expectedCode) {
      return {
        ok: false,
        status: 503,
        error: "Development OTP is not configured. Set DEV_PHONE_OTP for this deployment.",
      };
    }
    return code === expectedCode
      ? { ok: true }
      : { ok: false, status: 400, error: "Invalid verification code." };
  }

  if (!process.env.SMS_API_KEY || !process.env.SMS_API_SECRET || !process.env.SMS_API_URL) {
    return { ok: false, status: 503, error: "The selected SMS provider is not configured yet." };
  }
  return {
    ok: false,
    status: 501,
    error: "The selected SMS provider has not been implemented yet.",
  };
}
