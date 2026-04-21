import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FaceEngine, type DetectionResults } from './engines/FaceEngine';
import { ObjectEngine, type ObjectDetectionResults } from './engines/ObjectEngine';
import { EmotionEngine, type EmotionResults } from './engines/EmotionEngine';
import { HardwareEngine, type HardwareStatus } from './engines/HardwareEngine';

const BACKEND_URL = 'http://localhost:8000';

interface AuditLog {
  id: string;
  type: string;
  message: string;
  time: string;
  severity: 'low' | 'high';
}

interface Incident {
  id: string;
  label: string;
  severity: 'critical' | 'warning' | 'info';
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceEngineRef = useRef<FaceEngine | null>(null);
  const objectEngineRef = useRef<ObjectEngine | null>(null);
  const emotionEngineRef = useRef<EmotionEngine | null>(null);
  const hardwareEngineRef = useRef<HardwareEngine | null>(null);

  const [faceResults, setFaceResults] = useState<DetectionResults | null>(null);
  const [objectResults, setObjectResults] = useState<ObjectDetectionResults | null>(null);
  const [emotionResults, setEmotionResults] = useState<EmotionResults | null>(null);
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const addLog = (type: string, message: string, severity: 'low' | 'high' = 'low') => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      time: new Date().toLocaleTimeString(),
      severity
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  useEffect(() => {
    const init = async () => {
      addLog("SYSTEM", "Initializing Neural Engines...", "low");
      try {
        const res = await axios.post(`${BACKEND_URL}/api/poc/session/start`, {
          candidate_name: "Audit Candidate",
          assessment_id: "POC-NEURAL-01"
        });
        setSessionId(res.data.session_id);
      } catch (err) {
        addLog("SYSTEM", "Backend unavailable - Offline mode active", "high");
      }

      const faceEngine = new FaceEngine();
      const objectEngine = new ObjectEngine();
      const emotionEngine = new EmotionEngine();
      const hardwareEngine = new HardwareEngine();

      try {
        await Promise.all([faceEngine.initialize(), objectEngine.initialize()]);
        faceEngineRef.current = faceEngine;
        objectEngineRef.current = objectEngine;
        emotionEngineRef.current = emotionEngine;
        hardwareEngineRef.current = hardwareEngine;
        
        hardwareEngine.subscribe(status => {
          setHardwareStatus(status);
        });

        setIsReady(true);
        addLog("SYSTEM", "Neural & Hardware Engines Synchronized", "low");
      } catch (err: any) {
        addLog("SYSTEM", `Engine failure: ${err.message || "Unknown error"}`, "high");
      }

      if (videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: false
          });
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        } catch (err) {
          addLog("SYSTEM", "Camera access denied", "high");
        }
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!faceEngineRef.current || !objectEngineRef.current || !videoRef.current || !emotionEngineRef.current) return;

    let requestRef: number;
    let lastLogTime = 0;

