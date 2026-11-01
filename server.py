#!/usr/bin/env python3
"""
AgriMitra Python REST API & Static File Server
Zero-dependency server using Python's standard library (http.server, json, urllib).
"""

import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime

PORT = 8080
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

STATES = load_json("states.json")
CROPS = load_json("crops.json")
PROBLEMS = load_json("problems.json")
SCHEMES = load_json("schemes.json")
QA_DATA = load_json("qa_knowledge.json")
CASE_STUDY = load_json("case_study.json")

print(f"Loaded {len(STATES)} States/UTs, {len(CROPS)} Crops, {len(PROBLEMS)} Problems, {len(SCHEMES)} Schemes.")

def answer_agri_question(question, state_id=None, crop_id=None):
    q_lower = question.lower()
    matching_points = []
    matched_title = "Agricultural Advisory"
    matched_summary = "Scientific recommendation based on ICAR, SAUs, and KVK protocols."

    for item in QA_DATA.get("faq_intents", []):
        for kw in item.get("keywords", []):
            if kw.lower() in q_lower:
                matched_title = item.get("title", matched_title)
                matched_summary = item.get("summary", matched_summary)
                matching_points.extend(item.get("points", []))
                break

    crop_obj = None
    if crop_id:
        crop_obj = next((c for c in CROPS if c["id"] == crop_id), None)
    else:
        for c in CROPS:
            if c["name"].lower().split()[0] in q_lower:
                crop_obj = c
                break

    state_obj = None
    if state_id:
        state_obj = next((s for s in STATES if s["id"] == state_id), None)
    else:
        for s in STATES:
            if s["name"].lower() in q_lower:
                state_obj = s
                break

    if not matching_points:
        matching_points = [
            "Maintain optimal plant spacing and avoid stagnant water in field to prevent root rotting pathogens.",
            "Conduct regular morning field scouting to detect early signs of sucking pests or fungal leaf spots.",
            "Ensure balanced N-P-K nutrition and apply Zinc Sulphate 21% @ 10 kg/acre to prevent micronutrient chlorosis.",
            "For localized pest outbreaks, spray Neem Oil 10,000 ppm @ 3 ml/L or consult local KVK scientists.",
            "In case of emergency crop loss, contact Kisan Call Centre (Toll-free: 1800-180-1551) or register claim on PMFBY within 72 hours."
        ]

    crop_context = None
    if crop_obj:
        crop_context = {
            "name": crop_obj["name"],
            "season": crop_obj["season"],
            "fertilizer": crop_obj["fertilizer_npk_kg_per_acre"],
            "irrigation": crop_obj["irrigation_stages"],
            "top_pests": crop_obj["top_pests_diseases"]
        }

    state_context = None
    if state_obj:
        state_context = {
            "name": state_obj["name"],
            "zone": state_obj["agro_climatic_zone"],
            "rainfall": f"{state_obj['annual_rainfall_mm']} mm",
            "advisory": state_obj["key_advisory"]
        }

    return {
        "title": matched_title,
        "summary": matched_summary,
        "advice_points": list(dict.fromkeys(matching_points)),
        "crop_context": crop_context,
        "state_context": state_context,
        "helpline": "National Kisan Call Centre: 1800-180-1551 (Toll Free, 6 AM - 10 PM in 22 languages)"
    }

def diagnose_problem(crop_id, part, symptom_keyword):
    results = []
    kw_lower = (symptom_keyword or "").lower()

    for prob in PROBLEMS:
        match = True
        if crop_id:
            crop_match = any(crop_id.lower() in ac.lower() or ac == "All crops" for ac in prob.get("affected_crops", []))
            if not crop_match:
                match = False

        if part and part != "all":
            if part.lower() not in prob.get("plant_part", "").lower():
                match = False

        if kw_lower and kw_lower.strip():
            haystack = f"{prob.get('name','')} {prob.get('visual_symptoms','')} {prob.get('immediate_chemical_treatment','')} {prob.get('organic_biological_remedy','')}".lower()
            if kw_lower not in haystack:
                match = False

        if match:
            results.append(prob)

    if not results:
        results = PROBLEMS[:3]
    return results

