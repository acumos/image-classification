#! python
# -*- coding: utf-8 -*-

import numpy as np
from image_classifier.keras import inception_v4



def main():
    from image_classifier.keras.image_decoder import ImageDecoder
    # Create model and load pre-trained weights
    model = inception_v4.create_model(weights='imagenet', include_top=True)

    # Open Class labels dictionary. (human readable label given ID)
    classes = eval(open('data/keras_class_names.txt', 'r').read())

    # Load test image!
    img_path = 'data/elephant.jpg'
    img = ImageDecoder.get_processed_image_keras_file(img_path)

    # Run prediction on test image
    preds = model.predict(img)
    print("Class is: " + classes[np.argmax(preds)-1])
    print("Certainty is: " + str(preds[0][np.argmax(preds)]))


if __name__ == "__main__":
    print("Deprecation warning, please use the library-level 'classify_image' script as an entry point...")
    main()
