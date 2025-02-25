import openpyxl
import csv
import os
from tkinter import filedialog
import tkinter as tk
import codecs

def convert_xlsx_to_csv():
    # GUI로 폴더 선택
    root = tk.Tk()
    root.withdraw()
    folder_path = filedialog.askdirectory(title="Excel 파일이 있는 폴더를 선택하세요")
    
    if not folder_path:
        print("폴더가 선택되지 않았습니다.")
        return
    
    # CSV 파일을 저장할 폴더 생성
    csv_folder = os.path.join(folder_path, "CSV_변환")
    if not os.path.exists(csv_folder):
        os.makedirs(csv_folder)
    
    # 폴더 내의 모든 Excel 파일 처리
    excel_files = [f for f in os.listdir(folder_path) if f.endswith(('.xlsx', '.xls'))]
    print(f"발견된 Excel 파일 수: {len(excel_files)}")
    
    for excel_file in excel_files:
        try:
            excel_path = os.path.join(folder_path, excel_file)
            print(f"\n처리 중: {excel_file}")
            
            # Excel 파일 열기
            wb = openpyxl.load_workbook(excel_path)
            sheet = wb.active
            
            # 데이터가 있는지 확인
            if sheet.max_row == 0:
                print(f"경고: {excel_file}에 데이터가 없습니다.")
                continue
                
            # 첫 번째 행(헤더) 읽기
            headers = [str(cell.value) for cell in next(sheet.rows)]
            print(f"헤더: {headers}")
            
            # CSV 파일명 생성
            csv_file = os.path.splitext(excel_file)[0] + '.csv'
            csv_path = os.path.join(csv_folder, csv_file)
            
            # UTF-8-SIG로 CSV 파일 저장 (BOM 포함)
            with codecs.open(csv_path, 'w', encoding='utf-8-sig', errors='replace') as f:
                writer = csv.writer(f, lineterminator='\n')
                
                # 헤더 쓰기
                writer.writerow(headers)
                
                # 데이터 행 처리
                for row in list(sheet.rows)[1:]:  # 첫 번째 행(헤더) 제외
                    row_data = []
                    for cell in row:
                        value = cell.value
                        if value is None:
                            value = ''
                        elif isinstance(value, (int, float)):
                            value = str(value)
                        else:
                            value = str(value).strip()
                        row_data.append(value)
                    writer.writerow(row_data)
            
            print(f"변환 완료: {csv_file}")
            
            # 파일이 정상적으로 생성되었는지 확인
            if os.path.exists(csv_path):
                size = os.path.getsize(csv_path)
                print(f"생성된 파일 크기: {size:,} bytes")
                
                # 생성된 파일 확인
                with codecs.open(csv_path, 'r', encoding='utf-8-sig', errors='replace') as f:
                    first_line = f.readline().strip()
                    print(f"파일 첫 줄 확인: {first_line}")
            
        except Exception as e:
            print(f"파일 변환 중 오류 발생 ({excel_file}): {str(e)}")
            import traceback
            print(traceback.format_exc())
    
    print(f"\n모든 변환이 완료되었습니다.")
    print(f"CSV 파일들이 저장된 폴더: {csv_folder}")
    
    # 결과 확인
    converted_files = [f for f in os.listdir(csv_folder) if f.endswith('.csv')]
    print(f"변환된 파일 수: {len(converted_files)}")
    for file in converted_files:
        print(f" - {file}")

if __name__ == "__main__":
    convert_xlsx_to_csv()