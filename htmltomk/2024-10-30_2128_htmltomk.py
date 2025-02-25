from pathlib import Path
import json
import re
from bs4 import BeautifulSoup
import markdown2
from fpdf import FPDF
import tkinter as tk
from tkinter import filedialog, messagebox
import os
from datetime import datetime

class LectureCombiner:
    def __init__(self, lecture_dir=None):
        self.lecture_dir = Path(lecture_dir) if lecture_dir else None
        self.lecture_sequence = [
            1, 3, 4, 18, 19, 20, 21, 22, 23, 24, 25, 271, 39, 40, 276, 269, 
            48, 31, 32, 297, 299, 270, 273, 33, 34, 35, 268, 78, 277, 280, 
            281, 282, 283, 284, 52, 275, 274, 305, 306, 307, 291, 292, 290, 
            293, 285, 286, 287, 288, 289, 42, 43, 44, 45, 47, 49, 50, 57, 
            58, 61, 62, 63, 65, 68, 69, 67, 70, 71, 66, 27, 28, 29, 73, 74, 
            75, 294, 304
        ]

    def get_timestamped_filename(self, base_name: str) -> str:
        """파일명에 타임스탬프를 추가"""
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
        name, ext = os.path.splitext(base_name)
        return f"{name}_{timestamp}{ext}"

    def select_folder(self):
        """폴더 선택 대화상자를 표시하고 선택된 경로 반환"""
        root = tk.Tk()
        root.withdraw()
        
        folder_path = filedialog.askdirectory(
            title='강의 파일이 있는 폴더를 선택하세요',
            initialdir=os.getcwd()
        )
        
        if folder_path:
            self.lecture_dir = Path(folder_path)
            return True
        return False

    def select_output_folder(self):
        """출력 폴더 선택 대화상자를 표시하고 선택된 경로 반환"""
        root = tk.Tk()
        root.withdraw()
        
        folder_path = filedialog.askdirectory(
            title='결과물을 저장할 폴더를 선택하세요',
            initialdir=os.getcwd()
        )
        
        return Path(folder_path) if folder_path else None

    def get_lecture_order(self, lecture_id):
        """강의 순서 반환"""
        try:
            return self.lecture_sequence.index(lecture_id)
        except ValueError:
            return float('inf')

    def html_to_markdown(self, html_content):
        """HTML 내용을 마크다운으로 변환"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 이미지 경로 수정
        for img in soup.find_all('img'):
            if img.get('src'):
                img['src'] = str(Path(img['src']).name)

        # HTML을 마크다운으로 변환
        content = str(soup.find('body'))
        content = re.sub(r'<h1>(.*?)</h1>', r'# \1\n', content)
        content = re.sub(r'<h2>(.*?)</h2>', r'## \1\n', content)
        content = re.sub(r'<h3>(.*?)</h3>', r'### \1\n', content)
        content = re.sub(r'<p>(.*?)</p>', r'\1\n\n', content)
        content = re.sub(r'<strong>(.*?)</strong>', r'**\1**', content)
        content = re.sub(r'<em>(.*?)</em>', r'*\1*', content)
        content = re.sub(r'<img.*?src="(.*?)".*?>', r'![](\1)', content)
        content = re.sub(r'<br.*?>', r'\n', content)
        content = re.sub(r'<[^>]+>', '', content)
        
        return content.strip()

    def combine_to_markdown(self):
        """모든 강의를 하나의 마크다운 파일로 통합"""
        if not self.lecture_dir:
            raise ValueError("강의 디렉토리가 설정되지 않았습니다.")

        output_content = "# 비밀문서 강의 모음\n\n"
        
        # 강의 파일 찾기 및 정렬
        lecture_files = []
        for html_file in self.lecture_dir.glob("lecture_*.html"):
            try:
                lecture_id = int(html_file.stem.split('_')[1])
                lecture_files.append((lecture_id, html_file))
            except ValueError:
                continue

        # 정의된 순서대로 정렬
        lecture_files.sort(key=lambda x: self.get_lecture_order(x[0]))

        # 진행 상황 창 생성
        root = tk.Tk()
        root.title("변환 진행 상황")
        progress_label = tk.Label(root, text="강의 변환 중...")
        progress_label.pack(pady=10)
        root.update()

        # 처리된 강의 수와 전체 강의 수를 표시
        total_files = len(lecture_files)
        for idx, (lecture_id, html_file) in enumerate(lecture_files, 1):
            try:
                progress_label.config(text=f"강의 변환 중... ({idx}/{total_files})")
                root.update()

                # HTML 파일 읽기
                with open(html_file, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                
                # 마크다운으로 변환
                md_content = self.html_to_markdown(html_content)
                
                # 메타데이터에서 제목 가져오기
                meta_file = self.lecture_dir / f"lecture_{lecture_id}_meta.json"
                try:
                    with open(meta_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                        title = metadata.get('title', f'강의 {lecture_id}')
                except:
                    title = f'강의 {lecture_id}'
                
                output_content += f"\n## {title}\n\n"
                output_content += md_content + "\n\n---\n\n"
                
            except Exception as e:
                messagebox.showerror("오류", f"강의 {lecture_id} 처리 중 오류 발생: {str(e)}")
                continue

        root.destroy()

        # 출력 폴더 선택
        output_dir = self.select_output_folder()
        if not output_dir:
            output_dir = self.lecture_dir

        # 타임스탬프가 포함된 파일명 생성
        timestamped_filename = self.get_timestamped_filename("combined_secretpater_.md")
        output_file = output_dir / timestamped_filename

        # 마크다운 파일 저장
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(output_content)
        
        messagebox.showinfo("완료", f"마크다운 파일이 생성되었습니다:\n{output_file}")
        return output_file

def main():
    try:
        combiner = LectureCombiner()
        
        # 강의 폴더 선택
        if not combiner.select_folder():
            print("폴더를 선택하지 않았습니다.")
            return
        
        # 마크다운 파일 생성
        markdown_file = combiner.combine_to_markdown()
        print(f"마크다운 파일 생성 완료: {markdown_file}")
        
    except Exception as e:
        messagebox.showerror("오류", f"처리 중 오류가 발생했습니다: {str(e)}")

if __name__ == "__main__":
    main()