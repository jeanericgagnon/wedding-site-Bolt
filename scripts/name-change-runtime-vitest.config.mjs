export default {
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'local-copies/**'],
    setupFiles: ['src/test/setup.ts'],
  },
};
