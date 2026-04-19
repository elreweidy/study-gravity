/* ============================================
   Study Antigravity — Core Application Logic
   ============================================ */

// --- Configuration ---
const CONFIG = {
  STORAGE_KEY: 'study-antigravity-progress',
  STATUS_CYCLE: ['not-started', 'in-progress', 'completed'],
  STATUS_LABELS: {
    'not-started': '○ Start Learning',
    'in-progress': '◐ In Progress',
    'completed': '● Completed'
  }
};

// ============================================
// ProgressTracker — localStorage persistence
// ============================================
class ProgressTracker {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  _save() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.data));
  }

  getStatus(topicId) {
    return this.data[topicId]?.status || 'not-started';
  }

  setStatus(topicId, status) {
    if (!this.data[topicId]) this.data[topicId] = {};
    this.data[topicId].status = status;
    this.data[topicId].lastUpdated = Date.now();
    this._save();
  }

  cycleStatus(topicId) {
    const current = this.getStatus(topicId);
    const idx = CONFIG.STATUS_CYCLE.indexOf(current);
    const next = CONFIG.STATUS_CYCLE[(idx + 1) % CONFIG.STATUS_CYCLE.length];
    this.setStatus(topicId, next);
    return next;
  }

  setLastVisited(topicId) {
    if (!this.data[topicId]) this.data[topicId] = {};
    this.data[topicId].lastVisited = Date.now();
    this._save();
  }

  getTimeSpent(topicId) {
    return this.data[topicId]?.timeSpentSeconds || 0;
  }

  addTimeSpent(topicId, seconds) {
    if (!this.data[topicId]) this.data[topicId] = {};
    const current = this.data[topicId].timeSpentSeconds || 0;
    this.data[topicId].timeSpentSeconds = current + seconds;
    
    // Auto start if tracking time
    if (this.getStatus(topicId) === 'not-started') {
        this.setStatus(topicId, 'in-progress');
    }
    this._save();
  }

  getCompletedCount() {
    return Object.values(this.data).filter(e => e.status === 'completed').length;
  }

  getInProgressCount() {
    return Object.values(this.data).filter(e => e.status === 'in-progress').length;
  }

  getRecentlyStudied(limit = 5) {
    return Object.entries(this.data)
      .filter(([, v]) => v.lastVisited)
      .sort((a, b) => b[1].lastVisited - a[1].lastVisited)
      .slice(0, limit)
      .map(([id]) => id);
  }
}

// ============================================
// RoadmapManager — loads & queries roadmap.json
// ============================================
class RoadmapManager {
  constructor() {
    this.data = null;
    this._topicIndex = new Map();
    this._orderedTopics = [];
  }

  async load() {
    const res = await fetch('roadmap.json');
    if (!res.ok) throw new Error('Failed to load roadmap.json');
    this.data = await res.json();
    this._buildIndex();
  }

  _buildIndex() {
    this._orderedTopics = [];
    for (const cat of this.data.categories) {
      for (const topic of cat.topics) {
        const enriched = { ...topic, categoryId: cat.id, categoryName: cat.name, categoryIcon: cat.icon };
        this._topicIndex.set(topic.id, enriched);
        this._orderedTopics.push(enriched);
      }
    }
  }

  getCategories() {
    return this.data.categories;
  }

  getTopic(topicId) {
    return this._topicIndex.get(topicId);
  }

  getAllTopics() {
    return this._orderedTopics;
  }

  getTotalCount() {
    return this._orderedTopics.length;
  }

  getTopicsByTag(tag) {
    return this._orderedTopics.filter(t => t.tags?.includes(tag));
  }

  getAdjacentTopics(topicId) {
    const idx = this._orderedTopics.findIndex(t => t.id === topicId);
    return {
      prev: idx > 0 ? this._orderedTopics[idx - 1] : null,
      next: idx < this._orderedTopics.length - 1 ? this._orderedTopics[idx + 1] : null
    };
  }

  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this._orderedTopics;
    return this._orderedTopics.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q)) ||
      t.categoryName.toLowerCase().includes(q)
    );
  }

  getCategoryTopicIds(categoryId) {
    const cat = this.data.categories.find(c => c.id === categoryId);
    return cat ? cat.topics.map(t => t.id) : [];
  }
}

// ============================================
// ContentRenderer — markdown & interactive
// ============================================
class ContentRenderer {
  constructor(markdownEl, iframeEl) {
    this.markdownEl = markdownEl;
    this.iframeEl = iframeEl;
  }

