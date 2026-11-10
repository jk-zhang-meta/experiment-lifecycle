// Test-only preload: injects filesystem faults into the experiment CLI without
// adding hooks to the script. Loaded with `node --import`.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

// Report one existing path as absent, reproducing a writer that passed the
// existence check before another writer published the same name.
const hidden = process.env.PAC_TEST_HIDE_EXISTING;
if (hidden) {
  const existsSync = fs.existsSync;
  fs.existsSync = (target) => (String(target) === hidden ? false : existsSync(target));
}

// Fail fsync on directory handles only, with the given errno code.
const directorySyncError = process.env.PAC_TEST_DIRECTORY_SYNC_ERROR;
if (directorySyncError) {
  const fsyncSync = fs.fsyncSync;
  fs.fsyncSync = (fd) => {
    if (fs.fstatSync(fd).isDirectory()) {
      throw Object.assign(new Error(`${directorySyncError}: injected directory sync failure`), { code: directorySyncError });
    }
    return fsyncSync(fd);
  };
}

syncBuiltinESMExports();
