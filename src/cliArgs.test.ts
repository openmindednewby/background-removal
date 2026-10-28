import { parseAssetArgs } from './cliArgs';

describe('parseAssetArgs', () => {
  it('with only an output folder, uses the default base path and writes no urls file', () => {
    const args = parseAssetArgs(['public']);

    expect(args).toEqual({ outDir: 'public', basePath: '/bg-removal/', urlsFile: undefined });
  });

  it('with a base path and a urls file, reads both', () => {
    const args = parseAssetArgs(['--base-path', '/cutout/', 'public', '--urls-file', 'src/bgRemovalUrls.json']);

    expect(args).toEqual({ outDir: 'public', basePath: '/cutout/', urlsFile: 'src/bgRemovalUrls.json' });
  });

  it('with no output folder, throws the usage line', () => {
    const parse = (): unknown => parseAssetArgs(['--base-path', '/x/']);

    expect(parse).toThrow('usage: bg-removal-assets');
  });

  it('with a flag missing its value, throws naming the flag', () => {
    const parse = (): unknown => parseAssetArgs(['public', '--urls-file']);

    expect(parse).toThrow('--urls-file needs a value');
  });

  it('with a flag followed by another flag, throws naming the first flag', () => {
    const parse = (): unknown => parseAssetArgs(['public', '--base-path', '--urls-file', 'u.json']);

    expect(parse).toThrow('--base-path needs a value');
  });

  it('with an unknown flag, throws naming it', () => {
    const parse = (): unknown => parseAssetArgs(['public', '--force']);

    expect(parse).toThrow('unexpected argument --force');
  });

  it('with a second output folder, throws naming it', () => {
    const parse = (): unknown => parseAssetArgs(['public', 'dist']);

    expect(parse).toThrow('unexpected argument dist');
  });
});
