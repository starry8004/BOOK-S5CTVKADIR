import openpyxl
import csv
import os
from tkinter import filedialog
import tkinter as tk

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
    
    for excel_file in excel_files:
        try:
            excel_path = os.path.join(folder_path, excel_file)
            print(f"처리 중: {excel_file}")
            
            # Excel 파일 열기
            wb = openpyxl.load_workbook(excel_path)
            
            # 첫 번째 시트 선택 (이름에 상관없이)
            sheet = wb.active
            
            # CSV 파일명 생성
            csv_file = os.path.splitext(excel_file)[0] + '.csv'
            csv_path = os.path.join(csv_folder, csv_file)
            
            # CSV 파일로 저장
            with open(csv_path, 'w', encoding='utf-8', newline='') as f:
                writer = csv.writer(f)
                
                # 모든 행 처리
                for row in sheet.rows:
                    # 셀 값을 문자열로 변환
                    row_data = [str(cell.value) if cell.value is not None else '' for cell in row]
                    writer.writerow(row_data)
            
            print(f"변환 완료: {csv_file}")
            
        except Exception as e:
            print(f"파일 변환 중 오류 발생 ({excel_file}): {str(e)}")
    
    print(f"\n모든 변환이 완료되었습니다.")
    print(f"CSV 파일들이 저장된 폴더: {csv_folder}")
    
    return csv_folder

def process_csv_files(folder_path):
    # CSV 파일들을 처리하는 함수
    if not folder_path:
        print("폴더 경로가 없습니다.")
        return
    
    # 결과를 저장할 파일
    output_file = os.path.join(os.path.dirname(folder_path), "통합_결과.csv")
    
    # 모든 데이터를 저장할 딕셔너리
    all_data = {}
    
    # 폴더 내의 모든 CSV 파일 처리
    csv_files = [f for f in os.listdir(folder_path) if f.endswith('.csv')]
    
    for file in csv_files:
        try:
            file_path = os.path.join(folder_path, file)
            
            # 파일명에서 카테고리와 옵션 추출
            filename = os.path.splitext(file)[0]
            sheet_name = filename
            
            print(f"처리 중: {file}")
            
            # CSV 파일 읽기
            with open(file_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    keyword = row['키워드']
                    search_volume = int(row.get('검색량', 0))
                    
                    if keyword not in all_data:
                        all_data[keyword] = {
                            'data': row,
                            'categories': {}
                        }
                    elif search_volume > int(all_data[keyword]['data'].get('검색량', 0)):
                        all_data[keyword]['data'] = row
                    
                    all_data[keyword]['categories'][sheet_name] = row['카테고리전체']
            
            print(f"처리 완료: {file}")
            
        except Exception as e:
            print(f"파일 처리 중 오류 발생 ({file}): {str(e)}")
    
    # 결과를 CSV 파일로 저장
    try:
        if all_data:
            # 첫 번째 데이터에서 기본 필드 가져오기
            first_data = next(iter(all_data.values()))
            base_fields = list(first_data['data'].keys())
            all_categories = sorted(set(cat for data in all_data.values() 
                                     for cat in data['categories'].keys()))
            
            with open(output_file, 'w', encoding='utf-8', newline='') as csvfile:
                writer = csv.writer(csvfile)
                
                # 헤더 쓰기
                header = base_fields + [f"카테고리_{cat}" for cat in all_categories]
                writer.writerow(header)
                
                # 데이터 쓰기
                for keyword, data in all_data.items():
                    row = [data['data'].get(field, '') for field in base_fields]
                    row.extend(data['categories'].get(cat, '') for cat in all_categories)
                    writer.writerow(row)
            
            print(f"\n모든 처리가 완료되었습니다. 결과가 저장된 파일: {output_file}")
    except Exception as e:
        print(f"결과 파일 저장 중 오류 발생: {str(e)}")

if __name__ == "__main__":
    # Excel 파일들을 CSV로 변환
    csv_folder = convert_xlsx_to_csv()
    
    if csv_folder and os.path.exists(csv_folder):
        # 이어서 CSV 처리 코드를 실행할지 물어보기
        response = input("\nCSV 파일 처리를 진행하시겠습니까? (y/n): ")
        if response.lower() == 'y':
            print("\nCSV 파일 처리를 시작합니다...")
            process_csv_files(csv_folder)