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

from os import path
import pytest


def test_classify_single(monkeypatch):
    pathRoot = env_update(monkeypatch)
    #from image_classifier import classify_image
    #dfSample = classify_image.create_sample(path.join(pathRoot, 'data', 'elephant.jpg'))
    #assert len(dfSample) == 1                       # just one image, no image
    import pandas as pd
    dfSample = pd.DataFrame([[1,2],[2,4]], columns=['first', 'second'])
    print(dfSample)   # run `pytest -s` for more verbosity

    # TODO: future testing generation of model? or does it belong here because of data dependence?
    # acModel = classify_image.model_create_pipeline(config['model_path'], config['label_path'],
    #                                        config['num_top_predictions'])
    pass


def env_update(monkeypatch):
    import sys

    pathRoot = path.dirname(path.dirname(path.dirname(path.abspath(__file__))))
    print("Adding '{:}' to sys path".format(pathRoot))
    if pathRoot not in sys.path:
        monkeypatch.syspath_prepend(pathRoot)
    return pathRoot
