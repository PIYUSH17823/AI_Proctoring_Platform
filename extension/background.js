/**
 * background.js - HyrAI Proctoring Guard
 * Listens for external messages from the HyrAI web app to report hardware display info.
 */

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_DISPLAY_SECURITY") {
    // We use chrome.system.display to get actual hardware configuration
    chrome.system.display.getInfo((displayInfo) => {
      let isMirrored = false;
      const physicalMonitors = displayInfo.length;

      displayInfo.forEach((display) => {
        // If mirroringSourceId is non-empty, this screen is a mirror of another
        if (display.mirroringSourceId) {
          isMirrored = true;
        }
      });

      sendResponse({
        success: true,
        displayCount: physicalMonitors,
        isMirrored: isMirrored,
        displays: displayInfo.map(d => ({
          id: d.id,
          name: d.name,
          isPrimary: d.isPrimary,
          isInternal: d.isInternal
        }))
      });
    });
    return true; // Keep message channel open for async response
  }
});
