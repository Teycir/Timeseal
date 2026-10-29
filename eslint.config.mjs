import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", ".open-next/**", "node_modules/**", "playwright-report/**", "test-results/**"],
  },
  {
    rules: {
      "@next/next/no-img-element": "warn",
    },
  },
];

export default config;
