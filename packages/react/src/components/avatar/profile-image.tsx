"use client";

import {
  ATTACHMENT_CONTENT_PATHS,
  HOST_AUTH_HEADER,
  HOST_ORIGIN,
} from "@workspace/react/lib/host";
import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

/*
 * Profile picture source: the hook, the URL classifier, the profile-picture
 * resolver and a cached image asset query. A small cache holds the results
 * with a key, stale time, garbage collection time, retry rules and mount
 * rule, and the asset resolver is pluggable so a host without that backend can
 * resolve assets from local data.
 */

const noCleanup = () => {
  // Nothing was subscribed or the failure is already recorded on the entry.
};

const IMAGE_CACHE_TTL_MS = 4 * 60 * 1000;
const PROFILE_PICTURE_CACHE_KEY = ["profile-picture"] as const;

/** Blob types that get an object URL. Others are used as data URLs. */
const OBJECT_URL_TYPES: ReadonlySet<string> = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/vnd.microsoft.icon",
  "image/webp",
  "image/x-icon",
  "image/x-png",
]);

/** What a resolver answers for an asset: a download, or a deleted file. */
export type AssetResolution =
  | {
      downloadUrl: string;
      kind: "available";
      requestHeaders?: Record<string, string>;
    }
  | { kind: "permanently-deleted" }
  | { kind: "trashed"; libraryFileId?: string };

export interface ProfileImageResolver {
  /** The cache scope; the query key is `["file", "image-src", url, ...cacheKey]`. */
  cacheKey: readonly string[];
  resolveAsset: (url: string) => Promise<AssetResolution>;
}

/** Resolves a profile picture with the host authentication header. */
export const profilePictureResolver: ProfileImageResolver = {
  cacheKey: PROFILE_PICTURE_CACHE_KEY,
  // oxlint-disable-next-line require-await -- The resolver answers with Promise.resolve; the interface is asynchronous.
  resolveAsset: async (url) => ({
    downloadUrl: url,
    kind: "available",
    requestHeaders: {
      [HOST_AUTH_HEADER]: "1",
      originator: "ComposerKit",
    },
  }),
};

/** Matches content URLs on the current host origin. */
export const isEstuaryUrl = (url: string | null | undefined): boolean => {
  if (url === null || url === undefined || url === "") {
    return false;
  }

  try {
    const parsed = new URL(url);

    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.origin === HOST_ORIGIN &&
      ATTACHMENT_CONTENT_PATHS.some(
        (path) =>
          parsed.pathname === path || parsed.pathname.startsWith(`${path}/`)
      )
    );
  } catch {
    return false;
  }
};

/** The asset id behind the file service schemes. */
const assetIdOf = (url: string) => {
  for (const scheme of ["file-service://", "sediment://"]) {
    if (url.startsWith(scheme)) {
      return url.replace(scheme, "");
    }
  }

  return url;
};

interface DownloadResult {
  dataUrl: string;
  downloadUrl: string;
  kind: "download";
  objectUrl: string | null;
}

interface DeletedResult {
  kind: "deleted";
}

type CachedResult = DeletedResult | DownloadResult;

/** A running fetch of an entry: with cancellation and resumption. */
interface Fetch {
  cancel: () => void;
  promise: Promise<CachedResult>;
  resume: () => void;
}

interface CacheEntry {
  collect: ReturnType<typeof setTimeout> | null;
  /** The query status is "error": the last fetch failed after its retries. */
  error: boolean;
  fetch: Fetch | null;
  /** An error marks the query invalidated, so it is stale until a fetch succeeds. */
  invalidated: boolean;
  key: string;
  listeners: Set<() => void>;
  /** fetchStatus is "paused": offline, or the page hidden between retries. */
  paused: boolean;
  result: CachedResult | null;
  updatedAt: number;
}

interface ImageSnapshot {
  dataUrl: string | null;
  isError: boolean;
  isLoading: boolean;
  src: string | null;
}

const entries = new Map<string, CacheEntry>();
const snapshots = new Map<string, ImageSnapshot>();

const keyOf = (url: string, resolver: ProfileImageResolver) =>
  JSON.stringify(["file", "image-src", url, ...resolver.cacheKey]);

const notify = (entry: CacheEntry) => {
  for (const listener of entry.listeners) {
    listener();
  }
};

/**
 * The object URL is revoked in a timeout of zero, after the entry no
 * longer holds it (the data was replaced, or the query was removed).
 */
const revoke = (result: CachedResult | null) => {
  if (result?.kind === "download" && result.objectUrl !== null) {
    const { objectUrl } = result;

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 0);
  }
};