  async renderMarkdown(filePath) {
    this.iframeEl.hidden = true;
    this.markdownEl.style.display = 'block';

    // Show loading
    this.markdownEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      const res = await fetch(filePath);
      if (!res.ok) throw new Error(`Could not load: ${filePath}`);

      let md = await res.text();

      // Strip YAML frontmatter if present
      md = md.replace(/^---[\s\S]*?---\s*/, '');

      // Configure marked
      if (typeof marked !== 'undefined') {
        marked.setOptions({
          breaks: false,
          gfm: true,
          headerIds: true,
        });
      }

      this.markdownEl.innerHTML = marked.parse(md);
      this._highlightCode();
      this._addCopyButtons();
      this._postProcessCallouts();
      this._addLanguageLabels();
    } catch (err) {
      this.markdownEl.innerHTML = `
        <div class="error-state">
          <h2>📄 Content Not Available Yet</h2>
          <p>${err.message}</p>
          <p>This tutorial hasn't been created yet. Use the <strong>tutorial-spec.md</strong> to generate it with your AI coding tool.</p>
        </div>
      `;
    }
  }

  loadInteractive(filePath) {
    this.markdownEl.style.display = 'none';
    this.iframeEl.hidden = false;
    this.iframeEl.src = filePath;
  }

  _highlightCode() {
    if (typeof hljs !== 'undefined') {
      this.markdownEl.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }
  }

  _addCopyButtons() {
    this.markdownEl.querySelectorAll('pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        if (code) {
          navigator.clipboard.writeText(code.textContent).then(() => {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 2000);
          });
        }
      });
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
  }

  _postProcessCallouts() {
    // Map of emoji prefixes to callout types
    const calloutMap = [
      { pattern: /^🔑\s*/, type: 'key', title: '🔑 Key Insight' },
      { pattern: /^📌\s*/, type: 'definition', title: '📌 Definition' },
      { pattern: /^⚠️\s*/, type: 'warning', title: '⚠️ Warning' },
      { pattern: /^🎯\s*/, type: 'interview', title: '🎯 Interview Tip' },
      { pattern: /^💡\s*/, type: 'tip', title: '💡 Pro Tip' },
      { pattern: /^⚡\s*/, type: 'example', title: '⚡ Example' },
    ];

    this.markdownEl.querySelectorAll('blockquote').forEach(bq => {
      const firstP = bq.querySelector('p');
      if (!firstP) return;

      const text = firstP.textContent;
      for (const { pattern, type, title } of calloutMap) {
        if (pattern.test(text)) {
          bq.classList.add('callout', `callout-${type}`);

          // Create title element
          const titleEl = document.createElement('div');
          titleEl.className = 'callout-title';
          titleEl.textContent = title;

          // Clean the emoji from the first paragraph
          firstP.innerHTML = firstP.innerHTML.replace(/^[🔑📌⚠️🎯💡⚡]\s*(<strong>)?/u, '$1');

          // Insert title before content
          bq.insertBefore(titleEl, bq.firstChild);
          break;
        }
      }
    });
  }

  _addLanguageLabels() {
    this.markdownEl.querySelectorAll('pre code').forEach(code => {
      const pre = code.parentElement;
      // Extract language from class like "language-python" or "hljs language-python"
      const langClass = Array.from(code.classList).find(c => c.startsWith('language-'));
      if (langClass) {
        const lang = langClass.replace('language-', '');
        if (lang && lang !== 'undefined') {
          pre.setAttribute('data-language', lang);
        }
      }
    });
  }
}

// ============================================
// StudyTimer — Pomodoro & Time Tracking
// ============================================
class StudyTimer {
  constructor(progressTracker) {
    this.progressTracker = progressTracker;
    this.currentTopicId = null;
    this.defaultTime = 25 * 60;
    this.timeLeft = this.defaultTime;
    this.timerId = null;
    this.isRunning = false;

    // DOM
    this.container = document.getElementById('study-timer');
    this.display = document.getElementById('timer-display');
    this.startBtn = document.getElementById('timer-start');
    this.pauseBtn = document.getElementById('timer-pause');
    this.resetBtn = document.getElementById('timer-reset');
    this.minBtn = document.getElementById('timer-toggle-minimize');
    this.statsLabel = document.getElementById('timer-total-stats');

    this._bindEvents();
  }

  setTopic(topicId) {
    if (this.isRunning) this.pause();
    this.currentTopicId = topicId;
    this.timeLeft = this.defaultTime;
    this._updateDisplay();
    this._updateStats();
  }

  _bindEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.pauseBtn.addEventListener('click', () => this.pause());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.minBtn.addEventListener('click', () => {
      this.container.classList.toggle('minimized');
      this.minBtn.textContent = this.container.classList.contains('minimized') ? '□' : '_';
    });
  }

  start() {
    if (!this.currentTopicId || this.isRunning) return;
    this.isRunning = true;
    this.startBtn.hidden = true;
    this.pauseBtn.hidden = false;
    this.display.classList.add('running');

    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) this.timeLeft--;
      if (this.currentTopicId) {
        this.progressTracker.addTimeSpent(this.currentTopicId, 1);
      }
      this._updateDisplay();
      if (this.timeLeft % 60 === 0) this._updateStats();
      
      if (this.timeLeft === 0) {
        this.pause();
        alert('Session complete! Take a 5 minute break.');
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.timerId);
    this.startBtn.hidden = false;
    this.pauseBtn.hidden = true;
    this.display.classList.remove('running');
    this._updateStats();
  }

  reset() {
    this.pause();
    this.timeLeft = this.defaultTime;
    this._updateDisplay();
  }

  _updateDisplay() {
    const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const s = (this.timeLeft % 60).toString().padStart(2, '0');
    this.display.textContent = `${m}:${s}`;
  }

  _updateStats() {
    if (!this.currentTopicId) return;
    const totalSec = this.progressTracker.getTimeSpent(this.currentTopicId);
    const m = Math.floor(totalSec / 60);
    this.statsLabel.textContent = `Time logged: ${m}m`;
  }
}

