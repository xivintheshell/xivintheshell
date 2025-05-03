import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  ssr: false,
  // pre-rendering is not possible because of many localStorage accesses
} satisfies Config;
