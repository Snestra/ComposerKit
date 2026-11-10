"use client";

/* oxlint-disable shadcn/no-restyle, shadcn/no-arbitrary-values, eslint/complexity, promise/avoid-new, eslint/require-await, typescript/return-await -- The gallery draws measured frames; its local resolver and host are written as small promise helpers. */

import {
  ImageSourceHostContext,
  registerImageAssetFiles,
  useGeneratedImageSource,
} from "@workspace/react/components/carousel/image-source";
import type {
  GeneratedImageSourceOptions,
  ImageAssetResolver,
  ImageSourceHost,
} from "@workspace/react/components/carousel/image-source";
import { Button } from "@workspace/react/components/ui/button";
import { ImageGroupCarousel } from "@workspace/react/components/ui/carousel";
import type {
  CarouselImage,
  ImageGroupCarouselHandle,
} from "@workspace/react/components/ui/carousel";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  Frame,
  Section,
  WIDE,
  photoSource,
} from "@/examples/carousel-gallery-parts";

const sidebarFrame = "mx-auto w-96 max-w-full px-6";

type Outcome =
  | "available"
  | "available-url"
  | "error"
  | "gone"
  | "pending"
  | "trashed";

interface Gate {
  open: () => void;
  wait: Promise<undefined>;
}

const createGate = (): Gate => {
  const { promise, resolve } = Promise.withResolvers<undefined>();

  return {
    open: () => {
      resolve(undefined);
    },
    wait: promise,
  };
};

/**
 * A resolver that answers from local data: `outcome` decides what it says,
 * and `pending` holds the answer until the gate opens. `calls` lists the file
 * ids it was asked for.
 */
const useDemoResolver = (outcome: Outcome, scope: string, photo = 1) => {
  const [calls, setCalls] = useState<string[]>([]);
  const [run, setRun] = useState(0);
  const [gate, setGate] = useState(createGate);

  const resolver = useMemo<ImageAssetResolver>(
    () => ({
      cacheKey: ["gallery", scope, String(run)],
      resolveAsset: async (fileId) => {
        setCalls((previous) => [...previous, fileId]);

        if (outcome === "error") {
          throw Object.assign(new Error("Not found"), { status: 404 });
        }

        if (outcome === "trashed") {
          return { kind: "trashed", libraryFileId: "library-file-1" };
        }

        if (outcome === "gone") {
          return { kind: "permanently-deleted" };
        }

        if (outcome === "pending") {
          await gate.wait;
        }

        return {
          downloadUrl: photoSource(photo, WIDE),
          kind: "available",
        };
      },
      useDownloadUrlAsImageSrc: outcome === "available-url",
    }),
    [gate, outcome, photo, run, scope]
  );

  return {
    calls,
    handleRelease: () => {
      gate.open();
    },
    handleReset: () => {
      setCalls([]);
      setGate(createGate());
      setRun((previous) => previous + 1);
    },
    resolver,
  };
};

const shorten = (value: string | null) => {
  if (value === null) {
    return "none";
  }

  return value.length > 56 ? `${value.slice(0, 56)}…` : value;
};

/** Shows what useGeneratedImageSource returns for one source. */
const SourceProbe = ({
  children,
  label,
  options,
  testId,
}: {
  children?: ReactNode;
  label: string;
  options: GeneratedImageSourceOptions;
  testId: string;
}) => {
  const result = useGeneratedImageSource(options);
  let status = "ready";

  if (result.isError) {
    status = "error";
  } else if (result.deleted !== undefined) {
    status = `deleted (${result.deleted.status})`;
  } else if (result.previewSrc === null) {
    status = "pending";
  }

  return (
    <Frame label={label} testId={testId}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Status</dt>
        <dd data-testid={`${testId}-status`}>{status}</dd>
        <dt className="text-muted-foreground">Preview source</dt>
        <dd className="break-all" data-testid={`${testId}-preview`}>
          {shorten(result.previewSrc)}
        </dd>
        <dt className="text-muted-foreground">Download source</dt>
        <dd className="break-all" data-testid={`${testId}-download`}>
          {shorten(result.downloadSrc)}
        </dd>
      </dl>
      {children}
    </Frame>
  );
};

const CallLog = ({ calls, testId }: { calls: string[]; testId: string }) => (
  <p className="mt-2 text-xs text-muted-foreground" data-testid={testId}>
    Resolver asked for: {calls.length === 0 ? "nothing" : calls.join(", ")}
  </p>
);

