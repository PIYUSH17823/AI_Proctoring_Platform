import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PreCheck.css";

// 1. Fix TypeScript 'chrome' property error
declare global {
  interface Window {
    chrome: any;
  }
}

// IMPORTANT: Replace this with the ID from chrome://extensions after loading
const CHROME_EXTENSION_ID = "kmocgnickobghnainokjfiplkjmagech";

interface DisplayInfo {
  displayCount: number;
  isMirrored: boolean;
  success: boolean;
  displays: {
    id: string;
    isInternal: boolean;
    isPrimary: boolean;
    name?: string;
  }[];
}

const PreCheck = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const [permissions, setPermissions] = useState({ camera: false, mic: false });
  const [micVolume, setMicVolume] = useState(0);
  const [networkSpeed, setNetworkSpeed] = useState<{ speedMbps: number; status: "testing" | "pass" | "fail" }>({
    speedMbps: 0,
    status: "testing"
  });
  
  const [noiseStatus, setNoiseStatus] = useState<"testing" | "pass" | "fail">("testing");
  const volumeHistoryRef = useRef<number[]>([]);

  const [displayStatus, setDisplayStatus] = useState<"pending" | "pass" | "fail">("pending");
  const [displayMsg, setDisplayMsg] = useState("Click 'Authorize System' to test");
  const [extensionStatus, setExtensionStatus] = useState<"not_found" | "checking" | "found" | "not_supported">("checking");

  const [isReady, setIsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState("");

  // 1. Check if Chrome Extension is present (Polling every 2s)
  useEffect(() => {
    if (!window.chrome || !window.chrome.runtime) {
      setExtensionStatus("not_supported");
      return;
    }

    const checkExtension = () => {
      try {
        window.chrome.runtime.sendMessage(CHROME_EXTENSION_ID, { type: "GET_DISPLAY_SECURITY" }, (response: DisplayInfo) => {
          if (window.chrome.runtime.lastError) {
            console.error("HyrAI Extension Connection Failed:", window.chrome.runtime.lastError.message);
            setExtensionStatus("not_found");
          } else {
            console.log("HyrAI Extension Verified Successfully.");
            setExtensionStatus("found");
          }
        });
      } catch (err) {
        console.error("Extension sendMessage exception:", err);
        setExtensionStatus("not_found");
      }
    };

    checkExtension();
    const interval = setInterval(checkExtension, 2000);
    return () => clearInterval(interval);
  }, []);

  // 2. Network Test (Averaged over 3 fetches)
  useEffect(() => {
    let active = true;
    const testNetwork = async () => {
      let totalSpeed = 0;
      const iterations = 3;
      
      for (let i = 0; i < iterations; i++) {
        if (!active) return;
        try {
          const startTime = performance.now();
          const response = await fetch("https://httpbin.org/bytes/100000"); // 100kb payload
          await response.blob();
          const endTime = performance.now();
          
          const durationSeconds = (endTime - startTime) / 1000;
          const bitsLoaded = 100000 * 8;
          const speedMbps = (bitsLoaded / durationSeconds) / (1024 * 1024);
          totalSpeed += speedMbps;
        } catch (e) {
          if (active) setNetworkSpeed({ speedMbps: 0, status: "fail" });
          return;
        }
      }
      
      if (active) {
        const avgSpeed = totalSpeed / iterations;
        setNetworkSpeed({
          speedMbps: parseFloat(avgSpeed.toFixed(2)),
          status: avgSpeed >= 0.5 ? "pass" : "fail" 
        });
      }
    };
    testNetwork();
    return () => { active = false; };
  }, []);

  // 3. Camera, Mic & Background Noise
  useEffect(() => {
    let stream: MediaStream | null = null;

    const setupMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });

        setPermissions({ camera: true, mic: true });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        audioContextRef.current = new window.AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const percentage = Math.min(100, Math.round((average / 255) * 100 * 2));
          setMicVolume(percentage);

          volumeHistoryRef.current.push(percentage);
          if (volumeHistoryRef.current.length > 120) { 
             volumeHistoryRef.current.shift();
             const avgNoise = volumeHistoryRef.current.reduce((a, b) => a + b, 0) / 120;
             setNoiseStatus(avgNoise > 35 ? "fail" : "pass");
          }

          animationRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

      } catch (err: any) {
        setPermissions({ camera: false, mic: false });
        setErrorMsg("Failed to access Camera or Microphone.");
      }
    };

    setupMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 4. Advanced Heuristic Hardware Audit
  const handleAuthorizeSetup = async (e: React.PointerEvent) => {
    const inputType = e.pointerType; 
    
    try {
      if (!window.isSecureContext) {
        setDisplayStatus("fail");
        setDisplayMsg("Environment not secure.");
        return;
      }

      // Step A: Peripheral Handshake Heuristic (Audio Outputs)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputDevices = devices.filter(d => d.kind === 'audiooutput');
      
      const suspiciousKeywords = ["hdmi", "displayport", "samsung", "lg", "dell", "tv", "monitor", "projector", "pnp"];
      const externalAudio = outputDevices.find(d => 
        suspiciousKeywords.some(key => d.label.toLowerCase().includes(key))
      );

      if (externalAudio) {
        setDisplayStatus("fail");
        setDisplayMsg(`External peripheral detected: ${externalAudio.label}. Please unplug HDMI/DP.`);
        return;
      }

      // Step B: Resolution Profiling
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      
      // Standard duplicated projector or low-res monitor flags
      const isLowRes = screenWidth <= 1366 && screenHeight <= 768; // Common mirroring sink target
      if (isLowRes && window.devicePixelRatio < 2) {
         setDisplayStatus("fail");
         setDisplayMsg("Low resolution detected. This is typical of mirrored displays.");
         return;
      }

      // Step C: Web API Check (Extended Monitors)
      try {
        const permName = "window-management" as PermissionName;
        const permission = await navigator.permissions.query({ name: permName }).catch(() => 
           navigator.permissions.query({ name: "window-placement" as PermissionName })
        );

        if (permission.state === 'denied') {
          setDisplayStatus("fail");
          setDisplayMsg("Allow 'Window Management' to verify hardware.");
          return;
        }

        // @ts-ignore
        if ("getScreenDetails" in window) {
          // @ts-ignore
          const details = await window.getScreenDetails();
          const screen = details.screens[0];
          
          if (details.screens.length > 1) {
            setDisplayStatus("fail");
            setDisplayMsg("Multiple displays detected.");
            return;
          }

          // Check for Non-Internal Label Heuristic
          const internalKeywords = ["internal", "built-in", "laptop", "integrated"];
          const isGenericLabel = !internalKeywords.some(key => screen.label.toLowerCase().includes(key));
          
          if (!screen.isInternal || isGenericLabel) {
             setDisplayStatus("fail");
             setDisplayMsg(`Non-internal display found: ${screen.label}`);
             return;
          }
        }
      } catch (err) {
        console.warn("Web API Check failed, relying on Extension", err);
      }

      // Step D: Extension Hardware Audit
      if (extensionStatus !== "found") {
        setDisplayStatus("fail");
        setDisplayMsg("Security Extension not active.");
        return;
      }

      window.chrome.runtime.sendMessage(CHROME_EXTENSION_ID, { type: "GET_DISPLAY_SECURITY" }, (response: DisplayInfo) => {
        if (!response || !response.success) {
          setDisplayStatus("fail");
          setDisplayMsg("Could not verify hardware.");
          return;
        }

        const hasExternal = response.displays.some(d => !d.isInternal);
        
        if (response.isMirrored) {
          setDisplayStatus("fail");
          setDisplayMsg("Duplicated/Mirrored display detected.");
        } else if (response.displayCount > 1 || hasExternal) {
          setDisplayStatus("fail");
          setDisplayMsg("External hardware detected. Use laptop screen only.");
        } else {
          setDisplayStatus("pass");
          setDisplayMsg(`Hardware Verified. Mode: ${inputType}`);
        }
      });

    } catch (err) {
      setDisplayStatus("fail");
      setDisplayMsg("Display check failed.");
    }
  };

  useEffect(() => {
    if (
        permissions.camera && 
        permissions.mic && 
        networkSpeed.status === "pass" && 
        noiseStatus !== "fail" &&
        displayStatus === "pass" &&
        candidateName.trim() !== ""
    ) {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [permissions, networkSpeed, noiseStatus, displayStatus, candidateName]);

  return (
    <div className="precheck-container">
      <div className="precheck-card">
        <h1>Proctoring Validation</h1>
        <p className="subtitle">Strict hardware-level security audit in progress.</p>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        <div className="candidate-input">
          <label>Candidate Legal Name</label>
          <input 
            type="text" 
            value={candidateName} 
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div className="check-grid">
          <div className="video-preview-wrapper">
            <video ref={videoRef} autoPlay playsInline muted className="preview-video" />
            <div className={`status-badge ${permissions.camera ? 'pass' : 'fail'}`}>
              {permissions.camera ? '✓ Camera Active' : '✗ Camera Blocked'}
            </div>
            
            <div className="display-auth-overlay">
                <button 
                  className={`auth-btn ${displayStatus !== 'pending' ? displayStatus : ''}`}
                  onPointerDown={handleAuthorizeSetup}
                >
                   {displayStatus === 'pending' ? 'Authorize Hardware Guard' : displayMsg}
                </button>
            </div>
          </div>

          <div className="metrics-column">
            <div className="metric-box">
              <div className="metric-header">
                <h3>Audio Environment</h3>
                <span className={`status ${permissions.mic ? 'pass' : 'fail'}`}>
                   {permissions.mic ? 'Mic Ready' : 'Mic Blocked'}
                </span>
              </div>
              <div className="volume-bar-track">
                <div className="volume-bar-fill" style={{ width: `${micVolume}%`, backgroundColor: micVolume > 80 ? '#f59e0b' : '#10b981' }} />
              </div>
              <div className="sub-metric">
                 <span className="info-text">Background Level:</span>
                 <span className={`status-small ${noiseStatus}`}>
                    {noiseStatus === 'testing' ? 'Analyzing...' : noiseStatus === 'pass' ? 'Low' : 'High'}
                 </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <h3>Hardware Extension</h3>
                <span className={`status ${extensionStatus === 'found' ? 'pass' : 'fail'}`}>
                  {extensionStatus === 'found' ? 'Active' : 'Missing'}
                </span>
              </div>
              <p className="extension-help">
                {extensionStatus === 'not_found' && "Mirroring detection required. Ensure extension is loaded."}
                {extensionStatus === 'found' && "Extension verified. Ready for hardware scan."}
              </p>
            </div>

            <div className="metric-box">
              <div className="metric-header">
                <h3>Network Avg</h3>
                <span className={`status ${networkSpeed.status}`}>
                  {networkSpeed.status === 'testing' ? 'Checking...' : networkSpeed.status === 'pass' ? 'Good' : 'Poor'}
                </span>
              </div>
              <p className="sub-metric-info">{networkSpeed.speedMbps} Mbps detected</p>
            </div>
          </div>
        </div>

        <div className="action-row">
          <button 
            className={`btn-primary ${!isReady ? 'disabled' : ''}`}
            disabled={!isReady}
            onClick={async () => {
               try { await document.documentElement.requestFullscreen(); } catch (e) {}
               navigate('/interview', { state: { candidateName } });
            }}
          >
            Enter Secure Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreCheck;
