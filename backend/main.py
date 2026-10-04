from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional
import datetime
import random
import math

app = FastAPI(title="EcoWild AI Backend", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# IN-MEMORY STATE
# ─────────────────────────────────────────────

CAMERAS_DB = [
    {
        "id": "CAM-01", "location": "NH-44 River Crossing KM 42",
        "zone": "Zone 1 - Riverine Wetland", "status": "Online",
        "detections": 39, "risk_level": "LOW", "fps": 30,
        "battery": 98, "temp": "27°C", "night_vision": True, "sensitivity": 88,
        "coordinates": {"lat": 21.1458, "lng": 79.0882}
    },
    {
        "id": "CAM-02", "location": "NH-44 Forest Buffer KM 58",
        "zone": "Zone 2 - Dense Forest Canopy", "status": "Online",
        "detections": 82, "risk_level": "HIGH", "fps": 30,
        "battery": 88, "temp": "31°C", "night_vision": True, "sensitivity": 92,
        "coordinates": {"lat": 21.1685, "lng": 79.1120}
    },
    {
        "id": "CAM-03", "location": "NH-44 Underpass Approach KM 74",
        "zone": "Zone 3 - Wildlife Eco-Duct", "status": "Online",
        "detections": 22, "risk_level": "LOW", "fps": 30,
        "battery": 97, "temp": "28°C", "night_vision": False, "sensitivity": 85,
        "coordinates": {"lat": 21.1920, "lng": 79.1415}
    },
    {
        "id": "CAM-04", "location": "NH-44 Critical Gap KM 89",
        "zone": "Zone 4 - Elephant Migration Corridor", "status": "Online",
        "detections": 148, "risk_level": "CRITICAL", "fps": 30,
        "battery": 92, "temp": "29°C", "night_vision": True, "sensitivity": 96,
        "coordinates": {"lat": 21.2210, "lng": 79.1750}
    },
    {
        "id": "CAM-05", "location": "NH-44 Hillock S-Bend KM 97",
        "zone": "Zone 5 - Rocky Escarpment", "status": "Online",
        "detections": 63, "risk_level": "HIGH", "fps": 30,
        "battery": 95, "temp": "30°C", "night_vision": True, "sensitivity": 94,
        "coordinates": {"lat": 21.2460, "lng": 79.2010}
    },
    {
        "id": "CAM-06", "location": "NH-44 Open Grassland KM 112",
        "zone": "Zone 6 - Deer Grazing Plains", "status": "Online",
        "detections": 91, "risk_level": "MEDIUM", "fps": 29,
        "battery": 91, "temp": "32°C", "night_vision": True, "sensitivity": 90,
        "coordinates": {"lat": 21.2780, "lng": 79.2340}
    }
]

DETECTIONS_LOG = [
    {
        "id": "DET-9821", "cam_id": "CAM-04",
        "zone": "Zone 4 - Elephant Migration Corridor",
        "animal": "Asian Elephant", "confidence": 0.96,
        "distance_m": 14.5, "vehicle_speed_kmh": 88,
        "risk_level": "CRITICAL", "timestamp": "23:42:10",
        "action_taken": "VMS Signboard Activated & Highway Acoustic Chirp Broadcast",
        "bbox": [22, 24, 25, 45]
    },
    {
        "id": "DET-9820", "cam_id": "CAM-02",
        "zone": "Zone 2 - Dense Forest Canopy",
        "animal": "Spotted Deer Herd", "confidence": 0.94,
        "distance_m": 6.8, "vehicle_speed_kmh": 75,
        "risk_level": "HIGH", "timestamp": "23:38:45",
        "action_taken": "Connected Car In-Cab HUD Warning Pushed to 8 Approaching Vehicles",
        "bbox": [48, 38, 28, 30]
    },
    {
        "id": "DET-9819", "cam_id": "CAM-05",
        "zone": "Zone 5 - Rocky Escarpment",
        "animal": "Indian Leopard", "confidence": 0.91,
        "distance_m": 11.2, "vehicle_speed_kmh": 70,
        "risk_level": "HIGH", "timestamp": "23:25:12",
        "action_taken": "Emergency Forest Patrol Interceptor Alert Dispatched",
        "bbox": [52, 38, 20, 22]
    },
    {
        "id": "DET-9818", "cam_id": "CAM-06",
        "zone": "Zone 6 - Deer Grazing Plains",
        "animal": "Wild Boar Sounder", "confidence": 0.88,
        "distance_m": 21.0, "vehicle_speed_kmh": 68,
        "risk_level": "MEDIUM", "timestamp": "23:14:08",
        "action_taken": "Sector Advisory Speed Reduced to 45 km/h",
        "bbox": [40, 50, 22, 25]
    },
    {
        "id": "DET-9817", "cam_id": "CAM-01",
        "zone": "Zone 1 - Riverine Wetland",
        "animal": "Nilgai (Blue Bull)", "confidence": 0.92,
        "distance_m": 42.0, "vehicle_speed_kmh": 60,
        "risk_level": "LOW", "timestamp": "22:50:33",
        "action_taken": "Passive Telemetry Logged; Animal Moving Away from Barrier",
        "bbox": [35, 60, 24, 28]
    }
]

ACTIVE_ALERTS = [
    {
        "id": "ALT-704", "cam_id": "CAM-04", "animal": "Asian Elephant",
        "location": "KM 89 — Sector 4 Barrier", "distance_m": 14.5,
        "time_to_collision_sec": 3.4, "urgency": "CRITICAL",
        "recommended_speed": 30,
        "signage_message": "⚠️ CRITICAL: ELEPHANT AT CARRIAGEWAY KM 89 — SLOW TO 30 KM/H IMMEDIATELY",
        "timestamp": "23:42:10"
    }
]

DRIVER_RESPONSES = [
    {"vehicle_id": "KA-01-MJ-8821", "type": "Interstate Volvo Bus", "status": "Decelerated (Hazard On)", "time": "23:42:19", "speed_reduction": "88 -> 32 km/h"},
    {"vehicle_id": "MH-12-PQ-4019", "type": "Multi-Axle Freight Truck", "status": "Decelerated (HUD Alert Acknowledged)", "time": "23:42:25", "speed_reduction": "76 -> 30 km/h"},
]

INCIDENTS_LOG = [
    {
        "id": "EW-2041", "cam_id": "CAM-04", "animal": "Asian Elephant",
        "zone": "Zone 4 - Elephant Migration Corridor", "timestamp": "23:42:10",
        "collision_risk_pct": 94, "action": "VMS + Acoustic Chirp", "outcome": "Averted",
        "summary": "Adult male elephant detected 14.5m from carriageway. Vehicle approaching at 88 km/h. Collision risk elevated to CRITICAL. VMS boards deployed; driver decelerated to 32 km/h. Animal safely crossed 40 seconds post-alert."
    },
    {
        "id": "EW-2040", "cam_id": "CAM-02", "animal": "Spotted Deer Herd",
        "zone": "Zone 2 - Dense Forest Canopy", "timestamp": "23:38:45",
        "collision_risk_pct": 81, "action": "HUD Warning", "outcome": "Averted",
        "summary": "Herd of 4 spotted deer on road shoulder at 6.8m. 8 connected vehicles received HUD alerts. All vehicles slowed; no contact."
    },
    {
        "id": "EW-2039", "cam_id": "CAM-05", "animal": "Indian Leopard",
        "zone": "Zone 5 - Rocky Escarpment", "timestamp": "23:25:12",
        "collision_risk_pct": 76, "action": "Emergency Patrol", "outcome": "Averted",
        "summary": "Leopard detected resting on road surface. Forest Patrol Unit FP-07 dispatched and confirmed clearance within 6 minutes."
    }
]

# ─────────────────────────────────────────────
# PREDICTIVE HOTSPOT DATA
# ─────────────────────────────────────────────

HOTSPOT_DATA = [
    {
        "zone": "Zone 4 - Elephant Migration Corridor",
        "cam_id": "CAM-04", "risk_score": 94,
        "peak_hours": "20:00–23:00",
        "dominant_species": "Asian Elephant",
        "monthly_events": 148,
        "trend": "INCREASING",
        "recommendation": "Deploy permanent speed advisory signs; evaluate wildlife underpass"
    },
    {
        "zone": "Zone 2 - Dense Forest Canopy",
        "cam_id": "CAM-02", "risk_score": 78,
        "peak_hours": "18:00–21:00",
        "dominant_species": "Spotted Deer",
        "monthly_events": 82,
        "trend": "STABLE",
        "recommendation": "Increase monitoring frequency; install reflective delineators"
    },
    {
        "zone": "Zone 5 - Rocky Escarpment",
        "cam_id": "CAM-05", "risk_score": 71,
        "peak_hours": "19:00–22:00",
        "dominant_species": "Indian Leopard",
        "monthly_events": 63,
        "trend": "INCREASING",
        "recommendation": "Install wildlife-exclusion fencing; evaluate patrol routes"
    },
    {
        "zone": "Zone 6 - Deer Grazing Plains",
        "cam_id": "CAM-06", "risk_score": 62,
        "peak_hours": "17:00–20:00",
        "dominant_species": "Wild Boar",
        "monthly_events": 91,
        "trend": "STABLE",
        "recommendation": "Add solar-powered blinking amber signs"
    },
    {
        "zone": "Zone 1 - Riverine Wetland",
        "cam_id": "CAM-01", "risk_score": 28,
        "peak_hours": "06:00–08:00",
        "dominant_species": "Nilgai",
        "monthly_events": 39,
        "trend": "DECREASING",
        "recommendation": "Continue passive monitoring; area trending safer"
    },
    {
        "zone": "Zone 3 - Wildlife Eco-Duct",
        "cam_id": "CAM-03", "risk_score": 18,
        "peak_hours": "04:00–07:00",
        "dominant_species": "Wild Boar",
        "monthly_events": 22,
        "trend": "STABLE",
        "recommendation": "Eco-duct operating effectively; maintain current intervention level"
    }
]

# ─────────────────────────────────────────────
# WILDLIFE CORRIDOR DETECTION DATA
# ─────────────────────────────────────────────

CORRIDOR_DATA = [
    {
        "corridor_id": "WC-ALPHA",
        "name": "Northern Elephant Migration Corridor",
        "cameras": ["CAM-02", "CAM-04", "CAM-05"],
        "species": "Asian Elephant",
        "confidence": 91,
        "direction": "NE → SW",
        "events_last_30d": 48,
        "status": "CONFIRMED",
        "description": "Repeated detections on CAM-02 → CAM-04 → CAM-05 over 48 events suggest active migration corridor. Recommend corridor protection zone and permanent infrastructure."
    },
    {
        "corridor_id": "WC-BETA",
        "name": "Deer Grazing Lateral Crossing",
        "cameras": ["CAM-05", "CAM-06"],
        "species": "Spotted Deer",
        "confidence": 74,
        "direction": "E → W",
        "events_last_30d": 29,
        "status": "PROBABLE",
        "description": "Lateral crossing pattern between zones 5 and 6. Deer likely moving between water source and grazing land. Monitoring recommended."
    },
    {
        "corridor_id": "WC-GAMMA",
        "name": "Predator Patrol Route - Escarpment",
        "cameras": ["CAM-03", "CAM-05"],
        "species": "Indian Leopard",
        "confidence": 62,
        "direction": "N → S",
        "events_last_30d": 14,
        "status": "POSSIBLE",
        "description": "Occasional leopard sightings along rocky escarpment zone suggest nocturnal patrol route. Requires 30 more days of data for confirmation."
    }
]

# ─────────────────────────────────────────────
# ZONE RECOMMENDATIONS
# ─────────────────────────────────────────────

ZONE_RECOMMENDATIONS = {
    "CAM-01": {
        "zone": "Zone 1 - Riverine Wetland",
        "risk_level": "LOW",
        "actions": [
            {"priority": "LOW", "action": "Continue passive AI telemetry monitoring"},
            {"priority": "LOW", "action": "Assess seasonal flooding impact on animal crossings"},
            {"priority": "INFO", "action": "Data collection target: 30 more days for trend confirmation"}
        ]
    },
    "CAM-02": {
        "zone": "Zone 2 - Dense Forest Canopy",
        "risk_level": "HIGH",
        "actions": [
            {"priority": "HIGH", "action": "Install wildlife warning signage at KM 55 and KM 61"},
            {"priority": "HIGH", "action": "Increase monitoring frequency to every 4 seconds"},
            {"priority": "MEDIUM", "action": "Evaluate fencing near camera 02 approach"},
            {"priority": "MEDIUM", "action": "Deploy reflective wildlife delineators on road shoulder"},
            {"priority": "LOW", "action": "Continue data collection for seasonal trend analysis"}
        ]
    },
    "CAM-03": {
        "zone": "Zone 3 - Wildlife Eco-Duct",
        "risk_level": "LOW",
        "actions": [
            {"priority": "INFO", "action": "Eco-duct performing effectively — animal crossings diverted successfully"},
            {"priority": "LOW", "action": "Upgrade CAM-03 to night-vision enabled hardware"},
            {"priority": "LOW", "action": "Quarterly structural inspection of underpass recommended"}
        ]
    },
    "CAM-04": {
        "zone": "Zone 4 - Elephant Migration Corridor",
        "risk_level": "CRITICAL",
        "actions": [
            {"priority": "CRITICAL", "action": "Install permanent overhead VMS signage at KM 86 and KM 92"},
            {"priority": "CRITICAL", "action": "Evaluate wildlife underpass / overpass feasibility study"},
            {"priority": "HIGH", "action": "Increase patrol frequency during 20:00–23:00 peak hours"},
            {"priority": "HIGH", "action": "Assess barrier fencing along 2km stretch near CAM-04"},
            {"priority": "MEDIUM", "action": "Coordinate with Forest Department for elephant telemetry collars"},
            {"priority": "LOW", "action": "Continue data collection for 60 days for seasonal pattern confirmation"}
        ]
    },
    "CAM-05": {
        "zone": "Zone 5 - Rocky Escarpment",
        "risk_level": "HIGH",
        "actions": [
            {"priority": "HIGH", "action": "Deploy solar-powered amber blinking signs 300m before blind curve"},
            {"priority": "HIGH", "action": "Increase monitoring during 19:00–22:00 peak hours"},
            {"priority": "MEDIUM", "action": "Assess wildlife-exclusion fencing feasibility near camera 05"},
            {"priority": "MEDIUM", "action": "Evaluate patrol route for Forest Ranger Unit FP-07"},
            {"priority": "LOW", "action": "Continue wildlife corridor tracking for 30 additional days"}
        ]
    },
    "CAM-06": {
        "zone": "Zone 6 - Deer Grazing Plains",
        "risk_level": "MEDIUM",
        "actions": [
            {"priority": "MEDIUM", "action": "Install solar-powered blinking amber signs at KM 109 and KM 115"},
            {"priority": "MEDIUM", "action": "Increase monitoring during 17:00–20:00 active grazing hours"},
            {"priority": "LOW", "action": "Assess water source distance from road — potential attraction factor"},
            {"priority": "LOW", "action": "Continue data collection and trend analysis for 30 days"}
        ]
    }
}

# ─────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────

class CameraUpdate(BaseModel):
    night_vision: Optional[bool] = None
    sensitivity: Optional[int] = None
    status: Optional[str] = None

class SimulationRequest(BaseModel):
    animal: str
    cam_id: str
    risk_level: str
    distance_m: float
    vehicle_speed_kmh: float

class CollisionRiskRequest(BaseModel):
    animal: str
    distance_m: float
    vehicle_speed_kmh: float
    time_of_day: Optional[str] = "day"  # "day" | "night"
    animal_size: Optional[str] = "medium"  # "small" | "medium" | "large"

class WhatIfRequest(BaseModel):
    vehicle_speed_kmh: float
    animal_distance_m: float
    time_of_day: str  # "day" | "night"

class DriverFeedbackRequest(BaseModel):
    vehicle_id: str
    action: str
    current_speed: float

# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

def compute_collision_risk(distance_m: float, speed_kmh: float, time_of_day: str = "day", animal_size: str = "medium") -> dict:
    """
    Physics-based collision risk scoring:
    - Braking distance at given speed
    - Time to impact
    - Animal size penalty
    - Night-time visibility penalty
    """
    speed_ms = speed_kmh / 3.6
    reaction_time_s = 1.5  # typical driver reaction
    decel_g = 0.7  # braking deceleration (g)
    decel_ms2 = decel_g * 9.81

    # Braking distance = v²/(2a)
    braking_distance_m = (speed_ms ** 2) / (2 * decel_ms2)
    # Stopping distance = reaction distance + braking distance
    reaction_dist = speed_ms * reaction_time_s
    total_stopping_m = reaction_dist + braking_distance_m

    # Time to impact (if no braking)
    time_to_impact_s = round(distance_m / max(speed_ms, 0.1), 1)

    # Base risk from stopping distance vs distance
    ratio = total_stopping_m / max(distance_m, 1)
    base_risk = min(ratio * 55, 95)

    # Animal size modifier
    size_mod = {"small": 0.85, "medium": 1.0, "large": 1.18}.get(animal_size, 1.0)
    # Night modifier
    night_mod = 1.25 if time_of_day == "night" else 1.0

    raw_risk = base_risk * size_mod * night_mod
    risk_pct = round(min(raw_risk, 99), 1)

    if risk_pct >= 75:
        level = "CRITICAL"
        action = "Emergency Brake Now — Hazard Lights On"
        speed_rec = 30
    elif risk_pct >= 50:
        level = "HIGH"
        action = "Reduce Speed Immediately — Stay Alert"
        speed_rec = 45
    elif risk_pct >= 30:
        level = "MEDIUM"
        action = "Reduce Speed & Increase Following Distance"
        speed_rec = 60
    else:
        level = "LOW"
        action = "Caution — Monitor and Prepare to Brake"
        speed_rec = 80

    return {
        "risk_pct": risk_pct,
        "risk_level": level,
        "recommended_action": action,
        "recommended_speed_kmh": speed_rec,
        "time_to_impact_sec": time_to_impact_s,
        "stopping_distance_m": round(total_stopping_m, 1),
        "braking_distance_m": round(braking_distance_m, 1),
        "is_stoppable": total_stopping_m < distance_m
    }

# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "system": "EcoWild AI Smart Highway Command API",
        "status": "Operational",
        "active_cameras": len(CAMERAS_DB),
        "version": "3.0.0",
        "features": [
            "live_monitoring", "collision_risk_engine", "predictive_hotspots",
            "wildlife_corridors", "zone_recommendations", "what_if_simulator",
            "incident_summaries", "heatmap_data", "intervention_impact"
        ]
    }

