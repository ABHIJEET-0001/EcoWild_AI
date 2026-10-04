import React, { useState, useEffect } from 'react';
import {
  Home, Activity, Map, AlertTriangle, BrainCircuit, BarChart2, Camera, Settings,
  Radio, ShieldAlert, ChevronRight, PlayCircle, Navigation, Wind, Droplets,
  Zap, Menu, X, Eye, Cpu, Wifi, Target, ArrowRight, Volume2, Sun, Moon,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/$/, '');

// ─── Animal Emoji ──────────────────────────────────────────────────────────
const animalEmoji = (species: string) => {
  const s = (species || '').toLowerCase();
  if (s.includes('elephant')) return '🐘';
  if (s.includes('leopard') || s.includes('panther')) return '🐆';
  if (s.includes('boar')) return '🐗';
  if (s.includes('cow') || s.includes('nilgai')) return '🐄';
  if (s.includes('monkey')) return '🐒';
  if (s.includes('sambar')) return '🦌';
  return '🦌';
};

// ─── Risk Gauge (semicircle) ──────────────────────────────────────────────
function RiskGauge({ value, size = 200 }: { value: number; size?: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const half = circ / 2;
  const fill = (value / 100) * half;
  const color = value > 75 ? '#E11D48' : value > 45 ? '#F59E0B' : '#2D5A4E';
  const label = value > 75 ? 'HIGH' : value > 45 ? 'MODERATE' : 'LOW';
  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size / 1.5} viewBox="0 0 100 60">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${fill} ${half}`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.6s' }} />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-4xl font-black leading-none" style={{ color }}>{value}%</span>
        <span className="text-[10px] font-black tracking-[0.2em] uppercase mt-1" style={{ color }}>{label} RISK</span>
      </div>
    </div>
  );
}

// ─── Small Risk Gauge ─────────────────────────────────────────────────────
function SmallRiskGauge({ value }: { value: number }) {
  const color = value > 75 ? '#E11D48' : value > 45 ? '#F59E0B' : '#2D5A4E';
  const r = 16;
  const circ = 2 * Math.PI * r;
  const half = circ / 2;
  const fill = (value / 100) * half;
  return (
    <div className="relative flex flex-col items-center">
      <svg width={52} height={34} viewBox="0 0 52 34">
        <path d="M 6 28 A 20 20 0 0 1 46 28" fill="none" stroke="var(--border)" strokeWidth="5" strokeLinecap="round" />
        <path d="M 6 28 A 20 20 0 0 1 46 28" fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={`${fill} ${half}`} />
      </svg>
      <span className="absolute bottom-0 text-[10px] font-black" style={{ color }}>{value}%</span>
    </div>
  );
}

// ─── Road Pulse data ─────────────────────────────────────────────────────
const roadPulseData = [
  { t: '00', v: 1 }, { t: '03', v: 2 }, { t: '06', v: 5 }, { t: '09', v: 8 },
  { t: '12', v: 4 }, { t: '15', v: 6 }, { t: '18', v: 18 }, { t: '19', v: 26 },
  { t: '20', v: 31 }, { t: '21', v: 22 }, { t: '22', v: 14 }, { t: '23', v: 7 },
];

// ─── Hourly Activity ──────────────────────────────────────────────────────
const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  h: `${String(i).padStart(2, '0')}`,
  detections: i >= 18 && i <= 21 ? Math.floor(Math.random() * 15 + 10) : Math.floor(Math.random() * 5 + 1),
}));

// ─── Types ────────────────────────────────────────────────────────────────
interface CameraObj { id: string; zone: string; status: string; risk_level: string; image?: string; night_vision?: boolean; sensitivity?: number; location?: string }
interface Detection { id: string | number; animal: string; cam_id: string; risk_level: string; distance_m: number; confidence?: number; timestamp?: string; location?: string }
interface AlertObj { id: string | number; animal: string; cam_id: string; location: string; urgency: string; distance_m: number; time_to_collision_sec: number; signage_message: string; recommended_speed?: number; timestamp?: string; confidence?: number }

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [activeView, setActiveView] = useState('command');
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('ecowild-theme') === 'dark'; } catch { return false; }
  });

  // Scroll to top on view change
  const mainRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeView]);

  // Persist dark mode
  useEffect(() => {
    try { localStorage.setItem('ecowild-theme', darkMode ? 'dark' : 'light'); } catch { /* noop */ }
  }, [darkMode]);

  // Data
  const [cameras, setCameras] = useState<CameraObj[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [alerts, setAlerts] = useState<AlertObj[]>([]);

  // What-If state (lifted to App so IntelligenceView can receive)
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [wiSpeed, setWiSpeed] = useState(80);
  const [wiDist, setWiDist] = useState(45);
  const [wiVis, setWiVis] = useState('day');
  const [wiMovement, setWiMovement] = useState('medium');
  const [isSimulating, setIsSimulating] = useState(false);

  const [liveCounters, setLiveCounters] = useState({ cameras: 24, detections: 248, highRisk: 37, alerted: 1842, hotspots: 12 });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [cRes, dRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/cameras`),
          fetch(`${API_BASE}/detections`),
          fetch(`${API_BASE}/alerts`),
        ]);
        if (cRes.ok) {
          const data = await cRes.json();
          setCameras(data.map((c: CameraObj) => ({
            ...c,
            image: `/cctv_${c.zone?.toLowerCase().includes('elephant') ? 'elephant' : c.zone?.toLowerCase().includes('leopard') ? 'leopard' : 'deer'}.jpg`
          })));
        }
        if (dRes.ok) setDetections(await dRes.json());
        if (aRes.ok) setAlerts(await aRes.json());
      } catch { /* offline */ }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 4000);
    return () => clearInterval(interval);
  }, []);

  const displayCameras: CameraObj[] = cameras.length > 0 ? cameras : [
    { id: 'CAM-04', zone: 'Zone 4 - Elephant Migration Corridor', location: 'NH-44 Critical Gap KM 89', status: 'Online', risk_level: 'CRITICAL', image: '/cctv_elephant.jpg', night_vision: true, sensitivity: 96 },
    { id: 'CAM-02', zone: 'Zone 2 - Dense Forest Canopy', location: 'NH-44 Forest Buffer KM 58', status: 'Online', risk_level: 'HIGH', image: '/cctv_deer.jpg', night_vision: true, sensitivity: 92 },
    { id: 'CAM-05', zone: 'Zone 5 - Rocky Escarpment', location: 'NH-44 Hillock S-Bend KM 97', status: 'Online', risk_level: 'HIGH', image: '/cctv_leopard.jpg', night_vision: true, sensitivity: 94 },
    { id: 'CAM-06', zone: 'Zone 6 - Deer Grazing Plains', location: 'NH-44 Open Grassland KM 112', status: 'Online', risk_level: 'MEDIUM', image: '/cctv_deer.jpg', night_vision: true, sensitivity: 90 },
  ];

  const displayDetections: Detection[] = detections.length > 0 ? detections : [
    { id: 'EW-2048', animal: 'Asian Elephant', cam_id: 'CAM-04', risk_level: 'CRITICAL', distance_m: 14.5, confidence: 96, timestamp: '23:42:10', location: 'Zone 4' },
    { id: 'EW-2047', animal: 'Spotted Deer Herd', cam_id: 'CAM-02', risk_level: 'HIGH', distance_m: 6.8, confidence: 94, timestamp: '23:38:45', location: 'Zone 2' },
    { id: 'EW-2046', animal: 'Indian Leopard', cam_id: 'CAM-05', risk_level: 'HIGH', distance_m: 11.2, confidence: 91, timestamp: '23:25:12', location: 'Zone 5' },
  ];

  const displayAlerts: AlertObj[] = alerts.length > 0 ? alerts : [
    { id: 'ALT-704', animal: 'Asian Elephant', cam_id: 'CAM-04', location: 'KM 89 — Sector 4 Barrier', urgency: 'CRITICAL', distance_m: 14.5, time_to_collision_sec: 3.4, recommended_speed: 30, signage_message: '⚠️ CRITICAL: ELEPHANT AT CARRIAGEWAY KM 89 — SLOW TO 30 KM/H', timestamp: '23:42:10', confidence: 96 },
  ];

  // ─── Demo Sequence ────────────────────────────────────────────────────────
  const triggerDemo = async () => {
    if (demoActive) return;
    setDemoActive(true);
    setDemoStep(1);
    setShowBoundingBox(false);
    try {
      await fetch(`${API_BASE}/detections/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animal: 'Asian Elephant', cam_id: 'CAM-04', risk_level: 'CRITICAL', distance_m: 14.5, vehicle_speed_kmh: 88 })
      });
    } catch { /* offline */ }
    setTimeout(() => { setDemoStep(2); setShowBoundingBox(true); }, 800);
    setTimeout(() => { setDemoStep(3); }, 1800);
    setTimeout(() => { setDemoStep(4); setActiveView('alerts'); }, 3200);
    setTimeout(() => { setDemoStep(5); setActiveView('command'); setLiveCounters(p => ({ ...p, detections: p.detections + 1, highRisk: p.highRisk + 1, alerted: p.alerted + 1 })); }, 5500);
    setTimeout(() => { setDemoStep(6); }, 6500);
    setTimeout(() => { setDemoActive(false); setDemoStep(0); setShowBoundingBox(false); }, 9000);
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string; icon: any; label: string }) => {
    const isActive = activeView === id;
    return (
      <button
        onClick={() => { setActiveView(id); setMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] rounded-lg transition-all duration-200 ${isActive ? 'bg-forest-green text-white shadow-sm' : 'hover:bg-[var(--surface-sunken)]'}`}
        style={!isActive ? { color: 'var(--text-2)' } : {}}
      >
        <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
        <span className="font-bold tracking-[0.12em] uppercase">{label}</span>
        {isActive && <ChevronRight size={12} className="ml-auto opacity-60" />}
      </button>
    );
  };

  return (
    <div className={`flex text-[var(--text-1)] font-sans selection:bg-moss-green/20 selection:text-forest-green ${darkMode ? 'dark' : ''}`}
      style={{ minHeight: '100vh', backgroundColor: 'var(--surface)', color: 'var(--text-1)' }}>
      {/* Mobile hamburger */}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-[60] p-2.5 rounded-xl shadow-premium border border-[var(--border)]" style={{ backgroundColor: "var(--card-bg)" }} aria-label="Toggle navigation">
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-60 border-r transition-colors duration-300"
            style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <SidebarContent NavItem={NavItem} />
          </div>
        </div>
      )}

      {/* Desktop sidebar — fixed, full height */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 border-r z-40 transition-colors duration-300"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(20px)' }}>
        <SidebarContent NavItem={NavItem} />
      </aside>

      {/* Main scrollable area — offset by sidebar width */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <PageHeader triggerDemo={triggerDemo} demoActive={demoActive} demoStep={demoStep} darkMode={darkMode} setDarkMode={setDarkMode} />

        <div ref={mainRef} className="flex-1 px-5 lg:px-8 pb-12 overflow-y-auto">
          {activeView === 'command' && (
            <CommandView
              displayCameras={displayCameras} displayDetections={displayDetections}
              displayAlerts={displayAlerts} liveCounters={liveCounters}
              setSelectedIncident={setSelectedIncident} showBoundingBox={showBoundingBox} demoStep={demoStep}
            />
          )}
          {activeView === 'network' && <NetworkView displayCameras={displayCameras} displayDetections={displayDetections} />}
          {activeView === 'risk' && <RiskMapView />}
          {activeView === 'alerts' && <AlertView displayAlerts={displayAlerts} />}
          {activeView === 'intelligence' && (
            <IntelligenceView
              wiSpeed={wiSpeed} setWiSpeed={setWiSpeed}
              wiDist={wiDist} setWiDist={setWiDist}
              wiVis={wiVis} setWiVis={setWiVis}
              wiMovement={wiMovement} setWiMovement={setWiMovement}
              whatIfResult={whatIfResult} setWhatIfResult={setWhatIfResult}
              isSimulating={isSimulating} setIsSimulating={setIsSimulating}
            />
          )}
          {activeView === 'impact' && <ImpactView />}
          {activeView === 'cameras' && (
            <CameraWallView displayCameras={displayCameras} setSelectedIncident={setSelectedIncident} showBoundingBox={showBoundingBox} demoStep={demoStep} />
          )}
          {activeView === 'system' && <SystemView />}
        </div>
      </div>

      {/* Incident drawer — above everything */}
      {selectedIncident && <IncidentDrawer incident={selectedIncident} onClose={() => setSelectedIncident(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════════════════
function SidebarContent({ NavItem }: { NavItem: any }) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-6 px-1 pt-2">
        <div className="w-9 h-9 rounded-xl bg-forest-green flex items-center justify-center text-white shadow-sm shrink-0">
          <span className="text-sm font-black tracking-tighter">EW</span>
        </div>
        <div>
          <h1 className="text-base font-black tracking-tighter leading-none" style={{ color: 'var(--text-1)' }}>EcoWild</h1>
          <p className="text-[8px] font-bold text-moss-green uppercase tracking-[0.25em]">INTELLIGENCE</p>
        </div>
      </div>
      <p className="text-[8px] font-bold uppercase tracking-[0.25em] mb-2 px-1" style={{ color: 'var(--text-3)' }}>Navigation</p>
      <nav className="space-y-0.5 flex-1">
        <NavItem id="command" icon={Home} label="Command Center" />
        <NavItem id="network" icon={Radio} label="Live Network" />
        <NavItem id="risk" icon={Map} label="Risk Map" />
        <NavItem id="alerts" icon={AlertTriangle} label="Driver Alert" />
        <NavItem id="intelligence" icon={BrainCircuit} label="AI Intelligence" />
        <NavItem id="impact" icon={BarChart2} label="Impact" />
        <NavItem id="cameras" icon={Camera} label="Cameras" />
        <NavItem id="system" icon={Settings} label="System" />
      </nav>
      <div className="mt-4 px-3 py-2.5 rounded-lg flex items-center gap-2.5"
        style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border)' }}>
        <div className="relative shrink-0">
          <div className="w-2 h-2 rounded-full bg-moss-green"></div>
          <div className="absolute inset-0 rounded-full bg-moss-green animate-ping opacity-75"></div>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-forest-green">Network Online</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE HEADER
// ══════════════════════════════════════════════════════════════════════════════
function PageHeader({ triggerDemo, demoActive, demoStep, darkMode, setDarkMode }: { triggerDemo: () => void; demoActive: boolean; demoStep: number; darkMode: boolean; setDarkMode: (v: boolean) => void }) {
  const steps = ['', 'Camera detecting…', 'AI analysing…', 'Risk calculated', 'Driver alerted', 'Map updated', 'Insight generated'];
  return (
    <header className="flex justify-between items-start px-5 lg:px-8 py-5 border-b sticky top-0 z-30 shrink-0 transition-colors duration-300"
      style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(16px)' }}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full bg-moss-green"></div>
            <div className="absolute inset-0 rounded-full bg-moss-green animate-ping opacity-80"></div>
          </div>
          <span className="text-[9px] font-black tracking-[0.35em] uppercase text-moss-green">All Systems Operational</span>
        </div>
        <h2 className="text-[9px] font-bold tracking-[0.3em] text-forest-green uppercase mb-0.5">ECO WILD</h2>
        <h1 className="text-xl font-black tracking-tight leading-none" style={{ color: 'var(--text-1)' }}>INTELLIGENCE FOR SAFER HIGHWAYS</h1>
      </div>
      <div className="flex items-center gap-3">
        {demoActive && demoStep > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{steps[demoStep]}</span>
          </div>
        )}
        {/* Dark / Light toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all border shadow-soft hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button onClick={triggerDemo} disabled={demoActive}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black tracking-wider uppercase transition-all shadow-sm ${demoActive ? 'bg-amber-warning text-white cursor-not-allowed' : 'bg-forest-green text-white hover:bg-moss-green hover:shadow-md'}`}>
          <PlayCircle size={14} className={demoActive ? 'animate-spin' : ''} />
          {demoActive ? 'Live Demo' : 'Start Live Demo'}
        </button>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMAND CENTER VIEW
// ══════════════════════════════════════════════════════════════════════════════
function CommandView({ displayDetections, displayAlerts, liveCounters, setSelectedIncident, showBoundingBox: _showBoundingBox, demoStep: _demoStep }: any) {
  const activeAlert = displayAlerts[0];
  const isCritical = activeAlert?.urgency === 'CRITICAL';
  const [collisionRisk, setCollisionRisk] = useState<any>(null);

  const camNodes = [
    { id: 'CAM-01', x: 8, y: 52, critical: false },
    { id: 'CAM-02', x: 22, y: 42, critical: false },
    { id: 'CAM-03', x: 38, y: 50, critical: false },
    { id: 'CAM-04', x: 54, y: 42, critical: true },
    { id: 'CAM-05', x: 70, y: 50, critical: true },
    { id: 'CAM-06', x: 88, y: 44, critical: false },
  ];

  useEffect(() => {
    if (!activeAlert) return;
    const fetchRisk = async () => {
      try {
        const res = await fetch(`${API_BASE}/collision-risk`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animal: activeAlert.animal, distance_m: activeAlert.distance_m, vehicle_speed_kmh: 88, time_of_day: 'night', animal_size: 'large' })
        });
        if (res.ok) setCollisionRisk(await res.json());
      } catch {
        setCollisionRisk({ risk_pct: 94, is_stoppable: false, recommended_speed_kmh: 30, time_to_impact_sec: 3.4 });
      }
    };
    fetchRisk();
  }, [activeAlert?.animal, activeAlert?.distance_m]);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500 pt-5">
      {/* Intelligence Strip */}
      <div className="relative rounded-2xl border shadow-soft overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-forest-green via-moss-green to-transparent"></div>
        <div className="flex items-stretch divide-x overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Camera Network', value: liveCounters.cameras, suffix: ' ONLINE', color: 'text-charcoal', icon: Camera },
            { label: 'AI Detections', value: liveCounters.detections, suffix: ' TODAY', color: 'text-forest-green', icon: Eye },
            { label: 'High-Risk Events', value: liveCounters.highRisk, suffix: '', color: 'text-amber-warning', icon: AlertTriangle },
            { label: 'Drivers Alerted', value: liveCounters.alerted, suffix: '', color: 'text-charcoal', icon: Navigation },
            { label: 'Hotspots', value: liveCounters.hotspots, suffix: ' ACTIVE', color: 'text-forest-green', icon: Target },
          ].map((item, i) => (
            <div key={i} className="flex-1 min-w-[140px] p-4 group relative" style={{ borderColor: 'var(--border)' }}>
              {i < 4 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                  <div className="w-5 h-5 rounded-full border flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                    <ArrowRight size={8} className="text-moss-green" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-moss-green/20 animate-ping"></div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={12} style={{ color: 'var(--text-3)' }} />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>{item.label}</p>
              </div>
              <p className={`text-2xl font-black ${item.color} tabular-nums`}>{item.value.toLocaleString()}{item.suffix}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t flex items-center justify-between" style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>SEE → UNDERSTAND → ALERT → PREVENT</span>
          <span className="text-[9px] font-bold font-mono" style={{ color: 'var(--text-3)' }}>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Highway Map */}
        <div className="lg:col-span-2 relative h-[340px] lg:h-[420px] bg-[#EEE9E0] rounded-2xl overflow-hidden border border-[var(--border)] shadow-soft">
          <svg viewBox="0 0 900 420" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="heatRed" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E11D48" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatAmber" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
              <filter id="blur4"><feGaussianBlur stdDeviation="4" /></filter>
            </defs>
            <rect width="900" height="420" fill="#E4DFD5" />
            <rect y="0" width="900" height="160" fill="#C8D9C0" opacity="0.5" />
            <rect y="260" width="900" height="160" fill="#C8D9C0" opacity="0.5" />
            <ellipse cx="100" cy="120" rx="80" ry="50" fill="#A8C5A0" opacity="0.4" />
            <ellipse cx="350" cy="80" rx="100" ry="55" fill="#96B88E" opacity="0.35" />
            <ellipse cx="650" cy="100" rx="90" ry="50" fill="#A8C5A0" opacity="0.35" />
            <ellipse cx="820" cy="130" rx="70" ry="45" fill="#96B88E" opacity="0.3" />
            <ellipse cx="150" cy="360" rx="90" ry="45" fill="#A8C5A0" opacity="0.35" />
            <ellipse cx="500" cy="380" rx="120" ry="40" fill="#96B88E" opacity="0.3" />
            <path d="M 0 215 Q 225 175 450 210 Q 675 248 900 215" fill="none" stroke="#3A4238" strokeWidth="60" />
            <path d="M 0 215 Q 225 175 450 210 Q 675 248 900 215" fill="none" stroke="#2C322B" strokeWidth="52" />
            <path d="M 0 215 Q 225 175 450 210 Q 675 248 900 215" fill="none" stroke="white" strokeWidth="2" strokeDasharray="28 18" opacity="0.8" />
            <ellipse cx="490" cy="215" rx="80" ry="55" fill="url(#heatRed)" filter="url(#blur4)" />
            <ellipse cx="640" cy="215" rx="95" ry="60" fill="url(#heatAmber)" filter="url(#blur4)" />
            <circle cx="260" cy="213" r="4" fill="#F5F0E8" />
            <circle cx="430" cy="208" r="4" fill="#F5F0E8" opacity="0.8" />
            <circle cx="700" cy="218" r="4" fill="#F5F0E8" />
          </svg>
          {camNodes.map((node) => (
            <div key={node.id} className="absolute" style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%,-50%)' }}>
              {node.critical && (
                <>
                  <div className="absolute w-20 h-20 -top-10 -left-10 rounded-full border border-red-critical/30 animate-detection-pulse"></div>
                  <div className="absolute w-12 h-12 -top-6 -left-6 rounded-full border border-red-critical/50 animate-detection-pulse" style={{ animationDelay: '0.4s' }}></div>
                </>
              )}
              <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md z-10 relative ${node.critical ? 'bg-red-critical' : 'bg-charcoal'}`} title={node.id}></div>
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-[var(--card-bg)]90 backdrop-blur px-1.5 py-0.5 rounded shadow-soft border border-[var(--border)] text-[8px] font-black tracking-wider uppercase text-[var(--text-1)] whitespace-nowrap z-10">
                {node.id}
              </div>
            </div>
          ))}
          {isCritical && (
            <div className="absolute top-4 right-4 bg-[var(--card-bg)]95 backdrop-blur border border-red-critical/25 rounded-xl p-3 shadow-premium animate-slide-in-up w-44 cursor-pointer z-20"
              onClick={() => setSelectedIncident(activeAlert)}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-critical animate-pulse"></div>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-red-critical">Detection</span>
              </div>
              <div className="text-2xl mb-1">{animalEmoji(activeAlert.animal)}</div>
              <p className="text-sm font-black text-[var(--text-1)]">{activeAlert.animal}</p>
              <p className="text-[9px] font-bold text-[var(--text-3)] mt-1 font-mono">{activeAlert.cam_id} · {activeAlert.location}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[8px] font-black text-red-critical uppercase tracking-widest">HIGH RISK</span>
                {collisionRisk && <span className="text-[9px] font-bold text-[var(--text-2)]">{collisionRisk.risk_pct}%</span>}
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-[var(--card-bg)]80 backdrop-blur px-3 py-1.5 rounded-lg border border-[var(--border)] flex items-center gap-3 text-[9px] font-bold text-[var(--text-2)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-critical inline-block"></span> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-charcoal inline-block"></span> Camera</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--card-bg)] border border-text-muted inline-block"></span> Vehicle</span>
          </div>
        </div>

        {/* Active Incident Card + Collision Risk */}
        <div className="rounded-2xl border shadow-soft flex flex-col overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
            <div className="w-2 h-2 rounded-full bg-red-critical animate-pulse"></div>
            <span className="text-[9px] font-black tracking-[0.25em] uppercase text-red-critical">Live Incident</span>
            <span className="ml-auto text-[9px] font-mono" style={{ color: 'var(--text-3)' }}>{new Date().toLocaleTimeString()}</span>
          </div>
          {activeAlert ? (
            <div className="flex-1 p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-4xl">{animalEmoji(activeAlert.animal)}</div>
                <div>
                  <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-0.5">Wildlife Detected</p>
                  <h2 className="text-xl font-black text-[var(--text-1)] leading-tight">{activeAlert.animal}</h2>
                  <p className="text-[10px] font-bold text-[var(--text-2)] font-mono mt-0.5">{activeAlert.cam_id} · {activeAlert.location}</p>
                </div>
              </div>

              {/* Collision Risk Gauge */}
              {collisionRisk && (
                <div className="mb-4 p-3 bg-red-critical/5 rounded-xl border border-red-critical/20">
                  <p className="text-[8px] font-black uppercase tracking-widest text-red-critical mb-2 text-center">Collision Risk Score</p>
                  <div className="flex justify-center">
                    <RiskGauge value={collisionRisk.risk_pct} size={160} />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    <div className="bg-white rounded-lg p-2 border border-[var(--border)] text-center">
                      <p className="text-[7px] font-bold text-[var(--text-3)] uppercase tracking-widest">Stoppable?</p>
                      <p className={`text-[10px] font-black ${collisionRisk.is_stoppable ? 'text-forest-green' : 'text-red-critical'}`}>
                        {collisionRisk.is_stoppable ? '✓ YES' : '✗ NO'}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-[var(--border)] text-center">
                      <p className="text-[7px] font-bold text-[var(--text-3)] uppercase tracking-widest">Rec. Speed</p>
                      <p className="text-[10px] font-black text-amber-warning">{collisionRisk.recommended_speed_kmh} km/h</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-[var(--border)] text-center">
                      <p className="text-[7px] font-bold text-[var(--text-3)] uppercase tracking-widest">T-Impact</p>
                      <p className="text-[10px] font-black text-red-critical">{collisionRisk.time_to_impact_sec}s</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-[var(--border)] text-center">
                      <p className="text-[7px] font-bold text-[var(--text-3)] uppercase tracking-widest">Distance</p>
                      <p className="text-[10px] font-black text-[var(--text-1)]">{activeAlert.distance_m}m</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-auto space-y-2">
                <div className="w-full bg-forest-green text-white p-2.5 rounded-xl font-black tracking-widest text-center uppercase text-[10px] shadow-sm">
                  {activeAlert.signage_message}
                </div>
                <button onClick={() => setSelectedIncident(activeAlert)}
                  className="w-full py-2 rounded-xl border border-[var(--border)] text-[10px] font-bold tracking-widest uppercase text-[var(--text-2)] hover:border-forest-green hover:text-forest-green transition-colors">
                  View Full Report →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
              <ShieldAlert size={36} className="text-text-muted mb-3" />
              <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">No Critical Incidents</p>
            </div>
          )}
        </div>
      </div>

      {/* Road Pulse */}
      <div className="rounded-2xl border shadow-soft p-5 transition-colors duration-300"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--text-3)] mb-0.5">NH-44 Corridor</p>
            <h3 className="text-sm font-black text-[var(--text-1)] uppercase tracking-wide">Road Pulse — Wildlife Activity</h3>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-amber-warning/10 border border-amber-warning/20 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-warning animate-pulse"></div>
            <span className="text-[8px] font-black text-amber-warning uppercase tracking-widest">Peak 18:00–21:00</span>
          </div>
        </div>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={roadPulseData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1A3C34" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#1A3C34" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--text-3)', fontWeight: 700 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}:00`} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }} formatter={(v: any) => [`${v} events`, 'Activity']} labelFormatter={v => `${v}:00`} />
              <Area type="monotone" dataKey="v" stroke="#1A3C34" strokeWidth={2} fill="url(#pulseGrad)" dot={(props: any) => {
                const { cx, cy, value } = props;
                if (value > 20) return <circle key={cx} cx={cx} cy={cy} r={4} fill="#E11D48" stroke="white" strokeWidth={2} />;
                if (value > 10) return <circle key={cx} cx={cx} cy={cy} r={3} fill="#F59E0B" stroke="white" strokeWidth={1.5} />;
                return <circle key={cx} cx={cx} cy={cy} r={2} fill="#2D5A4E" />;
              }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mt-2 text-center">🔴 Wildlife activity peaks between 18:00 and 21:00 — heightened monitoring engaged</p>
      </div>

      {/* Recent Detections */}
      <div className="rounded-2xl border shadow-soft overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-1)' }}>Recent Detections</h3>
          <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>{displayDetections.length} events</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {displayDetections.slice(0, 5).map((d: Detection, i: number) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 transition-colors" style={{}} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-hover)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
              <div className="text-xl">{animalEmoji(d.animal)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate" style={{ color: 'var(--text-1)' }}>{d.animal}</p>
                <p className="text-[9px] font-bold font-mono" style={{ color: 'var(--text-3)' }}>{d.cam_id} · {d.timestamp || '—'}</p>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${d.risk_level === 'CRITICAL' ? 'bg-red-critical/10 text-red-critical border border-red-critical/20' : d.risk_level === 'HIGH' ? 'bg-amber-warning/10 text-amber-warning border border-amber-warning/20' : 'bg-forest-green/10 text-forest-green border border-forest-green/20'}`}>{d.risk_level}</div>
              <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{d.distance_m}m</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE NETWORK VIEW
// ══════════════════════════════════════════════════════════════════════════════
function NetworkView({ displayCameras, displayDetections }: any) {
  return (
    <div className="space-y-5 animate-in fade-in duration-400 pt-5">
      <div>
        <p className="text-[9px] font-bold tracking-[0.3em] text-forest-green uppercase mb-1">LIVE NETWORK</p>
        <h1 className="text-2xl font-black text-[var(--text-1)] tracking-tight">Camera Intelligence Grid</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Cameras', value: displayCameras.length, color: 'text-charcoal', bg: '' },
          { label: 'Online', value: displayCameras.filter((c: CameraObj) => c.status !== 'offline').length, color: 'text-forest-green', bg: 'bg-forest-green/8' },
          { label: 'Critical', value: displayCameras.filter((c: CameraObj) => c.risk_level === 'CRITICAL').length, color: 'text-red-critical', bg: 'bg-red-critical/8' },
          { label: 'Detections Today', value: displayDetections.length, color: 'text-amber-warning', bg: 'bg-amber-warning/8' },
        ].map((s, i) => (
          <div key={i} className={`p-4 rounded-xl border ${s.bg}`} style={{ borderColor: "var(--border)" }}>
            <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border shadow-soft overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-1)' }}>Camera Network Status</h3>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-moss-green">
            <div className="w-1.5 h-1.5 rounded-full bg-moss-green animate-pulse"></div> Live
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {displayCameras.map((cam: CameraObj, i: number) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${cam.risk_level === 'CRITICAL' ? 'bg-red-critical animate-pulse' : cam.risk_level === 'HIGH' ? 'bg-amber-warning' : 'bg-moss-green'}`}></div>
              <div className="w-16 text-xs font-black font-mono" style={{ color: 'var(--text-1)' }}>{cam.id}</div>
              <div className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--text-2)' }}>{cam.zone}</div>
              <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${cam.risk_level === 'CRITICAL' ? 'bg-red-critical/10 text-red-critical' : cam.risk_level === 'HIGH' ? 'bg-amber-warning/10 text-amber-warning' : cam.risk_level === 'MEDIUM' ? 'bg-forest-green/10 text-forest-green' : 'text-text-secondary'}`} style={cam.risk_level === 'LOW' || !cam.risk_level ? { backgroundColor: 'var(--surface-sunken)', color: 'var(--text-2)' } : {}}>{cam.risk_level || 'LOW'}</div>
              <div className="flex items-center gap-1 text-[9px] font-bold text-moss-green">
                <div className="w-1.5 h-1.5 rounded-full bg-moss-green"></div> ONLINE
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border shadow-soft p-5 transition-colors duration-300"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-1)' }}>24-Hour Detection Activity</h3>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="h" tick={{ fontSize: 8, fill: 'var(--text-3)', fontWeight: 700 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }} />
              <Bar dataKey="detections" radius={[2, 2, 0, 0]} fill="#1A3C34" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RISK MAP VIEW — with Activity Heatmap BarChart
// ══════════════════════════════════════════════════════════════════════════════
function RiskMapView() {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [heatFilter, setHeatFilter] = useState('All');

  const fallbackHeatmap = [
    { cam_id: 'CAM-04', zone: 'Zone 4 - Elephant Corridor', activity_score: 148, risk_level: 'CRITICAL', risk_num: 4 },
    { cam_id: 'CAM-02', zone: 'Zone 2 - Dense Forest', activity_score: 82, risk_level: 'HIGH', risk_num: 3 },
    { cam_id: 'CAM-06', zone: 'Zone 6 - Deer Plains', activity_score: 91, risk_level: 'MEDIUM', risk_num: 2 },
    { cam_id: 'CAM-05', zone: 'Zone 5 - Rocky Escarpment', activity_score: 63, risk_level: 'HIGH', risk_num: 3 },
    { cam_id: 'CAM-01', zone: 'Zone 1 - Riverine Wetland', activity_score: 39, risk_level: 'LOW', risk_num: 1 },
    { cam_id: 'CAM-03', zone: 'Zone 3 - Eco-Duct', activity_score: 22, risk_level: 'LOW', risk_num: 1 },
  ];

  useEffect(() => {
    fetch(`${API_BASE}/heatmap`).then(r => r.json()).then(setHeatmapData).catch(() => setHeatmapData(fallbackHeatmap));
  }, []);

  const displayHeatmap = heatmapData.length > 0 ? heatmapData : fallbackHeatmap;
  const filters = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const filtered = heatFilter === 'All' ? displayHeatmap : displayHeatmap.filter((d: any) => d.risk_level?.toLowerCase() === heatFilter.toLowerCase());

  const barColor = (rl: string) => {
    if (rl === 'CRITICAL') return '#E11D48';
    if (rl === 'HIGH') return '#F59E0B';
    if (rl === 'MEDIUM') return '#2D5A4E';
    return '#A8A29E';
  };

  const chartData = filtered.map((d: any) => ({
    name: d.cam_id,
    score: d.activity_score,
    fill: barColor(d.risk_level),
  }));

  return (
    <div className="space-y-5 animate-in fade-in duration-400 pt-5">
      <div>
        <p className="text-[9px] font-bold tracking-[0.3em] text-forest-green uppercase mb-1">RISK MAP</p>
        <h1 className="text-2xl font-black text-[var(--text-1)] tracking-tight">Wildlife Risk Intelligence</h1>
      </div>

      {/* SVG Highway Map */}
      <div className="relative h-[400px] bg-[#E8E4DC] rounded-2xl overflow-hidden border border-[var(--border)] shadow-soft">
        <svg viewBox="0 0 1200 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="riskH1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E11D48" stopOpacity="0.45" /><stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="riskH2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E11D48" stopOpacity="0.35" /><stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="riskM1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" /><stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="riskL1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2D5A4E" stopOpacity="0.25" /><stop offset="100%" stopColor="#2D5A4E" stopOpacity="0" />
            </radialGradient>
            <filter id="mapBlur"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <rect width="1200" height="400" fill="#E4DFD5" />
          <rect y="0" width="1200" height="130" fill="#BDD4B5" opacity="0.45" />
          <rect y="270" width="1200" height="130" fill="#BDD4B5" opacity="0.4" />
          <ellipse cx="200" cy="100" rx="130" ry="65" fill="#A8C5A0" opacity="0.4" />
          <ellipse cx="600" cy="80" rx="150" ry="60" fill="#96B88E" opacity="0.35" />
          <ellipse cx="1000" cy="95" rx="120" ry="60" fill="#A8C5A0" opacity="0.35" />
          <path d="M 0 200 Q 300 165 600 200 Q 900 235 1200 200" fill="none" stroke="#3A4238" strokeWidth="76" />
          <path d="M 0 200 Q 300 165 600 200 Q 900 235 1200 200" fill="none" stroke="#2C322B" strokeWidth="68" />
          <path d="M 0 200 Q 300 165 600 200 Q 900 235 1200 200" fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="32 22" opacity="0.7" />
          <ellipse cx="150" cy="200" rx="100" ry="70" fill="url(#riskH1)" filter="url(#mapBlur)" />
          <ellipse cx="850" cy="220" rx="90" ry="65" fill="url(#riskH2)" filter="url(#mapBlur)" />
          <ellipse cx="480" cy="198" rx="120" ry="80" fill="url(#riskM1)" filter="url(#mapBlur)" />
          <ellipse cx="1050" cy="205" rx="100" ry="70" fill="url(#riskM1)" filter="url(#mapBlur)" />
          <ellipse cx="300" cy="202" rx="80" ry="55" fill="url(#riskL1)" filter="url(#mapBlur)" />
          <ellipse cx="700" cy="208" rx="85" ry="58" fill="url(#riskL1)" filter="url(#mapBlur)" />
          {[110, 290, 490, 690, 875, 1060].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={200 + (i % 2 === 0 ? -5 : 5)} r={7} fill={i === 0 || i === 3 ? '#E11D48' : '#2C322B'} stroke="white" strokeWidth={2} />
              <text x={x} y={200 + (i % 2 === 0 ? -5 : 5) - 14} textAnchor="middle" fontSize="9" fontWeight="700" fill="#2C322B">CAM-{String(i + 1).padStart(2, '0')}</text>
            </g>
          ))}
        </svg>
        <div className="absolute top-4 left-4 bg-[var(--card-bg)]95 backdrop-blur p-4 rounded-2xl border border-[var(--border)] shadow-premium w-52">
          <p className="text-[9px] font-black tracking-[0.25em] uppercase text-forest-green mb-3">Risk Intelligence</p>
          <div className="space-y-2 mb-3">
            {[{ label: 'High Risk', value: '2 zones', dot: 'bg-red-critical' }, { label: 'Medium', value: '2 zones', dot: 'bg-amber-warning' }, { label: 'Low', value: '2 zones', dot: 'bg-forest-green' }].map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${r.dot}`}></div><span className="text-xs font-bold text-[var(--text-2)]">{r.label}</span></div>
                <span className="text-sm font-black text-[var(--text-1)]">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] pt-3 space-y-2">
            <div><p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-0.5">Peak Activity</p><p className="text-xs font-bold text-[var(--text-1)]">18:00 — 21:00</p></div>
            <div><p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-0.5">Highest Risk Zone</p><p className="text-xs font-bold text-[var(--text-1)]">Zone 4 - CAM-04</p></div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4 bg-[var(--card-bg)]90 backdrop-blur px-3 py-2 rounded-xl border border-[var(--border)]">
          <p className="text-[8px] font-black text-[var(--text-3)] uppercase tracking-widest mb-2">Heat Legend</p>
          <div className="flex items-center gap-3 text-[8px] font-bold text-[var(--text-2)]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-critical/50 inline-block"></span> High</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-warning/50 inline-block"></span> Med</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-forest-green/40 inline-block"></span> Low</span>
          </div>
        </div>
      </div>

      {/* Wildlife Activity Heatmap BarChart */}
      <div className="rounded-2xl border shadow-soft p-5 transition-colors duration-300"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] mb-0.5" style={{ color: 'var(--text-3)' }}>Zone Analysis</p>
            <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>Wildlife Activity Heatmap</h3>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map(f => (
              <button key={f} onClick={() => setHeatFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all ${heatFilter === f ? 'bg-forest-green text-white' : 'border hover:border-forest-green/30'}`}
                style={heatFilter !== f ? { backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)', color: 'var(--text-2)' } : {}}>{f}</button>
            ))}
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-3)', fontWeight: 700 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }} formatter={(v: any) => [`${v} events`, 'Activity Score']} />
              <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <rect key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[{ label: 'CRITICAL', color: 'bg-red-critical' }, { label: 'HIGH', color: 'bg-amber-warning' }, { label: 'MEDIUM', color: 'bg-moss-green' }, { label: 'LOW', color: 'bg-text-muted' }].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-[8px] font-bold text-[var(--text-2)]">
              <span className={`w-2.5 h-2.5 rounded-sm ${l.color} inline-block`}></span>{l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DRIVER ALERT VIEW — Automotive HUD with Voice Alert + Dynamic Warning Sign
// ══════════════════════════════════════════════════════════════════════════════
function AlertView({ displayAlerts }: { displayAlerts: AlertObj[] }) {
  const alert = displayAlerts[0];
  const [countdown, setCountdown] = useState(28);
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    setCountdown(28);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVoiceAlert = () => {
    if (broadcasting) return;
    setBroadcasting(true);
    setTimeout(() => setBroadcasting(false), 3000);
  };

  const isCritical = alert?.urgency === 'CRITICAL';

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-400 pt-5">
      <div>
        <p className="text-[9px] font-bold tracking-[0.3em] text-forest-green uppercase mb-1">DRIVER INTERFACE</p>
        <h1 className="text-2xl font-black text-[var(--text-1)] tracking-tight">Smart Driver Alert System</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* HUD Phone Mockup */}
        <div className="flex justify-center">
          <div className="max-w-xs w-full">
            <div className="bg-white rounded-[36px] overflow-hidden border-4 border-charcoal shadow-2xl">
              <div className="bg-charcoal px-6 py-3 flex items-center justify-between">
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest font-mono">AUTO-SYS ACTIVE</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-moss-green animate-pulse"></div>
                  <span className="text-[9px] font-bold text-moss-green uppercase tracking-widest">V2X LINKED</span>
                </div>
              </div>
              <div className="p-8 flex flex-col items-center text-center">
                <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 rounded-full bg-red-critical/10 animate-ping"></div>
                  <div className="absolute inset-3 rounded-full bg-red-critical/15"></div>
                  <div className="relative w-20 h-20 rounded-full bg-red-critical/10 border-2 border-red-critical/30 flex items-center justify-center">
                    <span className="text-4xl">{alert ? animalEmoji(alert.animal) : '🦌'}</span>
                  </div>
                </div>
                <p className="text-[9px] font-black tracking-[0.4em] uppercase text-red-critical mb-1">WILDLIFE AHEAD</p>
                <h1 className="text-3xl font-black text-[var(--text-1)] mb-2 uppercase leading-tight">
                  {alert?.animal || 'DEER'}<br />DETECTED
                </h1>
                <p className="text-base font-bold text-[var(--text-2)] mb-3">{alert?.distance_m || 14.5} m ahead</p>
                {alert?.recommended_speed && (
                  <div className="mb-4 px-4 py-2 bg-amber-warning/10 rounded-xl border border-amber-warning/30">
                    <p className="text-[8px] font-bold text-amber-warning uppercase tracking-widest">Recommended Speed</p>
                    <p className="text-2xl font-black text-amber-warning">{alert.recommended_speed} km/h</p>
                  </div>
                )}
                <div className={`w-full rounded-2xl py-4 mb-4 shadow-lg ${isCritical ? 'bg-red-critical' : 'bg-amber-warning'}`}>
                  <p className="text-white font-black text-xl tracking-widest uppercase">{alert?.urgency || 'HIGH RISK'}</p>
                </div>
                <div className="w-36 h-36 relative flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#E11D48" strokeWidth="6"
                      strokeDasharray={`${(countdown / 28) * 283} 283`} style={{ transition: 'stroke-dasharray 1s linear' }} strokeLinecap="round" />
                  </svg>
                  <div className="text-center">
                    <p className="text-4xl font-black text-[var(--text-1)] font-mono leading-none">{String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}</p>
                    <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest mt-1">Time Remaining</p>
                  </div>
                </div>
              </div>
              <div className="bg-sand/50 px-6 py-3 border-t border-[var(--border)] text-center">
                <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest font-mono">
                  {alert?.cam_id || 'CAM-04'} · {alert?.location || 'Zone 04'}
                </p>
              </div>
            </div>

            {/* Voice Alert Button */}
            <div className="mt-4">
              <button onClick={handleVoiceAlert} disabled={broadcasting}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-md ${broadcasting ? 'bg-amber-warning text-white cursor-not-allowed' : 'bg-charcoal text-white hover:bg-moss-green'}`}>
                <Volume2 size={16} className={broadcasting ? 'animate-pulse' : ''} />
                {broadcasting ? '🔊 BROADCASTING ALERT…' : 'Voice Alert Simulation'}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Warning Sign Simulation */}
        <div className="space-y-4">
          <div className="rounded-2xl border shadow-soft p-5 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-1)] mb-4">Dynamic Warning Sign</h3>
            {/* LED Sign Panel */}
            <div className="bg-charcoal rounded-2xl border-4 border-charcoal/80 p-6 text-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
              <div className="relative z-10">
                <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#F59E0B', textShadow: '0 0 10px #F59E0B, 0 0 20px #F59E0B50' }}>⚠ WILDLIFE AHEAD</p>
                <p className="text-lg font-black tracking-wider leading-tight" style={{ color: '#F59E0B', textShadow: '0 0 12px #F59E0B, 0 0 24px #F59E0B60', animation: 'blip-pulse 1.4s ease-in-out infinite' }}>
                  SLOW DOWN
                </p>
                {alert?.recommended_speed && (
                  <p className="text-sm font-black mt-2 tracking-widest" style={{ color: '#F5F0E8', textShadow: '0 0 8px white' }}>
                    MAX {alert.recommended_speed} KM/H
                  </p>
                )}
                <div className="mt-3 flex justify-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-amber-warning animate-ping" style={{ animationDelay: `${i * 0.15}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[9px] font-bold text-[var(--text-3)] mt-3 text-center uppercase tracking-widest">LED Variable Message Sign — Simulation</p>
          </div>

          {/* Alert Details */}
          {alert && (
            <div className="rounded-2xl border shadow-soft p-5 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-1)] mb-3">Active Alert Data</h3>
              <div className="space-y-2">
                {[
                  { label: 'Alert ID', value: String(alert.id) },
                  { label: 'Animal', value: `${animalEmoji(alert.animal)} ${alert.animal}` },
                  { label: 'Distance', value: `${alert.distance_m}m` },
                  { label: 'T-Collision', value: `${alert.time_to_collision_sec}s` },
                  { label: 'Urgency', value: alert.urgency },
                  { label: 'Timestamp', value: alert.timestamp || '—' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest">{r.label}</span>
                    <span className={`text-xs font-bold ${r.label === 'Urgency' && r.value === 'CRITICAL' ? 'text-red-critical' : 'text-charcoal'}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INTELLIGENCE VIEW — Tabbed: Insights | Simulator | Corridors | Incidents | Zones
// ══════════════════════════════════════════════════════════════════════════════
function IntelligenceView({ wiSpeed, setWiSpeed, wiDist, setWiDist, wiVis, setWiVis, wiMovement, setWiMovement, whatIfResult, setWhatIfResult, isSimulating, setIsSimulating }: any) {
  const [tab, setTab] = useState<'insights' | 'simulator' | 'corridors' | 'incidents' | 'zones'>('insights');
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [corridors, setCorridors] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [zoneRecs, setZoneRecs] = useState<any>({});

  const fallbackHotspots = [
    { zone: 'Zone 4 - Elephant Migration Corridor', cam_id: 'CAM-04', risk_score: 94, peak_hours: '20:00–23:00', dominant_species: 'Asian Elephant', monthly_events: 148, trend: 'INCREASING', recommendation: 'Deploy permanent speed advisory signs; evaluate wildlife underpass' },
    { zone: 'Zone 2 - Dense Forest Canopy', cam_id: 'CAM-02', risk_score: 78, peak_hours: '18:00–21:00', dominant_species: 'Spotted Deer', monthly_events: 82, trend: 'STABLE', recommendation: 'Increase monitoring frequency; install reflective delineators' },
    { zone: 'Zone 5 - Rocky Escarpment', cam_id: 'CAM-05', risk_score: 71, peak_hours: '19:00–22:00', dominant_species: 'Indian Leopard', monthly_events: 63, trend: 'INCREASING', recommendation: 'Install wildlife-exclusion fencing; evaluate patrol routes' },
    { zone: 'Zone 6 - Deer Grazing Plains', cam_id: 'CAM-06', risk_score: 62, peak_hours: '17:00–20:00', dominant_species: 'Wild Boar', monthly_events: 91, trend: 'STABLE', recommendation: 'Add solar-powered blinking amber signs' },
  ];
  const fallbackCorridors = [
    { corridor_id: 'WC-ALPHA', name: 'Northern Elephant Migration Corridor', cameras: ['CAM-02', 'CAM-04', 'CAM-05'], species: 'Asian Elephant', confidence: 91, direction: 'NE → SW', events_last_30d: 48, status: 'CONFIRMED', description: 'Repeated detections on CAM-02 → CAM-04 → CAM-05 over 48 events suggest active migration corridor.' },
    { corridor_id: 'WC-BETA', name: 'Deer Grazing Lateral Crossing', cameras: ['CAM-05', 'CAM-06'], species: 'Spotted Deer', confidence: 74, direction: 'E → W', events_last_30d: 29, status: 'PROBABLE', description: 'Lateral crossing pattern between zones 5 and 6.' },
    { corridor_id: 'WC-GAMMA', name: 'Predator Patrol Route - Escarpment', cameras: ['CAM-03', 'CAM-05'], species: 'Indian Leopard', confidence: 62, direction: 'N → S', events_last_30d: 14, status: 'POSSIBLE', description: 'Occasional leopard sightings along rocky escarpment zone suggest nocturnal patrol route.' },
  ];
  const fallbackIncidents = [
    { id: 'EW-2041', cam_id: 'CAM-04', animal: 'Asian Elephant', zone: 'Zone 4 - Elephant Migration Corridor', timestamp: '23:42:10', collision_risk_pct: 94, action: 'VMS + Acoustic Chirp', outcome: 'Averted', summary: 'Adult male elephant detected 14.5m from carriageway. Vehicle approaching at 88 km/h. Collision risk elevated to CRITICAL. VMS boards deployed; driver decelerated to 32 km/h. Animal safely crossed 40 seconds post-alert.' },
    { id: 'EW-2040', cam_id: 'CAM-02', animal: 'Spotted Deer Herd', zone: 'Zone 2 - Dense Forest Canopy', timestamp: '23:38:45', collision_risk_pct: 81, action: 'HUD Warning', outcome: 'Averted', summary: 'Herd of 4 spotted deer on road shoulder at 6.8m. 8 connected vehicles received HUD alerts. All vehicles slowed; no contact.' },
    { id: 'EW-2039', cam_id: 'CAM-05', animal: 'Indian Leopard', zone: 'Zone 5 - Rocky Escarpment', timestamp: '23:25:12', collision_risk_pct: 76, action: 'Emergency Patrol', outcome: 'Averted', summary: 'Leopard detected resting on road surface. Forest Patrol Unit FP-07 dispatched and confirmed clearance within 6 minutes.' },
  ];
  const fallbackZoneRecs: any = {
    'CAM-04': { zone: 'Zone 4 - Elephant Migration Corridor', risk_level: 'CRITICAL', actions: [{ priority: 'CRITICAL', action: 'Install permanent overhead VMS signage at KM 86 and KM 92' }, { priority: 'CRITICAL', action: 'Evaluate wildlife underpass / overpass feasibility study' }, { priority: 'HIGH', action: 'Increase patrol frequency during 20:00–23:00 peak hours' }, { priority: 'HIGH', action: 'Assess barrier fencing along 2km stretch near CAM-04' }, { priority: 'MEDIUM', action: 'Coordinate with Forest Department for elephant telemetry collars' }] },
    'CAM-02': { zone: 'Zone 2 - Dense Forest Canopy', risk_level: 'HIGH', actions: [{ priority: 'HIGH', action: 'Install wildlife warning signage at KM 55 and KM 61' }, { priority: 'HIGH', action: 'Increase monitoring frequency to every 4 seconds' }, { priority: 'MEDIUM', action: 'Evaluate fencing near camera 02 approach' }] },
    'CAM-05': { zone: 'Zone 5 - Rocky Escarpment', risk_level: 'HIGH', actions: [{ priority: 'HIGH', action: 'Deploy solar-powered amber blinking signs 300m before blind curve' }, { priority: 'MEDIUM', action: 'Assess wildlife-exclusion fencing feasibility near camera 05' }] },
  };

  useEffect(() => {
    fetch(`${API_BASE}/hotspots`).then(r => r.json()).then(d => setHotspots(d.hotspots || [])).catch(() => setHotspots(fallbackHotspots));
    fetch(`${API_BASE}/corridors`).then(r => r.json()).then(d => setCorridors(d.corridors || [])).catch(() => setCorridors(fallbackCorridors));
    fetch(`${API_BASE}/incidents`).then(r => r.json()).then(setIncidents).catch(() => setIncidents(fallbackIncidents));
    fetch(`${API_BASE}/zone-recommendations`).then(r => r.json()).then(setZoneRecs).catch(() => setZoneRecs(fallbackZoneRecs));
  }, []);

  const displayHotspots = hotspots.length > 0 ? hotspots : fallbackHotspots;
  const displayCorridors = corridors.length > 0 ? corridors : fallbackCorridors;
  const displayIncidents = incidents.length > 0 ? incidents : fallbackIncidents;
  const displayZoneRecs = Object.keys(zoneRecs).length > 0 ? zoneRecs : fallbackZoneRecs;

  const tabs = [
    { id: 'insights', label: 'Insights' },
    { id: 'simulator', label: 'Simulator' },
    { id: 'corridors', label: 'Corridors' },
    { id: 'incidents', label: 'Incidents' },
    { id: 'zones', label: 'Zones' },
  ] as const;

  // Preset scenarios
  const presets = [
    { label: 'Highway Speed', speed: 100, dist: 20, vis: 'night' },
    { label: 'City Speed', speed: 40, dist: 80, vis: 'day' },
    { label: 'Near Miss', speed: 80, dist: 12, vis: 'night' },
  ];

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/what-if`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_speed_kmh: wiSpeed, animal_distance_m: wiDist, time_of_day: wiVis })
      });
      if (res.ok) { setWhatIfResult(await res.json()); }
      else { throw new Error(); }
    } catch {
      const speedFactor = wiSpeed / 120;
      const distFactor = 1 - (wiDist / 200);
      const visFactor = wiVis === 'night' ? 1.25 : 1;
      const movFactor = wiMovement === 'high' ? 1.2 : wiMovement === 'low' ? 0.8 : 1;
      const riskRaw = Math.round(Math.min(98, (speedFactor * 0.5 + distFactor * 0.4 + 0.1) * 100 * visFactor * movFactor));
      const speed_ms = wiSpeed / 3.6;
      const braking = (speed_ms * speed_ms) / (2 * 0.7 * 9.81);
      const stopping = speed_ms * 1.5 + braking;
      setWhatIfResult({
        risk_pct: riskRaw,
        risk_level: riskRaw > 75 ? 'HIGH' : riskRaw > 45 ? 'MODERATE' : 'LOW',
        recommended_action: riskRaw > 75 ? 'Reduce speed immediately and prepare to stop.' : riskRaw > 45 ? 'Reduce speed and increase attention.' : 'Maintain awareness and monitor surroundings.',
        stopping_distance_m: Math.round(stopping),
        time_to_impact_sec: Math.round((wiDist / speed_ms) * 10) / 10,
        is_stoppable: stopping < wiDist,
        recommended_speed_kmh: riskRaw > 75 ? 30 : riskRaw > 45 ? 45 : 60,
      });
    }
    setIsSimulating(false);
  };

  const trendBadge = (trend: string) => {
    if (trend === 'INCREASING') return 'bg-red-critical/10 text-red-critical border-red-critical/20';
    if (trend === 'STABLE') return 'bg-amber-warning/10 text-amber-warning border-amber-warning/20';
    return 'bg-forest-green/10 text-forest-green border-forest-green/20';
  };
  const corridorBadge = (status: string) => {
    if (status === 'CONFIRMED') return 'bg-forest-green/10 text-forest-green border border-forest-green/20';
    if (status === 'PROBABLE') return 'bg-amber-warning/10 text-amber-warning border border-amber-warning/20';
    return 'bg-sand text-[var(--text-2)] border border-[var(--border)]';
  };
  const outcomeBadge = (outcome: string) => {
    if (outcome === 'Averted') return 'bg-forest-green/10 text-forest-green border border-forest-green/20';
    if (outcome === 'Pending') return 'bg-amber-warning/10 text-amber-warning border border-amber-warning/20';
    return 'bg-red-critical/10 text-red-critical border border-red-critical/20';
  };
  const priorityStyle = (p: string) => {
    if (p === 'CRITICAL') return 'text-red-critical bg-red-critical/10 border-red-critical/20';
    if (p === 'HIGH') return 'text-amber-warning bg-amber-warning/10 border-amber-warning/20';
    if (p === 'MEDIUM') return 'text-forest-green bg-forest-green/10 border-forest-green/20';
    if (p === 'INFO') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-text-secondary bg-[var(--surface-sunken)] border-[var(--border)]';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-400 pt-5">
      <div>
        <p className="text-[9px] font-black tracking-[0.3em] text-forest-green uppercase mb-1">AI INTELLIGENCE</p>
        <h1 className="text-2xl font-black text-[var(--text-1)] tracking-tight">Wildlife Intelligence Platform</h1>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1.5 flex-wrap border-b border-[var(--border)] pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-t-lg transition-all border border-b-0 ${tab === t.id ? 'bg-white border-[var(--border)] text-forest-green -mb-px z-10 shadow-soft' : 'bg-sand/50 border-transparent text-[var(--text-2)] hover:text-charcoal'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: INSIGHTS ─────────────────────────────────────────────────── */}
      {tab === 'insights' && (
        <div className="space-y-6">
          <div className="max-w-3xl">
            <p className="text-[9px] font-black tracking-[0.3em] text-forest-green uppercase mb-3">WHAT THE NETWORK IS LEARNING</p>
            <h2 className="text-2xl lg:text-3xl font-black text-[var(--text-1)] leading-[1.15] tracking-tight mb-5">
              "Wildlife activity is significantly increasing around Zone 04 after sunset."
            </h2>
            <div className="flex flex-wrap gap-6">
              <div className="border-l-2 border-forest-green pl-4">
                <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">Evidence</p>
                <p className="text-2xl font-black text-[var(--text-1)]">47 detections</p>
                <p className="text-xs font-medium text-[var(--text-2)]">Between 18:00–21:00</p>
              </div>
              <div className="border-l-2 border-forest-green pl-4">
                <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">Trend</p>
                <p className="text-2xl font-black text-forest-green">+28% vs baseline</p>
                <p className="text-xs font-medium text-[var(--text-2)]">Over last 30 days</p>
              </div>
              <div className="border-l-2 border-amber-warning pl-4">
                <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">Recommendation</p>
                <p className="text-sm font-bold text-[var(--text-1)] leading-snug max-w-[220px]">Increase monitoring 18–21h. Evaluate wildlife-crossing infrastructure near Zone 04.</p>
              </div>
            </div>
          </div>

          <hr className="border-border-subtle" />

          <div>
            <p className="text-[9px] font-black tracking-[0.25em] text-forest-green uppercase mb-4">PREDICTIVE HOTSPOT INTELLIGENCE</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayHotspots.map((h: any, i: number) => (
                <div key={i} className="rounded-2xl border shadow-soft p-5 premium-card transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-0.5">{h.cam_id}</p>
                      <h3 className="text-sm font-black text-[var(--text-1)] leading-snug">{h.zone}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${trendBadge(h.trend)}`}>{h.trend}</span>
                  </div>
                  {/* Risk Score Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Risk Score</span>
                      <span className={`text-sm font-black ${h.risk_score > 70 ? 'text-red-critical' : h.risk_score > 40 ? 'text-amber-warning' : 'text-forest-green'}`}>{h.risk_score}/100</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${h.risk_score}%`, background: h.risk_score > 70 ? '#E11D48' : h.risk_score > 40 ? '#F59E0B' : '#2D5A4E' }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Dominant Species</p>
                      <p className="font-bold text-[var(--text-1)]">{animalEmoji(h.dominant_species)} {h.dominant_species}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Peak Hours</p>
                      <p className="font-bold text-[var(--text-1)] font-mono">{h.peak_hours}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Monthly Events</p>
                      <p className="font-bold text-[var(--text-1)]">{h.monthly_events}</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg border" style={{ backgroundColor: "var(--surface-sunken)", borderColor: "var(--border)" }}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-forest-green mb-0.5">Recommendation</p>
                    <p className="text-[10px] font-medium text-[var(--text-2)] leading-snug">{h.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SIMULATOR ────────────────────────────────────────────────── */}
      {tab === 'simulator' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-forest-green" />
            <h2 className="text-lg font-black text-[var(--text-1)] uppercase tracking-wide">What-If Risk Simulator</h2>
          </div>

          {/* Preset Scenarios */}
          <div className="flex gap-2 flex-wrap">
            {presets.map((p, i) => (
              <button key={i} onClick={() => { setWiSpeed(p.speed); setWiDist(p.dist); setWiVis(p.vis); setWhatIfResult(null); }}
                className="px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider transition-all shadow-soft hover:border-forest-green hover:text-forest-green" style={{ backgroundColor: "var(--surface-sunken)", borderColor: "var(--border)", color: "var(--text-2)" }}>
                {p.label} ({p.speed}km/h · {p.dist}m · {p.vis})
              </button>
            ))}
          </div>

          <div className="rounded-2xl border shadow-soft overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
              {/* Controls */}
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)]">Vehicle Speed</span>
                    <span className="text-sm font-black text-[var(--text-1)] tabular-nums">{wiSpeed} km/h</span>
                  </div>
                  <input type="range" min="40" max="120" value={wiSpeed} onChange={e => setWiSpeed(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-[8px] font-bold text-[var(--text-3)] mt-1"><span>40</span><span>120 km/h</span></div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)]">Animal Distance</span>
                    <span className="text-sm font-black text-[var(--text-1)] tabular-nums">{wiDist} m</span>
                  </div>
                  <input type="range" min="10" max="200" value={wiDist} onChange={e => setWiDist(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-[8px] font-bold text-[var(--text-3)] mt-1"><span>10m</span><span>200m</span></div>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] block mb-2">Visibility</span>
                  <div className="flex gap-2">
                    {['day', 'night'].map(v => (
                      <button key={v} onClick={() => setWiVis(v)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${wiVis === v ? 'bg-forest-green text-white' : 'bg-sand/50 text-[var(--text-2)] border border-[var(--border)] hover:border-forest-green/30'}`}>
                        {v === 'day' ? '☀ Day' : '🌙 Night'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] block mb-2">Animal Movement</span>
                  <div className="flex gap-1.5">
                    {['low', 'medium', 'high'].map(m => (
                      <button key={m} onClick={() => setWiMovement(m)}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${wiMovement === m ? 'bg-charcoal text-white' : 'bg-sand/50 text-[var(--text-2)] border border-[var(--border)] hover:border-charcoal/30'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={runSimulation} disabled={isSimulating}
                  className={`w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-sm ${isSimulating ? 'bg-amber-warning text-white cursor-not-allowed' : 'bg-forest-green text-white hover:bg-moss-green hover:shadow-md'}`}>
                  {isSimulating ? '⟳ Calculating…' : 'Run Simulation'}
                </button>
              </div>

              {/* Result */}
              <div className="p-6 flex items-center justify-center" style={{ backgroundColor: "var(--surface-sunken)" }}>
                {whatIfResult ? (
                  <div className="text-center animate-in zoom-in duration-400 w-full">
                    <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[var(--text-3)] mb-4">Collision Risk</p>
                    <RiskGauge value={whatIfResult.risk_pct} size={200} />
                    <div className="mt-5 p-4 rounded-xl border text-left" style={{ backgroundColor: "var(--surface-sunken)", borderColor: "var(--border)" }}>
                      <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1.5">Recommended Action</p>
                      <p className="text-sm font-bold text-[var(--text-1)] leading-snug">{whatIfResult.recommended_action}</p>
                    </div>
                    {/* Detailed Breakdown */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {whatIfResult.stopping_distance_m !== undefined && (
                        <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: "var(--surface-sunken)", borderColor: "var(--border)" }}>
                          <p className="text-[7px] font-bold text-[var(--text-3)] uppercase tracking-widest">Stopping Dist.</p>
                          <p className="text-lg font-black text-[var(--text-1)]">{whatIfResult.stopping_distance_m}m</p>
                        </div>
                      )}
                      {whatIfResult.time_to_impact_sec !== undefined && (
                        <div className="p-3 rounded-xl border text-center" style={{ backgroundColor: "var(--surface-sunken)", borderColor: "var(--border)" }}>
                          <p className="text-[7px] font-bold text-[var(--text-3)] uppercase tracking-widest">T-Impact</p>
                          <p className="text-lg font-black text-[var(--text-1)]">{whatIfResult.time_to_impact_sec}s</p>
                        </div>
                      )}
                      {whatIfResult.is_stoppable !== undefined && (
                        <div className={`p-3 rounded-xl border text-center ${whatIfResult.is_stoppable ? 'bg-forest-green/8 border-forest-green/20' : 'bg-red-critical/8 border-red-critical/20'}`}>
                          <p className="text-[7px] font-bold text-[var(--text-3)] uppercase tracking-widest">Stoppable?</p>
                          <p className={`text-sm font-black ${whatIfResult.is_stoppable ? 'text-forest-green' : 'text-red-critical'}`}>{whatIfResult.is_stoppable ? '✓ YES' : '✗ NO'}</p>
                        </div>
                      )}
                      {whatIfResult.recommended_speed_kmh !== undefined && (
                        <div className="p-3 bg-amber-warning/8 rounded-xl border border-amber-warning/20 text-center">
                          <p className="text-[7px] font-bold text-[var(--text-3)] uppercase tracking-widest">Rec. Speed</p>
                          <p className="text-sm font-black text-amber-warning">{whatIfResult.recommended_speed_kmh} km/h</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center opacity-40">
                    <div className="w-24 h-24 rounded-full border-4 border-dashed border-border-medium flex items-center justify-center mx-auto mb-4">
                      <Target size={32} className="text-text-muted" />
                    </div>
                    <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-widest">Set parameters &</p>
                    <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-widest">run simulation</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CORRIDORS ────────────────────────────────────────────────── */}
      {tab === 'corridors' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Navigation size={16} className="text-forest-green" />
            <h2 className="text-lg font-black text-[var(--text-1)] uppercase tracking-wide">Wildlife Corridor Detection</h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg w-fit">
            <AlertTriangle size={12} className="text-amber-600" />
            <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">Requires field validation — AI-modeled from detection data</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayCorridors.map((c: any, i: number) => (
              <div key={i} className="rounded-2xl border shadow-soft p-5 premium-card transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-forest-green">{c.corridor_id}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${corridorBadge(c.status)}`}>{c.status}</span>
                </div>
                <h3 className="text-sm font-black text-[var(--text-1)] leading-snug mb-3">{c.name}</h3>
                {/* Camera nodes diagram */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto py-1">
                  {c.cameras.map((cam: string, ci: number) => (
                    <React.Fragment key={cam}>
                      <div className="shrink-0 px-2 py-1 rounded-lg bg-forest-green/8 border border-forest-green/20 text-[9px] font-black text-forest-green">{cam}</div>
                      {ci < c.cameras.length - 1 && (
                        <div className="relative shrink-0 flex items-center">
                          <div className="w-6 h-0.5 bg-moss-green/40"></div>
                          <div className="absolute top-0 left-0 w-6 h-0.5 bg-moss-green animate-connection-flow"></div>
                          <span className="text-[8px] text-moss-green ml-0.5">→</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Species</p>
                    <p className="font-bold text-[var(--text-1)]">{animalEmoji(c.species)} {c.species}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Confidence</p>
                    <p className="font-bold text-forest-green">{c.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Direction</p>
                    <p className="font-bold text-[var(--text-1)] font-mono">{c.direction}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Events (30d)</p>
                    <p className="font-bold text-[var(--text-1)]">{c.events_last_30d}</p>
                  </div>
                </div>
                <p className="text-[10px] font-medium text-[var(--text-2)] leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: INCIDENTS ────────────────────────────────────────────────── */}
      {tab === 'incidents' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] text-forest-green uppercase mb-1">AI INCIDENT SUMMARIES</p>
            <h2 className="text-lg font-black text-[var(--text-1)]">Recorded Wildlife Incidents</h2>
          </div>
          <div className="space-y-4">
            {displayIncidents.map((inc: any, i: number) => (
              <div key={i} className="rounded-2xl border shadow-soft p-5 premium-card transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{animalEmoji(inc.animal)}</div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-forest-green">#{inc.id}</p>
                      <h3 className="text-base font-black text-[var(--text-1)]">{inc.animal}</h3>
                      <p className="text-[9px] font-bold text-[var(--text-3)] font-mono">{inc.cam_id} · {inc.zone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SmallRiskGauge value={inc.collision_risk_pct} />
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${outcomeBadge(inc.outcome)}`}>{inc.outcome}</span>
                  </div>
                </div>
                <div className="flex gap-4 mb-3 text-xs">
                  <div><p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Time</p><p className="font-bold text-[var(--text-1)] font-mono">{inc.timestamp}</p></div>
                  <div><p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest">Action</p><p className="font-bold text-[var(--text-1)]">{inc.action}</p></div>
                </div>
                <blockquote className="p-3 rounded-xl border-l-4 border border-[var(--border)]" style={{ backgroundColor: "var(--surface-sunken)", borderLeftColor: "var(--forest-green)" }}>
                  <p className="text-[10px] font-medium text-[var(--text-2)] leading-relaxed italic">&ldquo;{inc.summary}&rdquo;</p>
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: ZONES ────────────────────────────────────────────────────── */}
      {tab === 'zones' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] text-forest-green uppercase mb-1">SMART ZONE RECOMMENDATIONS</p>
            <h2 className="text-lg font-black text-[var(--text-1)]">AI-Generated Zone Action Plans</h2>
          </div>
          <div className="space-y-4">
            {Object.entries(displayZoneRecs).map(([camId, rec]: [string, any]) => (
              <div key={camId} className="rounded-2xl border shadow-soft p-5 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-forest-green mb-0.5">{camId}</p>
                    <h3 className="text-sm font-black text-[var(--text-1)]">{rec.zone}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${rec.risk_level === 'CRITICAL' ? 'bg-red-critical/10 text-red-critical border-red-critical/20' : rec.risk_level === 'HIGH' ? 'bg-amber-warning/10 text-amber-warning border-amber-warning/20' : rec.risk_level === 'MEDIUM' ? 'bg-forest-green/10 text-forest-green border-forest-green/20' : 'bg-sand text-[var(--text-2)] border-[var(--border)]'}`}>
                    {rec.risk_level}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {rec.actions.map((action: any, ai: number) => (
                    <div key={ai} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${priorityStyle(action.priority)}`}>
                      <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 border ${priorityStyle(action.priority)}`}>{action.priority}</span>
                      <p className="text-[10px] font-bold leading-snug">{action.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// IMPACT VIEW — with /intervention-impact data + monthly trend chart
// ══════════════════════════════════════════════════════════════════════════════
function ImpactView() {
  const [impactData, setImpactData] = useState<any>(null);

  const fallbackImpact = {
    note: 'Simulation/Prototype Estimate',
    disclaimer: 'These figures are modeled projections based on detection rates and industry benchmarks. Actual outcomes require long-term field validation.',
    comparison: {
      without_ai: { wildlife_alerts: 0, driver_warnings: 0, avg_response_time_sec: null, risk_events_flagged: 0, estimated_collisions_per_month: 24 },
      with_ai: { wildlife_alerts: 342, driver_warnings: 2490, avg_response_time_sec: 2.4, risk_events_flagged: 54, estimated_collisions_per_month: 2 }
    },
    monthly_trend: [
      { month: 'May', alerts_issued: 186, drivers_warned: 1420 },
      { month: 'Jun', alerts_issued: 208, drivers_warned: 1640 },
      { month: 'Jul', alerts_issued: 251, drivers_warned: 1980 },
      { month: 'Aug', alerts_issued: 298, drivers_warned: 2210 },
      { month: 'Sep', alerts_issued: 342, drivers_warned: 2490 },
    ]
  };

  useEffect(() => {
    fetch(`${API_BASE}/intervention-impact`).then(r => r.json()).then(setImpactData).catch(() => setImpactData(fallbackImpact));
  }, []);

  const data = (impactData && impactData.comparison) ? impactData : fallbackImpact;
  const w = data.comparison.without_ai;
  const wi = data.comparison.with_ai;

  return (
    <div className="space-y-8 animate-in fade-in duration-400 pt-5">
      <div>
        <p className="text-[9px] font-bold tracking-[0.3em] text-forest-green uppercase mb-1">ENVIRONMENTAL LEDGER</p>
        <h1 className="text-2xl font-black text-[var(--text-1)] tracking-tight">AI Intervention Impact</h1>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-0.5">Prototype Estimate</p>
          <p className="text-xs font-medium text-amber-700">{data.disclaimer}</p>
        </div>
      </div>

      {/* Big Collision Numbers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border shadow-soft p-6 text-center transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">Without AI — Est. Collisions/Month</p>
          <p className="text-6xl font-black text-red-critical">{w.estimated_collisions_per_month}</p>
          <p className="text-xs font-bold text-[var(--text-2)] mt-1">Baseline (no intervention)</p>
        </div>
        <div className="bg-forest-green rounded-2xl shadow-soft p-6 text-center">
          <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mb-2">With AI — Est. Collisions/Month</p>
          <p className="text-6xl font-black text-white">{wi.estimated_collisions_per_month}</p>
          <p className="text-xs font-bold text-white/70 mt-1">With EcoWild AI active</p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-2xl border shadow-soft overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3.5 border-b" style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-1)' }}>Side-by-Side Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-5 py-3 text-left text-[8px] font-black uppercase tracking-widest text-[var(--text-3)]">Metric</th>
                <th className="px-5 py-3 text-center text-[8px] font-black uppercase tracking-widest text-red-critical">Without AI</th>
                <th className="px-5 py-3 text-center text-[8px] font-black uppercase tracking-widest text-forest-green">With AI</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {[
                { label: 'Wildlife Alerts Issued', wVal: w.wildlife_alerts, aiVal: wi.wildlife_alerts, better: 'higher' },
                { label: 'Driver Warnings Sent', wVal: w.driver_warnings, aiVal: wi.driver_warnings, better: 'higher' },
                { label: 'Avg. Response Time (s)', wVal: w.avg_response_time_sec ?? 'N/A', aiVal: wi.avg_response_time_sec, better: 'lower' },
                { label: 'Risk Events Flagged', wVal: w.risk_events_flagged, aiVal: wi.risk_events_flagged, better: 'higher' },
                { label: 'Est. Collisions/Month', wVal: w.estimated_collisions_per_month, aiVal: wi.estimated_collisions_per_month, better: 'lower' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-sand/30 transition-colors">
                  <td className="px-5 py-3 font-bold text-[var(--text-1)]">{row.label}</td>
                  <td className="px-5 py-3 text-center font-black text-red-critical">{row.wVal}</td>
                  <td className="px-5 py-3 text-center font-black text-forest-green">{row.aiVal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="rounded-2xl border shadow-soft p-5 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-1)] mb-4">Monthly Trend — Alerts &amp; Driver Warnings</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthly_trend} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1A3C34" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#1A3C34" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="warnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--text-3)', fontWeight: 700 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }} />
              <Area type="monotone" dataKey="alerts_issued" name="Alerts Issued" stroke="#1A3C34" strokeWidth={2} fill="url(#alertGrad)" dot={{ r: 3, fill: '#1A3C34' }} />
              <Area type="monotone" dataKey="drivers_warned" name="Drivers Warned" stroke="#F59E0B" strokeWidth={2} fill="url(#warnGrad)" dot={{ r: 3, fill: '#F59E0B' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-2)]"><span className="w-3 h-0.5 bg-forest-green inline-block"></span> Alerts Issued</span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-2)]"><span className="w-3 h-0.5 bg-amber-warning inline-block"></span> Drivers Warned</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: wi.driver_warnings.toLocaleString(), label: 'Drivers Alerted', color: 'text-charcoal', suffix: '' },
          { value: wi.wildlife_alerts, label: 'Wildlife Events', color: 'text-forest-green', suffix: '' },
          { value: wi.risk_events_flagged, label: 'Risk Zones Flagged', color: 'text-amber-warning', suffix: '' },
          { value: `${wi.avg_response_time_sec}`, label: 'Avg Alert Time (s)', color: 'text-charcoal', suffix: 's' },
        ].map((kpi, i) => (
          <div key={i} className="border-t-2 border-[var(--border)] pt-4">
            <p className={`text-5xl font-black tracking-tighter mb-2 ${kpi.color}`}>{kpi.value}{kpi.suffix}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-3)]">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Prevention Cycle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest px-2 py-0.5 bg-amber-50 rounded border border-amber-200">Prototype Estimates</span>
          </div>
          <h3 className="text-sm font-black text-[var(--text-1)] uppercase tracking-wide mb-4">Simulated Projections</h3>
          <div className="space-y-2">
            {[
              { label: 'Fuel Impact Saved', value: '3,840 L', icon: Wind },
              { label: 'CO₂ Emissions Prevented', value: '8,830 kg', icon: Droplets },
              { label: 'Severe Braking Events Avoided', value: '54 instances', icon: Zap },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border shadow-soft" style={{ backgroundColor: "var(--surface-sunken)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-forest-green/8 flex items-center justify-center">
                    <item.icon size={14} className="text-forest-green" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-1)]">{item.label}</span>
                </div>
                <span className="text-sm font-black text-forest-green">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-black text-[var(--text-1)] uppercase tracking-wide mb-6">Prevention Cycle</h3>
          <div className="relative w-64 h-64">
            <svg className="absolute inset-0 w-full h-full animate-radar" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-forest-green text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm">Detect</div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 px-3 py-1.5 bg-amber-warning text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm">Alert</div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-charcoal text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm">Prevent</div>
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider" style={{ backgroundColor: "var(--surface-sunken)", borderColor: "var(--border)", color: "var(--text-1)" }}>Learn</div>
            <div className="absolute inset-12 rounded-full bg-forest-green/8 border-2 border-forest-green/20 flex items-center justify-center">
              <span className="text-[8px] font-black text-forest-green uppercase tracking-widest text-center leading-tight">AI<br />Loop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAMERA WALL VIEW — with Night Vision Mode per camera
// ══════════════════════════════════════════════════════════════════════════════
function CameraWallView({ displayCameras, setSelectedIncident, showBoundingBox, demoStep }: any) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [nightVision, setNightVision] = useState<Record<string, boolean>>({});

  const toggleNightVision = (camId: string) => {
    setNightVision(prev => ({ ...prev, [camId]: !prev[camId] }));
  };

  const filtered = activeFilter === 'all' ? displayCameras : displayCameras.filter((c: CameraObj) => c.risk_level?.toLowerCase() === activeFilter);

  return (
    <div className="space-y-5 animate-in fade-in duration-400 pt-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[9px] font-bold tracking-[0.3em] text-forest-green uppercase mb-1">COMMAND WALL</p>
          <h1 className="text-2xl font-black text-[var(--text-1)] tracking-tight">Live Camera Feeds</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${activeFilter === f ? 'bg-forest-green text-white' : 'bg-white border border-[var(--border)] text-[var(--text-2)] hover:border-forest-green/30'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.slice(0, 4).map((cam: CameraObj, i: number) => {
          const isCritical = cam.risk_level === 'CRITICAL';
          const showDemoBox = showBoundingBox && i === 0 && demoStep >= 2;
          const nightMode = nightVision[cam.id] || false;
          return (
            <div key={cam.id}
              className={`relative bg-charcoal rounded-2xl overflow-hidden aspect-video border-2 shadow-premium transition-all duration-300 ${isCritical ? 'border-red-critical/60 animate-border-glow' : 'border-charcoal/20'}`}>
              {cam.image ? (
                <img src={cam.image} alt={cam.id} className="w-full h-full object-cover opacity-90 transition-all duration-500"
                  style={nightMode ? { filter: 'grayscale(100%) contrast(140%) brightness(105%)' } : {}} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-charcoal to-stone-700 flex items-center justify-center">
                  <Camera size={40} className="text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 scanlines pointer-events-none opacity-40"></div>

              {/* Night Vision Overlay Badge */}
              {nightMode && (
                <div className="absolute top-10 right-3 bg-forest-green/90 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider z-20">
                  🌙 NIGHT VISION ACTIVE
                </div>
              )}
              {nightMode && (
                <div className="absolute top-16 right-3 bg-charcoal/80 text-white/70 px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider z-20">
                  Low-light Enhancement [SIMULATION]
                </div>
              )}

              {/* AI Bounding Box */}
              {showDemoBox && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative border-2 border-red-critical rounded w-32 h-24 animate-in zoom-in duration-300">
                    <div className="absolute -top-6 left-0 bg-red-critical text-white text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">
                      {cam.risk_level === 'CRITICAL' ? 'Asian Elephant' : 'Deer'} · 97%
                    </div>
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-critical"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-critical"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-critical"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-critical"></div>
                  </div>
                </div>
              )}

              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-charcoal/80 to-transparent">
                <div className="flex items-center gap-2">
                  <span className="text-white text-[10px] font-black font-mono">{cam.id}</span>
                  <span className="text-white/60 text-[9px] font-mono truncate max-w-[100px]">{cam.zone}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Night Vision Toggle */}
                  <button onClick={() => toggleNightVision(cam.id)}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${nightMode ? 'bg-forest-green text-white' : 'bg-white/20 text-white/70 hover:bg-white/30'}`}>
                    {nightMode ? '🌙 IR' : '☀ Day'}
                  </button>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-critical animate-pulse"></div>
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">LIVE</span>
                  </div>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-charcoal/80 to-transparent">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isCritical ? 'bg-red-critical/80 text-white' : 'bg-forest-green/80 text-white'}`}>
                  {isCritical ? <AlertTriangle size={9} /> : <Eye size={9} />}
                  {isCritical ? 'ALERT ACTIVE' : 'AI DETECTION ACTIVE'}
                </div>
                <span className="text-[9px] font-mono text-white/60">{new Date().toLocaleTimeString()}</span>
              </div>
              {isCritical && <div className="absolute inset-0 border-2 border-red-critical/50 rounded-2xl animate-border-glow pointer-events-none"></div>}
            </div>
          );
        })}
      </div>

      {/* Camera list */}
      <div className="rounded-2xl border shadow-soft overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-1)' }}>All Camera Nodes</h3>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {displayCameras.map((cam: CameraObj, i: number) => {
            const nightMode = nightVision[cam.id] || false;
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-3 transition-colors cursor-pointer" onClick={() => setSelectedIncident({ cam_id: cam.id, location: cam.zone, animal: 'Wildlife', timestamp: new Date().toLocaleTimeString() })}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${cam.risk_level === 'CRITICAL' ? 'bg-red-critical animate-pulse' : cam.risk_level === 'HIGH' ? 'bg-amber-warning' : 'bg-moss-green'}`}></div>
                <Camera size={13} className="text-text-muted shrink-0" />
                <span className="text-xs font-black text-[var(--text-1)] font-mono w-16 shrink-0">{cam.id}</span>
                <span className="text-xs font-medium text-[var(--text-2)] flex-1 truncate">{cam.zone}</span>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${cam.risk_level === 'CRITICAL' ? 'bg-red-critical/10 text-red-critical' : cam.risk_level === 'HIGH' ? 'bg-amber-warning/10 text-amber-warning' : 'bg-forest-green/10 text-forest-green'}`}>{cam.risk_level || 'LOW'}</span>
                <button onClick={e => { e.stopPropagation(); toggleNightVision(cam.id); }}
                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${nightMode ? 'bg-forest-green text-white' : 'bg-sand text-[var(--text-2)] border border-[var(--border)]'}`}>
                  {nightMode ? '🌙 IR' : '☀ Day'}
                </button>
                <span className="text-[9px] font-bold text-moss-green">● ONLINE</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM VIEW — Hardware Architecture + Live Sign Simulation
// ══════════════════════════════════════════════════════════════════════════════
function SystemView() {
  const [demoMode, setDemoMode] = useState(false);
  const [activeNode, setActiveNode] = useState(-1);
  const [signState, setSignState] = useState<'NORMAL' | 'WARNING' | 'CRITICAL'>('WARNING');

  useEffect(() => {
    if (!demoMode) { setActiveNode(-1); return; }
    let idx = 0;
    const t = setInterval(() => { setActiveNode(idx); idx = (idx + 1) % 5; }, 700);
    return () => clearInterval(t);
  }, [demoMode]);

  const nodes = [
    { icon: Camera, label: 'CCTV Camera', sub: '4K · Night Vision · IP67' },
    { icon: Cpu, label: 'Edge AI Device', sub: 'Jetson Nano · YOLOv8' },
    { icon: ShieldAlert, label: 'Risk Engine', sub: 'Real-time scoring · API' },
    { icon: Wifi, label: 'ESP32 Controller', sub: 'Wireless MCU · V2X' },
    { icon: Zap, label: 'Warning System', sub: 'LED Sign · Buzzer · Alert' },
  ];

  const signConfig = {
    NORMAL: { bg: 'bg-forest-green', text: 'text-white', border: 'border-forest-green/60', message: 'ALL CLEAR', sub: 'HIGHWAY SAFE', icon: '✓', blink: false },
    WARNING: { bg: 'bg-charcoal', text: 'text-amber-warning', border: 'border-amber-warning/60', message: '⚠ CAUTION', sub: 'WILDLIFE ZONE', icon: '⚠', blink: true },
    CRITICAL: { bg: 'bg-charcoal', text: 'text-red-critical', border: 'border-red-critical/70', message: '🔴 STOP', sub: 'WILDLIFE ON ROAD', icon: '🔴', blink: true },
  };
  const sign = signConfig[signState];

  return (
    <div className="space-y-6 animate-in fade-in duration-400 pt-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[9px] font-bold tracking-[0.3em] text-forest-green uppercase mb-1">HARDWARE</p>
          <h1 className="text-2xl font-black text-[var(--text-1)] tracking-tight">System Architecture</h1>
        </div>
        <button onClick={() => setDemoMode(!demoMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${demoMode ? 'bg-amber-warning text-white' : 'bg-forest-green text-white hover:bg-moss-green'}`}>
          <Activity size={12} className={demoMode ? 'animate-pulse' : ''} />
          {demoMode ? 'Signal Active' : 'Animate Signal'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System diagram */}
        <div className="rounded-2xl border shadow-soft p-6 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col items-center gap-1">
            {nodes.map((node, i) => (
              <React.Fragment key={i}>
                <div className={`w-full max-w-xs p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${activeNode === i ? 'border-forest-green bg-forest-green/5 shadow-md' : i === nodes.length - 1 ? 'border-red-critical bg-red-critical/5' : 'border-[var(--border)] bg-[var(--surface-sunken)]'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeNode === i ? 'bg-forest-green text-white' : i === nodes.length - 1 ? 'bg-red-critical text-white' : 'bg-sand text-forest-green'}`}>
                    <node.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[var(--text-1)] uppercase tracking-wide">{node.label}</p>
                    <p className="text-[9px] font-medium text-[var(--text-3)] mt-0.5">{node.sub}</p>
                  </div>
                  {activeNode === i && <div className="w-2 h-2 rounded-full bg-forest-green animate-ping shrink-0"></div>}
                </div>
                {i < nodes.length - 1 && (
                  <div className="relative flex flex-col items-center h-8">
                    <div className={`w-0.5 h-full ${activeNode === i ? 'bg-forest-green' : 'bg-border-medium'} transition-colors duration-300`}></div>
                    {activeNode === i && demoMode && <div className="absolute top-0 w-2 h-2 rounded-full bg-forest-green animate-bounce"></div>}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right col: Specs + Live Sign Simulation */}
        <div className="space-y-4">
          {/* Live Sign Simulation */}
          <div className="rounded-2xl border shadow-soft p-5 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-1)' }}>Live Sign Simulation</h3>
              <div className="flex gap-1">
                {(['NORMAL', 'WARNING', 'CRITICAL'] as const).map(s => (
                  <button key={s} onClick={() => setSignState(s)}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${signState === s ? (s === 'NORMAL' ? 'bg-forest-green text-white' : s === 'WARNING' ? 'bg-amber-warning text-white' : 'bg-red-critical text-white') : 'bg-sand text-[var(--text-2)] border border-[var(--border)]'}`}>{s}</button>
                ))}
              </div>
            </div>
            {/* LED Display Board */}
            <div className={`rounded-2xl border-4 p-6 text-center shadow-inner relative overflow-hidden ${sign.bg} ${sign.border}`}>
              <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
              {/* LED dot row */}
              <div className="flex justify-center gap-1.5 mb-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${sign.blink ? 'animate-ping' : ''}`}
                    style={{ background: signState === 'NORMAL' ? '#86efac' : signState === 'WARNING' ? '#F59E0B' : '#E11D48', animationDelay: `${i * 0.1}s`, animationDuration: '1s' }}></div>
                ))}
              </div>
              <div className={`relative z-10 ${sign.text}`}>
                <p className="text-2xl font-black tracking-widest leading-tight"
                  style={{ textShadow: signState === 'NORMAL' ? '0 0 10px #86efac' : signState === 'WARNING' ? '0 0 10px #F59E0B' : '0 0 10px #E11D48' }}>
                  {sign.message}
                </p>
                <p className="text-sm font-black tracking-[0.3em] mt-1 opacity-90">{sign.sub}</p>
              </div>
              <div className="flex justify-center gap-1.5 mt-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${sign.blink ? 'animate-ping' : ''}`}
                    style={{ background: signState === 'NORMAL' ? '#86efac' : signState === 'WARNING' ? '#F59E0B' : '#E11D48', animationDelay: `${(7 - i) * 0.1}s`, animationDuration: '1s' }}></div>
                ))}
              </div>
            </div>
            <p className="text-[9px] font-bold text-[var(--text-3)] mt-2 text-center uppercase tracking-widest">Variable Message Sign (VMS) — LED Board Simulation</p>
          </div>

          {/* Specs */}
          <div className="rounded-2xl border shadow-soft p-5 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-1)] mb-4">System Specs</h3>
            <div className="space-y-2">
              {[
                { label: 'Detection Model', value: 'YOLOv8n · Custom Wildlife' },
                { label: 'Inference Speed', value: '< 50ms per frame' },
                { label: 'Alert Latency', value: '2.4s average' },
                { label: 'Camera Resolution', value: '4K · 30fps' },
                { label: 'Night Vision', value: 'IR · Up to 80m range' },
                { label: 'Connectivity', value: 'ESP32 · Wi-Fi · BLE' },
              ].map((spec, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest">{spec.label}</span>
                  <span className="text-xs font-bold text-[var(--text-1)]">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-forest-green/8 rounded-2xl border border-forest-green/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-moss-green animate-pulse"></div>
              <span className="text-[9px] font-black text-forest-green uppercase tracking-[0.2em]">System Health</span>
            </div>
            <div className="space-y-2">
              {[{ label: 'Camera Network', val: 100 }, { label: 'AI Engine', val: 98 }, { label: 'Alert System', val: 100 }, { label: 'Data Pipeline', val: 95 }].map((h, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[9px] font-bold mb-1">
                    <span className="text-text-secondary">{h.label}</span>
                    <span className="text-forest-green">{h.val}%</span>
                  </div>
                  <div className="h-1 bg-[var(--card-bg)]50 rounded-full overflow-hidden">
                    <div className="h-full bg-forest-green rounded-full transition-all duration-1000" style={{ width: `${h.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INCIDENT DRAWER
// ══════════════════════════════════════════════════════════════════════════════
function IncidentDrawer({ incident, onClose }: { incident: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 transition-colors" style={{ backgroundColor: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[8px] font-black tracking-[0.3em] uppercase text-forest-green mb-1">
                INCIDENT #{incident.id || 'EW-2048'}
              </p>
              <h2 className="text-xl font-black text-[var(--text-1)] flex items-center gap-2">
                <span>{animalEmoji(incident.animal || 'Deer')}</span>
                {incident.animal || 'Deer'} detected
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--surface-sunken)]/70 hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors">
              <X size={14} className="text-text-secondary" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Timestamp', value: incident.timestamp || '—', mono: true },
              { label: 'Camera', value: incident.cam_id || 'CAM-04', mono: true },
              { label: 'Zone', value: incident.location || incident.zone || 'Zone 04', mono: false },
              { label: 'Status', value: incident.outcome || 'REPORTED', mono: false },
            ].map((m, i) => (
              <div key={i} className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                <p className="text-[8px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-0.5">{m.label}</p>
                <p className={`text-xs font-bold text-[var(--text-1)] ${m.mono ? 'font-mono' : ''}`}>{m.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-forest-green/8 rounded-xl border border-forest-green/20">
              <p className="text-[8px] font-bold uppercase tracking-widest text-forest-green mb-0.5">AI Confidence</p>
              <p className="text-2xl font-black text-forest-green">{incident.confidence || 94}%</p>
            </div>
            <div className="p-3 bg-amber-warning/8 rounded-xl border border-amber-warning/20">
              <p className="text-[8px] font-bold uppercase tracking-widest text-amber-warning mb-0.5">Risk Score</p>
              <p className="text-2xl font-black text-amber-warning">{incident.collision_risk_pct || incident.risk_score || 87}<span className="text-sm font-bold text-[var(--text-3)]"> / 100</span></p>
            </div>
            <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-3)] mb-0.5">Distance</p>
              <p className="text-2xl font-black text-[var(--text-1)]">{incident.distance_m || 14.5}m</p>
            </div>
            <div className="p-3 bg-red-critical/8 rounded-xl border border-red-critical/20">
              <p className="text-[8px] font-bold uppercase tracking-widest text-red-critical mb-0.5">Urgency</p>
              <p className="text-sm font-black text-red-critical mt-1">{incident.urgency || 'HIGH'}</p>
            </div>
          </div>
          {incident.summary ? (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-forest-green mb-2">AI INCIDENT SUMMARY</p>
              <p className="text-xs font-medium text-[var(--text-2)] leading-relaxed italic">&ldquo;{incident.summary}&rdquo;</p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-forest-green mb-2">AI ANALYSIS</p>
              <p className="text-xs font-medium text-[var(--text-2)] leading-relaxed">Animal detected within the active vehicle corridor. Collision risk elevated due to proximity and vehicle approach rate. Immediate advisory issued to approaching vehicles.</p>
            </div>
          )}
          <div className="p-4 bg-forest-green/8 rounded-xl border border-forest-green/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-forest-green flex items-center justify-center shrink-0">
              <ShieldAlert size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-forest-green mb-0.5">Action Taken</p>
              <p className="text-xs font-bold text-[var(--text-1)]">{incident.action || incident.signage_message || 'Driver alert issued · Signage activated'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
