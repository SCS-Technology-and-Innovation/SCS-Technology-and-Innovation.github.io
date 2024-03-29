import os
import io
from pytesseract import pytesseract
from PyPDF2 import PdfReader
from PIL import Image
import fitz
from sys import stderr

# 'CCCS 455  Intrusion Test & Secrty Assess - Lecture (Section 755  CRN 789) - Ahmad Radaideh (Summer 2022)_c6c4cf8c-1423-4062-8dfa-14786f3ce3b5en-US.pdf'

def parse(line):
    print(line)
    lettercode = line[2:6]
    numbercode = line[7:10]
    tag = 'Section '
    fop = line.index(tag) + len(tag)
    section = line[fop:(fop + 3)]
    op = line.rindex('(') + 1
    ep = line.rindex(')')
    dp = line.rindex(' - ') + 3
    instructor = line[dp:(op - 2)]
    year = line[op:ep].split()[-1]
    term = '09' if '(Fall ' in line else '05' if '(Summer ' in line else '01' if '(Winter ' in line else '?'
    return (term, year, instructor, lettercode, numbercode, section)

TOTAL = 0
SDISAGREE = 1
DISAGREE = 2
NEUTRAL = 3
AGREE = 4
SAGREE = 5

targets = ['gre', 'eut', 'ota' ]
def relevant(w):
    for t in targets:
        if t in w:
            return True
    return False

def match(c, s):
    if 'ota' in c:
        return TOTAL
    if 'utr' in c:
        return NEUTRAL
    if 'isa' in c:
        # print(c, 'is disagree')
        if s:
            return SDISAGREE
        else:
            return DISAGREE
    if 'gre' in c:
        # print(c, 'is agree')        
        if s:
            return SAGREE
        else:
            return AGREE

def ocrfix(text):
    text = text.replace('\n', ' ')                    
    text = text.replace('[', '(') 
    text = text.replace(']', ')')
    text = text.replace('{', '(')
    text = text.replace('}', ')') 
    text = text.replace('( ', '(')
    text = text.replace(' )', ')')
    text = text.replace('°', '0')
    return text

def ocrnumber(w):
    w = w.replace('o', '0')
    w = w.replace('O', '0')
    w = w.replace(':', '1')
    w = w.replace('i', '1')
    w = w.replace('f', '1')
    w = w.replace('l', '1')
    w = w.replace('I', '1')
    w = w.replace('s', '5')
    w = w.replace('S', '5')            
    return w

def diagrams(filename):
    images = fitz.open(filename)
    q = 1
    scores = {}
    for i in range(len(images)):
        page = images[i]
        l = page.get_images(full = True)
        if l:
            for ii, img in enumerate(l, start = 1):
                xref = img[0]
                base = images.extract_image(xref)
                b = base["image"]
                image = Image.open(io.BytesIO(b))
                text = pytesseract.image_to_string(image)
                if 'tron' in text: # just some match (less is more for OCR)
                    values = {} # start looking for the counts
                    check = False
                    category = None
                    strongly = False
                    text = ocrfix(text)
                    for w in text.split():
                        w = w.strip().lstrip()
                        if len(w) == 0:
                            continue
                        if 'ongl' in w:
                            strongly = True
                        if relevant(w):
                            check = True
                            category = w
                            continue
                        if check: # right after a relevant word
                            check = False # lower the flag                                   
                            v = None
                            if '(' in w or ')' in w: # count should be in parenthesis
                                w = w.replace('(', '') # clean out the parenthesis
                                w = w.replace(')', '')
                            try:
                                v = int(ocrnumber(w))
                            except:
                                v = None
                            if v is not None:
                                values[match(category, strongly)] = v
                                strongly = False
                                category = None
                            else:
                                print(f'Skipping <{w}> (expected a number for {category} for Q{q})', \
                                      file = stderr)    
                    scores[q] = values
                    # print(q, values)
                    q += 1
    return scores



def textual(f):
    
    reader = PdfReader(f)
    content = ''
    for page in reader.pages:
        content += page.extract_text()
    question = False
    formulation = ''
    term = None
    year = None
    instructor = None
    lettercode = None
    numbercode = None
    section = None
    prev = None
    listing = []
    skip = False
    for line in content.split('\n'):
        line = line.strip().lstrip()
        if len(line) == 0:
            continue
        if 'Department Mean' in line:
            skip = False        
        if not skip and 'omments' in line:
            skip = True
            continue
        if skip:
            continue
        if 'Mercury Course Evaluation' in line:
            continue
        if 'Course Name ' in line:
            fields = line.split()
            lettercode = fields[2]
            numbercode = fields[3][:-1] # colon
            section = fields[-3][:-1] # comma
        if 'Mean' in line or 'Statistics' in line:
            question = False
            formulation = formulation.lstrip()
            if len(formulation) > 0:
                if formulation not in listing:
                    listing.append(formulation)
            formulation = ''
            continue
        if (line[0] == 'Q' and 'Questionnaire' not in line) \
                   or 'In general' in line \
                   or (line[:4] == 'The ' and 'ratings' not in line):
                    question = True
        if question:
            if line not in formulation:
                formulation += ' ' + line
    return listing
        
def complete(filename):
    for question, data in scores[filename].items():
        total = data.get(0, None)
        accum = 0
        missing = 0
        index = None
        for lvl in range(1, 6):
            v = data.get(lvl, None)
            if v is not None:
                accum += v
            else:
                missing += 1
                key = lvl
        if missing == 1: # recover one blank
            if total is not None:
                data[key] = total - accum
            
def output(details, questions, values, target):
    # (term, year, instructor, lettercode, numbercode, section)
    when = details[1] + details[0]
    what = details[3] + details[4]
    who = details[2]
    qid = 1
    for q in questions:
        data = values.get(qid, None)
        qid += 1
        if data is not None:
            s = [ data.get(v, 0) for v in range(1, 6) ]
            s = [ v if v is not None else 0 for v in s ]
            if sum(s) == data.get(0, 0): # skip the inconsistent ones
                f = [ when, what, who, q, ';'.join([ str(i) for i in s]) ]
                print(';'.join(f), file = target) # semicolon separated file


details = {}
labels = {}
scores = {}
for filename in os.listdir('.'):
    if '.pdf' in filename:
        f = os.path.join('.', filename)
        if os.path.isfile(f):
            print(f'Processing {filename[:30]}...', file = stderr)
            details[filename] = parse(f)
            print(details[filename])
            scores[filename] = diagrams(f)
            labels[filename] = textual(f)

with open('dataset.txt', 'w') as target:
    for filename in labels:
        complete(filename)
        output(details[filename], labels[filename], scores[filename], target)