const rawSvgBase64 = (number: number) =>
  btoa(decodeURIComponent(photoSource(number, WIDE).split(",")[1] ?? ""));

const delay = async (milliseconds: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

/** A host that runs elsewhere: it can read files, but is not this machine. */
const useRemoteHost = (log: (line: string) => void): ImageSourceHost =>
  useMemo(
    () => ({
      conversationEnvironment: (conversationId) =>
        conversationId === "conversation-1"
          ? { environmentId: "environment-9", hostId: "remote-1" }
          : null,
      conversationHostId: (conversationId) =>
        conversationId === "conversation-1" ? "remote-1" : null,
      hostKind: (hostId) => ({ id: hostId, kind: "remote" }),
      readBinary: async (request, signal) => {
        const slow = request.path.endsWith("slow.png");
        log(
          `read ${request.path} on ${request.hostId}${request.environmentId === undefined ? "" : ` / ${request.environmentId}`}`
        );
        await delay(slow ? 900 : 150);
        signal.throwIfAborted();
        log(`finished ${request.path}`);

        return { contentsBase64: rawSvgBase64(slow ? 3 : 4) };
      },
    }),
    [log]
  );

const ClassificationExamples = () => (
  <div className="grid gap-4 md:grid-cols-2">
    <SourceProbe
      label="Plain https URL (used as it is)"
      options={{ src: "https://example.test/photo.png" }}
      testId="probe-plain"
    />
    <SourceProbe
      label="data:image URL (used as it is)"
      options={{ src: photoSource(2, WIDE) }}
      testId="probe-data"
    />
    <SourceProbe
      label="Absolute POSIX path on this machine (in-app file URL)"
      options={{ src: "/Users/example/photos/trip.png" }}
      testId="probe-local-posix"
    />
    <SourceProbe
      label="Windows path with a space and a hash (backslashes become slashes)"
      options={{ src: "C:\\Users\\example\\a 1 #2.png" }}
      testId="probe-local-windows"
    />
    <SourceProbe
      label="Path with a drive prefix after a slash and a query mark"
      options={{ src: "/C:/Users/example/what?.png" }}
      testId="probe-local-drive"
    />
    <SourceProbe
      label="Relative path (not a local file, used as it is)"
      options={{ src: "photos/trip.png" }}
      testId="probe-relative"
    />
  </div>
);

const ResolverExamples = () => {
  const available = useDemoResolver("available", "available", 5);
  const sediment = useDemoResolver("available", "sediment", 6);
  const direct = useDemoResolver("available-url", "direct", 7);
  const pending = useDemoResolver("pending", "pending", 8);
  const failing = useDemoResolver("error", "failing");
  const trashed = useDemoResolver("trashed", "trashed");
  const gone = useDemoResolver("gone", "gone");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SourceProbe
        label="file-service:// pointer, resolved to downloaded bytes"
        options={{
          imageAssetResolver: available.resolver,
          src: "file-service://file-ok",
        }}
        testId="probe-asset"
      >
        <CallLog calls={available.calls} testId="probe-asset-calls" />
      </SourceProbe>
      <SourceProbe
        label="sediment:// pointer (the scheme is dropped before the lookup)"
        options={{
          imageAssetResolver: sediment.resolver,
          src: "sediment://file-sediment",
        }}
        testId="probe-sediment"
      >
        <CallLog calls={sediment.calls} testId="probe-sediment-calls" />
      </SourceProbe>
      <SourceProbe
        label="Resolver says use the download URL as the image source"
        options={{
          imageAssetResolver: direct.resolver,
          src: "file-service://file-direct",
        }}
        testId="probe-direct"
      />
      <SourceProbe
        label="Pending until the answer arrives"
        options={{
          imageAssetResolver: pending.resolver,
          src: "file-service://file-slow",
        }}
        testId="probe-pending"
      >
        <div className="mt-2 flex gap-2">
          <Button
            color="outlineSurface"
            onClick={pending.handleRelease}
            size="dialog"
          >
            Answer the lookup
          </Button>
          <Button
            color="outlineSurface"
            onClick={pending.handleReset}
            size="dialog"
          >
            Ask again
          </Button>
        </div>
      </SourceProbe>
      <SourceProbe
        label="Lookup fails (404, not retried)"
        options={{
          imageAssetResolver: failing.resolver,
          src: "file-service://file-missing",
        }}
        testId="probe-error"
      />
      <SourceProbe
        label="File moved to the trash"
        options={{
          imageAssetResolver: trashed.resolver,
          src: "file-service://file-trashed",
        }}
        testId="probe-trashed"
      />
      <SourceProbe
        label="File deleted for good"
        options={{
          imageAssetResolver: gone.resolver,
          src: "file-service://file-gone",
        }}
        testId="probe-gone"
      />
    </div>
  );
};