def calculate_fertilizer(crop_id, acres):
    crop = next((c for c in CROPS if c["id"] == crop_id), CROPS[0])
    urea, dap, mop, zinc, seed = 80 * acres, 50 * acres, 30 * acres, 10 * acres, 10 * acres
    c_id = crop["id"]
    if c_id == "rice":
        urea, dap, mop, seed = 90 * acres, 40 * acres, 25 * acres, 15 * acres
    elif c_id == "wheat":
        urea, dap, mop, seed = 110 * acres, 55 * acres, 20 * acres, 40 * acres
    elif c_id == "sugarcane":
        urea, dap, mop, seed = 175 * acres, 75 * acres, 60 * acres, 3000 * acres
    elif c_id == "cotton":
        urea, dap, mop, seed = 80 * acres, 45 * acres, 35 * acres, 1.8 * acres
    elif c_id == "potato":
        urea, dap, mop, seed = 80 * acres, 75 * acres, 50 * acres, 1000 * acres
    elif c_id == "chickpea":
        urea, dap, mop, seed = 15 * acres, 40 * acres, 15 * acres, 35 * acres
    elif c_id == "mustard":
        urea, dap, mop, seed = 50 * acres, 40 * acres, 15 * acres, 2 * acres

    return {
        "crop": crop["name"],
        "acres": acres,
        "urea_kg": round(urea, 1),
        "dap_kg": round(dap, 1),
        "mop_kg": round(mop, 1),
        "zinc_kg": round(zinc, 1),
        "seed_rate_approx": f"{round(seed, 1)} kg",
        "schedule": "Apply all DAP, MOP, Zinc and 1/3rd Urea at basal sowing; remaining 2/3rd Urea in two equal splits during active vegetative and tillering stages."
    }

class AgriRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()

            if path == "/api/health":
                res = {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
            elif path == "/api/case-study":
                res = CASE_STUDY
            elif path == "/api/states":
                res = STATES
            elif path.startswith("/api/states/"):
                s_id = path[len("/api/states/"):]
                s = next((x for x in STATES if x["id"] == s_id), None)
                res = s if s else {"error": "State not found"}
            elif path == "/api/crops":
                res = CROPS
            elif path.startswith("/api/crops/"):
                c_id = path[len("/api/crops/"):]
                c = next((x for x in CROPS if x["id"] == c_id), None)
                res = c if c else {"error": "Crop not found"}
            elif path == "/api/problems":
                res = PROBLEMS
            elif path == "/api/schemes":
                res = SCHEMES
            else:
                res = {"error": "Endpoint not found"}

            self.wfile.write(json.dumps(res, indent=2).encode("utf-8"))
        else:
            if path == "/" or not path:
                target_file = os.path.join(FRONTEND_DIR, "index.html")
            else:
                rel = path.lstrip("/")
                target_file = os.path.join(FRONTEND_DIR, rel)

            if os.path.isfile(target_file):
                ext = os.path.splitext(target_file)[1].lower()
                mime = {
                    ".html": "text/html",
                    ".css": "text/css",
                    ".js": "application/javascript",
                    ".json": "application/json",
                    ".svg": "image/svg+xml",
                    ".png": "image/png"
                }.get(ext, "application/octet-stream")

                self.send_response(200)
                self.send_header("Content-Type", f"{mime}; charset=utf-8")
                self.end_headers()
                with open(target_file, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"<h1>404 Not Found</h1>")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()

        if path == "/api/chat":
            q = data.get("question", "What fertilizer should I use?")
            s_id = data.get("state")
            c_id = data.get("crop")
            res = answer_agri_question(q, s_id, c_id)
        elif path == "/api/problems/diagnose":
            c_id = data.get("crop")
            part = data.get("part")
            sym = data.get("symptom")
            res = diagnose_problem(c_id, part, sym)
        elif path == "/api/calculator/fertilizer":
            c_id = data.get("crop", "wheat")
            acres = float(data.get("acres", 1.0))
            res = calculate_fertilizer(c_id, acres)
        else:
            res = {"error": "Unknown POST endpoint"}

        self.wfile.write(json.dumps(res, indent=2).encode("utf-8"))

if __name__ == "__main__":
    with socketserver.TCPServer(("0.0.0.0", PORT), AgriRequestHandler) as httpd:
        print(f"AgriMitra Python Server listening at http://127.0.0.1:{PORT}/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
