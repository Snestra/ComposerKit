"use client";

/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, eslint/complexity, promise/avoid-new, promise/prefer-await-to-callbacks, typescript/promise-function-async, eslint/require-await, typescript/no-unnecessary-type-parameters -- The component probes host and browser capabilities at run time. The cache stores values of every query family, so its data and errors are unknown until a query function parses them, and the useAssetImage and useGeneratedImageSource ports keep the component branches. Timers and FileReader have no promise form, and the promise-function-async, require-await and return-await rules contradict each other for functions that hand back a shared promise. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/** Resolves asset pointers, host file paths and plain image URLs with a shared cache. */

const IMAGE_CACHE_TTL_MS = 4 * 60 * 1000;
const MAX_RETRIES = 4;
const MAX_RETRY_DELAY = 24_000;

/** The id of the host on this machine. */
export const LOCAL_HOST_ID = "local";

/** The host id of a durable (cloud) task. */
const DURABLE_HOST_ID = "durable";

const FILE_SERVICE_SCHEME = "file-service://";
const SEDIMENT_SCHEME = "sediment://";

/* ------------------------------------------------------ classification --- */

interface RegisteredAssetFile {
  download_url?: string;
  file_name?: string | null;
  mime_type?: string | null;
  url: string;
}

/** Registered asset files by owner (sandbox and tool assets). */
const registeredAssetOwners = new Map<
  string,
  Record<string, RegisteredAssetFile>
>();

/** Registers the files an owner (for example a tool result) makes available by URL. */
export const registerImageAssetFiles = (
  owner: string,
  files: Record<string, RegisteredAssetFile>
): (() => void) => {
  registeredAssetOwners.set(owner, files);

  return () => {
    if (registeredAssetOwners.get(owner) === files) {
      registeredAssetOwners.delete(owner);
    }
  };
};

/** The registered file for a URL (the query string is ignored). */
const registeredAssetFile = (src: string): RegisteredAssetFile | undefined => {
  const withoutQuery = src.replace(/\?.*$/u, "");

  for (const files of registeredAssetOwners.values()) {
    const file = files[withoutQuery];

    if (file !== undefined) {
      return file;
    }
  }

  return undefined;
};

/** Does this source go through the asset resolver? */
export const isAssetUrl = (src: string): boolean =>
  src.startsWith(FILE_SERVICE_SCHEME) ||
  src.startsWith(SEDIMENT_SCHEME) ||
  registeredAssetFile(src) !== undefined;

/** The id the resolver is asked for. */
export const assetPointerFileId = (src: string): string => {
  if (src.startsWith(FILE_SERVICE_SCHEME)) {
    return src.replace(FILE_SERVICE_SCHEME, "");
  }

  return src.startsWith(SEDIMENT_SCHEME)
    ? src.replace(SEDIMENT_SCHEME, "")
    : src;
};

const LOCAL_PATH_START = /^(?:[\\/]|[A-Za-z]:[\\/])/u;
const DRIVE_PATH = /^[A-Za-z]:[\\/]/u;
const UNC_BACKSLASH_PATH = /^\\\\[^\\]+\\[^\\]+/u;
const UNC_SLASH_PATH = /^\/\/[^/]+\/[^/]+/u;
const DRIVE_AFTER_SLASH = /^\/[A-Za-z]:[\\/]/u;

/** Backslashes to slashes. */
const toForwardSlashes = (path: string) => path.replaceAll("\\", "/");

/** A POSIX, drive or UNC absolute path. */
const isAbsolutePath = (path: string) =>
  (path.startsWith("/") && !path.startsWith("//")) ||
  DRIVE_PATH.test(path) ||
  UNC_BACKSLASH_PATH.test(path) ||
  UNC_SLASH_PATH.test(path);

/** The absolute local path a source names, or null. */
export const localFilePath = (
  src: string | null | undefined
): string | null => {
  if (src === null || src === undefined) {
    return null;
  }

  const trimmed = src.trim();

  if (trimmed.length === 0 || !LOCAL_PATH_START.test(trimmed)) {
    return null;
  }

  const normalized = toForwardSlashes(trimmed);

  if (!isAbsolutePath(normalized)) {
    return null;
  }

  const keepsOriginal =
    trimmed.startsWith("/") &&
    !normalized.startsWith("//") &&
    !DRIVE_AFTER_SLASH.test(trimmed);

  return keepsOriginal ? trimmed : normalized;
};