/** Two probes with the same cache key share one lookup. A third scope asks again. */
const CacheExamples = () => {
  const shared = useDemoResolver("available", "shared", 9);
  const other = useDemoResolver("available", "other", 9);
  const src = "file-service://file-shared";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SourceProbe
        label="Cache scope “shared”, first reader"
        options={{ imageAssetResolver: shared.resolver, src }}
        testId="probe-cache-a"
      />
      <SourceProbe
        label="Cache scope “shared”, second reader"
        options={{ imageAssetResolver: shared.resolver, src }}
        testId="probe-cache-b"
      >
        <CallLog calls={shared.calls} testId="probe-cache-shared-calls" />
      </SourceProbe>
      <SourceProbe
        label="Cache scope “other”, same pointer"
        options={{ imageAssetResolver: other.resolver, src }}
        testId="probe-cache-c"
      >
        <CallLog calls={other.calls} testId="probe-cache-other-calls" />
      </SourceProbe>
    </div>
  );
};

/** Registered sandbox files go through the resolver, with their full URL as the id. */
const RegisteredExample = () => {
  const registered = useDemoResolver("available", "registered", 10);
  const url = "https://sandbox.test/outputs/chart.png";

  const [ready, setReady] = useState(false);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SourceProbe
        label={`Registered file URL${ready ? " (registered)" : " (not registered yet)"}`}
        options={{ imageAssetResolver: registered.resolver, src: `${url}?v=2` }}
        testId="probe-registered"
      >
        <CallLog calls={registered.calls} testId="probe-registered-calls" />
        <Button
          className="mt-2"
          color="outlineSurface"
          onClick={() => {
            registerImageAssetFiles("gallery", { [url]: { url } });
            setReady(true);
            registered.handleReset();
          }}
          size="dialog"
        >
          Register the file
        </Button>
      </SourceProbe>
    </div>
  );
};

