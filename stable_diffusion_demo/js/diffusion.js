/**
 * Stable Diffusion inference using ONNX Runtime
 */

class StableDiffusion {
    constructor() {
        this.textEncoderSession = null;
        this.unetSession = null;
        this.vaeDecoderSession = null;
        this.tokenizer = null;
        this.loaded = false;
    }

    /**
     * Load all ONNX models
     */
    async loadModels() {
        try {
            console.log('Loading ONNX models...');
            
            // Initialize tokenizer
            this.tokenizer = new SimpleTokenizer();
            await this.tokenizer.load();
            
            // Load text encoder
            console.log('Loading text encoder...');
            this.textEncoderSession = await ort.InferenceSession.create('models/text_encoder.onnx', {
                executionProviders: ['wasm']
            });
            
            // Load UNet
            console.log('Loading UNet...');
            this.unetSession = await ort.InferenceSession.create('models/unet.onnx', {
                executionProviders: ['wasm']
            });
            
            // Load VAE decoder
            console.log('Loading VAE decoder...');
            this.vaeDecoderSession = await ort.InferenceSession.create('models/vae_decoder.onnx', {
                executionProviders: ['wasm']
            });
            
            this.loaded = true;
            console.log('All models loaded successfully!');
            return true;
        } catch (error) {
            console.error('Error loading models:', error);
            throw error;
        }
    }

    /**
     * Encode text prompt using text encoder
     */
    async encodeText(prompt) {
        if (!this.textEncoderSession) {
            throw new Error('Text encoder not loaded');
        }

        // Tokenize the prompt
        const tokenIds = this.tokenizer.encode(prompt);
        
        // Convert to tensor
        const inputIds = new ort.Tensor('int64', new BigInt64Array(tokenIds.map(x => BigInt(x))), [1, 77]);
        
        // Run text encoder
        const results = await this.textEncoderSession.run({
            input_ids: inputIds
        });
        
        // Return the last_hidden_state (encoder_hidden_states)
        return results.last_hidden_state;
    }

    /**
     * Generate noise schedule (DDPM/DDIM scheduler)
     */
    generateNoiseSchedule(numSteps) {
        const betaStart = 0.00085;
        const betaEnd = 0.012;
        const betas = [];
        
        for (let i = 0; i < 1000; i++) {
            const beta = betaStart + (betaEnd - betaStart) * (i / 999);
            betas.push(beta);
        }
        
        const alphas = betas.map(beta => 1 - beta);
        const alphasCumprod = [];
        let cumprod = 1;
        for (const alpha of alphas) {
            cumprod *= alpha;
            alphasCumprod.push(cumprod);
        }
        
        // Select timesteps for the given number of steps
        const stepIndices = [];
        for (let i = 0; i < numSteps; i++) {
            stepIndices.push(Math.floor((1000 / numSteps) * i));
        }
        stepIndices.reverse();
        
        return {
            timesteps: stepIndices,
            alphasCumprod: alphasCumprod
        };
    }

    /**
     * Sample noise from latent space
     * Note: VAE uses a scaling factor of 0.18215, so we scale the initial noise accordingly
     */
    sampleNoise(height = 64, width = 64, channels = 4) {
        const size = 1 * channels * height * width;
        const noise = new Float32Array(size);
        // Generate standard normal noise (mean=0, std=1)
        for (let i = 0; i < size; i++) {
            // Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            noise[i] = z0;
        }
        return new ort.Tensor('float32', noise, [1, channels, height, width]);
    }

    /**
     * Run UNet denoising step
     */
    async denoiseStep(latent, timestep, encoderHiddenStates) {
        if (!this.unetSession) {
            throw new Error('UNet not loaded');
        }

        const timestepTensor = new ort.Tensor('int64', new BigInt64Array([BigInt(timestep)]), [1]);
        
        const results = await this.unetSession.run({
            sample: latent,
            timestep: timestepTensor,
            encoder_hidden_states: encoderHiddenStates
        });
        
        return results.noise_pred;
    }

    /**
     * Decode latent to image using VAE decoder
     * Note: The latent needs to be scaled by 1/0.18215 before decoding
     */
    async decodeLatent(latent) {
        if (!this.vaeDecoderSession) {
            throw new Error('VAE decoder not loaded');
        }

        // VAE scaling factor (SD uses 0.18215)
        const vaeScale = 0.18215;
        const scaledLatent = this.scaleTensor(latent, 1 / vaeScale);

        const results = await this.vaeDecoderSession.run({
            latent_sample: scaledLatent
        });
        
        return results.sample;
    }

