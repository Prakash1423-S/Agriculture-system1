/**
 * AgriMitra (KrishiSeva) - Frontend Application Controller
 * Handles UI interactions, reactive rendering, speech synthesis, and state management.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize API connection
  const isLive = await AgriAPI.init();
  updateBackendStatusIndicator(isLive);

  // 2. Setup Top Navigation
  setupNavigation();

  // 3. Initialize all modules
  initCaseStudy();
  initChatAdvisor();
  initStateExplorer();
  initCropEncyclopedia();
  initCropDoctor();
  initSchemes();
  initCalculator();

  console.log('AgriMitra Application initialized successfully.');
});

// Update connection pill in navbar
function updateBackendStatusIndicator(isLive) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (dot && text) {
    if (isLive) {
      dot.className = 'status-dot live';
      text.textContent = 'REST API Online';
    } else {
      dot.className = 'status-dot';
      text.textContent = 'Offline Engine Ready';
    }
  }
}

// Top Navigation Handler
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('data-target');

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      sections.forEach(sec => {
        if (sec.id === targetId) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Hero CTA buttons
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-goto');
      const navTarget = document.querySelector(`.nav-item[data-target="${target}"]`);
      if (navTarget) navTarget.click();
    });
  });
}

/* ==========================================================================
   MODULE 1: Case Study Presentation
   ========================================================================== */
async function initCaseStudy() {
  const data = await AgriAPI.getCaseStudy();
  if (!data) return;

  // Setup Case Study Tab Switching
  const csTabs = document.querySelectorAll('.cs-tab-btn');
  const csContents = document.querySelectorAll('.cs-tab-content');

  csTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabTarget = tab.getAttribute('data-cstab');
      csTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      csContents.forEach(c => {
        if (c.id === tabTarget) c.classList.add('active');
        else c.classList.remove('active');
      });
    });
  });

  // Render Challenges
  const challengesContainer = document.getElementById('csChallengesContainer');
  if (challengesContainer && data.challenges) {
    challengesContainer.innerHTML = data.challenges.map((c, i) => `
      <div class="card-item">
        <h4><span style="color:var(--accent-gold)">#0${i+1}</span> ${escapeHtml(c.title)}</h4>
        <p style="color:var(--text-muted); font-size:0.9rem;">${escapeHtml(c.description)}</p>
      </div>
    `).join('');
  }

  // Render Architecture Modules
  const archContainer = document.getElementById('csArchContainer');
  if (archContainer && data.solution_architecture && data.solution_architecture.core_modules) {
    archContainer.innerHTML = data.solution_architecture.core_modules.map((m, i) => `
      <div class="card-item">
        <h4><span style="color:var(--primary)">0${i+1}.</span> ${escapeHtml(m.name)}</h4>
        <p style="color:var(--text-muted); font-size:0.9rem;">${escapeHtml(m.description)}</p>
      </div>
    `).join('');
  }

  // Render Personas
  const personasContainer = document.getElementById('csPersonasContainer');
  if (personasContainer && data.personas) {
    personasContainer.innerHTML = data.personas.map(p => `
      <div class="persona-box">
        <h4 style="color:var(--primary-dark); margin-bottom:0.3rem;">${escapeHtml(p.role)}</h4>
        <p style="font-size:0.85rem; margin-bottom:0.3rem;"><strong>Need:</strong> ${escapeHtml(p.need)}</p>
        <p style="font-size:0.85rem; color:#065f46;"><strong>Value Delivered:</strong> ${escapeHtml(p.value_delivered)}</p>
      </div>
    `).join('');
  }

  // Render Impact Metrics
  const metricsContainer = document.getElementById('csMetricsContainer');
  if (metricsContainer && data.impact_metrics) {
    metricsContainer.innerHTML = data.impact_metrics.map(m => `
      <div class="metric-pill">
        <div class="num">${escapeHtml(m.metric)}</div>
        <div class="desc">${escapeHtml(m.label)}</div>
      </div>
    `).join('');
  }
}

