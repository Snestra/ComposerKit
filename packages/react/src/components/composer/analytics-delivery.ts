interface UserFacingErrorAnalytics {
  code?: string;
  message?: string;
  source?: string;
  surface?: string;
}

type AnalyticsEventPayload = UserFacingErrorAnalytics;

interface UserFacingErrorAnalyticsClient {
  deliver: (event: string, payload: AnalyticsEventPayload) => void;
}

const isUserFacingErrorAnalytics = (
  value: unknown
): value is UserFacingErrorAnalytics => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return (
    (!("code" in value) ||
      value.code === undefined ||
      typeof value.code === "string") &&
    (!("message" in value) ||
      value.message === undefined ||
      typeof value.message === "string") &&
    (!("source" in value) ||
      value.source === undefined ||
      typeof value.source === "string") &&
    (!("surface" in value) ||
      value.surface === undefined ||
      typeof value.surface === "string")
  );
};

/** Only library fields reach the host callback. Callback failures do not block the toast. */
const createErrorAnalyticsDelivery =
  (client: UserFacingErrorAnalyticsClient) =>
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- The toast service supplies an untrusted analytics option.
  (analytics: unknown) => {
    if (!isUserFacingErrorAnalytics(analytics)) {
      return false;
    }

    const { code, message, source, surface } = analytics;

    try {
      client.deliver("ErrorToastShown", { code, message, source, surface });

      return true;
    } catch {
      return false;
    }
  };

export { createErrorAnalyticsDelivery, isUserFacingErrorAnalytics };

export type {
  AnalyticsEventPayload,
  UserFacingErrorAnalytics,
  UserFacingErrorAnalyticsClient,
};
