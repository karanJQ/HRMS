import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);

  // Counter animation
  const useCounter = (target, duration = 2000) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let start = null;
      const step = (timestamp) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      // Start after a delay for better effect
      const timer = setTimeout(() => {
        window.requestAnimationFrame(step);
      }, 600);
      return () => clearTimeout(timer);
    }, [target, duration]);
    return count;
  };

  const stat1 = useCounter(15);
  const stat2 = useCounter(10000);
  const stat3 = useCounter(99);
  const stat4 = useCounter(7);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Smooth nav highlight
  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    const handleScroll = () => {
      let current = '';
      sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 100) current = s.id;
      });
      navLinks.forEach(a => {
        if(a.getAttribute('href') === `#${current}`) {
          a.style.color = '#162660';
        } else {
          a.style.color = '#162660';
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live Audit Log Simulation
  const initialLogs = [
    { id: 1, time: '09:41', user: 'superadmin', what: 'logged in', detail: 'IP: 117.210.32.91 · Browser: Chrome 124', pill: 'login', pillText: 'LOGIN' },
    { id: 2, time: '09:44', user: 'hr_manager', what: 'updated employee record', detail: 'EMP00142 · Pay grade revised to Level-10', pill: 'edit', pillText: 'EDIT' },
    { id: 3, time: '10:02', user: 'hr_staff', what: 'created onboarding record', detail: 'New employee: EMP00287 · Revenue Dept.', pill: 'create', pillText: 'CREATE' },
    { id: 4, time: '10:18', user: 'dept_head', what: 'approved leave request', detail: 'EMP00093 · 5 days CL · 20–24 May 2025', pill: 'edit', pillText: 'APPROVE' },
    { id: 5, time: '10:31', user: 'superadmin', what: 'deleted test user', detail: 'USR_TEST_004 · Reason: Demo cleanup', pill: 'delete', pillText: 'DELETE' },
    { id: 6, time: '10:45', user: 'hr_manager', what: 'initiated APAR for FY 2024–25', detail: '14 employee records · Revenue Dept.', pill: 'create', pillText: 'INITIATE' },
  ].reverse(); // reverse so newest is at the top (idx 0)
  
  useEffect(() => {
    setLogs(initialLogs);
    
    const liveLogsData = [
      { id: 101, time: '10:52', user: 'employee', what: 'submitted leave application', detail: 'EMP00321 · 2 days EL · 22–23 May', pill: 'create', pillText: 'CREATE' },
      { id: 102, time: '11:03', user: 'hr_manager', what: 'processed payroll batch', detail: 'April 2025 · 284 records · ₹1.2Cr', pill: 'edit', pillText: 'PROCESS' },
      { id: 103, time: '11:17', user: 'dept_head', what: 'filled APAR report', detail: 'EMP00156 · FY 2024-25 · Rating: Outstanding', pill: 'edit', pillText: 'FILL' },
      { id: 104, time: '11:29', user: 'hr_staff', what: 'uploaded OCR document', detail: 'Joining order · EMP00289 · 7 fields extracted', pill: 'create', pillText: 'OCR' },
    ];
    let logIndex = 0;
    
    const interval = setInterval(() => {
      const newLog = { ...liveLogsData[logIndex % liveLogsData.length], id: Date.now() };
      setLogs(prev => [newLog, ...prev].slice(0, 8)); // keep top 8
      logIndex++;
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">
      {/* NAV */}
      <nav id="topnav" role="navigation" aria-label="Main navigation">
        <div className="nav-logo">
          <div className="nav-logo-icon">🏛️</div>
          <div className="nav-logo-text">
            JadeQuest HRMS
            <span>AI-Powered Platform</span>
          </div>
        </div>
        <ul className="nav-links" id="nav-links">
          <li><a href="#overview">Overview</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#ai">AI Engine</a></li>
          <li><a href="#dashboard">Analytics</a></li>
          <li><a href="#tech">Tech Stack</a></li>
        </ul>
        <div className="nav-cta">
          <button onClick={() => navigate('/login')} className="btn-demo" id="nav-demo-btn">Sign In / Demo</button>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" aria-label="Hero section">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>
        <div className="hero-orb1"></div>
        <div className="hero-orb2"></div>
        <div className="hero-content">
          <div className="hero-badge" id="hero-badge">
            <span className="dot"></span>
            EOI — Expression of Interest ·
          </div>
          <h1 className="hero-title" id="hero-title">
            The Future of<br/>
            <span className="grad">JadeQuest HR Management</span>
          </h1>
          <p className="hero-sub" id="hero-sub">
            A fully integrated, AI-powered HRMS platform purpose-built for state government departments — from biometric attendance to intelligent performance evaluation.
          </p>
          <div className="hero-actions" id="hero-actions">
            <button onClick={() => navigate('/login')} className="btn-demo btn-lg" id="hero-demo-btn">⚡ View Live Demo</button>
            <a href="#features" className="btn-outline btn-lg" id="hero-explore-btn">🔍 Explore Features</a>
          </div>
          <div className="hero-stats" id="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">{stat1.toLocaleString()}+</div>
              <div className="hero-stat-label">Government Modules</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">{stat2.toLocaleString()}+</div>
              <div className="hero-stat-label">Employees Supported</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">{stat3}%</div>
              <div className="hero-stat-label">% Uptime SLA</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">{stat4}</div>
              <div className="hero-stat-label">AI/ML Models Integrated</div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM OVERVIEW */}
      <section id="overview" aria-label="Platform overview">
        <div className="overview-grid">
          <div className="reveal">
            <div className="section-tag">Platform Overview</div>
            <h2 className="section-title">One Platform.<br/>All HR Operations.</h2>
            <div style={{marginTop:32, display:'flex', flexDirection:'column', gap:14}}>
              <div style={{display:'flex',gap:12,alignItems:'center',fontSize:14,color:'var(--muted)'}}>
                <span style={{width:28,height:28,borderRadius:8,background:'rgba(104, 170, 232,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✅</span>
                Fully operational demo platform — not just a presentation
              </div>
              <div style={{display:'flex',gap:12,alignItems:'center',fontSize:14,color:'var(--muted)'}}>
                <span style={{width:28,height:28,borderRadius:8,background:'rgba(22, 38, 96,.15)',display:'flex',alignItems:'center',justifyContent:'center',color:'#68aae8',flexShrink:0}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6" rx="1" ry="1"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg>
                </span>
                AI/ML models production-ready and actively integrated
              </div>
              <div style={{display:'flex',gap:12,alignItems:'center',fontSize:14,color:'var(--muted)'}}>
                <span style={{width:28,height:28,borderRadius:8,background:'rgba(16,185,129,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>🔐</span>
                Role-based access with full audit trail compliance
              </div>
              <div style={{display:'flex',gap:12,alignItems:'center',fontSize:14,color:'var(--muted)'}}>
                <span style={{width:28,height:28,borderRadius:8,background:'rgba(245,158,11,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>📊</span>
                Real-time analytics dashboards with drill-down reporting
              </div>
            </div>
          </div>
          <div className="overview-visual reveal">
            <div className="mock-dashboard" id="mock-dashboard-widget">
              <div className="dash-header">
                <div className="dash-title">HRMS Live Dashboard</div>
                <div className="dash-live">Live</div>
              </div>
              <div className="dash-stats">
                <div className="dash-stat-card blue">
                  <div className="label">Active Employees</div>
                  <div className="value">4,284</div>
                </div>
                <div className="dash-stat-card green">
                  <div className="label">Today's Attendance</div>
                  <div className="value">96.2%</div>
                </div>
                <div className="dash-stat-card amber">
                  <div className="label">Pending Payroll</div>
                  <div className="value">₹1.2Cr</div>
                </div>
                <div className="dash-stat-card purple">
                  <div className="label">Open Grievances</div>
                  <div className="value">7</div>
                </div>
              </div>
              <div className="dash-chart-bar">
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>Department Headcount</div>
                <div className="chart-rows">
                  <div className="chart-row">
                    <div className="chart-row-label">Revenue</div>
                    <div className="chart-bar-wrap"><div className="chart-bar-fill" style={{width:'82%',background:'linear-gradient(90deg,#68aae8,#68aae8)'}}></div></div>
                    <div className="chart-row-val">820</div>
                  </div>
                  <div className="chart-row">
                    <div className="chart-row-label">Health</div>
                    <div className="chart-bar-wrap"><div className="chart-bar-fill" style={{width:'65%',background:'linear-gradient(90deg,#162660,#68aae8)'}}></div></div>
                    <div className="chart-row-val">650</div>
                  </div>
                  <div className="chart-row">
                    <div className="chart-row-label">Education</div>
                    <div className="chart-bar-wrap"><div className="chart-bar-fill" style={{width:'74%',background:'linear-gradient(90deg,#0891b2,#06b6d4)'}}></div></div>
                    <div className="chart-row-val">740</div>
                  </div>
                  <div className="chart-row">
                    <div className="chart-row-label">Finance</div>
                    <div className="chart-bar-wrap"><div className="chart-bar-fill" style={{width:'47%',background:'linear-gradient(90deg,#059669,#10b981)'}}></div></div>
                    <div className="chart-row-val">470</div>
                  </div>
                </div>
              </div>
              <div className="dash-ai-chip">
                <div className="ai-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"></path></svg>
                </div>
                <div style={{fontSize:12}}>
                  <div style={{color:'#68aae8',fontWeight:600,marginBottom:2}}>AI Insight</div>
                  <div style={{color:'var(--muted)'}}>3 employees flagged for retirement planning within 90 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" aria-label="Platform features">
        <div className="features-inner">
          <div className="features-header reveal">
            <div className="section-tag">Core Modules</div>
            <h2 className="section-title">Complete Scope Coverage</h2>
            <p className="section-sub" style={{margin:'0 auto'}}>Every requirement of the EOI scope is implemented, tested, and available for live demonstration.</p>
          </div>
          <div className="features-grid">

            <div className="feature-card reveal" id="feature-attendance">
              <div className="feature-icon blue">📡</div>
              <h3>Attendance, Payroll & Leave Integration</h3>
              <p>Real-time biometric integration via API — attendance data auto-syncs with payroll computation, leave deductions, and salary disbursement workflows with zero manual intervention.</p>
              <div className="feature-tags">
                <span className="ftag">Biometric Sync</span>
                <span className="ftag">Auto Payroll</span>
                <span className="ftag">Leave Engine</span>
                <span className="ftag">OT Calculation</span>
              </div>
            </div>

            <div className="feature-card reveal" id="feature-servicebook">
              <div className="feature-icon cyan">📋</div>
              <h3>Digital Service Book Management</h3>
              <p>Complete electronic service record for every government employee — from joining to retirement. Captures all transfers, promotions, awards, penalties, and service history in tamper-proof digital format.</p>
              <div className="feature-tags">
                <span className="ftag">Tamper-proof</span>
                <span className="ftag">E-Signature</span>
                <span className="ftag">Full History</span>
                <span className="ftag">Export PDF</span>
              </div>
            </div>

            <div className="feature-card reveal" id="feature-ocr">
              <div className="feature-icon purple">🔍</div>
              <h3>AI OCR Document Digitization</h3>
              <p>Upload scanned documents — joining orders, caste certificates, degrees, pay slips — and our OCR pipeline automatically extracts, validates, and maps data fields with 95%+ accuracy using transformer-based models.</p>
              <div className="feature-tags">
                <span className="ftag">Tesseract OCR</span>
                <span className="ftag">NLP Extraction</span>
                <span className="ftag">95%+ Accuracy</span>
                <span className="ftag">Multi-format</span>
              </div>
            </div>

            <div className="feature-card reveal" id="feature-workflow">
              <div className="feature-icon green">⚙️</div>
              <h3>Task Management & Workflow Automation</h3>
              <p>BPMN-style workflow engine routes approvals — leave requests, transfer orders, increments, promotions — to the right authority with escalation, deadline tracking, and automated reminders.</p>
              <div className="feature-tags">
                <span className="ftag">Approval Chains</span>
                <span className="ftag">Escalation Rules</span>
                <span className="ftag">SLA Tracking</span>
                <span className="ftag">Email Alerts</span>
              </div>
            </div>

            <div className="feature-card reveal" id="feature-apar">
              <div className="feature-icon amber">⭐</div>
              <h3>AI Performance Evaluation & KPI Tracking</h3>
              <p>AI-driven APAR (Annual Performance Appraisal Report) with automated KPI benchmarking, peer comparison, anomaly detection in ratings, and bias-flag alerts for reviewers using ML classification models.</p>
              <div className="feature-tags">
                <span className="ftag">ML Classification</span>
                <span className="ftag">Bias Detection</span>
                <span className="ftag">360° Feedback</span>
                <span className="ftag">KPI Benchmarks</span>
              </div>
            </div>

            <div className="feature-card reveal" id="feature-analytics">
              <div className="feature-icon pink">📊</div>
              <h3>Analytics Dashboards & Reporting</h3>
              <p>Multi-level dashboards for Super Admin, HR Manager, and Department Head with real-time visualizations — attrition heatmaps, payroll trends, leave patterns, headcount forecasting, and export-ready MIS reports.</p>
              <div className="feature-tags">
                <span className="ftag">Recharts</span>
                <span className="ftag">Drill-down</span>
                <span className="ftag">PDF/Excel Export</span>
                <span className="ftag">Forecasting</span>
              </div>
            </div>

            <div className="feature-card reveal" id="feature-rbac" style={{gridColumn: 'span 1'}}>
              <div className="feature-icon teal">🔐</div>
              <h3>Role-Based Access & Audit Trails</h3>
              <p>Granular 5-tier RBAC — Super Admin, HR Manager, Dept Head, HR Staff, Employee — with immutable audit logs capturing every action: who did what, when, from where. Fully compliant with government data governance standards.</p>
              <div className="feature-tags">
                <span className="ftag">5-Tier RBAC</span>
                <span className="ftag">Immutable Logs</span>
                <span className="ftag">JWT Auth</span>
                <span className="ftag">IP Tracking</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* AI ENGINE */}
      <section id="ai" aria-label="AI and ML capabilities">
        <div className="ai-inner">
          <div className="ai-layout">
            <div>
              <div className="section-tag reveal">AI / ML Engine</div>
              <h2 className="section-title reveal">Not Just Software.<br/>An Intelligent System.</h2>
              <p className="section-sub reveal">Seven production-grade AI/ML capabilities are embedded directly into the platform workflows — not bolted on as afterthoughts.</p>
              <div className="ai-capabilities">
                <div className="ai-cap reveal" id="ai-cap-ocr">
                  <div className="ai-cap-icon">🧾</div>
                  <div>
                    <h4>Document OCR & Data Extraction</h4>
                    <p>Transformer-based OCR pipeline with NLP post-processing extracts structured data from scanned government documents, forms, and certificates with 95%+ field accuracy.</p>
                    <div className="ai-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#68aae8' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"></path></svg>
                      ML Active
                    </div>
                  </div>
                </div>
                <div className="ai-cap reveal" id="ai-cap-perf">
                  <div className="ai-cap-icon">📈</div>
                  <div>
                    <h4>Performance Anomaly & Bias Detection</h4>
                    <p>ML classifiers flag statistically anomalous APAR ratings and potential reviewer bias patterns using historical appraisal data across departments.</p>
                    <div className="ai-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#68aae8' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"></path></svg>
                      ML Active
                    </div>
                  </div>
                </div>
                <div className="ai-cap reveal" id="ai-cap-retire">
                  <div className="ai-cap-icon">🔮</div>
                  <div>
                    <h4>Predictive Retirement & Succession Planning</h4>
                    <p>Automated identification of employees approaching retirement with intelligent succession gap analysis and proactive HR alerts.</p>
                    <div className="ai-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#68aae8' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"></path></svg>
                      ML Active
                    </div>
                  </div>
                </div>
                <div className="ai-cap reveal" id="ai-cap-attrition">
                  <div className="ai-cap-icon">📉</div>
                  <div>
                    <h4>Attrition Risk & Workforce Forecasting</h4>
                    <p>Regression models predict department-level attrition risk and headcount needs based on transfer patterns, leave history, and role tenure.</p>
                    <div className="ai-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#68aae8' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"></path></svg>
                      ML Active
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="ai-right reveal">
              <div className="ocr-demo" id="ocr-demo-widget">
                <div className="ocr-title">🧾 AI OCR — Live Document Processing</div>
                <div className="ocr-doc">
                  <div className="ocr-doc-label">Uploaded: Joining_Order_2024.pdf</div>
                  <div className="ocr-field">
                    <div className="ocr-field-label">Employee Name</div>
                    <div className="ocr-field-value">Rajesh Kumar Patel</div>
                    <div className="ocr-confidence high">98%</div>
                  </div>
                  <div className="ocr-field">
                    <div className="ocr-field-label">Employee ID</div>
                    <div className="ocr-field-value">GUJ/REV/2024/04821</div>
                    <div className="ocr-confidence high">99%</div>
                  </div>
                  <div className="ocr-field">
                    <div className="ocr-field-label">Designation</div>
                    <div className="ocr-field-value">Deputy Collector</div>
                    <div className="ocr-confidence high">97%</div>
                  </div>
                  <div className="ocr-field">
                    <div className="ocr-field-label">Joining Date</div>
                    <div className="ocr-field-value">15-Apr-2024</div>
                    <div className="ocr-confidence high">99%</div>
                  </div>
                  <div className="ocr-field">
                    <div className="ocr-field-label">Department</div>
                    <div className="ocr-field-value">Revenue Department</div>
                    <div className="ocr-confidence med">89%</div>
                  </div>
                  <div className="ocr-field">
                    <div className="ocr-field-label">Pay Scale</div>
                    <div className="ocr-field-value">₹56,100 – ₹1,77,500</div>
                    <div className="ocr-confidence high">96%</div>
                  </div>
                </div>
                <div className="ocr-status">7 fields extracted · Auto-populated into Service Book · Awaiting HR verification</div>
                <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <div style={{background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.2)',color:'#34d399',fontSize:11,padding:'4px 12px',borderRadius:100}}>✓ Duplicate Check Passed</div>
                  <div style={{background:'rgba(104, 170, 232,.1)',border:'1px solid rgba(104, 170, 232,.2)',color:'#68aae8',fontSize:11,padding:'4px 12px',borderRadius:100}}>✓ Data Mapped to Profile</div>
                  <div style={{background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.2)',color:'#fbbf24',fontSize:11,padding:'4px 12px',borderRadius:100}}>⏳ Pending HR Approval</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section id="dashboard" aria-label="Analytics and reporting">
        <div className="dash-preview-inner">
          <div className="dash-preview-header reveal">
            <div className="section-tag">Analytics & Reporting</div>
            <h2 className="section-title">Real-Time Decision Intelligence</h2>
            <p className="section-sub" style={{margin:'0 auto'}}>Role-specific dashboards that surface the right data to the right people — from Secretary-level overviews to employee self-service.</p>
          </div>
          <div className="metrics-row reveal">
            <div className="metric-card" id="metric-employees">
              <div className="metric-icon">👥</div>
              <div className="metric-value" style={{color:'#68aae8'}}>4,284</div>
              <div className="metric-label">Total Employees</div>
              <div className="metric-change up">↑ 2.3% this quarter</div>
            </div>
            <div className="metric-card" id="metric-payroll">
              <div className="metric-icon">💰</div>
              <div className="metric-value" style={{color:'#34d399'}}>₹8.4Cr</div>
              <div className="metric-label">Monthly Payroll</div>
              <div className="metric-change up">↑ 1.1% vs last month</div>
            </div>
            <div className="metric-card" id="metric-leave">
              <div className="metric-icon">📅</div>
              <div className="metric-value" style={{color:'#fbbf24'}}>127</div>
              <div className="metric-label">Pending Leave Requests</div>
              <div className="metric-change down">↓ 8 from yesterday</div>
            </div>
            <div className="metric-card" id="metric-grievance">
              <div className="metric-icon">⚠️</div>
              <div className="metric-value" style={{color:'#f87171'}}>7</div>
              <div className="metric-label">Open Grievances</div>
              <div className="metric-change up">↓ 3 resolved today</div>
            </div>
          </div>
          <div className="charts-row reveal">
            <div className="chart-widget" id="chart-attendance-trend">
              <div className="chart-widget-title">Monthly Attendance Rate <span>Apr 2024 – Mar 2025</span></div>
              <div className="bar-chart">
                <div className="bar-wrap"><div className="bar" style={{height:'78%',background:'linear-gradient(0deg,#68aae8,#68aae8)'}}></div><div className="bar-label">Apr</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'83%',background:'linear-gradient(0deg,#68aae8,#68aae8)'}}></div><div className="bar-label">May</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'74%',background:'linear-gradient(0deg,#68aae8,#68aae8)'}}></div><div className="bar-label">Jun</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'88%',background:'linear-gradient(0deg,#68aae8,#68aae8)'}}></div><div className="bar-label">Jul</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'91%',background:'linear-gradient(0deg,#68aae8,#68aae8)'}}></div><div className="bar-label">Aug</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'85%',background:'linear-gradient(0deg,#162660,#68aae8)'}}></div><div className="bar-label">Sep</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'80%',background:'linear-gradient(0deg,#162660,#68aae8)'}}></div><div className="bar-label">Oct</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'93%',background:'linear-gradient(0deg,#162660,#68aae8)'}}></div><div className="bar-label">Nov</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'88%',background:'linear-gradient(0deg,#059669,#10b981)'}}></div><div className="bar-label">Dec</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'76%',background:'linear-gradient(0deg,#059669,#10b981)'}}></div><div className="bar-label">Jan</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'92%',background:'linear-gradient(0deg,#059669,#10b981)'}}></div><div className="bar-label">Feb</div></div>
                <div className="bar-wrap"><div className="bar" style={{height:'96%',background:'linear-gradient(0deg,#f59e0b,#fbbf24)'}}></div><div className="bar-label">Mar</div></div>
              </div>
            </div>
            <div className="chart-widget" id="chart-department-mix">
              <div className="chart-widget-title">Department Distribution <span>Live</span></div>
              <div className="donut-wrap">
                <div className="donut" id="donut-chart"></div>
                <div className="donut-labels">
                  <div className="donut-label"><div className="donut-dot" style={{background:'#68aae8'}}></div><div className="donut-label-text">Revenue</div><div className="donut-label-pct" style={{color:'#68aae8'}}>42%</div></div>
                  <div className="donut-label"><div className="donut-dot" style={{background:'#162660'}}></div><div className="donut-label-text">Education</div><div className="donut-label-pct" style={{color:'#68aae8'}}>26%</div></div>
                  <div className="donut-label"><div className="donut-dot" style={{background:'#10b981'}}></div><div className="donut-label-text">Health</div><div className="donut-label-pct" style={{color:'#34d399'}}>13%</div></div>
                  <div className="donut-label"><div className="donut-dot" style={{background:'#f59e0b'}}></div><div className="donut-label-text">Others</div><div className="donut-label-pct" style={{color:'#fbbf24'}}>19%</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROLES & AUDIT */}
      <section id="roles" aria-label="Role-based access and audit">
        <div className="roles-inner">
          <div className="roles-layout">
            <div>
              <div className="section-tag reveal">Access Control</div>
              <h2 className="section-title reveal">5-Tier Role Architecture</h2>
              <p className="section-sub reveal">Every user sees only what they need. Every action is logged permanently.</p>
              <div className="roles-list">
                <div className="role-item reveal" id="role-sa">
                  <div className="role-badge sa">Super Admin</div>
                  <div className="role-desc"><strong>Full system control</strong> — manage users, configure workflows, view all departments, access audit logs and system settings.</div>
                </div>
                <div className="role-item reveal" id="role-hm">
                  <div className="role-badge hm">HR Manager</div>
                  <div className="role-desc"><strong>HR operations</strong> — manage employees, process payroll, handle transfers, promotions, and approve APAR records across all departments.</div>
                </div>
                <div className="role-item reveal" id="role-dh">
                  <div className="role-badge dh">Dept Head</div>
                  <div className="role-desc"><strong>Departmental view</strong> — review employee attendance, leave requests, initiate transfer nominations, fill APAR reports for subordinates.</div>
                </div>
                <div className="role-item reveal" id="role-hs">
                  <div className="role-badge hs">HR Staff</div>
                  <div className="role-desc"><strong>Data entry & support</strong> — onboard employees, update service book, manage payroll inputs, handle grievance registration.</div>
                </div>
                <div className="role-item reveal" id="role-em">
                  <div className="role-badge em">Employee</div>
                  <div className="role-desc"><strong>Self-service portal</strong> — view payslips, apply for leave, check attendance, view APAR results, raise grievances, access training records.</div>
                </div>
              </div>
            </div>
            <div className="reveal">
              <div className="audit-card" id="audit-log-widget">
                <div className="audit-title">🔍 System Audit Log — Live Feed</div>
                <div className="audit-log" id="audit-log-container">
                  {logs.map((log) => (
                    <div key={log.id} className="audit-entry" style={log.id > 6 ? {background: 'rgba(104, 170, 232,.05)'} : {}}>
                      <div className="audit-time">{log.time}</div>
                      <div className="audit-action">
                        <div><span className="user">{log.user}</span> <span className="what">{log.what}</span></div>
                        <div className="detail">{log.detail}</div>
                      </div>
                      <div className={`audit-pill ${log.pill}`}>{log.pillText}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section id="tech" aria-label="Technology stack">
        <div className="tech-inner">
          <div className="reveal">
            <div className="section-tag">Technology Stack</div>
            <h2 className="section-title">Built on Modern, Proven Technologies</h2>
            <p className="section-sub" style={{margin:'0 auto'}}>Open standards. No vendor lock-in. Deployable on Government Cloud (GI Cloud / NIC) or on-premise.</p>
          </div>
          <div className="tech-grid reveal">
            <div className="tech-chip"><span className="chip-icon">⚛️</span> React 18</div>
            <div className="tech-chip"><span className="chip-icon">🟢</span> Node.js</div>
            <div className="tech-chip"><span className="chip-icon">🐘</span> PostgreSQL</div>
            <div className="tech-chip"><span className="chip-icon">🐍</span> Python (AI/ML)</div>
            <div className="tech-chip"><span className="chip-icon">🤗</span> HuggingFace Transformers</div>
            <div className="tech-chip"><span className="chip-icon">📄</span> Tesseract OCR</div>
            <div className="tech-chip"><span className="chip-icon">⚡</span> Vite + TailwindCSS</div>
            <div className="tech-chip"><span className="chip-icon">🔗</span> REST API</div>
            <div className="tech-chip"><span className="chip-icon">🔐</span> JWT Auth</div>
            <div className="tech-chip"><span className="chip-icon">📦</span> Docker</div>
            <div className="tech-chip"><span className="chip-icon">☁️</span> GI Cloud Ready</div>
            <div className="tech-chip"><span className="chip-icon">🛡️</span> OWASP Compliant</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" aria-label="Request a demo">
        <div className="cta-inner">
          <div className="section-tag" style={{justifyContent:'center'}}>Ready to Evaluate</div>
          <h2>See the Platform in Action</h2>
          <p>This is a working demo — not a deck. Our team is ready to walk your technical committee through every module live, including the AI/ML capabilities.</p>
          <div className="cta-actions">
            <button onClick={() => navigate('/login')} className="btn-lg btn-primary-lg" id="cta-email-btn">📧 Request Live Demo</button>
            <a href="tel:+919999999999" className="btn-lg btn-ghost-lg" id="cta-call-btn">📞 Schedule a Call</a>
          </div>
          <div style={{marginTop:48, display:'flex', justifyContent:'center', gap:48, flexWrap:'wrap'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:800,background:'linear-gradient(135deg,#68aae8,#68aae8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>15+</div>
              <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>Modules Delivered</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:800,background:'linear-gradient(135deg,#68aae8,#68aae8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>7</div>
              <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>AI/ML Models Integrated</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:800,background:'linear-gradient(135deg,#68aae8,#68aae8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>100%</div>
              <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>EOI Scope Covered</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:800,background:'linear-gradient(135deg,#68aae8,#68aae8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Ready</div>
              <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>Working Demo Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-left">
          <div className="nav-logo-icon">🏛️</div>
          <div className="footer-text">JadeQuest HRMS Platform · EOI Demonstration · Confidential</div>
        </div>
        <div className="footer-links">
          <a href="#overview">Overview</a>
          <a href="#features">Features</a>
          <a href="#ai">AI Engine</a>
          <a href="#cta">Contact</a>
        </div>
      </footer>
    </div>
  );
}
