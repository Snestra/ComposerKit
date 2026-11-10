"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/*
 * Account state read by the profile and account avatars: the auth context,
 * the account check query, workspace plans, profile visibility and the
 * profile query for the signed-in user. The host supplies their
 * results through AccountServicesProvider, so a host without that backend
 * can feed local account and workspace data into the same logic.
 */

/** The workspace plans. */
const WORKSPACE_PLANS: ReadonlySet<string> = new Set([
  "business",
  "enterprise",
  "metered_plan",
  "cbp_automation",
  "cbp_trial",
  "viewer_plan",
  "deprecated_enterprise",
  "hc",
  "consumption",
  "finserv",
  "law",
  "ent26",
  "education",
  "edu_plus",
  "edu_pro",
  "edu",
  "deprecated_edu",
  "k12",
  "quorum",
]);

export const isWorkspacePlan = (plan: string | null | undefined): boolean =>
  plan !== null && plan !== undefined && WORKSPACE_PLANS.has(plan);

/** The fields of the auth context that the avatars read. */
export interface AccountAuth {
  accountId: string | null;
  authMethod: string | null;
  isLoading: boolean;
  planAtLogin: string | null;
  userId: string | null;
}

export interface AccountInfo {
  id: string;
  plan_type?: string | null;
}

/** The accounts check response: `account_ordering` ids and `accounts`. */
export interface AccountCheck {
  account_ordering?: readonly string[];
  accounts?: readonly AccountInfo[];
}

export interface AccountCheckQuery {
  data?: AccountCheck | null;
  isError: boolean;
  isLoading: boolean;
}

export interface WorkspaceSettings {
  member_profiles_enabled?: boolean;
}

export interface WorkspaceSettingsQuery {
  data?: WorkspaceSettings | null;
  isLoading: boolean;
}

export interface ProfileUsage {
  imageUrl: string | null;
}

export interface ProfileUsageQuery {
  data?: ProfileUsage | null;
  isLoading: boolean;
}

/**
 * What the host supplies. Every reader receives `enabled`
 * query does. A disabled read starts no fetch and is not loading, but it
 * still answers the data already cached for its key: a disabled useQuery
 * and the disabled reader of querySignal
 * keep the data of their query.
 */
export interface AccountServices {
  /** Whether account inputs are available. Defaults to true, the store default. */
  accountInputsAvailable?: boolean;
  accountCheck: AccountCheckQuery;
  auth: AccountAuth;
  /** The workspace settings of an account. */
  readWorkspaceSettings: (
    accountId: string,
    enabled: boolean
  ) => WorkspaceSettingsQuery;
  /** The signed-in user's profile, whose imageUrl is the profile picture. */
  readProfileUsage: (input: {
    accountId: string | null;
    enabled: boolean;
    /** Uses an account-specific key while pictures are visible, otherwise a shared disabled key. */
    queryKey: readonly (string | null)[];
    userId: string | null;
  }) => ProfileUsageQuery;
  /** The workspace person's avatar URL for this account user id. */
  readSpacePersonAvatar: (
    accountUserId: string,
    enabled: boolean
  ) => string | null;
}

const AccountServicesContext = createContext<AccountServices | null>(null);

export const AccountServicesProvider = ({
  children,
  services,
}: {
  children?: ReactNode;
  services: AccountServices;
}) => (
  <AccountServicesContext.Provider value={services}>
    {children}
  </AccountServicesContext.Provider>
);

const useAccountServices = (): AccountServices => {
  const services = useContext(AccountServicesContext);

  if (services === null) {
    throw new Error("AuthProvider is required before calling useAuth");
  }

  return services;
};

/** The signed-in auth state. */
export const useAuth = (): AccountAuth => useAccountServices().auth;

/** The first account of `account_ordering`, found in `accounts`. */
export const selectActiveAccount = (
  check: AccountCheck | null | undefined
): AccountInfo | undefined => {
  const ordering = check?.account_ordering ?? [];
  const first = ordering.length > 0 ? ordering[0] : undefined;

  if (first === undefined || first === "") {
    return undefined;
  }

  return check?.accounts?.find((account) => account.id === first);
};

export interface ProfileVisibility {
  isProfileVisibilityLoading: boolean;
  isProfileVisible: boolean;
}

interface VisibilityInputs {
  accountCheck: AccountCheckQuery;
  auth: AccountAuth;
  readWorkspaceSettings: AccountServices["readWorkspaceSettings"];
}

const isMissing = (
  value: string | null | undefined
): value is null | undefined => value === null || value === undefined;

/** Settings have loaded and member profiles are not switched off. */
const allowsMemberProfiles = (settings: WorkspaceSettings | null | undefined) =>
  settings !== null &&
  settings !== undefined &&
  settings.member_profiles_enabled !== false;

/**
 * Whether profile pictures show. Needs an account sign-in and a known
 * plan. A workspace plan also needs member profiles enabled in the
 * workspace settings (any value but false, once they have loaded).
 */
export const resolveProfileVisibility = ({
  accountCheck,
  auth,
  readWorkspaceSettings,
}: VisibilityInputs): ProfileVisibility => {
  const { isError } = accountCheck;
  const signedIn = auth.authMethod === "account";
  const account = selectActiveAccount(accountCheck.data);
  const id = account?.id ?? auth.accountId;
  const plan = account?.plan_type ?? auth.planAtLogin;
  const workspacePlan = isWorkspacePlan(plan);
  const planPending = accountCheck.isLoading || isMissing(plan);
  const known = signedIn && !isError && !planPending;

  const settings = readWorkspaceSettings(
    id ?? "",
    known && id !== null && workspacePlan
  );

  const membersVisible = !isError && allowsMemberProfiles(settings.data);
  const visible = !planPending && (!workspacePlan || membersVisible);
  const settingsPending = workspacePlan && (id === null || settings.isLoading);

  return {
    isProfileVisibilityLoading:
      auth.isLoading || (signedIn && (planPending || settingsPending)),
    isProfileVisible: signedIn && visible,
  };
};

export const useProfileVisibility = (): ProfileVisibility =>
  resolveProfileVisibility(useAccountServices());

/**
 * The signed-in user's profile query. It runs only while profile
 * pictures are visible and the account inputs are available. It uses a separate
 * disabled key while they are hidden, so cached
 * data of the signed-in user is not read while they are hidden.
 */
export const useAccountProfile = ({
  accountId,
  enabled,
  userId,
}: {
  accountId: string | null;
  enabled: boolean;
  userId: string | null;
}): ProfileUsageQuery => {
  const services = useAccountServices();
  const { isProfileVisible } = useProfileVisibility();
  const visible = isProfileVisible && (services.accountInputsAvailable ?? true);

  return services.readProfileUsage({
    accountId,
    enabled: visible && enabled,
    queryKey: visible
      ? ["profile", "usage", userId, accountId]
      : ["profile", "usage", "disabled"],
    userId,
  });
};

/** Returns null when no account user id is given. */
export const useSpacePersonAvatar = (
  accountUserId: string | null,
  enabled: boolean
): string | null => {
  const services = useAccountServices();

  return accountUserId === null
    ? null
    : services.readSpacePersonAvatar(accountUserId, enabled);
};
