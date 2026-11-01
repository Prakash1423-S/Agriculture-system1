/**
 * AgriMitra API Client & Data Layer
 * Seamlessly switches between live backend REST API and embedded offline repository.
 */

const AgriAPI = (function () {
  let isBackendLive = false;
  let backendBaseUrl = window.location.origin;

  // Check if we are running from http(s) vs file://
  const isHttp = window.location.protocol.startsWith('http');

  async function checkBackend() {
    if (!isHttp) {
      isBackendLive = false;
      return false;
    }
    try {
      const res = await fetch(`${backendBaseUrl}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        isBackendLive = data && data.status === 'ok';
      } else {
        isBackendLive = false;
      }
    } catch (e) {
      isBackendLive = false;
    }
    return isBackendLive;
  }

  function getLocalData() {
    return window.AGRI_DATA || {
      states: [],
      crops: [],
      problems: [],
      schemes: [],
      qa: {},
      caseStudy: {}
    };
  }

  return {
    isLive: () => isBackendLive,
    init: checkBackend,

    async getCaseStudy() {
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/case-study`);
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn('API fetch failed, using offline data', e);
        }
      }
      return getLocalData().caseStudy;
    },

    async getStates(region = 'all', searchQuery = '') {
      let data = [];
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/states`);
          if (res.ok) data = await res.json();
        } catch (e) {}
      }
      if (!data.length) data = getLocalData().states || [];

      return data.filter(st => {
        const matchesRegion = region === 'all' || st.region.toLowerCase().includes(region.toLowerCase());
        const matchesSearch = !searchQuery || 
          st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          st.major_districts.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
          st.agro_climatic_zone.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRegion && matchesSearch;
      });
    },

    async getStateById(id) {
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/states/${id}`);
          if (res.ok) return await res.json();
        } catch (e) {}
      }
      return (getLocalData().states || []).find(s => s.id === id);
    },

    async getCrops(category = 'all', searchQuery = '') {
      let data = [];
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/crops`);
          if (res.ok) data = await res.json();
        } catch (e) {}
      }
      if (!data.length) data = getLocalData().crops || [];

      return data.filter(cr => {
        const matchesCat = category === 'all' || cr.category.toLowerCase().includes(category.toLowerCase());
        const matchesSearch = !searchQuery ||
          cr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cr.scientific_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cr.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
      });
    },

    async getCropById(id) {
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/crops/${id}`);
          if (res.ok) return await res.json();
        } catch (e) {}
      }
      return (getLocalData().crops || []).find(c => c.id === id);
    },

    async getProblems() {
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/problems`);
          if (res.ok) return await res.json();
        } catch (e) {}
      }
      return getLocalData().problems || [];
    },

    async diagnose(cropId, plantPart, symptomKeyword) {
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/problems/diagnose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crop: cropId, part: plantPart, symptom: symptomKeyword })
          });
          if (res.ok) return await res.json();
        } catch (e) {}
      }

      // Offline Fallback Diagnostics
      const problems = getLocalData().problems || [];
      const kw = (symptomKeyword || '').toLowerCase().trim();
      let results = problems.filter(p => {
        let match = true;
        if (cropId && !p.affected_crops.some(c => c.toLowerCase().includes(cropId.toLowerCase()) || c === 'All crops')) {
          match = false;
        }
        if (plantPart && plantPart !== 'all' && !p.plant_part.toLowerCase().includes(plantPart.toLowerCase())) {
          match = false;
        }
        if (kw) {
          const haystack = `${p.name} ${p.visual_symptoms} ${p.immediate_chemical_treatment} ${p.organic_biological_remedy}`.toLowerCase();
          if (!haystack.includes(kw)) match = false;
        }
        return match;
      });

      return results.length ? results : problems.slice(0, 3);
    },

    async askAdvisor(question, stateId = '', cropId = '') {
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, state: stateId, crop: cropId })
          });
          if (res.ok) return await res.json();
        } catch (e) {}
      }

      // Offline Fallback Advisor
      const qLower = (question || '').toLowerCase();
      const qaData = getLocalData().qa || {};
      const crops = getLocalData().crops || [];
      const states = getLocalData().states || [];

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
    },

    async getSchemes(category = 'all', searchQuery = '') {
      let data = [];
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/schemes`);
          if (res.ok) data = await res.json();
        } catch (e) {}
      }
      if (!data.length) data = getLocalData().schemes || [];

      return data.filter(sc => {
        const matchesCat = category === 'all' || sc.category.toLowerCase().includes(category.toLowerCase());
        const matchesSearch = !searchQuery ||
          sc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sc.benefit.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
      });
    },

    async calculateFertilizer(cropId, acres) {
      if (isBackendLive) {
        try {
          const res = await fetch(`${backendBaseUrl}/api/calculator/fertilizer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crop: cropId, acres })
          });
          if (res.ok) return await res.json();
        } catch (e) {}
      }

      // Offline Fallback Calculation
      const crops = getLocalData().crops || [];
      const crop = crops.find(c => c.id === cropId) || crops[0] || { name: 'Field Crop', id: 'crop' };
      const ac = parseFloat(acres) || 1.0;

      let urea = 80 * ac, dap = 50 * ac, mop = 30 * ac, zinc = 10 * ac, seed = 10 * ac;
      if (crop.id === 'rice') { urea = 90 * ac; dap = 40 * ac; mop = 25 * ac; seed = 15 * ac; }
      else if (crop.id === 'wheat') { urea = 110 * ac; dap = 55 * ac; mop = 20 * ac; seed = 40 * ac; }
      else if (crop.id === 'sugarcane') { urea = 175 * ac; dap = 75 * ac; mop = 60 * ac; seed = 3000 * ac; }
      else if (crop.id === 'cotton') { urea = 80 * ac; dap = 45 * ac; mop = 35 * ac; seed = 1.8 * ac; }
      else if (crop.id === 'potato') { urea = 80 * ac; dap = 75 * ac; mop = 50 * ac; seed = 1000 * ac; }
      else if (crop.id === 'chickpea') { urea = 15 * ac; dap = 40 * ac; mop = 15 * ac; seed = 35 * ac; }
      else if (crop.id === 'mustard') { urea = 50 * ac; dap = 40 * ac; mop = 15 * ac; seed = 2 * ac; }

      return {
        crop: crop.name,
        acres: ac,
        urea_kg: Math.round(urea * 10) / 10,
        dap_kg: Math.round(dap * 10) / 10,
        mop_kg: Math.round(mop * 10) / 10,
        zinc_kg: Math.round(zinc * 10) / 10,
        seed_rate_approx: `${Math.round(seed * 10) / 10} kg`,
        schedule: 'Apply all DAP, MOP, Zinc and 1/3rd Urea at basal sowing; remaining 2/3rd Urea in two equal splits during active vegetative and tillering stages.'
      };
    }
  };
})();