/* ==========================================================================
   MODULE 2: Krishi AI Q&A Advisor
   ========================================================================== */
function initChatAdvisor() {
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatStateSelect = document.getElementById('chatStateSelect');
  const chatCropSelect = document.getElementById('chatCropSelect');
  const promptChips = document.querySelectorAll('.prompt-chip');

  // Populate Dropdowns
  AgriAPI.getStates().then(states => {
    if (chatStateSelect) {
      chatStateSelect.innerHTML = '<option value="">All India (Generic)</option>' +
        states.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
  });

  AgriAPI.getCrops().then(crops => {
    if (chatCropSelect) {
      chatCropSelect.innerHTML = '<option value="">All Crops</option>' +
        crops.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  });

  // Prompt chips click
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      if (chatInput) {
        chatInput.value = q;
        submitChat();
      }
    });
  });

  if (chatSendBtn) chatSendBtn.addEventListener('click', submitChat);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitChat();
    });
  }

  async function submitChat() {
    const q = (chatInput.value || '').trim();
    if (!q) return;

    const stateId = chatStateSelect ? chatStateSelect.value : '';
    const cropId = chatCropSelect ? chatCropSelect.value : '';

    // Render User Message
    appendMessage(q, 'user');
    chatInput.value = '';

    // Show temporary thinking indicator
    const tempId = 'bot-temp-' + Date.now();
    const tempBubble = document.createElement('div');
    tempBubble.id = tempId;
    tempBubble.className = 'chat-bubble bot';
    tempBubble.innerHTML = `<em>Thinking & consulting agronomy knowledgebase...</em>`;
    chatMessages.appendChild(tempBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Call API
    try {
      const response = await AgriAPI.askAdvisor(q, stateId, cropId);
      tempBubble.remove();
      renderBotResponse(response);
    } catch (err) {
      tempBubble.remove();
      appendMessage('Sorry, an error occurred while generating advisory. Please try again.', 'bot');
    }
  }

  function appendMessage(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderBotResponse(res) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';

    let html = `
      <div class="bot-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#059669"><path d="M12 2L1 21h22L12 2zm0 4.2L19.3 19H4.7L12 6.2zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
        ${escapeHtml(res.title || 'Agricultural Advisory')}
      </div>
      <div class="bot-summary">${escapeHtml(res.summary || '')}</div>
    `;

    if (res.advice_points && res.advice_points.length) {
      html += `<ul class="bot-points">`;
      res.advice_points.forEach(pt => {
        html += `<li>${escapeHtml(pt)}</li>`;
      });
      html += `</ul>`;
    }

    if (res.crop_context) {
      html += `
        <div class="bot-context-box">
          <strong>Crop Advice (${escapeHtml(res.crop_context.name)}):</strong>
          <div>NPK Fertilizer: ${escapeHtml(res.crop_context.fertilizer)}</div>
          <div>Irrigation: ${escapeHtml(res.crop_context.irrigation)}</div>
        </div>
      `;
    }

    if (res.state_context) {
      html += `
        <div class="bot-context-box">
          <strong>State Profile (${escapeHtml(res.state_context.name)}):</strong>
          <div>Zone: ${escapeHtml(res.state_context.zone)} | Avg Rain: ${escapeHtml(res.state_context.rainfall)}</div>
          <div style="margin-top:0.25rem;"><em>${escapeHtml(res.state_context.advisory)}</em></div>
        </div>
      `;
    }

    html += `
      <div class="chat-actions">
        <button class="btn-bubble-action speak-btn" title="Read Aloud">
          🔊 Speak
        </button>
        <button class="btn-bubble-action copy-btn" title="Copy to clipboard">
          📋 Copy
        </button>
      </div>
    `;

    bubble.innerHTML = html;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Speech & Copy Listeners
    const speakBtn = bubble.querySelector('.speak-btn');
    const copyBtn = bubble.querySelector('.copy-btn');

    if (speakBtn) {
      speakBtn.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const plainText = `${res.title}. ${res.summary}. ${res.advice_points ? res.advice_points.join('. ') : ''}`;
          const utterance = new SpeechSynthesisUtterance(plainText);
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const fullText = bubble.innerText;
        navigator.clipboard.writeText(fullText).then(() => {
          copyBtn.textContent = '✓ Copied';
          setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
        });
      });
    }
  }
}

