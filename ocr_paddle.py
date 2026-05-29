from fastapi import FastAPI , HTTPException, UploadFile, File
from pydantic import BaseModel
# from typing import List , Optional
# from uuid import UUID , uuid4
from inference_sdk import InferenceHTTPClient
import cv2
from paddleocr import PaddleOCR
import os
import json
# import matplotlib.pyplot as plt

app = FastAPI()

# ocr_ar = PaddleOCR(use_textline_orientation = True , lang='ar')
# ocr_en = PaddleOCR(use_textline_orientation = True , lang='en')

ocr_ar = PaddleOCR(
    lang="ar",
    use_doc_orientation_classify=True,
    use_textline_orientation=True,
    use_doc_unwarping=False,   # optional
)

ocr_en = PaddleOCR(
    lang="en",
    use_doc_orientation_classify=True,
    use_textline_orientation=True,
    use_doc_unwarping=False,   # optional
    det_db_box_thresh=0.3,  # lower this to detect weaker boxes
    det_db_thresh=0.2,
    det_db_unclip_ratio=2.0
)

def toGray(image):
    image = cv2.imread(image)
    return cv2.cvtColor(image , cv2.COLOR_BGR2GRAY)

class CartGrise(BaseModel):
    matricule1:int
    matricule2: int
    sachi: str

def clear_folder(folder):
    if not os.path.exists(folder):
        os.makedirs(folder)
        return
    
    for f in os.listdir(folder):
        os.remove(os.path.join(folder, f))

CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="RjrkIvjae9EeFaILLXGa"
)

@app.post("/carteGrise/" , response_model=CartGrise)
async def create_upload_file(file: UploadFile = File(...)):
    
    print("hi")
    data0 = {}
    data2 = {}
    data3 = {}
    image_path = file.filename

    clear_folder("hi0")
    clear_folder("hi2")
    clear_folder("hi3")
    im = cv2.imread(image_path)

    if im is None:
        raise HTTPException(status_code=404 , detail="Invalid Image path")
    
    gray_image = toGray(image_path)
    cv2.imwrite("./gray.png" , gray_image)
    bw = cv2.bitwise_not(gray_image)
    cv2.imwrite('bw.png' , bw)

    new_path = "./gray.png"
    nPath = "./bw.png"

    height = im.shape[0]
    width = im.shape[1]

    print(width, height)

    if height != 640 and width != 640:
        resized = cv2.resize(im , (700 , 900) , interpolation=cv2.INTER_LINEAR)
        cv2.imwrite("resized.png" , resized)
        nnn = cv2.imread("resized.png")
        image = cv2.imread("resized.png")
    else:
        nnn = cv2.imread(nPath)
        image = cv2.imread(nPath)
    result = CLIENT.infer(nnn, model_id="card-fields-extraction-w46qc/1")

    print(result["predictions"])
    i =1
    for pred in result["predictions"]:
        x1 = max(0 , int(pred["x"] - pred["width"] / 2))
        x2 = max(0 , int(pred["x"] + pred["width"] / 2))

        
        y1 = int(pred["y"] - pred["height"] / 2)
        y2 = int(pred["y"] + pred["height"] / 2)

        # label = f"{pred["class"]}: {pred["confidence"]:.2f}"
        print(x1 , x2 , y1 , y2)


        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
        # cv2.putText(image , label, (x1, y1-10),cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)


        if pred['class'] == "mat":
            
            # hieght = (y2 - y1)/3
            # first_part = y1 + hieght
            # second_part = first_part + hieght
            # third_part = second_part + hieght
            print("I am in mat")

            height = y2 - y1
            part = height // 3

            first_part = y1 + part
            second_part = y1 + 2 * part
            third_part = y2
            

            result0 = ocr_en.predict(image[y1 : first_part , x1+5 : x2])
            # result1 = ocr_ar.predict(image[first_part - 20 : second_part + 20 , x1 : x2])
            result2 = ocr_en.predict(image[second_part : third_part , x1+5 : x2])

            
            # plt.imshow(image[second_part : third_part , x1 : x2])


            for res0 in result0:
                res0.print()
                res0.save_to_img("hi0")  
                res0.save_to_json("hi0")
            
            # for res1 in result1:
            #     res1.print()
            #     res1.save_to_img("hi1")  
            #     res1.save_to_json("hi1")

            for res2 in result2:
                res2.print()
                res2.save_to_img("hi2")  
                res2.save_to_json("hi2")

        elif pred['class'] == "num_serie":
            # result = ocr_en.predict(image[y1 : y2 , x1 : x2])
            print("I am num serie")
            padded = cv2.copyMakeBorder(image[y1 : y2 , x1 : x2], 50, 0, 0, 0, cv2.BORDER_CONSTANT, value=(255,255,255))
            result = ocr_en.predict(padded)

            for res in result:  
                res.print()
                res.save_to_img("hi3")  
                res.save_to_json("hi3")  
        else:
            continue

        for file in os.listdir("./hi0"):
            if file.endswith(".json"):
                path = os.path.join("./hi0", file)
                with open(path , "r") as f:
                    data0 = json.load(f)
                if "rec_texts" in data0 and data0["rec_texts"]:
                    matricule1 = data0["rec_texts"][0]


        for file in os.listdir("./hi2"):
            if file.endswith(".json"):
                path = os.path.join("./hi2", file)
                with open(path , "r") as f:
                    data2 = json.load(f)
                if "rec_texts" in data2 and data2["rec_texts"]:
                    matricule2 = data2["rec_texts"][0]

        for file in os.listdir("./hi3"):
            path = os.path.join("./hi3", file)
            if file.endswith(".json"):
                with open(path , "r") as f:
                    data3 = json.load(f)
                if "rec_texts" in data3 and data3["rec_texts"]:
                    sachi = data3["rec_texts"][0]

        # for res in result:  
        #     res.print()
        #     res.save_to_img("hi")  
        #     res.save_to_json("hi") 


            # for res in result:  
            #     res.print()
            #     res.save_to_img("hi")  
            #     res.save_to_json("hi")  

        # if "rec_texts" in data0["rec_texts"]:
            # print(data0["rec_texts"][0])
            # print(data2["rec_texts"][0])
            # print(data3["rec_texts"][0])

        print(data0.keys())



        output = "./res1.png"
        cv2.imwrite(output , image)

    return {
        "matricule1": int(matricule1),
        "matricule2": int(matricule2),
        "sachi": sachi
        }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host ="0.0.0.0" ,  port=8001)