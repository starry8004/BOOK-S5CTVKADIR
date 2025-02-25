import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import os
from typing import List, Optional

class Thinker:
    def __init__(self):
        self.total_chapters = 0
        self.processed_files = 0
        self.errors = []
        self.stats = {}

    def process_epub(self, epub_path: str) -> Optional[str]:
        """
        EPUB 파일을 처리하고 메타데이터와 콘텐츠를 분석합니다.
        """
        try:
            book = epub.read_epub(epub_path)
            book_stats = {
                'title': book.title,
                'chapters': 0,
                'total_words': 0,
                'images': 0
            }

            markdown_content = f"\n# {book.title}\n\n"
            
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_DOCUMENT:
                    chapter_content = self._process_chapter(item)
                    markdown_content += chapter_content
                    book_stats['chapters'] += 1
                    book_stats['total_words'] += len(chapter_content.split())
                elif item.get_type() == ebooklib.ITEM_IMAGE:
                    book_stats['images'] += 1

            self.stats[book.title] = book_stats
            return markdown_content

        except Exception as e:
            self.errors.append(f"Error processing {epub_path}: {str(e)}")
            return None

    def _process_chapter(self, chapter_item) -> str:
        """
        각 챕터의 내용을 마크다운으로 변환합니다.
        """
        content = chapter_item.get_content().decode('utf-8')
        soup = BeautifulSoup(content, 'html.parser')
        
        # 헤더 처리
        for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            level = int(h.name[1])
            h.replace_with(f"\n{'#' * level} {h.get_text()}\n")
        
        # 단락 및 서식 처리
        for tag, markdown in [
            ('p', '\n{}\n'),
            ('strong', '**{}**'),
            ('em', '*{}*'),
            ('code', '`{}`'),
            ('blockquote', '> {}'),
        ]:
            for element in soup.find_all(tag):
                element.replace_with(markdown.format(element.get_text()))
        
        # 리스트 처리
        for ul in soup.find_all('ul'):
            for li in ul.find_all('li'):
                li.replace_with(f"* {li.get_text()}\n")
        
        return soup.get_text()

    def convert_multiple_epubs(self, epub_files: List[str], output_file: str) -> None:
        """
        여러 EPUB 파일을 하나의 마크다운 파일로 변환합니다.
        """
        final_markdown = ""
        self.processed_files = 0

        for epub_file in epub_files:
            if not os.path.exists(epub_file):
                self.errors.append(f"File not found: {epub_file}")
                continue
                
            print(f"Converting: {epub_file}")
            markdown_content = self.process_epub(epub_file)
            
            if markdown_content:
                final_markdown += markdown_content + "\n\n---\n\n"
                self.processed_files += 1

        if final_markdown:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(final_markdown)
            
            print("\nConversion Summary:")
            print(f"Total files processed: {self.processed_files}")
            print("\nBook Statistics:")
            for title, stats in self.stats.items():
                print(f"\n{title}:")
                print(f"  Chapters: {stats['chapters']}")
                print(f"  Total words: {stats['total_words']}")
                print(f"  Images: {stats['images']}")
            
            if self.errors:
                print("\nErrors encountered:")
                for error in self.errors:
                    print(f"- {error}")

# 사용 예시
def main():
    thinker = Thinker()
    epub_files = [
        'book1.epub',
        'book2.epub',
        'book3.epub'
    ]
    output_file = 'combined_books.md'
    
    thinker.convert_multiple_epubs(epub_files, output_file)

if __name__ == "__main__":
    main()