// ============================================
// GraphRenderer — Mermaid.js DAG
// ============================================
class GraphRenderer {
  constructor(roadmapManager, progressTracker, containerEl) {
    this.roadmap = roadmapManager;
    this.progress = progressTracker;
    this.container = containerEl;
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        themeVariables: {
          primaryColor: '#161b22',
          primaryBorderColor: '#38bdf8',
          primaryTextColor: '#e2e8f0',
          lineColor: '#4a5568',
          clusterBkg: 'rgba(56, 189, 248, 0.03)',
          clusterBorder: '#38bdf833',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px'
        },
        flowchart: {
          curve: 'bumpX', // Smooth, beautiful curves
          nodeSpacing: 50,
          rankSpacing: 80,
          padding: 20
        }
      });
    }
  }

  async render() {
    if (typeof mermaid === 'undefined') {
      this.container.innerHTML = '<div class="error-state">Mermaid.js failed to load.</div>';
      return;
    }

    const categories = this.roadmap.getCategories();
    let graphDef = 'flowchart LR\n';
    
    // Define CSS classes for nodes (No spaces allowed in classDef values!)
    graphDef += `  classDef default fill:#161b22,stroke:#4a5568,stroke-width:1px,color:#e2e8f0,rx:8px,ry:8px\n`;
    graphDef += `  classDef completed fill:#34d3991a,stroke:#34d399,stroke-width:2px,color:#34d399,rx:8px,ry:8px\n`;
    graphDef += `  classDef inProgress fill:#fbbf241a,stroke:#fbbf24,stroke-width:2px,color:#fbbf24,rx:8px,ry:8px\n`;
    
    // Nodes by category
    categories.forEach(cat => {
      graphDef += `  subgraph ${cat.id} ["${cat.icon} ${cat.name}"]\n`;
      cat.topics.forEach(t => {
        // Break long titles into two lines for better visual box proportions
        const titleWords = t.title.split(' ');
        let titleFormat = t.title;
        if (titleWords.length > 3) {
           const mid = Math.floor(titleWords.length / 2);
           titleFormat = titleWords.slice(0, mid).join(' ') + '<br/>' + titleWords.slice(mid).join(' ');
        }
        graphDef += `    ${t.id}["${titleFormat}"]\n`;
      });
      graphDef += `  end\n`;
    });

    // Edges
    const allTopics = this.roadmap.getAllTopics();

    allTopics.forEach(t => {
      if (t.prereqs && t.prereqs.length > 0) {
        t.prereqs.forEach(p => {
          graphDef += `  ${p} --> ${t.id}\n`;
        });
      }
    });

    // Styling based on progress
    allTopics.forEach(t => {
      const status = this.progress.getStatus(t.id);
      if (status === 'completed') {
        graphDef += `  class ${t.id} completed\n`;
      } else if (status === 'in-progress') {
        graphDef += `  class ${t.id} inProgress\n`;
      } else {
        graphDef += `  class ${t.id} default\n`;
      }
      
      // Click event to navigate to topic
      graphDef += `  click ${t.id} href "#topic/${t.id}"\n`;
    });

    try {
      const { svg } = await mermaid.render('roadmap-mermaid-svg', graphDef);
      this.container.innerHTML = svg;

      const svgElement = this.container.querySelector('svg');
      if (svgElement && typeof svgPanZoom !== 'undefined') {
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        
        svgPanZoom(svgElement, {
          zoomEnabled: true,
          controlIconsEnabled: true,
          fit: true,
          center: true,
          minZoom: 0.1,
          maxZoom: 10,
        });

        // Setup hover card logic
        this._setupHoverCard(allTopics);
      }
    } catch (e) {
      console.error("Mermaid render error", e);
      this.container.innerHTML = '<div class="error-state">Failed to render graph.</div>';
    }
  }

  _setupHoverCard(allTopics) {
    const card = document.getElementById('graph-hover-card');
    if (!card) return;

    this.container.addEventListener('mousemove', (e) => {
      const nodeEl = e.target.closest('.node');
      if (!nodeEl) {
        card.hidden = true;
        return;
      }

      // Mermaid node ID is usually embedded in the class string (e.g. "node default topic-id")
      // We will loop through all topics and see if the node El classlist contains the id
      let matchedTopic = null;
      for (const t of allTopics) {
        if (nodeEl.classList.contains(t.id)) {
          matchedTopic = t;
          break;
        }
      }

      if (!matchedTopic) {
        // Fallback checks (sometime mermaid formatting obscures class)
        const nodeText = nodeEl.querySelector('.nodeLabel')?.textContent || '';
        matchedTopic = allTopics.find(t => nodeText.includes(t.title.split(' ')[0]));
      }

      if (matchedTopic) {
        this._populateCard(card, matchedTopic, allTopics);
        card.hidden = false;
        
        // Positioning logic
        let x = e.clientX;
        let y = e.clientY;
        const rect = card.getBoundingClientRect();
        
        // Prevent overflow
        if (x + rect.width + 20 > window.innerWidth) x = x - rect.width - 20;
        if (y + rect.height + 20 > window.innerHeight) y = y - rect.height - 20;
        
        card.style.left = x + 'px';
        card.style.top = y + 'px';
        card.style.transform = 'translate(10px, 10px)';
      }
    });

    this.container.addEventListener('mouseleave', () => {
      card.hidden = true;
    });
  }

  _populateCard(card, topic, allTopics) {
    document.getElementById('hc-title').textContent = topic.title;
    document.getElementById('hc-desc').textContent = topic.description || 'No description available.';
    document.getElementById('hc-priority').textContent = topic.priority || 'standard';
    document.getElementById('hc-priority').className = `topic-badge priority-${topic.priority || 'supplementary'}`;
    
    document.getElementById('hc-why').textContent = topic.why_important || 'Foundational concept.';
    
    // Calculates Depends On (Incoming)
    const dependsUl = document.getElementById('hc-depends');
    dependsUl.innerHTML = '';
    if (topic.prereqs && topic.prereqs.length > 0) {
      topic.prereqs.forEach(pid => {
        const pTopic = allTopics.find(t => t.id === pid);
        if (pTopic) {
          const li = document.createElement('li');
          li.textContent = pTopic.title;
          dependsUl.appendChild(li);
        }
      });
    } else {
      dependsUl.innerHTML = '<li>None (Root Concept)</li>';
    }

    // Calculates Unlocks (Outgoing)
    const unlocksUl = document.getElementById('hc-unlocks');
    unlocksUl.innerHTML = '';
    const unlocks = allTopics.filter(t => t.prereqs?.includes(topic.id));
    if (unlocks.length > 0) {
      unlocks.forEach(uTopic => {
        const li = document.createElement('li');
        li.textContent = uTopic.title;
        unlocksUl.appendChild(li);
      });
    } else {
      unlocksUl.innerHTML = '<li>End of Pathway</li>';
    }

    // Extended Universe
    const tagsContainer = document.getElementById('hc-external');
    tagsContainer.innerHTML = '';
    if (topic.related_external && topic.related_external.length > 0) {
      topic.related_external.forEach(tag => {
        const span = document.createElement('span');
        span.textContent = tag;
        tagsContainer.appendChild(span);
      });
    } else {
      tagsContainer.innerHTML = '<span>None specified</span>';
    }
  }
}

// ============================================
// FlashcardManager — Extracts Q&As
// ============================================
class FlashcardManager {
  constructor(roadmapManager) {
    this.roadmap = roadmapManager;
    this.deck = [];
    this.currentIndex = 0;
    
    // DOM
    this.scene = document.querySelector('.flashcard-scene');
    this.card = document.getElementById('flashcard');
    this.qEl = document.getElementById('fc-question');
    this.aEl = document.getElementById('fc-answer');
    this.currentEl = document.getElementById('fc-current');
    this.totalEl = document.getElementById('fc-total');
    this.actionsEl = document.getElementById('flashcard-actions');
    this.containerEl = document.getElementById('flashcard-container');
    this.emptyEl = document.getElementById('flashcards-empty');
    
    this._bindEvents();
  }