/** Local files read through a host that is not this machine. */
const LocalReadExamples = () => {
  const [lines, setLines] = useState<string[]>([]);
  const [target, setTarget] = useState("slow.png");

  const log = useCallback((line: string) => {
    setLines((previous) => [...previous.slice(-5), line]);
  }, []);

  const host = useRemoteHost(log);

  return (
    <ImageSourceHostContext value={host}>
      <div className="grid gap-4 md:grid-cols-2">
        <SourceProbe
          label="Local path on another host: read as a data URL (host and environment come from the conversation)"
          options={{
            conversationId: "conversation-1",
            src: "/srv/photos/fast.png",
          }}
          testId="probe-read"
        />
        <SourceProbe
          label="Stale read: the source changes while the first read is still running"
          options={{ hostId: "remote-2", src: `/srv/photos/${target}` }}
          testId="probe-stale"
        >
          <div className="mt-2 flex gap-2">
            <Button
              color="outlineSurface"
              onClick={() => {
                setTarget("fast.png");
              }}
              size="dialog"
            >
              Switch to the fast file
            </Button>
            <Button
              color="outlineSurface"
              onClick={() => {
                setTarget("slow.png");
              }}
              size="dialog"
            >
              Back to the slow file
            </Button>
          </div>
        </SourceProbe>
      </div>
      <ul
        className="mt-2 text-xs text-muted-foreground"
        data-testid="probe-read-log"
      >
        {lines.map((line, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- the log lines are not unique and never reorder.
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
    </ImageSourceHostContext>
  );
};

const AssetCarousel = () => {
  const pending = useDemoResolver("pending", "carousel-pending", 2);
  const available = useDemoResolver("available", "carousel-ok", 1);
  const failing = useDemoResolver("error", "carousel-failing");
  const trashed = useDemoResolver("trashed", "carousel-trashed");

  // One resolver serves the carousel: it routes by the pointer it is asked for.
  const resolver = useMemo<ImageAssetResolver>(
    () => ({
      cacheKey: ["gallery", "carousel"],
      resolveAsset: async (fileId) => {
        const route =
          {
            "carousel-failing": failing.resolver,
            "carousel-ok": available.resolver,
            "carousel-pending": pending.resolver,
            "carousel-trashed": trashed.resolver,
          }[fileId] ?? available.resolver;

        return await route.resolveAsset(fileId);
      },
    }),
    [available.resolver, failing.resolver, pending.resolver, trashed.resolver]
  );

  const images: CarouselImage[] = [
    { id: "asset-ok", src: "file-service://carousel-ok" },
    { id: "asset-pending", src: "file-service://carousel-pending" },
    { id: "asset-failing", src: "file-service://carousel-failing" },
    { id: "asset-trashed", src: "file-service://carousel-trashed" },
  ];

  return (
    <Frame
      label="Photo carousel with asset pointers: ready, pending, failed and trashed (the last three show the placeholder)"
      testId="asset-carousel"
    >
      <div className={sidebarFrame}>
        <ImageGroupCarousel
          conversationId="conversation-1"
          imageAssetResolver={resolver}
          images={images}
        />
      </div>
      <Button
        color="outlineSurface"
        onClick={pending.handleRelease}
        size="dialog"
      >
        Answer the pending lookup
      </Button>
    </Frame>
  );
};

/**
 * The first photo shows its fallback while the preview is not ready, drops it
 * once the preview has loaded, and hands the thumbnail handle over.
 */
const FallbackExample = () => {
  const slow = useDemoResolver("pending", "fallback", 1);
  const handleRef = useRef<ImageGroupCarouselHandle>(null);
  const [thumbnail, setThumbnail] = useState("No thumbnail read yet");

  const images: CarouselImage[] = [
    {
      height: 400,
      id: "photo-1",
      src: "file-service://fallback-first",
      width: 500,
    },
    ...Array.from({ length: 2 }, (_, index) => ({
      height: 400,
      id: `photo-${index + 2}`,
      src: photoSource(index + 2, WIDE),
      width: 500,
    })),
  ];

  return (
    <Frame
      label="firstPhotoFallbackSrc: the fallback (a grey “Fallback” card) shows until the preview has loaded"
      testId="fallback-carousel"
    >
      <div className={sidebarFrame}>
        <ImageGroupCarousel
          firstPhotoFallbackSrc={`data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400"><rect width="100%" height="100%" fill="#888"/><text x="50%" y="50%" text-anchor="middle" font-size="48" fill="white">Fallback</text></svg>')}`}
          imageAssetResolver={slow.resolver}
          images={images}
          ref={handleRef}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          color="outlineSurface"
          onClick={slow.handleRelease}
          size="dialog"
        >
          Let the preview load
        </Button>
        <Button color="outlineSurface" onClick={slow.handleReset} size="dialog">
          Start again
        </Button>
        <Button
          color="outlineSurface"
          onClick={() => {
            const image = handleRef.current?.getThumbnail("photo-1");

            setThumbnail(
              image === null || image === undefined
                ? "No thumbnail for photo-1"
                : `photo-1 thumbnail is the ${image.getAttribute("aria-hidden") === "true" ? "fallback" : "preview"} image`
            );
          }}
          size="dialog"
        >
          Read photo 1 thumbnail
        </Button>
        <span
          className="text-xs text-muted-foreground"
          data-testid="fallback-thumbnail-log"
        >
          {thumbnail}
        </span>
      </div>
    </Frame>
  );
};

export const CarouselAssetExamples = () => (
  <>
    <Section
      description="useGeneratedImageSource decides where a photo comes from. Plain URLs are used as they are. Absolute local paths become in-app file URLs on this machine. file-service:// and sediment:// pointers go through the caller's resolver."
      id="source-classes"
      title="Photo sources"
    >
      <ClassificationExamples />
    </Section>
    <Section
      description="A resolver answers with a download URL, a trashed file or a deleted file. Pending and failed lookups leave the photo without a source, so the carousel shows its placeholder."
      id="source-resolver"
      title="Asset resolver states"
    >
      <ResolverExamples />
      <AssetCarousel />
    </Section>
    <Section
      description="Lookups are cached by pointer and resolver scope for four minutes, and one lookup serves every reader. Registered sandbox files are treated as assets."
      id="source-cache"
      title="Cache and registered files"
    >
      <CacheExamples />
      <RegisteredExample />
    </Section>
    <Section
      description="On a host that is not this machine, a local path is read through the host. The host and environment come from the conversation, and a read that finishes after the source changed is dropped."
      id="source-local"
      title="Local files through a host"
    >
      <LocalReadExamples />
    </Section>
    <Section
      description="The first photo can carry a fallback that stands in until its preview has loaded."
      id="fallback"
      title="First photo fallback"
    >
      <FallbackExample />
    </Section>
  </>
);
