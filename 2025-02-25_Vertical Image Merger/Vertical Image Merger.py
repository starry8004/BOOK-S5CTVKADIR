import os
import tkinter as tk
from tkinter import filedialog
from PIL import Image
from datetime import datetime

def merge_images_vertically():
    # Tkinter 창을 생성하지만, 메인 창은 표시하지 않습니다.
    root = tk.Tk()
    root.withdraw()

    # 이미지 파일들을 선택하는 다이얼로그를 엽니다.
    file_paths = filedialog.askopenfilenames(
        title="이미지 파일을 선택하세요",
        filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.bmp;*.gif")]
    )
    
    if not file_paths:
        print("파일이 선택되지 않았습니다.")
        return

    # 선택한 파일들을 파일명 기준으로 정렬합니다.
    file_paths = sorted(file_paths)

    # Pillow를 사용하여 모든 이미지를 엽니다.
    images = [Image.open(fp) for fp in file_paths]

    # 최종 이미지의 크기를 계산합니다.
    # - 최대 너비: 모든 이미지 중 가장 큰 너비
    # - 총 높이: 모든 이미지의 높이를 합산
    widths = [img.width for img in images]
    heights = [img.height for img in images]
    max_width = max(widths)
    total_height = sum(heights)

    # 새 이미지를 생성합니다. (RGB 모드, 흰색 배경)
    new_image = Image.new("RGB", (max_width, total_height), color=(255, 255, 255))

    # 이미지를 위에서 아래로 하나씩 붙여넣습니다.
    current_y = 0
    for img in images:
        new_image.paste(img, (0, current_y))
        current_y += img.height

    # 현재 시간을 기준으로 파일명을 만듭니다.
    now = datetime.now()
    filename = now.strftime("product_%Y-%m-%d_%H-%M.jpg")
    
    # 저장할 폴더를 선택하는 다이얼로그를 엽니다.
    save_folder = filedialog.askdirectory(title="저장할 폴더를 선택하세요")
    if not save_folder:
        print("저장 폴더가 선택되지 않았습니다.")
        return

    # 최종 파일 경로를 생성하고 이미지를 저장합니다.
    save_path = os.path.join(save_folder, filename)
    new_image.save(save_path)
    print(f"이미지가 저장되었습니다: {save_path}")

if __name__ == "__main__":
    merge_images_vertically()