  _bindEvents() {
    this.card.addEventListener('click', () => {
      if (this.deck.length === 0) return;
      this.card.classList.toggle('is-flipped');
      if (this.card.classList.contains('is-flipped')) {
        this.actionsEl.style.visibility = 'visible';
      }
    });

    document.querySelectorAll('.fc-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card flip
        const action = e.target.dataset.action;
        this._handleAction(action);
      });
    });
  }

  async loadDeck(topicIds) {
    this.containerEl.hidden = true;
    this.emptyEl.hidden = true;
    this.deck = [];
    this.currentIndex = 0;

    let allHtml = '';
    
    for (const tid of topicIds) {
      const t = this.roadmap.getTopic(tid);
      if (!t || t.type !== 'tutorial') continue;
      try {
        const res = await fetch(t.file);
        if (res.ok) {
          const md = await res.text();
          // Use marked to parse the markdown into DOM
          allHtml += marked.parse(md.replace(/^---[\s\S]*?---\s*/, ''));
        }
      } catch (e) {
        console.warn('Failed to load for flashcards', t.file);
      }
    }

    // Parse extracted HTML to find <details> blocks
    const parser = new DOMParser();
    const doc = parser.parseFromString(allHtml, 'text/html');
    
    doc.querySelectorAll('details').forEach(detail => {
      const summary = detail.querySelector('summary');
      if (summary) {
        const qHtml = summary.innerHTML;
        summary.remove(); // specific to this instance, rest is answer
        const aHtml = detail.innerHTML;
        this.deck.push({ q: qHtml, a: aHtml });
      }
    });

    // Shuffle deck
    this.deck.sort(() => Math.random() - 0.5);

    if (this.deck.length > 0) {
      this.containerEl.hidden = false;
      this._showCard();
    } else {
      this.emptyEl.hidden = false;
    }
  }

  _showCard() {
    if (this.currentIndex >= this.deck.length) {
      this.emptyEl.innerHTML = `
        <div class="empty-state-icon">🎉</div>
        <p>Deck complete! Great job.</p>
      `;
      this.containerEl.hidden = true;
      this.emptyEl.hidden = false;
      return;
    }

    this.card.classList.remove('is-flipped');
    this.actionsEl.style.visibility = 'hidden';
    
    const cardData = this.deck[this.currentIndex];
    this.qEl.innerHTML = cardData.q;
    this.aEl.innerHTML = cardData.a;
    
    this.currentEl.textContent = this.currentIndex + 1;
    this.totalEl.textContent = this.deck.length;

    // Apply syntax highlighting
    if (typeof hljs !== 'undefined') {
      this.qEl.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
      this.aEl.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    }
  }

  _handleAction(action) {
    if (action === 'hard') {
      // Put to back of deck
      this.deck.push(this.deck[this.currentIndex]);
      this.totalEl.textContent = this.deck.length; // Update total count
    }
    this.currentIndex++;
    
    // Brief delay to allow flip animation to hide before changing content
    this.card.classList.remove('is-flipped');
    this.actionsEl.style.visibility = 'hidden';
    setTimeout(() => {
      this._showCard();
    }, 300);
  }
}

// ============================================
// Router — hash-based
// ============================================
class Router {
  constructor() {
    this.routes = [];
    this._handler = () => this.resolve();
    window.addEventListener('hashchange', this._handler);
  }

  on(pattern, handler) {
    this.routes.push({ pattern, handler });
  }

  resolve() {
    const hash = location.hash.slice(1) || 'roadmap';

    for (const route of this.routes) {
      const match = this._match(route.pattern, hash);
      if (match !== null) {
        route.handler(match);
        return;
      }
    }

    // Default: roadmap
    this.navigate('roadmap');
  }

  _match(pattern, hash) {
    const patternParts = pattern.split('/');
    const hashParts = hash.split('/');
    if (patternParts.length !== hashParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(hashParts[i]);
      } else if (patternParts[i] !== hashParts[i]) {
        return null;
      }
    }
    return params;
  }

  navigate(hash) {
    location.hash = '#' + hash;
  }
}

// ============================================
// App — Main Controller
// ============================================
class App {
  constructor() {
    this.router = new Router();
    this.roadmap = new RoadmapManager();
    this.progress = new ProgressTracker();
    this.renderer = null;
    this.studyTimer = null;
    this.graphRenderer = null;
    this.flashcardManager = null;
    this.aiTutor = null;
    this.currentTopicId = null;
    this.activeFilter = 'all';
    this.searchQuery = '';
  }

  async init() {
    try {
      await this.roadmap.load();
    } catch (err) {
      document.getElementById('roadmap-grid').innerHTML = `
        <div class="error-state">
          <h2>⚠️ Could Not Load Roadmap</h2>
          <p>${err.message}</p>
          <p>Make sure <strong>roadmap.json</strong> is in the project root.</p>
        </div>
      `;
      return;
    }

    this.renderer = new ContentRenderer(
      document.getElementById('markdown-content'),
      document.getElementById('interactive-frame')
    );

    // Initialize high impact features
    this.studyTimer = new StudyTimer(this.progress);
    this.graphRenderer = new GraphRenderer(this.roadmap, this.progress, document.getElementById('roadmap-graph'));
    this.flashcardManager = new FlashcardManager(this.roadmap);
    this.aiTutor = new AITutor();

    // Setup routes
    this.router.on('roadmap', () => this.showRoadmap());
    this.router.on('graph', () => this.showGraph());
    this.router.on('topic/:id', (params) => this.showTopic(params.id));
    this.router.on('flashcards', () => this.showFlashcards());

    // Build UI
    this.buildSidebar();
    this.setupEventListeners();

    // Resolve initial route
    this.router.resolve();
  }