/** The in-app file URL of a local path. */
export const localFileUrl = (path: string): string => {
  const slashed = toForwardSlashes(path);
  const rooted = DRIVE_PATH.test(slashed) ? `/${slashed}` : slashed;

  return `app://fs/@fs${encodeURI(rooted).replaceAll("#", "%23").replaceAll("?", "%3F")}`;
};

const MIME_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

/** The MIME type from the file extension. */
const mimeTypeOf = (path: string): string => {
  const name = path.split(/[\\/]/u).at(-1) ?? "";
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot).toLowerCase() : "";

  return MIME_TYPES.get(extension) ?? "application/octet-stream";
};

/* ------------------------------------------------------------- host --- */

export interface LocalFileRequest {
  conversationId?: string | null;
  environmentId?: string;
  hostId: string;
  path: string;
}

export interface ImageSourceHost {
  /** The host and environment a conversation runs in, or null. */
  conversationEnvironment: (
    conversationId: string
  ) => { environmentId?: string; hostId: string } | null;
  /** The host a conversation runs on, or null. */
  conversationHostId: (conversationId: string) => string | null;
  /** The kind of a host. */
  hostKind: (hostId: string) => { id: string; kind: "local" | "remote" };
  /** Reads a file through the host; null when the host cannot. */
  readBinary:
    | ((
        request: LocalFileRequest,
        signal: AbortSignal
      ) => Promise<{ contentsBase64: string }>)
    | null;
}

/** No conversation, every host is the local one, no file reads. */
const DEFAULT_HOST: ImageSourceHost = {
  conversationEnvironment: () => null,
  conversationHostId: () => null,
  hostKind: () => ({ id: LOCAL_HOST_ID, kind: "local" }),
  readBinary: null,
};

export const ImageSourceHostContext =
  createContext<ImageSourceHost>(DEFAULT_HOST);

/* ---------------------------------------------------------- resolver --- */

export type ImageAssetResolution =
  | {
      downloadUrl: string;
      kind: "available";
      requestHeaders?: Record<string, string>;
    }
  | { kind: "permanently-deleted" }
  | { kind: "trashed"; libraryFileId: string };

export type ImageCheckResult = "available" | "deleted" | "error";

export interface ImageAssetResolver {
  /** The cache scope; the default is ["images"]. */
  cacheKey?: readonly string[];
  /** Records the check outcome of a validation session. */
  imageLoading?: object;
  resolveAsset: (fileId: string) => Promise<ImageAssetResolution>;
  showCachedImageDuringValidation?: boolean;
  /** Use the resolved URL as the image source instead of downloading it. */
  useDownloadUrlAsImageSrc?: boolean;
  validationSessionId?: string;
}

export interface ImageLoadTiming {
  resourceTiming?: {
    decoded_body_size: number;
    encoded_body_size: number;
    initiator_type: string;
    resource_duration_ms: number;
    transfer_size: number;
  };
  startedAt: number;
}

export interface DeletedImageState {
  libraryFileId?: string;
  status: "permanently-deleted" | "trashed";
}

type AssetQueryData =
  | {
      blob: Blob;
      dataUrl: string;
      downloadUrl: string;
      kind: "download";
      loadTiming: ImageLoadTiming;
      objectUrl: string | null;
    }
  | { kind: "deleted"; state: DeletedImageState }
  | { kind: "url"; url: string };

