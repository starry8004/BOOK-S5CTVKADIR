import tkinter as tk
from tkinter import filedialog
import re

# 무시할 키워드
IGNORE_KEYWORDS = [
    "조회수", "게시일", "구독자", 
    "기여도", "성과도", "노출확률", 
    "썸네일", "선택", "총 영상 수",
    # 새로 추가: 'Normal', 'Good', 'Great', '...' 등도 무시
    "Normal", "Good", "Great", "..."
]

def is_ignore_line(line: str) -> bool:
    """
    다음 조건 중 하나라도 만족하면 무시:
    1) IGNORE_KEYWORDS 중 하나라도 포함
    2) 타임라인으로 추정되는 패턴(\d{1,2}:\d{2})이 포함 (ex) 02:12, 15:43 등
    """
    # 키워드 체크
    for keyword in IGNORE_KEYWORDS:
        if keyword in line:
            return True
    
    # 시간 패턴 체크(예: '00:00' ~ '99:99'까지 단순 대응)
    if re.search(r"\b\d{1,2}:\d{2}\b", line):
        return True

    return False

def extract_titles(file_path: str):
    """
    텍스트 파일에서:
    - 무시해야 할 줄은 건너뛰고
    - 중복되는 줄은 한 번만
    - 나머지를 제목 목록으로 반환
    """
    seen = set()
    titles = []

    with open(file_path, 'r', encoding='utf-8') as f:
        for raw_line in f:
            line = raw_line.strip()
            # 빈 줄은 패스
            if not line:
                continue
            # 무시 조건 검사
            if is_ignore_line(line):
                continue
            # 이미 추가된 제목이면 패스
            if line in seen:
                continue

            # 새로운 제목이면 저장
            seen.add(line)
            titles.append(line)

    return titles

def select_txt_file_and_extract():
    """
    1) tkinter 파일 열기 대화상자로 txt 파일을 선택
    2) 조건대로 제목 추출
    3) 결과를 별도 txt 파일로 저장
    """
    root = tk.Tk()
    root.withdraw()  # Tk 윈도우 숨기기

    selected_file = filedialog.askopenfilename(
        title="Select a text file",
        filetypes=[("Text files", "*.txt")]
    )
    
    if not selected_file:
        print("No file selected.")
        return

    # 추출 로직
    titles = extract_titles(selected_file)
    
    if titles:
        # 결과 파일명은 자유롭게 바꾸셔도 됩니다
        output_file = selected_file.replace(".txt", "_RESULT.txt")

        with open(output_file, 'w', encoding='utf-8') as f_out:
            for t in titles:
                f_out.write(t + "\n")
        
        print(f"[결과 저장 완료]\n→ {output_file}")
    else:
        print("조건에 맞는 제목이 없습니다.")

if __name__ == "__main__":
    select_txt_file_and_extract()