    const loop = () => {
      if (videoRef.current && faceEngineRef.current && objectEngineRef.current && emotionEngineRef.current && isReady) {
        if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
          requestRef = requestAnimationFrame(loop);
          return;
        }

        try {
          const timestamp = performance.now();
          const face = faceEngineRef.current.detect(videoRef.current, timestamp);
          const objects = objectEngineRef.current.detect(videoRef.current, timestamp);
          
          // Contextual Suppression (Drinking Water)
          const isDrinking = objects.detectedItems.some(item => ["bottle", "cup", "wine glass"].includes(item));
          const emotions = emotionEngineRef.current.process(face.rawBlendshapes, isDrinking);

          setFaceResults(face);
          setObjectResults(objects);
          setEmotionResults({ ...emotions });

          // Instant Multi-Violation Tracking
          const newIncidents: Incident[] = [];
          if (objects.isProhibited) {
            newIncidents.push({ id: 'obj', label: objects.message, severity: 'critical' });
          }
          if (face.isAlert && !isDrinking) {
            newIncidents.push({ id: 'face', label: face.message, severity: 'warning' });
          }
          if (emotions.isTalking && !isDrinking) {
            newIncidents.push({ id: 'talk', label: 'TALKING DETECTED', severity: 'warning' });
          }
          if (isDrinking) {
            newIncidents.push({ id: 'env', label: 'INTAKE MODE', severity: 'info' });
          }
          
          // Phase 4: Hardware Checks
          if (hardwareStatus && !hardwareStatus.isTabVisible) {
            newIncidents.push({ id: 'tab', label: 'TAB SWITCH DETECTED', severity: 'critical' });
          }
          if (hardwareStatus && !hardwareStatus.isWindowFocused) {
            newIncidents.push({ id: 'focus', label: 'WINDOW FOCUS LOST', severity: 'warning' });
          }
          if (hardwareStatus && hardwareStatus.isExtended) {
            newIncidents.push({ id: 'mon', label: 'SECONDARY MONITOR DETECTED', severity: 'warning' });
          }

          setActiveIncidents(newIncidents);

          // Throttled Persistence Logging
          const isSignificant = newIncidents.some(i => i.severity !== 'info');
          if (isSignificant && timestamp - lastLogTime > 4000) {
            const topIncident = newIncidents.find(i => i.severity === 'critical') || newIncidents[0];
            const msg = newIncidents.length > 1 ? `MULTIPLE: ${newIncidents.map(i => i.label).join(' + ')}` : topIncident.label;
            
            addLog("VIOLATION", msg, topIncident.severity === 'critical' ? 'high' : 'low');
            if (sessionId) {
              axios.post(`${BACKEND_URL}/api/poc/log`, {
                session_id: sessionId,
                type: "NEURAL_AUDIT",
                details: msg
              }).catch(() => { });
            }
            lastLogTime = timestamp;
          }
        } catch (err: any) {
          if (!err.message.includes("ROI")) {
             addLog("CRASH", `Loop failure: ${err.message}`, "high");
             return;
          }
        }
      }
      requestRef = requestAnimationFrame(loop);
    };

    requestRef = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef);
  }, [sessionId, isReady]);

  const hasCritical = activeIncidents.some(i => i.severity === 'critical');
  const isLocked = activeIncidents.some(i => i.id === 'tab');

  const startScreenAudit = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
      });
      
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings() as any;
      
      // Verification: Did they share the ENTIRE screen?
      if (settings.displaySurface !== "monitor") {
        addLog("SECURITY", "BLOCK: Entire Screen sharing is mandatory.", "high");
        track.stop();
        return;
      }

      addLog("SECURITY", "Screen Audit Verified: Full Desktop Active", "low");
      // In a real app, we would pipe this stream to the backend
    } catch (err) {
      addLog("SECURITY", "Screen Audit Denied", "high");
    }
  };

  return (
    <>
      {/* Security Lockout Overlay */}
      {isLocked && (
        <div className="lockout-overlay">
          <div className="lockout-content">
            <h1 style={{ color: 'var(--danger)', fontSize: '2.5rem' }}>SECURITY BREACH</h1>
            <p>You have navigated away from the exam environment.</p>
            <p style={{ opacity: 0.7 }}>Return to this tab immediately to restore access.</p>
            <div className="pulse-circle" />
          </div>
        </div>
      )}

      <aside className="audit-sidebar">
        <div className="audit-header">
          <div className={`dot ${sessionId ? 'dot-active' : 'dot-alert'}`} />
          Neural Audit Stream
        </div>

        {auditLogs.map(log => (
          <div key={log.id} className="audit-event" style={{ borderColor: log.severity === 'high' ? 'var(--danger)' : 'var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', opacity: 0.6, fontSize: '0.7rem' }}>
              <span>{log.type}</span>
              <span>{log.time}</span>
            </div>
            <div style={{ color: log.severity === 'high' ? 'var(--danger)' : 'var(--text-main)' }}>
              {log.message}
            </div>
          </div>
        ))}
      </aside>

      <main className="main-viewport">
        <div className={`video-feed-container ${hasCritical ? 'hull-breach' : ''}`}>
          <video ref={videoRef} playsInline muted />
          
          {/* Instant Incident Rail */}
          <div className="overlay-status">
            {activeIncidents.length === 0 && (
              <div className="incident-chip chip-info" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                <div className="dot dot-active" style={{ width: 8, height: 8 }} />
                SYSTEM SECURE
              </div>
            )}
            {activeIncidents.map(incident => (
              <div key={incident.id} className={`incident-chip chip-${incident.severity}`}>
                {incident.severity === 'critical' ? '🛑' : (incident.severity === 'warning' ? '⚠️' : 'ℹ️')}
                {incident.label}
              </div>
            ))}
          </div>
        </div>

        <div className="telemetry-grid">
          <div className="telemetry-card">
            <div className="telemetry-label">Eyeball Precision (L)</div>
            <div className="telemetry-value">{(faceResults?.iris.left.x || 0.5).toFixed(2)}</div>
          </div>
          <div className="telemetry-card">
            <div className="telemetry-label">Behavioral State</div>
            <div className="telemetry-value" style={{ 
              fontSize: '0.9rem', 
              color: emotionResults?.isSuppressed ? 'var(--info)' : (emotionResults?.isTalking ? 'var(--danger)' : 'var(--accent-primary)') 
            }}>
              {emotionResults?.isSuppressed ? "🥤 Intake Mode" : (emotionResults?.state || "Calibrating...")}
            </div>
          </div>
          <div className="telemetry-card">
             <div className="telemetry-label">Anomaly Score</div>
             <div className="telemetry-value" style={{ color: (emotionResults?.anomalyScore || 0) > 40 ? 'var(--danger)' : 'var(--accent-primary)' }}>
               {emotionResults?.anomalyScore || 0}%
             </div>
          </div>
          <div className="telemetry-card">
            <div className="telemetry-label">Hardware Logic</div>
            <div className="telemetry-value" style={{ 
              fontSize: '0.8rem', 
              color: (hardwareStatus?.monitorCount || 1) > 1 ? 'var(--danger)' : 'var(--success)' 
            }}>
              {hardwareStatus?.monitorCount || 1} Monitor(s) { (hardwareStatus?.monitorCount || 1) > 1 ? '⚠️' : '✅' }
            </div>
          </div>
        </div>

        <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 100 }}>
          <button className="audit-btn" onClick={startScreenAudit}>
            START SCREEN AUDIT
          </button>
        </div>
      </main>
    </>
  );
}

export default App;