/* ==========================================================================
   MODULE 3: India State & Area Explorer
   ========================================================================== */
async function initStateExplorer() {
  const statesGrid = document.getElementById('statesGrid');
  const stateSearchInput = document.getElementById('stateSearchInput');
  const regionPills = document.querySelectorAll('.region-pill');

  let currentRegion = 'all';
  let currentSearch = '';

  renderStates();

  regionPills.forEach(pill => {
    pill.addEventListener('click', () => {
      regionPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentRegion = pill.getAttribute('data-region');
      renderStates();
    });
  });

  if (stateSearchInput) {
    stateSearchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim();
      renderStates();
    });
  }

  async function renderStates() {
    const states = await AgriAPI.getStates(currentRegion, currentSearch);
    if (!statesGrid) return;

    if (!states.length) {
      statesGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted)">No states found matching your criteria.</div>`;
      return;
    }

    statesGrid.innerHTML = states.map(s => `
      <div class="state-card" data-state-id="${s.id}">
        <div>
          <div class="state-card-header">
            <div>
              <h3>${escapeHtml(s.name)}</h3>
              <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(s.region)}</span>
            </div>
            <span class="badge ${s.type === 'State' ? 'badge-state' : 'badge-ut'}">${escapeHtml(s.type)}</span>
          </div>

          <div class="state-info-row">
            <span class="state-info-label">Zone:</span>
            <span>${escapeHtml(s.agro_climatic_zone)}</span>
          </div>
          <div class="state-info-row">
            <span class="state-info-label">Soils:</span>
            <span>${escapeHtml(s.soil_types.slice(0, 2).join(', '))}</span>
          </div>
          <div class="state-info-row">
            <span class="state-info-label">Avg Rainfall:</span>
            <strong>${s.annual_rainfall_mm} mm</strong>
          </div>

          <div class="state-crops-tags">
            ${s.kharif_crops.slice(0, 3).map(c => `<span class="tag tag-kharif">K: ${escapeHtml(c)}</span>`).join('')}
            ${s.rabi_crops.slice(0, 2).map(c => `<span class="tag tag-rabi">R: ${escapeHtml(c)}</span>`).join('')}
          </div>

          <div class="state-advisory-snippet">
            💡 ${escapeHtml(s.key_advisory)}
          </div>
        </div>

        <button class="crop-detail-btn view-state-btn" data-id="${s.id}" style="margin-top:1rem;">
          View Full State Profile & Districts
        </button>
      </div>
    `).join('');

    // Attach click listeners to open modal
    document.querySelectorAll('.view-state-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openStateModal(id);
      });
    });
  }

  async function openStateModal(id) {
    const s = await AgriAPI.getStateById(id);
    if (!s) return;

    const modalBody = document.getElementById('modalContent');
    const modal = document.getElementById('appModal');

    modalBody.innerHTML = `
      <h2 style="color:var(--primary-dark); margin-bottom:0.25rem;">${escapeHtml(s.name)} (${escapeHtml(s.type)})</h2>
      <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1.25rem;">Capital: ${escapeHtml(s.capital)} | Region: ${escapeHtml(s.region)}</div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.25rem; font-size:0.88rem;">
        <div class="card-item">
          <strong>Agro-Climatic Zone:</strong>
          <p>${escapeHtml(s.agro_climatic_zone)}</p>
        </div>
        <div class="card-item">
          <strong>Annual Rainfall:</strong>
          <p style="font-size:1.2rem; font-weight:700; color:var(--primary);">${s.annual_rainfall_mm} mm</p>
        </div>
      </div>

      <div class="card-item" style="margin-bottom:1rem;">
        <strong>Dominant Soil Types:</strong>
        <p>${escapeHtml(s.soil_types.join(' • '))}</p>
      </div>

      <div class="card-item" style="margin-bottom:1rem;">
        <strong>Major Agricultural Districts / Belts:</strong>
        <p>${escapeHtml(s.major_districts.join(', '))}</p>
      </div>

      <div class="card-item" style="margin-bottom:1rem;">
        <strong>Irrigation Network:</strong>
        <p>${escapeHtml(s.irrigation_sources.join(', '))}</p>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; margin-bottom:1rem;">
        <div class="card-item" style="background:#ecfdf5;">
          <strong style="color:#065f46;">Kharif Crops:</strong>
          <p style="font-size:0.85rem;">${escapeHtml(s.kharif_crops.join(', '))}</p>
        </div>
        <div class="card-item" style="background:#eff6ff;">
          <strong style="color:#1e40af;">Rabi Crops:</strong>
          <p style="font-size:0.85rem;">${escapeHtml(s.rabi_crops.join(', '))}</p>
        </div>
        <div class="card-item" style="background:#fffbeb;">
          <strong style="color:#92400e;">Horticulture & Cash:</strong>
          <p style="font-size:0.85rem;">${escapeHtml(s.horticulture ? s.horticulture.join(', ') : 'Vegetables')}</p>
        </div>
      </div>

      <div class="card-item" style="border-left:4px solid var(--danger); margin-bottom:1rem;">
        <strong style="color:var(--danger);">Regional Challenges:</strong>
        <ul style="margin-left:1.2rem; font-size:0.85rem; margin-top:0.3rem;">
          ${s.challenges.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
        </ul>
      </div>

      <div class="card-item" style="background:#f0fdf4; border:1px solid #bbf7d0; margin-bottom:1rem;">
        <strong style="color:var(--primary-dark);">State Expert Advisory:</strong>
        <p style="font-size:0.9rem; margin-top:0.3rem;">${escapeHtml(s.key_advisory)}</p>
      </div>

      <div style="font-size:0.8rem; color:var(--text-light);">
        <strong>Agricultural Universities & Research Centers:</strong> ${escapeHtml(s.institutions.join(' | '))}
      </div>
    `;

    modal.classList.add('active');
  }
}

