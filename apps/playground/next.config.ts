import { withCms } from '@linkcharsoft/cms/next'

export default withCms({
  // The E2E suite builds the English panel next to the Spanish one.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactStrictMode: true,
  reactCompiler: true,
  // Same prelude as the template: proves it doesn't break the package's own .sass files.
  sassOptions: {
    additionalData: `
      @use "@/styles/mixins.sass" as mixins;
    `
  }
})
