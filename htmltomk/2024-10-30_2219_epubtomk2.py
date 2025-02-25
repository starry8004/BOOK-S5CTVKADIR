import html2text
import zipfile
import os
from bs4 import BeautifulSoup
import tkinter as tk
from tkinter import filedialog, messagebox

class Thinker:
    def __init__(self):
        self.converter = html2text.HTML2Text()
        self.converter.ignore_links = False
        self.stats = {}
        
    def convert_epub(self, epub_path):
        print(f"Processing: {os.path.basename(epub_path)}")
        self.stats[epub_path] = {'size': os.path.getsize(epub_path)}
        
        with zipfile.ZipFile(epub_path, 'r') as epub:
            content = []
            html_files = [f for f in epub.namelist() if f.endswith(('.html', '.xhtml'))]
            
            for file in html_files:
                with epub.open(file) as f:
                    html_content = f.read().decode('utf-8')
                    markdown = self.converter.handle(html_content)
                    content.append(markdown)
                    
            self.stats[epub_path]['html_files'] = len(html_files)
            return '\n\n'.join(content)
    
    def process_files(self, epub_files, output_file):
        if not epub_files:
            print("No files selected")
            return
            
        all_content = []
        for epub_file in epub_files:
            try:
                content = self.convert_epub(epub_file)
                filename = os.path.basename(epub_file)
                all_content.append(f"# {filename}\n\n{content}\n\n---\n")
            except Exception as e:
                print(f"Error converting {epub_file}: {str(e)}")
        
        if all_content:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(all_content))
            
            print("\nConversion Summary:")
            for epub_path, stat in self.stats.items():
                print(f"\n{os.path.basename(epub_path)}:")
                print(f"  Size: {stat['size']/1024:.1f}KB")
                print(f"  HTML files processed: {stat['html_files']}")

def main():
    root = tk.Tk()
    root.withdraw()  # Hide the main window
    
    files = filedialog.askopenfilenames(
        title="Select EPUB files",
        filetypes=[("EPUB files", "*.epub"), ("All files", "*.*")]
    )
    
    if files:
        output_file = filedialog.asksaveasfilename(
            defaultextension=".md",
            filetypes=[("Markdown files", "*.md"), ("All files", "*.*")],
            title="Save combined markdown as"
        )
        
        if output_file:
            thinker = Thinker()
            thinker.process_files(files, output_file)
            messagebox.showinfo("Success", "Conversion completed!")

if __name__ == "__main__":
    main()