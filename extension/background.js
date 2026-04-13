/**
 * background.js - HyrAI Proctoring Guard v1.1
 * Detects duplicated (mirrored), extended, and external displays.
 * Uses chrome.system.display.getInfo() which operates at the hardware driver level.
 * This is the ONLY reliable way to detect "Duplicate" mode displays.
 */

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_DISPLAY_SECURITY") {
    chrome.system.display.getInfo((displayInfo) => {
      let isMirrored = false;
      let hasExternal = false;
      const physicalMonitors = displayInfo.length;

      // Log for debugging (visible in chrome://extensions > service worker > Inspect)
      console.log("[HyrAI Guard] Raw display info:", JSON.stringify(displayInfo, null, 2));

      displayInfo.forEach((display) => {
        // mirroringSourceId is non-empty when this screen mirrors another
        if (display.mirroringSourceId && display.mirroringSourceId !== "") {
          isMirrored = true;
        }
        // isInternal is false for HDMI/DisplayPort/USB-C connected monitors
        if (!display.isInternal) {
          hasExternal = true;
        }
      });

      const response = {
        success: true,
        displayCount: physicalMonitors,
        isMirrored: isMirrored,
        hasExternal: hasExternal,
        displays: displayInfo.map(d => ({
          id: d.id,
          name: d.name || "Unknown",
          isPrimary: d.isPrimary || false,
          isInternal: d.isInternal || false,
          mirroringSourceId: d.mirroringSourceId || "",
          bounds: d.bounds || {}
        }))
      };

      console.log("[HyrAI Guard] Sending response:", JSON.stringify(response, null, 2));
      sendResponse(response);
    });
    return true; // Keep message channel open for async response
  }

  if (request.type === "PING") {
    sendResponse({ alive: true, version: "1.1" });
  }
});

console.log("[HyrAI Guard] Service worker loaded and listening.");