@app.get("/cameras")
def get_cameras():
    return CAMERAS_DB

@app.patch("/cameras/{cam_id}")
def update_camera(cam_id: str, update: CameraUpdate):
    for cam in CAMERAS_DB:
        if cam["id"] == cam_id:
            if update.night_vision is not None:
                cam["night_vision"] = update.night_vision
            if update.sensitivity is not None:
                cam["sensitivity"] = update.sensitivity
            if update.status is not None:
                cam["status"] = update.status
            return {"success": True, "camera": cam}
    raise HTTPException(status_code=404, detail="Camera not found")

@app.get("/detections")
def get_detections():
    return DETECTIONS_LOG

@app.post("/detections/simulate")
def simulate_detection(req: SimulationRequest):
    risk_data = compute_collision_risk(req.distance_m, req.vehicle_speed_kmh)
    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    cam = next((c for c in CAMERAS_DB if c["id"] == req.cam_id), CAMERAS_DB[0])

    new_det = {
        "id": f"DET-{random.randint(8500, 9999)}",
        "cam_id": req.cam_id,
        "zone": cam["zone"],
        "animal": req.animal,
        "confidence": round(random.uniform(0.88, 0.98), 2),
        "distance_m": req.distance_m,
        "vehicle_speed_kmh": req.vehicle_speed_kmh,
        "risk_level": req.risk_level,
        "timestamp": now_str,
        "action_taken": "VMS Emergency Advisory & Driver Audio Alert Triggered",
        "bbox": [
            random.randint(120, 260), random.randint(140, 240),
            random.randint(140, 260), random.randint(120, 220)
        ]
    }
    DETECTIONS_LOG.insert(0, new_det)
    if len(DETECTIONS_LOG) > 50:
        DETECTIONS_LOG.pop()

    for c in CAMERAS_DB:
        if c["id"] == req.cam_id:
            c["detections"] += 1
            c["risk_level"] = req.risk_level

    if req.risk_level in ["HIGH", "CRITICAL", "MEDIUM"]:
        alt = {
            "id": f"ALT-{random.randint(105, 999)}",
            "cam_id": req.cam_id,
            "animal": req.animal,
            "location": f"{cam['location']} ({cam['zone']})",
            "distance_m": req.distance_m,
            "time_to_collision_sec": risk_data["time_to_impact_sec"],
            "urgency": "CRITICAL" if req.risk_level in ["HIGH", "CRITICAL"] else "WARNING",
            "recommended_speed": risk_data["recommended_speed_kmh"],
            "signage_message": f"WILDLIFE ALERT: {req.animal.upper()} DETECTED — SLOW DOWN IMMEDIATELY",
            "timestamp": now_str
        }
        ACTIVE_ALERTS.insert(0, alt)
        if len(ACTIVE_ALERTS) > 10:
            ACTIVE_ALERTS.pop()

        # Auto-generate incident summary
        incident = {
            "id": f"EW-{random.randint(2050, 2999)}",
            "cam_id": req.cam_id,
            "animal": req.animal,
            "zone": cam["zone"],
            "timestamp": now_str,
            "collision_risk_pct": risk_data["risk_pct"],
            "action": "VMS + Driver HUD Alert",
            "outcome": "Pending",
            "summary": (
                f"{req.animal} detected {req.distance_m}m from carriageway at {cam['location']}. "
                f"Approaching vehicle speed: {req.vehicle_speed_kmh} km/h. "
                f"Collision risk calculated at {risk_data['risk_pct']}% ({risk_data['risk_level']}). "
                f"VMS boards activated; recommended speed advisory: {risk_data['recommended_speed_kmh']} km/h. "
                f"Event logged to {cam['zone']} wildlife-risk dataset."
            )
        }
        INCIDENTS_LOG.insert(0, incident)
        if len(INCIDENTS_LOG) > 20:
            INCIDENTS_LOG.pop()

    return {"success": True, "detection": new_det}

