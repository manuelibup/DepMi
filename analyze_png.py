import cv2
import numpy as np
import base64

# Read the image
img = cv2.imread('web/public/depmi.png', cv2.IMREAD_UNCHANGED)
if img is None:
    print("Could not read image")
    exit()

# If it has an alpha channel, use it, otherwise use grayscale threshold
if img.shape[2] == 4:
    alpha = img[:, :, 3]
    _, thresh = cv2.threshold(alpha, 128, 255, cv2.THRESH_BINARY)
else:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV)

# Find contours
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

print(f"Image shape: {img.shape}")
print(f"Found {len(contours)} external contours")

for i, c in enumerate(contours):
    x, y, w, h = cv2.boundingRect(c)
    print(f"Contour {i}: x={x}, y={y}, w={w}, h={h}")

