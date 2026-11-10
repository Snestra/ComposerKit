// Serves apps/docs/public/r on a local port, so a script installs the
// registry of this checkout instead of the published one.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_R = fileURLToPath(new URL("../public/r", import.meta.url));
const REGISTRY_FILE = /\/r\/(?<file>[\w-]+\.json)$/u;

export interface LocalRegistry {
  /** The URL the registry folder r/ sits under, such as http://127.0.0.1:4000/ComposerKit. */
  origin: string;
  close: () => Promise<void>;
}

/** Starts the server on a free port. basePath is the path in front of /r. */
export const startLocalRegistry = async (
  basePath = ""
): Promise<LocalRegistry> => {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const file = REGISTRY_FILE.exec(url.pathname)?.groups?.file;
    const filePath = file === undefined ? null : path.join(PUBLIC_R, file);

    const isFile =
      filePath !== null &&
      (await stat(filePath).then(
        (info) => info.isFile(),
        () => false
      ));

    if (filePath === null || !isFile) {
      response.writeHead(404).end();

      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    createReadStream(filePath).pipe(response);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address() as AddressInfo;

  return {
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
    origin: `http://127.0.0.1:${port}${basePath}`,
  };
};
