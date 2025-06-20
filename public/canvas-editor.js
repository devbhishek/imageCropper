class CanvasEditor {
    constructor() {
        this.imageCanvas = null;
        this.selectionCanvas = null;
        this.imageCtx = null;
        this.selectionCtx = null;
        
        this.currentImage = null;
        this.currentImageFile = null;
        this.selections = [];
        this.currentSelection = null;
        this.isDrawing = false;
        this.startPoint = null;
        this.currentTool = 'rectangle';
        this.currentImageBlob = null;
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.testAPI();
    }

    setupElements() {
        // Get DOM elements
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.uploadSection = document.getElementById('uploadSection');
        this.editorSection = document.getElementById('editorSection');
        this.resultSection = document.getElementById('resultSection');
        this.loading = document.getElementById('loading');
        
        this.imageCanvas = document.getElementById('imageCanvas');
        this.selectionCanvas = document.getElementById('selectionCanvas');
        this.imageCtx = this.imageCanvas.getContext('2d');
        this.selectionCtx = this.selectionCanvas.getContext('2d');
        
        this.selectionTool = document.getElementById('selectionTool');
        this.clearBtn = document.getElementById('clearBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.invertSelection = document.getElementById('invertSelection');
        this.featherSlider = document.getElementById('featherSlider');
        this.featherValue = document.getElementById('featherValue');
        this.processBtn = document.getElementById('processBtn');
        this.canvasInfo = document.getElementById('canvasInfo');
        
        this.resultImage = document.getElementById('resultImage');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newImageBtn = document.getElementById('newImageBtn');
    }

    setupEventListeners() {
        // File upload
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Canvas drawing
        this.imageCanvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.imageCanvas.addEventListener('mousemove', this.draw.bind(this));
        this.imageCanvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.imageCanvas.addEventListener('mouseleave', this.stopDrawing.bind(this));

        // Touch events for mobile
        this.imageCanvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.imageCanvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.imageCanvas.addEventListener('touchend', this.stopDrawing.bind(this));

        // Toolbar controls
        this.selectionTool.addEventListener('change', (e) => {
            this.currentTool = e.target.value;
            this.updateCanvasInfo();
        });
        
        this.clearBtn.addEventListener('click', this.clearSelections.bind(this));
        this.undoBtn.addEventListener('click', this.undoLastSelection.bind(this));
        this.featherSlider.addEventListener('input', (e) => {
            this.featherValue.textContent = e.target.value;
        });
        
        this.processBtn.addEventListener('click', this.processImage.bind(this));
        this.downloadBtn.addEventListener('click', this.downloadResult.bind(this));
        this.newImageBtn.addEventListener('click', this.resetEditor.bind(this));
    }

    async testAPI() {
        try {
            const response = await fetch('/api/crop/test');
            const data = await response.json();
            console.log('✅ API Test successful:', data);
        } catch (error) {
            console.error('❌ API Test failed:', error);
        }
    }

    // File handling
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadImage(file);
        }
    }

    loadImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        console.log('📁 Loading image:', file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.currentImageFile = file;
                this.setupCanvas(img);
                this.showEditor();
                console.log('✅ Image loaded successfully');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    setupCanvas(img) {
        // Calculate canvas size to fit the container while maintaining aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        
        let { width, height } = img;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }

        // Set canvas dimensions
        this.imageCanvas.width = width;
        this.imageCanvas.height = height;
        this.selectionCanvas.width = width;
        this.selectionCanvas.height = height;

        // Set CSS dimensions
        this.imageCanvas.style.width = width + 'px';
        this.imageCanvas.style.height = height + 'px';
        this.selectionCanvas.style.width = width + 'px';
        this.selectionCanvas.style.height = height + 'px';

        // Draw image
        this.imageCtx.drawImage(img, 0, 0, width, height);
        
        // Clear selections
        this.selections = [];
        this.clearSelectionCanvas();
        this.updateCanvasInfo();
    }

    showEditor() {
        this.uploadSection.style.display = 'none';
        this.editorSection.style.display = 'block';
        this.resultSection.style.display = 'none';
    }

    // Drawing functions
    getMousePos(e) {
        const rect = this.imageCanvas.getBoundingClientRect();
        const scaleX = this.imageCanvas.width / rect.width;
        const scaleY = this.imageCanvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        e.preventDefault();
        this.isDrawing = true;
        this.startPoint = this.getMousePos(e);
        
        if (this.currentTool === 'freehand') {
            this.currentSelection = {
                type: 'freehand',
                points: [this.startPoint]
            };
        }
        
        this.imageCanvas.classList.add('selection-drawing');
        console.log('🎨 Started drawing:', this.currentTool);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        e.preventDefault();
        const currentPoint = this.getMousePos(e);
        
        this.clearSelectionCanvas();
        this.drawExistingSelections();
        
        if (this.currentTool === 'rectangle') {
            this.drawRectangle(this.startPoint, currentPoint);
        } else if (this.currentTool === 'circle') {
            this.drawCircle(this.startPoint, currentPoint);
        } else if (this.currentTool === 'freehand') {
            this.currentSelection.points.push(currentPoint);
            this.drawFreehand(this.currentSelection.points);
        }
    }

    stopDrawing(e) {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.imageCanvas.classList.remove('selection-drawing');
        
        if (this.startPoint) {
            const endPoint = this.getMousePos(e);
            
            if (this.currentTool === 'rectangle') {
                this.selections.push({
                    type: 'rectangle',
                    start: this.startPoint,
                    end: endPoint
                });
            } else if (this.currentTool === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(endPoint.x - this.startPoint.x, 2) + 
                    Math.pow(endPoint.y - this.startPoint.y, 2)
                );
                this.selections.push({
                    type: 'circle',
                    center: this.startPoint,
                    radius: radius
                });
            } else if (this.currentTool === 'freehand' && this.currentSelection) {
                this.selections.push(this.currentSelection);
            }
        }
        
        this.startPoint = null;
        this.currentSelection = null;
        this.updateCanvasInfo();
        console.log('✅ Selection completed. Total selections:', this.selections.length);
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                         e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.imageCanvas.dispatchEvent(mouseEvent);
    }

    // Drawing shapes
    drawRectangle(start, end) {
        this.selectionCtx.strokeStyle = '#007bff';
        this.selectionCtx.lineWidth = 2;
        this.selectionCtx.setLineDash([5, 5]);
        this.selectionCtx.strokeRect(
            start.x, 
            start.y, 
            end.x - start.x, 
            end.y - start.y
        );
    }

    drawCircle(center, edge) {
        const radius = Math.sqrt(
            Math.pow(edge.x - center.x, 2) + 
            Math.pow(edge.y - center.y, 2)
        );
        
        this.selectionCtx.strokeStyle = '#007bff';
        this.selectionCtx.lineWidth = 2;
        this.selectionCtx.setLineDash([5, 5]);
        this.selectionCtx.beginPath();
        this.selectionCtx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        this.selectionCtx.stroke();
    }

    drawFreehand(points) {
        if (points.length < 2) return;
        
        this.selectionCtx.strokeStyle = '#007bff';
        this.selectionCtx.lineWidth = 2;
        this.selectionCtx.setLineDash([]);
        this.selectionCtx.beginPath();
        this.selectionCtx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.selectionCtx.lineTo(points[i].x, points[i].y);
        }
        
        this.selectionCtx.stroke();
    }

    drawExistingSelections() {
        this.selections.forEach(selection => {
            if (selection.type === 'rectangle') {
                this.drawRectangle(selection.start, selection.end);
            } else if (selection.type === 'circle') {
                this.drawCircle(selection.center, {
                    x: selection.center.x + selection.radius,
                    y: selection.center.y
                });
            } else if (selection.type === 'freehand') {
                this.drawFreehand(selection.points);
            }
        });
    }

    clearSelectionCanvas() {
        this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
    }

    clearSelections() {
        this.selections = [];
        this.clearSelectionCanvas();
        this.updateCanvasInfo();
        console.log('🧹 Selections cleared');
    }

    undoLastSelection() {
        if (this.selections.length > 0) {
            this.selections.pop();
            this.clearSelectionCanvas();
            this.drawExistingSelections();
            this.updateCanvasInfo();
            console.log('↶ Undid last selection');
        }
    }

    updateCanvasInfo() {
        const toolName = this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1);
        const selectionCount = this.selections.length;
        this.canvasInfo.textContent = `${toolName} tool selected. ${selectionCount} selection(s) made. Click and drag to select area.`;
    }

    // Image processing
    async processImage() {
        if (this.selections.length === 0) {
            alert('Please make at least one selection');
            return;
        }

        if (!this.currentImageFile) {
            alert('No image loaded');
            return;
        }

        try {
            this.loading.style.display = 'block';
            this.editorSection.style.display = 'none';

            // For now, use the first rectangle selection for simple crop
            const firstSelection = this.selections[0];
            
            if (firstSelection.type === 'rectangle') {
                await this.processRectangleSelection(firstSelection);
            } else {
                // For circle and freehand, we'll use a bounding rectangle for now
                const boundingRect = this.getBoundingRectangle(firstSelection);
                await this.processRectangleSelection(boundingRect);
            }

        } catch (error) {
            console.error('❌ Processing error:', error);
            alert('Error processing image: ' + error.message);
            this.loading.style.display = 'none';
            this.editorSection.style.display = 'block';
        }
    }

        async processRectangleSelection(selection) {
        const formData = new FormData();
        formData.append('image', this.currentImageFile);
        
        // Calculate actual image coordinates
        const scaleX = this.currentImage.width / this.imageCanvas.width;
        const scaleY = this.currentImage.height / this.imageCanvas.height;
        
        const x = Math.min(selection.start.x, selection.end.x) * scaleX;
        const y = Math.min(selection.start.y, selection.end.y) * scaleY;
        const width = Math.abs(selection.end.x - selection.start.x) * scaleX;
        const height = Math.abs(selection.end.y - selection.start.y) * scaleY;
        
        formData.append('x', Math.round(x));
        formData.append('y', Math.round(y));
        formData.append('width', Math.round(width));
        formData.append('height', Math.round(height));
        formData.append('feather', this.featherSlider.value);
        formData.append('invert', this.invertSelection.checked);

        console.log('📤 Sending crop request:', { x, y, width, height });

        const response = await fetch('/api/crop/simple', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        this.currentImageBlob = blob;
        
        const imageUrl = URL.createObjectURL(blob);
        this.resultImage.src = imageUrl;
        
        this.loading.style.display = 'none';
        this.resultSection.style.display = 'block';
        
        console.log('✅ Image processed successfully');
    }

    getBoundingRectangle(selection) {
        if (selection.type === 'circle') {
            return {
                start: {
                    x: selection.center.x - selection.radius,
                    y: selection.center.y - selection.radius
                },
                end: {
                    x: selection.center.x + selection.radius,
                    y: selection.center.y + selection.radius
                }
            };
        } else if (selection.type === 'freehand') {
            const xs = selection.points.map(p => p.x);
            const ys = selection.points.map(p => p.y);
            return {
                start: {
                    x: Math.min(...xs),
                    y: Math.min(...ys)
                },
                end: {
                    x: Math.max(...xs),
                    y: Math.max(...ys)
                }
            };
        }
        return selection;
    }

    downloadResult() {
        if (this.currentImageBlob) {
            const url = URL.createObjectURL(this.currentImageBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cropped-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('💾 Download initiated');
        }
    }

    resetEditor() {
        this.uploadSection.style.display = 'block';
        this.editorSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        this.loading.style.display = 'none';
        
        this.currentImage = null;
        this.currentImageFile = null;
        this.currentImageBlob = null;
        this.selections = [];
        this.fileInput.value = '';
        
        console.log('🔄 Editor reset');
    }
}

// Initialize the canvas editor when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Canvas Editor...');
    window.canvasEditor = new CanvasEditor();
});

