const prettier = process.env.PRETTIER_BIN || 'prettier';

export default {
  '*.{js,cjs,mjs,jsx,ts,tsx,json,jsonc,css,md,yml,yaml,html}': `${prettier} --write --ignore-unknown`,
};