@app.get("/alerts")
def get_alerts():
    return ACTIVE_ALERTS

@app.delete("/alerts/{alert_id}")
def dismiss_alert(alert_id: str):
    global ACTIVE_ALERTS
    ACTIVE_ALERTS = [a for a in ACTIVE_ALERTS if a["id"] != alert_id]
    return {"success": True, "message": f"Alert {alert_id} cleared"}

@app.get("/analytics")
def get_analytics():
    return {
        "stats": {
            "wildlife_events_today": 342,
            "drivers_alerted": 2490,
            "high_risk_prevented": 54,
            "avg_alert_latency_ms": 320,
            "animal_mortality_reduction_pct": 89.4,
            "economic_damage_averted_inr": "₹ 1.48 Crore",
            "fuel_saved_liters": 3840,
            "co2_reduction_kg": 8830
        },
        "species_breakdown": [
            {"name": "Spotted Deer", "value": 44, "color": "#10b981"},
            {"name": "Asian Elephant", "value": 18, "color": "#f59e0b"},
            {"name": "Wild Boar", "value": 22, "color": "#06b6d4"},
            {"name": "Leopard / Big Cat", "value": 6, "color": "#ef4444"},
            {"name": "Nilgai / Cattle", "value": 10, "color": "#8b5cf6"}
        ],
        "hourly_activity": [
            {"hour": "00:00", "detections": 38, "riskEvents": 14},
            {"hour": "03:00", "detections": 45, "riskEvents": 18},
            {"hour": "06:00", "detections": 29, "riskEvents": 8},
            {"hour": "09:00", "detections": 12, "riskEvents": 2},
            {"hour": "12:00", "detections": 8, "riskEvents": 1},
            {"hour": "15:00", "detections": 14, "riskEvents": 4},
            {"hour": "18:00", "detections": 52, "riskEvents": 22},
            {"hour": "21:00", "detections": 68, "riskEvents": 31},
        ],
        "monthly_accidents_comparison": [
            {"month": "May", "without_ai": 19, "with_ai": 3},
            {"month": "Jun", "without_ai": 22, "with_ai": 2},
            {"month": "Jul", "without_ai": 31, "with_ai": 4},
            {"month": "Aug", "without_ai": 28, "with_ai": 3},
            {"month": "Sep", "without_ai": 26, "with_ai": 1}
        ]
    }

