import pandas as pd
import requests
import random
import time
from typing import List, Dict
import json
from datetime import datetime
import tkinter as tk
from tkinter import filedialog
import os

class NaverShoppingScraper:
    def __init__(self):
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        ]
        
        self.base_headers = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin"
        }
        
    def _get_random_headers(self) -> Dict:
        """무작위 헤더 생성"""
        headers = self.base_headers.copy()
        headers["user-agent"] = random.choice(self.user_agents)
        return headers
    
    def _natural_delay(self):
        """자연스러운 딜레이 생성 (5-15초)"""
        base_delay = random.uniform(5, 15)
        # 20% 확률로 추가 딜레이 (15-30초)
        if random.random() < 0.2:
            base_delay += random.uniform(10, 15)
        time.sleep(base_delay)
    
    def get_related_keywords(self, keyword: str, max_retries: int = 3) -> List[str]:
        """특정 키워드의 연관 검색어 수집"""
        url = f"https://search.shopping.naver.com/api/search/related/{keyword}"
        
        for attempt in range(max_retries):
            try:
                headers = self._get_random_headers()
                print(f"\n연결 시도 중... ({attempt + 1}/{max_retries})")
                response = requests.get(url, headers=headers)
                response.raise_for_status()
                
                data = response.json()
                related_keywords = [item["key"] for item in data.get("related", [])]
                return related_keywords
                
            except requests.exceptions.RequestException as e:
                print(f"\n오류 발생: {str(e)}")
                if attempt < max_retries - 1:
                    print("재시도 중...")
                    self._natural_delay()
                    continue
                print(f"\n'{keyword}' 키워드 처리 실패")
                return []
    
    def process_file(self):
        """파일 선택 및 처리"""
        # GUI 초기화
        root = tk.Tk()
        root.withdraw()
        
        # 파일 선택 다이얼로그
        file_path = filedialog.askopenfilename(
            title="처리할 CSV 파일을 선택하세요",
            filetypes=[("CSV files", "*.csv")]
        )
        
        if not file_path:
            print("파일이 선택되지 않았습니다.")
            return
        
        try:
            # 파일 읽기
            df = pd.read_csv(file_path)
            total_keywords = len(df)
            
            print(f"\n총 {total_keywords}개의 키워드를 처리합니다.")
            
            # 작업 시작 시간 기록
            start_time = datetime.now()
            
            for idx, row in df.iterrows():
                keyword = row['키워드']
                current_time = datetime.now()
                elapsed_time = current_time - start_time
                
                # 진행상황 출력
                progress = f"""
{'='*50}
현재 진행상황:
- 처리 중인 키워드: {keyword}
- 진행률: {idx + 1}/{total_keywords} ({((idx + 1)/total_keywords*100):.1f}%)
- 경과 시간: {str(elapsed_time).split('.')[0]}
- 남은 키워드 수: {total_keywords - (idx + 1)}
{'='*50}
"""
                print(progress)
                
                # 연관 키워드 수집
                related_keywords = self.get_related_keywords(keyword)
                
                # H열에 결과 저장
                df.at[idx, 'H'] = json.dumps(related_keywords, ensure_ascii=False)
                
                # 중간 저장 (10개 키워드마다)
                if (idx + 1) % 10 == 0:
                    temp_filename = f"temp_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                    df.to_csv(temp_filename, index=False, encoding='utf-8-sig')
                    print(f"\n중간 결과가 {temp_filename}에 저장되었습니다.")
                
                self._natural_delay()
            
            # 최종 결과 저장
            output_filename = f"final_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            df.to_csv(output_filename, index=False, encoding='utf-8-sig')
            print(f"\n최종 결과가 {output_filename}에 저장되었습니다.")
            
        except Exception as e:
            print(f"\n오류 발생: {str(e)}")
            print("작업이 중단되었습니다.")

def main():
    scraper = NaverShoppingScraper()
    scraper.process_file()

if __name__ == "__main__":
    main()