/** The types that get an object URL. */
const OBJECT_URL_TYPES = new Set([
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

/** The blob behind an object URL this module made. */
const objectUrlBlobs = new Map<string, Blob>();

export const blobForObjectUrl = (url: string): Blob | undefined =>
  objectUrlBlobs.get(url);

/** Thrown when the caller stopped caring about a result. */
class CancelledError extends Error {
  constructor() {
    super("Image request cancelled");
    this.name = "CancelledError";
  }
}

/* ------------------------------------------------------- query store --- */

type QueryStatus = "error" | "pending" | "success";

interface QueryState {
  data: unknown;
  dataUpdateCount: number;
  error: unknown;
  errorUpdatedAt: number;
  fetchStatus: "fetching" | "idle";
  invalidated: boolean;
  status: QueryStatus;
}

interface QueryRunOptions {
  fn: (context: {
    key: readonly unknown[];
    signal: AbortSignal;
  }) => Promise<unknown>;
  gcTime: number;
  staleTime: number;
}

interface QueryRecord {
  controller: AbortController | null;
  gcTimer: ReturnType<typeof setTimeout> | undefined;
  hash: string;
  key: readonly unknown[];
  listeners: Set<() => void>;
  /** The update count when the first observer subscribed (isFetchedAfterMount). */
  mountedAt: number;
  observers: number;
  options: QueryRunOptions | null;
  promise: Promise<unknown> | null;
  state: QueryState;
  updatedAt: number;
}

const INITIAL_STATE: QueryState = {
  data: undefined,
  dataUpdateCount: 0,
  error: null,
  errorUpdatedAt: 0,
  fetchStatus: "idle",
  invalidated: false,
  status: "pending",
};

/** Object keys are sorted so equal keys hash equally. */
const hashKey = (key: readonly unknown[]): string =>
  JSON.stringify(key, (_name, value: unknown) =>
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).toSorted(([first], [second]) =>
            first.localeCompare(second)
          )
        )
      : value
  );

/**
 * Each query key family stores one data type, written only by its own query
 * function, so reading it back as that type is sound.
 */
const dataOf = <Data>(data: unknown): Data | undefined =>
  // SAFETY: the query function of the key family wrote this value with this type.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  data as Data | undefined;

const records = new Map<string, QueryRecord>();

const removalListeners = new Set<(record: QueryRecord) => void>();
const updateListeners = new Set<(record: QueryRecord) => void>();

const recordFor = (key: readonly unknown[]): QueryRecord => {
  const hash = hashKey(key);
  const existing = records.get(hash);

  if (existing !== undefined) {
    return existing;
  }

  const created: QueryRecord = {
    controller: null,
    gcTimer: undefined,
    hash,
    key,
    listeners: new Set(),
    mountedAt: 0,
    observers: 0,
    options: null,
    promise: null,
    state: INITIAL_STATE,
    updatedAt: 0,
  };

  records.set(hash, created);

  return created;
};

const patchState = (record: QueryRecord, patch: Partial<QueryState>) => {
  record.state = { ...record.state, ...patch };

  for (const listener of record.listeners) {
    listener();
  }

  for (const listener of updateListeners) {
    listener(record);
  }
};

const scheduleGc = (record: QueryRecord, gcTime: number) => {
  clearTimeout(record.gcTimer);

  if (record.observers > 0 || !Number.isFinite(gcTime)) {
    return;
  }

  record.gcTimer = setTimeout(() => {
    if (record.observers === 0 && records.get(record.hash) === record) {
      records.delete(record.hash);

      for (const listener of removalListeners) {
        listener(record);
      }
    }
  }, gcTime);
};

/** Retry network and server failures up to four times. */
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : null;

  return (
    status === null ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status >= 500 && status <= 599)
  );
};

const wait = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("The wait was cancelled", "AbortError"));
      },
      { once: true }
    );
  });

const isFresh = (record: QueryRecord, staleTime: number) =>
  record.state.status === "success" &&
  !record.state.invalidated &&
  performance.now() - record.updatedAt < staleTime;