# ─── NEW FEATURE ENDPOINTS ───────────────────

@app.get("/hotspots")
def get_predictive_hotspots():
    """Predictive wildlife hotspot analysis from historical detections."""
    return {
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "model": "EcoWild Temporal Pattern Classifier v2.1",
        "note": "Simulation — predictions based on 90-day historical telemetry",
        "hotspots": HOTSPOT_DATA
    }

@app.get("/heatmap")
def get_heatmap():
    """Zone-wise wildlife activity heatmap data."""
    heatmap = []
    for cam in CAMERAS_DB:
        risk_num = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(cam["risk_level"], 1)
        heatmap.append({
            "cam_id": cam["id"],
            "zone": cam["zone"],
            "location": cam["location"],
            "coordinates": cam["coordinates"],
            "activity_score": cam["detections"],
            "risk_level": cam["risk_level"],
            "risk_num": risk_num,
            "dominant_time": "20:00–23:00" if risk_num >= 3 else "06:00–09:00"
        })
    return heatmap

@app.post("/collision-risk")
def calculate_collision_risk(req: CollisionRiskRequest):
    """Physics-based collision risk calculator."""
    size_map = {
        "Asian Elephant": "large", "Wild Boar": "medium", "Wild Boar Family": "medium",
        "Wild Boar Sounder": "medium", "Spotted Deer": "small", "Spotted Deer Herd": "small",
        "Indian Leopard": "medium", "Nilgai (Blue Bull)": "large", "Sambar Deer": "medium"
    }
    animal_size = size_map.get(req.animal, req.animal_size or "medium")
    result = compute_collision_risk(
        req.distance_m, req.vehicle_speed_kmh, req.time_of_day, animal_size
    )
    return {
        "animal": req.animal,
        "distance_m": req.distance_m,
        "vehicle_speed_kmh": req.vehicle_speed_kmh,
        "time_of_day": req.time_of_day,
        **result
    }

