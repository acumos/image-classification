#! python
# -*- coding: utf-8 -*-
"""
Sci-kit wrapper for fit/predict estimator
"""

from __future__ import print_function

import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
import numpy as np
from os.path import exists


class Predictor(BaseEstimator, TransformerMixin):
    """Transform predictor, a shell around a keras model"""

    def __init__(self, model_path, weights='imagenet', include_top=True):
        self.weights = weights
        self.include_top = include_top
        self.model_path = model_path
        self.model = None
        self.load_model()

    def get_params(self, deep=False):
        # attempt to save model
        return {
            'weights': self.weights,
            'include_top': self.include_top,
            'model_path': self.model_path}

    def fit(self, x, y=None):
        # TODO: possibly hook into training process for underlying model, save model
        return self

    def transform(self, X):
        """
        Assumes a numpy array for a single image        
        """
        if not self.model:
            return X     # failure case, pass through
        return self.model.predict(X)

    def load_model(self):
        from image_classifier.keras import inception_v4

        # default to just 'model.h5' for keras
        if not self.model_path:
            self.model_path = 'model.h5'

        # Create model and load pre-trained weights
        model_path = self.model_path
        if not self.model_path or not exists(self.model_path):
            print("Warning: The target model '{:}' was not found, attempting to download archived library.".format(
                config['model_path']))
            model_path = None
        self.model, model_path = inception_v4.create_model(weights=self.weights, include_top=self.include_top, model_path=model_path)

        # if we downlaoded a model, move it to model_path
        if model_path!=self.model_path and exists(model_path):
            import shutil
            shutil.move(model_path, self.model_path)  # move into directory




def main():
    print("Deprecation warning, please use the library-level 'classify_image' script as an entry point...")

    from image_classifier.keras.image_decoder import ImageDecoder
    from image_classifier.keras import inception_v4

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
    main()
