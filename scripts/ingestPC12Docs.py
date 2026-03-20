"""
ingestPC12Docs.py -- Pass 1: Ingest LFN Operator Documents into Sean's Personal Vault

Reads ~57 operator PDFs (GOM, SOP, Ops Specs), extracts text, chunks,
and stores in Firestore under Sean's account linked to PC12-NG CoPilot.

Collections written:
  workerDocuments/{autoId}       -- one record per PDF
  workerDocumentChunks/{autoId}  -- all text chunks

Usage:
  GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
    python3 scripts/ingestPC12Docs.py
"""

import os
import re
import pdfplumber
import firebase_admin
from firebase_admin import firestore
from datetime import datetime

# Init Firebase via ADC
firebase_admin.initialize_app(options={"projectId": "title-app-alpha"})
db = firestore.client()

# Config
DOWNLOADS = os.path.expanduser("~/Downloads")
WORKER_ID = "pc12-ng-copilot"
OWNER_UID = "Dx2wJeRc7jV7gfWPJWpKhYbq5HI3"
CHUNK_SIZE = 1500  # characters per chunk
CHUNK_OVERLAP = 200


def is_target_file(filename):
    """Return True if this PDF is a target operator document."""
    name = filename.strip()
    # OpSpecs: letter + 3 digits + dot/space
    if re.match(r"^[ABDEH]\d{3}\s*[\.\s]", name):
        if name.startswith(("A319", "A320")):
            return False
        if name.startswith("D2"):
            return False
        return True
    if re.match(r"^C0[5-8]\d\s*[\.\s]", name):
        return True
    if re.match(r"^E\d{3}\s*[\.\s]", name):
        return True
    if "LFN GOM Rev 25" in name:
        return True
    if "FW SOP REV 6" in name and "2026" in name:
        return True
    if "LFN FW SOP PC12 Rev 10" in name and "(1)" not in name:
        return True
    if name.strip().startswith(" LFN PC12 SOP Rev 10") and "8-25-23" in name:
        return True
    if name.startswith("TOC") and " 2" not in name:
        return True
    return False


def is_duplicate(filename):
    """Skip files with ' 2' or ' 3' suffix (duplicates)."""
    name = filename.replace(".pdf", "")
    if re.search(r"\s+[23]$", name):
        return True
    if "(1)" in name:
        return True
    return False


def get_document_type(filename):
    """Classify file and return (docType, docName, citationPrefix)."""
    f = filename.upper()
    if "GOM" in f:
        return "GOM", "LFN GOM Rev 25", "Per LFN GOM Rev 25"
    if "FW SOP REV 6" in f:
        return "SOP", "LFN FW SOP Rev 6", "Per LFN FW SOP Rev 6"
    if "FW SOP PC12 REV 10" in f or "LFN FW SOP PC12" in f:
        return "SOP", "LFN PC12 SOP Rev 10", "Per LFN PC12 SOP Rev 10"
    if "LFN PC12 SOP" in f:
        return "SOP", "LFN PC12 SOP Rev 10", "Per LFN PC12 SOP Rev 10"
    if "TOC" in f:
        return "TOC", "Table of Contents", "Per Table of Contents"
    # Ops Spec by letter prefix
    for letter in ["A", "B", "C", "D", "E", "H"]:
        if filename.startswith(letter) and len(filename) > 1 and filename[1].isdigit():
            spec_num = filename.split(".")[0].strip()
            # Clean up spec number (e.g., "A001 " -> "A001")
            spec_num = re.sub(r"\s+$", "", spec_num)
            return "OPS_SPEC", f"Ops Spec {spec_num}", f"Per Ops Spec {spec_num}"
    return "OTHER", filename.replace(".pdf", ""), f"Per {filename.replace('.pdf', '')}"


def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap
    return chunks


def extract_text(pdf_path):
    """Extract text from PDF with page markers."""
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                text_parts.append(f"[Page {i + 1}]\n{text}")
    return "\n".join(text_parts)


def ingest_document(filename, doc_type, doc_name, citation_prefix, text):
    """Ingest a single document into Firestore."""
    chunks = chunk_text(text)
    batch = db.batch()
    doc_ref = db.collection("workerDocuments").document()
    doc_id = doc_ref.id

    # Parent document record
    batch.set(doc_ref, {
        "workerId": WORKER_ID,
        "ownerUid": OWNER_UID,
        "filename": filename,
        "docType": doc_type,
        "docName": doc_name,
        "chunkCount": len(chunks),
        "isWhiteLabel": False,
        "ingestedAt": datetime.utcnow().isoformat(),
        "revision": "current",
        "status": "active",
    })

    # Store chunks
    batch_count = 1  # count the parent doc write
    for i, chunk in enumerate(chunks):
        chunk_ref = db.collection("workerDocumentChunks").document()
        batch.set(chunk_ref, {
            "parentDocId": doc_id,
            "workerId": WORKER_ID,
            "ownerUid": OWNER_UID,
            "docName": doc_name,
            "docType": doc_type,
            "chunkIndex": i,
            "text": chunk,
            "citationPrefix": citation_prefix,
            "isWhiteLabel": False,
        })
        batch_count += 1

        # Commit batch every 400 ops (Firestore limit is 500)
        if batch_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_count = 0

    if batch_count > 0:
        batch.commit()

    return len(chunks)


# Build target file list
pdf_files = sorted([
    f for f in os.listdir(DOWNLOADS)
    if f.endswith(".pdf") and is_target_file(f) and not is_duplicate(f)
])

print(f"Pass 1: Ingesting {len(pdf_files)} documents into Sean's personal vault...")
print(f"Owner UID: {OWNER_UID}")
print(f"Worker ID: {WORKER_ID}\n")

total_chunks = 0
success_count = 0

for filename in pdf_files:
    path = os.path.join(DOWNLOADS, filename)
    doc_type, doc_name, citation_prefix = get_document_type(filename)
    print(f"  {doc_name}...", end=" ", flush=True)
    try:
        text = extract_text(path)
        if not text.strip():
            print("SKIPPED (no text)")
            continue
        chunks = ingest_document(filename, doc_type, doc_name, citation_prefix, text)
        total_chunks += chunks
        success_count += 1
        print(f"OK ({chunks} chunks)")
    except Exception as e:
        print(f"ERROR: {e}")

print(f"\nPass 1 complete: {success_count}/{len(pdf_files)} documents, {total_chunks} total chunks")
print("Stored in: workerDocuments + workerDocumentChunks")