@app.post("/what-if")
def what_if_simulator(req: WhatIfRequest):
    """What-if scenario simulator — returns risk for given conditions."""
    # Estimate animal size as medium for generic simulation
    result = compute_collision_risk(req.animal_distance_m, req.vehicle_speed_kmh, req.time_of_day, "medium")
    return {
        "scenario": {
            "vehicle_speed_kmh": req.vehicle_speed_kmh,
            "animal_distance_m": req.animal_distance_m,
            "time_of_day": req.time_of_day
        },
        **result
    }

@app.get("/corridors")
def get_wildlife_corridors():
    """Detected wildlife movement corridors."""
    return {
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "note": "Corridor detection based on repeated sequential camera sightings over 30 days",
        "corridors": CORRIDOR_DATA
    }

@app.get("/incidents")
def get_incidents():
    """AI-generated incident summaries."""
    return INCIDENTS_LOG

@app.get("/zone-recommendations/{cam_id}")
def get_zone_recommendations(cam_id: str):
    """AI-generated zone-specific action recommendations."""
    rec = ZONE_RECOMMENDATIONS.get(cam_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"No recommendations for {cam_id}")
    return rec

@app.get("/zone-recommendations")
def get_all_zone_recommendations():
    """All zone recommendations."""
    return ZONE_RECOMMENDATIONS