const removeEntry = (entry: CacheEntry) => {
  revoke(entry.result);

  if (entries.get(entry.key) === entry) {
    entries.delete(entry.key);
    snapshots.delete(entry.key);
  }
};

/**
 * Query.scheduleGc: after gcTime (four minutes) the entry is removed unless
 * a reader is subscribed or a fetch is running.
 */
const scheduleGc = (entry: CacheEntry) => {
  if (entry.collect !== null) {
    clearTimeout(entry.collect);
  }

  entry.collect = setTimeout(() => {
    entry.collect = null;

    if (entry.listeners.size === 0 && entry.fetch === null) {
      removeEntry(entry);
    }
  }, IMAGE_CACHE_TTL_MS);
};

const getEntry = (key: string): CacheEntry => {
  let entry = entries.get(key);

  if (entry === undefined) {
    entry = {
      collect: null,
      error: false,
      fetch: null,
      invalidated: false,
      key,
      listeners: new Set(),
      paused: false,
      result: null,
      updatedAt: 0,
    };
    entries.set(key, entry);
    scheduleGc(entry);
  }

  return entry;
};

/** Retry transient network failures without refetching on window focus. */
const MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 800;
const RETRY_MAX_DELAY_MS = 24_000;
const TOO_EARLY = 425;
const SERVER_ERROR_FIRST = 500;
const SERVER_ERROR_LAST = 599;

/** The numeric `status` of an error, if it has one. */
const statusOf = (error: Error & { status?: number }): number | null =>
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- A resolver may attach any value as status.
  typeof error.status === "number" ? error.status : null;