/* ==========================================================================
   MODULE 4: Crop Encyclopedia
   ========================================================================== */
async function initCropEncyclopedia() {
  const cropsGrid = document.getElementById('cropsGrid');
  const cropCategoryPills = document.querySelectorAll('.crop-cat-pill');
  const cropSearchInput = document.getElementById('cropSearchInput');

  let currentCategory = 'all';
  let currentSearch = '';

  renderCrops();

  cropCategoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      cropCategoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-cat');
      renderCrops();
    });
  });

  if (cropSearchInput) {
    cropSearchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim();
      renderCrops();
    });
  }

  async function renderCrops() {
    const crops = await AgriAPI.getCrops(currentCategory, currentSearch);
    if (!cropsGrid) return;

    if (!crops.length) {
      cropsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted)">No crops found matching your selection.</div>`;
      return;
    }

    cropsGrid.innerHTML = crops.map(c => `
      <div class="crop-card">
        <div class="crop-card-top">
          <div>
            <h3>${escapeHtml(c.name)}</h3>
            <div class="crop-sci-name">${escapeHtml(c.scientific_name)}</div>
          </div>
          <span class="badge" style="background:var(--primary-subtle); color:var(--primary-dark);">${escapeHtml(c.category)}</span>
        </div>

        <div class="crop-metric-grid">
          <div class="crop-metric-item">
            <span>Season:</span>
            <strong>${escapeHtml(c.season.split('(')[0])}</strong>
          </div>
          <div class="crop-metric-item">
            <span>Soil pH:</span>
            <strong>${escapeHtml(c.soil_ph)}</strong>
          </div>
          <div class="crop-metric-item">
            <span>Temperature:</span>
            <strong>${escapeHtml(c.temperature_range_c)}</strong>
          </div>
          <div class="crop-metric-item">
            <span>Avg Yield / Acre:</span>
            <strong>${escapeHtml(c.average_yield_per_acre.split('(')[0])}</strong>
          </div>
        </div>

        <div style="font-size:0.8rem; margin-bottom:0.75rem; color:var(--text-muted);">
          <strong>Major States:</strong> ${escapeHtml(c.major_producing_states.slice(0, 3).join(', '))}
        </div>

        <button class="crop-detail-btn view-crop-btn" data-crop-id="${c.id}">
          Full Cultivation Package & Pest Guide
        </button>
      </div>
    `).join('');

    document.querySelectorAll('.view-crop-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-crop-id');
        openCropModal(id);
      });
    });
  }

  async function openCropModal(id) {
    const c = await AgriAPI.getCropById(id);
    if (!c) return;

    const modalBody = document.getElementById('modalContent');
    const modal = document.getElementById('appModal');

    modalBody.innerHTML = `
      <h2 style="color:var(--primary-dark); margin-bottom:0.25rem;">${escapeHtml(c.name)}</h2>
      <div style="font-style:italic; font-size:0.95rem; color:var(--text-muted); margin-bottom:1rem;">${escapeHtml(c.scientific_name)} | ${escapeHtml(c.category)}</div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; margin-bottom:1.25rem; font-size:0.85rem;">
        <div class="card-item">
          <strong>Season:</strong>
          <p>${escapeHtml(c.season)}</p>
        </div>
        <div class="card-item">
          <strong>Soil pH:</strong>
          <p style="font-weight:700; color:var(--primary);">${escapeHtml(c.soil_ph)}</p>
        </div>
        <div class="card-item">
          <strong>Optimal Temp:</strong>
          <p>${escapeHtml(c.temperature_range_c)}</p>
        </div>
        <div class="card-item">
          <strong>Rainfall Need:</strong>
          <p>${escapeHtml(c.rainfall_requirement_mm)}</p>
        </div>
      </div>

      <div class="card-item" style="margin-bottom:1rem;">
        <strong>Ideal Soil & Land Preparation:</strong>
        <p style="font-size:0.88rem; margin-top:0.25rem;">${escapeHtml(c.ideal_soil)}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem; font-size:0.85rem;">
        <div class="card-item">
          <strong>Sowing Window:</strong>
          <p>${escapeHtml(c.sowing_window)}</p>
          <strong style="display:block; margin-top:0.5rem;">Seed Rate:</strong>
          <p>${escapeHtml(c.seed_rate_per_acre)}</p>
        </div>
        <div class="card-item">
          <strong>Harvesting Window:</strong>
          <p>${escapeHtml(c.harvesting_window)}</p>
          <strong style="display:block; margin-top:0.5rem;">Spacing (R x P):</strong>
          <p>${escapeHtml(c.spacing_cm)}</p>
        </div>
      </div>

      <div class="card-item" style="background:#ecfdf5; border-color:#a7f3d0; margin-bottom:1rem;">
        <strong style="color:#065f46;">Recommended Fertilizer Schedule (NPK per Acre):</strong>
        <p style="font-size:0.9rem; margin-top:0.3rem;">${escapeHtml(c.fertilizer_npk_kg_per_acre)}</p>
      </div>

      <div class="card-item" style="margin-bottom:1rem;">
        <strong>Critical Irrigation Stages:</strong>
        <p style="font-size:0.88rem; margin-top:0.25rem;">${escapeHtml(c.irrigation_stages)}</p>
      </div>

      <div class="card-item" style="border-left:4px solid var(--danger); margin-bottom:1rem;">
        <strong style="color:var(--danger);">Major Pests & Diseases:</strong>
        <p style="font-size:0.88rem; margin-top:0.25rem;">${escapeHtml(c.top_pests_diseases.join(' • '))}</p>
      </div>

      <div class="card-item" style="background:#fffbeb; margin-bottom:1rem;">
        <strong style="color:#92400e;">Harvesting Indicators:</strong>
        <p style="font-size:0.88rem; margin-top:0.25rem;">${escapeHtml(c.harvesting_indicators)}</p>
      </div>
    `;

    modal.classList.add('active');
  }
}

