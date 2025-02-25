import pandas as pd
import os
from tkinter import filedialog
import tkinter as tk

def process_excel_files():
    # GUI로 폴더 선택
    root = tk.Tk()
    root.withdraw()  # GUI 창 숨기기
    folder_path = filedialog.askdirectory(title="엑셀 파일이 있는 폴더를 선택하세요")
    
    if not folder_path:
        print("폴더가 선택되지 않았습니다.")
        return
    
    # 결과를 저장할 새 엑셀 파일 생성
    output_file = "통합_결과.xlsx"
    writer = pd.ExcelWriter(output_file, engine='openpyxl')
    
    # 폴더 내의 모든 엑셀 파일 처리
    excel_files = [f for f in os.listdir(folder_path) if f.endswith(('.xlsx', '.xls'))]
    
    for file in excel_files:
        try:
            file_path = os.path.join(folder_path, file)
            
            # 엑셀 파일 읽기
            df = pd.read_excel(file_path, sheet_name='sheet1')
            
            # 키워드 기준으로 중복 제거하고 첫 번째 행 유지
            df = df.sort_values('검색량', ascending=False)  # 검색량 기준 정렬
            df = df.drop_duplicates(subset=['키워드'], keep='first')
            
            # 카테고리와 옵션 추출 (파일명에서)
            filename = os.path.splitext(file)[0]
            category_option = filename  # 파일명을 시트명으로 사용
            
            # 새 시트에 데이터 저장
            df.to_excel(writer, sheet_name=category_option, index=False)
            
            print(f"처리 완료: {file}")
            
        except Exception as e:
            print(f"파일 처리 중 오류 발생 ({file}): {str(e)}")
    
    try:
        writer.close()
        print(f"\n모든 처리가 완료되었습니다. 결과가 {output_file}에 저장되었습니다.")
    except Exception as e:
        print(f"결과 파일 저장 중 오류 발생: {str(e)}")

if __name__ == "__main__":
    process_excel_files()