#! python
# -*- coding: utf-8 -*-
# ================================================================================
# ACUMOS
# ================================================================================
# Copyright © 2017 AT&T Intellectual Property & Tech Mahindra. All rights reserved.
# ================================================================================
# This Acumos software file is distributed by AT&T and Tech Mahindra
# under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# This file is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ================================================================================
"""
Scikit wrapper for fit/predict estimator
"""

from __future__ import print_function

import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
import numpy as np
from os.path import exists


class Predictor(BaseEstimator, TransformerMixin):
    """Transform predictor, a shell around a keras model"""

    def __init__(self, model=None, path_model=None, weights='imagenet', include_top=True):
        self.weights = weights
        self.include_top = include_top
        self.model = model
        if path_model is not None:
            self.load_model(path_model)

    def get_params(self, deep=False):
        # attempt to save model
        return {
            'weights': self.weights,
            'include_top': self.include_top,
            'model': self.model}

    def fit(self, x, y=None):
        # TODO: possibly hook into training process for underlying model, save model
        return self

    def transform(self, X):
        """
        Assumes a numpy array for a single image
        """
        if type(X) == pd.DataFrame:
            X = X.as_matrix()
        if not self.model:
            self.load_model()
            if not self.model:
                return X     # failure case, pass through

        np_evaluate_set = None
        for image_idx in range(len(X)):
            image_feat = X[image_idx, :]
            np_evaluate = self.model.predict(image_feat)
            if np_evaluate_set is None:  # create an NP container for all image samples + features
                np_evaluate_set = np.empty((len(X),) + np_evaluate.shape)
            np_evaluate_set[image_idx] = np_evaluate
        return np_evaluate_set

    def load_model(self, model_path):
        # default to just 'model.h5' for keras
        if not model_path:
            model_path = 'model.h5'
        if self.model is not None:
            print("Warning: The internal model was valid, skipping load attempt from '{:}'.".format(model_path))
            return

        # note: this should not be needed with a runtime/trained model
        from image_classifier.keras_model import inception_v4

        # Create model and load pre-trained weights
        if not model_path or not exists(model_path):
            print("Warning: The target model '{:}' was not found, attempting to download archived library.".format(
                model_path))
            model_path = None
        self.model, model_path = inception_v4.create_model(weights=self.weights, include_top=self.include_top, model_path=model_path)

        # if we downlaoded a model, move it to model_path
        # if model_path!=model_path and exists(model_path):
        #    import shutil
        #    shutil.move(model_path, self.model_path)  # move into directory


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
    print("Class is: " + classes[np.argmax(preds) - 1])
    print("Certainty is: " + str(preds[0][np.argmax(preds)]))


if __name__ == "__main__":
    main()