const runQuery = (
  record: QueryRecord,
  options: QueryRunOptions
): Promise<unknown> => {
  // A running request is shared. A cancelled one is never handed to a new
  // reader: it will only reject, so a fresh run replaces it below.
  if (record.promise !== null && record.controller?.signal.aborted !== true) {
    return record.promise;
  }

  record.options = options;

  const controller = new AbortController();
  record.controller = controller;
  patchState(record, { fetchStatus: "fetching" });

  const attempt = async (failureCount: number): Promise<unknown> => {
    try {
      return await options.fn({ key: record.key, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted || !shouldRetry(failureCount, error)) {
        throw error;
      }

      await wait(
        Math.min(800 * 2 ** failureCount, MAX_RETRY_DELAY),
        controller.signal
      );

      return await attempt(failureCount + 1);
    }
  };

  const promise = attempt(0)
    .then(
      (data) => {
        if (record.controller !== controller) {
          // A replaced run must not overwrite the run that replaced it.
          return data;
        }

        record.updatedAt = performance.now();

        patchState(record, {
          data,
          dataUpdateCount: record.state.dataUpdateCount + 1,
          error: null,
          fetchStatus: "idle",
          invalidated: false,
          status: "success",
        });

        return data;
      },
      (error: unknown) => {
        if (record.controller !== controller) {
          // A replaced run must not overwrite the run that replaced it.
          throw error;
        }

        if (controller.signal.aborted) {
          // A cancelled request leaves the record as it was.
          patchState(record, { fetchStatus: "idle" });
        } else {
          patchState(record, {
            error,
            errorUpdatedAt: Date.now(),
            fetchStatus: "idle",
            status: "error",
          });
        }

        throw error;
      }
    )
    .finally(() => {
      if (record.controller === controller) {
        record.controller = null;
        record.promise = null;
        scheduleGc(record, options.gcTime);
      }
    });

  record.promise = promise;

  return promise;
};

/** FetchQuery: fresh data is returned; otherwise the request runs once. */
const fetchQuery = async (
  key: readonly unknown[],
  options: QueryRunOptions
): Promise<unknown> => {
  const record = recordFor(key);

  if (isFresh(record, options.staleTime)) {
    scheduleGc(record, options.gcTime);

    return record.state.data;
  }

  return await runQuery(record, options);
};

const setQueryData = (
  key: readonly unknown[],
  data: unknown,
  gcTime = IMAGE_CACHE_TTL_MS
) => {
  const record = recordFor(key);
  record.updatedAt = performance.now();

  patchState(record, {
    data,
    dataUpdateCount: record.state.dataUpdateCount + 1,
    error: null,
    invalidated: false,
    status: "success",
  });

  scheduleGc(record, gcTime);
};

const observe = (record: QueryRecord, gcTime: number, listener: () => void) => {
  clearTimeout(record.gcTimer);

  if (record.observers === 0) {
    record.mountedAt = record.state.dataUpdateCount;
  }

  record.observers += 1;
  record.listeners.add(listener);

  return () => {
    record.listeners.delete(listener);
    record.observers -= 1;

    if (record.observers === 0) {
      // The last observer left: stop the request, as the query client does.
      record.controller?.abort();
      scheduleGc(record, gcTime);
    }
  };
};

interface UseQueryOptions {
  enabled: boolean;
  fn?: QueryRunOptions["fn"];
  gcTime?: number;
  key: readonly unknown[];
  staleTime?: number;
}

interface QueryResult {
  data: unknown;
  fetchStatus: "fetching" | "idle";
  isError: boolean;
  isFetchedAfterMount: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  refetch: () => void;
  status: QueryStatus;
}

const noop = () => {
  // Nothing to observe or undo.
};

/** UseQuery over the store above. */
const useQuery = ({
  enabled,
  fn,
  gcTime = IMAGE_CACHE_TTL_MS,
  key,
  staleTime = IMAGE_CACHE_TTL_MS,
}: UseQueryOptions): QueryResult => {
  const hash = hashKey(key);
  const keyRef = useRef(key);

  useInsertionEffect(() => {
    keyRef.current = key;
  });

  // The subscription follows the key: a new hash is a new record to observe.
  const subscribe = useCallback(
    (listener: () => void) =>
      observe(records.get(hash) ?? recordFor(keyRef.current), gcTime, listener),
    [gcTime, hash]
  );

  const state = useSyncExternalStore(
    subscribe,
    () => records.get(hash)?.state ?? INITIAL_STATE,
    () => INITIAL_STATE
  );

  const run = useCallback(
    (force: boolean) => {
      if (fn === undefined) {
        return;
      }

      const options = { fn, gcTime, staleTime };
      const record = recordFor(keyRef.current);

      if (force) {
        patchState(record, { invalidated: true });
      }

      if (!isFresh(record, staleTime)) {
        runQuery(record, options).catch(noop);
      }
    },
    [fn, gcTime, staleTime]
  );

  useEffect(() => {
    if (enabled) {
      run(false);
    }
    // The request starts again when the key (its hash) changes.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [enabled, hash, run]);

  const mounted = records.get(hash)?.mountedAt;

  return {
    data: state.data,
    fetchStatus: state.fetchStatus,
    isError: state.status === "error",
    isFetchedAfterMount:
      mounted !== undefined && state.dataUpdateCount > mounted,
    isLoading: state.fetchStatus === "fetching" && state.status === "pending",
    isSuccess: state.status === "success",
    refetch: () => {
      run(true);
    },
    status: state.status,
  };
};

/* ------------------------------------------------------ asset query --- */

/** The cache identity of an asset. */
export const imageAssetQueryKey = (
  pointer: string,
  resolver: ImageAssetResolver | null | undefined
): readonly unknown[] => [
  "file",
  "image-src",
  pointer,
  ...(resolver?.cacheKey ?? ["images"]),
  ...(resolver?.validationSessionId === undefined
    ? []
    : [resolver.validationSessionId]),
];

const imageCheckKey = (key: readonly unknown[]) => [
  "file",
  "image-check",
  ...key.slice(2),
];

/** A blob as a data URL. */
const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });

    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Could not read the image"));
    });

    reader.readAsDataURL(blob);
  });