  // --- Sidebar ---
  buildSidebar() {
    const nav = document.getElementById('sidebar-nav');
    const categories = this.roadmap.getCategories();

    nav.innerHTML = categories.map(cat => {
      const topics = cat.topics;
      const completedCount = topics.filter(t => this.progress.getStatus(t.id) === 'completed').length;

      return `
        <div class="nav-category" data-category="${cat.id}">
          <button class="category-toggle" aria-expanded="false">
            <span class="category-icon">${cat.icon}</span>
            <span class="category-name">${cat.name}</span>
            <span class="category-count">${completedCount}/${topics.length}</span>
            <svg class="category-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 3l5 5-5 5"/>
            </svg>
          </button>
          <ul class="category-topics">
            ${topics.map(t => this._renderSidebarTopic(t)).join('')}
          </ul>
        </div>
      `;
    }).join('');

    this.updateSidebarProgress();
  }

  _renderSidebarTopic(topic) {
    const status = this.progress.getStatus(topic.id);
    const isInterview = topic.tags?.includes('interview');

    return `
      <li>
        <a href="#topic/${topic.id}" class="topic-link" data-topic-id="${topic.id}">
          <span class="status-dot" data-status="${status}"></span>
          <span class="topic-title-text">${topic.title}</span>
          ${isInterview ? '<span class="topic-interview-tag">INT</span>' : ''}
        </a>
      </li>
    `;
  }

  updateSidebarProgress() {
    const total = this.roadmap.getTotalCount();
    const completed = this.progress.getCompletedCount();
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    if (progressText) progressText.textContent = `${pct}% Complete`;
    if (progressFill) progressFill.style.width = `${pct}%`;

    // Update category counts
    document.querySelectorAll('.nav-category').forEach(el => {
      const catId = el.dataset.category;
      const topicIds = this.roadmap.getCategoryTopicIds(catId);
      const done = topicIds.filter(id => this.progress.getStatus(id) === 'completed').length;
      const countEl = el.querySelector('.category-count');
      if (countEl) countEl.textContent = `${done}/${topicIds.length}`;
    });

    // Update sidebar topic status dots
    document.querySelectorAll('.topic-link').forEach(el => {
      const topicId = el.dataset.topicId;
      if (topicId) {
        const dot = el.querySelector('.status-dot');
        if (dot) dot.dataset.status = this.progress.getStatus(topicId);
      }
    });
  }

