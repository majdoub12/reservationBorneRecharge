from flask import Flask, request, jsonify
from easyocr import Reader
import cv2
import numpy as np

app = Flask(__name__)

# Initialize EasyOCR reader
reader = Reader(['en', 'ar'], gpu=False, verbose=False)
reader_vin = Reader(['en'], gpu=False, verbose=False)



MODE_CONFIG = {
    'generic': {},
    'plate': {
        'allowlist': '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    },
    'plate_digits': {
        'allowlist': '0123456789',
    },
    'vin': {
        'allowlist': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        'contrast_ths': 0.1,
        'adjust_contrast': 0.7,
    },
}

VIN_CHAR_CORRECTIONS = {
    '|': 'I',  # pipe → I (but for VIN context we need to check position)
    ',': 'V',  # comma → V (very common confusion)
    '.': '',   # dots → remove
    'O': '0',  # letter O → zero (VINs don't use letter O)
    'o': '0',
    'Q': '0',  # Q looks like O
    'I': '1',  # letter I → 1 (VINs don't use I)
    'l': '1',  # lowercase l → 1
}

def correct_vin_chars(text):
    result = ''
    for ch in text.upper():
        result += VIN_CHAR_CORRECTIONS.get(ch, ch)
    return result

@app.route('/ocr', methods=['POST'])
def perform_ocr():
    try:
        # Get image from request
        file = request.files['image']
        
        mode = request.form.get('mode', 'generic')
        config = MODE_CONFIG.get(mode, MODE_CONFIG['generic'])

        image_bytes = file.read()
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        decoded = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if decoded is None:
            return jsonify({'error': 'Invalid image payload'}), 400

        # EasyOCR recognition
        active_reader = reader_vin if mode == 'vin' else reader
        results = active_reader.readtext(
            decoded,
            detail=1,
            paragraph=False,
            **config
        )
        
        # Format results - CONVERT numpy types to Python native types
        formatted_results = []
        for detection in results:
            text = detection[1]
            confidence = float(detection[2])  # Convert numpy float to Python float
            
            # Convert bbox coordinates (numpy.int32 -> int)
            bbox = [[int(coord[0]), int(coord[1])] for coord in detection[0]]
            
            formatted_results.append({
                'text': text,
                'confidence': confidence,
                'bbox': bbox
            })
        
        if mode == 'vin':
            for r in formatted_results:
                r['text'] = correct_vin_chars(r['text'])


        print(f"✅ EasyOCR detected {len(formatted_results)} text regions")
        for r in formatted_results:
            print(f"   - '{r['text']}' (confidence: {r['confidence']:.2f})")
        
        return jsonify({'results': formatted_results})
        
    except Exception as e:
        print(f"❌ OCR error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 EasyOCR Server running on http://127.0.0.1:8000")
    app.run(host='127.0.0.1', port=8000, debug=False)
