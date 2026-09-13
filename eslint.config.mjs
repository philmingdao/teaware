import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Discourage raw anchor tags for internal navigation.
      // Using <a href="/..."> bypasses Next.js basePath - use <Link> from next/link instead.
      // This rule warns on patterns like: <a href="/" or <a href="/gallery"
      // External links (http://, https://, mailto:, tel:, #) are allowed.
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXElement[openingElement.name.name='a'][openingElement.attributes.length>0] > JSXOpeningElement > JSXAttribute[name.name='href'][value.type='Literal'][value.value=/^\\/(?!\\/)(?!#)/]",
          message: "Use next/link <Link> instead of <a href=\"/...\"> for internal navigation. Raw anchors bypass basePath on GitHub Pages."
        }
      ]
    }
  }
]);

export default eslintConfig;
