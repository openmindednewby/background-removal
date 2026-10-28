import { build } from 'esbuild';

const NOT_BARE = /^(\.{1,2}\/|\/|[a-z]:[/\\]|[a-z][a-z0-9+.-]*:\/\/|data:|blob:)/i;

/** Lists the bare module specifiers (package names, node: builtins) a built file imports, as esbuild's resolver sees them. */
export async function bareImports(entryPath: string): Promise<string[]> {
  const found: string[] = [];
  await build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    logLevel: 'silent',
    platform: 'browser',
    format: 'esm',
    plugins: [
      {
        name: 'record-bare',
        setup: (pluginBuild): void => {
          pluginBuild.onResolve({ filter: /.*/ }, (args) => {
            if (args.kind === 'entry-point' || NOT_BARE.test(args.path)) {
              return undefined;
            }
            found.push(args.path);
            return { path: args.path, external: true };
          });
        },
      },
    ],
  });
  return found;
}
