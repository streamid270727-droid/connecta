import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Prettier
      "prettier/prettier": "warn",

      // TypeScript rules — tightened
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/ban-ts-comment": ["warn", { "ts-expect-error": "allow-with-description" }],
      "@typescript-eslint/prefer-as-const": "warn",
      "@typescript-eslint/no-unused-disable-directive": "warn",

      // React rules — keep some strictness
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "warn",
      "react/display-name": "warn",
      "react/prop-types": "off",
      "react-compiler/react-compiler": "off",

      // Next.js rules
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "off",

      // General JavaScript rules — tightened
      "prefer-const": "warn",
      "no-unused-vars": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "no-empty": "warn",
      "no-irregular-whitespace": "warn",
      "no-case-declarations": "warn",
      "no-fallthrough": "warn",
      "no-mixed-spaces-and-tabs": "warn",
      "no-redeclare": "warn",
      "no-undef": "off",
      "no-unreachable": "warn",
      "no-useless-escape": "warn",
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills"],
  },
];

export default eslintConfig;
