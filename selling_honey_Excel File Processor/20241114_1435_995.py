def extract_sheet_name(filename):
    """
    파일명에서 시트명 추출
    예: "셀링하니_가구_인테리어_경쟁도_2024-11-14.csv" -> "가구_인테리어_경쟁도"
    """
    # 파일명에서 확장자 제거
    name = os.path.splitext(filename)[0]
    
    # "셀링하니_" 제거
    if name.startswith("셀링하니_"):
        name = name.replace("셀링하니_", "", 1)
    
    # 날짜 부분 제거 (2024-11-14 형식)
    parts = name.split('_')
    parts = [p for p in parts if not p.startswith('2024')]
    
    # 남은 부분을 언더스코어로 연결
    sheet_name = '_'.join(parts)
    
    # Excel 시트명 제한 (31자)
    if len(sheet_name) > 31:
        sheet_name = sheet_name[:31]
        
    return sheet_name

def get_output_filename():
    """현재 시간을 포함한 출력 파일명 생성"""
    from datetime import datetime
    current_time = datetime.now().strftime("%Y%m%d_%H%M")
    return f"셀링하니_통합_키워드_데이터_{current_time}.xlsx"

def save_to_excel(all_data):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    
    for filename, data in all_data.items():
        sheet_name = extract_sheet_name(filename)
        ws = wb.create_sheet(title=sheet_name)
        
        if data:
            headers = list(data[0].keys())
            for col, header in enumerate(headers, 1):
                ws.cell(row=1, column=col, value=header)
            
            for row_idx, row_data in enumerate(data, 2):
                for col_idx, header in enumerate(headers, 1):
                    ws.cell(row=row_idx, column=col_idx, value=row_data[header])
    
    output_filename = get_output_filename()
    wb.save(output_filename)
    return output_filename

def process_csv_files():
    folder_path = select_directory()
    if not folder_path:
        print("폴더가 선택되지 않았습니다.")
        return
    all_processed_data = {}
    
    for filename in os.listdir(folder_path):
        if filename.endswith('.csv'):
            print(f"\n{filename} 처리 중...")
            file_path = os.path.join(folder_path, filename)
            
            try:
                data = read_csv_file(file_path)
                processed_data = process_data(data)
                all_processed_data[filename] = processed_data
                print(f"{filename} 처리 완료")
                print(f"시트명: {extract_sheet_name(filename)}")
            except Exception as e:
                print(f"{filename} 처리 중 오류 발생: {e}")
                continue
    
    if all_processed_data:
        output_filename = save_to_excel(all_processed_data)
        print("\n모든 파일 처리가 완료되었습니다.")
        print(f"결과가 '{output_filename}' 파일에 저장되었습니다.")
    else:
        print("\n처리된 데이터가 없습니다.")