const resourceTimingOf = (url: string): ImageLoadTiming["resourceTiming"] => {
  const entry = performance
    .getEntriesByName(url, "resource")
    .findLast((candidate) => candidate.entryType === "resource");

  if (entry === undefined || !(entry instanceof PerformanceResourceTiming)) {
    return undefined;
  }

  return {
    decoded_body_size: entry.decodedBodySize,
    encoded_body_size: entry.encodedBodySize,
    initiator_type: entry.initiatorType,
    resource_duration_ms: entry.duration,
    transfer_size: entry.transferSize,
  };
};

/**
 * An object URL for a downloaded blob, released once its record is
 * removed or replaced, or the request is cancelled.
 */
const retainObjectUrl = (
  key: readonly unknown[],
  blob: Blob,
  signal: AbortSignal
): string => {
  const url = URL.createObjectURL(blob);
  objectUrlBlobs.set(url, blob);

  const hash = hashKey(key);

  const stops: (() => void)[] = [];

  const release = () => {
    for (const stop of stops) {
      stop();
    }

    setTimeout(() => {
      objectUrlBlobs.delete(url);
      URL.revokeObjectURL(url);
    }, 0);
  };

  const onRemoved = (record: QueryRecord) => {
    if (record.hash === hash) {
      release();
    }
  };

  const onUpdated = (record: QueryRecord) => {
    if (record.hash !== hash) {
      return;
    }

    const data = dataOf<AssetQueryData>(record.state.data);

    if (
      record.state.fetchStatus === "idle" &&
      (data?.kind !== "download" || data.objectUrl !== url)
    ) {
      release();
    }
  };

  removalListeners.add(onRemoved);
  updateListeners.add(onUpdated);
  signal.addEventListener("abort", release, { once: true });

  stops.push(
    () => {
      removalListeners.delete(onRemoved);
    },
    () => {
      updateListeners.delete(onUpdated);
    },
    () => {
      signal.removeEventListener("abort", release);
    }
  );

  return url;
};

/** The download URL of the default `/files/download/{id}` reply. */
const downloadUrlOfReply = (reply: unknown): string => {
  const fields =
    typeof reply === "object" && reply !== null
      ? Object.fromEntries(Object.entries(reply))
      : null;

  const status = typeof fields?.status === "string" ? fields.status : undefined;

  const url =
    typeof fields?.download_url === "string" ? fields.download_url : "";

  if (
    fields === null ||
    (status !== undefined && status !== "success") ||
    url.length === 0
  ) {
    throw new Error("No download address could be obtained");
  }

  return url;
};

/**
 * With no resolver the file id is looked up on the app's own
 * download endpoint.
 */
const defaultResolveAsset = async (
  fileId: string,
  signal: AbortSignal
): Promise<ImageAssetResolution> => {
  const response = await fetch(
    `/files/download/${encodeURIComponent(fileId)}`,
    { signal }
  );

  if (!response.ok) {
    throw Object.assign(new Error("No download address could be obtained"), {
      status: response.status,
    });
  }

  return {
    downloadUrl: downloadUrlOfReply(await response.json()),
    kind: "available",
  };
};

