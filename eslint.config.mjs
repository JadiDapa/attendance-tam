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
    // Prisma client is generated code, not ours to lint.
    "generated/**",
  ]),
  {
    // shadcn/ui primitives are managed by the shadcn CLI, not edited by hand.
    files: ["components/ui/**"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    // Only services touch the Prisma client (CLAUDE.md "Server-side layers");
    // actions, components, scripts and the `lib/` modules that need DB data go
    // through `servers/services/`. Kept before the `lib/**` block: flat config
    // replaces (not merges) a rule's options, so that block wins for rule modules.
    files: ["**/*.{ts,tsx,mts}"],
    ignores: ["servers/services/**", "servers/test/**", "lib/prisma.ts", "prisma/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/prisma", "**/lib/prisma"],
              message: "Only servers/services/ use the Prisma client: add or call a service method.",
            },
          ],
        },
      ],
    },
  },
  {
    // Every `lib/` module is a Prisma-free rule module by default: pure
    // input → output, usable from client components and testable by Vitest
    // without a DB. The ignore list is the closed set of modules that are
    // allowed to reach Prisma/Clerk/services; growing it is a deliberate choice.
    files: ["lib/**/*.ts"],
    ignores: [
      "lib/api-auth.ts",
      "lib/approval.ts",
      "lib/attendance-days.ts",
      "lib/attendance.ts",
      "lib/daily-recap.ts",
      "lib/employee-profile.ts",
      "lib/face-recognition.ts",
      "lib/field-assignment.ts",
      "lib/leave.ts",
      "lib/monthly-report-xlsx.ts",
      "lib/overtime.ts",
      "lib/prisma.ts",
      "lib/role.ts",
      "lib/session.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/prisma",
                "./prisma",
                "@/generated/**",
                "**/generated/**",
                "@prisma/*",
                "@/servers/**",
                "@/lib/session",
                "./session",
                "@clerk/*",
              ],
              message:
                "Rule modules stay Prisma/DB/Clerk-free: take data as plain arguments instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
