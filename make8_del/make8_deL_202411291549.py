import pandas as pd
from datetime import datetime
from tkinter import Tk
from tkinter.filedialog import askopenfilename, askdirectory
from tqdm import tqdm  # 진행률 표시를 위한 라이브러리

def filter_and_save_excel():
    # Tkinter 창 숨기기
    Tk().withdraw()
    
    # 파일 선택 창 열기
    print("필터링할 Excel 파일을 선택하세요:")
    file_path = askopenfilename(filetypes=[("Excel files", "*.xlsx *.xls")])
    
    if not file_path:
        print("파일을 선택하지 않았습니다. 프로그램을 종료합니다.")
        return
    print(f"선택된 파일: {file_path}")

    # 폴더 선택 창 열기
    print("저장할 폴더를 선택하세요:")
    output_path = askdirectory()
    
    if not output_path:
        print("저장 경로를 선택하지 않았습니다. 프로그램을 종료합니다.")
        return
    print(f"선택된 저장 경로: {output_path}")

    try:
        print("Excel 파일을 불러오는 중...")
        # Excel 데이터 불러오기
        df = pd.read_excel(file_path)
        print("파일 로드 완료!")

        # tqdm으로 진행 상황 표시
        print("'검색량' 값이 8000 미만인 데이터를 필터링 중...")
        total_rows = len(df)
        with tqdm(total=total_rows, desc="필터링 진행 중", unit="행") as pbar:
            # 필터링 작업 (한 줄씩 진행률 업데이트)
            filtered_df = pd.DataFrame(columns=df.columns)
            for index, row in df.iterrows():
                if row['검색량'] >= 8000:
                    filtered_df = pd.concat([filtered_df, pd.DataFrame([row])])
                pbar.update(1)

        print("필터링 완료!")

        # 현재 날짜와 시간으로 파일명 생성
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        file_name = file_path.split('/')[-1].split('.')[0]
        output_file = f"{output_path}/{file_name}_M8_{timestamp}.xlsx"

        print("필터링된 데이터를 파일로 저장 중...")
        # tqdm으로 저장 작업 진행 상황 표시
        with tqdm(total=len(filtered_df), desc="저장 진행 중", unit="행") as pbar:
            filtered_df.to_excel(output_file, index=False)
            pbar.update(len(filtered_df))  # 모든 데이터 저장 완료 표시

        print(f"작업 완료! 파일이 저장되었습니다: {output_file}")
    
    except Exception as e:
        print(f"오류 발생: {e}")

# 실행
filter_and_save_excel()
