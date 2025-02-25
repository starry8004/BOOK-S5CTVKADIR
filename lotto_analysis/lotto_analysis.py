import pandas as pd
from datetime import datetime

# 엑셀 파일 경로 설정
file_path = 'data_lotto.xlsx'  # 엑셀 파일을 'data_lotto.xlsx'로 이름을 지정하여 같은 디렉토리에 저장하세요.

# 데이터 로드
lotto_data = pd.read_excel(file_path)

# 번호 열 이름 정의
number_columns = ['첫번째', '두번째', '세번째', '네번째', '다섯번째', '여섯번째']

# 빈도 계산 함수
def calculate_frequencies(df, number_columns):
    freq_dict = {}
    for col in number_columns:
        for num in df[col]:
            if num not in freq_dict:
                freq_dict[num] = {}
            for sub_col in number_columns:
                if sub_col != col:
                    for sub_num in df[df[col] == num][sub_col]:
                        if sub_num not in freq_dict[num]:
                            freq_dict[num][sub_num] = 0
                        freq_dict[num][sub_num] += 1
    return freq_dict

# 빈도 계산
freq_dict = calculate_frequencies(lotto_data, number_columns)

# 결과 정리 함수
def sort_and_format_frequencies(freq_dict):
    result = []
    for num, sub_dict in freq_dict.items():
        sorted_sub_dict = sorted(sub_dict.items(), key=lambda item: item[1], reverse=True)
        top_5 = [sub_num for sub_num, count in sorted_sub_dict[:5]]
        result.append([num] + top_5)
    result_df = pd.DataFrame(result, columns=['Starting Number', 'Top 1', 'Top 2', 'Top 3', 'Top 4', 'Top 5'])
    return result_df

# 결과 정리
result_df = sort_and_format_frequencies(freq_dict)

# 결과 출력
print(result_df)

# 현재 시각을 가져와 파일 이름에 포함
current_time = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
output_file_path = f'lotto_analysis_results_{current_time}.xlsx'

# 결과를 엑셀 파일로 저장
result_df.to_excel(output_file_path, index=False)
print(f'Results have been saved to {output_file_path}')