/** A download answered with a non-OK HTTP status. */
class HttpStatusError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The avatar image download did not complete with HTTP ${status}`);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

/** What a failed download throws: an Error, with a `status` for an HTTP failure. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- A catch clause binds unknown; this is the boundary that makes it an Error.
const asError = (thrown: unknown): Error =>
  thrown instanceof Error
    ? thrown
    : new Error("The avatar image download did not complete", {
        cause: thrown,
      });

const isRetryableStatus = (status: number) =>
  status === 408 ||
  status === TOO_EARLY ||
  status === 429 ||
  (status >= SERVER_ERROR_FIRST && status <= SERVER_ERROR_LAST);

const shouldRetry = (failureCount: number, error: Error) => {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }

  const status = statusOf(error);

  return status === null || status === 0 || isRetryableStatus(status);
};

/** 800ms, 1600ms, then double the delay up to 24s. */
const retryDelay = (failureCount: number) =>
  Math.min(RETRY_BASE_DELAY_MS * 2 ** failureCount, RETRY_MAX_DELAY_MS);

/** Tracks page visibility and connectivity for the query cache. */
let online = true;
let environmentWatched = false;

const isFocused = () => document.visibilityState !== "hidden";

const canRun = () => isFocused() && online;

/** Query.onFocus and Query.onOnline: continue a paused retryer. */
const resumeFetches = () => {
  for (const entry of entries.values()) {
    entry.fetch?.resume();
  }
};

const watchEnvironment = () => {
  if (environmentWatched) {
    return;
  }

  environmentWatched = true;
  online = navigator.onLine;

  document.addEventListener("visibilitychange", () => {
    if (isFocused()) {
      resumeFetches();
    }
  });
  window.addEventListener("online", () => {
    online = true;
    resumeFetches();
  });
  window.addEventListener("offline", () => {
    online = false;
  });
};

/** The blob as a data URL. */
const readDataUrl = async (blob: Blob) => {
  const { promise, reject, resolve } = Promise.withResolvers<string>();
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- FileReader.result is a string, an ArrayBuffer or null.
    if (typeof reader.result === "string") {
      resolve(reader.result);
    } else {
      reject(new Error("The image could not be read as a data URL"));
    }
  });
  reader.addEventListener("error", () => {
    reject(
      reader.error ?? new Error("The image could not be read as a data URL")
    );
  });
  reader.readAsDataURL(blob);

  return await promise;
};

/** Downloads image bytes through the asset resolver. */
const downloadAsset = async (
  url: string,
  resolver: ProfileImageResolver,
  signal: AbortSignal
): Promise<CachedResult> => {
  const resolution = await resolver.resolveAsset(assetIdOf(url));

  signal.throwIfAborted();

  if (resolution.kind !== "available") {
    return { kind: "deleted" };
  }

  const response = await fetch(resolution.downloadUrl, {
    headers: resolution.requestHeaders,
    signal,
  });

  // Reject a non-OK response before reading its bytes, so an HTTP
  // failure reaches the retry rules with its status instead of being cached.
  if (!response.ok) {
    throw new HttpStatusError(response.status);
  }

  const blob = await response.blob();
  const dataUrl = await readDataUrl(blob);

  signal.throwIfAborted();

  return {
    dataUrl,
    downloadUrl: resolution.downloadUrl,
    kind: "download",
    objectUrl: OBJECT_URL_TYPES.has(blob.type)
      ? URL.createObjectURL(blob)
      : null,
  };
};

const isFresh = (entry: CacheEntry) =>
  entry.result !== null &&
  !entry.invalidated &&
  Date.now() - entry.updatedAt < IMAGE_CACHE_TTL_MS;

/**
 * A failed fetch is retried by shouldRetry
 * after retryDelay. Between retries a hidden page or an offline browser
 * pauses the fetch until the page is shown or the browser is online. The
 * state before the fetch is kept so cancelling it (the last reader leaves,
 * as the queryFn reads the abort signal) restores that state.
 */
const startFetch = async (
  entry: CacheEntry,
  url: string,
  resolver: ProfileImageResolver
): Promise<CachedResult> => {
  watchEnvironment();

  const controller = new AbortController();
  const before = { error: entry.error, invalidated: entry.invalidated };
  const { promise, reject, resolve } = Promise.withResolvers<CachedResult>();

  let settled = false;
  let wake: (() => void) | null = null;
  let resume: (() => void) | null = null;

  // The "fetch" action: a query without data starts again as pending.
  if (entry.result === null) {
    entry.error = false;
  }

  entry.paused = false;
  promise.catch(noCleanup);

  const finish = () => {
    entry.fetch = null;
    entry.paused = false;
    scheduleGc(entry);
  };

  const wait = async (milliseconds: number) => {
    const gate = Promise.withResolvers<null>();

    const timer = setTimeout(() => {
      gate.resolve(null);
    }, milliseconds);

    wake = () => {
      clearTimeout(timer);
      gate.resolve(null);
    };

    await gate.promise;
    wake = null;
  };

  const pause = async () => {
    const gate = Promise.withResolvers<null>();

    wake = () => {
      gate.resolve(null);
    };

    resume = () => {
      if (canRun()) {
        gate.resolve(null);
      }
    };

    entry.paused = true;
    notify(entry);
    await gate.promise;
    wake = null;
    resume = null;

    if (!settled) {
      entry.paused = false;
      notify(entry);
    }
  };

  const attempt = async (failureCount: number): Promise<CachedResult> => {
    try {
      return await downloadAsset(url, resolver, controller.signal);
    } catch (error_) {
      const error = asError(error_);

      if (settled || !shouldRetry(failureCount, error)) {
        throw error;
      }

      await wait(retryDelay(failureCount));

      if (!settled && !canRun()) {
        await pause();
      }

      if (settled) {
        throw error;
      }

      return await attempt(failureCount + 1);
    }
  };

  const run = async () => {
    if (!online) {
      await pause();
    }

    return await attempt(0);
  };

  entry.fetch = {
    cancel: () => {
      if (settled) {
        return;
      }

      settled = true;
      wake?.();
      controller.abort();
      entry.error = before.error;
      entry.invalidated = before.invalidated;
      finish();
      notify(entry);
      reject(new Error("CancelledError"));
    },
    promise,
    resume: () => {
      resume?.();
    },
  };

  const succeed = (result: CachedResult) => {
    if (settled) {
      revoke(result);

      return;
    }

    settled = true;
    revoke(entry.result);
    entry.result = result;
    entry.error = false;
    entry.invalidated = false;
    entry.updatedAt = Date.now();
    finish();
    notify(entry);
    resolve(result);
  };

  const fail = (error: Error) => {
    if (settled) {
      return;
    }

    settled = true;
    entry.error = true;
    entry.invalidated = true;
    finish();
    notify(entry);
    reject(error);
  };

  const settle = async () => {
    let result: CachedResult;

    try {
      result = await run();
    } catch (error) {
      fail(asError(error));

      return;
    }

    succeed(result);
  };

  settle().catch(noCleanup);

  notify(entry);

  return await promise;
};

/**
 * An observer mounting or fetchQuery: starts a fetch unless the cached
 * result is younger than four minutes (staleTime). A running fetch is
 * shared. A query in the error state with no data starts again, as the
 * default retryOnMount is true, and so does one that holds data from
 * before its last failure, because a failure leaves it stale.
 */
const loadEntry = async (url: string, resolver: ProfileImageResolver) => {
  const entry = getEntry(keyOf(url, resolver));

  if (isFresh(entry) && entry.result !== null) {
    return entry.result;
  }

  return await (entry.fetch?.promise ?? startFetch(entry, url, resolver));
};

/** Fetches the picture into the cache and returns its data URL, or the URL when it is not an estuary URL. */
export const prefetchProfileImage = async (
  url: string | null | undefined,
  resolver: ProfileImageResolver = profilePictureResolver
): Promise<string | null> => {
  if (url === null || url === undefined || !isEstuaryUrl(url)) {
    return null;
  }

  const result = await loadEntry(url, resolver);

  return result.kind === "download" ? result.dataUrl : null;
};

/** Drops every cached picture, like removing the queries from the client. */
export const clearProfileImageCache = () => {
  const listeners: (() => void)[] = [];

  for (const entry of entries.values()) {
    entry.fetch?.cancel();

    if (entry.collect !== null) {
      clearTimeout(entry.collect);
      entry.collect = null;
    }

    revoke(entry.result);
    listeners.push(...entry.listeners);
  }

  entries.clear();
  snapshots.clear();

  for (const listener of listeners) {
    listener();
  }
};

export interface ProfileImage {
  isError: boolean;
  src: string | null | undefined;
}

const idleSnapshot: ImageSnapshot = {
  dataUrl: null,
  isError: false,
  isLoading: false,
  src: null,
};

/** Stable snapshot per entry state, so useSyncExternalStore does not loop. */
const snapshotOf = (key: string): ImageSnapshot => {
  const entry = entries.get(key);

  if (entry === undefined) {
    return idleSnapshot;
  }

  const { result } = entry;
  const download = result?.kind === "download" ? result : null;
  const dataUrl = download?.dataUrl ?? null;
  const src = download?.objectUrl ?? download?.dataUrl ?? null;
  // isLoading is fetching and pending: a paused fetch is not loading.
  const isLoading = entry.fetch !== null && !entry.paused && result === null;
  const previous = snapshots.get(key);

  if (
    previous !== undefined &&
    previous.dataUrl === dataUrl &&
    previous.src === src &&
    previous.isLoading === isLoading &&
    previous.isError === entry.error
  ) {
    return previous;
  }

  const next = { dataUrl, isError: entry.error, isLoading, src };

  snapshots.set(key, next);

  return next;
};

/**
 * The cached download for a URL while
 * enabled, with the data URL, the displayable src (object URL, else data
 * URL), loading and error state. A reader that subscribes starts the
 * download when the cached result is missing, stale or left by a failure.
 * The last reader leaving cancels a running download.
 */
const useCachedAsset = (
  url: string,
  resolver: ProfileImageResolver
): ImageSnapshot => {
  const key = url === "" ? "" : keyOf(url, resolver);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (key === "") {
        return noCleanup;
      }

      const entry = getEntry(key);

      entry.listeners.add(onChange);

      if (entry.collect !== null) {
        clearTimeout(entry.collect);
        entry.collect = null;
      }

      loadEntry(url, resolver).catch(noCleanup);

      return () => {
        entry.listeners.delete(onChange);

        if (entry.listeners.size === 0) {
          entry.fetch?.cancel();
          scheduleGc(entry);
        }
      };
    },
    [key, resolver, url]
  );

  return useSyncExternalStore(
    subscribe,
    () => (key === "" ? idleSnapshot : snapshotOf(key)),
    () => idleSnapshot
  );
};

const ProfileImageContext = createContext<ProfileImageResolver>(
  profilePictureResolver
);

/** Supplies the asset resolver that the profile picture hook downloads with. */
export const ProfileImageProvider = ({
  children,
  resolver,
}: {
  children?: ReactNode;
  resolver: ProfileImageResolver;
}) => (
  <ProfileImageContext.Provider value={resolver}>
    {children}
  </ProfileImageContext.Provider>
);

/**
 * The picture for a profile avatar. An estuary URL goes through the
 * resolver and the cache, and answers its data URL (or object URL) once
 * downloaded, with isError set if the download failed. Any other URL is
 * answered as it is when `allowExternalUrls` (default true), else null.
 */
export const useProfileImage = (
  url: string | null | undefined,
  options: { allowExternalUrls?: boolean } = {}
): ProfileImage => {
  const resolver = useContext(ProfileImageContext);
  const allowExternalUrls = options.allowExternalUrls ?? true;
  const estuary = isEstuaryUrl(url);
  const asset = useCachedAsset(estuary ? (url ?? "") : "", resolver);

  if (estuary) {
    return { isError: asset.isError, src: asset.dataUrl ?? asset.src };
  }

  return { isError: false, src: allowExternalUrls ? (url ?? null) : null };
};