const resolveAsset = async (
  pointer: string,
  resolver: ImageAssetResolver | null | undefined,
  signal: AbortSignal
): Promise<ImageAssetResolution> => {
  const fileId = assetPointerFileId(pointer);

  if (resolver === null || resolver === undefined) {
    return await defaultResolveAsset(fileId, signal);
  }

  return await resolver.resolveAsset(fileId);
};

/** The query that resolves one asset pointer. */
const assetQueryFn =
  (
    pointer: string,
    resolver: ImageAssetResolver | null | undefined
  ): QueryRunOptions["fn"] =>
  async ({ key, signal }): Promise<AssetQueryData> => {
    const recordsChecks =
      resolver?.validationSessionId !== undefined &&
      resolver.imageLoading !== undefined;

    const recordCheck = (result: ImageCheckResult | null) => {
      if (recordsChecks) {
        setQueryData(
          imageCheckKey(key),
          result === null ? null : { completedAt: performance.now(), result }
        );
      }
    };

    recordCheck(null);

    let resolved: ImageAssetResolution;

    try {
      resolved = await resolveAsset(pointer, resolver, signal);
    } catch (error) {
      signal.throwIfAborted();

      if (!(error instanceof CancelledError)) {
        recordCheck("error");
      }

      throw error;
    }

    signal.throwIfAborted();
    recordCheck(resolved.kind === "available" ? "available" : "deleted");

    if (resolved.kind === "trashed") {
      return {
        kind: "deleted",
        state: { libraryFileId: resolved.libraryFileId, status: "trashed" },
      };
    }

    if (resolved.kind === "permanently-deleted") {
      return { kind: "deleted", state: { status: "permanently-deleted" } };
    }

    if (
      resolver?.useDownloadUrlAsImageSrc === true &&
      resolved.requestHeaders === undefined
    ) {
      return { kind: "url", url: resolved.downloadUrl };
    }

    const startedAt = performance.now();

    const response = await fetch(resolved.downloadUrl, {
      headers: resolved.requestHeaders,
      signal,
    });

    if (!response.ok) {
      throw Object.assign(new Error("Failed to download the image"), {
        status: response.status,
      });
    }

    const blob = await response.blob();
    signal.throwIfAborted();

    const dataUrl = await blobToDataUrl(blob);
    signal.throwIfAborted();

    return {
      blob,
      dataUrl,
      downloadUrl: resolved.downloadUrl,
      kind: "download",
      loadTiming: {
        resourceTiming: resourceTimingOf(resolved.downloadUrl),
        startedAt,
      },
      objectUrl: OBJECT_URL_TYPES.has(blob.type)
        ? retainObjectUrl(key, blob, signal)
        : null,
    };
  };

interface ImageCheck {
  completedAt: number;
  result: ImageCheckResult;
}

export interface AssetImage {
  dataUrl: string | null;
  deleted: DeletedImageState | undefined;
  imageCacheHit: boolean;
  imageCheck: ImageCheck | undefined;
  isError: boolean;
  isLoading: boolean;
  isShowingCachedImage: boolean;
  loadSource: string | undefined;
  loadTiming: ImageLoadTiming | undefined;
  refetch: () => void;
  src: string | null;
}

/** The successful request that came just before this one in the same scope. */
const previousSuccessfulKey = (
  key: readonly unknown[]
): readonly unknown[] | undefined => {
  const scope = key.slice(0, -1);
  const scopeHash = hashKey(scope);
  const hash = hashKey(key);

  const siblings = [...records.values()].filter(
    (record) =>
      record.key.length === key.length &&
      hashKey(record.key.slice(0, -1)) === scopeHash
  );

  const index = siblings.findIndex((record) => record.hash === hash);
  const previous = siblings[index - 1];

  const data = dataOf<AssetQueryData>(previous?.state.data);

  return previous !== undefined &&
    previous.state.status === "success" &&
    previous.state.fetchStatus === "idle" &&
    !previous.state.invalidated &&
    data?.kind !== "deleted"
    ? previous.key
    : undefined;
};

