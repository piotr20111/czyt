// VoiceFlow Pro - Fixed Version
class VoiceFlowPro {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentSection = 'dashboard';
        this.tabs = new Map();
        this.currentTab = 'tab-1';
        this.tabCounter = 1;
        this.isReading = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.readingQueue = [];
        this.selectedVoice = null;
        this.pdfWorker = null;
        this.processingFiles = new Map();
        this.history = [];
        this.batchQueue = [];
        this.securityGranted = new Map();
        this.readingStats = {
            totalTime: 0,
            todayTime: 0,
            wordsRead: 0
        };
        
        // Enhanced reading settings
        this.readingSettings = {
            pauseBetweenSentences: true,
            pauseLength: 500,
            highlightText: true,
            autoScroll: true,
            smartPunctuation: true
        };
        
        // Default settings
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000;
        this.debugMode = false;
        this.notificationsEnabled = false;
        this.currentQueueIndex = 0;
        this.pdfTexts = new Map();
        
        // Initialize
        this.init();
    }
    
    async init() {
        try {
            // Show loading screen
            await this.initializeApp();
            
            // Hide loading screen after initialization
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                }
            }, 1500);
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Błąd inicjalizacji aplikacji', 'error');
        }
    }
    
    async initializeApp() {
        // Initialize PDF.js first
        this.initializePDFJS();
        
        // Load voices
        await this.loadVoices();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize editor
        this.initializeEditor();
        
        // Load saved preferences
        this.loadPreferences();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Initialize theme
        this.initializeTheme();
        
        // Load history
        this.loadHistory();
        
        // Update dashboard
        this.updateDashboard();
        
        // Setup context menu
        this.setupContextMenu();
        
        // Initialize notifications
        this.initializeNotifications();
        
        // Setup speech recognition
        this.setupSpeechRecognition();
    }
    
    async loadVoices() {
        return new Promise((resolve) => {
            const loadVoicesList = () => {
                this.voices = this.synth.getVoices();
                if (this.voices.length > 0) {
                    this.enhanceVoicesWithMetadata();
                    this.populateVoiceSelects();
                    this.displayVoicesShowcase();
                    resolve();
                }
            };
            
            // Try to load voices immediately
            loadVoicesList();
            
            // Also set up event listener for voice changes
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = loadVoicesList;
            }
            
            // Fallback timeout
            setTimeout(() => {
                if (this.voices.length === 0) {
                    console.warn('No voices loaded, using defaults');
                    resolve();
                }
            }, 1000);
        });
    }
    
    enhanceVoicesWithMetadata() {
        // Add additional metadata to voices
        this.voices = this.voices.map((voice, index) => {
            const enhanced = {
                name: voice.name,
                lang: voice.lang,
                voiceURI: voice.voiceURI,
                localService: voice.localService,
                default: voice.default,
                _index: index,
                _quality: this.getVoiceQuality(voice),
                _rating: this.getVoiceRating(voice),
                _languageFlag: this.getLanguageFlag(voice.lang.substring(0, 2)),
                _languageName: this.getLanguageName(voice.lang.substring(0, 2))
            };
            return enhanced;
        });
    }
    
    getVoiceRating(voice) {
        // Rate voices based on provider and quality
        if (voice.name.includes('Microsoft') && voice.name.includes('Online')) return 5;
        if (voice.name.includes('Google')) return 5;
        if (voice.name.includes('Microsoft')) return 4;
        if (voice.localService && voice.name.includes('Premium')) return 4;
        if (voice.localService) return 3;
        return 2;
    }
    
    getVoiceQuality(voice) {
        if (voice.name.includes('Microsoft') && voice.name.includes('Online')) return 'Premium';
        if (voice.name.includes('Google') || voice.name.includes('Microsoft')) return 'Premium';
        if (voice.localService && voice.name.includes('Premium')) return 'Premium';
        if (voice.localService) return 'Standard';
        return 'Basic';
    }
    
    populateVoiceSelects() {
        const select = document.getElementById('editor-voice-select');
        if (!select) return;
        
        select.innerHTML = '';
        
        if (this.voices.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Brak dostępnych głosów';
            option.value = '';
            select.appendChild(option);
            return;
        }
        
        // Group voices by language
        const voicesByLang = this.groupVoicesByLanguage();
        
        // Add Polish voices first
        if (voicesByLang['pl']) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = '🇵🇱 Polski (zalecane)';
            voicesByLang['pl'].forEach(voice => {
                const option = this.createVoiceOption(voice);
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
        
        // Add English voices
        if (voicesByLang['en']) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = '🇬🇧 English';
            voicesByLang['en'].forEach(voice => {
                const option = this.createVoiceOption(voice);
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
        
        // Add other languages
        Object.keys(voicesByLang).forEach(lang => {
            if (lang !== 'pl' && lang !== 'en' && voicesByLang[lang] && voicesByLang[lang].length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = this.getLanguageFlag(lang) + ' ' + this.getLanguageName(lang);
                voicesByLang[lang].forEach(voice => {
                    const option = this.createVoiceOption(voice);
                    optgroup.appendChild(option);
                });
                select.appendChild(optgroup);
            }
        });
        
        // Try to select Polish voice by default
        this.selectDefaultVoice();
    }
    
    groupVoicesByLanguage() {
        const groups = {};
        
        this.voices.forEach((voice) => {
            const lang = voice.lang.substring(0, 2);
            if (!groups[lang]) {
                groups[lang] = [];
            }
            groups[lang].push(voice);
        });
        
        // Sort voices within each language group by quality
        Object.keys(groups).forEach(lang => {
            groups[lang].sort((a, b) => {
                return (b._rating || 0) - (a._rating || 0);
            });
        });
        
        return groups;
    }
    
    createVoiceOption(voice) {
        const option = document.createElement('option');
        option.value = voice._index;
        option.textContent = voice.name;
        
        // Add quality indicator
        const rating = voice._rating || 0;
        const stars = '⭐'.repeat(Math.min(rating, 5));
        if (stars) {
            option.textContent += ` ${stars}`;
        }
        
        return option;
    }
    
    getLanguageFlag(code) {
        const flags = {
            'pl': '🇵🇱',
            'en': '🇬🇧',
            'de': '🇩🇪',
            'fr': '🇫🇷',
            'es': '🇪🇸',
            'it': '🇮🇹',
            'ru': '🇷🇺',
            'pt': '🇵🇹',
            'ja': '🇯🇵',
            'ko': '🇰🇷',
            'zh': '🇨🇳',
            'nl': '🇳🇱',
            'sv': '🇸🇪',
            'no': '🇳🇴',
            'da': '🇩🇰',
            'fi': '🇫🇮',
            'tr': '🇹🇷',
            'ar': '🇸🇦',
            'he': '🇮🇱',
            'hi': '🇮🇳',
            'cs': '🇨🇿',
            'el': '🇬🇷',
            'hu': '🇭🇺',
            'ro': '🇷🇴',
            'sk': '🇸🇰',
            'uk': '🇺🇦'
        };
        return flags[code] || '🌐';
    }
    
    getLanguageName(code) {
        const names = {
            'pl': 'Polski',
            'en': 'English',
            'de': 'Deutsch',
            'fr': 'Français',
            'es': 'Español',
            'it': 'Italiano',
            'ru': 'Русский',
            'pt': 'Português',
            'ja': '日本語',
            'ko': '한국어',
            'zh': '中文',
            'nl': 'Nederlands',
            'sv': 'Svenska',
            'no': 'Norsk',
            'da': 'Dansk',
            'fi': 'Suomi',
            'tr': 'Türkçe',
            'ar': 'العربية',
            'he': 'עברית',
            'hi': 'हिन्दी',
            'cs': 'Čeština',
            'el': 'Ελληνικά',
            'hu': 'Magyar',
            'ro': 'Română',
            'sk': 'Slovenčina',
            'uk': 'Українська'
        };
        return names[code] || code.toUpperCase();
    }
    
    selectDefaultVoice() {
        const select = document.getElementById('editor-voice-select');
        if (!select || this.voices.length === 0) return;
        
        // Try to find the best Polish voice
        const polishVoices = this.voices.filter(voice => voice.lang.startsWith('pl'));
        polishVoices.sort((a, b) => (b._rating || 0) - (a._rating || 0));
        
        if (polishVoices.length > 0) {
            select.value = polishVoices[0]._index;
            this.selectedVoice = polishVoices[0];
        } else {
            // Fallback to best available voice
            const sortedVoices = [...this.voices].sort((a, b) => (b._rating || 0) - (a._rating || 0));
            if (sortedVoices.length > 0) {
                select.value = sortedVoices[0]._index;
                this.selectedVoice = sortedVoices[0];
            }
        }
    }
    
    displayVoicesShowcase() {
        const showcase = document.getElementById('voices-showcase');
        if (!showcase) return;
        
        showcase.innerHTML = '';
        
        if (this.voices.length === 0) {
            showcase.innerHTML = '<p class="empty-state">Brak dostępnych głosów</p>';
            return;
        }
        
        const filter = document.getElementById('voice-language-filter')?.value || 'all';
        const qualityFilter = document.getElementById('voice-quality-filter')?.value || 'all';
        
        let filteredVoices = this.voices.filter(voice => {
            if (filter !== 'all' && !voice.lang.startsWith(filter)) return false;
            
            if (qualityFilter !== 'all') {
                const quality = voice._quality || this.getVoiceQuality(voice);
                if (qualityFilter.toLowerCase() !== quality.toLowerCase()) return false;
            }
            
            return true;
        });
        
        // Sort by rating
        filteredVoices.sort((a, b) => (b._rating || 0) - (a._rating || 0));
        
        filteredVoices.forEach((voice) => {
            const card = this.createVoiceCard(voice);
            showcase.appendChild(card);
        });
        
        if (filteredVoices.length === 0) {
            showcase.innerHTML = '<p class="empty-state">Brak głosów spełniających kryteria</p>';
        }
    }
    
    createVoiceCard(voice) {
        const card = document.createElement('div');
        card.className = 'voice-card-showcase';
        card.dataset.voiceIndex = voice._index;
        
        const quality = voice._quality || 'Basic';
        const qualityClass = quality.toLowerCase();
        const rating = voice._rating || 0;
        
        // Create rating stars
        const ratingStars = Array(5).fill(0).map((_, i) => 
            i < rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'
        ).join('');
        
        card.innerHTML = `
            <div class="voice-header-info">
                <div class="voice-main-info">
                    <h3>${voice.name}</h3>
                    <p>${voice._languageFlag || ''} ${voice.lang}</p>
                </div>
                <span class="voice-quality-badge ${qualityClass}">${quality}</span>
            </div>
            <div class="voice-features">
                <div class="voice-feature">
                    <i class="fas fa-globe"></i>
                    <span>${voice.localService ? 'Lokalny' : 'Online'}</span>
                </div>
                <div class="voice-feature">
                    <i class="fas fa-microphone"></i>
                    <span>${voice.voiceURI.split(' ')[0]}</span>
                </div>
            </div>
            <div class="voice-rating">${ratingStars}</div>
            <div class="voice-actions">
                <button class="voice-action-btn" onclick="app.previewVoice(${voice._index})">
                    <i class="fas fa-play"></i> Testuj
                </button>
                <button class="voice-action-btn primary" onclick="app.selectVoice(${voice._index})">
                    <i class="fas fa-check"></i> Wybierz
                </button>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.showVoicePreview(voice, voice._index);
            }
        });
        
        return card;
    }
    
    showVoicePreview(voice, index) {
        const panel = document.getElementById('voice-preview-panel');
        if (!panel) return;
        
        panel.style.display = 'block';
        
        const nameEl = document.getElementById('preview-voice-name');
        const detailsEl = document.getElementById('preview-voice-details');
        
        if (nameEl) nameEl.textContent = voice.name;
        if (detailsEl) {
            detailsEl.textContent = `${voice._languageFlag || ''} ${voice.lang} • ${voice._quality || 'Basic'} • Ocena: ${voice._rating || 0}/5`;
        }
        
        // Store current preview voice
        this.previewVoiceIndex = index;
        
        // Highlight selected card
        document.querySelectorAll('.voice-card-showcase').forEach(card => {
            card.classList.remove('selected');
        });
        const selectedCard = document.querySelector(`[data-voice-index="${index}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }
    
    previewVoice(index) {
        if (index < 0 || index >= this.voices.length) return;
        
        const voice = this.voices[index];
        if (!voice) return;
        
        this.stopSpeaking();
        
        // Choose appropriate test text based on language
        const testTexts = {
            'pl': 'Cześć! To jest przykładowy głos. Jak brzmi? Mam nadzieję, że dobrze.',
            'en': 'Hello! This is a sample voice. How does it sound? I hope it sounds good.',
            'de': 'Hallo! Dies ist eine Beispielstimme. Wie klingt sie? Ich hoffe gut.',
            'fr': 'Bonjour! Ceci est une voix d\'exemple. Comment ça sonne? J\'espère bien.',
            'es': '¡Hola! Esta es una voz de muestra. ¿Cómo suena? Espero que bien.',
            'default': 'Test voice. One, two, three, four, five.'
        };
        
        const langCode = voice.lang.substring(0, 2);
        const text = testTexts[langCode] || testTexts['default'];
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find the actual voice object
        const actualVoice = this.synth.getVoices()[index];
        if (actualVoice) {
            utterance.voice = actualVoice;
        }
        
        utterance.rate = parseFloat(document.getElementById('editor-rate')?.value || 1);
        utterance.pitch = parseFloat(document.getElementById('editor-pitch')?.value || 1);
        utterance.volume = parseFloat(document.getElementById('editor-volume')?.value || 1);
        
        this.synth.speak(utterance);
        this.showToast('Odtwarzanie przykładowego głosu', 'info');
    }
    
    testSelectedVoice() {
        if (this.previewVoiceIndex === undefined) return;
        
        const voice = this.voices[this.previewVoiceIndex];
        const text = document.getElementById('preview-text')?.value || 
            'To jest przykładowy tekst do przetestowania głosu.';
        
        this.stopSpeaking();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find the actual voice object
        const actualVoice = this.synth.getVoices()[this.previewVoiceIndex];
        if (actualVoice) {
            utterance.voice = actualVoice;
        }
        
        utterance.rate = parseFloat(document.getElementById('editor-rate')?.value || 1);
        utterance.pitch = parseFloat(document.getElementById('editor-pitch')?.value || 1);
        utterance.volume = parseFloat(document.getElementById('editor-volume')?.value || 1);
        
        this.synth.speak(utterance);
    }
    
    selectVoice(index) {
        if (index < 0 || index >= this.voices.length) return;
        
        this.selectedVoice = this.voices[index];
        const select = document.getElementById('editor-voice-select');
        if (select) {
            select.value = index;
        }
        this.savePreferences();
        this.showToast('Głos został wybrany', 'success');
        
        // Add to favorite voices
        this.addToFavoriteVoices(this.voices[index]);
    }
    
    addToFavoriteVoices(voice) {
        let favorites = [];
        try {
            favorites = JSON.parse(localStorage.getItem('voiceflow_favorite_voices') || '[]');
        } catch (e) {
            favorites = [];
        }
        
        // Check if already in favorites
        const exists = favorites.some(fav => fav.name === voice.name && fav.lang === voice.lang);
        if (!exists) {
            favorites.push({
                name: voice.name,
                lang: voice.lang,
                voiceURI: voice.voiceURI
            });
            
            // Keep only last 10 favorites
            if (favorites.length > 10) {
                favorites = favorites.slice(-10);
            }
            
            localStorage.setItem('voiceflow_favorite_voices', JSON.stringify(favorites));
            this.updateDashboard();
        }
    }
    
    setAsDefault() {
        if (this.previewVoiceIndex === undefined) return;
        this.selectVoice(this.previewVoiceIndex);
    }
    
    refreshVoices() {
        this.loadVoices().then(() => {
            this.showToast('Lista głosów została odświeżona', 'success');
        });
    }
    
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('collapsed');
                }
            });
        }
        
        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('show');
                }
            });
        }
        
        // Theme switchers
        const themeLight = document.getElementById('theme-light');
        const themeDark = document.getElementById('theme-dark');
        const themeAuto = document.getElementById('theme-auto');
        
        if (themeLight) themeLight.addEventListener('click', () => this.setTheme('light'));
        if (themeDark) themeDark.addEventListener('click', () => this.setTheme('dark'));
        if (themeAuto) themeAuto.addEventListener('click', () => this.setTheme('auto'));
        
        // Editor controls
        this.setupEditorControls();
        
        // PDF upload
        this.setupPDFUpload();
        
        // Batch processing
        this.setupBatchProcessing();
        
        // Voice filters
        const voiceLangFilter = document.getElementById('voice-language-filter');
        if (voiceLangFilter) {
            voiceLangFilter.addEventListener('change', () => {
                this.displayVoicesShowcase();
            });
        }
        
        const voiceQualityFilter = document.getElementById('voice-quality-filter');
        if (voiceQualityFilter) {
            voiceQualityFilter.addEventListener('change', () => {
                this.displayVoicesShowcase();
            });
        }
        
        // Settings tabs
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchSettingsTab(tab.dataset.tab);
            });
        });
        
        // Settings controls
        this.setupSettingsControls();
        
        // FAB
        this.setupFAB();
        
        // Quick play button
        const quickPlay = document.getElementById('quick-play');
        if (quickPlay) {
            quickPlay.addEventListener('click', () => {
                this.quickPlay();
            });
        }
        
        // Notifications
        const notificationBtn = document.getElementById('notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.toggleNotifications();
            });
        }
        
        // Security modal
        const grantAccess = document.getElementById('grant-access');
        if (grantAccess) {
            grantAccess.addEventListener('click', () => {
                this.grantSecurityAccess();
            });
        }
        
        const denyAccess = document.getElementById('deny-access');
        if (denyAccess) {
            denyAccess.addEventListener('click', () => {
                this.denySecurityAccess();
            });
        }
        
        // History filter
        const historyFilter = document.getElementById('history-filter');
        if (historyFilter) {
            historyFilter.addEventListener('change', () => {
                this.filterHistory();
            });
        }
        
        // Volume control
        const editorVolume = document.getElementById('editor-volume');
        if (editorVolume) {
            editorVolume.addEventListener('input', (e) => {
                const value = Math.round(e.target.value * 100);
                const label = e.target.nextElementSibling;
                if (label) {
                    label.textContent = value + '%';
                }
            });
        }
    }
    
    setupEditorControls() {
        // Tab management
        const addTab = document.getElementById('add-tab');
        if (addTab) {
            addTab.addEventListener('click', () => {
                this.createTab();
            });
        }
        
        // Playback controls
        const playCurrent = document.getElementById('play-current');
        if (playCurrent) {
            playCurrent.addEventListener('click', () => {
                this.playCurrentTab();
            });
        }
        
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }
        
        const stopBtn = document.getElementById('stop-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopSpeaking();
            });
        }
        
        const playAll = document.getElementById('play-all');
        if (playAll) {
            playAll.addEventListener('click', () => {
                this.playAllTabs();
            });
        }
        
        // Voice controls
        const editorRate = document.getElementById('editor-rate');
        if (editorRate) {
            editorRate.addEventListener('input', (e) => {
                const label = document.querySelector('.range-value');
                if (label) {
                    label.textContent = e.target.value + 'x';
                }
            });
        }
        
        const editorPitch = document.getElementById('editor-pitch');
        if (editorPitch) {
            editorPitch.addEventListener('input', (e) => {
                const label = e.target.nextElementSibling;
                if (label) {
                    label.textContent = e.target.value;
                }
            });
        }
        
        // Toolbar buttons
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action) {
                    this.handleToolbarAction(action);
                }
            });
        });
        
        // Tab clicks
        const editorTabs = document.getElementById('editor-tabs');
        if (editorTabs) {
            editorTabs.addEventListener('click', (e) => {
                const tab = e.target.closest('.tab');
                if (tab) {
                    if (e.target.classList.contains('tab-close')) {
                        this.closeTab(tab.dataset.tab);
                    } else {
                        this.switchTab(tab.dataset.tab);
                    }
                }
            });
        }
        
        // Progress bar interaction
        const progressContainer = document.querySelector('.progress-bar-container');
        const progressMarker = document.getElementById('progress-marker');
        
        if (progressContainer && progressMarker) {
            let isDragging = false;
            
            progressMarker.addEventListener('mousedown', () => {
                isDragging = true;
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging && this.isReading) {
                    const rect = progressContainer.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    const percentage = x / rect.width;
                    this.seekToPosition(percentage);
                }
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            progressContainer.addEventListener('click', (e) => {
                if (this.isReading && !isDragging) {
                    const rect = progressContainer.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    this.seekToPosition(percentage);
                }
            });
        }
    }
    
    seekToPosition(percentage) {
        // This is a simplified implementation
        if (this.currentUtterance) {
            this.showToast('Przewijanie w trakcie czytania', 'info');
        }
    }
    
    setupPDFUpload() {
        const dropZone = document.getElementById('pdf-upload-zone');
        const fileInput = document.getElementById('pdf-file-input');
        const uploadBtn = dropZone?.querySelector('.upload-btn');
        
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handlePDFFiles(e.target.files);
            });
        }
        
        if (dropZone) {
            // Drag and drop
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragging');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragging');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragging');
                this.handlePDFFiles(e.dataTransfer.files);
            });
        }
    }
    
    async handlePDFFiles(files) {
        const processingDiv = document.getElementById('pdf-processing');
        const processingList = document.getElementById('processing-list');
        const resultsDiv = document.getElementById('pdf-results');
        
        if (!processingDiv || !processingList) return;
        
        processingDiv.style.display = 'block';
        processingList.innerHTML = '';
        
        for (const file of files) {
            if (file.type !== 'application/pdf') {
                this.showToast(`${file.name} nie jest plikiem PDF`, 'error');
                continue;
            }
            
            // Create processing item
            const processingId = `process-${Date.now()}-${Math.random()}`;
            const processingItem = document.createElement('div');
            processingItem.className = 'processing-item';
            processingItem.id = processingId;
            processingItem.innerHTML = `
                <div class="processing-status">
                    <div class="processing-spinner"></div>
                </div>
                <div class="processing-info">
                    <h4>${file.name}</h4>
                    <p>Sprawdzanie pliku...</p>
                </div>
                <div class="processing-progress">
                    <div class="processing-progress-bar" style="width: 0%"></div>
                </div>
            `;
            processingList.appendChild(processingItem);
            
            // Store processing info
            this.processingFiles.set(processingId, {
                file,
                status: 'checking',
                progress: 0
            });
            
            try {
                // Check if file is secured
                const isSecured = await this.checkPDFSecurity(file);
                
                if (isSecured && !this.securityGranted.get(file.name)) {
                    // Show security modal
                    this.showSecurityModal(file, processingId);
                } else {
                    // Process file
                    await this.processPDFFile(file, processingId);
                }
                
            } catch (error) {
                console.error('PDF processing error:', error);
                this.updateProcessingStatus(processingId, 'error', 'Błąd przetwarzania');
            }
        }
    }
    
    async checkPDFSecurity(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ 
                data: arrayBuffer,
                password: '' 
            }).promise;
            
            // Check if PDF has security features
            const permissions = await pdf.getPermissions();
            return permissions === null || (permissions && !permissions.includes('print'));
        } catch (error) {
            // If error, assume it might be secured
            return true;
        }
    }
    
    showSecurityModal(file, processingId) {
        const modal = document.getElementById('security-modal');
        if (!modal) return;
        
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Store current file info
        this.currentSecureFile = { file, processingId };
        
        // Update processing status
        this.updateProcessingStatus(processingId, 'waiting', 'Oczekiwanie na autoryzację...');
    }
    
    async grantSecurityAccess() {
        const modal = document.getElementById('security-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
        
        if (this.currentSecureFile) {
            const { file, processingId } = this.currentSecureFile;
            this.securityGranted.set(file.name, true);
            
            // Process the file
            await this.processPDFFile(file, processingId);
            
            this.currentSecureFile = null;
        }
    }
    
    denySecurityAccess() {
        const modal = document.getElementById('security-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
        }
        
        if (this.currentSecureFile) {
            const { processingId } = this.currentSecureFile;
            this.updateProcessingStatus(processingId, 'error', 'Dostęp odmówiony');
            this.currentSecureFile = null;
        }
    }
    
    async processPDFFile(file, processingId) {
        try {
            this.updateProcessingStatus(processingId, 'processing', 'Przetwarzanie...');
            
            const text = await this.extractTextFromPDF(file, (progress) => {
                this.updateProcessingProgress(processingId, progress);
            });
            
            // Update processing status
            this.updateProcessingStatus(processingId, 'success', 'Zakończono');
            
            // Add to results
            const resultsDiv = document.getElementById('pdf-results');
            const resultsList = document.getElementById('results-list');
            
            if (resultsDiv && resultsList) {
                resultsDiv.style.display = 'block';
                
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.innerHTML = `
                    <div class="result-info">
                        <h4>${file.name}</h4>
                        <p>Wyodrębniono ${text.length.toLocaleString()} znaków • ${text.split(/\s+/).length.toLocaleString()} słów</p>
                    </div>
                    <div class="result-actions">
                        <button class="result-btn" onclick="app.previewPDFText('${file.name}')">
                            <i class="fas fa-eye"></i> Podgląd
                        </button>
                        <button class="result-btn primary" onclick="app.importPDFToEditor('${file.name}')">
                            <i class="fas fa-file-import"></i> Importuj
                        </button>
                    </div>
                `;
                resultsList.appendChild(resultItem);
            }
            
            // Store extracted text
            this.pdfTexts.set(file.name, text);
            
            // Add to history
            this.addToHistory({
                type: 'pdf-import',
                name: file.name,
                size: file.size,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('PDF extraction error:', error);
            this.updateProcessingStatus(processingId, 'error', 'Błąd przetwarzania');
            this.showToast(`Błąd przetwarzania ${file.name}: ${error.message}`, 'error');
        }
    }
    
    updateProcessingStatus(processingId, status, message) {
        const item = document.getElementById(processingId);
        if (!item) return;
        
        const statusEl = item.querySelector('.processing-status');
        const infoEl = item.querySelector('.processing-info p');
        
        if (!statusEl || !infoEl) return;
        
        item.classList.remove('success', 'error');
        
        switch (status) {
            case 'success':
                statusEl.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i>';
                item.classList.add('success');
                break;
            case 'error':
                statusEl.innerHTML = '<i class="fas fa-times-circle" style="color: var(--danger);"></i>';
                item.classList.add('error');
                break;
            case 'waiting':
                statusEl.innerHTML = '<i class="fas fa-lock" style="color: var(--warning);"></i>';
                break;
            case 'processing':
            default:
                statusEl.innerHTML = '<div class="processing-spinner"></div>';
        }
        
        infoEl.textContent = message;
    }
    
    updateProcessingProgress(processingId, progress) {
        const item = document.getElementById(processingId);
        if (!item) return;
        
        const progressBar = item.querySelector('.processing-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
    
    async extractTextFromPDF(file, progressCallback) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ 
                data: arrayBuffer,
                password: this.securityGranted.get(file.name) ? '' : undefined
            }).promise;
            
            let fullText = '';
            const numPages = pdf.numPages;
            
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Enhanced text extraction
                let pageText = '';
                let lastY = null;
                let lastX = null;
                const lineHeight = 15;
                const wordSpacing = 5;
                
                textContent.items.forEach((item) => {
                    if (!item.str) return;
                    
                    const currentY = item.transform[5];
                    const currentX = item.transform[4];
                    
                    // Detect line breaks
                    if (lastY !== null) {
                        const yDiff = Math.abs(currentY - lastY);
                        if (yDiff > lineHeight) {
                            if (yDiff > lineHeight * 2) {
                                pageText += '\n\n';
                            } else {
                                pageText += '\n';
                            }
                        } else if (lastX !== null && currentX - lastX > wordSpacing) {
                            pageText += ' ';
                        }
                    }
                    
                    pageText += item.str;
                    
                    if (item.hasEOL) {
                        pageText += '\n';
                    }
                    
                    lastY = currentY;
                    lastX = currentX + (item.width || 0);
                });
                
                // Clean up the text
                pageText = this.cleanExtractedText(pageText);
                
                fullText += pageText;
                
                // Add page separator
                if (i < numPages) {
                    fullText += '\n\n--- Strona ' + i + ' ---\n\n';
                }
                
                // Report progress
                if (progressCallback) {
                    progressCallback(Math.round((i / numPages) * 100));
                }
            }
            
            return this.postProcessText(fullText);
        } catch (error) {
            console.error('PDF extraction error:', error);
            throw error;
        }
    }
    
    cleanExtractedText(text) {
        // Remove multiple spaces
        text = text.replace(/\s+/g, ' ');
        
        // Fix common OCR issues
        text = text.replace(/\s+([.,;:!?])/g, '$1');
        text = text.replace(/([.,;:!?])(?=[A-Za-z])/g, '$1 ');
        
        // Fix quote marks
        text = text.replace(/"/g, '"');
        text = text.replace(/"/g, '"');
        text = text.replace(/'/g, "'");
        text = text.replace(/'/g, "'");
        
        // Remove excessive line breaks
        text = text.replace(/\n{3,}/g, '\n\n');
        
        return text.trim();
    }
    
    postProcessText(text) {
        // Fix hyphenation at line breaks
        text = text.replace(/(\w+)-\n(\w+)/g, '$1$2');
        
        // Ensure proper spacing after punctuation
        text = text.replace(/([.!?])([A-Z])/g, '$1 $2');
        
        // Fix common Polish characters if needed
        const polishFixes = {
            'a,': 'ą',
            'e,': 'ę',
            'c´': 'ć',
            'n´': 'ń',
            'o´': 'ó',
            's´': 'ś',
            'z´': 'ź',
            'z.': 'ż',
            'l/': 'ł'
        };
        
        Object.entries(polishFixes).forEach(([wrong, correct]) => {
            text = text.replace(new RegExp(wrong, 'g'), correct);
        });
        
        return text;
    }
    
    previewPDFText(fileName) {
        const text = this.pdfTexts.get(fileName);
        if (!text) return;
        
        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; width: 90%;">
                <div class="modal-header">
                    <h2><i class="fas fa-file-pdf"></i> Podgląd: ${fileName}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div class="text-preview-controls">
                        <button class="preview-control-btn" onclick="app.copyToClipboard('${fileName}')">
                            <i class="fas fa-copy"></i> Kopiuj
                        </button>
                        <button class="preview-control-btn" onclick="app.playPreviewText('${fileName}')">
                            <i class="fas fa-play"></i> Odtwórz
                        </button>
                    </div>
                    <pre style="white-space: pre-wrap; font-family: 'Inter', sans-serif; line-height: 1.8;">${this.escapeHtml(text)}</pre>
                </div>
                <div class="modal-footer">
                    <button class="control-btn" onclick="this.closest('.modal').remove()">Zamknij</button>
                    <button class="control-btn primary" onclick="app.importPDFToEditor('${fileName}'); this.closest('.modal').remove();">
                        <i class="fas fa-file-import"></i> Importuj do edytora
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    copyToClipboard(fileName) {
        const text = this.pdfTexts.get(fileName);
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Skopiowano do schowka', 'success');
        }).catch(() => {
            this.showToast('Błąd kopiowania', 'error');
        });
    }
    
    playPreviewText(fileName) {
        const text = this.pdfTexts.get(fileName);
        if (!text) return;
        
        this.stopSpeaking();
        this.speak(text);
        this.showToast('Rozpoczęto czytanie podglądu', 'info');
    }
    
    importPDFToEditor(fileName) {
        const text = this.pdfTexts.get(fileName);
        if (!text) return;
        
        const tabId = this.createTab(fileName.replace('.pdf', ''));
        
        setTimeout(() => {
            const textarea = document.querySelector(`#${tabId} .text-editor`);
            if (textarea) {
                textarea.value = text;
                this.updateWordCount(tabId);
                this.saveTab(tabId);
                this.showToast(`Zaimportowano ${fileName}`, 'success');
                this.switchSection('editor');
            }
        }, 100);
    }
    
    importAllPDFs() {
        if (!this.pdfTexts || this.pdfTexts.size === 0) {
            this.showToast('Brak plików do importu', 'warning');
            return;
        }
        
        this.pdfTexts.forEach((text, fileName) => {
            this.importPDFToEditor(fileName);
        });
        
        this.showToast(`Zaimportowano ${this.pdfTexts.size} plików`, 'success');
    }
    
    clearPDFResults() {
        const resultsDiv = document.getElementById('pdf-results');
        const resultsList = document.getElementById('results-list');
        
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (resultsList) resultsList.innerHTML = '';
        
        this.pdfTexts.clear();
        this.showToast('Wyniki zostały wyczyszczone', 'info');
    }
    
    cancelProcessing() {
        this.processingFiles.clear();
        const processingDiv = document.getElementById('pdf-processing');
        if (processingDiv) {
            processingDiv.style.display = 'none';
        }
        this.showToast('Anulowano przetwarzanie', 'info');
    }
    
    setupBatchProcessing() {
        const dropZone = document.getElementById('batch-drop-zone');
        const fileInput = document.getElementById('batch-file-input');
        const selectBtn = dropZone?.querySelector('.batch-select-btn');
        
        if (selectBtn && fileInput) {
            selectBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleBatchFiles(e.target.files);
            });
        }
        
        if (dropZone) {
            // Drag and drop
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragging');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragging');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragging');
                this.handleBatchFiles(e.dataTransfer.files);
            });
        }
    }
    
    handleBatchFiles(files) {
        const queueDiv = document.getElementById('batch-queue');
        const queueList = document.getElementById('queue-list');
        
        if (!files || files.length === 0) return;
        if (!queueDiv || !queueList) return;
        
        queueDiv.style.display = 'block';
        
        Array.from(files).forEach(file => {
            // Check if file is supported
            const supportedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            
            if (!supportedTypes.includes(file.type)) {
                this.showToast(`${file.name} - nieobsługiwany format`, 'warning');
                return;
            }
            
            // Add to queue
            const queueItem = {
                id: `batch-${Date.now()}-${Math.random()}`,
                file,
                status: 'pending'
            };
            
            this.batchQueue.push(queueItem);
            
            // Create queue item UI
            const itemEl = document.createElement('div');
            itemEl.className = 'queue-item';
            itemEl.id = queueItem.id;
            itemEl.innerHTML = `
                <div class="queue-item-info">
                    <div class="queue-item-status">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div>
                        <h4>${file.name}</h4>
                        <p>${this.formatFileSize(file.size)}</p>
                    </div>
                </div>
                <button class="action-btn" onclick="app.removeFromQueue('${queueItem.id}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            queueList.appendChild(itemEl);
        });
        
        this.showToast(`Dodano ${files.length} plików do kolejki`, 'info');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    removeFromQueue(id) {
        this.batchQueue = this.batchQueue.filter(item => item.id !== id);
        const element = document.getElementById(id);
        if (element) element.remove();
        
        if (this.batchQueue.length === 0) {
            const queueDiv = document.getElementById('batch-queue');
            if (queueDiv) queueDiv.style.display = 'none';
        }
    }
    
    async startBatchProcessing() {
        if (this.batchQueue.length === 0) {
            this.showToast('Kolejka jest pusta', 'warning');
            return;
        }
        
        this.showToast('Rozpoczęto przetwarzanie wsadowe', 'info');
        
        for (const item of this.batchQueue) {
            if (item.status === 'processed') continue;
            
            // Update UI
            const itemEl = document.getElementById(item.id);
            if (itemEl) {
                const statusEl = itemEl.querySelector('.queue-item-status');
                if (statusEl) {
                    statusEl.innerHTML = '<div class="processing-spinner"></div>';
                }
            }
            
            try {
                let text = '';
                
                if (item.file.type === 'application/pdf') {
                    text = await this.extractTextFromPDF(item.file);
                } else if (item.file.type === 'text/plain') {
                    text = await item.file.text();
                }
                
                // Import to editor
                const tabId = this.createTab(item.file.name);
                setTimeout(() => {
                    const textarea = document.querySelector(`#${tabId} .text-editor`);
                    if (textarea) {
                        textarea.value = text;
                        this.updateWordCount(tabId);
                        this.saveTab(tabId);
                    }
                }, 100);
                
                // Update status
                item.status = 'processed';
                if (itemEl) {
                    const statusEl = itemEl.querySelector('.queue-item-status');
                    if (statusEl) {
                        statusEl.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i>';
                    }
                }
                
            } catch (error) {
                console.error('Batch processing error:', error);
                item.status = 'error';
                if (itemEl) {
                    const statusEl = itemEl.querySelector('.queue-item-status');
                    if (statusEl) {
                        statusEl.innerHTML = '<i class="fas fa-times-circle" style="color: var(--danger);"></i>';
                    }
                }
            }
        }
        
        this.showToast('Zakończono przetwarzanie wsadowe', 'success');
    }
    
    clearBatchQueue() {
        this.batchQueue = [];
        const queueList = document.getElementById('queue-list');
        if (queueList) queueList.innerHTML = '';
        
        const queueDiv = document.getElementById('batch-queue');
        if (queueDiv) queueDiv.style.display = 'none';
        
        this.showToast('Wyczyszczono kolejkę', 'info');
    }
    
    initializePDFJS() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }
    
    initializeEditor() {
        // Create first tab
        this.tabs.set('tab-1', {
            name: 'Dokument 1',
            content: '',
            wordCount: 0,
            charCount: 0,
            language: 'pl'
        });
        
        // Setup text editor
        const textarea = document.querySelector('#tab-1 .text-editor');
        if (textarea) {
            textarea.addEventListener('input', () => {
                this.updateWordCount('tab-1');
                this.autoSave();
            });
            
            // Add paste event handler for better formatting
            textarea.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                const formattedText = this.cleanExtractedText(text);
                document.execCommand('insertText', false, formattedText);
            });
        }
    }
    
    createTab(name = null) {
        this.tabCounter++;
        const tabId = `tab-${this.tabCounter}`;
        const tabName = name || `Dokument ${this.tabCounter}`;
        
        // Create tab element
        const tab = document.createElement('li');
        tab.className = 'tab';
        tab.dataset.tab = tabId;
        tab.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <span>${this.truncateText(tabName, 20)}</span>
            <button class="tab-close">×</button>
        `;
        
        // Insert before add button
        const addBtn = document.getElementById('add-tab');
        if (addBtn && addBtn.parentElement) {
            addBtn.parentElement.insertBefore(tab, addBtn);
        }
        
        // Create tab content
        const content = document.createElement('div');
        content.id = tabId;
        content.className = 'editor-content';
        content.innerHTML = `
            <textarea class="text-editor" placeholder="Zacznij pisać lub wklej tekst tutaj..."></textarea>
        `;
        
        const editorBody = document.querySelector('.editor-body');
        if (editorBody) {
            editorBody.appendChild(content);
        }
        
        // Setup event listener
        const textarea = content.querySelector('.text-editor');
        if (textarea) {
            textarea.addEventListener('input', () => {
                this.updateWordCount(tabId);
                this.autoSave();
            });
            
            textarea.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                const formattedText = this.cleanExtractedText(text);
                document.execCommand('insertText', false, formattedText);
            });
        }
        
        // Add to tabs map
        this.tabs.set(tabId, {
            name: tabName,
            content: '',
            wordCount: 0,
            charCount: 0,
            language: this.detectLanguage(name || '')
        });
        
        // Switch to new tab
        this.switchTab(tabId);
        
        // Update dashboard
        this.updateDashboard();
        
        return tabId;
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    detectLanguage(text) {
        // Simple language detection based on common patterns
        const polishChars = /[ąćęłńóśźż]/i;
        const germanChars = /[äöüß]/i;
        const frenchChars = /[àâçèéêëîïôùûü]/i;
        
        if (polishChars.test(text)) return 'pl';
        if (germanChars.test(text)) return 'de';
        if (frenchChars.test(text)) return 'fr';
        
        // Default to Polish for this app
        return 'pl';
    }
    
    switchTab(tabId) {
        // Update tab UI
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        // Update content
        document.querySelectorAll('.editor-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
        
        this.currentTab = tabId;
        this.updateWordCount(tabId);
        
        // Focus textarea
        setTimeout(() => {
            const textarea = document.querySelector(`#${tabId} .text-editor`);
            if (textarea) textarea.focus();
        }, 100);
    }
    
    closeTab(tabId) {
        if (this.tabs.size <= 1) {
            this.showToast('Nie można zamknąć ostatniej karty', 'warning');
            return;
        }
        
        // Confirm if tab has content
        const tabData = this.tabs.get(tabId);
        if (tabData && tabData.content.trim()) {
            if (!confirm('Czy na pewno chcesz zamknąć tę kartę? Niezapisane zmiany zostaną utracone.')) {
                return;
            }
        }
        
        // Remove tab and content
        const tabElement = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabElement) tabElement.remove();
        
        const contentElement = document.getElementById(tabId);
        if (contentElement) contentElement.remove();
        
        // Remove from map
        this.tabs.delete(tabId);
        
        // Remove from localStorage
        localStorage.removeItem(`voiceflow_tab_${tabId}`);
        
        // Switch to first available tab
        if (this.currentTab === tabId) {
            const firstTab = document.querySelector('.tab');
            if (firstTab) {
                this.switchTab(firstTab.dataset.tab);
            }
        }
        
        this.showToast('Karta została zamknięta', 'info');
        this.updateDashboard();
    }
    
    updateWordCount(tabId) {
        const textarea = document.querySelector(`#${tabId} .text-editor`);
        if (!textarea) return;
        
        const text = textarea.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        
        // Update tab data
        const tabData = this.tabs.get(tabId);
        if (tabData) {
            tabData.content = text;
            tabData.wordCount = words;
            tabData.charCount = chars;
            
            // Detect language if content is long enough
            if (text.length > 50) {
                tabData.language = this.detectLanguage(text);
            }
        }
        
        // Update UI if this is current tab
        if (tabId === this.currentTab) {
            const wordCountEl = document.querySelector('.word-count');
            const charCountEl = document.querySelector('.char-count');
            
            if (wordCountEl) wordCountEl.textContent = `${words.toLocaleString()} słów`;
            if (charCountEl) charCountEl.textContent = `${chars.toLocaleString()} znaków`;
        }
    }
    
    handleToolbarAction(action) {
        const textarea = document.querySelector(`#${this.currentTab} .text-editor`);
        if (!textarea) return;
        
        switch (action) {
            case 'bold':
                this.wrapSelection(textarea, '**', '**');
                break;
            case 'italic':
                this.wrapSelection(textarea, '*', '*');
                break;
            case 'underline':
                this.wrapSelection(textarea, '<u>', '</u>');
                break;
            case 'list-ol':
                this.insertList(textarea, 'ordered');
                break;
            case 'list-ul':
                this.insertList(textarea, 'unordered');
                break;
            case 'undo':
                document.execCommand('undo');
                break;
            case 'redo':
                document.execCommand('redo');
                break;
        }
        
        this.updateWordCount(this.currentTab);
    }
    
    wrapSelection(textarea, before, after) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const replacement = before + selectedText + after;
        
        textarea.setRangeText(replacement);
        textarea.focus();
        textarea.setSelectionRange(start + before.length, end + before.length);
    }
    
    insertList(textarea, type) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const lines = selectedText.split('\n');
        
        const listItems = lines.map((line, index) => {
            if (type === 'ordered') {
                return `${index + 1}. ${line}`;
            } else {
                return `• ${line}`;
            }
        }).join('\n');
        
        textarea.setRangeText(listItems);
        textarea.focus();
    }
    
    async playCurrentTab() {
        const textarea = document.querySelector(`#${this.currentTab} .text-editor`);
        if (!textarea || !textarea.value.trim()) {
            this.showToast('Brak tekstu do odczytania', 'warning');
            return;
        }
        
        this.stopSpeaking();
        
        // Start reading session
        this.startReadingSession();
        
        const text = textarea.value;
        await this.speakEnhanced(text);
        this.showPlaybackProgress();
    }
    
    async playAllTabs() {
        this.readingQueue = [];
        
        this.tabs.forEach((tabData, tabId) => {
            if (tabData.content.trim()) {
                this.readingQueue.push({
                    tabId,
                    content: tabData.content,
                    name: tabData.name
                });
            }
        });
        
        if (this.readingQueue.length === 0) {
            this.showToast('Brak tekstu do odczytania', 'warning');
            return;
        }
        
        this.startReadingSession();
        this.currentQueueIndex = 0;
        await this.playQueue();
        this.showPlaybackProgress();
    }
    
    async playQueue() {
        if (this.currentQueueIndex >= this.readingQueue.length) {
            this.endReadingSession();
            this.hidePlaybackProgress();
            this.showToast('Zakończono czytanie wszystkich dokumentów', 'success');
            return;
        }
        
        const item = this.readingQueue[this.currentQueueIndex];
        this.updateProgressStatus(`Czytanie: ${item.name} (${this.currentQueueIndex + 1}/${this.readingQueue.length})`);
        
        await this.speakEnhanced(item.content, async () => {
            this.currentQueueIndex++;
            await this.playQueue();
        });
    }
    
    async speakEnhanced(text, onEndCallback) {
        // Enhanced text processing for better reading
        const processedText = this.preprocessTextForReading(text);
        const sentences = this.splitIntoSentences(processedText);
        
        this.isReading = true;
        let sentenceIndex = 0;
        
        const readNextSentence = () => {
            if (sentenceIndex >= sentences.length || !this.isReading) {
                if (onEndCallback) onEndCallback();
                return;
            }
            
            const sentence = sentences[sentenceIndex];
            const utterance = new SpeechSynthesisUtterance(sentence);
            this.configureUtterance(utterance);
            
            utterance.onend = () => {
                sentenceIndex++;
                
                // Add pause between sentences if enabled
                if (this.readingSettings.pauseBetweenSentences && sentenceIndex < sentences.length) {
                    setTimeout(() => {
                        readNextSentence();
                    }, this.readingSettings.pauseLength);
                } else {
                    readNextSentence();
                }
            };
            
            utterance.onerror = (event) => {
                console.error('Speech error:', event);
                this.showToast('Błąd podczas czytania', 'error');
                this.stopSpeaking();
            };
            
            this.currentUtterance = utterance;
            this.synth.speak(utterance);
            
            // Update progress
            this.updateReadingProgress(sentenceIndex, sentences.length);
        };
        
        readNextSentence();
    }
    
    preprocessTextForReading(text) {
        // Smart text preprocessing for better TTS output
        let processed = text;
        
        // Handle abbreviations
        const abbreviations = {
            'np.': 'na przykład',
            'tzw.': 'tak zwany',
            'itd.': 'i tak dalej',
            'itp.': 'i tym podobne',
            'dr': 'doktor',
            'prof.': 'profesor',
            'mgr': 'magister',
            'inż.': 'inżynier',
            'ul.': 'ulica',
            'nr': 'numer',
            'tel.': 'telefon',
            'godz.': 'godzina',
            'min.': 'minimum',
            'max.': 'maksimum',
            'zł': 'złotych',
            'km': 'kilometrów',
            'kg': 'kilogramów',
            'm': 'metrów',
            'cm': 'centymetrów',
            'l': 'litrów',
            'szt.': 'sztuk'
        };
        
        Object.entries(abbreviations).forEach(([abbr, full]) => {
            const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}`, 'gi');
            processed = processed.replace(regex, full);
        });
        
        // Handle numbers with units
        processed = processed.replace(/(\d+)\s*km/g, '$1 kilometrów');
        processed = processed.replace(/(\d+)\s*m\b/g, '$1 metrów');
        processed = processed.replace(/(\d+)\s*kg/g, '$1 kilogramów');
        processed = processed.replace(/(\d+)\s*zł/g, '$1 złotych');
        
        // Handle dates
        processed = processed.replace(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g, (match, day, month, year) => {
            const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
                          'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
            const monthIndex = parseInt(month) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                return `${day} ${months[monthIndex]} ${year} roku`;
            }
            return match;
        });
        
        // Handle URLs
        processed = processed.replace(/https?:\/\/[^\s]+/g, 'adres internetowy');
        
        // Handle email addresses
        processed = processed.replace(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, 'adres email');
        
        // Fix punctuation for better pauses
        if (this.readingSettings.smartPunctuation) {
            processed = processed.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
            processed = processed.replace(/,/g, ', ');
            processed = processed.replace(/;/g, '; ');
            processed = processed.replace(/:/g, ': ');
        }
        
        return processed;
    }
    
    splitIntoSentences(text) {
        // Smart sentence splitting
        const sentenceEnders = /[.!?]+/g;
        let sentences = [];
        let lastIndex = 0;
        let match;
        
        while ((match = sentenceEnders.exec(text)) !== null) {
            const sentence = text.substring(lastIndex, match.index + match[0].length).trim();
            if (sentence) {
                sentences.push(sentence);
            }
            lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text
        const remaining = text.substring(lastIndex).trim();
        if (remaining) {
            sentences.push(remaining);
        }
        
        // Combine short sentences for better flow
        const combinedSentences = [];
        let currentSentence = '';
        
        sentences.forEach(sentence => {
            if (currentSentence && currentSentence.length + sentence.length < 200) {
                currentSentence += ' ' + sentence;
            } else {
                if (currentSentence) {
                    combinedSentences.push(currentSentence);
                }
                currentSentence = sentence;
            }
        });
        
        if (currentSentence) {
            combinedSentences.push(currentSentence);
        }
        
        return combinedSentences;
    }
    
    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        this.configureUtterance(utterance);
        
        utterance.onstart = () => {
            this.isReading = true;
            this.updateProgressStatus('Czytanie...');
        };
        
        utterance.onend = () => {
            this.isReading = false;
            this.hidePlaybackProgress();
        };
        
        utterance.onerror = (event) => {
            console.error('Speech error:', event);
            this.showToast('Błąd podczas czytania', 'error');
            this.hidePlaybackProgress();
        };
        
        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }
    
    configureUtterance(utterance) {
        const voiceSelect = document.getElementById('editor-voice-select');
        const voiceIndex = voiceSelect?.value;
        
        if (voiceIndex && this.voices[voiceIndex]) {
            // Get the actual voice object
            const actualVoice = this.synth.getVoices()[voiceIndex];
            if (actualVoice) {
                utterance.voice = actualVoice;
            }
        }
        
        utterance.rate = parseFloat(document.getElementById('editor-rate')?.value || 1);
        utterance.pitch = parseFloat(document.getElementById('editor-pitch')?.value || 1);
        utterance.volume = parseFloat(document.getElementById('editor-volume')?.value || 1);
    }
    
    togglePause() {
        if (!this.synth.speaking) return;
        
        const pauseBtn = document.getElementById('pause-btn');
        if (!pauseBtn) return;
        
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            this.updateProgressStatus('Czytanie...');
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> <span>Pauza</span>';
        } else {
            this.synth.pause();
            this.isPaused = true;
            this.updateProgressStatus('Wstrzymano');
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> <span>Wznów</span>';
        }
    }
    
    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
            this.isReading = false;
            this.isPaused = false;
            this.currentUtterance = null;
            this.readingQueue = [];
            this.hidePlaybackProgress();
            
            const pauseBtn = document.getElementById('pause-btn');
            if (pauseBtn) {
                pauseBtn.innerHTML = '<i class="fas fa-pause"></i> <span>Pauza</span>';
            }
        }
    }
    
    quickPlay() {
        // Get text from current tab or clipboard
        const textarea = document.querySelector(`#${this.currentTab} .text-editor`);
        
        if (textarea && textarea.value.trim()) {
            this.playCurrentTab();
        } else {
            // Try to read from clipboard
            navigator.clipboard.readText().then(text => {
                if (text.trim()) {
                    this.speak(text);
                    this.showPlaybackProgress();
                    this.showToast('Czytanie ze schowka', 'info');
                } else {
                    this.showToast('Brak tekstu do odczytania', 'warning');
                }
            }).catch(() => {
                this.showToast('Nie można odczytać schowka', 'error');
            });
        }
    }
    
    showPlaybackProgress() {
        const progress = document.getElementById('playback-progress');
        if (progress) {
            progress.classList.add('active');
        }
    }
    
    hidePlaybackProgress() {
        const progress = document.getElementById('playback-progress');
        if (progress) {
            progress.classList.remove('active');
        }
        this.updateProgressStatus('Gotowy');
        
        const progressFill = document.getElementById('progress-fill');
        const progressMarker = document.getElementById('progress-marker');
        
        if (progressFill) progressFill.style.width = '0%';
        if (progressMarker) progressMarker.style.left = '0%';
    }
    
    updateProgressStatus(status) {
        const statusEl = document.getElementById('progress-status');
        if (statusEl) {
            statusEl.textContent = status;
        }
    }
    
    updateReadingProgress(current, total) {
        const percentage = (current / total) * 100;
        
        const progressFill = document.getElementById('progress-fill');
        const progressMarker = document.getElementById('progress-marker');
        
        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (progressMarker) progressMarker.style.left = `${percentage}%`;
        
        // Update time
        const currentTime = this.formatTime(current * 2); // Approximate 2 seconds per sentence
        const totalTime = this.formatTime(total * 2);
        
        const progressTime = document.getElementById('progress-time');
        if (progressTime) {
            progressTime.textContent = `${currentTime} / ${totalTime}`;
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    startReadingSession() {
        this.sessionStartTime = Date.now();
    }
    
    endReadingSession() {
        if (this.sessionStartTime) {
            const sessionDuration = Date.now() - this.sessionStartTime;
            this.readingStats.totalTime += sessionDuration;
            this.readingStats.todayTime += sessionDuration;
            
            // Save stats
            this.saveReadingStats();
            this.updateDashboard();
            
            this.sessionStartTime = null;
        }
    }
    
    saveReadingStats() {
        const stats = {
            totalTime: this.readingStats.totalTime,
            todayTime: this.readingStats.todayTime,
            wordsRead: this.readingStats.wordsRead,
            lastUpdate: Date.now()
        };
        
        localStorage.setItem('voiceflow_reading_stats', JSON.stringify(stats));
    }
    
    loadReadingStats() {
        const saved = localStorage.getItem('voiceflow_reading_stats');
        if (saved) {
            try {
                const stats = JSON.parse(saved);
                
                // Check if it's a new day
                const lastUpdate = new Date(stats.lastUpdate);
                const today = new Date();
                if (lastUpdate.toDateString() !== today.toDateString()) {
                    stats.todayTime = 0;
                }
                
                this.readingStats = stats;
            } catch (error) {
                console.error('Error loading reading stats:', error);
            }
        }
    }
    
    switchSection(section) {
        // Update sidebar
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // Update content
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === `${section}-section`);
        });
        
        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'editor': 'Edytor tekstu',
            'pdf-converter': 'Konwerter PDF',
            'voices': 'Biblioteka głosów',
            'settings': 'Ustawienia',
            'batch': 'Przetwarzanie wsadowe',
            'history': 'Historia'
        };
        
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[section] || 'VoiceFlow Pro';
        }
        
        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('show');
        }
        
        this.currentSection = section;
        
        // Section-specific actions
        if (section === 'dashboard') {
            this.updateDashboard();
        } else if (section === 'history') {
            this.displayHistory();
        }
    }
    
    switchSettingsTab(tab) {
        // Update tabs
        document.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        // Update panels
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tab}-settings`);
        });
    }
    
    setupSettingsControls() {
        // Theme select
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        // Compact view
        const compactView = document.getElementById('compact-view');
        if (compactView) {
            compactView.addEventListener('change', (e) => {
                document.body.classList.toggle('compact', e.target.checked);
                localStorage.setItem('voiceflow_compact_view', e.target.checked);
            });
        }
        
        // Auto save
        const autoSaveToggle = document.getElementById('auto-save-toggle');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', (e) => {
                this.autoSaveEnabled = e.target.checked;
                localStorage.setItem('voiceflow_auto_save', e.target.checked);
            });
        }
        
        // Save interval
        const saveInterval = document.getElementById('save-interval');
        if (saveInterval) {
            saveInterval.addEventListener('change', (e) => {
                this.autoSaveInterval = parseInt(e.target.value) * 1000;
                localStorage.setItem('voiceflow_save_interval', e.target.value);
            });
        }
        
        // Default volume
        const defaultVolume = document.getElementById('default-volume');
        if (defaultVolume) {
            defaultVolume.addEventListener('input', (e) => {
                const label = e.target.nextElementSibling;
                if (label) {
                    label.textContent = e.target.value + '%';
                }
                localStorage.setItem('voiceflow_default_volume', e.target.value);
            });
        }
        
        // Sentence pause
        const sentencePause = document.getElementById('sentence-pause');
        if (sentencePause) {
            sentencePause.addEventListener('change', (e) => {
                this.readingSettings.pauseBetweenSentences = e.target.checked;
                localStorage.setItem('voiceflow_sentence_pause', e.target.checked);
            });
        }
        
        // Pause length
        const pauseLength = document.getElementById('pause-length');
        if (pauseLength) {
            pauseLength.addEventListener('input', (e) => {
                this.readingSettings.pauseLength = parseInt(e.target.value);
                localStorage.setItem('voiceflow_pause_length', e.target.value);
            });
        }
        
        // Debug mode
        const debugMode = document.getElementById('debug-mode');
        if (debugMode) {
            debugMode.addEventListener('change', (e) => {
                this.debugMode = e.target.checked;
                localStorage.setItem('voiceflow_debug_mode', e.target.checked);
                
                if (this.debugMode) {
                    console.log('Debug mode enabled');
                }
            });
        }
    }
    
    setupFAB() {
        const fabMain = document.getElementById('fab-main');
        const fabContainer = document.querySelector('.fab-container');
        
        if (fabMain && fabContainer) {
            fabMain.addEventListener('click', () => {
                fabContainer.classList.toggle('active');
            });
            
            // FAB actions
            const fabItems = document.querySelectorAll('.fab-item');
            fabItems.forEach((item, index) => {
                item.addEventListener('click', () => {
                    switch (index) {
                        case 0: // New document
                            this.switchSection('editor');
                            this.createTab();
                            break;
                        case 1: // Import PDF
                            this.switchSection('pdf-converter');
                            break;
                        case 2: // Recording
                            this.startVoiceRecording();
                            break;
                    }
                    fabContainer.classList.remove('active');
                });
            });
            
            // Close FAB on outside click
            document.addEventListener('click', (e) => {
                if (!fabContainer.contains(e.target)) {
                    fabContainer.classList.remove('active');
                }
            });
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Space: Play/Pause
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                if (this.isReading) {
                    this.togglePause();
                } else {
                    this.playCurrentTab();
                }
            }
            
            // Ctrl/Cmd + S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveAllTabs();
            }
            
            // Ctrl/Cmd + T: New tab
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                if (this.currentSection === 'editor') {
                    this.createTab();
                } else {
                    this.switchSection('editor');
                }
            }
            
            // Ctrl/Cmd + W: Close tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                if (this.currentSection === 'editor' && this.tabs.size > 1) {
                    this.closeTab(this.currentTab);
                }
            }
            
            // Ctrl/Cmd + O: Open file
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.openFile();
            }
            
            // Ctrl/Cmd + Shift + S: Save as
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.saveAs();
            }
            
            // Escape: Stop speaking
            if (e.key === 'Escape') {
                this.stopSpeaking();
            }
            
            // F11: Toggle fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            // Ctrl/Cmd + F: Find in text
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.showFindDialog();
            }
            
            // Tab navigation with Ctrl + 1-9
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabs = Array.from(document.querySelectorAll('.tab'));
                if (tabs[tabIndex]) {
                    this.switchTab(tabs[tabIndex].dataset.tab);
                }
            }
        });
    }
    
    openFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.pdf,.docx';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.type === 'text/plain') {
                const text = await file.text();
                const tabId = this.createTab(file.name);
                
                setTimeout(() => {
                    const textarea = document.querySelector(`#${tabId} .text-editor`);
                    if (textarea) {
                        textarea.value = text;
                        this.updateWordCount(tabId);
                        this.saveTab(tabId);
                    }
                }, 100);
            } else if (file.type === 'application/pdf') {
                this.switchSection('pdf-converter');
                this.handlePDFFiles([file]);
            }
        });
        
        input.click();
    }
    
    saveAs() {
        const tabData = this.tabs.get(this.currentTab);
        if (!tabData || !tabData.content) {
            this.showToast('Brak treści do zapisania', 'warning');
            return;
        }
        
        const blob = new Blob([tabData.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tabData.name}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Plik został zapisany', 'success');
    }
    
    showFindDialog() {
        // TODO: Implement find dialog
        this.showToast('Funkcja wyszukiwania będzie dostępna wkrótce', 'info');
    }
    
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);
        
        // Update theme select
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }
        
        // Check system preference for auto theme
        if (savedTheme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.toggle('light-theme', !prefersDark);
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('theme') === 'auto') {
                document.body.classList.toggle('light-theme', !e.matches);
            }
        });
    }
    
    setTheme(theme) {
        // Update buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const themeBtn = document.getElementById(`theme-${theme}`);
        if (themeBtn) {
            themeBtn.classList.add('active');
        }
        
        // Apply theme
        switch (theme) {
            case 'light':
                document.body.classList.add('light-theme');
                break;
            case 'dark':
                document.body.classList.remove('light-theme');
                break;
            case 'auto':
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.classList.toggle('light-theme', !prefersDark);
                break;
        }
        
        localStorage.setItem('theme', theme);
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    autoSave() {
        if (!this.autoSaveEnabled) return;
        
        // Debounce auto-save
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveAllTabs(true);
        }, this.autoSaveInterval || 30000);
    }
    
    saveTab(tabId) {
        const tabData = this.tabs.get(tabId);
        if (!tabData) return;
        
        const saveData = {
            name: tabData.name,
            content: tabData.content,
            language: tabData.language,
            timestamp: Date.now()
        };
        
        localStorage.setItem(`voiceflow_tab_${tabId}`, JSON.stringify(saveData));
    }
    
    saveAllTabs(silent = false) {
        this.tabs.forEach((tabData, tabId) => {
            this.saveTab(tabId);
        });
        
        // Save app state
        const appState = {
            currentTab: this.currentTab,
            tabCounter: this.tabCounter,
            selectedVoice: document.getElementById('editor-voice-select')?.value,
            rate: document.getElementById('editor-rate')?.value,
            pitch: document.getElementById('editor-pitch')?.value,
            volume: document.getElementById('editor-volume')?.value,
            theme: localStorage.getItem('theme') || 'dark',
            timestamp: Date.now()
        };
        
        localStorage.setItem('voiceflow_app_state', JSON.stringify(appState));
        
        if (!silent) {
            this.showToast('Wszystkie dokumenty zostały zapisane', 'success');
        }
    }
    
    loadPreferences() {
        // Load reading stats
        this.loadReadingStats();
        
        // Load app state
        const savedState = localStorage.getItem('voiceflow_app_state');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                
                // Restore voice settings
                if (state.selectedVoice) {
                    setTimeout(() => {
                        const select = document.getElementById('editor-voice-select');
                        if (select && select.options[state.selectedVoice]) {
                            select.value = state.selectedVoice;
                        }
                    }, 1000);
                }
                
                // Restore audio settings
                if (state.rate) {
                    const rateEl = document.getElementById('editor-rate');
                    if (rateEl) {
                        rateEl.value = state.rate;
                        const label = document.querySelector('.range-value');
                        if (label) label.textContent = state.rate + 'x';
                    }
                }
                
                if (state.pitch) {
                    const pitchEl = document.getElementById('editor-pitch');
                    if (pitchEl) {
                        pitchEl.value = state.pitch;
                        const label = pitchEl.nextElementSibling;
                        if (label) label.textContent = state.pitch;
                    }
                }
                
                if (state.volume) {
                    const volumeEl = document.getElementById('editor-volume');
                    if (volumeEl) {
                        volumeEl.value = state.volume;
                        const label = volumeEl.nextElementSibling;
                        if (label) label.textContent = Math.round(state.volume * 100) + '%';
                    }
                }
                
                this.tabCounter = state.tabCounter || 1;
                
            } catch (error) {
                console.error('Error loading preferences:', error);
            }
        }
        
        // Load settings
        const compactView = localStorage.getItem('voiceflow_compact_view') === 'true';
        document.body.classList.toggle('compact', compactView);
        const compactViewEl = document.getElementById('compact-view');
        if (compactViewEl) {
            compactViewEl.checked = compactView;
        }
        
        this.autoSaveEnabled = localStorage.getItem('voiceflow_auto_save') !== 'false';
        const autoSaveEl = document.getElementById('auto-save-toggle');
        if (autoSaveEl) {
            autoSaveEl.checked = this.autoSaveEnabled;
        }
        
        const saveInterval = localStorage.getItem('voiceflow_save_interval');
        if (saveInterval) {
            const saveIntervalEl = document.getElementById('save-interval');
            if (saveIntervalEl) {
                saveIntervalEl.value = saveInterval;
            }
            this.autoSaveInterval = parseInt(saveInterval) * 1000;
        }
        
        const defaultVolume = localStorage.getItem('voiceflow_default_volume');
        if (defaultVolume) {
            const volumeEl = document.getElementById('default-volume');
            if (volumeEl) {
                volumeEl.value = defaultVolume;
                const label = volumeEl.nextElementSibling;
                if (label) label.textContent = defaultVolume + '%';
            }
        }
        
        const sentencePause = localStorage.getItem('voiceflow_sentence_pause');
        if (sentencePause !== null) {
            this.readingSettings.pauseBetweenSentences = sentencePause === 'true';
            const pauseEl = document.getElementById('sentence-pause');
            if (pauseEl) {
                pauseEl.checked = this.readingSettings.pauseBetweenSentences;
            }
        }
        
        const pauseLength = localStorage.getItem('voiceflow_pause_length');
        if (pauseLength) {
            const lengthEl = document.getElementById('pause-length');
            if (lengthEl) {
                lengthEl.value = pauseLength;
            }
            this.readingSettings.pauseLength = parseInt(pauseLength);
        }
        
        this.debugMode = localStorage.getItem('voiceflow_debug_mode') === 'true';
        const debugEl = document.getElementById('debug-mode');
        if (debugEl) {
            debugEl.checked = this.debugMode;
        }
        
        // Load saved tabs
        const savedTabs = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('voiceflow_tab_')) {
                try {
                    const tabData = JSON.parse(localStorage.getItem(key));
                    const tabId = key.replace('voiceflow_tab_', '');
                    savedTabs.push({ tabId, ...tabData });
                } catch (error) {
                    console.error('Error loading tab:', error);
                }
            }
        }
        
        // Restore tabs if any saved
        if (savedTabs.length > 0) {
            // Clear default tab
            const defaultTab = document.querySelector('[data-tab="tab-1"]');
            if (defaultTab) defaultTab.remove();
            
            const defaultContent = document.getElementById('tab-1');
            if (defaultContent) defaultContent.remove();
            
            this.tabs.clear();
            
            // Recreate saved tabs
            savedTabs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            savedTabs.forEach(({ tabId, name, content, language }) => {
                const newTabId = this.createTab(name);
                setTimeout(() => {
                    const textarea = document.querySelector(`#${newTabId} .text-editor`);
                    if (textarea) {
                        textarea.value = content || '';
                        this.updateWordCount(newTabId);
                        
                        // Update language if available
                        const tabData = this.tabs.get(newTabId);
                        if (tabData && language) {
                            tabData.language = language;
                        }
                    }
                }, 100);
            });
        }
    }
    
    savePreferences() {
        const preferences = {
            selectedVoice: document.getElementById('editor-voice-select')?.value,
            rate: document.getElementById('editor-rate')?.value,
            pitch: document.getElementById('editor-pitch')?.value,
            volume: document.getElementById('editor-volume')?.value,
            timestamp: Date.now()
        };
        
        localStorage.setItem('voiceflow_preferences', JSON.stringify(preferences));
    }
    
    loadHistory() {
        const saved = localStorage.getItem('voiceflow_history');
        if (saved) {
            try {
                this.history = JSON.parse(saved);
            } catch (error) {
                console.error('Error loading history:', error);
                this.history = [];
            }
        }
    }
    
    addToHistory(item) {
        this.history.unshift({
            ...item,
            id: `history-${Date.now()}-${Math.random()}`
        });
        
        // Keep only last 100 items
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }
        
        localStorage.setItem('voiceflow_history', JSON.stringify(this.history));
        
        // Update history display if on history page
        if (this.currentSection === 'history') {
            this.displayHistory();
        }
    }
    
    displayHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        const filter = document.getElementById('history-filter')?.value || 'all';
        let filteredHistory = this.history;
        
        // Apply filter
        if (filter !== 'all') {
            const now = Date.now();
            const day = 24 * 60 * 60 * 1000;
            
            switch (filter) {
                case 'today':
                    filteredHistory = this.history.filter(item => 
                        now - item.timestamp < day
                    );
                    break;
                case 'week':
                    filteredHistory = this.history.filter(item => 
                        now - item.timestamp < 7 * day
                    );
                    break;
                case 'month':
                    filteredHistory = this.history.filter(item => 
                        now - item.timestamp < 30 * day
                    );
                    break;
            }
        }
        
        if (filteredHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-state">Brak historii dla wybranych kryteriów</p>';
            return;
        }
        
        historyList.innerHTML = filteredHistory.map(item => {
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString('pl-PL');
            const timeStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            
            let icon = 'fa-file-alt';
            let title = item.name;
            
            switch (item.type) {
                case 'pdf-import':
                    icon = 'fa-file-pdf';
                    title = `Import PDF: ${item.name}`;
                    break;
                case 'reading-session':
                    icon = 'fa-microphone';
                    title = `Sesja czytania: ${item.name}`;
                    break;
            }
            
            return `
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-item-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="history-item-details">
                            <h4>${title}</h4>
                            <p>${dateStr} o ${timeStr}</p>
                        </div>
                    </div>
                    <div class="history-item-actions">
                        <button class="action-btn" onclick="app.openHistoryItem('${item.id}')">
                            <i class="fas fa-folder-open"></i>
                        </button>
                        <button class="action-btn" onclick="app.deleteHistoryItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    filterHistory() {
        this.displayHistory();
    }
    
    openHistoryItem(id) {
        const item = this.history.find(h => h.id === id);
        if (!item) return;
        
        // TODO: Implement opening history items
        this.showToast('Otwieranie elementu historii...', 'info');
    }
    
    deleteHistoryItem(id) {
        this.history = this.history.filter(h => h.id !== id);
        localStorage.setItem('voiceflow_history', JSON.stringify(this.history));
        this.displayHistory();
        this.showToast('Usunięto z historii', 'info');
    }
    
    clearHistory() {
        if (!confirm('Czy na pewno chcesz wyczyścić całą historię?')) return;
        
        this.history = [];
        localStorage.removeItem('voiceflow_history');
        this.displayHistory();
        this.showToast('Historia została wyczyszczona', 'info');
    }
    
    setupContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (!contextMenu) return;
        
        // Add context menu to text editors
        document.addEventListener('contextmenu', (e) => {
            const textarea = e.target.closest('.text-editor');
            if (!textarea) {
                contextMenu.classList.remove('show');
                return;
            }
            
            e.preventDefault();
            
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
            contextMenu.classList.add('show');
            
            // Store target textarea
            this.contextMenuTarget = textarea;
        });
        
        // Hide context menu on click outside
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.classList.remove('show');
            }
        });
        
        // Handle context menu actions
        document.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (action) {
                    this.handleContextMenuAction(action);
                }
                contextMenu.classList.remove('show');
            });
        });
    }
    
    handleContextMenuAction(action) {
        if (!this.contextMenuTarget) return;
        
        switch (action) {
            case 'cut':
                document.execCommand('cut');
                break;
            case 'copy':
                document.execCommand('copy');
                break;
            case 'paste':
                navigator.clipboard.readText().then(text => {
                    this.contextMenuTarget.focus();
                    document.execCommand('insertText', false, text);
                });
                break;
            case 'select-all':
                this.contextMenuTarget.select();
                break;
        }
    }
    
    initializeNotifications() {
        // Initialize notification system
        this.notifications = [];
        
        // Request notification permission if needed
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    toggleNotifications() {
        // TODO: Implement notification panel
        this.showToast('Panel powiadomień będzie dostępny wkrótce', 'info');
    }
    
    setupSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            console.log('Speech recognition not supported');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pl-PL';
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                }
            }
            
            if (finalTranscript && this.currentTab) {
                const textarea = document.querySelector(`#${this.currentTab} .text-editor`);
                if (textarea) {
                    textarea.value += finalTranscript;
                    this.updateWordCount(this.currentTab);
                }
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showToast('Błąd rozpoznawania mowy', 'error');
            this.isRecording = false;
        };
    }
    
    startVoiceRecording() {
        if (!this.recognition) {
            this.showToast('Rozpoznawanie mowy nie jest obsługiwane', 'error');
            return;
        }
        
        if (this.isRecording) {
            this.recognition.stop();
            this.isRecording = false;
            this.showToast('Zatrzymano nagrywanie', 'info');
        } else {
            this.recognition.start();
            this.isRecording = true;
            this.showToast('Rozpoczęto nagrywanie głosu', 'info');
        }
    }
    
    updateDashboard() {
        // Update document count
        const docCount = document.getElementById('stat-documents');
        if (docCount) {
            docCount.textContent = this.tabs.size.toString();
        }
        
        // Update reading time
        const hours = Math.floor(this.readingStats.totalTime / 3600000);
        const todayMinutes = Math.floor(this.readingStats.todayTime / 60000);
        
        const readingTime = document.getElementById('stat-reading-time');
        if (readingTime) {
            readingTime.textContent = `${hours}h`;
        }
        
        const todayReading = document.getElementById('today-reading');
        if (todayReading) {
            todayReading.textContent = `${todayMinutes} min`;
        }
        
        // Update favorite voices
        let favorites = [];
        try {
            favorites = JSON.parse(localStorage.getItem('voiceflow_favorite_voices') || '[]');
        } catch (e) {
            favorites = [];
        }
        
        const statVoices = document.getElementById('stat-voices');
        if (statVoices) {
            statVoices.textContent = favorites.length.toString();
        }
        
        const voiceLangs = document.getElementById('voice-langs');
        if (voiceLangs) {
            if (favorites.length > 0) {
                const langCounts = {};
                favorites.forEach(voice => {
                    const lang = voice.lang.substring(0, 2);
                    langCounts[lang] = (langCounts[lang] || 0) + 1;
                });
                
                const langInfo = Object.entries(langCounts)
                    .map(([lang, count]) => `${count} ${this.getLanguageName(lang)}`)
                    .join(', ');
                voiceLangs.textContent = langInfo;
            } else {
                voiceLangs.textContent = 'Brak ulubionych głosów';
            }
        }
        
        // Update productivity
        const productivity = this.calculateProductivity();
        const statProductivity = document.getElementById('stat-productivity');
        if (statProductivity) {
            statProductivity.textContent = `${productivity}%`;
        }
        
        // Update recent files
        this.updateRecentFiles();
    }
    
    calculateProductivity() {
        // Simple productivity calculation based on usage
        const today = new Date().toDateString();
        const todayHistory = this.history.filter(item => 
            new Date(item.timestamp).toDateString() === today
        );
        
        // Base productivity on activity
        const baseScore = Math.min(todayHistory.length * 10, 50);
        const timeScore = Math.min(this.readingStats.todayTime / 60000, 50); // Max 50 points for 50 minutes
        
        return Math.round(baseScore + timeScore);
    }
    
    updateRecentFiles() {
        const recentList = document.getElementById('recent-files-list');
        if (!recentList) return;
        
        // Get recent files from history
        const recentFiles = this.history
            .filter(item => item.type === 'pdf-import' || item.type === 'file-open')
            .slice(0, 5);
        
        if (recentFiles.length === 0) {
            recentList.innerHTML = '<p class="empty-state">Brak ostatnich plików</p>';
            return;
        }
        
        recentList.innerHTML = recentFiles.map(file => {
            const date = new Date(file.timestamp);
            const timeAgo = this.getTimeAgo(date);
            
            return `
                <div class="file-item">
                    <div class="file-icon">
                        <i class="fas fa-file-${file.type === 'pdf-import' ? 'pdf' : 'alt'}"></i>
                    </div>
                    <div class="file-info">
                        <h4>${file.name}</h4>
                        <p>Edytowano: ${timeAgo}</p>
                    </div>
                    <div class="file-actions">
                        <button class="action-btn" onclick="app.openRecentFile('${file.id}')">
                            <i class="fas fa-folder-open"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'przed chwilą';
        if (minutes < 60) return `${minutes} minut temu`;
        if (hours < 24) return `${hours} godzin temu`;
        if (days === 1) return 'wczoraj';
        if (days < 7) return `${days} dni temu`;
        
        return date.toLocaleDateString('pl-PL');
    }
    
    openRecentFile(id) {
        const file = this.history.find(h => h.id === id);
        if (!file) return;
        
        // TODO: Implement opening recent files
        this.showToast('Otwieranie pliku...', 'info');
    }
    
    showAllFiles() {
        this.switchSection('history');
    }
    
    showSettings() {
        this.switchSection('settings');
    }
    
    exportData() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            tabs: Array.from(this.tabs.entries()).map(([id, data]) => ({
                id,
                ...data
            })),
            preferences: {
                theme: localStorage.getItem('theme'),
                voice: document.getElementById('editor-voice-select')?.value,
                rate: document.getElementById('editor-rate')?.value,
                pitch: document.getElementById('editor-pitch')?.value,
                volume: document.getElementById('editor-volume')?.value,
                readingSettings: this.readingSettings
            },
            history: this.history,
            readingStats: this.readingStats
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `voiceflow-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Dane zostały wyeksportowane', 'success');
    }
    
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (!data.version || !data.tabs) {
                    throw new Error('Invalid data format');
                }
                
                if (!confirm('Czy na pewno chcesz zaimportować dane? To zastąpi obecne dane.')) {
                    return;
                }
                
                // Clear current data
                localStorage.clear();
                
                // Import tabs
                data.tabs.forEach(tabData => {
                    const tabId = this.createTab(tabData.name);
                    setTimeout(() => {
                        const textarea = document.querySelector(`#${tabId} .text-editor`);
                        if (textarea) {
                            textarea.value = tabData.content || '';
                            this.updateWordCount(tabId);
                            this.saveTab(tabId);
                        }
                    }, 100);
                });
                
                // Import preferences
                if (data.preferences) {
                    if (data.preferences.theme) {
                        this.setTheme(data.preferences.theme);
                    }
                    if (data.preferences.readingSettings) {
                        this.readingSettings = data.preferences.readingSettings;
                    }
                }
                
                // Import history
                if (data.history) {
                    this.history = data.history;
                    localStorage.setItem('voiceflow_history', JSON.stringify(this.history));
                }
                
                // Import reading stats
                if (data.readingStats) {
                    this.readingStats = data.readingStats;
                    this.saveReadingStats();
                }
                
                this.showToast('Dane zostały zaimportowane', 'success');
                
                // Reload to apply all changes
                setTimeout(() => {
                    location.reload();
                }, 1000);
                
            } catch (error) {
                console.error('Import error:', error);
                this.showToast('Błąd importu danych', 'error');
            }
        });
        
        input.click();
    }
    
    resetSettings() {
        if (!confirm('Czy na pewno chcesz zresetować wszystkie ustawienia do domyślnych?')) {
            return;
        }
        
        // Clear all localStorage except tabs
        const tabsData = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('voiceflow_tab_')) {
                tabsData.push({
                    key,
                    value: localStorage.getItem(key)
                });
            }
        }
        
        localStorage.clear();
        
        // Restore tabs
        tabsData.forEach(({ key, value }) => {
            localStorage.setItem(key, value);
        });
        
        this.showToast('Ustawienia zostały zresetowane', 'info');
        
        // Reload to apply defaults
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-times-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Show browser notification if enabled
        if (this.notificationsEnabled && Notification.permission === 'granted') {
            new Notification('VoiceFlow Pro', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }
    
    hasUnsavedChanges() {
        // Check if any tab has unsaved changes
        for (const [tabId, tabData] of this.tabs) {
            const saved = localStorage.getItem(`voiceflow_tab_${tabId}`);
            if (saved) {
                try {
                    const savedData = JSON.parse(saved);
                    if (savedData.content !== tabData.content) {
                        return true;
                    }
                } catch (error) {
                    return true;
                }
            } else if (tabData.content.trim()) {
                return true;
            }
        }
        return false;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceFlowPro();
});

