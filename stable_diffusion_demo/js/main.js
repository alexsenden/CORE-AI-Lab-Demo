/**
 * Main application logic
 */

let diffusion = null;
let isGenerating = false;

/**
 * Initialize the application
 */
async function init() {
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Loading models...';
    statusEl.className = 'status loading';
    
    try {
        diffusion = new StableDiffusion();
        await diffusion.loadModels();
        
        statusEl.textContent = 'Models loaded! Ready to generate.';
        statusEl.className = 'status success';
        document.getElementById('generateBtn').disabled = false;
    } catch (error) {
        statusEl.textContent = `Error loading models: ${error.message}`;
        statusEl.className = 'status error';
        console.error('Initialization error:', error);
    }
}

/**
 * Start image generation
 */
async function startGeneration() {
    if (isGenerating) {
        return;
    }
    
    const prompt = document.getElementById('prompt').value.trim();
    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }
    
    const steps = parseInt(document.getElementById('steps').value);
    const guidance = parseFloat(document.getElementById('guidance').value);
    
    if (!diffusion || !diffusion.loaded) {
        alert('Models not loaded yet. Please wait...');
        return;
    }
    
    isGenerating = true;
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Generating image...';
    statusEl.className = 'status loading';
    
    const canvas = document.getElementById('outputCanvas');
    const ctx = canvas.getContext('2d');
    
    try {
        await diffusion.generate(
            prompt,
            steps,
            guidance,
            (step, totalSteps, imageData) => {
                // Update progress
                const progress = (step / totalSteps) * 100;
                document.getElementById('progressFill').style.width = `${progress}%`;
                document.getElementById('progressFill').textContent = `${Math.round(progress)}%`;
                document.getElementById('stepText').textContent = `Step: ${step} / ${totalSteps}`;
                
                // Draw image
                const imageDataObj = new ImageData(imageData, 512, 512);
                ctx.putImageData(imageDataObj, 0, 0);
            }
        );
        
        statusEl.textContent = 'Generation complete!';
        statusEl.className = 'status success';
    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'status error';
        console.error('Generation error:', error);
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate';
    }
}

// Initialize when page loads
window.addEventListener('load', init);