/* ==========================================================================
   MODULE 5: Crop Doctor & Diagnostics
   ========================================================================== */
function initCropDoctor() {
  const diagCropSelect = document.getElementById('diagCropSelect');
  const diagPartSelect = document.getElementById('diagPartSelect');
  const diagSymptomInput = document.getElementById('diagSymptomInput');
  const btnDiagnose = document.getElementById('btnDiagnose');
  const diagResults = document.getElementById('diagResults');

  // Populate Crop Select
  AgriAPI.getCrops().then(crops => {
    if (diagCropSelect) {
      diagCropSelect.innerHTML = '<option value="">All Crops</option>' +
        crops.map(c => `<option value="${c.name.split(' ')[0]}">${c.name}</option>`).join('');
    }
  });

  if (btnDiagnose) {
    btnDiagnose.addEventListener('click', runDiagnostics);
  }

  // Run on start
  runDiagnostics();

  async function runDiagnostics() {
    const crop = diagCropSelect ? diagCropSelect.value : '';
    const part = diagPartSelect ? diagPartSelect.value : 'all';
    const symptom = diagSymptomInput ? diagSymptomInput.value.trim() : '';

    if (!diagResults) return;

    diagResults.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted)">Diagnosing symptoms against pathological models...</div>`;

    const problems = await AgriAPI.diagnose(crop, part, symptom);

    if (!problems.length) {
      diagResults.innerHTML = `
        <div class="card-item" style="text-align:center; padding:2rem;">
          <h4>No Exact Match Found</h4>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem;">
            Please try broader keywords (e.g., 'curl', 'yellow', 'spot', 'rot', 'borer') or consult the Krishi AI Q&A tab for instant live analysis.
          </p>
        </div>
      `;
      return;
    }

    diagResults.innerHTML = problems.map(p => `
      <div class="problem-card">
        <div class="problem-header">
          <div class="problem-title">
            <h3>${escapeHtml(p.name)}</h3>
            <span class="problem-type">${escapeHtml(p.type)} (${escapeHtml(p.scientific_name || '')})</span>
          </div>
          <span class="badge" style="background:#fee2e2; color:#991b1b;">High Priority</span>
        </div>

        <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;">
          <strong>Affected Plant Part:</strong> ${escapeHtml(p.plant_part)} | <strong>Crops:</strong> ${escapeHtml(p.affected_crops.join(', '))}
        </div>

        <div class="problem-symptoms-box">
          <strong>Visual Symptoms:</strong> ${escapeHtml(p.visual_symptoms)}
        </div>

        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.75rem;">
          <strong>Favorable Weather Triggers:</strong> ${escapeHtml(p.favorable_conditions)}
        </div>

        <div class="remedies-grid">
          <div class="remedy-box remedy-chemical">
            <h4>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
              Immediate Chemical Treatment
            </h4>
            <p>${escapeHtml(p.immediate_chemical_treatment)}</p>
          </div>

          <div class="remedy-box remedy-organic">
            <h4>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/></svg>
              Eco-Friendly / Organic Remedy
            </h4>
            <p>${escapeHtml(p.organic_biological_remedy)}</p>
          </div>

          <div class="remedy-box remedy-preventive">
            <h4>🛡️ Agronomic Preventive Measures</h4>
            <p>${escapeHtml(p.preventive_measures)}</p>
          </div>
        </div>
      </div>
    `).join('');
  }
}