@app.get("/intervention-impact")
def get_intervention_impact():
    """Estimated impact comparison: with vs without AI intervention."""
    return {
        "note": "Simulation/Prototype Estimate — not verified accident reduction data",
        "disclaimer": "These figures are modeled projections based on detection rates and industry benchmarks. Actual outcomes require long-term field validation.",
        "comparison": {
            "without_ai": {
                "wildlife_alerts": 0,
                "driver_warnings": 0,
                "avg_response_time_sec": None,
                "risk_events_flagged": 0,
                "estimated_collisions_per_month": 24,
                "animal_mortality_rate_pct": "High (est. baseline)"
            },
            "with_ai": {
                "wildlife_alerts": 342,
                "driver_warnings": 2490,
                "avg_response_time_sec": 2.4,
                "risk_events_flagged": 54,
                "estimated_collisions_per_month": 2,
                "animal_mortality_rate_pct": "89.4% reduction (modeled)"
            }
        },
        "monthly_trend": [
            {"month": "May 2026", "alerts_issued": 186, "drivers_warned": 1420, "risk_events": 28},
            {"month": "Jun 2026", "alerts_issued": 208, "drivers_warned": 1640, "risk_events": 32},
            {"month": "Jul 2026", "alerts_issued": 251, "drivers_warned": 1980, "risk_events": 41},
            {"month": "Aug 2026", "alerts_issued": 298, "drivers_warned": 2210, "risk_events": 48},
            {"month": "Sep 2026", "alerts_issued": 342, "drivers_warned": 2490, "risk_events": 54}
        ]
    }

