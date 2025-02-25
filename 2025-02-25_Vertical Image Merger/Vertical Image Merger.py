import os
import tkinter as tk
from tkinter import filedialog
from PIL import Image
from datetime import datetime

def merge_images_vertically():
    # Tkinter 창을 숨긴 채 생성
    root = tk.Tk()
    root.withdraw()

    # 이미지 파일들을 선택하는 다이얼로그
    file_paths = filedialog.askopenfilenames(
        title="이미지 파일을 선택하세요",
        filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.bmp;*.gif")]
    )
    
    if not file_paths:
        print("파일이 선택되지 않았습니다.")
        return

    # 파일 경로를 정렬(파일명 순)
    file_paths = sorted(file_paths)

    # PIL을 사용하여 이미지를 연다
    images = [Image.open(fp) for fp in file_paths]

    # 모든 이미지 중 가장 넓은 폭 계산
    max_width = max(img.width for img in images)

    # 모든 이미지를 동일한 max_width로 리사이즈 (비율 유지)
    resized_images = []
    for img in images:
        w, h = img.size
        # 새로운 높이(세로) 계산 = 기존 높이 * (목표 너비 / 기존 너비)
        new_height = int(h * (max_width / w))
        # LANCZOS 필터 사용 (ANTIALIAS 대신)
        resized_img = img.resize((max_width, new_height), Image.LANCZOS)
        resized_images.append(resized_img)

    # 리사이즈된 이미지들의 총 높이 계산
    total_height = sum(img.height for img in resized_images)

    # 최종 결과 이미지를 생성 (흰색 배경)
    new_image = Image.new("RGB", (max_width, total_height), color=(255, 255, 255))

    # 이미지를 위에서부터 차례대로 붙인다
    current_y = 0
    for img in resized_images:
        new_image.paste(img, (0, current_y))
        current_y += img.height

    # 현재 시간을 이용하여 파일명 생성
    now = datetime.now()
    filename = now.strftime("product_%Y-%m-%d_%H-%M.jpg")
    
    # 저장할 폴더를 선택
    save_folder = filedialog.askdirectory(title="저장할 폴더를 선택하세요")
    if not save_folder:
        print("저장 폴더가 선택되지 않았습니다.")
        return

    # 최종 저장 경로 설정 및 저장
    save_path = os.path.join(save_folder, filename)
    new_image.save(save_path)
    print(f"이미지가 저장되었습니다: {save_path}")

if __name__ == "__main__":
    merge_images_vertically()
