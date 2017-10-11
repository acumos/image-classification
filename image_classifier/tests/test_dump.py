# -*- coding: utf-8 -*-
"""
Tests dump functionality
"""
import os
import tempfile

import pytest

from cognita_client.wrap.load import load_model
from image_classifier.classify_image import keras_evaluate

_DATA_PATH =  os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../data/') # /a/b/c/d/e
_REQ_FILES = ('model.zip', 'model.proto', 'model.pkl', 'predict.model.h5', 'wrap.json', 'metadata.json')
_IMAGE_FILE = 'elephant.jpg'
_LABEL_FILE = 'keras_class_names.txt'


def test_dump_keras():
    '''Tests dumping with image classifier'''
    assert os.path.exists(_DATA_PATH)  # must have image test path

    with tempfile.TemporaryDirectory() as tdir:
        #tdir = os.path.join(_DATA_PATH, 'test')
        train_path = os.path.join(_DATA_PATH, _IMAGE_FILE)
        label_path = os.path.join(_DATA_PATH, _LABEL_FILE)
        assert os.path.isfile(train_path)
        assert os.path.isfile(label_path)

        keras_evaluate({'image':train_path, 'model_path':'', 'dump_model':tdir, 'label_path':label_path, 'num_top_predictions':5})
        for f in _REQ_FILES:
            test_path = os.path.join(tdir, f)
            assert os.path.isfile(test_path), "File: {:} not found".format(test_path)

        model = load_model(tdir)  # refers to ./model dir in pwd. generated by helper script also in this dir
        assert hasattr(model, 'transform')


if __name__ == '__main__':
    '''Test area'''
    pytest.main([__file__, ])