    /**
     * Convert tensor to image data (RGBA)
     * VAE decoder outputs values that need proper scaling
     */
    tensorToImage(tensor, width = 512, height = 512) {
        const data = tensor.data;
        const channels = 3; // RGB
        const imageData = new Uint8ClampedArray(width * height * 4);
        
        // VAE decoder typically outputs values in range [-1, 1] or [0, 1]
        // We'll try both normalizations and use the one that makes sense
        // Standard: clamp to [0, 1] then scale to [0, 255]
        for (let i = 0; i < width * height; i++) {
            // Try direct normalization first (assuming output is already in reasonable range)
            let r = data[i * channels + 0];
            let g = data[i * channels + 1];
            let b = data[i * channels + 2];
            
            // Normalize: if values are in [-1, 1], map to [0, 1]
            if (Math.abs(r) <= 1 && Math.abs(g) <= 1 && Math.abs(b) <= 1) {
                r = (r + 1) / 2;
                g = (g + 1) / 2;
                b = (b + 1) / 2;
            }
            
            // Clamp and scale to [0, 255]
            r = Math.max(0, Math.min(255, r * 255));
            g = Math.max(0, Math.min(255, g * 255));
            b = Math.max(0, Math.min(255, b * 255));
            
            imageData[i * 4 + 0] = r;
            imageData[i * 4 + 1] = g;
            imageData[i * 4 + 2] = b;
            imageData[i * 4 + 3] = 255; // Alpha
        }
        
        return imageData;
    }

    /**
     * Generate image with step-by-step visualization
     */
    async generate(prompt, numSteps = 20, guidanceScale = 7.5, onStepCallback = null) {
        if (!this.loaded) {
            throw new Error('Models not loaded');
        }

        console.log(`Generating image with prompt: "${prompt}"`);
        console.log(`Steps: ${numSteps}, Guidance: ${guidanceScale}`);

        // Encode text
        const encoderHiddenStates = await this.encodeText(prompt);
        
        // Generate noise schedule
        const schedule = this.generateNoiseSchedule(numSteps);
        
        // Initialize latent with noise
        let latent = this.sampleNoise(64, 64, 4);
        
        // Denoising loop
        for (let step = 0; step < numSteps; step++) {
            const timestep = schedule.timesteps[step];
            const alphaCumprod = schedule.alphasCumprod[timestep];
            
            console.log(`Step ${step + 1}/${numSteps}, timestep: ${timestep}`);
            
            // Predict noise
            const noisePred = await this.denoiseStep(latent, timestep, encoderHiddenStates);
            
            // Classifier-free guidance (simplified)
            // In full implementation: noise_pred = noise_pred_uncond + guidance_scale * (noise_pred_text - noise_pred_uncond)
            // For now, we'll use the text prediction directly
            
            // Update latent using DDIM scheduler
            // Predict the original sample: x_0 = (x_t - sqrt(1 - alpha_t) * noise_pred) / sqrt(alpha_t)
            const sqrtAlphaCumprod = Math.sqrt(alphaCumprod);
            const sqrtOneMinusAlphaCumprod = Math.sqrt(1 - alphaCumprod);
            
            const predOriginalSample = this.subtractTensors(
                latent,
                this.scaleTensor(noisePred, sqrtOneMinusAlphaCumprod)
            );
            const predOriginalSampleScaled = this.scaleTensor(predOriginalSample, 1 / sqrtAlphaCumprod);
            
            // Get previous timestep alpha
            const prevTimestep = step < numSteps - 1 ? schedule.timesteps[step + 1] : 0;
            const prevAlphaCumprod = prevTimestep > 0 ? schedule.alphasCumprod[prevTimestep] : 0;
            const sqrtPrevAlphaCumprod = Math.sqrt(prevAlphaCumprod);
            const sqrtOneMinusPrevAlphaCumprod = Math.sqrt(1 - prevAlphaCumprod);
            
            // Compute previous sample: x_{t-1} = sqrt(alpha_{t-1}) * pred_x_0 + sqrt(1 - alpha_{t-1}) * noise_pred
            const prevSample = this.addTensors(
                this.scaleTensor(predOriginalSampleScaled, sqrtPrevAlphaCumprod),
                this.scaleTensor(noisePred, sqrtOneMinusPrevAlphaCumprod)
            );
            
            latent = prevSample;
            
            // Decode and visualize after each step
            if (onStepCallback) {
                try {
                    const decoded = await this.decodeLatent(latent);
                    const imageData = this.tensorToImage(decoded, 512, 512);
                    onStepCallback(step + 1, numSteps, imageData);
                } catch (e) {
                    console.warn('Could not decode intermediate step:', e);
                }
            }
        }
        
        // Final decode
        const finalDecoded = await this.decodeLatent(latent);
        const finalImageData = this.tensorToImage(finalDecoded, 512, 512);
        
        return finalImageData;
    }

    // Helper functions for tensor operations
    subtractTensors(a, b) {
        const result = new Float32Array(a.data.length);
        for (let i = 0; i < result.length; i++) {
            result[i] = a.data[i] - b.data[i];
        }
        return new ort.Tensor('float32', result, a.dims);
    }

    addTensors(a, b) {
        const result = new Float32Array(a.data.length);
        for (let i = 0; i < result.length; i++) {
            result[i] = a.data[i] + b.data[i];
        }
        return new ort.Tensor('float32', result, a.dims);
    }

    scaleTensor(tensor, scale) {
        const result = new Float32Array(tensor.data.length);
        for (let i = 0; i < result.length; i++) {
            result[i] = tensor.data[i] * scale;
        }
        return new ort.Tensor('float32', result, tensor.dims);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StableDiffusion;
}
