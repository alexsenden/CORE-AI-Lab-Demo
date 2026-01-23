"""
Export Stable Diffusion 1.5 models to ONNX format.
This script exports the text encoder, UNet, and VAE decoder to ONNX.
"""

import torch
from diffusers import StableDiffusionPipeline
from pathlib import Path
import argparse

def export_text_encoder(pipe, output_dir):
    """Export the text encoder to ONNX."""
    print("Exporting text encoder...")
    text_encoder = pipe.text_encoder
    text_encoder.eval()
    
    # Create dummy input
    dummy_input = torch.zeros((1, 77), dtype=torch.long)
    
    output_path = Path(output_dir) / "text_encoder.onnx"
    
    torch.onnx.export(
        text_encoder,
        dummy_input,
        str(output_path),
        input_names=["input_ids"],
        output_names=["last_hidden_state", "pooler_output"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "sequence"},
            "last_hidden_state": {0: "batch", 1: "sequence"},
            "pooler_output": {0: "batch"}
        },
        opset_version=14,
        do_constant_folding=True,
    )
    print(f"Text encoder exported to {output_path}")


def export_unet(pipe, output_dir):
    """Export the UNet to ONNX."""
    print("Exporting UNet...")
    unet = pipe.unet
    unet.eval()
    
    # Create dummy inputs for UNet
    # UNet takes: sample, timestep, encoder_hidden_states
    batch_size = 1
    height = 64  # 512 / 8 (latent space)
    width = 64
    
    dummy_sample = torch.randn((batch_size, 4, height, width))
    dummy_timestep = torch.tensor([500], dtype=torch.long)
    dummy_encoder_hidden_states = torch.randn((batch_size, 77, 768))
    
    output_path = Path(output_dir) / "unet.onnx"
    
    torch.onnx.export(
        unet,
        (dummy_sample, dummy_timestep, dummy_encoder_hidden_states),
        str(output_path),
        input_names=["sample", "timestep", "encoder_hidden_states"],
        output_names=["noise_pred"],
        dynamic_axes={
            "sample": {0: "batch"},
            "encoder_hidden_states": {0: "batch"},
            "noise_pred": {0: "batch"}
        },
        opset_version=14,
        do_constant_folding=True,
    )
    print(f"UNet exported to {output_path}")


def export_vae_decoder(pipe, output_dir):
    """Export the VAE decoder to ONNX."""
    print("Exporting VAE decoder...")
    vae = pipe.vae
    vae_decoder = vae.decoder
    vae_decoder.eval()
    
    # Create dummy input for VAE decoder
    # VAE decoder takes latent sample of shape (batch, 4, height, width)
    batch_size = 1
    height = 64
    width = 64
    
    dummy_latent = torch.randn((batch_size, 4, height, width))
    
    output_path = Path(output_dir) / "vae_decoder.onnx"
    
    torch.onnx.export(
        vae_decoder,
        dummy_latent,
        str(output_path),
        input_names=["latent_sample"],
        output_names=["sample"],
        dynamic_axes={
            "latent_sample": {0: "batch"},
            "sample": {0: "batch"}
        },
        opset_version=14,
        do_constant_folding=True,
    )
    print(f"VAE decoder exported to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Export Stable Diffusion 1.5 to ONNX")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="models",
        help="Directory to save ONNX models (default: models)"
    )
    parser.add_argument(
        "--model-id",
        type=str,
        default="runwayml/stable-diffusion-v1-5",
        help="HuggingFace model ID (default: runwayml/stable-diffusion-v1-5)"
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        choices=["cpu", "cuda"],
        help="Device to use for export (default: cpu)"
    )
    
    args = parser.parse_args()
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Loading Stable Diffusion model: {args.model_id}")
    print(f"Device: {args.device}")
    
    # Load the pipeline
    pipe = StableDiffusionPipeline.from_pretrained(
        args.model_id,
        torch_dtype=torch.float32,
        safety_checker=None,
        requires_safety_checker=False
    )
    pipe = pipe.to(args.device)
    
    # Export models
    export_text_encoder(pipe, output_dir)
    export_unet(pipe, output_dir)
    export_vae_decoder(pipe, output_dir)
    
    print("\nAll models exported successfully!")
    print(f"Models saved to: {output_dir.absolute()}")


if __name__ == "__main__":
    main()
