import os
import tkinter as tk
from tkinter import filedialog

def clean_srt_file(input_path, output_path):
    """
    Removes line numbers and timestamps from an SRT file.
    
    Parameters:
    input_path (str): Path to the input SRT file.
    output_path (str): Path to save the cleaned text file.
    """
    try:
        with open(input_path, 'r', encoding='utf-8') as infile:
            lines = infile.readlines()
        
        # Remove lines that are digits or contain timestamps
        cleaned_lines = [
            line for line in lines if not line.strip().isdigit() and "-->" not in line
        ]
        
        # Write cleaned content to the output file
        with open(output_path, 'w', encoding='utf-8') as outfile:
            outfile.writelines(cleaned_lines)
        
        print(f"Cleaned file saved to: {output_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

def main():
    # Create a folder dialog for selecting the folder with SRT files
    root = tk.Tk()
    root.withdraw()  # Hide the root window
    folder_path = filedialog.askdirectory(
        title="Select a Folder Containing SRT Files"
    )
    if not folder_path:
        print("No folder selected. Exiting.")
        return

    # Iterate over all SRT files in the folder
    for filename in os.listdir(folder_path):
        if filename.endswith(".srt"):
            input_file = os.path.join(folder_path, filename)
            output_file = os.path.join(folder_path, f"{os.path.splitext(filename)[0]}_cleaned.txt")
            
            # Clean each SRT file and save as a TXT file
            clean_srt_file(input_file, output_file)

    print("Processing completed for all files in the folder.")

if __name__ == "__main__":
    main()
