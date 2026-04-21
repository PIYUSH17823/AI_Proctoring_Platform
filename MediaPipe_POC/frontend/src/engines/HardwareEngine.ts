export interface HardwareStatus {
  monitorCount: number;
  isExtended: boolean;
  isTabVisible: boolean;
  isWindowFocused: boolean;
}

export class HardwareEngine {
  private status: HardwareStatus = {
    monitorCount: 1,
    isExtended: false,
    isTabVisible: true,
    isWindowFocused: true,
  };

  private callbacks: ((status: HardwareStatus) => void)[] = [];

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    // 1. Tab Visibility (Tab switching)
    document.addEventListener("visibilitychange", () => {
      this.status.isTabVisible = document.visibilityState === "visible";
      this.notify();
    });

    // 2. Window Focus (Clicking outside browser)
    window.addEventListener("blur", () => {
      this.status.isWindowFocused = false;
      this.notify();
    });

    window.addEventListener("focus", () => {
      this.status.isWindowFocused = true;
      this.notify();
    });

    // 3. Monitor Count (Initial check)
    if (typeof window !== "undefined" && window.screen) {
      this.status.isExtended = !!(window.screen as any).isExtended;
    }
  }

  async auditMonitors(): Promise<HardwareStatus> {
    // Attempt modern Multi-Screen API if available
    try {
      if ("getScreenDetails" in window) {
        const details = await (window as any).getScreenDetails();
        this.status.monitorCount = details.screens.length;
        this.status.isExtended = details.screens.length > 1;
      } else {
        // Fallback to simple check
        this.status.isExtended = !!(window.screen as any).isExtended;
      }
    } catch (e) {
      console.warn("Monitor audit permission denied or unsupported");
    }
    
    this.notify();
    return this.status;
  }

  subscribe(callback: (status: HardwareStatus) => void) {
    this.callbacks.push(callback);
    callback(this.status);
  }

  private notify() {
    this.callbacks.forEach(cb => cb({ ...this.status }));
  }
}
