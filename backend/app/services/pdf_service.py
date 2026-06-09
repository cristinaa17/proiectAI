import fitz
from langchain_text_splitters import RecursiveCharacterTextSplitter


def extract_smart_chunks_from_pdf(pdf_bytes: bytes) -> list[dict]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", ".", " ", ""],
        length_function=len,
    )

    chunks = []

    for page_num in range(len(doc)):
        page_text = doc[page_num].get_text("text")
        page_text = " ".join(page_text.split())

        if not page_text:
            continue

        for chunk in text_splitter.split_text(page_text):
            chunks.append({"text": chunk, "page": page_num + 1})

    return chunks
