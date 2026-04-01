import { join } from "node:path";
//"shared.ts" is a dependency for both "savedata.ts" and "tts.ts"
const files = ["savedata.ts","tts.ts"].map(file => join(import.meta.dir, file));
async function build() {
    const result = await Bun.build({
      entrypoints: files,
      outdir: './dist',
      target: 'bun'
    });
  return result;
}
build().then(result => {
  console.log(result);
});