/* ==========================================================================
   MODULE 6: Government Schemes & Subsidies
   ========================================================================== */
async function initSchemes() {
  const schemesGrid = document.getElementById('schemesGrid');
  const schemeSearchInput = document.getElementById('schemeSearchInput');

  renderSchemes();

  if (schemeSearchInput) {
    schemeSearchInput.addEventListener('input', () => {
      renderSchemes(schemeSearchInput.value.trim());
    });
  }

  async function renderSchemes(search = '') {
    const schemes = await AgriAPI.getSchemes('all', search);
    if (!schemesGrid) return;

    schemesGrid.innerHTML = schemes.map(s => `
      <div class="scheme-card">
        <div class="scheme-card-header">
          <span class="scheme-cat">${escapeHtml(s.category)}</span>
          <h3>${escapeHtml(s.name)}</h3>
          <span style="font-size:0.75rem; color:var(--text-light);">${escapeHtml(s.ministry)}</span>
        </div>

        <div class="scheme-benefit-box">
          <strong>Key Financial / Material Benefit:</strong>
          <p style="margin-top:0.25rem;">${escapeHtml(s.benefit)}</p>
        </div>

        <div style="font-size:0.85rem; margin-bottom:0.75rem;">
          <strong>Eligibility:</strong>
          <p style="color:var(--text-muted); margin-top:0.2rem;">${escapeHtml(s.eligibility)}</p>
        </div>

        <div class="scheme-doc-list">
          <strong>Mandatory Documents:</strong>
          <ul>
            ${s.documents_required.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
          </ul>
        </div>

        <div style="font-size:0.82rem; margin-bottom:1rem; color:var(--text-main);">
          <strong>Application Process:</strong>
          <p style="color:var(--text-muted); margin-top:0.2rem;">${escapeHtml(s.application_procedure)}</p>
        </div>

        <div class="scheme-helpline">
          📞 ${escapeHtml(s.helpline)}
        </div>
      </div>
    `).join('');
  }
}

