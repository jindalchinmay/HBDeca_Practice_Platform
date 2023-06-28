import PyPDF2

pdf_file = open('./tests/hs_marketing_cluster_sample_exam.pdf', 'rb')
pdf_reader = PyPDF2.PdfReader(pdf_file)

num_pages = len(pdf_reader.pages)

keyPage = False
keyPageIndex = 0

for page_number in range(num_pages):
    page = pdf_reader.pages[page_number]
    text = page.extract_text()
    for i in range(len(text)):
        if i < len(text)-3:
            if text[i] == "K" and text[i+1] == "E" and text[i + 2] == "Y":
                keyPage = True
        if(keyPage):
            if(text[i].isdigit() and text[i+1].isdigit()):
                keyPageIndex = int(text[i] + text[i+1])
                break
    if(keyPage):
      break


questions = []
question = ""
start_of_question = False

for page_number in range(keyPageIndex):
    page = pdf_reader.pages[page_number]
    text = page.extract_text()
    for i in range(len(text)):
      character = text[i];
      if(character.isdigit() and i < (len(text)-1) and text[i+1] == "."):
        start_of_question = True
      if(character == "A" and i < (len(text)-1) and text[i+1] == "."):
        questions.append(question[2:])
        question = ""
        start_of_question = False
      if(start_of_question == True):
        question = question + character
        #print(question)

optionOnes = []
optionOne = ""
start_of_Option_One = False

for page_number in range(keyPageIndex):
    page = pdf_reader.pages[page_number]
    text = page.extract_text()
    for i in range(len(text)):
      character = text[i];
      if(character == "A" and i < (len(text)-1) and text[i+1] == "."):
        start_of_Option_One = True
      if(start_of_Option_One):
        if(character == "\n"):
          optionOnes.append(optionOne[2:])
          optionOne = ""
          start_of_Option_One = False
      if(start_of_Option_One == True):
        optionOne = optionOne + character
        #print(optionOnes)

optionTwos = []
optionTwo = ""
start_of_Option_Two = False

for page_number in range(keyPageIndex):
    page = pdf_reader.pages[page_number]
    text = page.extract_text()
    for i in range(len(text)):
      character = text[i];
      if(character == "B" and i < (len(text)-1) and text[i+1] == "."):
        start_of_Option_Two = True
      if(start_of_Option_Two):
        if(character == "\n"):
          optionTwos.append(optionTwo[2:])
          optionTwo = ""
          start_of_Option_Two = False
      if(start_of_Option_Two == True):
        optionTwo = optionTwo + character
        #print(optionTwos)

optionThrees = []
optionThree = ""
start_of_Option_Three = False

for page_number in range(keyPageIndex):
    page = pdf_reader.pages[page_number]
    text = page.extract_text()
    for i in range(len(text)):
      character = text[i];
      if(character == "C" and i < (len(text)-1) and text[i+1] == "."):
        start_of_Option_Three = True
      if(start_of_Option_Three):
        if(character == "\n"):
          optionThrees.append(optionThree[2:])
          optionThree = ""
          start_of_Option_Three = False
      if(start_of_Option_Three == True):
        optionThree = optionThree + character
        #print(optionThrees)

optionFours = []
optionFour = ""
start_of_Option_Four = False

for page_number in range(keyPageIndex):
    page = pdf_reader.pages[page_number]
    text = page.extract_text()
    for i in range(len(text)):
      character = text[i];
      if(character == "D" and i < (len(text)-1) and text[i+1] == "."):
        start_of_Option_Four = True
      if(start_of_Option_Four):
        if(character == "\n"):
          optionFours.append(optionFour[2:])
          optionFour = ""
          start_of_Option_Four = False
      if(start_of_Option_Four == True):
        optionFour = optionFour + character
        #print(optionOnes)


correctOptions = []
option = ""
startOfAnswer = False

def correctOptionCoverter(x):
    if x == "A":
        return "optionOne"
    elif x == "B":
        return "optionTwo"
    elif x == "C":
        return "optionThree"
    elif x == "D":
        return "optionFour"

for page_number in range(keyPageIndex,num_pages):
    page = pdf_reader.pages[page_number]
    text = page.extract_text()
    print(text)
    for i in range(len(text)):
      character = text[i];
      if(character.isdigit() and i < (len(text)-1) and text[i+1] == "."):
        startOfAnswer = True
      if(startOfAnswer == True and (character == "A" or character =="B" or character == "C" or character == "D")):
          correctOptions.append(correctOptionCoverter(character))
          startOfAnswer = False

print(correctOptions)
pdf_file.close()

