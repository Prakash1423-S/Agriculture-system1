/**
 * AgriMitra Node.js REST API & Static Server
 * Zero external dependencies (pure Node.js http, fs, path modules).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_DIR = path.join(__dirname, 'data');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf-8'));
}

const states = loadJson('states.json');
const crops = loadJson('crops.json');
const problems = loadJson('problems.json');
const schemes = loadJson('schemes.json');
const qaData = loadJson('qa_knowledge.json');
const caseStudy = loadJson('case_study.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function answerQuestion(q, stateId, cropId) {
  const qLower = (q || '').toLowerCase();
  let matchingPoints = [];
  let title = 'Agricultural Advisory';
  let summary = 'Scientific recommendation based on ICAR, SAUs, and KVK protocols.';

  for (const item of qaData.faq_intents || []) {
    for (const kw of item.keywords || []) {
      if (qLower.includes(kw.toLowerCase())) {
        title = item.title;
        summary = item.summary;
        matchingPoints.push(...item.points);
        break;
      }
    }
  }

  const cropObj = cropId ? crops.find(c => c.id === cropId) : crops.find(c => qLower.includes(c.name.toLowerCase().split(' ')[0]));
  const stateObj = stateId ? states.find(s => s.id === stateId) : states.find(s => qLower.includes(s.name.toLowerCase()));

  if (!matchingPoints.length) {
    matchingPoints = [
      'Maintain optimal plant spacing and avoid stagnant water in field to prevent root rotting pathogens.',
      'Conduct regular morning field scouting to detect early signs of sucking pests or fungal leaf spots.',
      'Ensure balanced N-P-K nutrition and apply Zinc Sulphate 21% @ 10 kg/acre to prevent micronutrient chlorosis.',
      'For localized pest outbreaks, spray Neem Oil 10,000 ppm @ 3 ml/L or consult local KVK scientists.',
      'In case of emergency crop loss, contact Kisan Call Centre (Toll-free: 1800-180-1551) or register claim on PMFBY within 72 hours.'
    ];
  }

  return {
    title,
    summary,
    advice_points: Array.from(new Set(matchingPoints)),
    crop_context: cropObj ? {
      name: cropObj.name,
      season: cropObj.season,
      fertilizer: cropObj.fertilizer_npk_kg_per_acre,
      irrigation: cropObj.irrigation_stages,
      top_pests: cropObj.top_pests_diseases
    } : null,
    state_context: stateObj ? {
      name: stateObj.name,
      zone: stateObj.agro_climatic_zone,
      rainfall: `${stateObj.annual_rainfall_mm} mm`,
      advisory: stateObj.key_advisory
    } : null,
    helpline: 'National Kisan Call Centre: 1800-180-1551 (Toll Free, 6 AM - 10 PM in 22 languages)'
  };
}

function diagnose(cropId, part, symptom) {
  const kw = (symptom || '').toLowerCase();
  let results = problems.filter(p => {
    let match = true;
    if (cropId && !p.affected_crops.some(c => c.toLowerCase().includes(cropId.toLowerCase()) || c === 'All crops')) {
      match = false;
    }
    if (part && part !== 'all' && !p.plant_part.toLowerCase().includes(part.toLowerCase())) {
      match = false;
    }
    if (kw.trim()) {
      const haystack = `${p.name} ${p.visual_symptoms} ${p.immediate_chemical_treatment} ${p.organic_biological_remedy}`.toLowerCase();
      if (!haystack.includes(kw)) match = false;
    }
    return match;
  });

  return results.length ? results : problems.slice(0, 3);
}

function calcFertilizer(cropId, acres) {
  const crop = crops.find(c => c.id === cropId) || crops[0];
  let urea = 80 * acres, dap = 50 * acres, mop = 30 * acres, zinc = 10 * acres, seed = 10 * acres;
  if (crop.id === 'rice') { urea = 90 * acres; dap = 40 * acres; mop = 25 * acres; seed = 15 * acres; }
  else if (crop.id === 'wheat') { urea = 110 * acres; dap = 55 * acres; mop = 20 * acres; seed = 40 * acres; }
  else if (crop.id === 'sugarcane') { urea = 175 * acres; dap = 75 * acres; mop = 60 * acres; seed = 3000 * acres; }
  else if (crop.id === 'cotton') { urea = 80 * acres; dap = 45 * acres; mop = 35 * acres; seed = 1.8 * acres; }
  else if (crop.id === 'potato') { urea = 80 * acres; dap = 75 * acres; mop = 50 * acres; seed = 1000 * acres; }
  else if (crop.id === 'chickpea') { urea = 15 * acres; dap = 40 * acres; mop = 15 * acres; seed = 35 * acres; }
  else if (crop.id === 'mustard') { urea = 50 * acres; dap = 40 * acres; mop = 15 * acres; seed = 2 * acres; }

  return {
    crop: crop.name,
    acres,
    urea_kg: Math.round(urea * 10) / 10,
    dap_kg: Math.round(dap * 10) / 10,
    mop_kg: Math.round(mop * 10) / 10,
    zinc_kg: Math.round(zinc * 10) / 10,
    seed_rate_approx: `${Math.round(seed * 10) / 10} kg`,
    schedule: 'Apply all DAP, MOP, Zinc and 1/3rd Urea at basal sowing; remaining 2/3rd Urea in two equal splits during active vegetative and tillering stages.'
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const [rawPath] = req.url.split('?');

  if (rawPath.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'GET') {
      if (rawPath === '/api/health') return res.end(JSON.stringify({ status: 'ok', time: new Date() }));
      if (rawPath === '/api/case-study') return res.end(JSON.stringify(caseStudy, null, 2));
      if (rawPath === '/api/states') return res.end(JSON.stringify(states, null, 2));
      if (rawPath.startsWith('/api/states/')) {
        const id = rawPath.replace('/api/states/', '');
        const st = states.find(s => s.id === id);
        return res.end(JSON.stringify(st || { error: 'State not found' }));
      }
      if (rawPath === '/api/crops') return res.end(JSON.stringify(crops, null, 2));
      if (rawPath.startsWith('/api/crops/')) {
        const id = rawPath.replace('/api/crops/', '');
        const cr = crops.find(c => c.id === id);
        return res.end(JSON.stringify(cr || { error: 'Crop not found' }));
      }
      if (rawPath === '/api/problems') return res.end(JSON.stringify(problems, null, 2));
      if (rawPath === '/api/schemes') return res.end(JSON.stringify(schemes, null, 2));
      return res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let payload = {};
        try { payload = JSON.parse(body || '{}'); } catch(e) {}

        if (rawPath === '/api/chat') {
          return res.end(JSON.stringify(answerQuestion(payload.question, payload.state, payload.crop), null, 2));
        }
        if (rawPath === '/api/problems/diagnose') {
          return res.end(JSON.stringify(diagnose(payload.crop, payload.part, payload.symptom), null, 2));
        }
        if (rawPath === '/api/calculator/fertilizer') {
          return res.end(JSON.stringify(calcFertilizer(payload.crop, parseFloat(payload.acres) || 1), null, 2));
        }
        return res.end(JSON.stringify({ error: 'Endpoint not found' }));
      });
      return;
    }
  }

  // Static files
  let safePath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\//, '');
  let fullPath = path.join(FRONTEND_DIR, safePath);

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 Not Found</h1>');
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(fullPath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`AgriMitra Node.js Server listening at http://127.0.0.1:${PORT}`);
});
