import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

/**
 * Keeps the e2e suite hermetic: the Satoshi web font is served by Fontshare's
 * CDN, which may be unreachable from CI/sandboxes. Those requests are answered
 * locally with an empty stylesheet so network policy can't cause console-error
 * failures; pages fall back to the self-hosted Inter font.
 */
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.route(/^https:\/\/(api|cdn)\.fontshare\.com\//, (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
    await provide(context);
  },
});