  highlightActiveTopic(topicId) {
    // Remove all active classes
    document.querySelectorAll('.topic-link').forEach(el => el.classList.remove('active'));

    // Add active to current
    const activeEl = document.querySelector(`.topic-link[data-topic-id="${topicId}"]`);
    if (activeEl) {
      activeEl.classList.add('active');

      // Expand parent category
      const category = activeEl.closest('.nav-category');
      if (category && !category.classList.contains('expanded')) {
        category.classList.add('expanded');
        category.querySelector('.category-toggle')?.setAttribute('aria-expanded', 'true');
      }

      // Scroll into view
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  showRoadmap() {
    this.currentTopicId = null;
    this.studyTimer?.pause();
    const timerEl = document.getElementById('study-timer');
    if (timerEl) timerEl.style.display = 'none';

    this._switchView('roadmap-view');
    this._updateBreadcrumb([{ label: '🏠 Roadmap' }]);
    this.renderStats();
    this.renderRoadmapGrid();

    // Remove active highlights
    document.querySelectorAll('.topic-link').forEach(el => el.classList.remove('active'));
  }

  // --- Graph View ---
  showGraph() {
    this.currentTopicId = null;
    this.studyTimer?.pause();
    const timerEl = document.getElementById('study-timer');
    if (timerEl) timerEl.style.display = 'none';

    this._switchView('graph-view');
    this._updateBreadcrumb([{ label: '🏠 Roadmap', href: '#roadmap' }, { label: '🗺️ Dependency Graph' }]);
    
    // Remove active highlights
    document.querySelectorAll('.topic-link').forEach(el => el.classList.remove('active'));

    this.graphRenderer?.render();
  }

  renderStats() {
    const total = this.roadmap.getTotalCount();
    const completed = this.progress.getCompletedCount();
    const inProgress = this.progress.getInProgressCount();
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const interviewCount = this.roadmap.getTopicsByTag('interview').length;

    document.getElementById('stats-bar').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total Topics</div>
        <div class="stat-value">${total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">In Progress</div>
        <div class="stat-value">${inProgress}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value">${completed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Progress</div>
        <div class="stat-value">${pct}%</div>
      </div>
    `;
  }

  renderRoadmapGrid() {
    const grid = document.getElementById('roadmap-grid');
    const categories = this.roadmap.getCategories();

    // Apply filters
    const filteredCategories = categories.map(cat => {
      let topics = cat.topics;

      // Search filter
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        topics = topics.filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some(tag => tag.toLowerCase().includes(q))
        );
      }

      // Tag/status filter
      if (this.activeFilter === 'interview') {
        topics = topics.filter(t => t.tags?.includes('interview'));
      } else if (this.activeFilter === 'in-progress') {
        topics = topics.filter(t => this.progress.getStatus(t.id) === 'in-progress');
      } else if (this.activeFilter === 'completed') {
        topics = topics.filter(t => this.progress.getStatus(t.id) === 'completed');
      }

      return { ...cat, topics };
    }).filter(cat => cat.topics.length > 0);

    if (filteredCategories.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>No topics match your search${this.activeFilter !== 'all' ? ' and filter' : ''}.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filteredCategories.map(cat => {
      const completedCount = cat.topics.filter(t => this.progress.getStatus(t.id) === 'completed').length;
      const totalCount = cat.topics.length;
      const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      return `
        <div class="category-card expanded" data-category="${cat.id}">
          <div class="category-card-header">
            <div class="card-icon">${cat.icon}</div>
            <div class="card-info">
              <div class="card-title">${cat.name}</div>
              <div class="card-description">${cat.description}</div>
            </div>
          </div>
          <div class="card-progress">
            <div class="card-progress-header">
              <span class="card-progress-text">${completedCount} of ${totalCount} complete</span>
              <span class="card-progress-text">${pct}%</span>
            </div>
            <div class="card-progress-bar">
              <div class="card-progress-fill" style="width: ${pct}%"></div>
            </div>
          </div>
          <ul class="card-topics">
            ${cat.topics.map(t => this._renderCardTopic(t)).join('')}
          </ul>
        </div>
      `;
    }).join('');

    // Attach card header click listeners
    grid.querySelectorAll('.category-card-header').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.category-card');
        card.classList.toggle('expanded');
      });
    });
  }

  _renderCardTopic(topic) {
    const status = this.progress.getStatus(topic.id);
    const isInterview = topic.tags?.includes('interview');

    return `
      <li class="card-topic-item">
        <a href="#topic/${topic.id}" class="card-topic-link">
          <span class="card-topic-status" data-status="${status}"></span>
          <div class="card-topic-info">
            <div class="card-topic-title">${topic.title}</div>
            <div class="card-topic-meta">
              <span class="topic-badge difficulty-${topic.difficulty}">${topic.difficulty}</span>
              ${topic.priority ? `<span class="topic-badge priority-${topic.priority}">${topic.priority}</span>` : ''}
              <span>~${topic.estimatedMinutes}min</span>
              ${isInterview ? '<span class="topic-badge interview">interview</span>' : ''}
            </div>
          </div>
          <span class="card-topic-arrow">→</span>
        </a>
      </li>
    `;
  }

  // --- Topic/Reader View ---
  async showTopic(topicId) {
    const topic = this.roadmap.getTopic(topicId);
    if (!topic) {
      this.router.navigate('roadmap');
      return;
    }

    this.currentTopicId = topicId;
    this.studyTimer?.setTopic(topicId);
    const timerEl = document.getElementById('study-timer');
    if (timerEl) timerEl.style.display = 'block';

    this._switchView('reader-view');

    // Update breadcrumb
    this._updateBreadcrumb([
      { label: '🏠 Roadmap', href: '#roadmap' },
      { label: `${topic.categoryIcon} ${topic.categoryName}` },
      { label: topic.title }
    ]);

    // Highlight in sidebar
    this.highlightActiveTopic(topicId);

    // Record visit
    this.progress.setLastVisited(topicId);

    // Fill header
    this._renderTopicHeader(topic);

    // Load content
    let rawMarkdown = '';
    if (topic.type === 'interactive') {
      this.renderer.loadInteractive(topic.file);
    } else {
      rawMarkdown = await this.renderer.renderMarkdown(topic.file);
    }

    // Pass context to AI Tutor
    if (this.aiTutor) {
      this.aiTutor.setContext(topic, rawMarkdown);
    }

    // Fill nav buttons
    this._renderTopicNav(topicId);

    // Scroll to top
    document.getElementById('main-content').scrollTo(0, 0);
  }

  _renderTopicHeader(topic) {
    const status = this.progress.getStatus(topic.id);
    const isInterview = topic.tags?.includes('interview');

    document.getElementById('topic-meta-bar').innerHTML = `
      <span class="meta-badge difficulty-${topic.difficulty}">${topic.difficulty}</span>
      ${topic.priority ? `<span class="meta-badge priority-${topic.priority}">${topic.priority}</span>` : ''}
      <span class="meta-badge time">~${topic.estimatedMinutes} min</span>
      ${isInterview ? '<span class="meta-badge interview">🎯 Interview</span>' : ''}
      ${topic.type === 'interactive' ? '<span class="meta-badge" style="color:var(--accent-purple);border-color:rgba(167,139,250,0.2);background:var(--accent-purple-dim);">⚡ Interactive</span>' : ''}
    `;

    document.getElementById('topic-title').textContent = topic.title;
    document.getElementById('topic-description').textContent = topic.description || '';

    const statusBtn = document.getElementById('status-toggle');
    statusBtn.dataset.status = status;
    statusBtn.textContent = CONFIG.STATUS_LABELS[status];
  }

  _renderTopicNav(topicId) {
    const { prev, next } = this.roadmap.getAdjacentTopics(topicId);

    const prevBtn = document.getElementById('prev-topic');
    const nextBtn = document.getElementById('next-topic');

    prevBtn.disabled = !prev;
    nextBtn.disabled = !next;

    prevBtn.textContent = prev ? `← ${prev.title}` : '← Previous';
    nextBtn.textContent = next ? `${next.title} →` : 'Next →';

    // Replace buttons to remove old listeners
    const newPrev = prevBtn.cloneNode(true);
    const newNext = nextBtn.cloneNode(true);
    prevBtn.replaceWith(newPrev);
    nextBtn.replaceWith(newNext);

    if (prev) newPrev.addEventListener('click', () => this.router.navigate(`topic/${prev.id}`));
    if (next) newNext.addEventListener('click', () => this.router.navigate(`topic/${next.id}`));
  }

  // --- Flashcards View ---
  showFlashcards() {
    this.currentTopicId = null;
    this.studyTimer?.pause();
    const timerEl = document.getElementById('study-timer');
    if (timerEl) timerEl.style.display = 'none';
    
    this._switchView('flashcards-view');
    this._updateBreadcrumb([{ label: '🏠 Roadmap', href: '#roadmap' }, { label: '🧠 Quick Recall' }]);
    
    // Remove active highlights
    document.querySelectorAll('.topic-link').forEach(el => el.classList.remove('active'));

    // Populate dropdown
    const select = document.getElementById('flashcard-deck-select');
    const compTopics = this.roadmap.getAllTopics().filter(t => this.progress.getStatus(t.id) === 'completed');
    
    let opts = '<option value="all-completed">All Completed Topics</option>';
    compTopics.forEach(t => {
      opts += `<option value="${t.id}">${t.title}</option>`;
    });
    select.innerHTML = opts;
    
    // Hide flashcard area until started
    document.getElementById('flashcard-container').hidden = true;
    document.getElementById('flashcards-empty').hidden = true;
  }

  // --- View Switching ---
  _switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => {
      v.hidden = v.id !== viewId;
    });
  }

  _updateBreadcrumb(items) {
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = items.map((item, i) => {
      const isLast = i === items.length - 1;
      const separator = i > 0 ? '<span class="breadcrumb-separator">›</span>' : '';

      if (item.href && !isLast) {
        return `${separator}<a href="${item.href}">${item.label}</a>`;
      }
      if (isLast) {
        return `${separator}<span class="breadcrumb-current">${item.label}</span>`;
      }
      return `${separator}<span>${item.label}</span>`;
    }).join('');
  }

  // --- Event Listeners ---
  setupEventListeners() {
    // Flashcards Start
    const startFcBtn = document.getElementById('start-flashcards-btn');
    if (startFcBtn) {
      startFcBtn.addEventListener('click', () => {
        const select = document.getElementById('flashcard-deck-select');
        if (select.value === 'all-completed') {
          const compTopics = this.roadmap.getAllTopics().filter(t => this.progress.getStatus(t.id) === 'completed').map(t => t.id);
          this.flashcardManager?.loadDeck(compTopics);
        } else {
          this.flashcardManager?.loadDeck([select.value]);
        }
      });
    }

    // Sidebar category toggles
    document.getElementById('sidebar-nav').addEventListener('click', (e) => {
      const toggle = e.target.closest('.category-toggle');
      if (toggle) {
        const category = toggle.closest('.nav-category');
        const isExpanded = category.classList.toggle('expanded');
        toggle.setAttribute('aria-expanded', isExpanded);
      }
    });

    // Sidebar search
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = e.target.value;
        this._filterSidebar(e.target.value);
        if (document.getElementById('roadmap-view') && !document.getElementById('roadmap-view').hidden) {
          this.renderRoadmapGrid();
        }
      }, 150);
    });

    // Sidebar filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        this._filterSidebar(this.searchQuery);
        if (!document.getElementById('roadmap-view').hidden) {
          this.renderRoadmapGrid();
        }
      });
    });

    // Status toggle
    document.getElementById('status-toggle').addEventListener('click', () => {
      if (!this.currentTopicId) return;
      const newStatus = this.progress.cycleStatus(this.currentTopicId);
      const btn = document.getElementById('status-toggle');
      btn.dataset.status = newStatus;
      btn.textContent = CONFIG.STATUS_LABELS[newStatus];
      this.updateSidebarProgress();
      this.renderStats();
    });

    // Hamburger menu
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-overlay').classList.toggle('visible');
    });

    // Sidebar close
    document.getElementById('sidebar-close').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('visible');
    });

    // Overlay click to close sidebar
    document.getElementById('sidebar-overlay').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('visible');
    });

    // Keyboard shortcut: Ctrl+K to focus search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
      // Escape to close sidebar on mobile
      if (e.key === 'Escape') {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('visible');
      }
    });
  }

  _filterSidebar(query) {
    const q = (query || '').toLowerCase().trim();

    document.querySelectorAll('.nav-category').forEach(catEl => {
      const catId = catEl.dataset.category;
      const topicLinks = catEl.querySelectorAll('.topic-link');
      let visibleCount = 0;

      topicLinks.forEach(link => {
        const topicId = link.dataset.topicId;
        const topic = this.roadmap.getTopic(topicId);
        let visible = true;

        // Search filter
        if (q) {
          visible = topic.title.toLowerCase().includes(q) ||
            topic.description?.toLowerCase().includes(q) ||
            topic.tags?.some(tag => tag.toLowerCase().includes(q));
        }

        // Tag/status filter
        if (visible && this.activeFilter === 'interview') {
          visible = topic.tags?.includes('interview');
        } else if (visible && this.activeFilter === 'in-progress') {
          visible = this.progress.getStatus(topicId) === 'in-progress';
        } else if (visible && this.activeFilter === 'completed') {
          visible = this.progress.getStatus(topicId) === 'completed';
        }

        link.closest('li').style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      // Hide entire category if no topics visible
      catEl.style.display = visibleCount > 0 ? '' : 'none';

      // Auto-expand if searching
      if (q && visibleCount > 0) {
        catEl.classList.add('expanded');
        catEl.querySelector('.category-toggle')?.setAttribute('aria-expanded', 'true');
      }
    });
  }
}

// ============================================
// AI Contextual Tutor (Gemini API Integration)
// ============================================
class AITutor {
  constructor() {
    this.apiKey = localStorage.getItem('study-gemini-key') || '';
    this.proModel = 'gemini-3.1-pro-preview';
    this.flashModel = 'gemini-3-flash-preview';
    
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1alpha/models/';
    
    this.history = [];
    this.systemContext = '';
    this.currentTopicName = '';

    // UI Elements
    this.drawer = document.getElementById('ai-tutor-drawer');
    this.fabBtn = document.getElementById('tutor-fab');
    this.form = document.getElementById('tutor-form');
    this.input = document.getElementById('tutor-input');
    this.sendBtn = document.getElementById('tutor-send-btn');
    this.historyContainer = document.getElementById('tutor-chat-history');
    this.contextLabel = document.getElementById('tutor-context-label');
    this.badge = document.getElementById('tutor-model-badge');

    // API Config Elements
    this.configPanel = document.getElementById('tutor-api-config');
    this.apiKeyInput = document.getElementById('tutor-api-key-input');
    this.saveKeyBtn = document.getElementById('tutor-api-save-btn');

    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    if (this.fabBtn && this.drawer) {
      this.fabBtn.addEventListener('click', () => this.toggleDrawer());
    }

    if (this.saveKeyBtn) {
      this.saveKeyBtn.addEventListener('click', () => {
        const val = this.apiKeyInput.value.trim();
        if (val) {
          this.apiKey = val;
          localStorage.setItem('study-gemini-key', val);
          this.configPanel.style.display = 'none';
          this.input.disabled = false;
          this.sendBtn.disabled = false;
          this.apiKeyInput.value = '';
          this._appendSystemWarning('API Key saved successfully to localStorage!');
        }
      });
    }

    this._checkKeyStatus();
  }

  _checkKeyStatus() {
    if (!this.apiKey) {
      if (this.configPanel) this.configPanel.style.display = 'block';
      if (this.input) this.input.disabled = true;
      if (this.sendBtn) this.sendBtn.disabled = true;
    }
  }

  toggleDrawer() {
    if (!this.drawer || !this.fabBtn) return;
    
    this.drawer.classList.toggle('hidden-drawer');
    
    const isOpen = !this.drawer.classList.contains('hidden-drawer');
    const span = this.fabBtn.querySelector('span');
    
    if (isOpen) {
      span.textContent = 'Close AI';
      this.fabBtn.style.background = 'var(--bg-surface)';
      this.fabBtn.style.color = 'var(--text-primary)';
      this.fabBtn.style.border = '1px solid var(--border-subtle)';
      if (this.input && !this.input.disabled) this.input.focus();
    } else {
      span.textContent = 'Ask AI';
      this.fabBtn.style.background = 'linear-gradient(135deg, var(--accent-cyan), #818cf8)';
      this.fabBtn.style.color = '#0f172a';
      this.fabBtn.style.border = 'none';
    }
  }

  setContext(topic, markdownContent) {
    this.currentTopicName = topic.title;
    if (this.contextLabel) this.contextLabel.textContent = topic.title;
    
    // Explicit system guidance framing
    this.systemContext = `You are Antigravity Tutor, a brilliant, expert AI Engineering instructor built directly into the student's study platform.
The student is currently viewing a tutorial titled: "${topic.title}".

Below is the raw Markdown content of the exact tutorial they are reading. 
You must use this content as your absolute primary context. If they ask to clarify a point, provide a deep, rich, plain-English "Zero to Hero" explanation with brand new examples that complement the tutorial. 

=== START LOCAL TUTORIAL CONTEXT ===
${markdownContent || 'No markdown loaded or interactive module.'}
=== END LOCAL TUTORIAL CONTEXT ===`;

    this.history = [];
    this._renderInitialGreeting();
  }

  _renderInitialGreeting() {
    if (!this.historyContainer) return;
    this.historyContainer.innerHTML = '';
    this._appendMessage('ai-msg', `Hello! I am reading the <strong>${this.currentTopicName}</strong> tutorial with you. What part would you like me to clarify or walk you through?`);
  }

  _appendMessage(msgType, text) {
    if (!this.historyContainer) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${msgType} ${msgType === 'ai-msg' ? 'glass-panel' : ''}`;
    
    // Basic formatting for code blocks and bold text
    let htmlContent = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    htmlContent = htmlContent.replace(/\n\n/g, '<br><br>');
    
    div.innerHTML = htmlContent;
    this.historyContainer.appendChild(div);
    this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
  }

  _appendSystemWarning(msg) {
    if (!this.historyContainer) return;
    const div = document.createElement('div');
    div.className = 'sys-warn-msg';
    div.textContent = msg;
    this.historyContainer.appendChild(div);
    this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (!this.apiKey) {
      this.configPanel.style.display = 'block';
      return;
    }

    const text = this.input.value.trim();
    if (!text) return;

    this.input.value = '';
    this._appendMessage('user-msg', text);
    this.history.push({ role: 'user', parts: [{ text }] });

    // Lock UI
    this.input.disabled = true;
    this.sendBtn.disabled = true;

    // Show indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-msg ai-msg typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    typingDiv.id = 'tutor-typing';
    this.historyContainer.appendChild(typingDiv);
    this.historyContainer.scrollTop = this.historyContainer.scrollHeight;

    // --- Defensive Degradation Architecture ---
    try {
      // 1. Attempt API call against the Pro model
      let response = await this._executeAPI(this.proModel);
      
      // 2. Intercept 429 Quota Exceeded natively
      if (!response.ok) {
        if (response.status === 429) {
          this._appendSystemWarning('Pro API Quota Reached (429). Falling back gracefully to Flash model...');
          this._switchBadge('flash');
          
          // 3. Re-route the payload firmly to Flash
          response = await this._executeAPI(this.flashModel);
          if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
             throw new Error(`Flash model also failed: ${response.status} - ${JSON.stringify(errorData)}`);
          }
        } else {
             const errorData = await response.json().catch(() => ({}));
             throw new Error(`API Exception ${response.status}: ${errorData.error?.message || JSON.stringify(errorData)}`);
        }
      }

      // Remove typing indicator right as stream connection opens
      document.getElementById('tutor-typing')?.remove();
      
      // Create empty div for streaming text
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg ai-msg glass-panel';
      this.historyContainer.appendChild(msgDiv);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf8");
      let fullText = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line string in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            
            try {
              const chunk = JSON.parse(dataStr);
              if (chunk.candidates && chunk.candidates[0].content && chunk.candidates[0].content.parts.length > 0) {
                fullText += chunk.candidates[0].content.parts[0].text;
                
                // Format text natively to DOM
                let htmlContent = fullText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
                htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                htmlContent = htmlContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
                htmlContent = htmlContent.replace(/\n\n/g, '<br><br>');
                
                msgDiv.innerHTML = htmlContent;
                this.historyContainer.scrollTop = this.historyContainer.scrollHeight;
              }
            } catch (e) {
               // Incomplete JSON payload logic catch
               console.warn("Stream parse catch", e);
            }
          }
        }
      }

      // Save complete text response to localized history
      this.history.push({ role: 'model', parts: [{ text: fullText }] });

    } catch (err) {
      console.error("AI Agent Fatal:", err);
      document.getElementById('tutor-typing')?.remove();
      this._appendSystemWarning(`System Fault: ${err.message}`);
      this.history.pop(); // Allow retry cleanly
    } finally {
      this.input.disabled = false;
      this.sendBtn.disabled = false;
      this.input.focus();
    }
  }

  async _executeAPI(modelTier) {
    const url = `${this.baseUrl}${modelTier}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    
    // Structure payload with strict System Instruction injection
    const payload = {
      system_instruction: { parts: [{ text: this.systemContext }] },
      contents: this.history,
      generationConfig: { temperature: 0.2 }
    };

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  _switchBadge(tier) {
    if (!this.badge) return;
    if (tier === 'flash') {
      this.badge.className = 'model-badge flash';
      this.badge.textContent = 'Gemini 3 Flash';
    } else {
      this.badge.className = 'model-badge pro';
      this.badge.textContent = 'Gemini 3.1 Pro';
    }
  }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
