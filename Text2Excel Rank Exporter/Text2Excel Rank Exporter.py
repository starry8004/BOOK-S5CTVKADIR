import ast
import tkinter as tk
from tkinter import filedialog
import os
from datetime import datetime
from openpyxl import Workbook

# tkinter를 이용해 파일 선택창 띄우기
root = tk.Tk()
root.withdraw()  # tkinter 창 숨기기
input_file = filedialog.askopenfilename(
    title="파일 선택", 
    filetypes=[("텍스트 파일", "*.txt"), ("모든 파일", "*.*")]
)

if not input_file:
    print("파일이 선택되지 않았습니다.")
    exit()

# 원래 파일명에서 확장자 제거
base_name = os.path.splitext(os.path.basename(input_file))[0]

# 현재 날짜와 시간을 "yyyy-mm-dd_hhmm" 형식으로 가져와 결과 파일명 생성
now_str = datetime.now().strftime("%Y-%m-%d_%H%M")
output_file = f"{base_name}_{now_str}.xlsx"

# 데이터를 저장할 리스트
records = []

# 파일 읽기 및 데이터 파싱
with open(input_file, "r", encoding="utf-8") as file:
    for line in file:
        if line.startswith("Rank"):
            rank_data = line.split(": ", 1)
            if len(rank_data) == 2:
                rank, data_str = rank_data
                try:
                    data_dict = ast.literal_eval(data_str.strip())  # 문자열을 딕셔너리로 변환
                except Exception as e:
                    print(f"데이터 변환 오류: {e}")
                    continue
                data_dict["Rank"] = rank
                records.append(data_dict)

# 데이터가 있는 경우 openpyxl을 사용해 엑셀 파일 생성 및 저장
if records:
    wb = Workbook()
    ws = wb.active
    
    # 원하는 컬럼 순서 (해당 컬럼들이 딕셔너리에 존재해야 합니다)
    columns = ["Rank", "대카테고리", "중카테고리", "소카테고리", "세부카테고리", 
               "total", "recent_sum", "older_sum", "growth_rate", "final_score", "rank"]
    
    # 헤더 추가
    ws.append(columns)
    
    # 각 record에 대해 row 추가
    for record in records:
        row = [record.get(col, "") for col in columns]
        ws.append(row)
        
    wb.save(output_file)
    print(f"엑셀 파일 저장 완료: {output_file}")
else:
    print("데이터를 찾을 수 없습니다.")