// Handle online/offline status
window.addEventListener('online', () => {
    window.app?.showToast('Połączenie internetowe przywrócone', 'success');
});

window.addEventListener('offline', () => {
    window.app?.showToast('Brak połączenia internetowego - aplikacja działa w trybie offline', 'warning');
});
// Prevent accidental page closure
window.addEventListener('beforeunload', (e) => {
    if (window.app && (window.app.isReading || window.app.hasUnsavedChanges())) {
        e.preventDefault();
        e.returnValue = 'Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?';
        return e.returnValue;
    }
});

// Handle visibility change (pause when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.app && window.app.isReading && !window.app.isPaused) {
        window.app.togglePause();
        window.app.showToast('Czytanie wstrzymane - karta nieaktywna', 'info');
    }
});

// Add CSS for missing styles
const style = document.createElement('style');
style.textContent = `
    /* Text preview controls */
    .text-preview-controls {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }
    
    .preview-control-btn {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: var(--transition-fast);
    }
    
    .preview-control-btn:hover {
        background: var(--bg-hover);
        border-color: var(--primary);
    }
    
    /* File item styles */
    .file-item {
        display: flex;
        align-items: center;
        padding: 1rem;
        background: var(--bg-secondary);
        border-radius: 8px;
        margin-bottom: 0.5rem;
        transition: var(--transition-fast);
    }
    
    .file-item:hover {
        background: var(--bg-hover);
    }
    
    .file-icon {
        width: 40px;
        height: 40px;
        background: var(--bg-tertiary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 1rem;
        color: var(--primary);
    }
    
    .file-info {
        flex: 1;
    }
    
    .file-info h4 {
        margin: 0 0 0.25rem 0;
        font-size: 0.875rem;
        font-weight: 600;
    }
    
    .file-info p {
        margin: 0;
        font-size: 0.75rem;
        color: var(--text-tertiary);
    }
    
    .file-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .action-btn {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        padding: 0.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: var(--transition-fast);
    }
    
    .action-btn:hover {
        background: var(--bg-hover);
        border-color: var(--primary);
    }
    
    /* Shortcuts list */
    .shortcuts-list {
        display: grid;
        gap: 0.75rem;
    }
    
    .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--bg-secondary);
        border-radius: 8px;
    }
    
    .shortcut-item kbd {
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-family: 'Courier New', monospace;
        font-size: 0.8125rem;
        min-width: 120px;
        text-align: center;
    }
    
    /* Processing spinner animation */
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Modal animations */
    .modal {
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .modal.show {
        opacity: 1;
    }
    
    .modal-content {
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    
    .modal.show .modal-content {
        transform: scale(1);
    }
    
    /* Responsive improvements */
    @media (max-width: 768px) {
        .dashboard-grid {
            grid-template-columns: 1fr;
        }
        
        .stats-row {
            grid-template-columns: 1fr;
        }
        
        .dashboard-panel {
            margin-bottom: 1rem;
        }
        
        .voice-controls {
            flex-direction: column;
        }
        
        .control-group {
            width: 100%;
        }
        
        .playback-controls {
            flex-wrap: wrap;
        }
        
        .play-btn {
            flex: 1 1 calc(50% - 0.25rem);
        }
    }
`;
document.head.appendChild(style);

// Export app to window for global access
window.VoiceFlowPro = VoiceFlowPro;

// Log successful initialization
console.log('VoiceFlow Pro initialized successfully');
console.log('User:', 'piotr20111');
console.log('Date:', new Date().toISOString());
