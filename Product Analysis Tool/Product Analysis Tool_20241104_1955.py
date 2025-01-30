import pandas as pd
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from datetime import datetime
import os
import threading

class ProductAnalyzer:
    def __init__(self):
        self.df = None
        self.setup_gui()
        
    def setup_gui(self):
        self.root = tk.Tk()
        self.root.title("상품 분석기")
        self.root.geometry("800x600")
        
        # 메인 프레임
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 상단 설명
        description = ttk.Label(main_frame, 
            text="※ 대용량 파일 분석 시 시간이 소요될 수 있습니다.\n전체 데이터를 분석하므로 잠시만 기다려주세요.",
            justify=tk.CENTER, wraplength=700)
        description.pack(pady=20)
        
        # 파일 선택 프레임
        file_frame = ttk.Frame(main_frame)
        file_frame.pack(fill=tk.X, pady=10)
        
        self.file_label = ttk.Label(file_frame, text="선택된 파일: 없음")
        self.file_label.pack(side=tk.LEFT, padx=5)
        
        upload_btn = ttk.Button(file_frame, text="파일 선택", command=self.load_file)
        upload_btn.pack(side=tk.RIGHT, padx=5)
        
        # 프로그레스바
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.pack(fill=tk.X, pady=10)
        
        # 분석 버튼들
        self.buttons_frame = ttk.Frame(main_frame)
        self.buttons_frame.pack(pady=20)
        
        analysis_buttons = [
            ("1. 경쟁도가 낮은 상품으로 분류", self.analyze_competition),
            ("2. 매력도가 높은 상품으로 분류", self.analyze_attraction),
            ("3. 성장하는 상품으로 분류", self.analyze_growth),
            ("4. 급성장 상품으로 분류", self.analyze_rapid_growth)
        ]
        
        for text, command in analysis_buttons:
            btn = ttk.Button(self.buttons_frame, text=text, command=command, width=40)
            btn.pack(pady=5)
        
        # 상태 표시 레이블
        self.status_label = ttk.Label(main_frame, text="파일을 선택해주세요")
        self.status_label.pack(pady=20)
        
        # 스타일 설정
        style = ttk.Style()
        style.configure('TButton', padding=5)
        style.configure('TLabel', font=('Arial', 10))
        
    def load_file(self):
        file_path = filedialog.askopenfilename(
            title="분석할 Excel 파일을 선택하세요",
            filetypes=[("Excel files", "*.xlsx *.xls")]
        )
        if file_path:
            self.status_label.config(text="파일 로딩 중...")
            self.progress.start()
            self.file_label.config(text=f"선택된 파일: {os.path.basename(file_path)}")
            
            # 파일 로딩을 별도 스레드에서 실행
            thread = threading.Thread(target=self.load_file_thread, args=(file_path,))
            thread.daemon = True
            thread.start()
    
    def load_file_thread(self, file_path):
        try:
            self.df = pd.read_excel(file_path)
            self.root.after(0, self.file_loaded_success)
        except Exception as e:
            self.root.after(0, lambda: self.file_loaded_error(str(e)))
    
    def file_loaded_success(self):
        self.progress.stop()
        self.status_label.config(text="파일 로딩 완료")
        messagebox.showinfo("성공", "파일이 성공적으로 로드되었습니다.")
    
    def file_loaded_error(self, error_msg):
        self.progress.stop()
        self.status_label.config(text="파일 로딩 실패")
        messagebox.showerror("에러", f"파일 로딩 중 오류 발생: {error_msg}")
    
    def process_data(self, conditions, analysis_type):
        if self.df is None:
            messagebox.showwarning("주의", "먼저 파일을 로드해주세요")
            return
        
        try:
            self.status_label.config(text="데이터 분석 중...")
            self.progress.start()
            
            # 조건에 맞는 데이터 필터링
            filtered_df = self.df.copy()
            for condition in conditions:
                filtered_df = filtered_df[condition]
            
            # 검색량 기준 정렬 및 순서 부여
            filtered_df = filtered_df.sort_values('검색량', ascending=False)
            filtered_df.insert(0, '순서_검색량순', range(1, len(filtered_df) + 1))
            
            # 필요한 컬럼만 선택
            columns = ['순서_검색량순', '키워드', '카테고리전체', '검색량', 
                      '경쟁률', '광고경쟁강도', '계절성']
            result_df = filtered_df[columns]
            
            # 파일명 생성
            filename = f"{datetime.now().strftime('%Y-%m-%d')} 좋은 상품 리스트_{analysis_type}.xlsx"
            
            # 저장 경로 선택
            save_path = filedialog.asksaveasfilename(
                defaultextension=".xlsx",
                initialfile=filename,
                filetypes=[("Excel files", "*.xlsx")]
            )
            
            if save_path:
                result_df.to_excel(save_path, index=False)
                self.progress.stop()
                self.status_label.config(text="분석 완료")
                messagebox.showinfo("완료", 
                    "오래 기다려주셔서 감사합니다.\n"
                    "완벽한 상품 리스트가 준비되었습니다.\n"
                    "브랜드 키워드가 포함되어 있을 수 있으니 참고하세요.")
                
                # 파일 열기
                os.startfile(save_path)
                
        except Exception as e:
            self.progress.stop()
            self.status_label.config(text="분석 실패")
            messagebox.showerror("에러", f"데이터 처리 중 오류 발생: {str(e)}")
    
    def analyze_competition(self):
        conditions = [
            (self.df['경쟁률'] < 4),
            (self.df['검색량'] >= 15000),
            (self.df['쇼핑성키워드'] == True)
        ]
        self.process_data(conditions, "경쟁도")
    
    def analyze_attraction(self):
        conditions = [
            (self.df['매력도'] >= 3),
            (self.df['검색량'] >= 15000),
            (self.df['쇼핑성키워드'] == True)
        ]
        self.process_data(conditions, "매력도")
    
    def analyze_growth(self):
        conditions = [
            (self.df['성장성'] >= 0),
            (self.df['검색량'] >= 8000),
            (self.df['쇼핑성키워드'] == True),
            (self.df['경쟁률'] < 4)
        ]
        self.process_data(conditions, "성장")
    
    def analyze_rapid_growth(self):
        conditions = [
            (self.df['성장성'] >= 0.15),
            (self.df['검색량'] >= 10000),
            (self.df['쇼핑성키워드'] == True)
        ]
        self.process_data(conditions, "급성장")
    
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = ProductAnalyzer()
    app.run()