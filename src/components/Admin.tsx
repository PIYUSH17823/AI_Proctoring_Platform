import { useEffect, useState } from "react";
import "./Admin.css";

interface Session {
  session_id: string;
  candidate_name: string;
  status: string;
  logs: { timestamp: number; type: string }[];
  video_path: string | null;
}

interface InterviewAssignment {
  id: string;
  candidate_name: string;
  candidate_email: string;
  job_type: string;
  status: string;
  link: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState<"monitor" | "invite" | "jobs">("monitor");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [invites, setInvites] = useState<InterviewAssignment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Form States
  const [formData, setFormData] = useState({ name: "", email: "", jobId: "" });
  const [jobFormData, setJobFormData] = useState({ title: "", description: "" });
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "monitor") {
        const res = await fetch("http://127.0.0.1:8000/api/sessions");
        const data = await res.json();
        setSessions(data.reverse());
      } else if (activeTab === "invite") {
        const resInv = await fetch("http://127.0.0.1:8000/api/admin/interviews");
        const dataInv = await resInv.json();
        setInvites(dataInv.reverse());
        
        const resJobs = await fetch("http://127.0.0.1:8000/api/admin/jobs");
        const dataJobs = await resJobs.json();
        setJobs(dataJobs);
        if (dataJobs.length > 0 && !formData.jobId) setFormData(prev => ({...prev, jobId: dataJobs[0].id}));
      } else if (activeTab === "jobs") {
        const res = await fetch("http://127.0.0.1:8000/api/admin/jobs");
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (activeTab === "monitor") {
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobFormData)
      });
      if (res.ok) {
        setJobFormData({ title: "", description: "" });
        fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setIsCreating(false); }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await fetch(`http://127.0.0.1:8000/api/admin/jobs/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jobId) return alert("Please create a job first!");
    setIsCreating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/interviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           candidate_name: formData.name,
           candidate_email: formData.email,
           job_id: formData.jobId
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Invitation created and email sent!");
        setFormData({ name: "", email: "", jobId: jobs[0]?.id || "" });
        fetchData();
      } else {
        alert(`Failed: ${data.detail || "Unknown error"}`);
      }
    } catch (err) {
      alert("Failed to create invitation");
    } finally {
      setIsCreating(false);
    }
  };

  const totalViolations = sessions.reduce((acc, curr) => acc + curr.logs.length, 0);

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Control Center</h1>
          <div className="tab-switcher">
            <button className={activeTab === 'monitor' ? 'active' : ''} onClick={() => setActiveTab('monitor')}>Monitoring</button>
            <button className={activeTab === 'jobs' ? 'active' : ''} onClick={() => setActiveTab('jobs')}>Job Manager</button>
            <button className={activeTab === 'invite' ? 'active' : ''} onClick={() => setActiveTab('invite')}>Invitations</button>
          </div>
        </div>
        <button className="action-btn" onClick={fetchData} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {activeTab === "monitor" ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Sessions</div>
              <div className="stat-value">{sessions.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Violations</div>
              <div className="stat-value" style={{ color: '#f87171' }}>{totalViolations}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Monitors</div>
              <div className="stat-value" style={{ color: '#34d399' }}>AI Core 1.5</div>
            </div>
          </div>

          <div className="sessions-table-wrapper">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Session ID</th>
                  <th>Status</th>
                  <th>Violations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.session_id}>
                    <td style={{ fontWeight: 600 }}>{session.candidate_name}</td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{session.session_id}</td>
                    <td>
                      <span className={`status-pill status-${session.status}`}>
                        {session.status}
                      </span>
                    </td>
                    <td>
                      <span className={session.logs.length > 0 ? "violation-tag" : ""}>
                        {session.logs.length} flags
                      </span>
                    </td>
                    <td>
                      <button 
                        className="action-btn" 
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                        onClick={() => setSelectedSession(session)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === "jobs" ? (
        <div className="invitations-layout">
           <div className="invite-form-card">
              <h3>Define New Job Role</h3>
              <form onSubmit={handleCreateJob}>
                 <div className="form-group">
                    <label>Job Title</label>
                    <input type="text" required value={jobFormData.title} onChange={(e) => setJobFormData({...jobFormData, title: e.target.value})} placeholder="e.g. Backend Developer" />
                 </div>
                 <div className="form-group">
                    <label>Job Description</label>
                    <textarea 
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: 'white', padding: '0.75rem', minHeight: '120px' }}
                        required value={jobFormData.description} onChange={(e) => setJobFormData({...jobFormData, description: e.target.value})} 
                        placeholder="Detailed role requirements..."
                    />
                 </div>
                 <button type="submit" className="action-btn primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isCreating}>
                    Save Job Role
                 </button>
              </form>
           </div>

           <div className="sessions-table-wrapper" style={{ marginTop: '2rem' }}>
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Description Preview</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ fontWeight: 600 }}>{job.title}</td>
                      <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{job.description.substring(0, 100)}...</td>
                      <td>
                        <button className="delete-btn" onClick={() => handleDeleteJob(job.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      ) : (
        <div className="invitations-layout">
           <div className="invite-form-card">
              <h3>Invite Candidate to Job</h3>
              <form onSubmit={handleCreateInvite}>
                 <div className="form-group">
                    <label>Candidate Name</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                 </div>
                 <div className="form-group">
                    <label>Candidate Email</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                 </div>
                 <div className="form-group">
                    <label>Assign to Job</label>
                    <select value={formData.jobId} onChange={(e) => setFormData({...formData, jobId: e.target.value})} required>
                        <option value="">Select a job...</option>
                        {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                 </div>
                 <button type="submit" className="action-btn primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isCreating}>
                    {isCreating ? "Sending Invitation..." : "Issue Invitation"}
                 </button>
              </form>
           </div>
           
           <div className="sessions-table-wrapper">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Invite Link</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td>{invite.candidate_name}</td>
                    <td>{invite.job_type}</td>
                    <td>{invite.status}</td>
                    <td style={{ fontSize: '0.7rem', color: '#3b82f6' }}>{invite.link}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
