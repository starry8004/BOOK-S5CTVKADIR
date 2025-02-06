import pandas as pd
import tkinter as tk
from tkinter import filedialog
import re
from tqdm import tqdm
import time

# tqdm의 pandas 적용 (각 행 처리 시 진행 바 표시)
tqdm.pandas()

def select_excel_file():
    """
    Tkinter를 사용하여 엑셀 파일 선택 다이얼로그를 연 후,
    선택된 파일 경로를 반환합니다.
    """
    root = tk.Tk()
    root.withdraw()  # Tk 창을 숨깁니다.
    file_path = filedialog.askopenfilename(
        title="엑셀 파일을 선택하세요",
        filetypes=[("Excel files", "*.xlsx *.xls")]
    )
    return file_path

def load_data(file_path):
    """
    선택한 엑셀 파일을 읽어 Pandas DataFrame으로 반환합니다.
    """
    df = pd.read_excel(file_path)
    return df

def extract_date_columns(df):
    """
    DataFrame의 컬럼 중 날짜 형식(예: 2025-02-03)에 해당하는 컬럼만 추출합니다.
    (정규식을 활용하여 'YYYY-MM-DD' 형태를 인식)
    """
    date_cols = [col for col in df.columns if re.match(r'\d{4}-\d{2}-\d{2}', str(col))]
    return date_cols

def calculate_total_per_row(df, date_cols):
    """
    tqdm를 이용하여 각 행에 대해 날짜별 데이터의 합계를 계산합니다.
    (진행 상황이 터미널에 표시됩니다.)
    """
    # progress_apply를 사용하여 각 행마다 합계를 계산합니다.
    df['total'] = df[date_cols].progress_apply(lambda row: row.sum(), axis=1)
    return df

def recommend_categories(df, top_n=5):
    """
    'total' 컬럼을 기준으로 DataFrame을 내림차순 정렬하고,
    상위 top_n개의 결과를 반환합니다.
    """
    df_sorted = df.sort_values(by='total', ascending=False)
    return df_sorted.head(top_n)

def main():
    # 1. 엑셀 파일 선택
    file_path = select_excel_file()
    if not file_path:
        print("파일이 선택되지 않았습니다.")
        return
    
    print("엑셀 파일을 불러오는 중입니다...")
    df = load_data(file_path)
    
    # 2. 날짜 형식의 컬럼 선택
    date_cols = extract_date_columns(df)
    if not date_cols:
        print("날짜 형식의 컬럼이 발견되지 않았습니다.")
        return
    print(f"날짜 컬럼: {date_cols}")
    
    # 3. 각 행(카테고리)마다 날짜 데이터 합계 계산 (진행 상황 표시)
    print("각 카테고리의 총합 계산 중...")
    df = calculate_total_per_row(df, date_cols)
    
    # (잠깐 진행 상황을 눈으로 확인하기 위해 약간의 딜레이)
    time.sleep(1)
    
    # 4. 추천 카테고리 상위 top 5 결과 추출
    recommended = recommend_categories(df, top_n=5)
    print("\n추천 카테고리 (날짜 데이터 합계 기준 Top 5):")
    # 예시로 대카테고리, 중카테고리, 소카테고리, 세부카테고리와 total 값을 출력합니다.
    cols_to_show = ['대카테고리', '중카테고리', '소카테고리', '세부카테고리', 'total']
    # 만약 해당 컬럼들이 존재하지 않으면 전체 DataFrame을 출력합니다.
    for col in cols_to_show:
        if col not in recommended.columns:
            cols_to_show = recommended.columns
            break
    print(recommended[cols_to_show].to_string(index=False))
    
if __name__ == "__main__":
    main()