@app.post("/driver-feedback")
def submit_driver_feedback(req: DriverFeedbackRequest):
    entry = {
        "vehicle_id": req.vehicle_id,
        "type": "Connected Vehicle",
        "status": req.action,
        "time": datetime.datetime.now().strftime("%H:%M:%S"),
        "speed_reduction": f"{req.current_speed} -> 35 km/h"
    }
    DRIVER_RESPONSES.insert(0, entry)
    if len(DRIVER_RESPONSES) > 20:
        DRIVER_RESPONSES.pop()
    return {"success": True, "log": entry}

@app.get("/driver-responses")
def get_driver_responses():
    return DRIVER_RESPONSES

@app.get("/export-csv")
def export_csv():
    csv_lines = ["Detection_ID,Camera_ID,Zone,Animal,Confidence,Distance_M,Speed_KMH,Risk_Level,Timestamp,Action"]
    for d in DETECTIONS_LOG:
        csv_lines.append(
            f"{d['id']},{d['cam_id']},{d['zone']},{d['animal']},"
            f"{d['confidence']},{d['distance_m']},{d['vehicle_speed_kmh']},"
            f"{d['risk_level']},{d['timestamp']},\"{d['action_taken']}\""
        )
    return PlainTextResponse(
        content="\n".join(csv_lines),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ecowild_incident_report.csv"}
    )
