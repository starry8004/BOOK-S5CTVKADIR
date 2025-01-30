import pandas as pd
import numpy as np
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from datetime import datetime
import os
import threading

class ProductAnalyzer:
    def __init__(self):
        """Initialize the Product Analyzer application"""
        self.df = None
        self.original_df = None
        self.preprocessed_df = None
        self.setup_gui()
        
    def setup_gui(self):
        """Set up the graphical user interface"""
        self.root = tk.Tk()
        self.root.title("상품 분석기")
        self.root.geometry("800x800")
        
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Top description
        description = ttk.Label(main_frame, 
            text="※ 대용량 파일 분석 시 시간이 소요될 수 있습니다.\n전체 데이터를 분석하므로 잠시만 기다려주세요.",
            justify=tk.CENTER, wraplength=700)
        description.pack(pady=20)
        
        # File selection frame
        file_frame = ttk.Frame(main_frame)
        file_frame.pack(fill=tk.X, pady=10)
        
        self.file_label = ttk.Label(file_frame, text="선택된 파일: 없음")
        self.file_label.pack(side=tk.LEFT, padx=5)
        
        upload_btn = ttk.Button(file_frame, text="파일 선택", command=self.load_file)
        upload_btn.pack(side=tk.RIGHT, padx=5)
        
        # Separator
        ttk.Separator(main_frame, orient='horizontal').pack(fill='x', pady=10)
        
        # Preprocessing section
        preprocess_frame = ttk.LabelFrame(main_frame, text="1단계: 데이터 전처리", padding="10")
        preprocess_frame.pack(fill='x', pady=10)
        
        self.preprocess_stats = ttk.Label(preprocess_frame, text="전처리 대기 중...")
        self.preprocess_stats.pack(pady=5)
        
        self.preprocess_btn = ttk.Button(preprocess_frame, 
                                       text="전처리 시작 (검색량 500 이하 제거)", 
                                       command=self.start_preprocessing)
        self.preprocess_btn.pack(pady=5)
        self.preprocess_btn['state'] = 'disabled'
        
        # Separator
        ttk.Separator(main_frame, orient='horizontal').pack(fill='x', pady=10)
        
        # Analysis section
        analysis_frame = ttk.LabelFrame(main_frame, text="2단계: 데이터 분석", padding="10")
        analysis_frame.pack(fill='x', pady=10)
        
        # Progress bar
        self.progress = ttk.Progressbar(analysis_frame, mode='indeterminate')
        self.progress.pack(fill=tk.X, pady=10)
        
        # Analysis buttons
        self.buttons_frame = ttk.Frame(analysis_frame)
        self.buttons_frame.pack(pady=10)
        
        analysis_buttons = [
            ("1. 경쟁도가 낮은 상품으로 분류", self.analyze_competition),
            ("2. 매력도가 높은 상품으로 분류", self.analyze_attraction),
            ("3. 성장하는 상품으로 분류", self.analyze_growth),
            ("4. 급성장 상품으로 분류", self.analyze_rapid_growth)
        ]
        
        self.analysis_buttons = []
        for text, command in analysis_buttons:
            btn = ttk.Button(self.buttons_frame, text=text, command=command, width=40)
            btn.pack(pady=5)
            btn['state'] = 'disabled'
            self.analysis_buttons.append(btn)
        
        # Status label
        self.status_label = ttk.Label(main_frame, text="파일을 선택해주세요")
        self.status_label.pack(pady=20)
        
        # Protocol for cleanup on window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def on_closing(self):
        """Handle application closing"""
        if hasattr(self, 'current_thread') and self.current_thread.is_alive():
            if messagebox.askokcancel("종료", "작업이 진행 중입니다. 정말 종료하시겠습니까?"):
                self.root.destroy()
        else:
            self.root.destroy()

    def start_preprocessing(self):
        """Start the preprocessing operation"""
        try:
            self.progress.start()
            self.status_label.config(text="데이터 전처리 중...")
            
            # Run in thread
            self.current_thread = threading.Thread(target=self._preprocess_data)
            self.current_thread.daemon = True
            self.current_thread.start()
            
        except Exception as e:
            self.progress.stop()
            self.status_label.config(text="전처리 실패")
            messagebox.showerror("에러", f"데이터 전처리 중 오류 발생: {str(e)}")

    def _preprocess_data(self):
        """Perform the actual preprocessing operations"""
        try:
            df = self.original_df.copy()
            
            # Clean column names
            df.columns = df.columns.str.replace('\n', '').str.strip()
            
            rows_before = len(df)
            
            # Find search volume column
            search_volume_col = next(
                (col for col in df.columns if '검색량' in col and '최근' in col and '개월' in col),
                None
            )
            if not search_volume_col:
                raise KeyError("검색량 관련 컬럼을 찾을 수 없습니다")
            
            # Clean search volume data
            df[search_volume_col] = (
                df[search_volume_col]
                .astype(str)
                .str.replace(',', '')
                .replace(['', 'nan', 'NaN', 'NULL'], '0')
                .astype(float)
            )
            
            # Remove rows with null or low search volume
            df = df.dropna(subset=[search_volume_col])
            df = df[df[search_volume_col] > 500]
            
            rows_after = len(df)
            
            # Save preprocessed data
            self.preprocessed_df = df
            
            # Calculate additional metrics
            self.df = self.process_additional_metrics(df)
            
            # Update GUI in main thread
            self.root.after(0, self._update_preprocessing_complete, rows_before, rows_after)
            
        except Exception as e:
            self.root.after(0, self._update_preprocessing_error, str(e))

    def process_additional_metrics(self, df):
        """
        Calculate additional metrics for product analysis with enhanced error handling
        and data validation.
        """
        try:
            # Deep copy to avoid modifying original
            df = df.copy()
            
            # 1. Shopping keyword conversion with null handling
            if '쇼핑성키워드' not in df.columns:
                df['쇼핑성키워드'] = False
            else:
                df['쇼핑성키워드'] = (
                    df['쇼핑성키워드']
                    .fillna('X')
                    .astype(str)
                    .str.upper()
                    .map(lambda x: False if x in ['X', 'N', 'NO', '0', ''] else True)
                )
            
            # 2. Growth rate calculation with validation
            if '예상3개월검색량상승률' in df.columns:
                df['성장성'] = (
                    df['예상3개월검색량상승률']
                    .fillna('0%')
                    .astype(str)
                    .str.replace('%', '')
                    .replace(['', 'nan', 'NaN', 'NULL'], '0')
                    .astype(float) / 100
                )
            else:
                df['성장성'] = 0.0
                
            # 3. Find search volume column
            search_volume_col = next(
                (col for col in df.columns if '검색량' in col and '최근' in col and '개월' in col),
                None
            )
            if not search_volume_col:
                raise KeyError("검색량 관련 컬럼을 찾을 수 없습니다")
                
            # 4. Ensure search volume is numeric
            df[search_volume_col] = (
                df[search_volume_col]
                .astype(str)
                .str.replace(',', '')
                .replace(['', 'nan', 'NaN', 'NULL'], '0')
                .astype(float)
            )
            
            # 5. Calculate base attractiveness score
            df['매력도'] = np.select(
                condlist=[
                    df[search_volume_col] > 50000,
                    df[search_volume_col] > 30000,
                    df[search_volume_col] > 15000,
                    df[search_volume_col] > 5000
                ],
                choicelist=[5, 4, 3, 2],
                default=1
            )
            
            # 6. Adjust attractiveness based on shopping keyword and growth
            df['매력도'] = df.apply(
                lambda row: min(5, 
                    row['매력도'] + 
                    (1 if row['쇼핑성키워드'] else 0) +
                    (1 if row['성장성'] > 0.5 else 0)
                ),
                axis=1
            )
            
            return df
            
        except Exception as e:
            error_msg = f"추가 지표 계산 중 오류 발생: {str(e)}"
            raise Exception(error_msg)

    def _update_preprocessing_complete(self, rows_before, rows_after):
        """Update GUI after preprocessing completion"""
        rows_removed = rows_before - rows_after
        
        stats_text = f"""
전처리 완료!
- 원본 데이터: {rows_before:,}행
- 처리된 데이터: {rows_after:,}행
- 제거된 행: {rows_removed:,}행
- 제거율: {(rows_removed/rows_before*100):.1f}%
"""
        self.preprocess_stats.config(text=stats_text)
        
        for btn in self.analysis_buttons:
            btn['state'] = 'normal'
        
        self.progress.stop()
        self.status_label.config(text="전처리 완료! 분석을 시작해주세요.")
        messagebox.showinfo("완료", "데이터 전처리가 완료되었습니다. 분석을 진행해주세요.")

    def _update_preprocessing_error(self, error_msg):
        """Update GUI after preprocessing error"""
        self.progress.stop()
        self.status_label.config(text="전처리 실패")
        messagebox.showerror("에러", f"데이터 전처리 중 오류 발생: {error_msg}")

    def load_file(self):
        """Handle file selection and loading"""
        file_path = filedialog.askopenfilename(
            title="분석할 Excel 파일을 선택하세요",
            filetypes=[("Excel files", "*.xlsx *.xls")]
        )
        if file_path:
            self.status_label.config(text="파일 로딩 중...")
            self.progress.start()
            self.file_label.config(text=f"선택된 파일: {os.path.basename(file_path)}")
            
            self.current_thread = threading.Thread(target=self.load_file_thread, args=(file_path,))
            self.current_thread.daemon = True
            self.current_thread.start()
    
    def load_file_thread(self, file_path):
        """Thread for file loading operation"""
        try:
            self.original_df = pd.read_excel(file_path)
            self.root.after(0, self.file_loaded_success)
        except Exception as e:
            self.root.after(0, lambda: self.file_loaded_error(str(e)))
    
    def file_loaded_success(self):
        """Handle successful file loading"""
        self.progress.stop()
        self.status_label.config(text="파일 로딩 완료. 전처리를 시작해주세요.")
        self.preprocess_btn['state'] = 'normal'
        messagebox.showinfo("성공", "파일이 성공적으로 로드되었습니다. 전처리를 진행해주세요.")
    
    def file_loaded_error(self, error_msg):
        """Handle file loading error"""
        self.progress.stop()
        self.status_label.config(text="파일 로딩 실패")
        messagebox.showerror("에러", f"파일 로딩 중 오류 발생: {error_msg}")

    def analyze_competition(self):
        """Analyze products with low competition"""
        try:
            if self.df is None:
                raise ValueError("분석할 데이터가 없습니다")
                
            # Start progress indication
            self.progress.start()
            self.status_label.config(text="경쟁도 분석 중...")
            
            def process():
                # Get competition analysis results
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = f"경쟁도_분석결과_{timestamp}.xlsx"
                
                # Save results
                self.df.to_excel(output_file, index=False)
                
                # Update GUI in main thread
                self.root.after(0, lambda: self._analysis_complete(output_file))
                
            # Run analysis in thread
            self.current_thread = threading.Thread(target=process)
            self.current_thread.daemon = True
            self.current_thread.start()
            
        except Exception as e:
            self.progress.stop()
            self.status_label.config(text="분석 실패")
            messagebox.showerror("에러", f"경쟁도 분석 중 오류 발생: {str(e)}")

    def analyze_attraction(self):
        """Analyze products with high attraction scores"""
        try:
            if self.df is None:
                raise ValueError("분석할 데이터가 없습니다")
                
            # Start progress indication
            self.progress.start()
            self.status_label.config(text="매력도 분석 중...")
            
            def process():
                # Sort by attractiveness score and filter top products
                result_df = self.df.sort_values('매력도', ascending=False).copy()
                
                # Add ranking information
                result_df.insert(0, '매력도순위', range(1, len(result_df) + 1))
                
                # Save results with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = f"매력도_분석결과_{timestamp}.xlsx"
                result_df.to_excel(output_file, index=False)
                
                # Update GUI in main thread
                self.root.after(0, lambda: self._analysis_complete(output_file))
            
            # Run analysis in thread
            self.current_thread = threading.Thread(target=process)
            self.current_thread.daemon = True
            self.current_thread.start()
            
        except Exception as e:
            self.progress.stop()
            self.status_label.config(text="분석 실패")
            messagebox.showerror("에러", f"매력도 분석 중 오류 발생: {str(e)}")

    def analyze_growth(self):
        """Analyze products with steady growth"""
        try:
            if self.df is None:
                raise ValueError("분석할 데이터가 없습니다")
                
            # Start progress indication
            self.progress.start()
            self.status_label.config(text="성장성 분석 중...")
            
            def process():
                # Filter and sort by growth rate
                result_df = self.df[self.df['성장성'] > 0].sort_values('성장성', ascending=False).copy()
                
                # Add ranking information
                result_df.insert(0, '성장성순위', range(1, len(result_df) + 1))
                
                # Save results with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = f"성장성_분석결과_{timestamp}.xlsx"
                result_df.to_excel(output_file, index=False)
                
                # Update GUI in main thread
                self.root.after(0, lambda: self._analysis_complete(output_file))
            
            # Run analysis in thread
            self.current_thread = threading.Thread(target=process)
            self.current_thread.daemon = True
            self.current_thread.start()
            
        except Exception as e:
            self.progress.stop()
            self.status_label.config(text="분석 실패")
            messagebox.showerror("에러", f"성장성 분석 중 오류 발생: {str(e)}")

    def analyze_rapid_growth(self):
        """Analyze products with rapid growth"""
        try:
            if self.df is None:
                raise ValueError("분석할 데이터가 없습니다")
                
            # Start progress indication
            self.progress.start()
            self.status_label.config(text="급성장 분석 중...")
            
            def process():
                # Filter for rapidly growing products (growth > 100%)
                result_df = self.df[self.df['성장성'] > 1.0].sort_values('성장성', ascending=False).copy()
                
                # Add ranking information
                result_df.insert(0, '급성장순위', range(1, len(result_df) + 1))
                
                # Save results with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = f"급성장_분석결과_{timestamp}.xlsx"
                result_df.to_excel(output_file, index=False)
                
                # Update GUI in main thread
                self.root.after(0, lambda: self._analysis_complete(output_file))
            
            # Run analysis in thread
            self.current_thread = threading.Thread(target=process)
            self.current_thread.daemon = True
            self.current_thread.start()
            
        except Exception as e:
            self.progress.stop()
            self.status_label.config(text="분석 실패")
            messagebox.showerror("에러", f"급성장 분석 중 오류 발생: {str(e)}")

    def _analysis_complete(self, output_file):
        """Handle completion of analysis operations"""
        self.progress.stop()
        self.status_label.config(text="분석 완료!")
        
        msg = f"""분석이 완료되었습니다!
파일이 저장되었습니다: {output_file}

파일을 여시겠습니까?"""
        
        if messagebox.askyesno("완료", msg):
            os.startfile(output_file)

    def run(self):
        """Start the application"""
        self.root.mainloop()

if __name__ == "__main__":
    try:
        app = ProductAnalyzer()
        app.run()
    except Exception as e:
        print(f"프로그램 실행 중 오류 발생: {str(e)}") 
        

