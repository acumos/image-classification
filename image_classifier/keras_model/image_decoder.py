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
Simple scikit-based transformer for transforming a binary image stream into a numpy array
"""

from __future__ import print_function
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

# utility for handling string as a file object (prefer python3)
from io import BytesIO as StringIO
from image_classifier.keras_model import inception_v4


def image_channels_first():
    from keras import backend as K
    return K.image_data_format() == "channels_first"


class ImageDecoder(BaseEstimator, TransformerMixin):
    """Using keras methods decode an image from a mime type and a binary string"""

    DEFAULT_IMAGE_SIZE = (299, 299, 3)
    IMAGE_INPUT_MIME = "mime_type"
    IMAGE_INPUT_BINARY = "image_binary"

    def fit(self, x, y=None):
        return self

    @staticmethod
    def generate_input_types():
        return [str, bytes]

    @staticmethod
    def generate_input_dataframe(mime_type="", image_bytes=b""):
        return pd.DataFrame([[mime_type, image_bytes]],
                            columns=[ImageDecoder.IMAGE_INPUT_MIME, ImageDecoder.IMAGE_INPUT_BINARY])

    def transform(self, X):
        """
        Assumes a numpy array of [[mime_type, binary_string] ... ]
           where mime_type is an image-specifying mime type and binary_string is the raw image bytes
        """
        if type(X) == pd.DataFrame:
            X = X.as_matrix()
        np_decode_set = None
        for image_idx in range(len(X)):
            if type(X) == pd.DataFrame:
                image_tuple = X[image_idx, :]
            else:  # a list or other tuple-like type
                image_tuple = X[image_idx]
            if type(image_tuple) == pd.DataFrame:  # drop type to np matrix
                image_tuple = image_tuple.as_matrix()[0]
            np_decode = ImageDecoder.get_processed_image_keras_string(image_tuple[1])
            if np_decode_set is None:  # create an NP container for all image samples + features
                np_decode_set = np.empty((len(X),) + np_decode.shape)
            np_decode_set[image_idx] = np_decode
        return np_decode_set

    # This function comes from Google's ImageNet Preprocessing Script
    @staticmethod
    def central_crop(image, central_fraction):
        """Crop the central region of the image.
        Remove the outer parts of an image but retain the central region of the image
        along each dimension. If we specify central_fraction = 0.5, this function
        returns the region marked with "X" in the below diagram.
           --------
          |        |
          |  XXXX  |
          |  XXXX  |
          |        |   where "X" is the central 50% of the image.
           --------
        Args:
        image: 3-D array of shape [height, width, depth]
        central_fraction: float (0, 1], fraction of size to crop
        Raises:
        ValueError: if central_crop_fraction is not within (0, 1].
        Returns:
        3-D array
        """
        if central_fraction <= 0.0 or central_fraction > 1.0:
            raise ValueError('central_fraction must be within (0, 1]')
        if central_fraction == 1.0:
            return image

        img_shape = image.shape
        fraction_offset = int(1 / ((1 - central_fraction) / 2.0))
        bbox_h_start = int(np.divide(img_shape[0], fraction_offset))
        bbox_w_start = int(np.divide(img_shape[1], fraction_offset))

        bbox_h_size = int(img_shape[0] - bbox_h_start * 2)
        bbox_w_size = int(img_shape[1] - bbox_w_start * 2)

        image = image[bbox_h_start:bbox_h_start + bbox_h_size, bbox_w_start:bbox_w_start + bbox_w_size]
        return image

    @staticmethod
    def get_processed_image_cv(img_path, target_size=DEFAULT_IMAGE_SIZE):
        # TODO: test with other methods like binary string input; currently not used, included as legacy
        print("Warning: get_processed_image_cv has not been tested for pipeline-based processing")
        import cv2  # try to not be dependent on opencv

        # Load image and convert from BGR to RGB
        im = np.asarray(cv2.imread(img_path))[:, :, ::-1]
        im = central_crop(im, 0.875)
        im = cv2.resize(im, (target_size[0], target_size[1]))
        im = inception_v4.preprocess_input(im)
        if image_channels_first():
            im = np.transpose(im, (2, 0, 1))
            im = im.reshape(-1, target_size[2], target_size[0], target_size[1])
        else:
            im = im.reshape(-1, target_size[0], target_size[1], target_size[2])
        return im

    @staticmethod
    def get_processed_image_skimage(img_path, target_size=DEFAULT_IMAGE_SIZE):
        # TODO: test with other methods like binary string input; currently not used, included as legacy
        print("Warning: get_processed_image_skimage has not been tested for pipeline-based processing")
        from skimage.io import imread

        im = imread(img_path, (target_size[0], target_size[1]))
        # Load image and convert from BGR to RGB
        # im = central_crop(im, 0.875)
        # im = cv2.resize(im, (299, 299))
        im = inception_v4.preprocess_input(im)
        if image_channels_first():
            im = np.transpose(im, (2, 0, 1))
            im = im.reshape(-1, target_size[2], target_size[0], target_size[1])
        else:
            im = im.reshape(-1, target_size[0], target_size[1], target_size[2])
        return im

    @staticmethod
    def get_processed_image_keras_file(img_path, target_size=DEFAULT_IMAGE_SIZE):
        """
        Read an image from disk, but just return an open file pointer
            (see PIL functionality for this trick - http://pillow.readthedocs.io/en/3.1.x/reference/Image.html)
        :param img_path: path to image
        :param target_size: desired size -- should be class default
        :return:
        """
        return ImageDecoder.get_processed_image_keras(open(img_path, 'rb'), target_size=target_size)

    @staticmethod
    def get_processed_image_keras_string(binary_string, target_size=DEFAULT_IMAGE_SIZE):
        """
        Read an image from disk, but just return an open file pointer
            (see PIL functionality for this trick - http://pillow.readthedocs.io/en/3.1.x/reference/Image.html)
        :param binary_string: raw binary string used for parsing
        :param target_size: desired size -- should be class default
        :return:
        """
        in_memory = StringIO(binary_string)
        return ImageDecoder.get_processed_image_keras(in_memory, target_size=target_size)

    @staticmethod
    def get_processed_image_keras(file_object, target_size=DEFAULT_IMAGE_SIZE):
        from keras.preprocessing import image as image_utils
        image = image_utils.load_img(file_object, target_size=target_size)
        image = image_utils.img_to_array(image)

        # TODO: crop image, a la central_crop from other opencv usage?
        #   empirically, this didn't seem to improve things on a small bank of files

        im = inception_v4.preprocess_input(image)

        if image_channels_first():
            im = np.transpose(im, (2, 0, 1))
            im = im.reshape(-1, target_size[2], target_size[0], target_size[1])
        else:
            im = im.reshape(-1, target_size[0], target_size[1], target_size[2])
        return im