/** Resolves an asset pointer through the resolver. */
export const useAssetImage = (
  pointer: string,
  resolver: ImageAssetResolver | null | undefined,
  { enabled = true }: { enabled?: boolean } = {}
): AssetImage => {
  const key = imageAssetQueryKey(pointer, resolver);
  const active = enabled && pointer.length > 0;

  const resolverRef = useRef(resolver);

  useInsertionEffect(() => {
    resolverRef.current = resolver;
  });

  const fn = useCallback<QueryRunOptions["fn"]>(
    (context) => assetQueryFn(pointer, resolverRef.current)(context),
    [pointer]
  );

  const main = useQuery({ enabled: active, fn, key });
  const check = useQuery({ enabled: false, key: imageCheckKey(key) });
  const record = records.get(hashKey(key));
  const validating = resolver?.validationSessionId !== undefined;

  const previousKey =
    validating &&
    active &&
    record !== undefined &&
    record.state.errorUpdatedAt === 0 &&
    !record.state.invalidated
      ? previousSuccessfulKey(key)
      : undefined;

  const showingCached =
    resolver?.showCachedImageDuringValidation === true && main.isLoading
      ? previousKey
      : undefined;

  const cached = useQuery({
    enabled: false,
    key: showingCached ?? key,
  });

  let current = dataOf<AssetQueryData>(main.data);

  if (validating && !main.isSuccess) {
    current =
      showingCached === undefined
        ? undefined
        : dataOf<AssetQueryData>(cached.data);
  }

  const download = current?.kind === "download" ? current : null;
  const checkData = dataOf<ImageCheck | null>(check.data);

  const imageCheck =
    (record?.state.status === "pending" &&
      record.state.fetchStatus === "idle") ||
    (checkData?.result === "error" &&
      (!main.isError || record?.state.fetchStatus !== "idle"))
      ? undefined
      : (checkData ?? undefined);

  let src: string | null = null;

  if (current?.kind === "url") {
    src = current.url;
  } else if (download !== null) {
    src = download.objectUrl ?? download.dataUrl;
  }

  return {
    dataUrl: download?.dataUrl ?? null,
    deleted: current?.kind === "deleted" ? current.state : undefined,
    imageCacheHit: previousKey !== undefined,
    imageCheck,
    isError: main.isError,
    isLoading: main.isLoading && current === undefined,
    isShowingCachedImage: showingCached !== undefined && current !== undefined,
    loadSource: download?.downloadUrl,
    loadTiming:
      main.isSuccess && main.isFetchedAfterMount
        ? download?.loadTiming
        : undefined,
    refetch: main.refetch,
    src,
  };
};

/* ------------------------------------------------------- local files --- */

interface LocalImage {
  base64: string;
  mimeType: string;
}

/** The data of a local file read through the host, or null. */
const readLocalImage = async (
  path: string,
  host: ImageSourceHost,
  hostId: string,
  conversationId: string | null | undefined,
  environmentId: string | undefined,
  signal?: AbortSignal
): Promise<LocalImage | null> => {
  const request: LocalFileRequest = {
    conversationId,
    environmentId,
    hostId,
    path,
  };

  try {
    const reply = await fetchQuery(["workspace-file-binary", request], {
      fn: async ({ signal: querySignal }) => {
        if (host.readBinary === null) {
          throw new Error("This host cannot read files as bytes");
        }

        return await host.readBinary(
          request,
          signal === undefined
            ? querySignal
            : AbortSignal.any([querySignal, signal])
        );
      },
      gcTime: IMAGE_CACHE_TTL_MS,
      staleTime:
        hostId === DURABLE_HOST_ID &&
        conversationId !== null &&
        conversationId !== undefined &&
        environmentId === undefined
          ? 0
          : Number.POSITIVE_INFINITY,
    });

    const contents = dataOf<{ contentsBase64?: string }>(reply);
    const base64 = contents?.contentsBase64;

    return base64 === undefined || base64 === ""
      ? null
      : { base64, mimeType: mimeTypeOf(path) };
  } catch {
    // The component logs a warning and shows nothing for a file it cannot read.
    return null;
  }
};