/* ==========================================================================
   MODULE 7: Fertilizer & Seed Rate Calculator
   ========================================================================== */
function initCalculator() {
  const calcCropSelect = document.getElementById('calcCropSelect');
  const calcAcresInput = document.getElementById('calcAcresInput');
  const btnRunCalc = document.getElementById('btnRunCalc');
  const calcResultsBox = document.getElementById('calcResultsBox');

  AgriAPI.getCrops().then(crops => {
    if (calcCropSelect) {
      calcCropSelect.innerHTML = crops.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  });

  if (btnRunCalc) {
    btnRunCalc.addEventListener('click', async () => {
      const cropId = calcCropSelect ? calcCropSelect.value : 'wheat';
      const acres = calcAcresInput ? parseFloat(calcAcresInput.value) || 1 : 1;

      const res = await AgriAPI.calculateFertilizer(cropId, acres);

      // 1 bag Urea = 45 kg, 1 bag DAP = 50 kg, 1 bag MOP = 50 kg
      const ureaBags = (res.urea_kg / 45).toFixed(1);
      const dapBags = (res.dap_kg / 50).toFixed(1);
      const mopBags = (res.mop_kg / 50).toFixed(1);

      document.getElementById('calcResCropName').textContent = `${res.crop} (${res.acres} Acre${res.acres > 1 ? 's' : ''})`;
      document.getElementById('calcResUrea').textContent = `${res.urea_kg} kg (~${ureaBags} bags)`;
      document.getElementById('calcResDap').textContent = `${res.dap_kg} kg (~${dapBags} bags)`;
      document.getElementById('calcResMop').textContent = `${res.mop_kg} kg (~${mopBags} bags)`;
      document.getElementById('calcResZinc').textContent = `${res.zinc_kg} kg`;
      document.getElementById('calcResSeed').textContent = res.seed_rate_approx;
      document.getElementById('calcResSchedule').textContent = res.schedule;

      calcResultsBox.classList.add('active');
    });
  }
}

// Modal Close logic
document.addEventListener('click', (e) => {
  const modal = document.getElementById('appModal');
  if (e.target.classList.contains('modal-close') || e.target === modal) {
    modal.classList.remove('active');
  }
});

// Utility to escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
