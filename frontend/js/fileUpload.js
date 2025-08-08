// File Upload module
const FileUpload = {
    init() {
        this.bindEvents();
        this.setupDragAndDrop();
    },
    
    bindEvents() {
        document.getElementById('fileUploadBtn').addEventListener('click', () => {
            // Check if user has pro plan for file uploads
            if (Subscription.currentPlan === 'free') {
                Utils.showToast('File uploads are available for Pro users only', 'warning');
                Subscription.showSubscriptionModal();
                return;
            }
            
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFiles(Array.from(e.target.files));
            e.target.value = ''; // Reset input
        });
    },
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('fileDropZone');
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this.preventDefaults, false);
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            document.addEventListener(eventName, () => {
                if (Subscription.currentPlan === 'pro' || Subscription.currentPlan === 'pro_monthly') {
                    dropZone.classList.remove('hidden');
                    dropZone.classList.add('dragover');
                }
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
                setTimeout(() => {
                    if (!dropZone.classList.contains('dragover')) {
                        dropZone.classList.add('hidden');
                    }
                }, 100);
            }, false);
        });
        
        // Handle dropped files
        dropZone.addEventListener('drop', (e) => {
            if (Subscription.currentPlan === 'free') {
                Utils.showToast('File uploads are available for Pro users only', 'warning');
                Subscription.showSubscriptionModal();
                return;
            }
            
            dropZone.classList.add('hidden');
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        }, false);
        
        // Click to upload
        dropZone.addEventListener('click', () => {
            if (Subscription.currentPlan === 'free') {
                Utils.showToast('File uploads are available for Pro users only', 'warning');
                Subscription.showSubscriptionModal();
                return;
            }
            
            document.getElementById('fileInput').click();
        });
    },
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },
    
    async handleFiles(files) {
        const validFiles = files.filter(file => this.validateFile(file));
        
        for (const file of validFiles) {
            await this.processFile(file);
        }
        
        this.updateFilesDisplay();
    },
    
    validateFile(file) {
        // Check file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            Utils.showToast(`File "${file.name}" is too large. Maximum size is ${Utils.formatFileSize(CONFIG.MAX_FILE_SIZE)}.`, 'error');
            return false;
        }
        
        // Check file type
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        if (!CONFIG.SUPPORTED_FILE_TYPES.includes(fileExtension)) {
            Utils.showToast(`File type "${fileExtension}" is not supported.`, 'error');
            return false;
        }
        
        return true;
    },
    
    async processFile(file) {
        try {
            // Add to uploaded files for display
            STATE.uploadedFiles.push({
                id: Utils.generateId(),
                name: file.name,
                type: file.type,
                size: file.size,
                file: file, // Keep reference to file object for analysis
                uploadedAt: new Date().toISOString()
            });
            
            Utils.showToast(`"${file.name}" ready for analysis`, 'success');
        } catch (error) {
            console.error('File processing error:', error);
            Utils.showToast(`Error processing "${file.name}"`, 'error');
        }
    },
    
    // Analyze file using backend endpoint
    async analyzeFile(file, prompt) {
        try {
            const formData = new FormData();
            formData.append('file', file.file);
            formData.append('prompt', prompt);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/analyze-file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('voxaroid_token')}`
                },
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.analysis;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'File analysis failed');
            }
        } catch (error) {
            console.error('File analysis error:', error);
            throw error;
        }
    },
    
    updateFilesDisplay() {
        const filesContainer = document.getElementById('uploadedFiles');
        const filesList = document.getElementById('filesList');
        
        if (STATE.uploadedFiles.length === 0) {
            filesContainer.classList.add('hidden');
            return;
        }
        
        filesContainer.classList.remove('hidden');
        filesList.innerHTML = '';
        
        STATE.uploadedFiles.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg';
            
            const icon = this.getFileIcon(file.type);
            
            fileElement.innerHTML = `
                <i class="fas ${icon} text-sm"></i>
                <span class="text-sm font-medium truncate max-w-32">${Utils.sanitizeHtml(file.name)}</span>
                <span class="text-xs text-gray-500">${Utils.formatFileSize(file.size)}</span>
                <button class="text-red-500 hover:text-red-700 ml-2" onclick="FileUpload.removeFile(${index})">
                    <i class="fas fa-times text-xs"></i>
                </button>
            `;
            
            filesList.appendChild(fileElement);
        });
    },
    
    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'fa-image text-green-500';
        if (fileType.includes('pdf')) return 'fa-file-pdf text-red-500';
        if (fileType.includes('word') || fileType.includes('docx')) return 'fa-file-word text-blue-500';
        if (fileType.includes('text')) return 'fa-file-text text-gray-500';
        return 'fa-file text-gray-500';
    },
    
    removeFile(index) {
        STATE.uploadedFiles.splice(index, 1);
        this.updateFilesDisplay();
        Utils.showToast('File removed', 'info');
    },
    
    clearUploadedFiles() {
        STATE.uploadedFiles = [];
        this.updateFilesDisplay();
    }
};