/** A local file as a data URL, or null. */
export const readLocalFileDataUrl = async (
  src: string,
  host: ImageSourceHost,
  hostId: string,
  conversationId?: string | null,
  environmentId?: string,
  signal?: AbortSignal
): Promise<string | null> => {
  const path = localFilePath(src);

  if (path === null) {
    return null;
  }

  const image = await readLocalImage(
    path,
    host,
    hostId,
    conversationId,
    environmentId,
    signal
  );

  return image === null
    ? null
    : `data:${image.mimeType};base64,${image.base64}`;
};

/* ------------------------------------------------------------- hook --- */

export interface GeneratedImageSourceOptions {
  conversationId?: string | null;
  hostId?: string | null;
  imageAssetResolver?: ImageAssetResolver | null;
  shouldLoadFileDataUrl?: boolean;
  src: string;
}

export interface GeneratedImageSource extends Omit<
  AssetImage,
  "isLoading" | "src"
> {
  downloadSrc: string | null;
  previewSrc: string | null;
}

interface LocalFileState {
  dataUrl: string | null;
  environmentId: string | undefined;
  src: string;
}

/** Chooses the resolved asset, host file URL, plain URL or host data URL. */
export const useGeneratedImageSource = ({
  conversationId,
  hostId,
  imageAssetResolver,
  shouldLoadFileDataUrl,
  src,
}: GeneratedImageSourceOptions): GeneratedImageSource & {
  dataUrl: string | null;
} => {
  const host = useContext(ImageSourceHostContext);

  const conversationHostId =
    conversationId === null || conversationId === undefined
      ? null
      : host.conversationHostId(conversationId);

  const resolvedHostId = hostId ?? conversationHostId ?? LOCAL_HOST_ID;
  const hostKind = host.hostKind(resolvedHostId);

  const environment =
    conversationId === null || conversationId === undefined
      ? null
      : host.conversationEnvironment(conversationId);

  const environmentId =
    environment?.hostId === resolvedHostId
      ? environment.environmentId
      : undefined;

  const [localFile, setLocalFile] = useState<LocalFileState | null>(null);

  const hasSource = src.trim().length > 0;
  const assetSrc = hasSource && isAssetUrl(src) ? src : "";
  const asset = useAssetImage(assetSrc, imageAssetResolver);
  const localPath = hasSource ? localFilePath(src) : null;

  const localUrl =
    hostKind.kind === "local" &&
    hostKind.id === resolvedHostId &&
    localPath !== null
      ? localFileUrl(localPath)
      : null;

  const readDataUrl =
    localFile?.src === src && localFile.environmentId === environmentId
      ? localFile.dataUrl
      : null;

  let previewSrc: string | null = null;

  if (hasSource) {
    previewSrc =
      asset.src ??
      localUrl ??
      (localPath === null && assetSrc === "" ? src : readDataUrl);
  }

  useEffect(() => {
    if (
      localPath === null ||
      (localUrl !== null && shouldLoadFileDataUrl !== true)
    ) {
      return noop;
    }

    let cancelled = false;
    // The state is set here, then again once the file has been read.
    // oxlint-disable-next-line react/set-state-in-effect
    setLocalFile({ dataUrl: null, environmentId, src });

    const load = async () => {
      const dataUrl = await readLocalFileDataUrl(
        src,
        host,
        resolvedHostId,
        conversationId,
        environmentId
      );

      if (!cancelled) {
        setLocalFile({ dataUrl, environmentId, src });
      }
    };

    load().catch(noop);

    return () => {
      // oxlint-disable-next-line react/immutability -- local to this effect or callback, not render state; oxlint 1.91 misreports it
      cancelled = true;
    };
  }, [
    conversationId,
    environmentId,
    host,
    localPath,
    localUrl,
    resolvedHostId,
    shouldLoadFileDataUrl,
    src,
  ]);

  const dataUrl =
    asset.dataUrl ??
    readDataUrl ??
    (src.startsWith("data:image/") ? src : null);

  return {
    dataUrl,
    deleted: asset.deleted,
    downloadSrc: asset.dataUrl ?? readDataUrl ?? previewSrc,
    imageCacheHit: asset.imageCacheHit,
    imageCheck: asset.imageCheck,
    isError: assetSrc !== "" && asset.isError,
    isShowingCachedImage: asset.isShowingCachedImage,
    loadSource: asset.loadSource,
    loadTiming: asset.loadTiming,
    previewSrc,
    refetch: asset.refetch,
  };
};
