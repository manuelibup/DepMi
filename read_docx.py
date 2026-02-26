import sys
import zipfile
import xml.etree.ElementTree as ET

def read_docx(path):
    try:
        with zipfile.ZipFile(path) as zipf:
            xml_content = zipf.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in tree.findall('.//w:p', ns):
                texts = [node.text for node in p.findall('.//w:t', ns) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            return '\n'.join(paragraphs)
    except Exception as e:
        return str(e)

files_to_read = [
    r'c:\Users\web5Manuel\OneDrive\Documents\DepMi\files\DepMi_Addendum_Features_Financials_Naming.docx',
    r'c:\Users\web5Manuel\OneDrive\Documents\DepMi\files\DepMi_Addendum_II_Auth_Payments_Social_Messaging.docx',
    r'c:\Users\web5Manuel\OneDrive\Documents\DepMi\files\Social_Commerce_Platform_Strategy_Report.docx'
]

with open('docx_output.txt', 'w', encoding='utf-8') as f_out:
    for f in files_to_read:
        f_out.write(f"=== {f} ===\n")
        f_out.write(read_docx(f))
        f_out.write("\n\n")
