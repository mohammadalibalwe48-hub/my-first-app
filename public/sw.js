/* Push-only worker: never cache authenticated pages or API responses. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data?.json() || {};
      } catch {
        /* Show a safe fallback. */
      }
      const url =
        typeof data.url === "string" &&
        data.url.startsWith("/admin") &&
        !data.url.startsWith("//")
          ? data.url
          : "/admin";
      await self.registration.showNotification(
        data.title || "SYRIAN QR · طلب جديد",
        {
          body: data.body || "افتح لوحة الإدارة لمراجعة الطلبات.",
          tag: data.tag || "order-update",
          icon: "https://xgkpoxyirycravtxfyes.supabase.co/storage/v1/object/public/syrianqr-site-assets/1790820314871-b5118f17-bb8e-41b3-99b2-49873f88a180-FDC86B7B-9BCD-46EB-A120-9D5D9E286960.png",
          badge: "https://xgkpoxyirycravtxfyes.supabase.co/storage/v1/object/public/syrianqr-site-assets/1790820314871-b5118f17-bb8e-41b3-99b2-49873f88a180-FDC86B7B-9BCD-46EB-A120-9D5D9E286960.png",
          data: { url },
          dir: "rtl",
          lang: "ar",
          requireInteraction: true,
        },
      );
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const target = new URL(
        event.notification.data?.url || "/admin",
        self.location.origin,
      );
      if (
        target.origin !== self.location.origin ||
        !target.pathname.startsWith("/admin")
      )
        return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (
          new URL(client.url).origin === target.origin &&
          new URL(client.url).pathname.startsWith("/admin")
        ) {
          await client.navigate(target.href);
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
