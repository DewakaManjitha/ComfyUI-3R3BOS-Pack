# Developed by 3R3BOS

from .nodes.image_comparer_slider import ImageComparerSlider
from .nodes.batch_selector import BatchSelector

NODE_CLASS_MAPPINGS = {

    "Image Comparer (3R3BOS)": ImageComparerSlider,
    "Batch Selector (3R3BOS)": BatchSelector
}

NODE_DISPLAY_NAME_MAPPINGS = {

    "Image Comparer (3R3BOS)": "Image Comparer Slider",
    "Batch Selector (3R3BOS)": "Batch Selector"
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
