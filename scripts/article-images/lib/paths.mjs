import path from 'node:path';

/** Relative href from one file to another, using forward slashes regardless of OS. */
export function relHref(fromFile, toFile) {
  const rel = path.relative(path.dirname(fromFile), toFile);
  return rel.split(path.sep).join('/');
}
