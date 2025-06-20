document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const resultSection = document.getElementById('resultSection');
    const resultImage = document.getElementById('resultImage');
    const loading = document.getElementById('loading');
    const downloadBtn = document.getElementById('downloadBtn');
    const imageInput = document.getElementById('imageInput');

    let currentImageBlob = null;

    // Test API connection on load
    fetch('/api/crop/test')
        .then(response => response.json())
        .then(data => {
            console.log('✅ API Test successful:', data);
        })
        .catch(error => {
            console.error('❌ API Test failed:', error);
        });

    // Handle file input change
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('📁 File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
        }
    });

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('🚀 Form submitted');
        
        const imageFile = imageInput.files[0];
        
        if (!imageFile) {
            alert('Please select an image file');
            console.log('❌ No file selected');
            return;
        }

        console.log('📤 Processing file:', imageFile.name);

        // Get crop parameters
        const cropX = document.getElementById('cropX').value;
        const cropY = document.getElementById('cropY').value;
        const cropWidth = document.getElementById('cropWidth').value;
        const cropHeight = document.getElementById('cropHeight').value;

        console.log('✂️ Crop parameters:', { cropX, cropY, cropWidth, cropHeight });

        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('x', cropX);
        formData.append('y', cropY);
        formData.append('width', cropWidth);
        formData.append('height', cropHeight);

        try {
            loading.style.display = 'block';
            resultSection.style.display = 'none';

            console.log('📡 Sending request to /api/crop/simple');

            const response = await fetch('/api/crop/simple', {
                method: 'POST',
                body: formData
            });

            console.log('📨 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server error:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const blob = await response.blob();
            currentImageBlob = blob;
            
            console.log('✅ Image processed successfully, size:', blob.size);
            
            const imageUrl = URL.createObjectURL(blob);
            resultImage.src = imageUrl;
            
            resultSection.style.display = 'block';
            loading.style.display = 'none';

        } catch (error) {
            console.error('❌ Error processing image:', error);
            alert('Error processing image: ' + error.message);
            loading.style.display = 'none';
        }
    });

    downloadBtn.addEventListener('click', function() {
        if (currentImageBlob) {
            const url = URL.createObjectURL(currentImageBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cropped-image.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('💾 Download initiated');
        } else {
            console.log('❌ No image to download');
        }
    });
});
