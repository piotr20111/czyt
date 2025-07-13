// Enhanced Text to Speech Application
class TextToSpeechApp {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentTab = 'tab-1';
        this.tabCounter = 1;
        this.tabs = new Map();
        this.isPaused = false;
        this.isReading = false;
        this.currentUtterance = null;
        this.readingQueue = [];
        this.currentQueueIndex = 0;
        this.startTime = null;
        this.elapsedInterval = null;
        
        // Polish and English voices configuration
        this.voicePreferences = {
            pl: ['Google polski', 'Microsoft Paulina', 'Microsoft Ewa', 'Polski', 'Polish'],
            en: ['Google US English', 'Microsoft David', 'Microsoft Mark', 'Microsoft Zira', 'English']
        };
        
        this.initializeApp();
    }
    
    initializeApp() {
        this.loadVoices();
        this.setupEventListeners();
        this.loadSavedData();
        this.setupKeyboardShortcuts();
        this.initializePDFJS();
        
        // Initialize first tab
        this.tabs.set('tab-1', {
            name: 'Strona 1',
            content: '',
            charCount: 0
        });
    }
    
    loadVoices() {
        const populateVoices = () => {
            this.voices = this.synth.getVoices();
            this.populateVoiceSelects();
            this.categorizeVoices();
        };
        
        populateVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = populateVoices;
        }
    }
    
    populateVoiceSelects() {
        const voiceSelect = document.getElementById('default-voice-select');
        const languageFilter = document.getElementById('language-filter');
        
        voiceSelect.innerHTML = '';
        
        // Group voices by language
        const voicesByLang = {};
        this.voices.forEach((voice, index) => {
            const lang = voice.lang.substring(0, 2);
            if (!voicesByLang[lang]) {
                voicesByLang[lang] = [];
            }
            voicesByLang[lang].push({ voice, index });
        });
        
        // Add voices to select
        Object.keys(voicesByLang).forEach(lang => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = this.getLanguageName(lang);
            
            voicesByLang[lang].forEach(({ voice, index }) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${voice.name} (${voice.lang})`;
                optgroup.appendChild(option);
            });
            
            voiceSelect.appendChild(optgroup);
        });
        
        // Try to select a Polish voice by default
        this.selectPreferredVoice('pl');
    }
    
    getLanguageName(code) {
        const languages = {
            pl: 'Polski',
            en: 'English',
            de: 'Deutsch',
            fr: 'Français',
            es: 'Español',
            it: 'Italiano',
            ru: 'Русский'
        };
        return languages[code] || code.toUpperCase();
    }
    
    selectPreferredVoice(langCode) {
        const voiceSelect = document.getElementById('default-voice-select');
        const preferences = this.voicePreferences[langCode] || [];
        
        for (let i = 0; i < this.voices.length; i++) {
            const voice = this.voices[i];
            if (voice.lang.startsWith(langCode)) {
                for (const pref of preferences) {
                    if (voice.name.includes(pref)) {
                        voiceSelect.value = i;
                        return;
                    }
                }
                // If no preferred voice found, select first voice of that language
                voiceSelect.value = i;
                return;
            }
        }
    }
    
    categorizeVoices() {
        const voicesGrid = document.getElementById('voices-grid');
        voicesGrid.innerHTML = '';
        
        // Filter voices based on language selection
        const languageFilter = document.getElementById('language-filter').value;
        const filteredVoices = this.voices.filter(voice => {
            if (languageFilter === 'all') return true;
            return voice.lang.startsWith(languageFilter);
        });
        
        filteredVoices.forEach((voice, index) => {
            const voiceCard = document.createElement('div');
            voiceCard.className = 'voice-card';
            voiceCard.innerHTML = `
                <h4>${voice.name}</h4>
                <p><i class="fas fa-globe"></i> ${voice.lang}</p>
                <p><i class="fas fa-tag"></i> ${voice.localService ? 'Lokalny' : 'Online'}</p>
                <div class="voice-badge">${this.getVoiceQuality(voice)}</div>
            `;
            
            voiceCard.addEventListener('click', () => {
                document.querySelectorAll('.voice-card').forEach(card => card.classList.remove('selected'));
                voiceCard.classList.add('selected');
                document.getElementById('default-voice-select').value = this.voices.indexOf(voice);
                this.testVoice(voice);
            });
            
            voicesGrid.appendChild(voiceCard);
        });
    }
    
    getVoiceQuality(voice) {
        if (voice.name.includes('Google') || voice.name.includes('Microsoft')) {
            return 'Premium';
        } else if (voice.localService) {
            return 'Standard';
        }
        return 'Basic';
    }
    
    testVoice(voice) {
        this.stopSpeaking();
        const testText = voice.lang.startsWith('pl') ? 
            'Cześć, to jest test głosu.' : 
            'Hello, this is a voice test.';
        
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.voice = voice;
        utterance.rate = parseFloat(document.getElementById('rate').value);
        utterance.pitch = parseFloat(document.getElementById('pitch').value);
        this.synth.speak(utterance);
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.getAttribute('data-section');
                this.switchSection(section);
            });
        });
        
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('change', (e) => {
            document.body.classList.toggle('dark-theme', e.target.checked);
            localStorage.setItem('darkMode', e.target.checked ? 'enabled' : 'disabled');
        });
        
        // Sidebar toggle
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });
        
        // Tab management
        document.getElementById('add-tab').addEventListener('click', () => this.createTab());
        document.getElementById('add-multiple-tabs').addEventListener('click', () => this.showAddMultipleModal());
        
        // Global controls
        document.getElementById('read-all').addEventListener('click', () => this.readAllTabs());
        document.getElementById('pause-resume').addEventListener('click', () => this.togglePauseResume());
        document.getElementById('stop-all').addEventListener('click', () => this.stopSpeaking());
        
        // Settings
        document.getElementById('rate').addEventListener('input', (e) => {
            document.getElementById('rate-value').textContent = e.target.value + 'x';
        });
        
        document.getElementById('pitch').addEventListener('input', (e) => {
            document.getElementById('pitch-value').textContent = e.target.value;
        });
        
        document.getElementById('volume').addEventListener('input', (e) => {
            document.getElementById('volume-value').textContent = Math.round(e.target.value * 100) + '%';
        });
        
        document.getElementById('language-filter').addEventListener('change', () => {
            this.categorizeVoices();
        });
        
        // Import functionality
        this.setupImportHandlers();
        
        // Tab click handler
        document.getElementById('tabs-list').addEventListener('click', (e) => {
            const tabItem = e.target.closest('.tab-item');
            if (tabItem && !e.target.classList.contains('close-tab')) {
                this.switchTab(tabItem.getAttribute('data-tab'));
            }
        });
        
        // Save functionality
        document.getElementById('auto-save').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.enableAutoSave();
            } else {
                this.disableAutoSave();
            }
        });
        
        document.getElementById('clear-storage').addEventListener('click', () => {
            if (confirm('Czy na pewno chcesz usunąć wszystkie zapisane dane?')) {
                localStorage.clear();
                location.reload();
            }
        });
        
        // Modal handlers
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('confirm-add-tabs').addEventListener('click', () => this.addMultipleTabs());
    }
    
    setupImportHandlers() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const fileSelectBtn = document.getElementById('file-select-btn');
        
        fileSelectBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('active');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('active');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('active');
            this.handleFiles(e.dataTransfer.files);
        });
    }
    
    async handleFiles(files) {
        const filesList = document.getElementById('files-list');
        const importedFiles = document.getElementById('imported-files');
        
        filesList.innerHTML = '';
        importedFiles.style.display = 'block';
        
        for (const file of files) {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><i class="fas fa-file"></i> ${file.name}</span>
                <button class="control-btn" onclick="app.importFileToTab('${file.name}')">Import do nowej strony</button>
            `;
            filesList.appendChild(li);
            
            if (file.type === 'application/pdf') {
                await this.extractTextFromPDF(file);
            } else if (file.type === 'text/plain') {
                await this.extractTextFromTXT(file);
            }
        }
    }
    
    async extractTextFromPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            
            this.fileContents = this.fileContents || new Map();
            this.fileContents.set(file.name, fullText);
        } catch (error) {
            console.error('Error extracting PDF text:', error);
            alert('Błąd podczas odczytu pliku PDF');
        }
    }
    
    async extractTextFromTXT(file) {
        const text = await file.text();
        this.fileContents = this.fileContents || new Map();
        this.fileContents.set(file.name, text);
    }
    
    importFileToTab(fileName) {
        if (!this.fileContents || !this.fileContents.has(fileName)) return;
        
        const tabId = this.createTab(fileName.replace(/\.[^/.]+$/, ''));
        const content = this.fileContents.get(fileName);
        
        setTimeout(() => {
            const textarea = document.querySelector(`#${tabId} .text-input`);
            if (textarea) {
                textarea.value = content;
                this.updateCharCount(tabId);
                this.tabs.get(tabId).content = content;
            }
        }, 100);
    }
    
    initializePDFJS() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }
    
    switchSection(sectionName) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(`${sectionName}-section`).classList.add('active');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        if (sectionName === 'voices') {
            this.categorizeVoices();
        }
    }
    
    createTab(name = null) {
        this.tabCounter++;
        const tabId = `tab-${this.tabCounter}`;
        const tabName = name || `Strona ${this.tabCounter}`;
        
        // Create tab item
        const tabItem = document.createElement('li');
        tabItem.className = 'tab-item';
        tabItem.setAttribute('data-tab', tabId);
        tabItem.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <span>${tabName}</span>
            <button class="close-tab">×</button>
        `;
        
        // Insert before add button
        const addBtn = document.getElementById('add-tab');
        addBtn.parentNode.insertBefore(tabItem, addBtn);
        
        // Create tab content
        const tabPane = document.createElement('div');
        tabPane.id = tabId;
        tabPane.className = 'tab-pane';
        tabPane.innerHTML = this.getTabContentHTML();
        
        document.querySelector('.tabs-content').appendChild(tabPane);
        
        // Setup event listeners for the new tab
        this.setupTabEventListeners(tabId);
        
        // Add to tabs map
        this.tabs.set(tabId, {
            name: tabName,
            content: '',
            charCount: 0
        });
        
        // Switch to new tab
        this.switchTab(tabId);
        
        // Show close button on tabs if more than one
        this.updateCloseButtons();
        
        return tabId;
    }
    
    getTabContentHTML() {
        return `
            <div class="editor-toolbar">
                <button class="toolbar-btn" data-action="bold"><i class="fas fa-bold"></i></button>
                <button class="toolbar-btn" data-action="italic"><i class="fas fa-italic"></i></button>
                <button class="toolbar-btn" data-action="clear"><i class="fas fa-eraser"></i></button>
                <div class="toolbar-separator"></div>
                <button class="toolbar-btn" data-action="copy"><i class="fas fa-copy"></i></button>
                <button class="toolbar-btn" data-action="paste"><i class="fas fa-paste"></i></button>
                <div class="toolbar-separator"></div>
                <span class="char-count">0 znaków</span>
            </div>
            <textarea class="text-input" placeholder="Wpisz lub wklej tekst tutaj..."></textarea>
            <div class="tab-controls">
                <button class="control-btn primary" data-action="read-tab">
                    <i class="fas fa-play"></i> Czytaj tę stronę
                </button>
                <button class="control-btn" data-action="pause-tab">
                    <i class="fas fa-pause"></i> Pauza
                </button>
                <button class="control-btn danger" data-action="stop-tab">
                    <i class="fas fa-stop"></i> Stop
                </button>
            </div>
        `;
    }
    
    setupTabEventListeners(tabId) {
        const tabPane = document.getElementById(tabId);
        
        // Toolbar actions
        tabPane.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleToolbarAction(action, tabId);
            });
        });
        
        // Text input
        const textarea = tabPane.querySelector('.text-input');
        textarea.addEventListener('input', () => {
            this.updateCharCount(tabId);
            if (document.getElementById('auto-save').checked) {
                this.saveTab(tabId);
            }
        });
        
        // Control buttons
        tabPane.querySelectorAll('.tab-controls button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleTabAction(action, tabId);
            });
        });
        
        // Close tab button
        const tabItem = document.querySelector(`[data-tab="${tabId}"]`);
        const closeBtn = tabItem.querySelector('.close-tab');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeTab(tabId);
        });
    }
    
    handleToolbarAction(action, tabId) {
        const textarea = document.querySelector(`#${tabId} .text-input`);
        
        switch (action) {
            case 'bold':
                // In a real implementation, you might use a rich text editor
                const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
                if (selection) {
                    const boldText = `**${selection}**`;
                    textarea.setRangeText(boldText);
                }
                break;
            case 'italic':
                const selectionItalic = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
                if (selectionItalic) {
                    const italicText = `*${selectionItalic}*`;
                    textarea.setRangeText(italicText);
                }
                break;
            case 'clear':
                if (confirm('Czy na pewno chcesz wyczyścić całą zawartość?')) {
                    textarea.value = '';
                    this.updateCharCount(tabId);
                }
                break;
            case 'copy':
                textarea.select();
                document.execCommand('copy');
                this.showNotification('Skopiowano do schowka');
                break;
            case 'paste':
                navigator.clipboard.readText().then(text => {
                    textarea.value += text;
                    this.updateCharCount(tabId);
                });
                break;
        }
    }
    
    handleTabAction(action, tabId) {
        switch (action) {
            case 'read-tab':
                this.readTab(tabId);
                break;
            case 'pause-tab':
                this.togglePauseResume();
                break;
            case 'stop-tab':
                this.stopSpeaking();
                break;
        }
    }
    
    updateCharCount(tabId) {
        const textarea = document.querySelector(`#${tabId} .text-input`);
        const charCount = document.querySelector(`#${tabId} .char-count`);
        const count = textarea.value.length;
        charCount.textContent = `${count} znaków`;
        
        if (this.tabs.has(tabId)) {
            this.tabs.get(tabId).content = textarea.value;
            this.tabs.get(tabId).charCount = count;
        }
    }
    
    switchTab(tabId) {
        // Update tab items
        document.querySelectorAll('.tab-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        
        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
        
        this.currentTab = tabId;
    }
    
    removeTab(tabId) {
        if (this.tabs.size <= 1) {
            alert('Nie można usunąć ostatniej strony!');
            return;
        }
        
        // Remove from DOM
        document.querySelector(`[data-tab="${tabId}"]`).remove();
        document.getElementById(tabId).remove();
        
        // Remove from tabs map
        this.tabs.delete(tabId);
        
        // Switch to first available tab
        if (this.currentTab === tabId) {
            const firstTab = document.querySelector('.tab-item').getAttribute('data-tab');
            this.switchTab(firstTab);
        }
        
        this.updateCloseButtons();
    }
    
    updateCloseButtons() {
        const closeButtons = document.querySelectorAll('.close-tab');
        closeButtons.forEach(btn => {
            btn.style.display = this.tabs.size > 1 ? 'block' : 'none';
        });
    }
    
    readTab(tabId) {
        const content = document.querySelector(`#${tabId} .text-input`).value;
        if (!content.trim()) {
            this.showNotification('Brak tekstu do przeczytania');
            return;
        }
        
        this.stopSpeaking();
        this.speak(content);
        this.updateStatus(`Czytanie: ${this.tabs.get(tabId).name}`);
    }
    
    readAllTabs() {
        this.stopSpeaking();
        this.readingQueue = [];
        
        // Collect all tab contents
        this.tabs.forEach((tabData, tabId) => {
            const content = document.querySelector(`#${tabId} .text-input`).value;
            if (content.trim()) {
                this.readingQueue.push({
                    tabId,
                    content,
                    name: tabData.name
                });
            }
        });
        
        if (this.readingQueue.length === 0) {
            this.showNotification('Brak tekstu do przeczytania');
            return;
        }
        
        this.currentQueueIndex = 0;
        this.startReadingQueue();
    }
    
    startReadingQueue() {
        if (this.currentQueueIndex >= this.readingQueue.length) {
            this.updateStatus('Zakończono czytanie wszystkich stron');
            this.resetProgress();
            return;
        }
        
        const current = this.readingQueue[this.currentQueueIndex];
        this.updateStatus(`Czytanie: ${current.name} (${this.currentQueueIndex + 1}/${this.readingQueue.length})`);
        this.updateProgress();
        
        const utterance = new SpeechSynthesisUtterance(current.content);
        this.configureUtterance(utterance);
        
        utterance.onend = () => {
            this.currentQueueIndex++;
            this.startReadingQueue();
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.showNotification('Błąd podczas czytania');
            this.stopSpeaking();
        };
        
        this.currentUtterance = utterance;
        this.synth.speak(utterance);
        this.isReading = true;
        this.startTimer();
    }
    
    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        this.configureUtterance(utterance);
        
        utterance.onstart = () => {
            this.isReading = true;
            this.startTimer();
        };
        
        utterance.onend = () => {
            this.isReading = false;
            this.stopTimer();
            this.updateStatus('Gotowy do czytania');
            this.resetProgress();
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.showNotification('Błąd podczas czytania');
            this.stopSpeaking();
        };
        
        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }
    
    configureUtterance(utterance) {
        const voiceSelect = document.getElementById('default-voice-select');
        const selectedVoiceIndex = voiceSelect.value;
        
        if (this.voices[selectedVoiceIndex]) {
            utterance.voice = this.voices[selectedVoiceIndex];
        }
        
        utterance.rate = parseFloat(document.getElementById('rate').value);
        utterance.pitch = parseFloat(document.getElementById('pitch').value);
        utterance.volume = parseFloat(document.getElementById('volume').value);
    }
    
    togglePauseResume() {
        if (!this.synth.speaking) return;
        
        const pauseBtn = document.getElementById('pause-resume');
        
        if (this.isPaused) {
            this.synth.resume();
            this.isPaused = false;
            pauseBtn.innerHTML = '<i class="fas fa-pause-circle"></i> Pauza';
            this.updateStatus('Wznowiono czytanie');
            this.startTimer();
        } else {
            this.synth.pause();
            this.isPaused = true;
            pauseBtn.innerHTML = '<i class="fas fa-play-circle"></i> Wznów';
            this.updateStatus('Wstrzymano czytanie');
            this.stopTimer();
        }
    }
    
    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
            this.isReading = false;
            this.isPaused = false;
            this.currentUtterance = null;
            this.readingQueue = [];
            this.currentQueueIndex = 0;
            this.updateStatus('Gotowy do czytania');
            this.resetProgress();
            this.stopTimer();
            
            const pauseBtn = document.getElementById('pause-resume');
            pauseBtn.innerHTML = '<i class="fas fa-pause-circle"></i> Pauza';
        }
    }
    
    updateStatus(message) {
        document.getElementById('status-message').textContent = message;
    }
    
    updateProgress() {
        if (this.readingQueue.length > 0) {
            const progress = ((this.currentQueueIndex + 1) / this.readingQueue.length) * 100;
            document.getElementById('progress').style.width = `${progress}%`;
        }
    }
    
    resetProgress() {
        document.getElementById('progress').style.width = '0%';
    }
    
    startTimer() {
        if (!this.startTime) {
            this.startTime = Date.now();
        }
        
        this.elapsedInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('time-elapsed').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopTimer() {
        if (this.elapsedInterval) {
            clearInterval(this.elapsedInterval);
            this.elapsedInterval = null;
        }
        this.startTime = null;
        document.getElementById('time-elapsed').textContent = '00:00';
    }
    
    showAddMultipleModal() {
        document.getElementById('add-multiple-modal').classList.add('show');
    }
    
    closeModal() {
        document.getElementById('add-multiple-modal').classList.remove('show');
    }
    
    addMultipleTabs() {
        const numTabs = parseInt(document.getElementById('num-tabs').value);
        const prefix = document.getElementById('tab-prefix').value || 'Strona';
        const addSampleText = document.getElementById('add-sample-text').checked;
        
        const sampleTexts = [
            'To jest przykładowy tekst dla demonstracji funkcji zamiany tekstu na mowę.',
            'System obsługuje wiele języków i głosów, umożliwiając personalizację doświadczenia.',
            'Możesz dostosować prędkość czytania, ton głosu oraz głośność według własnych preferencji.',
            'Aplikacja automatycznie zapisuje wprowadzone teksty, aby nie utracić swojej pracy.',
            'Import plików PDF i TXT ułatwia pracę z dłuższymi dokumentami.'
        ];
        
        for (let i = 0; i < numTabs; i++) {
            const tabName = `${prefix} ${this.tabCounter + 1}`;
            const tabId = this.createTab(tabName);
            
            if (addSampleText) {
                setTimeout(() => {
                    const textarea = document.querySelector(`#${tabId} .text-input`);
                    if (textarea) {
                        textarea.value = sampleTexts[i % sampleTexts.length];
                        this.updateCharCount(tabId);
                        this.tabs.get(tabId).content = textarea.value;
                    }
                }, 100 * (i + 1));
            }
        }
        
        this.closeModal();
        this.showNotification(`Dodano ${numTabs} nowych stron`);
    }
    
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: var(--primary-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Space: Play/Pause
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                if (this.isReading) {
                    this.togglePauseResume();
                } else {
                    this.readTab(this.currentTab);
                }
            }
            
            // Ctrl/Cmd + S: Save all
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveAllTabs();
            }
            
            // Ctrl/Cmd + T: New tab
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.createTab();
            }
            
            // Escape: Stop speaking
            if (e.key === 'Escape') {
                this.stopSpeaking();
            }
        });
    }
    
    enableAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveAllTabs(true);
        }, 30000); // Save every 30 seconds
    }
    
    disableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    saveTab(tabId) {
        const content = document.querySelector(`#${tabId} .text-input`).value;
        const tabData = this.tabs.get(tabId);
        
        if (tabData) {
            localStorage.setItem(`tab_${tabId}`, JSON.stringify({
                name: tabData.name,
                content: content,
                timestamp: Date.now()
            }));
        }
    }
    
    saveAllTabs(silent = false) {
        this.tabs.forEach((tabData, tabId) => {
            this.saveTab(tabId);
        });
        
        // Save app state
        localStorage.setItem('appState', JSON.stringify({
            tabCounter: this.tabCounter,
            currentTab: this.currentTab,
            theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
            settings: {
                rate: document.getElementById('rate').value,
                pitch: document.getElementById('pitch').value,
                volume: document.getElementById('volume').value,
                voice: document.getElementById('default-voice-select').value,
                autoSave: document.getElementById('auto-save').checked
            }
        }));
        
        if (!silent) {
            this.showNotification('Wszystkie strony zostały zapisane');
        }
    }
    
    loadSavedData() {
        // Load app state
        const appState = localStorage.getItem('appState');
        if (appState) {
            try {
                const state = JSON.parse(appState);
                
                // Restore theme
                if (state.theme === 'dark') {
                    document.body.classList.add('dark-theme');
                    document.getElementById('theme-toggle').checked = true;
                }
                
                // Restore settings
                if (state.settings) {
                    document.getElementById('rate').value = state.settings.rate || 1;
                    document.getElementById('pitch').value = state.settings.pitch || 1;
                    document.getElementById('volume').value = state.settings.volume || 1;
                    document.getElementById('auto-save').checked = state.settings.autoSave !== false;
                    
                    // Update display values
                    document.getElementById('rate-value').textContent = state.settings.rate + 'x';
                    document.getElementById('pitch-value').textContent = state.settings.pitch;
                    document.getElementById('volume-value').textContent = Math.round(state.settings.volume * 100) + '%';
                    
                    // Restore voice selection after voices are loaded
                    setTimeout(() => {
                        if (state.settings.voice && this.voices[state.settings.voice]) {
                            document.getElementById('default-voice-select').value = state.settings.voice;
                        }
                    }, 1000);
                }
                
                this.tabCounter = state.tabCounter || 1;
            } catch (error) {
                console.error('Error loading app state:', error);
            }
        }
        
        // Load saved tabs
        const savedTabs = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('tab_')) {
                try {
                    const tabData = JSON.parse(localStorage.getItem(key));
                    savedTabs.push({ key, ...tabData });
                } catch (error) {
                    console.error('Error loading tab:', error);
                }
            }
        }
        
        // Load tabs if any were saved
        if (savedTabs.length > 0) {
            // Remove default tab if loading saved tabs
            document.querySelector('[data-tab="tab-1"]').remove();
            document.getElementById('tab-1').remove();
            this.tabs.clear();
            
            // Sort by timestamp and recreate tabs
            savedTabs.sort((a, b) => a.timestamp - b.timestamp);
            savedTabs.forEach((tabData, index) => {
                const tabId = this.createTab(tabData.name);
                setTimeout(() => {
                    const textarea = document.querySelector(`#${tabId} .text-input`);
                    if (textarea) {
                        textarea.value = tabData.content;
                        this.updateCharCount(tabId);
                    }
                }, 100 * (index + 1));
            });
        }
        
        // Enable auto-save if it was enabled
        if (document.getElementById('auto-save').checked) {
            this.enableAutoSave();
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TextToSpeechApp();
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
