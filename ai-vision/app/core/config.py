"""
AI Vision - Configuration.
"""
import os
import torch
from pathlib import Path

# Load .env
try:
    from dotenv import load_dotenv
    _env = Path(__file__).resolve().parent.parent.parent / ".env"
    if _env.exists():
        load_dotenv(_env)
except ImportError:
    pass


class Settings:

    # Paths
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    MODEL_PATH = os.environ.get('MODEL_PATH', str(BASE_DIR / 'weights' / 'best_densenet121.pth'))
    HEATMAP_DIR = str(BASE_DIR / 'outputs' / 'heatmaps')

    # Model
    NUM_CLASSES = 14
    IMAGE_SIZE = 224
    CONFIDENCE_THRESHOLD = float(os.environ.get('CONFIDENCE_THRESHOLD', '0.5'))

    # Device
    DEVICE_STR = os.environ.get('DEVICE', 'auto')
    if DEVICE_STR == 'auto':
        DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    else:
        DEVICE = torch.device(DEVICE_STR)

    # Status
    MODEL_LOADED = False

    # Class names (14 CheXpert classes)
    CLASS_NAMES = [
        'No Finding',
        'Enlarged Cardiomediastinum',
        'Cardiomegaly',
        'Lung Opacity',
        'Lung Lesion',
        'Edema',
        'Consolidation',
        'Pneumonia',
        'Atelectasis',
        'Pneumothorax',
        'Pleural Effusion',
        'Pleural Other',
        'Fracture',
        'Support Devices',
    ]

    # Vietnamese names
    CLASS_NAMES_VI = {
        'No Finding': 'KhÃ´ng phÃ¡t hiá»‡n báº¥t thÆ°á»ng',
        'Enlarged Cardiomediastinum': 'PhÃ¬ Ä‘áº¡i trung tháº¥t',
        'Cardiomegaly': 'Tim to',
        'Lung Opacity': 'Má» phá»•i',
        'Lung Lesion': 'Tá»•n thÆ°Æ¡ng phá»•i',
        'Edema': 'PhÃ¹ phá»•i',
        'Consolidation': 'ÄÃ´ng Ä‘áº·c phá»•i',
        'Pneumonia': 'ViÃªm phá»•i',
        'Atelectasis': 'Xáº¹p phá»•i',
        'Pneumothorax': 'TrÃ n khÃ­ mÃ ng phá»•i',
        'Pleural Effusion': 'TrÃ n dá»‹ch mÃ ng phá»•i',
        'Pleural Other': 'Báº¥t thÆ°á»ng mÃ ng phá»•i khÃ¡c',
        'Fracture': 'GÃ£y xÆ°Æ¡ng',
        'Support Devices': 'Thiáº¿t bá»‹ há»— trá»£',
    }


settings = Settings()
